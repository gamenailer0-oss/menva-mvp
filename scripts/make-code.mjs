// MENVA Plus / Black codes, for manual payments: after a transfer lands, make a code and send the
// printed WhatsApp message to the diner. Talks to the key-protected POST /api/codes.
//
//   CODES_ADMIN_KEY=… npm run code -- create plus            (1 month from today, Lahore time)
//   CODES_ADMIN_KEY=… npm run code -- create black --months 3
//   CODES_ADMIN_KEY=… npm run code -- create plus --until 2026-12-31
//   CODES_ADMIN_KEY=… npm run code -- get    7K3M-Q9TD-2XHV
//   CODES_ADMIN_KEY=… npm run code -- extend 7K3M-Q9TD-2XHV --months 1   (from its current end date)
//   CODES_ADMIN_KEY=… npm run code -- revoke 7K3M-Q9TD-2XHV
//
// Site: SITE_URL, else data/site.json's domain. Locally: SITE_URL=http://localhost:8080 (the local
// server's key is local-dev-codes-admin-key). Keep no personal details with a code — match codes to
// payments in MENVA's own records.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLANS, lahoreDay, validDate } from '../netlify/lib/codes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
const origin = (process.env.SITE_URL || (site.domain ? `https://${site.domain}` : '')).replace(/\/+$/, '');
const key = process.env.CODES_ADMIN_KEY;

const USAGE = 'Usage: npm run code -- create <plus|black> [--months N | --until YYYY-MM-DD]\n' +
  '       npm run code -- get|revoke <code>\n' +
  '       npm run code -- extend <code> [--months N | --until YYYY-MM-DD]';
const fail = (msg) => { console.error(msg); process.exit(1); };

const [action, arg, ...rest] = process.argv.slice(2);
const flag = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
if (!['create', 'get', 'extend', 'revoke'].includes(action) || !arg) fail(USAGE);
if (!origin) fail('Set SITE_URL (e.g. https://menva.pages.dev), or the domain in data/site.json.');
if (!key) fail('Set CODES_ADMIN_KEY (the same secret as on the site).');

// Same day of the month, N months on; clamped to the month's last day (31 Jan + 1 → 28/29 Feb).
function addMonths(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))).toISOString().slice(0, 10);
}
function endDate(from) {
  const until = flag('until');
  if (until) { if (!validDate(until)) fail('--until must be a date, YYYY-MM-DD'); return until; }
  const months = Number(flag('months') ?? 1);
  if (!Number.isInteger(months) || months < 1 || months > 12) fail('--months must be 1–12');
  return addMonths(from, months);
}

async function call(body) {
  const res = await fetch(`${origin}/api/codes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) fail(`${res.status}: ${data?.error || 'no answer from /api/codes — is it deployed?'}`);
  return data;
}

const human = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const NAME = { plus: 'MENVA Plus', black: 'MENVA Black' };

let out;
if (action === 'create') {
  if (!PLANS.includes(arg)) fail(`Plan must be one of: ${PLANS.join(', ')}`);
  out = await call({ plan: arg, expires: endDate(lahoreDay()) });
} else if (action === 'extend') {
  const current = await call({ action: 'get', code: arg });
  const from = current.expires > lahoreDay() ? current.expires : lahoreDay();
  out = await call({ action: 'extend', code: arg, expires: endDate(from) });
} else {
  out = await call({ action, code: arg });
}

console.log(`${out.code}  ${NAME[out.plan]}  until ${out.expires}  (${out.status})`);
if (action === 'create' || action === 'extend') {
  console.log('\nWhatsApp message:\n');
  console.log(action === 'create'
    ? `Your ${NAME[out.plan]} code: ${out.code}\nOpen ${origin}/unlock and type it in. It works until ${human(out.expires)}.`
    : `Your ${NAME[out.plan]} now runs until ${human(out.expires)}. Same code (${out.code}); nothing to re-enter, the app picks it up within a day.`);
  console.log('\n(New codes can take up to a minute to work everywhere.)');
}
