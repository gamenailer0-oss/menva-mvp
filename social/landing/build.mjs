// Builds the "for restaurants" landing page into social/landing/dist/ — a folder you can drag onto
// Netlify (a separate site, or a subpath of the main one later).
//
//   node social/landing/build.mjs --whatsapp 923001234567 --instagram menva.pk --demo https://menva.net --url https://restaurants.menva.net/
//
// --whatsapp: the number in international format without + (opens WhatsApp with "PILOT" typed).
// Without it the buttons show a visible [fill in] link, so the page can't go live half-done.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HERE = path.join(ROOT, 'social/landing');
const DIST = path.join(HERE, 'dist');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : ''; };
// --url: where this page will live, for absolute link-preview URLs (WhatsApp needs them).
const baseUrl = (opt('url') || '').replace(/\/?$/, '/').replace(/^\/$/, '');
const wa = opt('whatsapp').replace(/\D/g, ''), ig = opt('instagram').replace(/^@/, ''), demo = opt('demo') || 'https://menva-ar.netlify.app';
const msg = encodeURIComponent('PILOT\nRestaurant:\nArea:\nMy role:\nBest time for a demo:');
const links = {
  WA_LINK: wa ? `https://wa.me/${wa}?text=${msg}` : '#fill-in-whatsapp-number',
  IG_LINK: ig ? `https://ig.me/m/${ig}` : '#fill-in-instagram-handle',
  DEMO_LINK: demo,
  BASE_URL: baseUrl,
  CONTACT_LINE: [wa && `WhatsApp +${wa}`, ig && `Instagram @${ig}`].filter(Boolean).join(' · ') || '[fill in: WhatsApp · Instagram]',
};

// Dish crops: same logo-free crops as everything else (built by social/print/print.mjs's cache logic).
const tpl = fs.readFileSync(path.join(ROOT, 'social/templates/post.js'), 'utf8');
const CROPS = new Function(tpl.match(/const CROPS = (\{[\s\S]*?\n {2}\});/)[0] + '; return CROPS;')();
// Published file names must not carry the two unconfirmed dish names (their folder ids).
const PUBLIC_NAME = { 'garlic-prawn-skewers-full': 'green-plate', 'chicken-fajita-wrap-board': 'trio' };
async function crop(id, name) {
  const c = CROPS[id][name];
  if (c.brand) throw new Error('branded crop');
  const w = Math.min(c.w, 1200 - c.x), h = Math.min(c.h, 900 - c.y);
  let img = sharp(path.join(ROOT, 'assets/dishes', id, 'poster.webp')).extract({ left: c.x, top: c.y, width: w, height: h });
  if (c.fade) {
    const stops = '<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".16" stop-color="#000" stop-opacity="1"/>';
    const g = { left: `<linearGradient id="g">${stops}</linearGradient>`, right: `<linearGradient id="g" x1="1" x2="0">${stops}</linearGradient>`,
      all: '<radialGradient id="g"><stop offset=".62" stop-color="#000" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' }[c.fade];
    img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${g}</defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`), blend: 'dest-in' }]);
  }
  await img.resize({ width: Math.min(w, 800) }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(DIST, 'img', `${PUBLIC_NAME[`${id}-${name}`] || `${id}-${name}`}.png`));
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'img'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'fonts'), { recursive: true });
for (const f of ['dm-sans-400.woff2', 'dm-sans-600.woff2', 'instrument-serif-400.woff2', 'instrument-serif-400-italic.woff2']) fs.copyFileSync(path.join(ROOT, 'vendor/fonts', f), path.join(DIST, 'fonts', f));
await Promise.all([['steak-sandwich', 'full'], ['steak-sandwich', 'close'], ['garlic-prawn-skewers', 'full'], ['steak-main', 'board'], ['steak-main', 'steak']].map(([i, n]) => crop(i, n)));
fs.writeFileSync(path.join(DIST, 'img/favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#B5371F"/><circle cx="16" cy="16" r="5" fill="#EFEBE2"/></svg>');
// Share image for link previews: the 1200×630 card made by social/profile/make.mjs (real dish render).
const og = path.join(ROOT, 'social/profile/out/og-image.png');
if (fs.existsSync(og)) await sharp(og).jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(DIST, 'img/og.jpg'));
else console.warn('No social/profile/out/og-image.png: run node social/profile/make.mjs for the share image.');
let html = fs.readFileSync(path.join(HERE, 'page.html'), 'utf8');
for (const [k, v] of Object.entries(links)) html = html.replaceAll(`{{${k}}}`, v.replace(/&/g, '&amp;'));
fs.writeFileSync(path.join(DIST, 'index.html'), html);
console.log('Built social/landing/dist/ ' + (wa ? '' : '(WhatsApp number missing: buttons point to #fill-in)'));
