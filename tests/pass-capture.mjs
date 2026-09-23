// Phase 4 acceptance: open a dish at throttled "Fast 4G" on a phone viewport, measure tap → dish image,
// and capture The Pass at 0%, ~50% and 100%. Also checks prefers-reduced-motion.
// Needs `npm run build && npm run serve` running. Usage: node tests/pass-capture.mjs [dish-id] [outDir]

import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const dish = process.argv[2] || 'steak-main';
const out = process.argv[3] || 'reports/phase-4';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SLOW = { offline: false, latency: 150, downloadThroughput: (1 * 1024 * 1024) / 8, uploadThroughput: (512 * 1024) / 8 };
const FAST_4G = { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 };
fs.mkdirSync(out, { recursive: true });


// A fresh browser per run: /assets is cached as immutable, so a shared cache would skip the download.
async function run({ reducedMotion, network = FAST_4G, dpr = 2 }) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }]);
  await page.setBypassServiceWorker(true); // service-worker fetches ignore page-level throttling
  const cdp = await page.createCDPSession();
  await cdp.send('Network.emulateNetworkConditions', network);
  await page.goto(`${BASE}/g/12`, { waitUntil: 'networkidle0' });

  // Tap → first frame with the dish image on screen
  const tapToImage = await page.evaluate(async (id) => {
    const t0 = performance.now();
    document.querySelector(`[data-dish="${id}"]`).click();
    // Log every real progress event with its time, for the smoothness check.
    window.__progress = [];
    const stage = document.querySelector('.pass'); let prev = -1;
    new MutationObserver(() => { const r = +stage.style.getPropertyValue('--r'); if (r !== prev) { prev = r; window.__progress.push([Math.round(performance.now() - t0), +r.toFixed(3)]); } }).observe(stage, { attributes: true, attributeFilter: ['style'] });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const img = document.querySelector('.pass-blur');
    return img && img.complete ? Math.round(performance.now() - t0) : null;
  }, dish);

  const tag = (reducedMotion ? 'reduced' : 'motion') + (network === SLOW ? '-slow' : '');
  const shot = (name) => page.screenshot({ path: path.join(out, `${tag}-${name}.png`), clip: { x: 0, y: 0, width: 390, height: 460 } });
  const state = () => page.evaluate(() => {
    const s = document.querySelector('.pass');
    return { r: +getComputedStyle(s).getPropertyValue('--r') || 0, state: s.dataset.state, line: document.querySelector('.pass-line').textContent };
  });

  await shot('0');
  const first = await state();
  const samples = [];
  let fifty = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 60_000) {
    const s = await state();
    samples.push({ t: Date.now() - t0, ...s });
    if (!fifty && s.r >= 0.45 && s.r < 0.9) { fifty = s; await shot('50'); }
    if (s.state === 'live') break;
    await new Promise((r) => setTimeout(r, 100));
  }
  await new Promise((r) => setTimeout(r, 600));
  await shot('100');
  const steamHidden = await page.evaluate(() => getComputedStyle(document.querySelector('.pass-steam')).display === 'none');
  const monotonic = samples.every((s, i) => i === 0 || s.r >= samples[i - 1].r);
  const lines = [...new Set(samples.map((s) => s.line))];
  const events = await page.evaluate(() => window.__progress);
  await browser.close();
  return { tag, progressEvents: events.length, rimUpdates: events.length, rim: events.filter((e, i) => i % Math.ceil(events.length / 12) === 0 || i === events.length - 1).map((e) => `${e[0]}ms:${e[1]}`).join(' '), tapToImage, first, fifty, liveAfterMs: samples.at(-1).t, monotonic, distinctProgressValues: new Set(samples.map((s) => s.r)).size, lines, steamHidden };
}

// Stall: when the model download stops, the 360° sprite should replace the stage after ~6 s below 40%.
async function stall() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/g/12`, { waitUntil: 'networkidle0' });
  await page.setBypassServiceWorker(true);
  // The model request hangs (true stall); everything else, including the sprite, loads normally.
  await page.setRequestInterception(true);
  page.on('request', (req) => (req.url().includes('model.glb') ? undefined : req.continue()));
  await page.evaluate((id) => document.querySelector(`[data-dish="${id}"]`).click(), dish);
  const at = async () => page.evaluate(() => ({ spinner: !!document.querySelector('.pass .spin'), slowLine: !document.querySelector('.pass-slow').hidden, r: +document.querySelector('.pass').style.getPropertyValue('--r') || 0 }));
  await new Promise((r) => setTimeout(r, 4000)); const at4 = await at();
  await new Promise((r) => setTimeout(r, 4000)); const at8 = await at();
  await page.screenshot({ path: path.join(out, 'stall-8s.png'), clip: { x: 0, y: 0, width: 390, height: 520 } });
  await browser.close();
  return { tag: 'stall (model request hangs)', at4s: at4, at8s: at8 };
}

const results = [
  await stall(),
  await run({ reducedMotion: false }),
  await run({ reducedMotion: false, network: SLOW, dpr: 1 }),
  await run({ reducedMotion: true, network: SLOW, dpr: 1 }),
];
console.log(JSON.stringify(results, null, 2));
