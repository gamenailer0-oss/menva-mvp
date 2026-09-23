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
const PUBLIC = ['index.html', 'sw.js', 'robots.txt', 'css', 'js', 'assets', 'vendor', 'models', 'data/build', 'stats'];

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

const build = hash.digest('hex').slice(0, 12);
const swPath = path.join(DIST, 'sw.js');
fs.writeFileSync(swPath, fs.readFileSync(swPath, 'utf8').replace('__BUILD__', build));

console.log(`dist/: ${count} files, build ${build}`);
