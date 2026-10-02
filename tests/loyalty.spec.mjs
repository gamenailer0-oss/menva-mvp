// Loyalty stamp card: one stamp per calendar day, earned through a table URL + "Show the waiter" with a
// dish on the list; the Nth visit is a gift pass the waiter redeems; nothing is shown when disabled.
// Everything lives on the phone (localStorage) — no account, no personal data.
import { test, expect } from '@playwright/test';
import { watch, openDish, events } from './helpers.mjs';

const RESTAURANTS = [
  { id: 'haute-dolci', slug: 'haute-dolci', name: 'Haute Dolci', dish: 'hd-san-sebastian' },
  { id: 'baraza', slug: 'baraza', name: 'Baraza', dish: 'bz-flat-white' },
  { id: 'gauchos', slug: 'g', name: 'Gauchos', dish: 'steak-main' },
];
const HD = RESTAURANTS[0];
const KEY = (id) => `menva:loyalty:${id}`;
const LINE = (n, v = 8) => `${n} of ${v} visits · a gift from the house on your 8th`;

// Puts one dish on table 12's list before the page loads, so a test can go straight to "Show the waiter".
const seedTray = (page, r, table = '12') => page.addInitScript(({ id, dish, table }) => {
  localStorage.setItem(`menva:tray:${id}:${table}`, JSON.stringify({ updated: Date.now(), items: [{ id: dish, qty: 1, note: '' }] }));
}, { id: r.id, dish: r.dish, table });

const seedDays = (page, r, days, redeemed = 0) => page.addInitScript(({ key, days, redeemed }) => {
  localStorage.setItem(key, JSON.stringify({ days, redeemed }));
}, { key: KEY(r.id), days, redeemed });

const stored = (page, r) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), KEY(r.id));
const pastDays = (n) => Array.from({ length: n }, (_, i) => `2025-03-${String(i + 1).padStart(2, '0')}`);

// Serves the menu data with the loyalty config changed, to test disabled / named-gift states.
async function withLoyalty(page, loyalty) {
  await page.route('**/data/menu.json', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    for (const r of json.restaurants) r.loyalty = loyalty;
    await route.fulfill({ response: res, json });
  });
}

const openWaiter = async (page) => {
  await page.locator('#tray-pill').click();
  await expect(page.locator('#waiter-dialog')).toBeVisible();
};

test('the card sits quietly under the banner of every restaurant, never as a pop-up', async ({ page }) => {
  const w = watch(page);
  for (const r of RESTAURANTS) {
    await page.goto(`/${r.slug}/12`);
    const card = page.locator('.loyalty-slot .loyalty-card');
    await expect(card).toBeVisible();
    await expect(card.locator('.lm')).toHaveCount(8);
    await expect(card.locator('.lm-gift')).toHaveCount(1); // the 8th mark is the gift
    await expect(card.locator('.loyalty-line')).toHaveText(LINE(0));
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  }
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('each restaurant draws its own mark: dots, coffee beans, notched frames', async ({ page }) => {
  const shape = async (slug) => {
    await page.goto(`/${slug}/12`);
    return page.locator('.loyalty-slot .lm:not(.lm-gift) i').first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { radius: s.borderRadius, clip: s.clipPath, w: s.width, h: s.height };
    });
  };
  const hd = await shape('haute-dolci');
  const bz = await shape('baraza');
  const g = await shape('g');
  expect(hd.radius).toBe('50%'); // soft round dot
  expect(hd.w).toBe(hd.h);
  expect(bz.radius).toBe('50%'); // oval bean — taller than wide
  expect(parseFloat(bz.h)).toBeGreaterThan(parseFloat(bz.w));
  expect(g.clip).not.toBe('none'); // notched brand frame
});

test('?stamps=N previews a state without touching storage', async ({ page }) => {
  for (const n of [0, 3, 7]) {
    await page.goto(`/haute-dolci/12?stamps=${n}`);
    await expect(page.locator('.loyalty-slot .lm.is-on')).toHaveCount(n);
    await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText(LINE(n));
  }
  await page.goto('/haute-dolci/12?stamps=8');
  await expect(page.locator('.loyalty-slot .lm.is-on')).toHaveCount(8);
  await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText('8 of 8 visits · your gift from the house is ready');
  expect(await stored(page, HD)).toBeNull();
});

test('a stamp is earned from a table URL by showing the waiter a real list — once per day', async ({ page }) => {
  const w = watch(page);
  await seedTray(page, HD);
  await page.goto('/haute-dolci/12');
  expect(await stored(page, HD)).toBeNull(); // opening the menu alone earns nothing

  await openWaiter(page);
  await expect(page.locator('#waiter-dialog .loyalty-note')).toHaveText('Visit 1 stamped');
  await expect(page.locator('#waiter-dialog .lm.is-on')).toHaveCount(1);
  await expect(page.locator('#waiter-dialog .lm.is-new')).toHaveCount(1); // the stamp-in animation target
  await expect(page.locator('#waiter-dialog .loyalty-line')).toHaveText(LINE(1));

  const rec = await stored(page, HD);
  const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  expect(rec).toEqual({ days: [today], redeemed: 0 });
  expect(Object.keys(rec)).toEqual(['days', 'redeemed']); // nothing personal

  // Same day, again: no second stamp, no confirmation
  await page.keyboard.press('Escape');
  await openWaiter(page);
  await expect(page.locator('#waiter-dialog .lm.is-on')).toHaveCount(1);
  await expect(page.locator('#waiter-dialog .loyalty-note')).toHaveCount(0);
  expect((await stored(page, HD)).days).toHaveLength(1);

  // The quiet card behind the dialog caught up too
  await page.keyboard.press('Escape');
  await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText(LINE(1));

  expect(await events(page)).toContain('loyalty_stamp');
  expect((await events(page)).filter((e) => e === 'loyalty_stamp')).toHaveLength(1);
  expect(w.errors).toEqual([]);
});

test('a new day earns the next stamp', async ({ page }) => {
  await seedDays(page, HD, pastDays(2));
  await seedTray(page, HD);
  await page.goto('/haute-dolci/12');
  await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText(LINE(2));
  await openWaiter(page);
  await expect(page.locator('#waiter-dialog .loyalty-note')).toHaveText('Visit 3 stamped');
  expect((await stored(page, HD)).days).toHaveLength(3);
});

test('no table URL, no stamp; an empty list, no stamp', async ({ page }) => {
  await seedTray(page, HD, 'none'); // a list for "no table"
  await page.goto('/haute-dolci'); // arrived without a table URL
  await openWaiter(page);
  await expect(page.locator('#waiter-title')).toHaveText('Your order');
  await expect(page.locator('#waiter-dialog .loyalty-note')).toHaveCount(0);
  expect(await stored(page, HD)).toBeNull();

  // Table, but nothing on the list: the waiter screen can't be opened, so nothing is stamped
  await page.goto('/baraza/12');
  await expect(page.locator('#tray-pill')).toBeHidden();
  expect(await stored(page, RESTAURANTS[1])).toBeNull();
});

test('adding a dish from the sheet then showing the waiter stamps the visit (full journey)', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, 'steak-main');
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await openWaiter(page);
  await expect(page.locator('#waiter-dialog .loyalty-note')).toHaveText('Visit 1 stamped');
});

test('the stamp is kept in memory when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    const boom = () => { throw new Error('blocked'); };
    Storage.prototype.getItem = boom; Storage.prototype.setItem = boom; Storage.prototype.removeItem = boom;
  });
  const w = watch(page);
  await page.goto('/haute-dolci/12');
  await page.evaluate(() => MenvaTray.add('haute-dolci', '12', 'hd-san-sebastian', 1, ''));
  await openWaiter(page);
  await expect(page.locator('#waiter-dialog .loyalty-note')).toHaveText('Visit 1 stamped');
  expect(w.errors).toEqual([]);
});

test('the 8th visit is a full-width gift pass with the restaurant name; gift null says "from the house"', async ({ page }) => {
  await seedDays(page, HD, pastDays(7));
  await seedTray(page, HD);
  await page.goto('/haute-dolci/12');
  await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText(LINE(7));
  await openWaiter(page);

  const pass = page.locator('.loyalty-pass');
  await expect(pass).toBeVisible();
  await expect(pass.locator('h3')).toHaveText('A gift from Haute Dolci');
  await expect(page.locator('#waiter-dialog .loyalty-note')).toHaveText('Visit 8 stamped — your gift is ready');
  await expect(pass.locator('.lo-pass-gift')).toHaveCount(0); // never an invented item
  await expect(pass).not.toContainText(/free|cake|cookie|dessert|coffee/i);
  await expect(pass.locator('.lm.is-on')).toHaveCount(8);
  await expect(pass.locator('.lo-hold')).toContainText('Waiter: hold to redeem');

  // Full width of the content column and a comfortable touch target
  const box = await pass.boundingBox();
  const holdBox = await pass.locator('.lo-hold').boundingBox();
  expect(box.width).toBeGreaterThan(300);
  expect(holdBox.height).toBeGreaterThanOrEqual(44);

  // The quiet card behind now offers the pass
  await page.keyboard.press('Escape');
  await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText('8 of 8 visits · your gift from the house is ready');
});

test('redeem with the two-tap fallback: stamps reset, history kept, event sent', async ({ page }) => {
  await seedDays(page, HD, pastDays(8), 2);
  await seedTray(page, HD);
  await page.goto('/haute-dolci/12');
  await openWaiter(page);

  const confirm = page.locator('.lo-confirm');
  await confirm.click(); // first tap only asks
  await expect(confirm).toHaveText('Tap again to confirm');
  await expect(page.locator('.loyalty-pass')).toBeVisible();
  expect(await stored(page, HD)).toEqual({ days: pastDays(8), redeemed: 2 });
  await confirm.click();

  await expect(page.locator('.loyalty-pass')).toHaveCount(0);
  await expect(page.locator('#waiter-dialog .loyalty-note')).toHaveText('Gift redeemed. The card starts again.');
  await expect(page.locator('#waiter-dialog .loyalty-line')).toHaveText(LINE(0));
  expect(await stored(page, HD)).toEqual({ days: [], redeemed: 3 });
  expect(await events(page)).toContain('loyalty_redeem');

  await page.keyboard.press('Escape');
  await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText(LINE(0));
});

test('press and hold for 1.2 s redeems; letting go early does not', async ({ page }) => {
  await seedDays(page, HD, pastDays(8));
  await seedTray(page, HD);
  await page.goto('/haute-dolci/12');
  await openWaiter(page);

  const hold = page.locator('.lo-hold');
  const box = await hold.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await expect(hold).toHaveClass(/is-holding/);
  await page.waitForTimeout(500);
  await page.mouse.up();
  await expect(hold).not.toHaveClass(/is-holding/);
  await expect(page.locator('.loyalty-pass')).toBeVisible();
  expect((await stored(page, HD)).redeemed).toBe(0);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await expect(page.locator('.loyalty-pass')).toHaveCount(0);
  expect(await stored(page, HD)).toEqual({ days: [], redeemed: 1 });
});

test('?stamps=8 preview: the pass can be redeemed and resets, without storage', async ({ page }) => {
  await seedTray(page, HD);
  await page.goto('/haute-dolci/12?stamps=8');
  await openWaiter(page);
  await expect(page.locator('.loyalty-pass h3')).toHaveText('A gift from Haute Dolci');
  await page.locator('.lo-confirm').click();
  await page.locator('.lo-confirm').click();
  await expect(page.locator('#waiter-dialog .loyalty-line')).toHaveText(LINE(0));
  expect(await stored(page, HD)).toBeNull();
});

test('disabled: nothing is rendered on the page or the waiter screen, and nothing is stamped', async ({ page }) => {
  await withLoyalty(page, { enabled: false, visits: 8, gift: null });
  await seedTray(page, HD);
  await page.goto('/haute-dolci/12');
  await expect(page.locator('#tray-pill')).toBeVisible();
  await expect(page.locator('.loyalty-slot')).toBeHidden();
  expect(await page.locator('.loyalty-slot').evaluate((el) => el.innerHTML)).toBe('');
  await openWaiter(page);
  await expect(page.locator('#waiter-dialog .loyalty-card')).toHaveCount(0);
  await expect(page.locator('#waiter-dialog .loyalty-pass')).toHaveCount(0);
  await expect(page.locator('.waiter-loyalty')).toBeHidden();
  expect(await stored(page, HD)).toBeNull();
  expect(await events(page)).not.toContain('loyalty_stamp');
});

test('a restaurant with no loyalty setting shows nothing', async ({ page }) => {
  await page.route('**/data/menu.json', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    for (const r of json.restaurants) delete r.loyalty;
    await route.fulfill({ response: res, json });
  });
  await page.goto('/g/12');
  await expect(page.locator('.restaurant-page')).toBeVisible();
  await expect(page.locator('.loyalty-card')).toHaveCount(0);
});

test('a named gift is shown as the restaurant wrote it', async ({ page }) => {
  await withLoyalty(page, { enabled: true, visits: 8, gift: 'Slice of the house cheesecake' });
  await page.goto('/haute-dolci/12?stamps=3');
  await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText('3 of 8 visits · on your 8th: Slice of the house cheesecake');
  await seedTray(page, HD);
  await page.goto('/haute-dolci/12?stamps=8');
  await openWaiter(page);
  await expect(page.locator('.lo-pass-gift')).toHaveText('Slice of the house cheesecake');
});

test('another visit count is honoured', async ({ page }) => {
  await withLoyalty(page, { enabled: true, visits: 5, gift: null });
  await page.goto('/baraza/12?stamps=2');
  await expect(page.locator('.loyalty-slot .lm')).toHaveCount(5);
  await expect(page.locator('.loyalty-slot .loyalty-line')).toHaveText('2 of 5 visits · a gift from the house on your 5th');
});

test('cards stay inside the screen at 360px, light and dark', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const r of RESTAURANTS) {
    await page.goto(`/${r.slug}/12?stamps=7`);
    await page.locator('[data-mode-toggle]').click();
    const box = await page.locator('.loyalty-slot .loyalty-card').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  }
});
