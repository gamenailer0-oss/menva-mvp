// A diner at table 12: scan, browse, open a dish, watch it load, close it — plus the ways the
// network and links can go wrong. Every journey must end on something useful, never a broken view.
import { test, expect } from '@playwright/test';
import { watch, openDish, tier, events, settled } from './helpers.mjs';

test('scans the table QR: menu, table number, first dish on the first screen', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12');

  await expect(page.locator('.table-chip')).toHaveText('Table 12');
  await expect(page.locator('h1 img')).toHaveAttribute('alt', 'Gauchos');
  await expect(page.locator('.menu-category > h3')).toHaveText(['Signature Cuts', 'Sandwiches', 'Starters']);
  await expect(page.locator('.dish-card')).toHaveCount(4);

  // The food starts on the first screen of a phone.
  const first = await page.locator('.dish-card').first().boundingBox();
  expect(first.y).toBeLessThan(844);

  // No sideways scrolling at phone width.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Every interactive element is at least 44 px tall (thumbs, dim light).
  const small = await page.evaluate(() => [...document.querySelectorAll('button, a')]
    .filter((el) => el.offsetParent && el.getBoundingClientRect().height < 44)
    .map((el) => el.className || el.textContent.trim()));
  expect(small).toEqual([]);

  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('opens a dish: photo at once, details in order, then the 3D takes over', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12');

  // Time from the tap to the first frame that paints the sheet with the dish image in it.
  const ms = await page.evaluate(async () => {
    const t0 = performance.now();
    document.querySelector('[data-dish="steak-main"]').click();
    await new Promise((r) => requestAnimationFrame(r));
    const img = document.querySelector('.pass-blur');
    return img?.complete && document.querySelector('dialog[open]') ? performance.now() - t0 : Infinity;
  });
  expect(ms).toBeLessThan(300);

  const labels = await page.locator('.fact dt').allTextContents();
  expect(labels).toEqual(['Halal', 'Allergens', 'Spice', 'Dietary', 'Ingredients']);
  await expect(page.locator('.detail-price')).toHaveText('PKR 3,495');
  await expect(page.locator('.fact dd').first()).toHaveText('Please confirm with your server');

  await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
  expect(await tier(page)).toBe('3'); // desktop Chrome: 3D, no AR
  await expect(page.locator('.ar-btn')).toBeHidden();
  await expect(page.locator('.stage-status')).toContainText('Drag to turn the dish');
  await expect(page.locator('.reset-view')).toBeVisible();
  expect(await events(page)).toEqual(expect.arrayContaining(['dish_open', 'model_loaded', 'tier_assigned']));

  // Escape closes the sheet and focus goes back to the dish the diner tapped.
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await expect(page.locator('[data-dish="steak-main"]')).toBeFocused();

  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('a second dish opens faster: model-viewer is already loaded', async ({ page }) => {
  await page.goto('/g/12');
  await openDish(page, 'steak-main');
  await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
  await page.keyboard.press('Escape');
  await openDish(page, 'steak-sandwich');
  await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#dish-title')).toHaveText('Signature Steak Sandwich');
});

test('bad and old links still land somewhere useful', async ({ page }) => {
  await page.goto('/g/abc');
  await expect(page).toHaveURL(/\/g$/);
  await expect(page.locator('.dish-card')).toHaveCount(4);

  await page.goto('/#/restaurant/gauchos');
  await expect(page).toHaveURL(/\/g$/);

  // Unknown URLs are real 404s with their own branded page (see tests/seo.spec.mjs), not the app.
  await page.goto('/nowhere/2');
  await expect(page.locator('h1')).toHaveText("This page isn't on the menu.");

  await page.goto('/g/12/extra');
  await expect(page.locator('h1')).toHaveText("This page isn't on the menu.");

  await page.goto('/');
  await page.getByRole('link', { name: /Open the Gauchos menu/ }).click();
  await expect(page).toHaveURL(/\/g$/);
});

test('menu data down: a calm message and a retry that works', async ({ page }) => {
  await page.route('**/data/menu.json', (r) => r.fulfill({ status: 500, body: 'oops' }));
  await page.goto('/g/12');
  await expect(page.locator('h1')).toHaveText("The menu didn't load.");
  await page.unroute('**/data/menu.json');
  await page.getByRole('button', { name: /Try again/ }).click();
  await expect(page.locator('.dish-card')).toHaveCount(4);
  await expect(page.locator('.table-chip')).toHaveText('Table 12');
});

test('model file missing: the 360° view takes over, never a broken viewer', async ({ page }) => {
  await page.route('**/model.glb*', (r) => r.fulfill({ status: 404, body: '' }));
  await page.goto('/g/12');
  await openDish(page, 'steak-main');
  await settled(page);
  expect(await tier(page)).toBe('4');
  await expect(page.locator('.spin.ready')).toBeVisible();
  await expect(page.locator('.pass-slow')).toBeVisible();
  await expect(page.locator('.pass-slow')).toContainText('360°');
  expect(await events(page)).toContain('model_failed');
});

test('model and 360° both missing: the photo, sharp and still', async ({ page }) => {
  await page.route('**/model.glb*', (r) => r.fulfill({ status: 404, body: '' }));
  await page.route('**/spin.webp*', (r) => r.fulfill({ status: 404, body: '' }));
  await page.goto('/g/12');
  await openDish(page, 'steak-main');
  await expect(page.locator('.pass[data-state="still"]')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.spin')).toHaveCount(0);
  await expect(page.locator('.pass-poster')).toBeVisible();
  await expect(page.locator('.pass-rim')).toBeHidden();
});

test.describe('with the service worker', () => {
  test.use({ serviceWorkers: 'allow' });

  test('works offline once loaded', async ({ page, context }) => {
    await page.goto('/g/12');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // now controlled by the service worker, which caches as it goes
    await expect(page.locator('.dish-card')).toHaveCount(4);
    await page.waitForFunction(() => navigator.serviceWorker.controller);
    await page.waitForTimeout(500);

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.dish-card')).toHaveCount(4);
    await expect(page.locator('.table-chip')).toHaveText('Table 12');
    await context.setOffline(false);
  });
});
