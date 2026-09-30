// Table Card (js/sharecard.js): the "Share my table card" pill, the 1080x1920 story image built on the
// phone, mood chips, another line, Web Share with a JPEG file, the save fallback, analytics events.
import { test, expect } from '@playwright/test';
import { watch, openDish, events, settled } from './helpers.mjs';

// A phone that can share files: navigator.share records what it was given.
const withShare = (page, canShare = true) => page.addInitScript((can) => {
  navigator.canShare = () => can;
  navigator.share = async (data) => {
    window.__shared = { files: (data.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size, isFile: f instanceof File })), text: data.text, url: data.url };
  };
}, canShare);

const img = (page) => page.locator('.share-img');
const ready = (page) => expect(page.locator('.share-preview[data-state="ready"]')).toBeVisible({ timeout: 30_000 });

// Real pixels, not a blank canvas: several distinct colours and a spread of brightness.
const pixelStats = (page) => page.evaluate(async () => {
  const el = document.querySelector('.share-img');
  const c = document.createElement('canvas');
  c.width = 54; c.height = 96;
  const g = c.getContext('2d');
  g.drawImage(el, 0, 0, 54, 96);
  const d = g.getImageData(0, 0, 54, 96).data;
  const seen = new Set();
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    min = Math.min(min, l); max = Math.max(max, l);
  }
  return { colours: seen.size, contrast: max - min, w: el.naturalWidth, h: el.naturalHeight };
});

const openCard = async (page, dishId, query = '?tier=5') => {
  await openDish(page, dishId);
  const pill = page.locator('.share-pill');
  await expect(pill).toBeVisible({ timeout: 60_000 });
  await pill.click();
  await expect(page.locator('#share-dialog[open]')).toBeVisible();
  await ready(page);
};

test('Haute Dolci: pill → a 1080×1920 card with real content, moods change the badge, another line changes the line', async ({ page }) => {
  const w = watch(page);
  await page.goto('/haute-dolci/12?tier=5');
  await openCard(page, 'hd-matilda-cake');

  await test.step('the card image is 1080×1920 and not blank', async () => {
    const s = await pixelStats(page);
    expect(s.w).toBe(1080);
    expect(s.h).toBe(1920);
    expect(s.colours).toBeGreaterThan(25);
    expect(s.contrast).toBeGreaterThan(80);
    await expect(img(page)).toHaveAttribute('src', /^blob:/);
    await expect(img(page)).toHaveAttribute('data-badge', 'Live 3D · First look');
  });

  await test.step('mood chips switch the badge', async () => {
    const chips = page.locator('.share-chip');
    // first open of this dish on a fresh phone: First look, My fav, Tried something new, Roast, Sarcastic, Good vibes (no streak yet)
    await expect(chips).toHaveText(['First look', 'My fav', 'Tried something new', 'Roast', 'Sarcastic', 'Good vibes']);
    for (const [label, badge] of [['Good vibes', 'Live 3D · Good vibes'], ['Sarcastic', 'Live 3D · Sarcastic'], ['Roast', 'Live 3D · Roast mode'], ['My fav', 'My fav'], ['Tried something new', 'New on my list']]) {
      await page.locator('.share-chip', { hasText: new RegExp(`^${label}$`) }).click();
      await expect(img(page)).toHaveAttribute('data-badge', badge);
      await ready(page);
      expect((await pixelStats(page)).colours).toBeGreaterThan(20);
    }
    await expect(page.locator('.share-chip[aria-pressed="true"]')).toHaveText('Tried something new');
  });

  await test.step('"Another line" cycles the line', async () => {
    await page.locator('.share-chip', { hasText: /^Sarcastic$/ }).click();
    await ready(page);
    const seen = new Set([await img(page).getAttribute('data-line')]);
    await page.locator('.share-another').click();
    await ready(page);
    const second = await img(page).getAttribute('data-line');
    expect(seen.has(second)).toBe(false);
  });

  await expect.poll(() => events(page)).toContain('share_card_open');
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('Share hands navigator.share a JPEG File; the event records mood and target', async ({ page }) => {
  await withShare(page, true);
  await page.goto('/haute-dolci/12?tier=5');
  await openCard(page, 'hd-san-sebastian');
  await page.locator('.share-chip', { hasText: /^Good vibes$/ }).click();
  await ready(page);
  await expect(page.locator('.share-go')).toBeVisible();
  await page.locator('.share-go').click();
  await expect.poll(() => page.evaluate(() => window.__shared)).toBeTruthy();
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.files).toHaveLength(1);
  expect(shared.files[0]).toMatchObject({ type: 'image/jpeg', isFile: true });
  expect(shared.files[0].name).toMatch(/\.jpg$/);
  expect(shared.files[0].size).toBeGreaterThan(50_000);
  expect(shared.text).toContain('Haute Dolci');
  expect(shared.url).toMatch(/\/haute-dolci$/);
  const ev = await page.evaluate(() => window.__menvaEvents.filter((e) => e.event === 'share_card_shared'));
  expect(ev).toHaveLength(1);
  expect(ev[0]).toMatchObject({ dish: 'hd-san-sebastian', mood: 'goodVibes', target: 'share' });
});

test('no file sharing on this phone: only "Save image", which downloads the JPEG', async ({ page }) => {
  await withShare(page, false);
  await page.goto('/baraza/12?tier=5');
  await openCard(page, 'bz-chicken-pizza');
  await expect(page.locator('.share-go')).toBeHidden();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.share-save').click()]);
  expect(download.suggestedFilename()).toMatch(/^menva-baraza-bz-chicken-pizza\.jpg$/);
  const ev = await page.evaluate(() => window.__menvaEvents.filter((e) => e.event === 'share_card_shared'));
  expect(ev[0]).toMatchObject({ dish: 'bz-chicken-pizza', mood: 'firstLook', target: 'save' });
  await expect(page.locator('.share-status')).toContainText('Saved');
});

test('Gauchos card is 1080×1920 with real content (and Roast is there)', async ({ page }) => {
  const w = watch(page);
  await page.goto('/g/12?tier=5');
  await openCard(page, 'steak-main');
  const s = await pixelStats(page);
  expect([s.w, s.h]).toEqual([1080, 1920]);
  expect(s.colours).toBeGreaterThan(25);
  await page.locator('.share-chip', { hasText: /^Roast$/ }).click();
  await expect(img(page)).toHaveAttribute('data-badge', 'Live 3D · Roast mode');
  await ready(page);
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('streak chip only after visits on 2+ different days; "Tried something new" only on the first open', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('menva.visits.haute-dolci')) localStorage.setItem('menva.visits.haute-dolci', JSON.stringify(['2026-08-01', '2026-08-15']));
  });
  await page.goto('/haute-dolci/12?tier=5');
  await openCard(page, 'hd-cookie-dough');
  await expect(page.locator('.share-chip', { hasText: /^Streak$/ })).toBeVisible();
  await expect(page.locator('.share-chip', { hasText: /^Tried something new$/ })).toBeVisible();
  await page.locator('.share-chip', { hasText: /^Streak$/ }).click();
  await expect(img(page)).toHaveAttribute('data-badge', 'Visit streak · 3'); // two earlier days + today
  await page.locator('.share-close').click();
  await page.locator('.close-dialog').first().click();

  // second time this phone opens the same dish: not new any more
  await openDish(page, 'hd-cookie-dough');
  await page.locator('.share-pill').click();
  await ready(page);
  await expect(page.locator('.share-chip', { hasText: /^Tried something new$/ })).toHaveCount(0);
});

test('a fresh phone has no streak chip', async ({ page }) => {
  await page.goto('/haute-dolci/12?tier=5');
  await openCard(page, 'hd-matilda-cake');
  await expect(page.locator('.share-chip', { hasText: /^Streak$/ })).toHaveCount(0);
});

test('a restaurant can switch roast off', async ({ page }) => {
  await page.route('**/data/menu.json', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    for (const r of json.restaurants) if (r.id === 'haute-dolci') r.roast = false;
    await route.fulfill({ response: res, json });
  });
  await page.goto('/haute-dolci/12?tier=5');
  await openCard(page, 'hd-matilda-cake');
  await expect(page.locator('.share-chip', { hasText: /^Roast$/ })).toHaveCount(0);
  await expect(page.locator('.share-chip', { hasText: /^Sarcastic$/ })).toBeVisible();
});

test('live 3D: the pill shows once the dish has loaded, and uses the dish\'s own start camera', async ({ page }) => {
  await page.goto('/haute-dolci/12?tier=3');
  await openDish(page, 'hd-matilda-cake');
  await expect(page.locator('.share-pill')).toBeHidden(); // not while loading
  await settled(page);
  await expect(page.locator('.share-pill')).toBeVisible();
  // per-dish best angle: the viewer starts on the camera the poster was shot with
  const cam = await page.locator('model-viewer').evaluate((el) => ({ orbit: el.getAttribute('camera-orbit'), target: el.getAttribute('camera-target') }));
  expect(cam.orbit).toMatch(/^95deg 55deg/);
  expect(cam.target).toMatch(/m .*m .*m$/);
  await page.locator('.share-pill').click();
  await ready(page);
  expect((await pixelStats(page)).h).toBe(1920);
});
