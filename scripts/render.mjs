// Headless renders for the pipeline: poster, blur-up, 360° sprite, and USDZ export.
// Drives scripts/render/render.html in the locally installed Chrome (puppeteer-core,
// no browser download). Used by scripts/pipeline.mjs.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.json': 'application/json' };

// Serves the repo root (tooling only) so the page can reach vendor/, node_modules/three and assets/.
function startServer() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const dataUrlToBuffer = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

// Encode with the highest quality in `qualities` that fits under `maxBytes`.
export async function fitWebp(input, maxBytes, qualities = [82, 78, 74, 70, 65, 60, 55, 50, 45, 40]) {
  for (const q of qualities) {
    const out = await sharp(input).webp({ quality: q, alphaQuality: 80, effort: 6 }).toBuffer();
    if (out.length <= maxBytes) return { buffer: out, quality: q };
  }
  const q = qualities.at(-1);
  return { buffer: await sharp(input).webp({ quality: q, alphaQuality: 60, effort: 6 }).toBuffer(), quality: q, overBudget: true };
}

export async function createRenderer() {
  const executablePath = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error('No Chrome/Edge found for rendering. Set CHROME_PATH.');
  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    protocolTimeout: 600_000, // USDZ export of a 2048px-textured model is slow in software WebGL
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push(String(e)));
  await page.goto(`${origin}/scripts/render/render.html`, { waitUntil: 'load' });
  await page.waitForFunction('window.rendererReady === true', { timeout: 60_000 });

  const rel = (file) => '/' + path.relative(ROOT, file).replaceAll('\\', '/');

  return {
    logs,

    // Poster: 1200×900 (4:3), three-quarter top-down view. Rendered large, then the empty
    // transparent border is trimmed so the dish fills the frame with a small margin.
    async poster(glbFile, orbit) {
      await page.evaluate((s) => window.loadModel(s, 1600, 1200), rel(glbFile));
      const png = dataUrlToBuffer(await page.evaluate((o) => window.shoot(o), orbit));
      const trimmed = await sharp(png).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).toBuffer();
      const clear = { r: 0, g: 0, b: 0, alpha: 0 };
      return sharp(trimmed).resize(1104, 828, { fit: 'contain', background: clear }).extend({ top: 36, bottom: 36, left: 48, right: 48, background: clear }).png().toBuffer();
    },

    // 36 frames every 10°, 480×360 each, as a 6×6 grid (a single row would exceed WebP's 16383px limit).
    async spin(glbFile, phi) {
      await page.evaluate((s) => window.loadModel(s, 480, 360), rel(glbFile));
      const frames = [];
      for (let i = 0; i < 36; i++) frames.push(dataUrlToBuffer(await page.evaluate((o) => window.shoot(o), `${i * 10}deg ${phi} 85%`)));
      const sheet = sharp({ create: { width: 480 * 6, height: 360 * 6, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite(frames.map((input, i) => ({ input, left: (i % 6) * 480, top: Math.floor(i / 6) * 360 })));
      return sheet.png().toBuffer();
    },

    async exportUsdz(glbFile, opts) {
      return Buffer.from(await page.evaluate((s, o) => window.exportUsdz(s, o), rel(glbFile), opts), 'base64');
    },

    async close() {
      await browser.close();
      server.close();
    },
  };
}
