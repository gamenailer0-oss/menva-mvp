/**
 * MENVA — loyalty stamp card ("your 8th visit, a gift from the restaurant").  window.MenvaLoyalty
 *
 * One stamp per calendar day per restaurant, earned when the guest arrived through a table URL and
 * opens "Show the waiter" with at least one dish on the list. Stored on this phone only —
 * localStorage `menva:loyalty:<restaurantId>` → { days: ['2026-10-02', …], redeemed: n } — with an
 * in-memory fallback if storage is blocked. No account, no personal data, nothing sent but the two
 * anonymous events `loyalty_stamp` and `loyalty_redeem` (restaurant id only).
 *
 * Per restaurant (data/restaurants/<id>.json):  "loyalty": { "enabled": true, "visits": 8, "gift": null }
 * `gift` is the restaurant's to name. While it is null the card says "a gift from the house" — we
 * never invent an item. Disabled → nothing is rendered anywhere.
 *
 * Debug: ?stamps=N previews a state (0 … visits) without touching storage, like ?tier=.
 *
 * Public API (used by js/app.js):
 *   mountPage(slot, restaurant, { onClaim })   the quiet card under the banner
 *   waiter(el, { restaurant, table })          the card / gift pass inside "Show the waiter" → { visit() }
 *   state(restaurant), earn(restaurant, table), redeem(restaurant)   the logic (also used by tests)
 */
(function () {
  'use strict';

  const PREFIX = 'menva:loyalty:';
  const HOLD_MS = 1200;
  const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

  const mem = new Map(); // restaurantId -> record — in-memory fallback / mirror of localStorage
  const views = new Set(); // { el, render } — cards to refresh whenever the state changes
  let debugOverride = null; // set by a redeem while ?stamps= is in the URL, so the preview resets too

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const ordinal = (n) => { const r = n % 100; const s = r >= 11 && r <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'); return `${n}${s}`; };
  const track = (event) => { try { window.MenvaTrack?.(event); } catch { /* analytics never breaks the card */ } };

  // ─── Config ────────────────────────────────────────────────
  // null when the restaurant has no loyalty card or has it switched off.
  function config(r) {
    const c = r && r.loyalty;
    if (!c || c.enabled !== true) return null;
    const visits = Number.isInteger(c.visits) && c.visits >= 2 && c.visits <= 12 ? c.visits : 8;
    const gift = typeof c.gift === 'string' && c.gift.trim() ? c.gift.trim() : null;
    return { visits, gift };
  }

  // ─── Storage (wrapped: private browsing / quota must not break the page) ───
  function read(id) {
    let rec;
    try {
      const raw = localStorage.getItem(PREFIX + id);
      rec = raw ? JSON.parse(raw) : null;
    } catch {
      rec = undefined; // storage unavailable — distinct from "nothing saved yet"
    }
    if (rec === undefined) rec = mem.get(id);
    const days = rec && Array.isArray(rec.days) ? [...new Set(rec.days.filter((d) => typeof d === 'string' && DAY_RE.test(d)))].slice(-60) : [];
    const redeemed = rec && Number.isInteger(rec.redeemed) && rec.redeemed > 0 ? rec.redeemed : 0;
    return { days, redeemed };
  }
  function write(id, rec) {
    mem.set(id, rec);
    try { localStorage.setItem(PREFIX + id, JSON.stringify(rec)); } catch { /* the in-memory copy carries this visit */ }
  }

  function debugStamps(visits) {
    const q = new URLSearchParams(location.search).get('stamps');
    if (q == null || !/^\d{1,2}$/.test(q)) return null;
    return debugOverride ?? Math.min(Number(q), visits);
  }

  // ─── State & actions ───────────────────────────────────────
  function state(r) {
    const cfg = config(r);
    if (!cfg) return null;
    const rec = read(r.id);
    const dbg = debugStamps(cfg.visits);
    const stamps = dbg ?? Math.min(rec.days.length, cfg.visits);
    return {
      visits: cfg.visits,
      gift: cfg.gift,
      stamps,
      ready: stamps >= cfg.visits,
      redeemed: rec.redeemed,
      lifetime: rec.redeemed * cfg.visits + stamps, // history survives a redemption
      doneToday: rec.days.includes(today()),
      debug: dbg != null,
    };
  }

  function notify() {
    for (const v of [...views]) {
      if (!v.el.isConnected) { views.delete(v); continue; }
      try { v.render(); } catch { /* one stale card must not break the rest */ }
    }
  }

  // A visit is stamped once per day per restaurant, only through a table URL, only for a real list.
  // Returns the new stamp count, or null when nothing was earned.
  function earn(r, table) {
    const s = state(r);
    if (!s || !table || s.debug || s.ready || s.doneToday) return null;
    const rec = read(r.id);
    write(r.id, { days: [...rec.days, today()], redeemed: rec.redeemed });
    track('loyalty_stamp');
    notify();
    return s.stamps + 1;
  }

  // The waiter redeems the gift: stamps reset, the redeemed count (history) goes up.
  function redeem(r) {
    const s = state(r);
    if (!s || !s.ready) return false;
    if (s.debug) debugOverride = 0;
    else write(r.id, { days: [], redeemed: s.redeemed + 1 });
    track('loyalty_redeem');
    notify();
    return true;
  }

  // ─── Markup ────────────────────────────────────────────────
  // The mark's shape lives in css/loyalty.css, per theme: dots, coffee beans, notched brand frames.
  const giftSvg = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path class="g-lid" d="M2 5.2h12v2.6H2z"/><path class="g-box" d="M3 7.8h10V14H3z"/><path class="g-rib" d="M8 5.2V14"/><path class="g-bow" d="M8 5.2C6 5.2 4.3 4.5 4.6 3.3 4.9 2.1 7.4 2.7 8 5.2Zm0 0c2 0 3.7-.7 3.4-1.9C11.1 2.1 8.6 2.7 8 5.2Z"/></svg>';

  function marks(s, newIndex) {
    let out = '';
    for (let i = 0; i < s.visits; i++) {
      const cls = `lm${i < s.stamps ? ' is-on' : ''}${i === newIndex ? ' is-new' : ''}${i === s.visits - 1 ? ' lm-gift' : ''}`;
      out += `<li class="${cls}">${i === s.visits - 1 ? giftSvg : '<i></i>'}</li>`;
    }
    return `<ol class="loyalty-marks" aria-hidden="true">${out}</ol>`;
  }

  function line(s) {
    const gift = s.gift ? esc(s.gift) : null;
    if (s.ready) return gift ? `${s.visits} of ${s.visits} visits · your gift is ready: ${gift}` : `${s.visits} of ${s.visits} visits · your gift from the house is ready`;
    return gift ? `${s.stamps} of ${s.visits} visits · on your ${ordinal(s.visits)}: ${gift}` : `${s.stamps} of ${s.visits} visits · a gift from the house on your ${ordinal(s.visits)}`;
  }

  function cardHTML(s, { newIndex = -1, claim = false, note = '' } = {}) {
    return `<div class="loyalty-card${s.ready ? ' is-ready' : ''}" data-loyalty-card data-stamps="${s.stamps}">
      ${marks(s, newIndex)}
      <p class="loyalty-line">${line(s)}</p>
      ${claim && s.ready ? '<button type="button" class="loyalty-claim" data-loyalty-claim>Show your gift</button>' : ''}
      ${note ? `<p class="loyalty-note" role="status">${esc(note)}</p>` : ''}
    </div>`;
  }

  function passHTML(s, r, note) {
    const name = esc(r.displayName || r.name);
    return `<section class="loyalty-pass" aria-labelledby="lo-pass-title">
      <p class="lo-pass-eyebrow">Your ${esc(ordinal(s.visits))} visit</p>
      <h3 id="lo-pass-title">A gift from ${name}</h3>
      ${s.gift ? `<p class="lo-pass-gift">${esc(s.gift)}</p>` : ''}
      <p class="lo-pass-help">Show this screen to your server.</p>
      <div class="loyalty-card loyalty-card--pass is-ready" data-loyalty-card data-stamps="${s.stamps}">${marks(s, -1)}</div>
      ${note ? `<p class="loyalty-note" role="status">${esc(note)}</p>` : ''}
      <button type="button" class="lo-hold" aria-label="Waiter: hold to redeem">
        <span class="lo-ring" aria-hidden="true"><span class="lo-half lo-half--r"><i></i></span><span class="lo-half lo-half--l"><i></i></span></span>
        <span class="lo-hold-label">Waiter: hold to redeem</span>
      </button>
      <button type="button" class="lo-confirm">Can’t hold? Tap to redeem</button>
    </section>`;
  }

  // ─── The quiet card under the banner ───────────────────────
  function mountPage(slot, r, { onClaim } = {}) {
    if (!slot || !config(r)) return;
    const render = () => {
      const s = state(r);
      slot.innerHTML = s ? cardHTML(s, { claim: !!onClaim }) : '';
    };
    render();
    views.add({ el: slot, render });
    if (onClaim) slot.addEventListener('click', (e) => { const b = e.target.closest('[data-loyalty-claim]'); if (b) onClaim(b); });
  }

  // ─── Inside "Show the waiter" ──────────────────────────────
  // Renders the compact card — or, on the 8th visit, the gift pass with its hold-to-redeem control.
  function waiter(el, { restaurant: r, table }) {
    if (!el || !config(r)) { if (el) el.innerHTML = ''; return { visit() { return false; } }; }
    let newIndex = -1;
    let note = '';
    let confirmTimer = 0;

    function render() {
      const s = state(r);
      if (!s) { el.innerHTML = ''; return; }
      el.innerHTML = s.ready ? passHTML(s, r, note) : cardHTML(s, { newIndex, note });
      if (s.ready) wirePass(el.querySelector('.loyalty-pass'));
    }

    function wirePass(pass) {
      const hold = pass.querySelector('.lo-hold');
      const confirm = pass.querySelector('.lo-confirm');
      let timer = 0;
      let holding = false;

      const done = () => {
        clearTimeout(timer);
        clearTimeout(confirmTimer);
        try { navigator.vibrate?.(24); } catch { /* not everywhere */ }
        note = 'Gift redeemed. The card starts again.';
        newIndex = -1;
        redeem(r); // re-renders every view, this one included
      };
      const start = () => {
        if (holding) return;
        holding = true;
        hold.classList.add('is-holding');
        hold.querySelector('.lo-hold-label').textContent = 'Keep holding…';
        timer = setTimeout(done, HOLD_MS);
      };
      const stop = () => {
        if (!holding) return;
        holding = false;
        clearTimeout(timer);
        hold.classList.remove('is-holding');
        hold.querySelector('.lo-hold-label').textContent = 'Waiter: hold to redeem';
      };

      hold.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        try { hold.setPointerCapture(e.pointerId); } catch { /* fine without capture */ }
        start();
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => hold.addEventListener(t, stop));
      hold.addEventListener('contextmenu', (e) => e.preventDefault()); // a long press must not open a menu
      // Keyboard: hold Space or Enter, same 1.2 s.
      hold.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
      hold.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
      hold.addEventListener('blur', stop);
      hold.addEventListener('click', (e) => e.preventDefault());

      // The plain fallback: one tap asks, a second tap within 4 s confirms.
      confirm.addEventListener('click', () => {
        if (confirm.dataset.armed) return done();
        confirm.dataset.armed = '1';
        confirm.textContent = 'Tap again to confirm';
        confirmTimer = setTimeout(() => { if (confirm.isConnected) { delete confirm.dataset.armed; confirm.textContent = 'Can’t hold? Tap to redeem'; } }, 4000);
      });
    }

    render();
    views.add({ el, render });

    return {
      // Called when the waiter screen opens. Stamps the visit if it is earned; returns true if so.
      visit(itemCount) {
        note = '';
        newIndex = -1;
        const n = itemCount > 0 ? earn(r, table) : null; // earn() re-renders this view
        if (n) {
          const s = state(r);
          note = s.ready ? `Visit ${n} stamped — your gift is ready` : `Visit ${n} stamped`;
          newIndex = n - 1;
        }
        render();
        return !!n;
      },
    };
  }

  window.MenvaLoyalty = { config, state, earn, redeem, mountPage, waiter, HOLD_MS };
})();
