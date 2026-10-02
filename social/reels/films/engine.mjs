// MENVA film pack renderer. Every film is social/reels/films/<id>.html exposing:
//   window.seek(t)   draw the frame at t seconds (a pure function of t)
//   window.DUR       length in seconds          window.CUES  [{t, type, ...}] for the score
//   window.FILM      { preset, bpm, fps?, cover }  fps 12 gives a stepped stop-motion look
//   window.__ready   true once fonts, models and textures are loaded
//
//   node social/reels/films/engine.mjs <id>                  -> social/reels/out/film-<id>.mp4 + -cover.jpg
//   node social/reels/films/engine.mjs <id> --stills 1,4.5   -> JPEG stills in $STILLS (default /tmp)
//   node social/reels/films/engine.mjs <id> --score x.wav    -> just the soundtrack
// Set CHROMIUM_PATH=/opt/pw-browsers/chromium in this container.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import QRCode from '../../../node_modules/qrcode/lib/index.js';
import { chromium } from '../../actions/node_modules/@playwright/test/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const OUT = path.join(ROOT, 'social/reels/out');
const [id, ...args] = process.argv.slice(2);
if (!id || !fs.existsSync(path.join(HERE, id + '.html'))) { console.error('usage: engine.mjs <film id> [--stills t,t | --score out.wav]'); process.exit(1); }
const stills = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);

// Every QR in the films is real and opens the Instagram page.
const qr = QRCode.create('https://instagram.com/eatmenva', { errorCorrectionLevel: 'M' }).modules;
const QR = { size: qr.size, data: Array.from(qr.data) };

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
await page.addInitScript((q) => { window.QR = q; }, QR);
await page.goto(`http://127.0.0.1:${server.address().port}/social/reels/films/${id}.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const { DUR, FILM } = await page.evaluate(() => ({ DUR: window.DUR, FILM: window.FILM }));
const FPS = 30;
const step = FILM.fps && FILM.fps < 30 ? FILM.fps : null;   // stop-motion films hold each drawing for 30/fps frames

async function score(wav) {
  const cueFile = path.join(process.env.TMPDIR || '/tmp', `menva-film-${id}-cues.json`);
  fs.writeFileSync(cueFile, JSON.stringify({ len: DUR, preset: FILM.preset, bpm: FILM.bpm, events: await page.evaluate(() => window.CUES) }));
  execFileSync('python3', [path.join(HERE, 'score.py'), cueFile, wav], { stdio: 'inherit' });
}

try {
  if (args.includes('--score')) {
    await score(args[args.indexOf('--score') + 1]);
  } else if (stills) {
    const dir = process.env.STILLS || '/tmp';
    for (const t of stills) {
      await page.evaluate((x) => window.seek(x), t);
      await page.screenshot({ path: path.join(dir, `${id}-${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
    }
    console.log(`Wrote ${stills.length} still(s) to ${dir}`);
  } else {
    const work = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', `menva-film-${id}-`));
    // Smooth films: 60 fps blended in pairs to 30 (soft shutter). Stop-motion: one drawing per 1/fps s, no blend.
    const SUB = step ? 1 : 2, rate = FPS * SUB, N = Math.round(DUR * rate);
    const t0 = Date.now();
    let last = null, lastFile = null;
    for (let i = 0; i < N; i++) {
      const t = step ? Math.floor((i / rate) * step) / step : i / rate;
      const file = path.join(work, `f${String(i).padStart(5, '0')}.jpg`);
      if (t === last) { fs.copyFileSync(lastFile, file); continue; }
      await page.evaluate((x) => window.seek(x), t);
      await page.screenshot({ path: file, type: 'jpeg', quality: 93 });
      last = t; lastFile = file;
      if (i % 120 === 0) console.log(`${id}: frame ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    await page.evaluate((x) => window.seek(x), FILM.cover ?? DUR - 1);
    await page.screenshot({ path: path.join(OUT, `film-${id}-cover.jpg`), type: 'jpeg', quality: 92 });
    await score(path.join(work, 'score.wav'));
    const ff = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
    const vf = SUB > 1 ? `tmix=frames=${SUB},fps=${FPS},format=yuv420p` : 'format=yuv420p';
    execFileSync(ff, ['-y', '-loglevel', 'error', '-framerate', String(rate), '-i', path.join(work, 'f%05d.jpg'), '-i', path.join(work, 'score.wav'),
      '-vf', vf, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-maxrate', '4.8M', '-bufsize', '9.6M', '-profile:v', 'high', // under jsDelivr's 20 MB file limit
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(OUT, `film-${id}.mp4`)], { stdio: 'inherit' });
    fs.rmSync(work, { recursive: true, force: true });
    console.log(`Wrote social/reels/out/film-${id}.mp4 in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
} finally { await browser.close(); server.close(); }
