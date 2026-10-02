// Selfie Table Card (js/sharecard.js): the Selfie chip, the camera stage inside the card's 9:16 frame,
// the dish sticker you drag and resize, Snap → a 1080×1920 card, the file fallback, and the camera
// being switched off whenever it should be. Nothing is uploaded or stored.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { watch, openDish } from './helpers.mjs';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'selfie-fixture.jpg');

// Chrome's fake camera (a moving test pattern, permission granted) for the real getUserMedia path.
test.use({
  permissions: ['camera'],
  launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
});

const SPOTS = {
  'haute-dolci': { url: '/haute-dolci/12?tier=5', dish: 'hd-matilda-cake', name: 'Haute Dolci' },
  baraza: { url: '/baraza/12?tier=5', dish: 'bz-chicken-pizza', name: 'Baraza' },
  gauchos: { url: '/g/12?tier=5', dish: 'steak-main', name: 'Gauchos' },
};

// A still "person" for a steady camera: the same pixels every frame, so two snaps differ only by the sticker.
const stillCamera = (page) => page.addInitScript(() => {
  window.__streams = []; window.__gum = 0;
  const c = document.createElement('canvas');
  c.width = 540; c.height = 960;
  const g = c.getContext('2d');
  const paint = () => {
    const bg = g.createLinearGradient(0, 0, 540, 960);
    bg.addColorStop(0, '#8c9aa8'); bg.addColorStop(1, '#d8cfc4');
    g.fillStyle = bg; g.fillRect(0, 0, 540, 960);
    g.fillStyle = '#3b4a63'; g.beginPath(); g.ellipse(270, 960, 250, 330, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#d8a889'; g.beginPath(); g.ellipse(270, 420, 100, 128, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b2420'; g.beginPath(); g.ellipse(270, 340, 104, 60, 0, Math.PI, 0); g.fill();
  };
  paint();
  setInterval(paint, 100);
  navigator.mediaDevices.getUserMedia = async () => { window.__gum++; const s = c.captureStream(15); window.__streams.push(s); return s; };
});

// Records every stream the page is handed so a test can check the tracks end.
const spyCamera = (page) => page.addInitScript(() => {
  window.__streams = []; window.__gum = 0;
  const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => { window.__gum++; const s = await real(c); window.__streams.push(s); return s; };
});

const noCamera = (page) => page.addInitScript(() => { Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true }); });
const deniedCamera = (page) => page.addInitScript(() => {
  window.__gum = 0;
  navigator.mediaDevices.getUserMedia = async () => { window.__gum++; throw new DOMException('Permission denied', 'NotAllowedError'); };
});
const liveTracks = (page) => page.evaluate(() => (window.__streams || []).flatMap((s) => s.getTracks()).filter((t) => t.readyState === 'live').length);

const openCard = async (page, spot) => {
  await page.goto(spot.url);
  await openDish(page, spot.dish);
  const pill = page.locator('.share-pill');
  await expect(pill).toBeVisible({ timeout: 60_000 });
  await pill.click();
  await expect(page.locator('#share-dialog[open]')).toBeVisible();
  await expect(page.locator('.share-preview[data-state="ready"]')).toBeVisible({ timeout: 30_000 });
};
const selfieChip = (page) => page.locator('.share-chip', { hasText: /^Selfie$/ });
const stage = (page) => page.locator('.selfie-stage');
const sticker = (page) => page.locator('.selfie-sticker');
const cardReady = (page) => expect(page.locator('.share-preview[data-state="ready"] .share-img[data-mood="selfie"]')).toBeVisible({ timeout: 30_000 });

// Where the sticker is on screen, and the frame it lives in.
const rects = (page) => page.evaluate(() => {
  const r = (q) => { const b = document.querySelector(q).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  return { sticker: r('.selfie-sticker'), stage: r('.selfie-stage') };
});

const pixels = (page) => page.evaluate(async () => {
  const el = document.querySelector('.share-img');
  const c = document.createElement('canvas');
  c.width = 270; c.height = 480;
  const g = c.getContext('2d');
  g.drawImage(el, 0, 0, 270, 480);
  const d = g.getImageData(0, 0, 270, 480).data;
  const seen = new Set();
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) {
    seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    min = Math.min(min, l); max = Math.max(max, l);
  }
  return { colours: seen.size, contrast: max - min, w: el.naturalWidth, h: el.naturalHeight, data: Array.from(d) };
});

// How many pixels (of the 270×480 thumbnails) differ noticeably between two snaps.
const diff = (a, b, rows) => {
  let n = 0;
  const [y0, y1] = rows || [0, 480];
  for (let y = y0; y < y1; y++) for (let x = 0; x < 270; x++) {
    const i = (y * 270 + x) * 4;
    if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 60) n++;
  }
  return n;
};

for (const [id, spot] of Object.entries(SPOTS)) {
  test(`${spot.name}: the Selfie chip is there, the camera starts only after tapping it, Snap makes a real 1080×1920 card`, async ({ page }) => {
    const w = watch(page);
    await spyCamera(page);
    await openCard(page, spot);

    await test.step('chip is offered; no camera asked for yet', async () => {
      await expect(selfieChip(page)).toBeVisible();
      expect(await page.evaluate(() => window.__gum)).toBe(0);
      await expect(stage(page)).toBeHidden();
    });

    await test.step('tapping Selfie starts the front camera in the frame', async () => {
      await selfieChip(page).click();
      await expect(stage(page)).toBeVisible();
      await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
      expect(await page.evaluate(() => window.__gum)).toBe(1);
      const v = await page.locator('.selfie-video').evaluate((el) => ({ w: el.videoWidth, transform: getComputedStyle(el).transform }));
      expect(v.w).toBeGreaterThan(0);
      expect(v.transform).toBe('matrix(-1, 0, 0, 1, 0, 0)'); // shown as a mirror
      await expect(page.locator('.selfie-prompt')).not.toBeEmpty();
      await expect(sticker(page)).toBeVisible();
      await expect(page.locator('.selfie-privacy')).toHaveText('Your photo stays on your phone. Nothing is uploaded.');
      await expect(page.locator('.selfie-snap')).toBeVisible();
      await expect(page.locator('.share-go')).toBeHidden();
      await expect(page.locator('.share-save')).toBeHidden();
      // the frame is 9:16 and the sticker sits inside it
      const r = await rects(page);
      expect(Math.abs(r.stage.w / r.stage.h - 9 / 16)).toBeLessThan(0.01);
      expect(r.sticker.x).toBeGreaterThanOrEqual(r.stage.x - 1);
      expect(r.sticker.x + r.sticker.w).toBeLessThanOrEqual(r.stage.x + r.stage.w + 1);
    });

    await test.step('Another line cycles the prompt', async () => {
      const before = await page.locator('.selfie-prompt').innerText();
      await page.locator('.share-another').click();
      await expect(page.locator('.selfie-prompt')).not.toHaveText(before);
    });

    await test.step('Snap freezes the frame into the finished card, and the camera is off', async () => {
      await page.locator('.selfie-snap').click();
      await cardReady(page);
      const px = await pixels(page);
      expect([px.w, px.h]).toEqual([1080, 1920]);
      expect(px.colours).toBeGreaterThan(25);
      expect(px.contrast).toBeGreaterThan(80);
      await expect(page.locator('.share-img')).toHaveAttribute('data-badge', 'Selfie · Live AR');
      await expect(page.locator('.share-img')).toHaveAttribute('src', /^blob:/);
      expect(await liveTracks(page)).toBe(0);
      await expect(page.locator('.selfie-retake')).toBeVisible();
      await expect(page.locator('.selfie-snap')).toBeHidden();
      await expect(page.locator('.share-save')).toBeVisible();
    });

    expect(w.errors).toEqual([]);
    expect(w.external).toEqual([]);
  });
}

test('the Selfie chip only shows for a restaurant with selfieCard: true', async ({ page }) => {
  await page.route('**/data/menu.json', async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    for (const r of json.restaurants) if (r.id === 'baraza') r.selfieCard = false;
    await route.fulfill({ response: res, json });
  });
  await openCard(page, SPOTS.baraza);
  await expect(page.locator('.share-chip', { hasText: /^Good vibes$/ })).toBeVisible();
  await expect(selfieChip(page)).toHaveCount(0);
});

test('moving the dish sticker changes the card; two snaps without moving it are identical', async ({ page }) => {
  await stillCamera(page);
  await openCard(page, SPOTS['haute-dolci']);
  await selfieChip(page).click();
  await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
  await expect(sticker(page)).toBeVisible();
  await expect.poll(async () => (await rects(page)).sticker.w).toBeGreaterThan(50);

  const snapNow = async () => {
    await page.locator('.selfie-snap').click();
    await cardReady(page);
    return (await pixels(page)).data;
  };
  const retake = async () => {
    await page.locator('.selfie-retake').click();
    await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
    await expect(page.locator('.selfie-snap')).toBeVisible();
  };

  const a = await snapNow();
  await retake();
  const a2 = await snapNow();
  await retake();

  // drag the sticker up and to the left with the mouse
  const r0 = await rects(page);
  const cx = r0.sticker.x + r0.sticker.w / 2, cy = r0.sticker.y + r0.sticker.h / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 38, cy - 70, { steps: 8 });
  await page.mouse.up();
  const r1 = await rects(page);
  expect(r1.sticker.y).toBeLessThan(r0.sticker.y - 40);
  expect(r1.sticker.x).toBeLessThan(r0.sticker.x - 20);
  const b = await snapNow();

  expect(diff(a, a2, [150, 400])).toBeLessThan(200); // same placement → same card (allowing JPEG noise)
  expect(diff(a, b, [150, 400])).toBeGreaterThan(4000); // moved → the dish is somewhere else on the card
});

test('the sticker resizes with scroll and stays inside the frame however far it is dragged', async ({ page }) => {
  await stillCamera(page);
  await openCard(page, SPOTS.gauchos);
  await selfieChip(page).click();
  await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
  await expect.poll(async () => (await rects(page)).sticker.w).toBeGreaterThan(50);

  const r0 = await rects(page);
  await page.mouse.move(r0.stage.x + r0.stage.w / 2, r0.stage.y + r0.stage.h / 2);
  await page.mouse.wheel(0, -400); // scroll up: bigger
  await expect.poll(async () => (await rects(page)).sticker.w).toBeGreaterThan(r0.sticker.w * 1.2);
  await page.mouse.wheel(0, 1500); // scroll down: smaller, but not to nothing
  await expect.poll(async () => (await rects(page)).sticker.w).toBeLessThan(r0.sticker.w * 0.8);
  expect((await rects(page)).sticker.w).toBeGreaterThan(r0.stage.w * 0.15);

  // drag well past every edge
  const r1 = await rects(page);
  const sx = r1.sticker.x + r1.sticker.w / 2, sy = r1.sticker.y + r1.sticker.h / 2;
  for (const [dx, dy] of [[900, 0], [-1800, 0], [0, -1800], [0, 2400]]) {
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + dx, sy + dy, { steps: 6 });
    await page.mouse.up();
    const r = await rects(page);
    const tol = 2 + r.sticker.w * 0.1; // the small tilt makes the rotated box a touch larger than the clamp
    expect(r.sticker.x).toBeGreaterThanOrEqual(r.stage.x - tol);
    expect(r.sticker.y).toBeGreaterThanOrEqual(r.stage.y - tol);
    expect(r.sticker.x + r.sticker.w).toBeLessThanOrEqual(r.stage.x + r.stage.w + tol);
    expect(r.sticker.y + r.sticker.h).toBeLessThanOrEqual(r.stage.y + r.stage.h + tol);
    // put it back to the middle for the next direction
    await page.mouse.move(r.sticker.x + r.sticker.w / 2, r.sticker.y + r.sticker.h / 2);
    await page.mouse.down();
    await page.mouse.move(r.stage.x + r.stage.w / 2, r.stage.y + r.stage.h / 2, { steps: 6 });
    await page.mouse.up();
  }
});

test('dragging the sticker only changes its transform (no redraw of the card)', async ({ page }) => {
  await stillCamera(page);
  await openCard(page, SPOTS.baraza);
  await selfieChip(page).click();
  await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
  await expect.poll(async () => (await rects(page)).sticker.w).toBeGreaterThan(50);
  const src = await page.locator('.share-img').getAttribute('src'); // the previous card's blob, untouched during the drag
  const style0 = await sticker(page).evaluate((el) => ({ left: el.style.left, top: el.style.top, width: el.style.width }));
  const r0 = await rects(page);
  const cx = r0.sticker.x + r0.sticker.w / 2, cy = r0.sticker.y + r0.sticker.h / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy - 50, { steps: 10 });
  await page.mouse.up();
  const style1 = await sticker(page).evaluate((el) => ({ left: el.style.left, top: el.style.top, width: el.style.width, transform: el.style.transform }));
  expect(style1.left).toBe(style0.left);
  expect(style1.top).toBe(style0.top);
  expect(style1.width).toBe(style0.width);
  expect(style1.transform).toMatch(/translate3d/);
  expect(await page.locator('.share-img').getAttribute('src')).toBe(src);
});

test('Retake goes back to the camera, then Share hands over a JPEG and records mood "selfie" with no image data', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.canShare = () => true;
    navigator.share = async (data) => { window.__shared = { files: (data.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })), text: data.text, url: data.url }; };
  });
  await stillCamera(page);
  await openCard(page, SPOTS['haute-dolci']);
  await selfieChip(page).click();
  await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
  await page.locator('.selfie-snap').click();
  await cardReady(page);

  await page.locator('.selfie-retake').click();
  await expect(stage(page)).toBeVisible();
  await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
  expect(await page.evaluate(() => window.__gum)).toBe(2);
  await page.locator('.selfie-snap').click();
  await cardReady(page);

  // "Another line" on the finished card recomposes it with the next line
  const first = await page.locator('.share-img').getAttribute('data-line');
  await page.locator('.share-another').click();
  await expect(page.locator('.share-img:not([data-line="' + first.replace(/"/g, '\\"') + '"])')).toBeVisible({ timeout: 30_000 });
  await cardReady(page);

  await page.locator('.share-go').click();
  await expect.poll(() => page.evaluate(() => window.__shared)).toBeTruthy();
  const shared = await page.evaluate(() => window.__shared);
  expect(shared.files[0]).toMatchObject({ type: 'image/jpeg' });
  expect(shared.files[0].name).toMatch(/-selfie\.jpg$/);
  expect(shared.files[0].size).toBeGreaterThan(50_000);
  const ev = await page.evaluate(() => window.__menvaEvents.filter((e) => e.event === 'share_card_shared'));
  expect(ev).toHaveLength(1);
  expect(ev[0]).toMatchObject({ dish: 'hd-matilda-cake', mood: 'selfie', target: 'share' });
  expect(JSON.stringify(ev[0]).length).toBeLessThan(400); // nothing like image data in the event
});

test('the camera is switched off on leaving Selfie, closing the sheet, and hiding the tab; nothing is stored', async ({ page }) => {
  await spyCamera(page);
  await openCard(page, SPOTS.baraza);

  await test.step('leaving Selfie for another mood stops the stream', async () => {
    await selfieChip(page).click();
    await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
    expect(await liveTracks(page)).toBeGreaterThan(0);
    await page.locator('.share-chip', { hasText: /^Good vibes$/ }).click();
    await expect.poll(() => liveTracks(page)).toBe(0);
    await expect(stage(page)).toBeHidden();
  });

  await test.step('hiding the tab stops it, and it does not restart by itself', async () => {
    await selfieChip(page).click();
    await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
    expect(await liveTracks(page)).toBeGreaterThan(0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(() => liveTracks(page)).toBe(0);
    await expect(stage(page)).toHaveAttribute('data-view', 'panel');
    await expect(page.locator('.selfie-on')).toBeVisible(); // a tap brings it back
    const calls = await page.evaluate(() => window.__gum);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.__gum)).toBe(calls);
    await page.locator('.selfie-on').click();
    await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
  });

  await test.step('closing the sheet stops it', async () => {
    expect(await liveTracks(page)).toBeGreaterThan(0);
    await page.locator('.share-close').click();
    await expect(page.locator('#share-dialog[open]')).toHaveCount(0);
    await expect.poll(() => liveTracks(page)).toBe(0);
  });

  await test.step('no photo is kept in browser storage', async () => {
    const stored = await page.evaluate(() => Object.entries({ ...localStorage }).map(([k, v]) => `${k}=${v}`).join('\n') + '\n' + JSON.stringify(Object.keys(sessionStorage)));
    expect(stored).not.toMatch(/data:image|blob:|base64/);
    expect(stored.length).toBeLessThan(2000);
    const idb = await page.evaluate(async () => (indexedDB.databases ? (await indexedDB.databases()).length : 0));
    expect(idb).toBe(0);
  });
});

test('no getUserMedia (an in-app browser): "Take a selfie" with a capture file input, the chosen photo fills the frame', async ({ page }) => {
  const w = watch(page);
  await noCamera(page);
  await openCard(page, SPOTS['haute-dolci']);
  await selfieChip(page).click();
  await expect(stage(page)).toHaveAttribute('data-view', 'panel');
  const take = page.locator('.selfie-take');
  await expect(take).toBeVisible();
  await expect(take).toHaveText('Take a selfie');
  await expect(page.locator('.selfie-on')).toBeHidden();
  await expect(page.locator('.selfie-snap')).toBeHidden();
  const input = page.locator('.selfie-file');
  await expect(input).toHaveAttribute('accept', 'image/*');
  await expect(input).toHaveAttribute('capture', 'user');

  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), take.click()]);
  await chooser.setFiles(FIXTURE);
  await expect(stage(page)).toHaveAttribute('data-view', 'photo');
  const photo = await page.locator('.selfie-photo').evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight, fit: getComputedStyle(el).objectFit, transform: getComputedStyle(el).transform }));
  expect(photo.w).toBeGreaterThan(0);
  expect(photo.fit).toBe('cover');
  expect(photo.transform).toBe('none'); // a photo from the phone's camera is not mirrored
  await expect(sticker(page)).toBeVisible();
  await page.locator('.selfie-snap').click();
  await cardReady(page);
  const px = await pixels(page);
  expect([px.w, px.h]).toEqual([1080, 1920]);
  expect(px.colours).toBeGreaterThan(25);
  expect(px.contrast).toBeGreaterThan(80);
  await expect(page.locator('.share-img')).toHaveAttribute('data-badge', 'Selfie · Live AR');

  // Retake with no live camera: back to the panel, ready for another photo
  await page.locator('.selfie-retake').click();
  await expect(stage(page)).toHaveAttribute('data-view', 'panel');
  await expect(page.locator('.selfie-take')).toBeVisible();
  expect(w.errors).toEqual([]);
  expect(w.external).toEqual([]);
});

test('camera refused: the same fallback, no retry loop', async ({ page }) => {
  await deniedCamera(page);
  await openCard(page, SPOTS.gauchos);
  await selfieChip(page).click();
  await expect(stage(page)).toHaveAttribute('data-view', 'panel');
  await expect(page.locator('.selfie-msg')).toContainText('camera is off');
  await expect(page.locator('.selfie-take')).toBeVisible();
  await expect(page.locator('.selfie-on')).toBeHidden();
  await page.locator('.share-another').click(); // pressing buttons doesn't re-ask
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__gum)).toBe(1);
  await page.locator('.selfie-file').setInputFiles(FIXTURE);
  await expect(stage(page)).toHaveAttribute('data-view', 'photo');
  await page.locator('.selfie-snap').click();
  await cardReady(page);
  expect((await pixels(page)).h).toBe(1920);
});

test('a file that is not a photo is refused kindly', async ({ page }) => {
  await noCamera(page);
  await openCard(page, SPOTS.baraza);
  await selfieChip(page).click();
  await page.locator('.selfie-file').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(stage(page)).toHaveAttribute('data-view', 'panel');
  await expect(page.locator('.selfie-msg')).toContainText('isn’t a photo');
});

test('the sticker can be moved and resized from the keyboard', async ({ page }) => {
  await stillCamera(page);
  await openCard(page, SPOTS['haute-dolci']);
  await selfieChip(page).click();
  await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
  await expect.poll(async () => (await rects(page)).sticker.w).toBeGreaterThan(50);
  const r0 = await rects(page);
  await sticker(page).focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Shift+ArrowUp');
  await page.keyboard.press('+');
  await expect.poll(async () => (await rects(page)).sticker.x).toBeLessThan(r0.sticker.x - 2);
  const r1 = await rects(page);
  expect(r1.sticker.y).toBeLessThan(r0.sticker.y);
  expect(r1.sticker.w).toBeGreaterThan(r0.sticker.w);
});

test('first camera permission is asked for only after the guest taps Selfie (real fake-device camera)', async ({ page }) => {
  await spyCamera(page);
  await openCard(page, SPOTS['haute-dolci']);
  await page.locator('.share-chip', { hasText: /^My fav$/ }).click();
  await page.locator('.share-chip', { hasText: /^First look$/ }).click();
  expect(await page.evaluate(() => window.__gum)).toBe(0);
  await selfieChip(page).click();
  await expect(stage(page)).toHaveAttribute('data-view', 'live', { timeout: 15_000 });
  expect(await page.evaluate(() => window.__gum)).toBe(1);
});
