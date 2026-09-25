// Instagram profile assets: profile picture + story highlight covers (1080×1920, icon centred
// so it survives Instagram's circle crop). Run: node social/profile/make.mjs  → social/profile/out/
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'social/profile/out');
const css = `<link rel="stylesheet" href="/social/print/print.css"><style>*{margin:0}body{width:W;height:H;overflow:hidden}</style>`;
const icons = {
  how: '<path d="M24 6 40 15v18L24 42 8 33V15z"/><path d="m8 15 16 9 16-9M24 24v18"/>',
  try: '<rect x="14" y="4" width="20" height="40" rx="4"/><path d="M21 38h6"/><circle cx="24" cy="21" r="6"/>',
  restaurants: '<path d="M8 20h32v22H8z"/><path d="M4 20 10 8h28l6 12"/><path d="M19 42V30h10v12"/>',
  faq: '<circle cx="24" cy="24" r="18"/><path d="M19 19a5 5 0 1 1 7 4.6c-1.3.6-2 1.6-2 3v1.4M24 33v.5"/>',
  scans: '<circle cx="24" cy="26" r="16"/><circle cx="24" cy="26" r="10" opacity=".45"/><path d="M24 4v6M13 6l3 5M35 6l-3 5"/>',
  pilot: '<path d="M10 42V8l24 8-24 8"/>',
};
const cover = (key, label) => `<!DOCTYPE html><html><head>${css.replace('W', '1080px').replace('H', '1920px')}</head>
<body style="background:#B5371F;display:flex;flex-direction:column;align-items:center;justify-content:center">
<div style="width:520px;height:520px;border-radius:50%;background:#EFEBE2;display:flex;align-items:center;justify-content:center">
<svg viewBox="0 0 48 48" width="240" height="240" fill="none" stroke="#1A1714" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icons[key]}</svg></div>
<div style="font-family:var(--serif);color:#fff;font-size:88px;margin-top:70px">${label}</div></body></html>`;
const avatar = `<!DOCTYPE html><html><head>${css.replace('W', '1080px').replace('H', '1080px')}</head>
<body style="background:#EFEBE2;display:flex;align-items:center;justify-content:center">
<span class="wordmark" style="font-size:300px;margin-top:-40px">menva<i>.</i></span></body></html>`;
// Link-preview image (WhatsApp, Instagram DMs, Facebook): 1200×630, text kept inside the centre
// so square crops still read.
const og = `<!DOCTYPE html><html><head>${css.replace('W', '1200px').replace('H', '630px')}</head>
<body style="background:#EFEBE2;display:flex;align-items:center;padding:0 70px;gap:30px">
<div style="flex:1.1"><div style="font-size:18px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#5C5349">3D menus · Lahore</div>
<div style="font-family:var(--serif);font-size:76px;line-height:1;margin-top:18px">See it on your table. <em>Then order it.</em></div>
<div class="wordmark" style="font-size:44px;margin-top:34px">menva<i>.</i></div></div>
<div style="flex:1;height:470px;border-radius:28px;background:#E9E3D7;display:flex;align-items:center;justify-content:center">
<img src="/social/print/.cache/steak-sandwich-full.png" style="width:470px;height:420px;object-fit:contain"></div></body></html>`;
const pages = { 'og-image': [og, 1200, 630], 'profile-picture': [avatar, 1080, 1080], ...Object.fromEntries(Object.entries({ how: 'How it works', try: 'Try it', restaurants: 'Restaurants', faq: 'FAQ', scans: 'Real scans', pilot: 'Pilot' }).map(([k, l]) => [`highlight-${k}`, [cover(k, l), 1080, 1920]])) };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u.startsWith('/page/')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pages[u.slice(6)][0]); return; }
  const file = path.join(ROOT, u);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': { '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
}).listen(0);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, [, w, h]] of Object.entries(pages)) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(`http://127.0.0.1:${server.address().port}/page/${name}`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  await page.close();
}
await browser.close(); server.close();
console.log('Wrote', Object.keys(pages).length, 'images to social/profile/out/');
