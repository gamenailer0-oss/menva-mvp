// Renders the motion Reels to MP4 (1080×1920, 30 fps, H.264, silent: add trending audio in the
// Instagram app when posting, as reels.md recommends).
//
//   node social/reels/make.mjs                 all reels → social/reels/out/<name>.mp4 (+ cover .jpg)
//   node social/reels/make.mjs sight-test      one reel
//
// Needs: npm install (Playwright + sharp), the dish crops (node social/print/print.mjs once), and an
// ffmpeg with libx264: set FFMPEG=/path/to/ffmpeg, or `pip install imageio-ffmpeg`.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'social/reels/out');
const FPS = 30;
let ffmpeg = process.env.FFMPEG;
if (!ffmpeg) { try { ffmpeg = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim(); } catch { ffmpeg = 'ffmpeg'; } }
if (!fs.existsSync(path.join(ROOT, 'social/print/.cache/steak-sandwich-full.png'))) { console.error('Run node social/print/print.mjs first (it makes the dish crops).'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const url = (name) => `http://127.0.0.1:${server.address().port}/social/reels/reel.html?reel=${name}`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(url('pehle-dekho'));
await page.waitForFunction(() => window.__ready === true);
const all = await page.evaluate(() => window.REEL.names);
const only = process.argv.slice(2);
for (const name of all.filter((n) => !only.length || only.includes(n))) {
  await page.goto(url(name));
  await page.waitForFunction(() => window.__ready === true);
  const len = await page.evaluate(() => window.REEL.length);
  const frames = Math.round(len * FPS);
  const file = path.join(OUT, name + '.mp4');
  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i === Math.round(frames * 0.45)) fs.writeFileSync(path.join(OUT, name + '-cover.jpg'), jpg); // a mid-reel frame as the cover
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg failed ' + c)) : r())));
  console.log(`✓ ${path.relative(ROOT, file)} (${len}s, ${(fs.statSync(file).size / 1e6).toFixed(1)} MB)`);
}
await browser.close(); server.close();
