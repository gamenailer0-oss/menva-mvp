// Baraza Coffee — the second restaurant (private pitch demo, slug "baraza"). Confirms the theme,
// banner, coffee-specific dish fields (origin / tasting notes / brew / serve) and that Gauchos and
// the home page are unaffected.
import { test, expect } from '@playwright/test';
import { watch, openDish } from './helpers.mjs';

test('menu page: theme, banner, categories, accent', async ({ page }) => {
  const w = watch(page);
  await page.goto('/baraza/12');

  await test.step('body carries the baraza theme', async () => {
    expect(await page.evaluate(() => document.body.dataset.theme)).toBe('baraza');
  });

  await test.step('the brand band shows the round logo, hours and table', async () => {
    const band = page.locator('.restaurant-band');
    await expect(band).toBeVisible();
    await expect(band.locator('.band-logo')).toBeVisible();
    await expect(band.locator('.band-logo')).toHaveAttribute('src', /baraza-logo\.webp/);
    await expect(band).toContainText('Open 24/7');
    await expect(band.locator('.table-chip')).toHaveText('Table 12');
  });

  await test.step('category headings are present', async () => {
    for (const name of ['Specialty Coffee', 'Chillers', 'Brunch', 'Kitchen']) {
      await expect(page.locator('.menu-category > h3', { hasText: name })).toBeVisible();
    }
  });

  await test.step('the accent is deep olive', async () => {
    const accent = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim());
    expect(accent.toLowerCase()).toBe('#4b5a2b');
  });

  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('dark mode: "espresso by night" switches the paper', async ({ page }) => {
  await page.goto('/baraza/12');
  await page.locator('[data-mode-toggle]').click();
  expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe('dark');
  // body has `transition: background var(--ease-fast)` (160ms) — wait for it to settle.
  const paper = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect.poll(paper, { timeout: 2000 }).toBe('rgb(16, 21, 15)');
});

test('dish sheet: bean card only when the fields exist, serve tags, no steam on iced', async ({ page }) => {
  const w = watch(page);
  await page.goto('/baraza/12');

  await test.step('Ethiopian Pour Over: bean card + Hot tag', async () => {
    await openDish(page, 'bz-ethiopian-pour-over');
    await expect(page.locator('.bean-facts')).toBeVisible();
    await expect(page.locator('.bean-facts')).toContainText('Origin');
    await expect(page.locator('.bean-facts')).toContainText('Ethiopia');
    await expect(page.locator('.bean-facts')).toContainText('Brew');
    await expect(page.locator('.bean-facts')).toContainText('Pour over');
    await expect(page.locator('#dish-title .serve-tag')).toHaveText('Hot');
    await page.locator('.back-menu').click();
  });

  await test.step('Flat White: no bean card', async () => {
    await openDish(page, 'bz-flat-white');
    await expect(page.locator('.bean-facts')).toHaveCount(0);
    await page.locator('.back-menu').click();
  });

  await test.step('Cold Brew: Iced tag, no steam wisps', async () => {
    await openDish(page, 'bz-cold-brew');
    await expect(page.locator('#dish-title .serve-tag')).toHaveText('Iced');
    // These dishes have no 3D (text rows), so there is no .dish-stage / .pass at all — confirming
    // that is itself proof no steam can show. If a 3D iced dish is added later, the .iced class
    // on .dish-stage (css/loader.css) hides .pass-steam.
    await expect(page.locator('.dish-stage')).toHaveCount(0);
  });

  expect(w.errors).toEqual([]);
});

test('home page has no link to Baraza (not listed)', async ({ page }) => {
  const w = watch(page);
  await page.goto('/');
  await expect(page.locator('a[href="/baraza"], a[href^="/baraza/"], a[href^="/baraza?"]')).toHaveCount(0);
  await expect(page.locator('.pilot-card')).toBeVisible(); // Gauchos still shows, unchanged
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('Gauchos is unaffected: theme, accent and existing journeys', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12');
  expect(await page.evaluate(() => document.body.dataset.theme)).toBe('gauchos');
  const accent = await page.locator('.dish-line > span').first().evaluate((el) => getComputedStyle(el).color);
  expect(accent).toBe('rgb(124, 42, 28)');
  await expect(page.locator('.table-chip')).toHaveText('Table 12');
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('quick-note chips: seeded via route, tapping appends, malicious text stays text', async ({ page }) => {
  await page.route('**/data/menu.json', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    const baraza = json.restaurants.find((r) => r.id === 'baraza');
    baraza.quickNotes = ['Oat milk', 'Extra shot'];
    await route.fulfill({ response: res, json });
  });
  await page.goto('/baraza/12');
  await openDish(page, 'bz-flat-white');

  const chips = page.locator('.quick-note-chip');
  await expect(chips).toHaveCount(2);
  await expect(chips.first()).toHaveText('Oat milk');

  await chips.filter({ hasText: 'Oat milk' }).click();
  await expect(page.locator('.tray-note')).toHaveValue('Oat milk');
  await chips.filter({ hasText: 'Extra shot' }).click();
  await expect(page.locator('.tray-note')).toHaveValue('Oat milk, Extra shot');

  // Tapping an already-included chip does not duplicate it.
  await chips.filter({ hasText: 'Oat milk' }).click();
  await expect(page.locator('.tray-note')).toHaveValue('Oat milk, Extra shot');

  // A hand-typed note with markup stays text end to end (never innerHTML with user text).
  await page.locator('.tray-note').fill('<img src=x onerror=alert(1)>');
  await page.locator('.tray-add-btn').click();
  await page.locator('.close-dialog').click();
  await page.locator('.tray-pill').click();
  await expect(page.locator('.waiter-item-note')).toHaveText('<img src=x onerror=alert(1)>');
  expect(await page.locator('.waiter-item-note img').count()).toBe(0);
});

test('empty quickNotes (default data): no chips render', async ({ page }) => {
  await page.goto('/baraza/12');
  await openDish(page, 'bz-flat-white');
  await expect(page.locator('.quick-notes')).toHaveCount(0);
});
