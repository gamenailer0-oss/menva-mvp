// Print-ready MENVA marketing materials → PDF (and PNG previews).
//
//   node social/print/print.mjs                          all documents, QR shown as a placeholder
//   node social/print/print.mjs --domain menva.net       put a real QR (to https://menva.net) on them
//   node social/print/print.mjs --whatsapp "0300 0000000" --instagram "@eatmenva" --email "hi@menva.net"
//   node social/print/print.mjs --restaurant "Name"      table tent for one partner restaurant
//
// Documents: table-tent, menu-stickers, restaurant-one-pager, pitch-deck, window-sticker (partner door/window), staff-card (waiter briefing).
//
// Output: social/print/out/*.pdf + *-preview.png. Dish images are real renders, cropped with the
// same logo-free crops as the Instagram template (social/templates/post.js).
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import QRCode from 'qrcode';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HERE = path.join(ROOT, 'social/print');
const OUT = path.join(HERE, 'out');
const CACHE = path.join(HERE, '.cache');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : ''; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const domain = opt('domain').replace(/^https?:\/\//, '').replace(/\/+$/, '');
// Abdullah's call (25 Sep): print with the netlify.app address for now and reprint once the custom domain
// is live. Those printed codes will stop working if the Netlify site is ever renamed or moved.
if (/\.netlify\.app$/.test(domain)) console.warn('Warning: printing QR codes with ' + domain + '. Reprint them once the custom domain is live.');
const contact = { whatsapp: opt('whatsapp'), instagram: opt('instagram'), email: opt('email') };
const restaurant = opt('restaurant');

// ── Dish crops, straight from the Instagram template so both stay logo-free ──
const tpl = fs.readFileSync(path.join(ROOT, 'social/templates/post.js'), 'utf8');
const CROPS = new Function(tpl.match(/const CROPS = (\{[\s\S]*?\n {2}\});/)[0] + '; return CROPS;')();
fs.mkdirSync(CACHE, { recursive: true });
async function dishImg(id, crop) {
  const c = CROPS[id][crop];
  if (!c || c.brand) throw new Error(`No logo-free crop ${id}/${crop}`);
  const file = path.join(CACHE, `${id}-${crop}.png`);
  if (!fs.existsSync(file)) {
    const w = Math.min(c.w, 1200 - c.x), h = Math.min(c.h, 900 - c.y); // some crops run a few px past the edge
    let img = sharp(path.join(ROOT, 'assets/dishes', id, 'poster.webp')).extract({ left: c.x, top: c.y, width: w, height: h });
    if (c.fade) { // same soft edge as the post template: keep the pixels where the mask is opaque
      const stops = (a, b) => `<stop offset="${a}" stop-opacity="0"/><stop offset="${b}" stop-opacity="1"/>`;
      const g = { left: `<linearGradient id="g">${stops(0, 0.16)}</linearGradient>`,
        right: `<linearGradient id="g" x1="1" x2="0">${stops(0, 0.16)}</linearGradient>`,
        all: `<radialGradient id="g"><stop offset=".62" stop-opacity="1"/><stop offset="1" stop-opacity="0"/></radialGradient>` }[c.fade];
      const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${g.replace(/<stop /g, '<stop stop-color="#000" ')}</defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`);
      img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]);
    }
    await img.png().toFile(file);
  }
  return `../.cache/${id}-${crop}.png`; // relative to out/
}

// QRCode.toString returns a promise, so the SVG is made once up front and reused.
const QR_SVG = domain ? await QRCode.toString(`https://${domain}`, { type: 'svg', errorCorrectionLevel: 'H', margin: 2, color: { dark: '#1A1714', light: '#FFFFFF' } }) : '';
function qr(size, label = 'Scan to open the menu') {
  if (!domain) return `<div class="qr placeholder" style="width:${size};height:${size}">QR code<br>(run with --domain to add)</div>`;
  const svg = QR_SVG;
  return `<div class="qr" style="width:${size};height:${size}" aria-label="${esc(label)}">${svg}</div>`;
}
// Unfilled contact details print as a visible [placeholder] so they can't go to print by accident.
const fill = (v, what) => v ? esc(v) : `<span style="background:#FFE9A8;color:#1A1714;padding:0 1mm">[${what}: fill in]</span>`;
const contactLine = () => [contact.whatsapp && `WhatsApp ${esc(contact.whatsapp)}`, contact.instagram && `Instagram ${esc(contact.instagram)}`, contact.email && esc(contact.email)].filter(Boolean).join('  ·  ')
  || `${fill('', 'WhatsApp')}  ·  ${fill('', 'Instagram')}`;
const page = (w, h, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="../print.css">
<style>@page { size: ${w} ${h}; margin: 0 } .page { width: ${w}; height: ${h}; }</style></head><body>${body}</body></html>`;

// ── 1. Table tent card (100 × 150 mm, front + back) ──
async function tent() {
  const sandwich = await dishImg('steak-sandwich', 'full');
  return page('100mm', '150mm', `
  <section class="page bg-paper" style="padding:9mm 8mm 7mm">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="over">${restaurant ? esc(restaurant) + ' · ' : ''}3D menu</span><span class="wordmark" style="font-size:14pt">menva<i>.</i></span></div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;margin:1mm -4mm"><img class="dish" src="${sandwich}" style="width:78mm;height:52mm"></div>
    <h1 style="font-size:25pt">See it on your table <em>before you order.</em></h1>
    <div style="display:flex;gap:5mm;align-items:center;margin-top:5mm">
      ${qr('30mm')}
      <div style="font-size:8.5pt;line-height:1.4"><strong>Point your camera at the code.</strong><br>No app needed.<br><span class="muted">Order se pehle dekh lo.</span></div>
    </div>
  </section>
  <section class="page bg-chili" style="padding:10mm 8mm 8mm">
    <span class="over">How it works</span>
    <ol style="list-style:none;margin-top:6mm;display:flex;flex-direction:column;gap:5mm">
      ${[['Scan the code', 'The menu opens on your phone. Safari or Chrome, no app.'], ['Tap a dish', 'The real dish comes into focus. Turn it with one finger.'], ['See it on your table', 'Place it in front of you at its true size, then decide.'], ['Show the waiter', 'Add dishes and notes to your list, then turn your phone to the waiter.']]
        .map(([t, b], i) => `<li style="display:flex;gap:4mm"><span style="font-family:var(--serif);font-size:26pt;line-height:.8;color:var(--cream)">${i + 1}</span><div><div style="font-family:var(--serif);font-size:15pt;line-height:1.05">${t}</div><div style="font-size:8pt;line-height:1.4;margin-top:1mm;opacity:.9">${b}</div></div></li>`).join('')}
    </ol>
    <div style="margin-top:auto;font-size:7.5pt;line-height:1.45;border-top:1px solid rgba(255,255,255,.3);padding-top:3.5mm">
      <strong>Opened it from Instagram?</strong> Tap the three dots and choose <em style="color:#fff">Open in external browser</em> for the table view.
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:4mm"><span style="font-size:8pt">Real dishes, scanned in 3D. No AI food.</span><span class="wordmark" style="font-size:14pt">menva<i>.</i></span></div>
  </section>`);
}

// ── 2. Menu sticker sheet (A4, 12 × 55 mm circles) ──
async function stickers() {
  const one = `<div style="width:55mm;height:55mm;border-radius:50%;background:var(--chili);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6mm">
    <span style="font-size:6pt;font-weight:600;letter-spacing:.14em;text-transform:uppercase;opacity:.85">Scan the table QR</span>
    <span style="font-family:var(--serif);font-size:19pt;line-height:1;margin-top:2mm">See it <em>in 3D</em></span>
    <span style="font-size:6.5pt;margin-top:2mm;opacity:.9">before you order</span>
    <span class="wordmark" style="font-size:11pt;margin-top:2.5mm">menva<i>.</i></span></div>`;
  return page('210mm', '297mm', `<section class="page bg-white" style="padding:14mm 12mm;display:grid;grid-template-columns:repeat(3,55mm);grid-auto-rows:55mm;gap:10mm 13mm;justify-content:center;align-content:start">
    ${one.repeat(12)}</section>`);
}

// ── 3. Restaurant one-pager (A4) ──
async function onePager() {
  const [board, sandwich, green] = await Promise.all([dishImg('steak-main', 'board'), dishImg('steak-sandwich', 'full'), dishImg('garlic-prawn-skewers', 'full')]);
  const card = (t, b) => `<div style="background:#fff;border-radius:4mm;padding:5mm"><div style="font-family:var(--serif);font-size:15pt;line-height:1.05">${t}</div><div style="font-size:8.5pt;line-height:1.45;margin-top:2mm" class="muted">${b}</div></div>`;
  return page('210mm', '297mm', `<section class="page bg-paper" style="padding:16mm 16mm 12mm">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="over">For restaurants in Lahore</span><span class="wordmark" style="font-size:22pt">menva<i>.</i></span></div>
    <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:8mm;align-items:center;margin-top:10mm">
      <div><h1 style="font-size:40pt">"How big is it?" <em>Answered at the table.</em></h1>
        <p style="font-size:10.5pt;line-height:1.5;margin-top:5mm">Guests scan the QR on the table and your real dishes, scanned in 3D, appear on their own table at true size. Then they order with your staff, as they always do.</p></div>
      <div style="background:var(--stage);border-radius:6mm;height:70mm;display:flex;align-items:center;justify-content:center"><img class="dish" src="${board}" style="width:80mm;height:62mm"></div>
    </div>
    <h2 style="font-size:20pt;margin-top:10mm">How it works</h2>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:4mm">
      ${card('1 · Scan', 'The QR on every table opens your menu in the browser. No app for guests to download.')}
      ${card('2 · Tap a dish', 'The real dish comes into focus, and guests turn it around with one finger.')}
      ${card('3 · See it on the table', 'Placed in AR at its true size. Honest portions: it can\'t be pinched bigger.')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:9mm">
      <div><h2 style="font-size:17pt">What stays the same</h2>
        <ul style="font-size:9pt;line-height:1.6;margin:3mm 0 0 4mm">
          <li>Your waiters take the order. No online ordering or payment.</li>
          <li>Guests build a "show the waiter" list, notes included.</li>
          <li>Works in Safari and Chrome, on your restaurant wifi. The photo shows first.</li></ul></div>
      <div><h2 style="font-size:17pt">What you get to see</h2>
        <ul style="font-size:9pt;line-height:1.6;margin:3mm 0 0 4mm">
          <li>How many tables scanned the QR</li><li>Which dishes guests opened</li>
          <li>How often a dish was placed on the table in AR</li><li>How many lists were shown to your waiters</li></ul></div>
    </div>
    <div style="display:flex;gap:4mm;margin-top:8mm;height:30mm">
      ${[sandwich, green].map((s) => `<div style="flex:1;background:var(--stage);border-radius:4mm;display:flex;align-items:center;justify-content:center"><img class="dish" src="${s}" style="height:27mm;width:70mm"></div>`).join('')}
      <div style="flex:1;background:var(--ink);color:var(--cream);border-radius:4mm;padding:4mm 5mm;display:flex;flex-direction:column;justify-content:center">
        <span style="font-size:7pt;letter-spacing:.14em;text-transform:uppercase;opacity:.8">No AI food</span>
        <span style="font-family:var(--serif);font-size:13pt;line-height:1.1;margin-top:1mm">Every dish is a scan of a real plate.</span></div>
    </div>
    <div class="bg-chili" style="margin-top:auto;border-radius:6mm;padding:7mm 8mm;display:flex;align-items:center;gap:7mm">
      <div style="flex:1"><span class="over">Lahore pilot</span>
        <div style="font-family:var(--serif);font-size:30pt;line-height:1;margin-top:2mm">PKR 25,000</div>
        <div style="font-size:9pt;margin-top:3mm;line-height:1.5">See it on your own table first. Ask for a demo:<br><strong>${contactLine()}</strong></div></div>
      ${qr('32mm', 'Try the demo')}
    </div>
  </section>`);
}

// ── 4. Pitch deck (16:9, 10 slides) ──
async function deck() {
  const [board, steak, sandwich, sClose, green, trio] = await Promise.all([dishImg('steak-main', 'board'), dishImg('steak-main', 'steak'), dishImg('steak-sandwich', 'full'), dishImg('steak-sandwich', 'close'), dishImg('garlic-prawn-skewers', 'full'), dishImg('chicken-fajita-wrap', 'board')]);
  const S = (bg, inner, n) => `<section class="page ${bg}" style="padding:14mm 16mm 10mm">${inner}
    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:baseline;padding-top:4mm"><span class="wordmark" style="font-size:14pt">menva<i>.</i></span><span class="over">${n} / 10</span></div></section>`;
  const img = (src, w, h) => `<img class="dish" src="${src}" style="width:${w};height:${h}">`;
  const slides = [
    S('bg-paper', `<span class="over">For restaurants · Lahore</span><div style="display:flex;align-items:center;gap:8mm;flex:1">
      <h1 style="font-size:48pt;flex:1.1">See it on your table. <em>Then order it.</em></h1><div style="flex:1;display:flex;justify-content:center">${img(board, '105mm', '85mm')}</div></div>`, 1),
    S('bg-ink', `<span class="over">The problem</span><h1 style="font-size:40pt;margin-top:10mm;max-width:190mm">Menus describe food. <em>Guests have to guess.</em></h1>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:14mm">${['"What does it look like?"', '"How big is it?"', '"Is it enough for two?"', '"Which one should I get?"'].map((q) => `<div style="border:1px solid rgba(255,255,255,.25);border-radius:4mm;padding:6mm 5mm;font-family:var(--serif);font-size:17pt;line-height:1.1">${q}</div>`).join('')}</div>
      <p style="font-size:10pt;margin-top:8mm;opacity:.85">Every one of those questions is a guest who isn't sure yet, and a waiter describing a plate instead of hosting.</p>`, 2),
    S('bg-paper', `<span class="over">Guests decide with their eyes</span><div style="display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:8mm;flex:1;align-items:center">
      <div><h1 style="font-size:36pt">Food is chosen on a phone <em>before it's ordered.</em></h1>
      <p style="font-size:10pt;line-height:1.55;margin-top:6mm">For Gen Z, Instagram is where the decision about where to eat starts. Diners look up menus before they go, and 18 to 24 year olds look for food photos more than any other age group.</p>
      <p style="font-size:7pt;margin-top:4mm" class="muted">Sources: Tastewise, Gen Z food trends (2026); Restaurant Dive, US diner survey (77% check a restaurant website before visiting; ~60% of 18–24s look for food photos). US data, shown as direction, not a Lahore number.</p></div>
      <div style="background:var(--stage);border-radius:6mm;height:95mm;display:flex;align-items:center;justify-content:center">${img(sClose, '90mm', '80mm')}</div></div>`, 3),
    S('bg-paper', `<span class="over">MENVA</span><h1 style="font-size:34pt;margin-top:4mm">QR. Tap. <em>Dish on the table.</em></h1>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:8mm;flex:1">${[[sandwich, '1 · Scan the table QR', 'The menu opens in the browser. No app.'], [green, '2 · Tap a dish', 'The real dish comes into focus. Turn it around.'], [board, '3 · See it on the table', 'Placed in AR at true size, then they decide.']].map(([s, t, b]) => `<div style="background:#fff;border-radius:5mm;padding:5mm;display:flex;flex-direction:column"><div style="flex:1;display:flex;align-items:center;justify-content:center;background:var(--stage);border-radius:3mm">${img(s, '68mm', '42mm')}</div><div style="font-family:var(--serif);font-size:16pt;margin-top:4mm">${t}</div><div style="font-size:9pt;margin-top:1.5mm" class="muted">${b}</div></div>`).join('')}</div>`, 4),
    S('bg-sand', `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10mm;flex:1;align-items:center">
      <div style="display:flex;justify-content:center">${img(steak, '100mm', '85mm')}</div>
      <div><span class="over">Real scans, true size</span><h1 style="font-size:36pt;margin-top:4mm">Your chef's plating, <em>not a stock photo.</em></h1>
      <ul style="font-size:10pt;line-height:1.7;margin:6mm 0 0 5mm"><li>Every dish is a 3D scan of a real plate from your kitchen</li><li>In AR it sits at its true size and can't be pinched bigger</li><li>Honest portions build trust before the plate arrives</li></ul></div></div>`, 5),
    S('bg-paper', `<span class="over">Built for your floor</span><h1 style="font-size:34pt;margin-top:4mm">Nothing changes for your team, <em>except fewer questions.</em></h1>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:10mm">${[['No app', 'Opens from the table QR in Safari or Chrome.'], ['Slow wifi', 'The dish photo shows first; the 3D follows.'], ['Waiter in charge', 'No online ordering or payment. Guests show the waiter a list.'], ['Every phone', 'No AR on a phone? Guests still turn the dish in 3D.']].map(([t, b]) => `<div style="background:#fff;border-radius:4mm;padding:6mm 5mm;min-height:48mm"><div style="font-family:var(--serif);font-size:18pt">${t}</div><div style="font-size:9pt;line-height:1.45;margin-top:2mm" class="muted">${b}</div></div>`).join('')}</div>`, 6),
    S('bg-ink', `<span class="over">What you see</span><h1 style="font-size:36pt;margin-top:4mm">Real numbers from <em>your own tables.</em></h1>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:12mm">${['Tables that scanned the QR', 'Which dishes guests opened', 'Dishes placed on the table in AR', 'Lists shown to your waiters'].map((t, i) => `<div style="border-top:2px solid #E8876F;padding-top:4mm"><div style="font-family:var(--serif);font-size:30pt;color:#E8876F">0${i + 1}</div><div style="font-size:11pt;margin-top:2mm">${t}</div></div>`).join('')}</div>
      <p style="font-size:9.5pt;margin-top:10mm;opacity:.8">A private results page for the pilot, per day and per dish.</p>`, 7),
    S('bg-paper', `<span class="over">How the pilot works</span><h1 style="font-size:34pt;margin-top:4mm">From your kitchen to <em>their table.</em></h1>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin-top:10mm">${[['Your signature dishes, in 3D', 'Real plates, scanned and checked.'], ['A QR on every table', 'Printed codes that open your menu.'], ['Guests see it, staff take the order', 'Service stays exactly as it is.'], ['Review the results together', 'What guests opened, placed and showed.']].map(([t, b], i) => `<div><div style="font-family:var(--serif);font-size:40pt;color:var(--chili);line-height:.9">0${i + 1}</div><div style="font-family:var(--serif);font-size:16pt;margin-top:3mm;line-height:1.1">${t}</div><div style="font-size:9pt;margin-top:2mm" class="muted">${b}</div></div>`).join('')}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:6mm">${img(trio, '40mm', '38mm')}</div>`, 8),
    S('bg-chili', `<div style="display:flex;flex-direction:column;justify-content:center;flex:1"><span class="over">Lahore pilot</span>
      <h1 style="font-size:72pt;margin-top:4mm">PKR 25,000</h1><p style="font-size:13pt;margin-top:6mm;max-width:170mm">See your own dishes on your own tables, with real numbers from real guests.</p></div>`, 9),
    S('bg-paper', `<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:10mm;flex:1;align-items:center">
      <div><span class="over">Next step</span><h1 style="font-size:42pt;margin-top:4mm">Try it on <em>this table,</em> right now.</h1>
      <p style="font-size:11pt;line-height:1.55;margin-top:6mm">Scan the code, tap a dish and place it in front of you.</p>
      <p style="font-size:11pt;margin-top:8mm"><strong>${contactLine()}</strong></p></div>
      <div style="display:flex;justify-content:center">${qr('70mm', 'Try the demo')}</div></div>`, 10),
  ];
  return page('254mm', '142.9mm', slides.join(''));
}

// ── 5. Window / door sticker for partner restaurants (150 × 150 mm) ──
async function windowSticker() {
  return page('150mm', '150mm', `<section class="page bg-chili" style="border-radius:0;padding:14mm;align-items:center;justify-content:center;text-align:center">
    <span class="over" style="color:rgba(255,255,255,.85)">Our menu is in 3D</span>
    <h1 style="font-size:40pt;margin-top:5mm;line-height:.98">See it on your table <em>before you order.</em></h1>
    <p style="font-size:10pt;margin-top:6mm;opacity:.92">Scan the QR on your table. No app needed.</p>
    <span class="wordmark" style="font-size:22pt;margin-top:8mm">menva<i>.</i></span>
  </section>`);
}

// ── 6. Staff briefing card (A6, 105 × 148 mm, front + back) for partner-restaurant waiters ──
async function staffCard() {
  const line = (en, ru) => `<div style="margin-top:3.2mm"><div style="font-size:9pt;font-weight:600;line-height:1.35">${en}</div><div style="font-size:8.5pt;line-height:1.35" class="muted">${ru}</div></div>`;
  return page('105mm', '148mm', `
  <section class="page bg-paper" style="padding:9mm 8mm">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="over">For the team</span><span class="wordmark" style="font-size:13pt">menva<i>.</i></span></div>
    <h1 style="font-size:21pt;margin-top:4mm">Tell guests in <em>10 seconds.</em></h1>
    ${line('"Scan the code on your table and you can see the dishes in 3D, even on your own table, before you order."', '"Table pe code scan karein, dish 3D mein dikhegi, apni table pe bhi, order se pehle."')}
    ${line('"No app needed. It opens in your phone\'s camera or browser."', '"Koi app nahi chahiye. Camera ya browser mein khul jata hai."')}
    ${line('"Add what you like to your list, then just show me."', '"Jo pasand aaye list mein daal dein, phir mujhe dikha dein."')}
    <div style="margin-top:auto;background:#fff;border-radius:3mm;padding:3.5mm 4mm;font-size:8pt;line-height:1.45">
      <strong>Best moment to mention it:</strong> when you hand over the menu, or when a guest asks "what does it look like?" or "is it enough for two?"</div>
  </section>
  <section class="page bg-ink" style="padding:9mm 8mm">
    <span class="over">If something doesn't work</span>
    <div style="display:flex;flex-direction:column;gap:3.6mm;margin-top:4mm;font-size:8.5pt;line-height:1.42">
      <div><strong>The code opens inside Instagram.</strong><br>Tap the three dots, then "Open in external browser". The table view needs Safari or Chrome.</div>
      <div><strong>"See it on your table" doesn't appear.</strong><br>Some phones can't do AR. The guest can still turn the dish around in 3D, and the photo is always there.</div>
      <div><strong>It's slow.</strong><br>The dish photo shows first; the 3D follows in a few seconds on the restaurant wifi.</div>
      <div><strong>Taking the order.</strong><br>Nothing changes. Guests show you a list with notes like "no onions". You take the order as usual; nothing is sent anywhere.</div>
      <div><strong>A guest asks about allergens or halal.</strong><br>If the menu says "Please confirm with your server", answer from the kitchen, never from the app.</div>
    </div>
    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:baseline;font-size:8pt"><span>Questions: ${contactLine()}</span><span class="wordmark" style="font-size:13pt">menva<i>.</i></span></div>
  </section>`);
}

// ── Render ──
const docs = { 'table-tent': tent, 'menu-stickers': stickers, 'restaurant-one-pager': onePager, 'pitch-deck': deck, 'window-sticker': windowSticker, 'staff-card': staffCard };
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/social/print/out/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
for (const [name, make] of Object.entries(docs)) {
  fs.writeFileSync(path.join(OUT, name + '.html'), await make());
  const page = await browser.newPage();
  await page.goto(base + name + '.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(OUT, name + '.pdf'), preferCSSPageSize: true, printBackground: true });
  // PNG preview of every page, side by side
  const shots = [];
  for (const el of await page.$$('.page')) shots.push(await el.screenshot());
  const metas = await Promise.all(shots.map((s) => sharp(s).metadata()));
  const h = 700, widths = metas.map((m) => Math.round(m.width * h / m.height));
  const cols = Math.min(shots.length, name === 'pitch-deck' ? 2 : 4);
  const rows = Math.ceil(shots.length / cols), cw = Math.max(...widths);
  const tiles = await Promise.all(shots.map(async (s, i) => ({ input: await sharp(s).resize({ height: h }).toBuffer(), left: (i % cols) * (cw + 20) + 20, top: Math.floor(i / cols) * (h + 20) + 20 })));
  await sharp({ create: { width: cols * (cw + 20) + 20, height: rows * (h + 20) + 20, channels: 3, background: '#cfc6b6' } }).composite(tiles).jpeg({ quality: 82 }).toFile(path.join(OUT, name + '-preview.jpg'));
  await page.close();
  console.log(`✓ ${name}.pdf (${shots.length} page${shots.length > 1 ? 's' : ''})`);
}
await browser.close(); server.close();
if (!domain) console.log('Note: QR codes are placeholders. Run with --domain <your domain> once it is live.');
