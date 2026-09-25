// Unit tests for MENVA Plus / Black unlock codes (netlify/lib/codes.mjs). Run: npm run test:unit
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCode, normalise, format, validDate, statusOf, lahoreDay, handleUnlock, handleAdmin } from '../netlify/lib/codes.mjs';

const memoryStore = () => {
  const m = new Map();
  return {
    m,
    async setJSON(k, v) { m.set(k, JSON.stringify(v)); },
    async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : null; },
  };
};
const KEY = 'test-codes-admin-key-0123456789';
const admin = (body, key = KEY) => new Request('https://menva.test/api/codes', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
  body: JSON.stringify(body),
});
const unlock = (body, headers = {}) => new Request('https://menva.test/api/unlock', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://menva.test', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const env = { CODES_ADMIN_KEY: KEY };

test('codes are 12 unambiguous characters and read back forgivingly', () => {
  const c = generateCode();
  assert.match(c, /^[0-9A-HJKMNP-TV-Z]{12}$/);
  assert.equal(normalise(format(c)), c);
  assert.equal(normalise(' 7k3m-q9td 2xhv '), '7K3MQ9TD2XHV');
  assert.equal(normalise('7K3M-Q9TD-2XHO'), '7K3MQ9TD2XH0'); // O read as zero
  assert.equal(normalise('7K3M-Q9TD-2XHI'), '7K3MQ9TD2XH1'); // I read as one
  assert.equal(normalise('7K3M-Q9TD-2XH'), null);
  assert.equal(normalise('7K3M-Q9TD-2XHU'), null); // U is never issued
  assert.equal(normalise(42), null);
});

test('dates are real calendar days; a plan runs through its last day', () => {
  assert.ok(validDate('2026-10-25'));
  assert.ok(!validDate('2026-02-30'));
  assert.ok(!validDate('25-10-2026'));
  assert.equal(statusOf({ expires: '2026-10-25' }, '2026-10-25'), 'active');
  assert.equal(statusOf({ expires: '2026-10-25' }, '2026-10-26'), 'expired');
  assert.equal(statusOf({ expires: '2099-01-01', revoked: true }, '2026-10-01'), 'revoked');
  assert.match(lahoreDay(), /^\d{4}-\d{2}-\d{2}$/);
});

test('admin: wrong or missing key is refused; no key configured means not set up', async () => {
  const store = memoryStore();
  assert.equal((await handleAdmin(admin({ plan: 'plus', expires: '2099-01-01' }, 'nope'), store, env)).status, 401);
  assert.equal((await handleAdmin(admin({ plan: 'plus', expires: '2099-01-01' }), store, {})).status, 503);
  assert.equal((await handleAdmin(admin({ plan: 'plus', expires: '2099-01-01' }), store, { CODES_ADMIN_KEY: 'short' })).status, 503);
  assert.equal(store.m.size, 0);
});

test('admin creates a code the diner can unlock; only plan and dates are stored', async () => {
  const store = memoryStore();
  const res = await handleAdmin(admin({ plan: 'black', expires: '2099-01-01', name: 'Ali', phone: '0300' }), store, env);
  assert.equal(res.status, 201);
  const made = await res.json();
  assert.match(made.code, /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  const [stored] = [...store.m.values()].map((v) => JSON.parse(v));
  assert.deepEqual(Object.keys(stored).sort(), ['created', 'expires', 'plan']);

  const ok = await handleUnlock(unlock({ code: made.code.toLowerCase() }), store);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { status: 'active', plan: 'black', expires: '2099-01-01' });
});

test('admin rejects bad plans and dates', async () => {
  const store = memoryStore();
  assert.equal((await handleAdmin(admin({ plan: 'gold', expires: '2099-01-01' }), store, env)).status, 400);
  assert.equal((await handleAdmin(admin({ plan: 'plus', expires: 'next month' }), store, env)).status, 400);
  assert.equal((await handleAdmin(admin({ action: 'delete', code: '7K3M-Q9TD-2XHV' }), store, env)).status, 404);
});

test('expired, revoked and extended codes answer with their state', async () => {
  const store = memoryStore();
  const { code } = await (await handleAdmin(admin({ plan: 'plus', expires: '2026-01-31' }), store, env)).json();
  assert.deepEqual(await (await handleUnlock(unlock({ code }), store)).json(), { status: 'expired', plan: 'plus', expires: '2026-01-31' });

  await handleAdmin(admin({ action: 'extend', code, expires: '2099-01-01' }), store, env);
  assert.equal((await (await handleUnlock(unlock({ code }), store)).json()).status, 'active');

  await handleAdmin(admin({ action: 'revoke', code }), store, env);
  assert.equal((await (await handleUnlock(unlock({ code }), store)).json()).status, 'revoked');
  // A renewal switches a revoked code back on.
  await handleAdmin(admin({ action: 'extend', code, expires: '2099-02-01' }), store, env);
  assert.equal((await (await handleUnlock(unlock({ code }), store)).json()).status, 'active');
});

test('unlock: unknown and malformed codes, other origins, big bodies, wrong method', async () => {
  const store = memoryStore();
  const unknown = await handleUnlock(unlock({ code: '7K3M-Q9TD-2XHV' }), store);
  assert.equal(unknown.status, 200); // an answer, not an error: the diner's console stays clean
  assert.deepEqual(await unknown.json(), { status: 'unknown' });
  assert.equal((await handleUnlock(unlock({ code: 'hello' }), store)).status, 400);
  assert.equal((await handleUnlock(unlock('{nope'), store)).status, 400);
  assert.equal((await handleUnlock(unlock({ code: '7K3M-Q9TD-2XHV' }, { origin: 'https://evil.test' }), store)).status, 403);
  assert.equal((await handleUnlock(unlock({ code: 'x'.repeat(5000) }), store)).status, 400);
  assert.equal((await handleUnlock(new Request('https://menva.test/api/unlock'), store)).status, 405);
  const res = await handleUnlock(unlock({ code: '7K3M-Q9TD-2XHV' }), store);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});
