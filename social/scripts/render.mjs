// Renders post slides to JPEG on your own computer — the same template the server uses,
// so you can check posts before they go out.
//
//   node social/scripts/render.mjs                 every post in the calendar → social/previews/out/
//   node social/scripts/render.mjs 12 13           only posts #12 and #13
//   node social/scripts/render.mjs --sheet         also build contact sheets (social/previews/sheet-*.jpg)
//   node social/scripts/render.mjs --file x.json   render the slides in x.json ([{...slide}, ...])
//   node social/scripts/render.mjs --calendar social/content/trend-bank.json --sheet   another calendar file
//
// Needs `npm install` (Playwright + sharp from the repo's package.json).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { slideUrl } from './slide-url.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'social/previews/out');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };

const args = process.argv.slice(2);
const sheet = args.includes('--sheet');
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
const only = args.filter((a) => /^\d+$/.test(a)).map(Number);

let jobs;
let sheetName = 'sheet';
if (fileArg) {
  sheetName = path.basename(fileArg, '.json') + '-sheet';
  jobs = JSON.parse(fs.readFileSync(fileArg, 'utf8')).map((s, i) => ({ name: `slide-${String(i + 1).padStart(2, '0')}`, slide: s }));
} else {
  const calArg = args.includes('--calendar') ? args[args.indexOf('--calendar') + 1] : 'social/content/calendar.json';
  const cal = JSON.parse(fs.readFileSync(path.resolve(ROOT, calArg), 'utf8'));
  if (!/calendar\.json$/.test(calArg)) sheetName = path.basename(calArg, '.json') + '-sheet';
  jobs = cal.posts.filter((p) => !only.length || only.includes(p.n)).flatMap((p) =>
    p.slides.map((s, i) => ({ name: `${String(p.n).padStart(3, '0')}-${p.id}-${i + 1}`, slide: { handle: cal.handle, ...s } })));
}

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
// CHROMIUM_PATH lets you use an installed Chrome instead of Playwright's own download.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
const errors = [];
for (const job of jobs) {
  await page.setViewportSize({ width: 1080, height: job.slide.tall ? 1920 : 1350 });
  await page.goto(slideUrl(base, job.slide));
  await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 15000 });
  const err = await page.evaluate(() => window.__error);
  if (err) errors.push(`${job.name}: ${err}`);
  const png = await page.screenshot({ type: 'png' });
  await sharp(png).jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(OUT, job.name + '.jpg'));
}
await browser.close();
server.close();
console.log(`Rendered ${jobs.length} slides → ${path.relative(ROOT, OUT)}/`);

if (sheet) {
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.jpg')).sort();
  const per = 24, cols = 6, tw = 270, th = jobs.some((j) => j.slide.tall) ? 480 : 338;
  for (let s = 0; s * per < files.length; s++) {
    const chunk = files.slice(s * per, (s + 1) * per);
    const rows = Math.ceil(chunk.length / cols);
    const tiles = await Promise.all(chunk.map(async (f, i) => ({
      input: await sharp(path.join(OUT, f)).resize(tw, th).toBuffer(),
      left: (i % cols) * (tw + 8) + 8, top: Math.floor(i / cols) * (th + 8) + 8,
    })));
    await sharp({ create: { width: cols * (tw + 8) + 8, height: rows * (th + 8) + 8, channels: 3, background: '#cfc6b6' } })
      .composite(tiles).jpeg({ quality: 80 }).toFile(path.join(ROOT, `social/previews/${sheetName}-${s + 1}.jpg`));
  }
  console.log(`Contact sheets → social/previews/${sheetName}-*.jpg`);
}
if (errors.length) { console.error('Slide errors:\n  ' + errors.join('\n  ')); process.exit(1); }
