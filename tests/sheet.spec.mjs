// Restaurant pages as one family + the calm, alive dish sheet (css/sheet.css, js/app.js openDish,
// js/viewer.js autoTurn / dragHint): three zones, one filled button, a dish that turns by itself.
import { test, expect } from '@playwright/test';
import { watch, openDish, tier } from './helpers.mjs';

const live = (page) => expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
const rotating = (page) => page.locator('model-viewer').evaluate((el) => el.autoRotate);

// ─── Restaurant pages: one family ───────────────────────────────────────
const PAGES = [
  { slug: 'g/12', name: 'Gauchos', theme: 'gauchos' },
  { slug: 'baraza/12', name: 'Baraza', theme: 'baraza' },
  { slug: 'haute-dolci/12', name: 'Haute Dolci', theme: 'haute-dolci' },
];

for (const p of PAGES) {
  test(`${p.name}: the same brand band — logo is the h1, tagline, pills, table; AR tag on 3D cards`, async ({ page }) => {
    const w = watch(page);
    await page.goto(`/${p.slug}`);
    const band = page.locator('.restaurant-band');
    await expect(band).toBeVisible();
    await expect(band.locator('h1 img')).toHaveAttribute('alt', p.name);
    await expect(band.locator('.band-tagline')).not.toBeEmpty();
    await expect(band.locator('.table-chip')).toHaveText('Table 12');
    await expect(band.locator('.pill').first()).toBeVisible();
    // every 3D card carries a small AR tag; text rows never do
    const cards = await page.locator('.dish-card').count();
    expect(cards).toBeGreaterThan(0);
    await expect(page.locator('.dish-card .ar-tag')).toHaveCount(cards);
    await expect(page.locator('.dish-row .ar-tag')).toHaveCount(0);
    expect(w.errors).toEqual([]);
    expect(w.external).toEqual([]);
  });

  for (const mode of ['light', 'dark']) {
    test(`${p.name}: band text reads at 4.5:1 or better in ${mode} mode`, async ({ page }) => {
      await page.goto(`/${p.slug}`);
      if (mode === 'dark') await page.locator('[data-mode-toggle]').click();
      const ratios = await page.evaluate(() => {
        const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
        const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
        const band = rgb(getComputedStyle(document.querySelector('.restaurant-band')).backgroundColor);
        const out = {};
        for (const sel of ['.band-tagline', '.band-pills .pill', '.band-pills .table-chip']) {
          const el = document.querySelector(sel);
          if (el) out[sel] = ratio(rgb(getComputedStyle(el).color), band);
        }
        return out;
      });
      for (const [sel, r] of Object.entries(ratios)) expect(r, sel).toBeGreaterThanOrEqual(4.5);
    });
  }
}

test('Gauchos: its real SVG logo is drawn light on the oxblood band, in both modes; no invented hours', async ({ page }) => {
  await page.goto('/g/12');
  const logo = page.locator('.band-logo-wide');
  await expect(logo).toHaveAttribute('src', /gauchos-logo\.svg/);
  await expect(page.locator('.band-tagline')).toHaveText('Argentine-inspired · Oakwood-smoked');
  expect(await logo.evaluate((el) => getComputedStyle(el).filter)).toContain('invert');
  await page.locator('[data-mode-toggle]').click();
  expect(await logo.evaluate((el) => getComputedStyle(el).filter)).toContain('invert');
  await expect(page.locator('.band-pills .pill')).toHaveText(['Gulberg III']); // area only: Gauchos has no hours on file
});

test('menu cards: the photo turns into view once (transform only, a few degrees at most)', async ({ page }) => {
  await page.goto('/g/12');
  await expect(page.locator('.dish-photo.is-turned').first()).toBeVisible();
  const maxDeg = await page.evaluate(() => {
    const rule = [...document.styleSheets].flatMap((s) => [...s.cssRules]).find((r) => r.name === 'photo-turn');
    return Math.max(...[...rule.cssRules[0].cssText.matchAll(/rotate[XY]\((-?[\d.]+)deg/g)].map((m) => Math.abs(+m[1])));
  });
  expect(maxDeg).toBeLessThanOrEqual(3);
});

test('reduced motion: cards do not turn, nothing loops', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/g/12');
  await expect(page.locator('.dish-card').first()).toBeVisible();
  await expect(page.locator('.dish-photo.is-turned')).toHaveCount(0);
});

// ─── The dish sheet: three calm zones, one filled button ────────────────
test('tier 2: AR slot is reserved from the first frame — nothing moves when the button arrives', async ({ page }) => {
  await page.goto('/g/12?tier=2');
  await openDish(page, 'steak-main');
  await expect(page.locator('.ar-btn')).toBeHidden();
  // Offsets inside the sheet (not page positions): the sheet's own slide-in may still be settling.
  const measure = () => page.evaluate(() => {
    const top = (s) => document.querySelector(s).getBoundingClientRect().top;
    const px = Math.round; // whole pixels: sub-pixel float noise isn't movement
    return { slot: px(document.querySelector('.ar-slot').getBoundingClientRect().height), slotToTray: px(top('.tray-add') - top('.ar-slot')), priceToSlot: px(top('.ar-slot') - top('.detail-price')) };
  });
  const before = await measure();
  await live(page);
  await expect(page.locator('.ar-btn')).toBeVisible();
  const after = await measure();
  expect(after).toEqual(before);
  expect(before.slot).toBeGreaterThanOrEqual(52);
});

test('"See it on your table" is the only filled button; the rest are quiet', async ({ page }) => {
  await page.goto('/g/12?tier=2');
  await openDish(page, 'steak-main');
  await live(page);
  await expect(page.locator('.ar-btn')).toBeVisible();
  const filled = await page.evaluate(() => [...document.querySelectorAll('dialog[open] button')]
    .filter((b) => b.offsetParent && b.getBoundingClientRect().height > 0)
    .filter((b) => { const c = getComputedStyle(b).backgroundColor; return c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'; })
    .map((b) => b.className));
  // The AR button is filled; the stepper's round buttons and the close/reset chips are tools, not actions.
  const actions = filled.filter((c) => !/close-dialog|reset-view|tray-step/.test(c));
  expect(actions.map((c) => c.split(' ')[0])).toEqual(['ar-btn']);
  // Quiet by design: Add to my table is outlined, Back to menu is plain text.
  expect(await page.locator('.tray-add-btn').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  // …and it still works.
  await page.locator('.tray-add-btn').click();
  await expect(page.locator('.tray-add-btn')).toHaveText('Added');
});

test('the sheet reads in order: dish → add to my table → extras → details', async ({ page }) => {
  await page.goto('/g/12?tier=2');
  await openDish(page, 'steak-main');
  await live(page);
  const y = await page.evaluate(() => ['.zone-dish', '.tray-add', '.extras', '.zone-details'].map((s) => document.querySelector(s).getBoundingClientRect().top));
  expect([...y].sort((a, b) => a - b)).toEqual(y);
  await expect(page.locator('.extras .share-pill')).toBeVisible();
  await expect(page.locator('.extras .fav-btn')).toBeVisible();
  const labels = await page.locator('.fact dt').allTextContents();
  expect(labels).toEqual(['Halal', 'Allergens', 'Spice', 'Dietary', 'Ingredients']);
});

test('tier 3: no dead button — the calm line sits in the reserved space', async ({ page }) => {
  await page.goto('/g/12?tier=3');
  await openDish(page, 'steak-main');
  await live(page);
  expect(await tier(page)).toBe('3');
  await expect(page.locator('.ar-btn')).toBeHidden();
  await expect(page.locator('.ar-slot .stage-status')).toBeVisible();
  await expect(page.locator('.ar-slot .stage-status')).toContainText('Drag to turn the dish');
});

test('My fav toggles the same on-device list the Table Card uses', async ({ page }) => {
  await page.goto('/g/12?tier=3');
  await openDish(page, 'steak-main');
  const fav = page.locator('.fav-btn');
  await expect(fav).toHaveAttribute('aria-pressed', 'false');
  await fav.click();
  await expect(fav).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('menva.favs.gauchos')))).toEqual(['steak-main']);
  await fav.click();
  await expect(fav).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('menva.favs.gauchos')))).toEqual([]);
  // and a heart set elsewhere (the Table Card's "My fav" mood) shows up pressed
  await page.evaluate(() => localStorage.setItem('menva.favs.gauchos', JSON.stringify(['steak-main'])));
  await page.keyboard.press('Escape');
  await openDish(page, 'steak-main');
  await expect(page.locator('.fav-btn')).toHaveAttribute('aria-pressed', 'true');
});

// ─── It's not a picture ─────────────────────────────────────────────────
test('the live dish turns by itself, stops under a finger, and reset brings it back', async ({ page }) => {
  await page.goto('/g/12?tier=3');
  await openDish(page, 'steak-main');
  await live(page);
  await expect.poll(() => rotating(page)).toBe(true);
  const box = await page.locator('model-viewer').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(await rotating(page)).toBe(false);
  await page.locator('#reset-view').click();
  expect(await rotating(page)).toBe(true);
});

test('after ~5 s without a touch the dish turns again', async ({ page }) => {
  await page.goto('/g/12?tier=3');
  await openDish(page, 'steak-main');
  await live(page);
  const box = await page.locator('model-viewer').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  expect(await rotating(page)).toBe(false);
  await page.waitForTimeout(2000);
  expect(await rotating(page)).toBe(false); // still waiting, well inside the idle window
  await expect.poll(() => rotating(page), { timeout: 15_000 }).toBe(true);
});

test('reduced motion: the dish never turns by itself', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/g/12?tier=3');
  await openDish(page, 'steak-main');
  await live(page);
  await page.waitForTimeout(600);
  expect(await rotating(page)).toBeFalsy();
});

test('"Drag to turn" shows once per visit, on the first 3D dish only', async ({ page }) => {
  await page.goto('/g/12?tier=3');
  await openDish(page, 'steak-main');
  await live(page);
  await expect(page.locator('.turn-hint')).toBeVisible();
  await expect(page.locator('.turn-hint')).toContainText('Drag to turn');
  // a touch dismisses it
  const box = await page.locator('model-viewer').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('.turn-hint')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await openDish(page, 'steak-sandwich');
  await live(page);
  await expect(page.locator('.turn-hint')).toHaveCount(0);
});

test('tier 1 (iPhone): "Preparing your table view… n%" still shows on the star button', async ({ page }) => {
  await page.goto('/g/12?tier=1&slow=1');
  await page.locator('[data-dish="steak-main"]').click();
  await expect(page.locator('.ar-btn.is-preparing')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('.ar-btn-label')).toHaveText(/Preparing your table view… \d+%/);
  await expect(page.locator('.ar-btn')).toBeEnabled({ timeout: 90_000 });
  await expect(page.locator('.ar-btn-label')).toHaveText('See it on your table');
});

test('the AR button runs its mark and sweep only while on screen, and is static under reduced motion', async ({ page }) => {
  await page.goto('/g/12?tier=2');
  await openDish(page, 'steak-main');
  await live(page);
  await expect(page.locator('.ar-btn.is-seen')).toBeVisible();
  const names = await page.locator('.ar-btn').evaluate((el) => [
    getComputedStyle(el, '::after').animationName,
    getComputedStyle(el.querySelector('.ar-drop-dish')).animationName,
  ]);
  expect(names).toEqual(['ar-glint', 'ar-drop']);

  const ctx = await page.context().newPage();
  await ctx.emulateMedia({ reducedMotion: 'reduce' });
  await ctx.goto('/g/12?tier=2');
  await ctx.locator('[data-dish="steak-main"]').click();
  await expect(ctx.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
  await expect(ctx.locator('.ar-btn')).toBeVisible();
  expect(await ctx.locator('.ar-btn').evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none'); // the highlight ring
  expect(await ctx.locator('.ar-btn').evaluate((el) => getComputedStyle(el, '::after').display)).toBe('none');
  expect(await ctx.locator('.ar-btn .ar-drop-dish').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
