// Diner plans (MENVA Plus, MENVA Black): table QR sessions stay free; away from a table the 3D
// needs a code from /unlock; codes that end fall back to the photo calmly. Codes are made through
// the local server's key-protected /api/codes, exactly as MENVA makes them (scripts/make-code.mjs).
import { test, expect } from '@playwright/test';
import { watch, openDish, events, glbRequested } from './helpers.mjs';

const DISH = 'steak-main';
const ADMIN_KEY = process.env.CODES_ADMIN_KEY || 'local-dev-codes-admin-key';
const requests = (page) => { const urls = []; page.on('request', (r) => urls.push(r.url())); return urls; };

async function makeCode(request, plan, expires = '2099-12-31') {
  const res = await request.post('/api/codes', { headers: { Authorization: `Bearer ${ADMIN_KEY}` }, data: { plan, expires } });
  expect(res.status()).toBe(201);
  return (await res.json()).code;
}
async function revoke(request, code) {
  const res = await request.post('/api/codes', { headers: { Authorization: `Bearer ${ADMIN_KEY}` }, data: { action: 'revoke', code } });
  expect(res.status()).toBe(200);
}
// A plan already on the phone, as js/plan.js stores it.
const seedPlan = (page, plan) => page.addInitScript((p) => localStorage.setItem('menva:plan', JSON.stringify(p)), plan);
const yesterday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(Date.now() - 86_400_000));

test.describe('table QR sessions stay free', () => {
  test('no plan: the 3D loads and no Plus line appears', async ({ page }) => {
    const w = watch(page);
    await page.goto('/g/12');
    await openDish(page, DISH);
    await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.dish-stage[data-tier]')).toHaveCount(1);
    await expect(page.locator('.plus-note')).toHaveCount(0);
    expect(await events(page)).not.toContain('plus_prompt');
    expect(w.errors).toEqual([]);
    expect(w.external).toEqual([]);
  });

  test('an ended plan on the phone changes nothing at the table', async ({ page }) => {
    await seedPlan(page, { code: '7K3MQ9TD2XHV', plan: 'plus', expires: yesterday(), status: 'ended', checked: Date.now() });
    await page.goto('/g/12');
    await openDish(page, DISH);
    await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.plus-note')).toHaveCount(0);
  });

  test('the table is remembered for the tab: /g after /g/12 is still free', async ({ page }) => {
    await page.goto('/g/12');
    await page.goto('/g');
    await expect(page.locator('.table-chip')).toHaveText('Table 12');
    await openDish(page, DISH);
    await expect(page.locator('.plus-note')).toHaveCount(0);
    await expect(page.locator('model-viewer')).toHaveCount(1);
  });
});

test('away from a table without Plus: the photo, one calm line, and no 3D downloaded', async ({ page }) => {
  const w = watch(page);
  const urls = requests(page);
  await page.goto('/g');
  await openDish(page, DISH);
  await expect(page.locator('.pass[data-state="still"]')).toBeVisible();
  await expect(page.locator('.pass-poster')).toBeVisible();
  await expect(page.locator('.plus-note')).toHaveText('3D and AR are free at the restaurant: scan the code on your table. Anywhere else, they come with MENVA Plus, PKR 99 a month.');
  await expect(page.locator('.plus-link')).toBeVisible();
  await expect(page.locator('model-viewer')).toHaveCount(0);
  await expect(page.locator('.ar-btn')).toHaveCount(0);
  // The rest of the sheet is untouched: details and "Add to my table" still work.
  await expect(page.locator('.tray-add-btn')).toBeVisible();
  expect(await events(page)).toContain('plus_prompt');
  await page.waitForTimeout(1000);
  expect(glbRequested(urls)).toBe(false);
  expect(urls.some((u) => u.includes('model-viewer.min.js'))).toBe(false);
  expect(w.errors).toEqual([]);
});

test('Plus unlock works: code in, back to the dish, 3D on', async ({ page, request }) => {
  const w = watch(page);
  const code = await makeCode(request, 'plus', '2099-12-31');
  await page.goto('/g');
  await openDish(page, DISH);
  await page.locator('.plus-link').click();

  await expect(page).toHaveURL(/\/unlock\?next=/);
  await expect(page.locator('h1')).toHaveText('Enter your code');
  await page.locator('#unlock-code').fill(code.toLowerCase().replace(/-/g, ' ')); // typed loosely
  await page.locator('.unlock-form button[type="submit"]').click();
  await expect(page.locator('.unlock-status')).toHaveText('MENVA Plus is on until 31 December 2099.');
  await expect(page.locator('.plan-card h2')).toHaveText('MENVA Plus is on');
  await expect(page.locator('.plan-badge')).toHaveCount(0); // the badge is Black's

  await page.locator('.unlock-back').click();
  await expect(page).toHaveURL(/\/g$/);
  await expect(page.locator('dialog[open]')).toBeVisible();
  await expect(page.locator('.plus-note')).toHaveCount(0);
  await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });

  // Still on after a reload, with no table.
  await page.reload();
  await openDish(page, DISH);
  await expect(page.locator('model-viewer')).toHaveCount(1);
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test.describe('codes that end fall back gracefully', () => {
  test('entering an expired code says when it ended and unlocks nothing', async ({ page, request }) => {
    const code = await makeCode(request, 'plus', '2026-01-31');
    await page.goto('/unlock');
    await page.locator('#unlock-code').fill(code);
    await page.locator('.unlock-form button[type="submit"]').click();
    await expect(page.locator('.unlock-status')).toHaveText('That code ended on 31 January 2026. Table QR menus stay free; message MENVA on WhatsApp for a new code.');
    await expect(page.locator('.plan-card')).toHaveCount(0);

    await page.goto('/g');
    await openDish(page, DISH);
    await expect(page.locator('.plus-note')).toBeVisible();
  });

  test('a plan whose end date passed on the phone drops to the photo, and /unlock says so', async ({ page }) => {
    const w = watch(page);
    // checked long ago → the app asks the server once; this code doesn't exist there, which is also "ended".
    await seedPlan(page, { code: '7K3MQ9TD2XHV', plan: 'plus', expires: yesterday(), status: 'active', checked: Date.now() - 2 * 86_400_000 });
    await page.goto('/g');
    await openDish(page, DISH);
    await expect(page.locator('.pass[data-state="still"]')).toBeVisible();
    await expect(page.locator('.plus-note')).toBeVisible();
    await expect(page.locator('model-viewer')).toHaveCount(0);

    await page.goto('/unlock');
    await expect(page.locator('.plan-card-ended h2')).toHaveText(/^MENVA Plus ended on /);
    await page.locator('.plan-remove').click();
    await page.locator('.plan-remove').click();
    await expect(page.locator('.plan-card')).toHaveCount(0);
    expect(w.errors).toEqual([]);
  });

  test('a code switched off by MENVA stops working at the next daily check', async ({ page, request }) => {
    const code = await makeCode(request, 'plus');
    await revoke(request, code);
    await seedPlan(page, { code: code.replace(/-/g, ''), plan: 'plus', expires: '2099-12-31', status: 'active', checked: Date.now() - 2 * 86_400_000 });
    await page.goto('/g');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('menva:plan')).status)).toBe('revoked');
    await openDish(page, DISH);
    await expect(page.locator('.plus-note')).toBeVisible();
  });
});

test('the plan is re-checked with MENVA at most once a day', async ({ page }) => {
  let checks = 0;
  page.on('request', (r) => { if (r.url().endsWith('/api/unlock')) checks++; });
  await seedPlan(page, { code: '7K3MQ9TD2XHV', plan: 'plus', expires: '2099-12-31', status: 'active', checked: Date.now() - 60_000 });
  await page.goto('/g');
  await openDish(page, DISH);
  await expect(page.locator('model-viewer')).toHaveCount(1); // trusted from the phone, no network needed
  await page.waitForTimeout(500);
  expect(checks).toBe(0);
});

test('a host without the unlock function reads as "can’t check", never "wrong code"', async ({ page }) => {
  await page.route('**/api/unlock', (route) => route.fulfill({ status: 404, contentType: 'text/html', body: '<h1>Not found</h1>' }));
  await page.goto('/unlock');
  await page.locator('#unlock-code').fill('7K3M-Q9TD-2XHV');
  await page.locator('.unlock-form button[type="submit"]').click();
  await expect(page.locator('.unlock-status')).toHaveText('Codes can’t be checked right now. Try again in a few minutes.');
  await page.locator('#unlock-code').fill('7K3M');
  await page.locator('.unlock-form button[type="submit"]').click();
  await expect(page.locator('.unlock-status')).toHaveText(/has 12 letters and numbers/);
});

test('MENVA Black: badge on the menu header, opt-in visit tier from table scans', async ({ page, request }) => {
  const w = watch(page);
  const code = await makeCode(request, 'black');
  await page.goto('/unlock');
  await page.locator('#unlock-code').fill(code);
  await page.locator('.unlock-form button[type="submit"]').click();
  await expect(page.locator('.plan-card-black h2')).toHaveText('MENVA Black is on');
  await expect(page.locator('.plan-badge')).toHaveText('MENVA Black'); // no tier until the diner opts in

  // Not counting yet: a table scan leaves no trace.
  await page.goto('/g/12');
  await expect(page.locator('.topbar .plan-badge')).toHaveText('MENVA Black');
  expect(await page.evaluate(() => localStorage.getItem('menva:visits'))).toBeNull();

  await page.goto('/unlock');
  await page.locator('.plan-count').check();
  await expect(page.locator('.plan-tier')).toHaveText('0 visits · 1 more to Regular');

  await page.goto('/g/12');
  await expect(page.locator('.topbar .plan-badge')).toHaveText('MENVA BlackRegular');
  await page.goto('/g/7'); // same day, another table: still one visit
  await page.goto('/unlock');
  await expect(page.locator('.plan-tier')).toHaveText('Regular · 1 visit · 3 more to Known');
  // Visits live on the phone only: nothing about them in the analytics queue.
  expect(JSON.stringify(await page.evaluate(() => window.__menvaEvents))).not.toContain('visit');
  expect(w.errors).toEqual([]);
});
