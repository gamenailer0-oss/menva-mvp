// Haute Dolci — Raya (slug "haute-dolci", listed: true since 2026-09-30). Confirms the theme,
// banner, Signatures-first menu ordering with the three featured desserts, listed on home + indexable,
// that it stays off the home page, dark mode, SEO tags, and that other restaurants are unaffected.
import { test, expect } from '@playwright/test';
import { watch, openDish } from './helpers.mjs';

test('menu page: theme, banner, Signatures first, accent', async ({ page }) => {
  const w = watch(page);
  await page.goto('/haute-dolci/12');

  await test.step('body carries the haute-dolci theme', async () => {
    expect(await page.evaluate(() => document.body.dataset.theme)).toBe('haute-dolci');
  });

  await test.step('the brand band shows the real wordmark, tagline, hours/area pills and table', async () => {
    const band = page.locator('.restaurant-band');
    await expect(band).toBeVisible();
    await expect(band.locator('.band-logo-wide')).toBeVisible();
    await expect(band.locator('.band-logo-wide')).toHaveAttribute('src', /haute-dolci-logo-black\.png/);
    await expect(band.locator('.band-tagline')).toHaveText("It's a must.");
    await expect(band).toContainText('Raya Fairways, DHA Phase 6');
    await expect(band.locator('.table-chip')).toHaveText('Table 12');
  });

  await test.step('Signatures is the first category and lists all three featured desserts, in order', async () => {
    const categories = page.locator('.menu-category > h3');
    await expect(categories.first()).toHaveText('Signatures');
    const names = page.locator('.menu-category').first().locator('.dish-line h4');
    await expect(names).toHaveCount(3);
    await expect(names.nth(0)).toContainText('San Sebastián Cheesecake');
    await expect(names.nth(1)).toContainText('Matilda Cake');
    await expect(names.nth(2)).toContainText('Cookie Dough');
  });

  await test.step('other real categories are present, in CSV order after Signatures', async () => {
    for (const name of ['Cakes', 'Signature Collection', 'All Day Breakfast', 'Coffee & Hot Beverages']) {
      await expect(page.locator('.menu-category > h3', { hasText: new RegExp(`^${name}$`) })).toBeVisible();
    }
  });

  await test.step('the accent is the deep raspberry sampled from their palette', async () => {
    const accent = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim());
    expect(accent.toLowerCase()).toBe('#9c2f52');
  });

  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('dark mode: near-black paper, wordmark inverts to white, accent lightens', async ({ page }) => {
  await page.goto('/haute-dolci/12');
  await page.locator('[data-mode-toggle]').click();
  expect(await page.evaluate(() => document.documentElement.dataset.mode)).toBe('dark');
  const paper = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await expect.poll(paper, { timeout: 2000 }).toBe('rgb(26, 17, 19)');
  const filter = await page.locator('.band-logo-wide').evaluate((el) => getComputedStyle(el).filter);
  expect(filter).not.toBe('none');
  const accent = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim());
  expect(accent.toLowerCase()).toBe('#e58aa8');
});

test('dish sheet: San Sebastián Cheesecake shows the real price and an honest, unconfirmed halal/allergen state stays intact', async ({ page }) => {
  const w = watch(page);
  await page.goto('/haute-dolci/12');

  await test.step('San Sebastián Cheesecake: sourced price, halal shown', async () => {
    await openDish(page, 'hd-san-sebastian');
    await expect(page.locator('#dish-title')).toContainText('San Sebastián Cheesecake');
    await expect(page.locator('.detail-price')).toHaveText('PKR 1,999');
    await expect(page.locator('dialog[open]')).toContainText('Halal');
    await page.locator('.close-dialog').click();
  });

  await test.step('Cookie Dough: price unconfirmed shows "Please confirm with your server", never a guess', async () => {
    await openDish(page, 'hd-cookie-dough');
    await expect(page.locator('.detail-price')).toHaveText('Please confirm with your server');
    await page.locator('.close-dialog').click();
  });

  await test.step('menu line for Cookie Dough (still on the Signatures card) says "Ask for price"', async () => {
    await expect(page.locator('.menu-category').first().locator('.dish-line', { hasText: 'Cookie Dough' }).locator('.price-ask')).toHaveText('Ask for price');
  });

  expect(w.errors).toEqual([]);
});

test('home page: Haute Dolci is listed alongside Gauchos and Baraza', async ({ page }) => {
  const w = watch(page);
  await page.goto('/');
  await expect(page.locator('.menu-card[data-theme="haute-dolci"]')).toHaveCount(1);
  await expect(page.locator('.menu-card')).toHaveCount(3);
  await expect(page.locator('.menu-card').first()).toHaveAttribute('data-theme', 'haute-dolci'); // Haute Dolci is first (homeOrder 1)
  const card = page.locator('.menu-card[data-theme="haute-dolci"]');
  await expect(card.locator('.menu-card-logo--wide')).toHaveAttribute('src', /haute-dolci-logo/);
  await expect(card.locator('.menu-card-quote')).toHaveText("It's a must.");
  await expect(card.locator('.menu-card-dishes li')).toHaveCount(3);
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('Haute Dolci pages are indexable now it is listed', async ({ request }) => {
  const res = await request.get('/haute-dolci');
  expect(res.headers()['x-robots-tag'] ?? '').not.toContain('noindex');
});

test('SEO tags: title, canonical, robots meta and OG image are all present on the static page', async ({ request }) => {
  const res = await request.get('/haute-dolci');
  const html = await res.text();
  expect(html).toContain('<title>Haute Dolci — AR menu · MENVA</title>');
  expect(html).not.toContain('content="noindex');
  expect(html).toMatch(/<link rel="canonical" href="[^"]*\/haute-dolci\/">/);
  expect(html).toMatch(/og-haute-dolci\.jpg/);
});

test('Gauchos and Baraza are unaffected by the Haute Dolci theme', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12');
  expect(await page.evaluate(() => document.body.dataset.theme)).toBe('gauchos');
  await expect(page.locator('.table-chip')).toHaveText('Table 12');
  expect(w.errors).toEqual([]);

  await page.goto('/baraza/12');
  expect(await page.evaluate(() => document.body.dataset.theme)).toBe('baraza');
  const accent = await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim());
  expect(accent.toLowerCase()).toBe('#4b5a2b');
});
