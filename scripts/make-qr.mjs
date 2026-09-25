// Print-ready table QR codes (CLAUDE.md Phase 9). One restaurant per run (--restaurant, default
// "gauchos"); each writes to its own print/qr*/<slug>/ subfolder, so a run for one restaurant
// never deletes another restaurant's codes — only that subfolder is wiped.
//
//   npm run qr -- --tables 30                                → print/qr/gauchos/g-table-<n>.svg + sheet.html
//   npm run qr -- --restaurant baraza --tables 1-3 --preview → print/qr-preview/baraza/, stamped "TEST — not for print"
//
// Each code points to https://<domain>/<slug>/<table>, with error correction H (still scans with
// ~30% of it smudged or covered) and a wide quiet zone, dark on white.
//
// The domain comes from data/site.json ("domain"), or --domain. Printed codes live on tables for
// years, so a *.netlify.app address is refused: it would break the day hosting changes. --preview
// allows it (for testing on a phone), and marks every card so it can't be mistaken for the real thing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_DOMAIN = 'menva-ar.netlify.app';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

// ---------- inputs ----------
const preview = flag('preview');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'site.json'), 'utf8'));
let domain = (value('domain') || site.domain || (preview ? PREVIEW_DOMAIN : '')).trim().toLowerCase()
  .replace(/^https?:\/\//, '').replace(/\/+$/, '');
if (!domain) fail('No domain set. Put the real domain in data/site.json ("domain": "menva.net") or pass --domain.\n  To test on a phone before then: npm run qr -- --tables 1-5 --preview');
if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) fail(`"${domain}" doesn't look like a domain (e.g. menva.net).`);
if (!preview && /\.netlify\.app$/.test(domain)) fail(`Refusing to make printable codes for ${domain}: printed codes must survive a hosting change.\n  Use the custom domain, or --preview for test codes.`);

const restaurantId = value('restaurant') || 'gauchos';
const restaurantFile = path.join(ROOT, 'data', 'restaurants', `${restaurantId}.json`);
if (!fs.existsSync(restaurantFile)) fail(`No data/restaurants/${restaurantId}.json`);
const restaurant = JSON.parse(fs.readFileSync(restaurantFile, 'utf8'));

// The number of tables is the restaurant's to say, so there is no default.
const spec = value('tables');
if (!spec) fail('Say which tables: --tables 30 (tables 1–30) or --tables 5-12.');
const m = /^(\d+)(?:-(\d+))?$/.exec(spec);
if (!m) fail(`--tables "${spec}" should be a number (30) or a range (5-12).`);
const [from, to] = m[2] ? [+m[1], +m[2]] : [1, +m[1]];
if (from < 1 || to < from || to > 500) fail(`--tables ${spec}: expected tables between 1 and 500.`);

// ---------- card ----------
// A 70 × 95 mm card: QR, table number, one line of instruction. Sizes in mm so it prints true.
const W = 70, H = 95, QR = 54, QX = (W - QR) / 2, QY = 8;
const INK = '#1A1714', PAPER = '#FFFFFF', MUTED = '#5C5349';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function card(url, table) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const quiet = 4; // modules of white on each side, inside the QR square (plus the card margin around it)
  const cell = QR / (n + quiet * 2);
  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (qr.modules.get(y, x)) d += `M${(QX + (x + quiet) * cell).toFixed(3)} ${(QY + (y + quiet) * cell).toFixed(3)}h${cell.toFixed(3)}v${cell.toFixed(3)}h-${cell.toFixed(3)}z`;
    }
  }
  const stamp = preview
    ? `<rect x="0" y="0" width="${W}" height="6" fill="#B5371F"/><text x="${W / 2}" y="4.3" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="3.2" font-weight="700" fill="#FFFFFF">TEST — NOT FOR PRINT</text>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
  <title>${esc(restaurant.name)} — table ${table}</title>
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  ${stamp}
  <path d="${d}" fill="${INK}" shape-rendering="crispEdges"/>
  <text x="${W / 2}" y="${QY + QR + 11}" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="10" fill="${INK}">Table ${table}</text>
  <text x="${W / 2}" y="${QY + QR + 18}" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="3.4" fill="${MUTED}">Scan to see the dishes on your table</text>
  <text x="${W / 2}" y="${H - 5}" text-anchor="middle" font-family="DM Sans, Arial, sans-serif" font-size="3" font-weight="600" fill="${INK}">${esc(restaurant.name)} · menva.</text>
</svg>
`;
}

// ---------- write ----------
// Per-restaurant subfolder: a run for one restaurant only ever wipes its own codes.
const outDir = path.join(ROOT, 'print', preview ? 'qr-preview' : 'qr', restaurant.slug);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const files = [];
for (let t = from; t <= to; t++) {
  const url = `https://${domain}/${restaurant.slug}/${t}`;
  const file = `${restaurant.slug}-table-${t}.svg`;
  fs.writeFileSync(path.join(outDir, file), card(url, t));
  files.push({ file, t, url });
}

// One page to print them all: A4, 2 × 2 cards per sheet at true size, with cut margins.
fs.writeFileSync(path.join(outDir, 'sheet.html'), `<!doctype html>
<meta charset="utf-8">
<title>${esc(restaurant.name)} table QR codes${preview ? ' (TEST)' : ''}</title>
<style>
  @page { size: A4; margin: 12mm; }
  body { margin: 0; font-family: Arial, sans-serif; }
  .grid { display: grid; grid-template-columns: repeat(2, 70mm); gap: 10mm 16mm; justify-content: center; }
  .grid img { width: 70mm; height: 95mm; outline: 0.2mm dashed #bbb; break-inside: avoid; }
  p { font-size: 11px; color: #555; text-align: center; }
  @media print { p { display: none; } }
</style>
<p>${files.length} cards · https://${esc(domain)}/${esc(restaurant.slug)}/… · print at 100% (no "fit to page"), then cut on the dashed lines.</p>
<div class="grid">
${files.map((f) => `  <img src="${f.file}" alt="Table ${f.t}">`).join('\n')}
</div>
`);

console.log(`${preview ? 'TEST ' : ''}QR codes for ${restaurant.name}, tables ${from}–${to} → ${path.relative(ROOT, outDir)}/`);
console.log(`  e.g. table ${from}: ${files[0].url}`);
console.log(`  print: open ${path.relative(ROOT, path.join(outDir, 'sheet.html'))} in a browser`);
