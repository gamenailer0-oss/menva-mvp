// Copies the public site into dist/ — the only folder Netlify publishes.
// Nothing is bundled or transformed: files are copied as-is, except the service
// worker, which gets a build id so each deploy refreshes its CSS/JS cache.
//
// Usage: npm run build

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// Everything public. Anything not listed here (CLAUDE.md, scripts/, incoming-models/, data/dishes.csv, …) stays private.
const PUBLIC = ['index.html', 'sw.js', 'robots.txt', 'css', 'js', 'assets', 'vendor', 'data/build', 'stats'];

fs.rmSync(DIST, { recursive: true, force: true });
const hash = crypto.createHash('sha256');
let count = 0;

function copy(rel) {
  const from = path.join(ROOT, rel);
  if (!fs.existsSync(from)) return;
  if (fs.statSync(from).isDirectory()) {
    for (const name of fs.readdirSync(from).sort()) copy(path.join(rel, name));
    return;
  }
  if (path.basename(rel) === 'meta.json') return; // pipeline internals, read by build-data only
  const to = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  hash.update(rel).update(fs.readFileSync(from));
  count++;
}

if (!fs.existsSync(path.join(ROOT, 'vendor', 'model-viewer.min.js'))) {
  console.error('vendor/ is missing — run `npm run vendor` first.');
  process.exit(1);
}
PUBLIC.forEach(copy);

// Drag-and-drop deploys ignore netlify.toml, so mirror its headers/redirects as _headers/_redirects.
const headers = [], redirects = [];
let block = null;
for (const line of fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8').split('\n')) {
  const t = line.trim();
  if (t === '[[headers]]') { block = { kind: 'h', values: [] }; headers.push(block); continue; }
  if (t === '[[redirects]]') { block = { kind: 'r' }; redirects.push(block); continue; }
  if (t.startsWith('[') && t !== '[headers.values]') { block = null; continue; }
  const m = t.match(/^([\w-]+)\s*=\s*"?(.*?)"?$/);
  if (!block || !m) continue;
  if (block.kind === 'h') m[1] === 'for' ? (block.for = m[2]) : block.values.push(`${m[1]}: ${m[2]}`);
  else block[m[1]] = m[2];
}
fs.writeFileSync(path.join(DIST, '_headers'), headers.map((h) => `${h.for}\n${h.values.map((v) => `  ${v}`).join('\n')}`).join('\n\n') + '\n');
fs.writeFileSync(path.join(DIST, '_redirects'), redirects.map((r) => `${r.from}  ${r.to}  ${r.status}`).join('\n') + '\n');

const build = hash.digest('hex').slice(0, 12);

// Stamp local CSS/JS links with the build id. HTML is always revalidated, so after a deploy the
// page asks for new URLs and the service worker can never pair old JavaScript with new data.
for (const page of ['index.html', 'stats/index.html']) {
  const file = path.join(DIST, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8').replace(/((?:href|src)="\/(?:css|js|stats)\/[^"?]+\.(?:css|js))"/g, `$1?v=${build}"`);
  fs.writeFileSync(file, html);
}
const swPath = path.join(DIST, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__BUILD__', build));

console.log(`dist/: ${count} files, build ${build}`);
