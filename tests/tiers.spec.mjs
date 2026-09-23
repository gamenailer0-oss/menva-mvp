// Capability ladder (CLAUDE.md Phase 6): force each tier and each device condition, and check the
// diner sees the right thing — never an empty or broken viewer.
import { test, expect } from '@playwright/test';
import { watch, openDish, tier, settled, glbRequested } from './helpers.mjs';

const requests = (page) => { const urls = []; page.on('request', (r) => urls.push(r.url())); return urls; };

for (const t of [1, 2]) {
  test(`tier ${t}: AR offered only once the model is on screen`, async ({ page }) => {
    await page.goto(`/g/12?tier=${t}`);
    await openDish(page, 'steak-main');
    await expect(page.locator('.ar-btn')).toBeHidden(); // not while loading
    await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
    expect(await tier(page)).toBe(String(t));
    await expect(page.locator('.ar-btn')).toBeVisible();
    await expect(page.locator('.ar-btn')).toHaveText(/See it on your table/);
    await expect(page.locator('.stage-status')).toHaveText('Ready — see it on your table.');
  });
}

test('tier 3: 3D you can turn, no AR button', async ({ page }) => {
  await page.goto('/g/12?tier=3');
  await openDish(page, 'steak-main');
  await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
  expect(await tier(page)).toBe('3');
  await expect(page.locator('.ar-btn')).toBeHidden();
  await expect(page.locator('model-viewer')).toBeVisible();
});

test('tier 4: 360° sprite you can swipe, and no 3D downloaded', async ({ page }) => {
  const urls = requests(page);
  await page.goto('/g/12?tier=4');
  await openDish(page, 'steak-main');
  await settled(page);
  expect(await tier(page)).toBe('4');
  const spin = page.locator('.spin.ready');
  await expect(spin).toBeVisible();
  await expect(page.locator('.pass-slow')).toBeVisible();
  await expect(page.locator('.pass-slow')).toHaveText('Swipe to turn the dish');

  const box = await spin.boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  expect(Number(await spin.getAttribute('data-frame'))).not.toBe(0);

  expect(glbRequested(urls)).toBe(false);
  expect(urls.some((u) => u.includes('model-viewer.min.js'))).toBe(false);
});

test('tier 5: the photo, sharp and still, and nothing else downloaded', async ({ page }) => {
  const urls = requests(page);
  await page.goto('/g/12?tier=5');
  await openDish(page, 'steak-main');
  await expect(page.locator('.pass[data-state="still"]')).toBeVisible();
  expect(await tier(page)).toBe('5');
  await expect(page.locator('.pass-poster')).toBeVisible();
  await expect(page.locator('.spin')).toHaveCount(0);
  await expect(page.locator('.pass-rim')).toBeHidden();
  await expect(page.locator('model-viewer')).toBeHidden();
  expect(glbRequested(urls)).toBe(false);
});

test.describe('in-app browser (Instagram)', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36 Instagram 330.0.0.0.0 Android' });

  test('3D works, AR is not offered, one calm line with a copy-link button', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/g/12');
    await openDish(page, 'steak-main');
    await expect(page.locator('.inapp-note')).toContainText('For the table view, open this page in Chrome or Safari.');
    await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 60_000 });
    expect(await tier(page)).toBe('3');
    await expect(page.locator('.ar-btn')).toBeHidden();
    await page.locator('.copy-link').click();
    await expect(page.locator('.copy-link')).toHaveText('Link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('/g/12');
  });
});

test('low-memory phone (≤ 2 GB): straight to the 360° view, no 3D download', async ({ page }) => {
  const urls = requests(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 }));
  await page.goto('/g/12');
  await openDish(page, 'steak-main');
  await settled(page);
  expect(await tier(page)).toBe('4');
  await expect(page.locator('.spin.ready')).toBeVisible();
  expect(glbRequested(urls)).toBe(false);
});

test('no WebGL: straight to the 360° view', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/i.test(type) ? null : get.call(this, type, ...rest);
    };
  });
  await page.goto('/g/12');
  await openDish(page, 'steak-main');
  await settled(page);
  expect(await tier(page)).toBe('4');
  await expect(page.locator('.spin.ready')).toBeVisible();
});

test('slow connection (?slow=1): 360° after 12 s, then the full view takes over', async ({ page }) => {
  test.setTimeout(120_000);
  const w = watch(page);
  await page.goto('/g/12?slow=1');
  await openDish(page, 'steak-main');
  // (the line exists hidden from the start, so check it's actually shown)
  await expect(page.locator('.pass-slow')).toBeVisible({ timeout: 16_000 });
  await expect(page.locator('.pass-slow')).toContainText('360°');
  expect(await tier(page)).toBe('4');
  await expect(page.locator('.spin.ready')).toBeVisible();

  await expect(page.locator('.pass[data-state="live"]')).toBeVisible({ timeout: 90_000 });
  expect(await tier(page)).toBe('3');
  await expect(page.locator('.spin')).toHaveCount(0);
  await expect(page.locator('.pass-slow')).toBeHidden();
  expect(w.errors).toEqual([]);
});
