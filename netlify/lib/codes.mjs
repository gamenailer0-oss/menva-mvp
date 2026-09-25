// Unlock codes for the diner plans (MENVA Plus, MENVA Black). Platform-agnostic request handlers
// called by functions/api/unlock.js and functions/api/codes.js (Cloudflare Pages + KV), and by
// scripts/serve.mjs locally with an in-memory store.
//
// Payments are manual: the diner pays by bank transfer / JazzCash / Easypaisa, MENVA creates a
// code (POST /api/codes, key-protected) and sends it on WhatsApp, the diner types it on /unlock.
//
// A code is not an account. The stored record holds the plan and dates only — no name, no phone
// number, no device, no IP. Store key: `code:<12 characters>` → { plan, expires, created, revoked? }.
//
// Codes are 12 characters of Crockford base32 (60 random bits), shown as XXXX-XXXX-XXXX. Guessing
// one is not practical even at thousands of tries a second, so the check needs no IP-based limit.

import { sameKey } from './events.mjs';

export const PLANS = ['plus', 'black'];
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I, L, O, U: nothing to misread on WhatsApp
const CODE_LENGTH = 12;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BODY_BYTES = 1024;

const noStore = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...noStore, 'Content-Type': 'application/json; charset=utf-8' } });

// Plans run by the calendar in Lahore: a code with expires "2026-10-25" works through that whole day.
export const lahoreDay = (date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(date);

export function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b & 31]).join(''); // 256 is a multiple of 32: no bias
}

// What the diner typed → the 12 stored characters, or null. Case, spaces and dashes don't matter,
// and the letters people swap for digits are read as the digits.
export function normalise(input) {
  if (typeof input !== 'string' || input.length > 40) return null;
  const s = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== CODE_LENGTH) return null;
  for (const c of s) if (!ALPHABET.includes(c)) return null;
  return s;
}

export const format = (code) => code.match(/.{4}/g).join('-');
const storeKey = (code) => `code:${code}`;

export function validDate(s) {
  if (typeof s !== 'string' || !DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && s >= '2026-01-01' && s <= '2100-12-31';
}

// → 'active' | 'expired' | 'revoked'
export function statusOf(record, today = lahoreDay()) {
  if (record.revoked) return 'revoked';
  return today <= record.expires ? 'active' : 'expired';
}

async function readJSON(req) {
  if (Number(req.headers.get('content-length') || 0) > MAX_BODY_BYTES) return null;
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// POST /api/unlock { code } — the diner's check, on /unlock and then at most once a day.
// 200 { status: 'active' | 'expired' | 'revoked', plan, expires } · 200 { status: 'unknown' } · 400
// A wrong code is an answer, not an HTTP error (so the diner's browser logs nothing). The page only
// trusts answers carrying this JSON status, so a host without /api/unlock — whose own 404 or HTML
// fallback page has none — reads as "can't check right now", never as "wrong code".
export async function handleUnlock(req, store) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  // Only our own pages check codes (browsers always attach Origin to fetch POSTs).
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(req.url).host) return json(403, { error: 'origin' });

  const body = await readJSON(req);
  const code = normalise(body?.code);
  if (!code) return json(400, { status: 'invalid' });

  const record = await store.get(storeKey(code));
  if (!record || !PLANS.includes(record.plan)) return json(200, { status: 'unknown' });
  return json(200, { status: statusOf(record), plan: record.plan, expires: record.expires });
}

// POST /api/codes — MENVA only. Authorization: Bearer <CODES_ADMIN_KEY>.
//   { plan: 'plus' | 'black', expires: 'YYYY-MM-DD' }   → create: 201 { code, plan, expires }
//   { action: 'get',    code }                          → 200 { code, plan, expires, created, status }
//   { action: 'extend', code, expires }                 → renew in place (same code keeps working)
//   { action: 'revoke', code }                          → switch it off (refund, shared publicly…)
// scripts/make-code.mjs wraps this for use from a laptop.
export async function handleAdmin(req, store, env) {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  const secret = env.CODES_ADMIN_KEY;
  if (!secret || secret.length < 24) return json(503, { error: 'Codes are not set up: add a CODES_ADMIN_KEY secret (24+ characters).' });
  const auth = req.headers.get('authorization') || '';
  if (!sameKey(auth.replace(/^Bearer\s+/i, ''), secret)) return json(401, { error: 'Wrong key' });

  const body = await readJSON(req);
  if (!body || typeof body !== 'object') return json(400, { error: 'Send a JSON body' });
  const action = body.action || 'create';

  if (action === 'create') {
    if (!PLANS.includes(body.plan)) return json(400, { error: `plan must be one of: ${PLANS.join(', ')}` });
    if (!validDate(body.expires)) return json(400, { error: 'expires must be a date, YYYY-MM-DD' });
    let code;
    for (let i = 0; i < 5 && !code; i++) {
      const c = generateCode();
      if (!(await store.get(storeKey(c)))) code = c;
    }
    if (!code) return json(500, { error: 'Could not pick an unused code; try again' });
    const record = { plan: body.plan, expires: body.expires, created: lahoreDay() };
    await store.setJSON(storeKey(code), record);
    return json(201, { code: format(code), plan: record.plan, expires: record.expires, status: statusOf(record) });
  }

  const code = normalise(body.code);
  if (!code) return json(400, { error: 'code is missing or malformed' });
  const record = await store.get(storeKey(code));
  if (!record) return json(404, { error: 'No such code' });

  if (action === 'extend') {
    if (!validDate(body.expires)) return json(400, { error: 'expires must be a date, YYYY-MM-DD' });
    record.expires = body.expires;
    delete record.revoked;
    await store.setJSON(storeKey(code), record);
  } else if (action === 'revoke') {
    record.revoked = true;
    await store.setJSON(storeKey(code), record);
  } else if (action !== 'get') {
    return json(400, { error: 'action must be create, get, extend or revoke' });
  }
  return json(200, { code: format(code), ...record, status: statusOf(record) });
}
