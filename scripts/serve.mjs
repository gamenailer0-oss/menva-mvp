// Local stand-in for Netlify: serves dist/ with the [[headers]] rules from
// netlify.toml and the SPA fallback (/* → /index.html). For testing only.
//
// Usage: npm run build && npm run serve   (PORT=8080 by default)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = +(process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/octet-stream',
  '.glb': 'application/octet-stream', '.usdz': 'application/octet-stream', // overridden by netlify.toml, as on Netlify
};

// Minimal reader for the [[headers]] blocks we use: for = "..." then key = "value" lines.
function headerRules() {
  const rules = [];
  let cur = null;
  for (const line of fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8').split('\n')) {
    const t = line.trim();
    if (t === '[[headers]]') { cur = { pattern: null, values: {} }; rules.push(cur); continue; }
    if (t.startsWith('[[') || (t.startsWith('[') && t !== '[headers.values]')) { cur = null; continue; }
    const m = t.match(/^([\w-]+)\s*=\s*"(.*)"$/);
    if (!cur || !m) continue;
    if (m[1] === 'for') cur.pattern = new RegExp('^' + m[2].replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    else cur.values[m[1]] = m[2];
  }
  return rules;
}

const rules = headerRules();

// Netlify Functions, locally: same handlers, in-memory blob store, a dev-only stats key.
const memory = new Map();
const store = {
  async setJSON(key, value) { memory.set(key, JSON.stringify(value)); },
  async get(key) { return memory.has(key) ? JSON.parse(memory.get(key)) : null; },
  async list({ prefix = '' } = {}) { return { blobs: [...memory.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
};
const LOCAL_ENV = { STATS_KEY: process.env.STATS_KEY || 'local-dev-stats-key' };
const functions = {
  '/api/e': (req) => import('../netlify/functions/e.mjs').then((m) => m.handle(req, store)),
  '/api/stats': (req) => import('../netlify/functions/stats.mjs').then((m) => m.handle(req, store, LOCAL_ENV)),
};

async function runFunction(fn, req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  const response = await fn(request);
  const headers = Object.fromEntries(response.headers);
  for (const r of rules) if (r.pattern?.test(new URL(request.url).pathname)) Object.assign(headers, r.values);
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

http.createServer((req, res) => {
  const fn = functions[new URL(req.url, 'http://x').pathname];
  if (fn) return void runFunction(fn, req, res).catch((err) => { res.writeHead(500).end(String(err)); });
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = path.join(DIST, urlPath);
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(DIST, 'index.html'); // SPA fallback

  const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' };
  // Netlify matches header rules against the requested path.
  for (const r of rules) if (r.pattern?.test(urlPath)) Object.assign(headers, r.values);
  headers['Content-Length'] = fs.statSync(file).size;

  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Serving dist/ on http://localhost:${PORT}`));
