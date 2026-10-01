// Renders the meme slides in specs.mjs to social/memes/out/<file>.png (1080x1350) with kit.html.
//   node social/memes/make.mjs            all of them
//   node social/memes/make.mjs nokia-01   only files whose name contains "nokia-01"
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { cast } from '../reels/skit/cast.mjs';
import { MEMES } from './specs.mjs';
import { chromium } from '../actions/node_modules/@playwright/test/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });

// The four friends' chat avatars come from the same cast as the Reels, so the characters stay one universe.
const c = cast();
const AV = { ayesha: c.ayesha.smile, sara: c.sara.smile, hamza: c.hamza.cheeky, zain: c.zain.calm, madam: c.madam.serious, ammi: null };
const COL = { ayesha: '#b5371f', sara: '#c27c0e', hamza: '#2f5d62', zain: '#6b4e9b', madam: '#1a1714', ammi: '#3b7a57' };

const TYPES = { '.html': 'text/html', '.woff2': 'font/woff2', '.png': 'image/png', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0);

const only = process.argv[2];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
let n = 0;
try {
  for (const m of MEMES) {
    if (only && !m.file.includes(only)) continue;
    await page.addInitScript(([spec, av, col]) => { window.SPEC = spec; window.AV = av; window.COL = col; }, [m, AV, COL]);
    await page.goto(`http://127.0.0.1:${server.address().port}/social/memes/kit.html?${m.file}`);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
    await page.screenshot({ path: path.join(OUT, m.file + '.png') });
    n++;
  }
} finally { await browser.close(); server.close(); }
console.log(`Rendered ${n} slide(s) to social/memes/out/`);
