// Checks social/content/calendar.json against MENVA's content rules, then writes
// social/content/calendar.csv (the same posts, for reading in Excel / Google Sheets).
//
//   node social/scripts/check-calendar.mjs                  (the calendar)
//   node social/scripts/check-calendar.mjs social/content/trend-bank.json
//   node social/scripts/check-calendar.mjs social/content/series-khana-kahan.json   (a series file)
//
// Run it after every edit to calendar.json. It stops with a clear list of problems.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CAL = path.resolve(process.argv[2] || path.join(ROOT, 'social/content/calendar.json'));
const NAME = path.basename(CAL, '.json');
const cal = JSON.parse(fs.readFileSync(CAL, 'utf8'));

// The crops the template knows, read straight from post.js so the two never disagree.
const tpl = fs.readFileSync(path.join(ROOT, 'social/templates/post.js'), 'utf8');
const CROPS = new Function(tpl.match(/const CROPS = (\{[\s\S]*?\n {2}\});/)[0] + '; return CROPS;')();
const DEFAULT_CROP = new Function(tpl.match(/const DEFAULT_CROP = \{[^}]*\};/)[0] + '; return DEFAULT_CROP;')();
const LAYOUTS = [...tpl.matchAll(/^ {4}(\w+): \(d\) =>/gm)].map((m) => m[1]);
for (const id of Object.keys(CROPS)) {
  if (!fs.existsSync(path.join(ROOT, 'assets/dishes', id, 'poster.webp'))) throw new Error(`post.js lists ${id} but assets/dishes/${id}/poster.webp is missing`);
}

const problems = [];
const bad = (p, msg) => problems.push(`#${p.n ?? '?'} ${p.id ?? ''}: ${msg}`);
// The only real prices: the PKR 25,000 restaurant pilot, and the diner plans MENVA Plus (PKR 99/month)
// and MENVA Black (PKR 599/month). Dish prices never appear.
const PILOT_PRICE = /^(PKR|Rs\.?)\s?(25,?000|99|599)$/i;
const EMOJI = /\p{Extended_Pictographic}/u;
// Dish names not confirmed yet: the renders in these folders may not match their folder names.
const UNCONFIRMED = /\b(prawns?|skewers?|fajitas?|wraps?)\b/i;

// series-*.json: posts with their own absolute day (1–300 from START_DATE), on days the calendars leave free.
const SERIES = /^series-[a-z0-9-]+$/.test(NAME);
const MAX_DAY = SERIES ? 300 : 100;
const seenIds = new Set(), seenDays = new Set();
cal.posts.forEach((p, i) => {
  if (p.n !== i + 1) bad(p, `n should be ${i + 1}`);
  if (!/^[a-z0-9-]+$/.test(p.id || '')) bad(p, 'id must be lowercase letters, digits and dashes');
  if (seenIds.has(p.id)) bad(p, 'duplicate id'); seenIds.add(p.id);
  if (!(p.day >= 1 && p.day <= MAX_DAY)) bad(p, `day must be 1–${MAX_DAY}`);
  if (seenDays.has(p.day)) bad(p, `two posts on day ${p.day}`); seenDays.add(p.day);
  if (i && p.day <= cal.posts[i - 1].day) bad(p, 'days must go up');

  if (p.time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)) bad(p, `time "${p.time}" must be HH:MM (24h, Pakistan time)`);
  const slides = p.slides || [];
  if (!slides.length || slides.length > 10) bad(p, 'needs 1–10 slides');
  if ((slides.length > 1) !== (p.format === 'carousel')) bad(p, `format "${p.format}" doesn't match ${slides.length} slide(s)`);
  // Reels: one "cover" slide (the grid thumbnail) plus the video file the server uploads.
  if (p.format === 'reel') {
    if (!/^social\/reels\/out\/[\w-]+\.mp4$/.test(p.video || '') || !fs.existsSync(path.join(ROOT, p.video))) bad(p, `reel video "${p.video}" not found (make it with social/reels/make.mjs)`);
    if (!slides[0] || slides[0].layout !== 'cover') bad(p, 'a reel needs exactly one slide with layout "cover"');
  } else if (slides.some((s) => s.layout === 'cover')) bad(p, 'layout "cover" is only for reels');
  slides.filter((s) => s.layout === 'cover').forEach((s) => { if (!s.img || !fs.existsSync(path.join(ROOT, s.img))) bad(p, `cover image "${s.img}" not found`); });

  const caption = [p.caption, (p.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
  if (!p.caption) bad(p, 'caption is empty');
  if (caption.length > 2200) bad(p, `caption is ${caption.length} characters (Instagram max 2200)`);
  if ((p.hashtags || []).length > 5) bad(p, 'use at most 5 hashtags');
  (p.hashtags || []).forEach((h) => { if (!/^#[\p{L}\p{N}_]+$/u.test(h)) bad(p, `bad hashtag "${h}"`); });

  // Only what people will read (not dish ids like "garlic-prawn-skewers", which are folder names).
  const allText = JSON.stringify([p.caption, p.hashtags, p.alt, slides.map(({ dish, dishes, crop, crops, layout, bg, size, img, ...text }) => text)]);
  if (/gaucho/i.test(allText) && !p.brandOk) bad(p, 'names Gauchos — only with Abdullah\'s OK (then set "brandOk": true)');
  if (EMOJI.test(allText)) bad(p, 'no emoji (brand rule)');
  if (/\{\{[A-Z_]+\}\}|\[(fill in|restaurant|pilot restaurant|name)[^\]]*\]/i.test(allText)) bad(p, 'has an unfilled placeholder like {{RESTAURANT}} or [pilot restaurant]');
  if (UNCONFIRMED.test(allText)) bad(p, 'names a dish that isn\'t confirmed yet (prawn / skewer / fajita / wrap)');
  if (/\d\s?cm\b/i.test(allText)) bad(p, 'mentions a size in cm — plate sizes are not confirmed');
  for (const m of allText.matchAll(/\b(PKR|Rs\.?)\s?\d[\d,]*/gi)) if (!PILOT_PRICE.test(m[0])) bad(p, `price "${m[0]}" — the only real prices are the PKR 25,000 pilot and the PKR 99 / 599 diner plans`);

  slides.forEach((s, j) => {
    const at = `slide ${j + 1}`;
    if (!LAYOUTS.includes(s.layout)) bad(p, `${at}: unknown layout "${s.layout}" (have: ${LAYOUTS.join(', ')})`);
    const dishes = s.layout === 'duo' ? (s.dishes || []) : (s.dish ? [s.dish] : []);
    if (s.layout === 'duo' && dishes.length !== 2) bad(p, `${at}: duo needs two dishes`);
    if (['hero', 'phone', 'split', 'closeup'].includes(s.layout) && !s.dish) bad(p, `${at}: ${s.layout} needs a dish`);
    dishes.forEach((d, k) => {
      if (!CROPS[d]) { bad(p, `${at}: unknown dish "${d}" — use one of ${Object.keys(CROPS).join(', ')}`); return; }
      const crop = (s.layout === 'duo' ? (s.crops || [])[k] : s.crop) || DEFAULT_CROP[d];
      if (!CROPS[d][crop]) bad(p, `${at}: dish ${d} has no crop "${crop}" (have: ${Object.keys(CROPS[d]).join(', ')})`);
      else if (CROPS[d][crop].brand && !(s.brandOk && p.brandOk)) bad(p, `${at}: crop "${crop}" of ${d} shows the restaurant's logo`);
    });
    if (!s.h) bad(p, `${at}: needs a headline (h)`);
    if (s.tall) bad(p, `${at}: tall (9:16) slides can't go in the feed; use them for Stories and ads`);
  });
});

// Post ids must be unique across every calendar and series file: the server's "already posted" record
// uses them. A series post must also land on a day no calendar posts on (one post a day).
const LIVE = /^(calendar(-\d+)?|series-[a-z0-9-]+)\.json$/;
if (LIVE.test(NAME + '.json')) {
  const absDay = (f, d) => { const m = f.match(/^calendar-(\d+)\.json$/); return d + (m ? (Number(m[1]) - 1) * 100 : 0); };
  const myDays = new Map(cal.posts.map((p) => [absDay(NAME + '.json', p.day), p.id]));
  for (const f of fs.readdirSync(path.dirname(CAL)).filter((x) => LIVE.test(x) && x !== NAME + '.json')) {
    const other = JSON.parse(fs.readFileSync(path.join(path.dirname(CAL), f), 'utf8'));
    for (const q of other.posts || []) {
      if (seenIds.has(q.id)) problems.push(`${q.id}: id also used in ${f} (ids must be unique across calendar and series files)`);
      const clash = myDays.get(absDay(f, q.day));
      if (clash && (SERIES || f.startsWith('series-'))) problems.push(`${clash}: same day as ${q.id} in ${f} (one post a day)`);
    }
  }
}

if (problems.length) {
  console.error(`${NAME}.json has ${problems.length} problem(s):\n  ` + problems.join('\n  '));
  process.exit(1);
}

// CSV, with dates worked out from the default start date.
const start = new Date(cal.defaultStart + 'T00:00:00Z');
const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
const rows = [['n', 'day', 'date', 'weekday', 'time', 'id', 'pillar', 'audience', 'format', 'slides', 'caption', 'hashtags', 'alt_text', 'note', 'slide_headlines']];
for (const p of cal.posts) {
  const d = new Date(start); d.setUTCDate(d.getUTCDate() + p.day - 1);
  rows.push([p.n, p.day, d.toISOString().slice(0, 10), d.toUTCString().slice(0, 3), p.time || cal.postTime || '20:30', p.id, p.pillar, p.audience, p.format, p.slides.length,
    p.caption, (p.hashtags || []).join(' '), p.alt || '', p.note || '', p.slides.map((s) => s.h.replace(/\*/g, '').replace(/\n/g, ' ')).join(' | ')]);
}
fs.writeFileSync(path.join(path.dirname(CAL), NAME + '.csv'), '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n');

const count = (k) => Object.entries(cal.posts.reduce((a, p) => ((a[p[k]] = (a[p[k]] || 0) + 1), a), {})).map(([x, c]) => `${x} ${c}`).join(', ');
console.log(`${NAME}.json OK: ${cal.posts.length} posts over ${cal.posts.at(-1).day} days.`);
console.log(`  pillars:   ${count('pillar')}`);
console.log(`  audience:  ${count('audience')}`);
console.log(`  format:    ${count('format')}`);
console.log(`Wrote ${path.relative(ROOT, path.join(path.dirname(CAL), NAME + '.csv'))}`);
