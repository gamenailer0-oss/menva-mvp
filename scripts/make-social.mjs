// Renders share images (Open Graph) and app icons for link previews and home-screen icons.
// Uses Playwright (real Chrome) so the real self-hosted fonts and real logos/dish renders are
// used — the same fonts and images the live site uses, not system substitutes.
//
// Usage: npm run social   (outputs are committed to assets/social/)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'social');
fs.mkdirSync(OUT, { recursive: true });

const abs = (rel) => path.resolve(ROOT, rel);
const fileUrl = (rel) => 'file:///' + abs(rel).replace(/\\/g, '/');

// ─── Colour tokens (mirrors css/tokens.css — see design/MENVA.DESIGN.md) ─────
const INK = '#1A1714';
const CREAM = '#FAF7F2';
const PAPER = '#EFEBE2';
const STAGE = '#E9E3D7';
const MENVA_ACCENT = '#B5371F';
const MUTED = '#5C5349';
const GAUCHOS_PAPER = '#EFEBE2';
const GAUCHOS_STAGE = '#E3DCCF';
const GAUCHOS_ACCENT = '#7C2A1C';
const BARAZA_PAPER = '#FAF5EC';
const BARAZA_STAGE = '#EFE8D8';
const BARAZA_SAGE = '#8A9060';
const BARAZA_OLIVE = '#4B5A2B';
const BARAZA_ESPRESSO = '#10150F';
const HD_PAPER = '#FAF3F2';
const HD_BAND = '#141011'; // black, like their store front (matches the menu banner)
const HD_ACCENT = '#9C2F52';
const HD_INK = '#1C1416';
const HD_MUTED = '#6B5B57';

const FONT_FACES = `
  @font-face { font-family: 'Instrument Serif'; font-style: normal; font-weight: 400; src: url('${fileUrl('vendor/fonts/instrument-serif-400.woff2')}') format('woff2'); }
  @font-face { font-family: 'Instrument Serif'; font-style: italic; font-weight: 400; src: url('${fileUrl('vendor/fonts/instrument-serif-400-italic.woff2')}') format('woff2'); }
  @font-face { font-family: 'Jost'; font-style: normal; font-weight: 300; src: url('${fileUrl('vendor/fonts/jost-300.woff2')}') format('woff2'); }
  @font-face { font-family: 'Jost'; font-style: normal; font-weight: 500; src: url('${fileUrl('vendor/fonts/jost-500.woff2')}') format('woff2'); }
  @font-face { font-family: 'DM Sans'; font-style: normal; font-weight: 400; src: url('${fileUrl('vendor/fonts/dm-sans-400.woff2')}') format('woff2'); }
  @font-face { font-family: 'DM Sans'; font-style: normal; font-weight: 500; src: url('${fileUrl('vendor/fonts/dm-sans-500.woff2')}') format('woff2'); }
  @font-face { font-family: 'DM Sans'; font-style: normal; font-weight: 600; src: url('${fileUrl('vendor/fonts/dm-sans-600.woff2')}') format('woff2'); }
`;

// ─── Renderer ─────────────────────────────────────────────────────────────
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'menva-social-'));

async function shoot(browser, html, width, height, { scale = 2, omitBackground = false } = {}) {
  const file = path.join(TMP, `frame-${Math.random().toString(36).slice(2)}.html`);
  fs.writeFileSync(file, html);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
  await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  // omitBackground: Chrome's screenshot backdrop defaults to opaque white regardless of the
  // page's own CSS background — needed so the rounded-square icons keep transparent corners.
  const png = await page.screenshot({ type: 'png', omitBackground });
  await page.close();
  return sharp(png).resize(width, height);
}

// Encode with the highest mozjpeg quality that fits under maxBytes.
async function fitJpeg(sharpImg, maxBytes, background, qualities = [90, 86, 82, 78, 74, 70, 66, 62, 58, 52, 46]) {
  let last;
  for (const q of qualities) {
    const buf = await sharpImg.clone().flatten({ background }).jpeg({ quality: q, mozjpeg: true }).toBuffer();
    last = { buf, q };
    if (buf.length <= maxBytes) return last;
  }
  return last;
}

// Dish cut-outs trimmed to their visible pixels, so the food (the point of MENVA) fills its stage.
const dishCache = {};
async function prepareDish(id) {
  const out = path.join(TMP, `dish-${id}.png`);
  await sharp(path.join(ROOT, 'assets', 'dishes', id, 'poster.webp')).trim({ threshold: 1 }).png().toFile(out);
  dishCache[id] = 'file:///' + out.split(path.sep).join('/');
}
const dishUrl = (id) => dishCache[id];
// A dish sitting on its own contact shadow (the shadow hugs the bottom of the dish, never floats).
const PLATE_CSS = `
    .plate { position:relative; }
    .plate img { display:block; width:100%; position:relative; z-index:1; }
    .plate::after { content:''; position:absolute; left:8%; right:8%; bottom:-5%; height:16%; border-radius:50%;
      background:radial-gradient(ellipse at center, rgba(26,23,20,.32), rgba(26,23,20,0) 70%); }`;

function page(bg, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:1200px; height:630px; overflow:hidden; background:${bg}; }
    body { position:relative; font-family:'DM Sans', sans-serif; -webkit-font-smoothing:antialiased; }
    ${FONT_FACES}
  </style></head><body>${body}</body></html>`;
}

// ─── OG image 1: home ───────────────────────────────────────────────────────
function ogMenvaHtml() {
  return page(PAPER, `<style>
    .left { position:absolute; left:76px; top:100px; width:560px; }
    .wordmark { font-family:'Instrument Serif'; font-size:34px; color:${INK}; margin-bottom:60px; letter-spacing:-0.01em; }
    .headline { font-family:'Instrument Serif'; font-weight:400; font-size:82px; line-height:1.06; color:${INK}; margin-bottom:30px; }
    .headline em { font-style:italic; color:${MENVA_ACCENT}; }
    .sub { font-family:'DM Sans'; font-weight:500; font-size:28px; line-height:1.5; color:${MUTED}; max-width:460px; }
    .stage { position:absolute; right:72px; top:64px; width:400px; height:502px; border-radius:24px; background:${STAGE}; display:flex; align-items:center; justify-content:center; }
    ${PLATE_CSS}
  </style>
  <div class="left">
    <div class="wordmark">menva.</div>
    <div class="headline">See it on your<br><em>table.</em></div>
    <p class="sub">Real dishes in 3D and AR — scan the QR on your table.</p>
  </div>
  <div class="stage">
    <div class="plate" style="width:92%"><img src="${dishUrl('steak-main')}"></div>
  </div>`);
}

// ─── OG image 2: Gauchos ────────────────────────────────────────────────────
function ogGauchosHtml() {
  return page(GAUCHOS_PAPER, `<style>
    .logo { position:absolute; left:72px; top:60px; width:210px; height:auto; }
    .name { position:absolute; left:72px; top:192px; font-family:'Instrument Serif'; font-weight:400; font-size:66px; color:${INK}; }
    .loc { position:absolute; left:72px; top:270px; font-family:'DM Sans'; font-weight:500; font-size:25px; color:${MUTED}; letter-spacing:0.01em; }
    .tagline { position:absolute; left:72px; top:352px; width:460px; font-family:'DM Sans'; font-weight:600; font-size:32px; line-height:1.42; color:${GAUCHOS_ACCENT}; }
    .credit { position:absolute; left:72px; bottom:44px; font-family:'Instrument Serif'; font-size:23px; color:${MUTED}; }
    .stage { position:absolute; right:72px; top:64px; width:400px; height:502px; border-radius:24px; background:${GAUCHOS_STAGE}; display:flex; align-items:center; justify-content:center; }
    ${PLATE_CSS}
  </style>
  <img class="logo" src="${fileUrl('assets/restaurant/gauchos-logo.svg')}">
  <div class="name">Gauchos Steakhouse</div>
  <div class="loc">Gulberg III, Lahore</div>
  <div class="tagline">See the dishes on your table — the menu in 3D</div>
  <div class="credit">menva.</div>
  <div class="stage">
    <div class="plate" style="width:92%"><img src="${dishUrl('steak-main')}"></div>
  </div>`);
}

// ─── OG image 3: Baraza ─────────────────────────────────────────────────────
// Sage band (round logo) on the left; on the right, the tagline block sits above the dish stage
// so the two never share the same row — avoids any text/image collision regardless of wrap.
function ogBarazaHtml() {
  return page(BARAZA_PAPER, `<style>
    .band { position:absolute; left:0; top:0; width:360px; height:630px; background:${BARAZA_SAGE}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:30px; }
    .round-logo { width:196px; height:196px; border-radius:50%; object-fit:cover; box-shadow:0 10px 28px rgba(16,21,15,.28); }
    .brand-name { font-family:'Instrument Serif'; font-weight:400; font-size:33px; color:${BARAZA_ESPRESSO}; }
    .tagline { position:absolute; left:416px; top:52px; width:740px; font-family:'Instrument Serif'; font-weight:400; font-size:60px; line-height:1.1; color:${BARAZA_OLIVE}; }
    .hours { position:absolute; left:418px; top:206px; font-family:'DM Sans'; font-weight:500; font-size:25px; color:${BARAZA_ESPRESSO}; opacity:.72; }
    .credit { position:absolute; left:0; width:360px; bottom:34px; text-align:center; font-family:'Instrument Serif'; font-size:23px; color:${BARAZA_ESPRESSO}; opacity:.7; }
    .stage { position:absolute; left:416px; top:266px; width:728px; height:318px; border-radius:24px; background:${BARAZA_STAGE}; display:flex; align-items:center; justify-content:center; }
    ${PLATE_CSS}
  </style>
  <div class="band">
    <img class="round-logo" src="${fileUrl('assets/restaurant/baraza-logo.webp')}">
    <div class="brand-name">Baraza Coffee</div>
  </div>
  <div class="tagline">Pakistan's largest specialty coffee brew bar</div>
  <div class="hours">Open 24/7 · Gulberg III, Lahore</div>
  <div class="credit">menva.</div>
  <div class="stage">
    <div class="plate" style="width:70%;margin-top:-18px"><img src="${dishUrl('bz-chicken-pizza')}"></div>
  </div>`);
}

// ─── OG image 4: Haute Dolci ────────────────────────────────────────────────
// No dish photography exists yet (the 3D pipeline hasn't run for its three signatures), so this
// card is typographic only — their real logo, their own words, no placeholder dish art of any
// kind. Blush band on the left (their "lavish pink and black" palette); their tagline set in
// tracked-caps Jost (the OFL stand-in for their FuturaPT-Light brand type) on the right.
function ogHauteDolciHtml() {
  return page(HD_PAPER, `<style>
    .band { position:absolute; left:0; top:0; width:360px; height:630px; background:${HD_BAND}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:26px; }
    .band img { width:260px; height:auto; filter:invert(1); }
    .band .loc { font-family:'Jost'; font-weight:500; font-size:19px; letter-spacing:0.12em; text-transform:uppercase; color:#F2D4D9; text-align:center; }
    .tagline { position:absolute; left:416px; top:130px; width:740px; font-family:'Jost'; font-weight:300; font-size:76px; line-height:1.08; letter-spacing:0.01em; text-transform:uppercase; color:${HD_ACCENT}; }
    .sub { position:absolute; left:418px; top:300px; width:700px; font-family:'DM Sans'; font-weight:500; font-size:23px; letter-spacing:0.03em; text-transform:uppercase; color:${HD_MUTED}; }
    .signatures { position:absolute; left:418px; bottom:96px; width:720px; font-family:'DM Sans'; font-weight:400; font-size:20px; line-height:1.5; color:${HD_INK}; }
    .signatures b { font-weight:600; }
    .credit { position:absolute; left:0; width:360px; bottom:34px; text-align:center; font-family:'Instrument Serif'; font-size:23px; color:#F2D4D9; opacity:.75; }
  </style>
  <div class="band">
    <img src="${fileUrl('assets/restaurant/haute-dolci-logo-black.png')}">
    <div class="loc">Raya Fairways &middot; Lahore</div>
  </div>
  <div class="tagline">It's a must.</div>
  <div class="sub">Indulge, Capture, Share, Repeat.</div>
  <div class="signatures"><b>Signatures —</b> San Sebasti&aacute;n cheesecake &middot; Matilda cake &middot; Cookie dough</div>
  <div class="credit">menva.</div>`);
}

// ─── App icon monogram ──────────────────────────────────────────────────────
// "m." in Instrument Serif, cream on ink, with the accent-coloured period — same trailing full
// stop as the "menva." wordmark. `glyphPx` controls how large the glyph reads within the canvas.
function monogramHtml(size, { radiusPct = null, glyphPx }) {
  const radius = radiusPct != null ? `border-radius:${radiusPct}%;` : '';
  return page('transparent', `<style>
    html, body { width:${size}px; height:${size}px; background:transparent; }
    .icon { position:absolute; inset:0; width:${size}px; height:${size}px; background:${INK}; ${radius} display:flex; align-items:center; justify-content:center; }
    .mono { font-family:'Instrument Serif'; font-weight:400; font-size:${glyphPx}px; line-height:1; display:flex; align-items:baseline; transform:translateY(${size * 0.02}px); }
    .m { color:${CREAM}; }
    .dot { color:${MENVA_ACCENT}; margin-left:${size * 0.006}px; }
  </style>
  <div class="icon"><span class="mono"><span class="m">m</span><span class="dot">.</span></span></div>`);
}

// ─── favicon.ico container (PNG-in-ICO, Vista+; no external dependency) ────
function buildIco(entries) {
  const headerSize = 6, dirEntrySize = 16;
  let offset = headerSize + dirEntrySize * entries.length;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dirs = [], datas = [];
  for (const { size, buffer } of entries) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    dirs.push(entry);
    datas.push(buffer);
  }
  return Buffer.concat([header, ...dirs, ...datas]);
}

// favicon.svg: a hand-written path for the "m" glyph (looks the same in every browser, no font
// dependency), plus the accent dot — same rounded-square ink mark as the PNG icons.
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="22" fill="${INK}"/>
  <path d="M27 68 L27 40 L34.5 40 L34.5 44.3 C37.3 41 41 39.2 45.3 39.2 C50.1 39.2 53.5 41.3 55.2 45.1 C58.2 41.2 62.2 39.2 67 39.2 C74.8 39.2 79 43.8 79 52.3 L79 68 L71.3 68 L71.3 53.4 C71.3 48.1 69.2 45.6 65 45.6 C60.5 45.6 57.6 48.6 57.6 53.8 L57.6 68 L50 68 L50 53.4 C50 48.1 47.9 45.6 43.7 45.6 C39.2 45.6 36.3 48.7 36.3 54 L36.3 68 Z" fill="${CREAM}"/>
  <circle cx="86" cy="68" r="6" fill="${MENVA_ACCENT}"/>
</svg>`;

// ─── Run ─────────────────────────────────────────────────────────────────
await Promise.all(['steak-main', 'bz-chicken-pizza'].map(prepareDish));
const browser = await chromium.launch({ channel: 'chrome' });

console.log('Rendering Open Graph images...');
const ogJobs = [
  { file: 'og-menva.jpg', html: ogMenvaHtml(), bg: PAPER },
  { file: 'og-gauchos.jpg', html: ogGauchosHtml(), bg: GAUCHOS_PAPER },
  { file: 'og-baraza.jpg', html: ogBarazaHtml(), bg: BARAZA_PAPER },
  { file: 'og-haute-dolci.jpg', html: ogHauteDolciHtml(), bg: HD_PAPER },
];
for (const job of ogJobs) {
  const img = await shoot(browser, job.html, 1200, 630);
  const { buf, q } = await fitJpeg(img, 250 * 1024, job.bg);
  fs.writeFileSync(path.join(OUT, job.file), buf);
  console.log(`  ${job.file}: ${(buf.length / 1024).toFixed(1)} KB (quality ${q})`);
}

console.log('Rendering icons...');
// Rounded-square variant (favicon-32/16, icon-192/512): glyph fills most of the square.
const roundedPng = (await shoot(browser, monogramHtml(1024, { radiusPct: 22, glyphPx: 560 }), 1024, 1024, { omitBackground: true })).png().toBuffer();
// Full-bleed square, no rounding (apple-touch-icon — iOS applies its own mask).
const squarePng = (await shoot(browser, monogramHtml(1024, { radiusPct: 0, glyphPx: 560 }), 1024, 1024, { omitBackground: true })).png().toBuffer();
// Maskable: full-bleed square, glyph shrunk to fit inside the ~80%-diameter safe circle that
// Android's circular/squircle masks can crop to (bounding box kept comfortably inside it).
const maskablePng = (await shoot(browser, monogramHtml(1024, { radiusPct: 0, glyphPx: 340 }), 1024, 1024, { omitBackground: true })).png().toBuffer();

const [roundedBuf, squareBuf, maskableBuf] = await Promise.all([roundedPng, squarePng, maskablePng]);

async function roundedAt(size) {
  return sharp(roundedBuf).resize(size, size).png().toBuffer();
}

const favicon32 = await roundedAt(32);
const favicon16 = await roundedAt(16);
const icon192 = await roundedAt(192);
const icon512 = await roundedAt(512);
const appleTouch = await sharp(squareBuf).resize(180, 180).flatten({ background: INK }).png().toBuffer();
const maskable512 = await sharp(maskableBuf).resize(512, 512).flatten({ background: INK }).png().toBuffer();

fs.writeFileSync(path.join(OUT, 'favicon-32.png'), favicon32);
fs.writeFileSync(path.join(OUT, 'favicon-16.png'), favicon16);
fs.writeFileSync(path.join(OUT, 'apple-touch-icon.png'), appleTouch);
fs.writeFileSync(path.join(OUT, 'icon-192.png'), icon192);
fs.writeFileSync(path.join(OUT, 'icon-512.png'), icon512);
fs.writeFileSync(path.join(OUT, 'icon-maskable-512.png'), maskable512);
fs.writeFileSync(path.join(OUT, 'favicon.svg'), FAVICON_SVG);
fs.writeFileSync(path.join(OUT, 'favicon.ico'), buildIco([
  { size: 16, buffer: favicon16 },
  { size: 32, buffer: favicon32 },
]));
console.log('  favicon-32.png, favicon-16.png, apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png, favicon.svg, favicon.ico');

await browser.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`Done. Output: ${path.relative(ROOT, OUT)}`);
