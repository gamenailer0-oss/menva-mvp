// MENVA brand intro: renders intro.html frame by frame (WebGL via SwiftShader), scores it with score.py, encodes the MP4.
//   node social/reels/intro/make.mjs                 full render -> social/reels/out/brand-intro.mp4 (+ -cover.jpg)
//   node social/reels/intro/make.mjs --stills 1,4.5  just those moments, as JPEGs in $STILLS (default /tmp)
//   node social/reels/intro/make.mjs --score x.wav   just the soundtrack
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
const FPS = 30, SUB = 2;                        // render at 60 fps, blend pairs down to 30: a soft 180-degree shutter
const args = process.argv.slice(2);
const stills = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((q, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);

// The QR card on the table is real: it opens the Instagram page.
const qr = QRCode.create('https://instagram.com/eatmenva', { errorCorrectionLevel: 'M' }).modules;
const QR = { size: qr.size, data: Array.from(qr.data) };

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.addInitScript((q) => { window.QR = q; }, QR);
await page.goto(`http://127.0.0.1:${server.address().port}/social/reels/intro/intro.html`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const DUR = await page.evaluate(() => window.DUR);

try {
  if (args.includes('--score')) {
    // just the soundtrack, for listening checks: node make.mjs --score out.wav
    const cueFile = path.join(process.env.TMPDIR || '/tmp', 'menva-intro-cues.json');
    fs.writeFileSync(cueFile, JSON.stringify({ len: DUR, bpm: 120, events: await page.evaluate(() => window.CUES) }));
    execFileSync('python3', [path.join(HERE, 'score.py'), cueFile, args[args.indexOf('--score') + 1]], { stdio: 'inherit' });
  } else if (stills) {
    const dir = process.env.STILLS || '/tmp';
    for (const t of stills) {
      await page.evaluate((x) => window.seek(x), t);
      await page.screenshot({ path: path.join(dir, `still-${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
    }
    console.log(`Wrote ${stills.length} still(s) to ${dir}`);
  } else {
    const work = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'menva-intro-'));
    const N = Math.round(DUR * FPS * SUB);
    const t0 = Date.now();
    for (let i = 0; i < N; i++) {
      await page.evaluate(([x, f]) => window.seek(x, f), [i / (FPS * SUB), i]);
      await page.screenshot({ path: path.join(work, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93 });
      if (i % 120 === 0) console.log(`frame ${i}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    // cover: the end card with everything on it
    await page.evaluate(() => window.seek(21.5));
    await page.screenshot({ path: path.join(OUT, 'brand-intro-cover.jpg'), type: 'jpeg', quality: 92 });
    // sound: every cue the timeline placed, scored at 120 BPM
    const cues = await page.evaluate(() => window.CUES);
    const cueFile = path.join(work, 'cues.json');
    fs.writeFileSync(cueFile, JSON.stringify({ len: DUR, bpm: 120, events: cues }));
    execFileSync('python3', [path.join(HERE, 'score.py'), cueFile, path.join(work, 'score.wav')], { stdio: 'inherit' });
    const ff = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
    execFileSync(ff, ['-y', '-loglevel', 'error', '-framerate', String(FPS * SUB), '-i', path.join(work, 'f%05d.jpg'), '-i', path.join(work, 'score.wav'),
      '-vf', `tmix=frames=${SUB},fps=${FPS},format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.join(OUT, 'brand-intro.mp4')], { stdio: 'inherit' });
    fs.rmSync(work, { recursive: true, force: true });
    console.log(`Wrote social/reels/out/brand-intro.mp4 in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  }
} finally { await browser.close(); server.close(); }
