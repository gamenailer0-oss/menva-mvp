// Render QA: seek the film every 0.25 s and print any parts passing through each other (hand in body, prop in a head).
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node social/reels/latent/collide.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { chromium } from '../../actions/node_modules/@playwright/test/index.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const server = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
const b = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('page error:', e.message));
await p.goto(`http://127.0.0.1:${server.address().port}/social/reels/films/latent.html`);
await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const found = await p.evaluate(() => { const r = {}; for (let t = 0; t < window.DUR - 4; t += 0.25) { window.seek(t); for (const c of window.__collide()) (r[c] = r[c] || []).push(+t.toFixed(2)); } return r; });
for (const [k, ts] of Object.entries(found)) console.log(k, 'at', ts.length > 6 ? `${ts[0]}..${ts[ts.length - 1]} (${ts.length}x)` : ts.join(', '));
console.log(Object.keys(found).length ? 'COLLISIONS' : 'no collisions');
await b.close(); server.close();
