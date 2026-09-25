/**
 * MENVA — diner plans on this device (MENVA Plus, MENVA Black). No accounts: an unlock code from
 * /unlock is checked by /api/unlock and the answer (plan + end date) is kept in localStorage.
 *
 *  - Table QR sessions are always free and never ask for a plan (js/app.js decides that).
 *  - The end date is checked on the device every time, so a plan ends on time even offline.
 *  - The server is asked again at most once a day, plus once right after the end date passes
 *    (so a renewal made on the same code is picked up without re-typing it).
 *  - MENVA Black visit tiers are opt-in and live only on this phone: one visit per Lahore calendar
 *    day with a table QR scan while Black is active. Nothing about visits is ever sent anywhere.
 *
 * Storage keys: menva:plan → { code, plan, expires, status, checked }
 *               menva:visits → { on, days: ['YYYY-MM-DD', …] }
 */
(function () {
  'use strict';

  const PLAN_KEY = 'menva:plan';
  const VISITS_KEY = 'menva:visits';
  const ENDPOINT = '/api/unlock';
  const RECHECK_MS = 24 * 60 * 60 * 1000;
  const NAMES = { plus: 'MENVA Plus', black: 'MENVA Black' };
  // Visit tiers (distinct days at a partner table). Thresholds are placeholders for the founder to
  // confirm — the names are fixed by the launch posts, the numbers are not published anywhere yet.
  const TIERS = [
    { name: 'Regular', from: 1 },
    { name: 'Known', from: 4 },
    { name: 'Top Table', from: 10 },
    { name: 'Legend', from: 25 },
  ];

  const mem = new Map(); // storage fallback (private browsing): the plan lasts for this visit
  const read = (k) => {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return mem.get(k) ?? null; }
  };
  const write = (k, v) => {
    mem.set(k, v);
    try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {}
  };
  const listeners = new Set();
  const notify = () => listeners.forEach((cb) => { try { cb(); } catch {} });

  const dayOf = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(ms));
  const today = () => dayOf(Date.now());
  const DATE = /^\d{4}-\d{2}-\d{2}$/;

  function stored() {
    const p = read(PLAN_KEY);
    return p && NAMES[p.plan] && DATE.test(p.expires || '') ? p : null;
  }

  // The plan in force right now: 'plus' | 'black' | null.
  function current() {
    const p = stored();
    return p && p.status === 'active' && today() <= p.expires ? p.plan : null;
  }

  // 3D and AR away from a table: Plus, and Black (which includes everything in Plus).
  const anywhere = () => current() !== null;
  const isBlack = () => current() === 'black';

  // What /unlock shows: the stored plan with its effective state.
  function info() {
    const p = stored();
    if (!p) return null;
    const active = p.status === 'active' && today() <= p.expires;
    return { plan: p.plan, name: NAMES[p.plan], expires: p.expires, code: p.code, active, revoked: p.status === 'revoked' };
  }

  // POST the code. → { ok: true, plan, expires } | { ok: false, reason: 'invalid'|'unknown'|'expired'|'revoked'|'offline'|'unavailable', expires? }
  async function check(code) {
    let res, body;
    try {
      res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }), cache: 'no-store' });
    } catch { return { ok: false, reason: 'offline' }; }
    try { body = await res.json(); } catch { body = null; }
    // Only answers that carry our own status count; a host without the function, or a 503 while
    // storage isn't set up, is "can't check right now", never "wrong code".
    const status = body?.status;
    if (res.status === 400 && status === 'invalid') return { ok: false, reason: 'invalid' };
    if (res.ok && status === 'unknown') return { ok: false, reason: 'unknown' };
    if (res.ok && ['active', 'expired', 'revoked'].includes(status) && NAMES[body.plan] && DATE.test(body.expires || '')) {
      return status === 'active'
        ? { ok: true, plan: body.plan, expires: body.expires }
        : { ok: false, reason: status, plan: body.plan, expires: body.expires };
    }
    return { ok: false, reason: 'unavailable' };
  }

  // The diner typed a code on /unlock.
  async function redeem(input) {
    const code = String(input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (code.length !== 12) return { ok: false, reason: 'invalid' };
    const result = await check(code);
    if (result.ok) {
      write(PLAN_KEY, { code, plan: result.plan, expires: result.expires, status: 'active', checked: Date.now() });
      notify();
    }
    return result;
  }

  // Background re-check (app start). Keeps the stored plan when the server can't be reached: the
  // device's own end-date check already switches it off on time.
  async function recheck() {
    const p = stored();
    if (!p || !p.code) return;
    const age = Date.now() - (p.checked || 0);
    const lapsedSinceCheck = today() > p.expires && dayOf(p.checked || 0) <= p.expires;
    if (age >= 0 && age < RECHECK_MS && !lapsedSinceCheck) return;
    if (p.status === 'revoked') return; // switched off on purpose; a new code is the way back
    const result = await check(p.code);
    if (result.reason === 'offline' || result.reason === 'unavailable') return;
    const next = result.ok
      ? { ...p, plan: result.plan, expires: result.expires, status: 'active', checked: Date.now() }
      : { ...p, status: result.reason === 'revoked' ? 'revoked' : 'ended', ...(result.expires && { expires: result.expires }), checked: Date.now() };
    const changed = next.status !== p.status || next.expires !== p.expires || next.plan !== p.plan;
    write(PLAN_KEY, next);
    if (changed) notify();
  }

  function forget() {
    write(PLAN_KEY, null);
    notify();
  }

  // ─── MENVA Black visits (opt-in, this phone only) ─────────────
  function visitsRecord() {
    const v = read(VISITS_KEY);
    return { on: !!v?.on, days: Array.isArray(v?.days) ? v.days.filter((d) => DATE.test(d)) : [] };
  }
  function setCounting(on) {
    const v = visitsRecord();
    write(VISITS_KEY, { ...v, on: !!on });
    notify();
  }
  // Called on a table QR scan. Counts once per Lahore day, only while Black is active and opted in.
  function recordVisit() {
    if (!isBlack()) return;
    const v = visitsRecord();
    const d = today();
    if (!v.on || v.days.includes(d)) return;
    write(VISITS_KEY, { on: true, days: [...v.days, d].slice(-400) });
    notify();
  }
  function visits() {
    const v = visitsRecord();
    const count = v.days.length;
    const idx = TIERS.reduce((i, t, n) => (count >= t.from ? n : i), -1);
    const next = TIERS[idx + 1] || null;
    return { on: v.on, count, tier: idx >= 0 ? TIERS[idx].name : null, next: next && { name: next.name, in: next.from - count } };
  }

  function onChange(cb) { listeners.add(cb); return () => listeners.delete(cb); }

  window.MenvaPlan = { NAMES, TIERS, current, anywhere, isBlack, info, redeem, recheck, forget, setCounting, recordVisit, visits, onChange, today };
})();
