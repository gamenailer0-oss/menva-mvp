// Builds data/build/dishes.json from:
//   data/dishes.csv                 (source of truth, filled by the restaurant)
//   data/restaurants/<id>.json      (restaurant identity + loader copy)
//   assets/dishes/<id>/meta.json    (pipeline output)
//
// Never invents food data: empty / TO_CONFIRM fields become null or "unconfirmed" and the
// app shows "Please confirm with your server". Bad values fail the build with a clear message.
//
// Usage: npm run build-data

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'build', 'dishes.json');

const ALLERGENS = ['gluten', 'dairy', 'egg', 'tree nuts', 'peanuts', 'soy', 'sesame', 'fish', 'shellfish', 'mustard', 'sulphites'];
const SPICE_MAX = 3;
const NUTRITION = { calories: 'calories', protein_g: 'protein_g', fat_g: 'fat_g', carbs_g: 'carbs_g', serving_g: 'serving_g' };

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; if (row.some((f) => f)) rows.push(row); row = []; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r, i) => ({ line: i + 2, ...Object.fromEntries(head.map((h, j) => [h.trim(), (r[j] ?? '').trim()])) }));
}

const errors = [];
const warnings = [];
const unconfirmed = (v) => v === '' || /^to_confirm$/i.test(v);
const list = (v) => v.split(/[;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);

function dish(row, restaurantId) {
  const at = (col) => `dishes.csv line ${row.line} (${row.id || 'no id'}), ${col}`;
  const err = (col, msg) => errors.push(`${at(col)}: ${msg}`);
  const warn = (col, msg) => warnings.push(`${at(col)}: ${msg}`);

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.id)) err('id', `"${row.id}" must be lowercase letters, numbers and dashes`);
  if (!row.name || unconfirmed(row.name)) err('name', 'required');
  if (!row.category || unconfirmed(row.category)) err('category', 'required');

  let price = null;
  if (!unconfirmed(row.price_pkr)) {
    if (!/^\d+$/.test(row.price_pkr.replace(/,/g, ''))) err('price_pkr', `"${row.price_pkr}" is not a whole number of rupees`);
    else price = Number(row.price_pkr.replace(/,/g, ''));
  }

  let description = unconfirmed(row.description) ? null : row.description;
  if (description && /placeholder/i.test(description)) { warn('description', 'placeholder text — not shown'); description = null; }

  // "none" means the restaurant confirmed there are none; empty means nobody has checked yet.
  let allergens = null;
  if (!unconfirmed(row.allergens)) {
    const vals = list(row.allergens);
    if (vals.length === 1 && vals[0] === 'none') allergens = [];
    else {
      const bad = vals.filter((a) => !ALLERGENS.includes(a));
      if (bad.length) err('allergens', `unknown ${bad.map((b) => `"${b}"`).join(', ')} — allowed: ${ALLERGENS.join(', ')}, or "none"`);
      allergens = vals;
    }
  }

  const halalRaw = row.halal.toLowerCase();
  const halal = unconfirmed(row.halal) ? 'unconfirmed' : halalRaw;
  if (!['yes', 'no', 'unconfirmed'].includes(halal)) err('halal', `"${row.halal}" must be yes, no or TO_CONFIRM`);

  const confirmedBy = unconfirmed(row.confirmed_by) ? null : row.confirmed_by;

  let spice = null;
  if (!unconfirmed(row.spice_level)) {
    if (!/^[0-3]$/.test(row.spice_level)) err('spice_level', `"${row.spice_level}" must be 0–${SPICE_MAX}`);
    else if (!confirmedBy && row.spice_level === '0') warn('spice_level', '0 with no confirmed_by looks like a template default — shown as unconfirmed');
    else spice = Number(row.spice_level);
  }

  let dietary = null;
  if (!unconfirmed(row.dietary)) {
    const vals = list(row.dietary);
    dietary = vals.length === 1 && vals[0] === 'none' ? [] : vals;
  }

  const ingredients = unconfirmed(row.ingredients) ? null : row.ingredients.split(/[;|]/).map((s) => s.trim()).filter(Boolean);

  let nutrition = {};
  for (const [col, key] of Object.entries(NUTRITION)) {
    if (unconfirmed(row[col])) { nutrition[key] = null; continue; }
    if (!/^\d+(\.\d+)?$/.test(row[col])) err(col, `"${row[col]}" is not a number`);
    else nutrition[key] = Number(row[col]);
  }
  if (Object.values(nutrition).every((v) => v === null)) nutrition = null;

  const is3d = row.is_3d.toLowerCase();
  if (!['yes', 'no', ''].includes(is3d)) err('is_3d', `"${row.is_3d}" must be yes or no`);

  // 3D assets from the pipeline; URLs carry a content hash because /assets is cached as immutable.
  let assets = null, dimensions = null;
  if (is3d === 'yes') {
    const metaPath = path.join(ROOT, 'assets', 'dishes', row.id, 'meta.json');
    if (!fs.existsSync(metaPath)) warn('is_3d', 'no pipeline output in assets/dishes/ — shown without 3D (run npm run pipeline)');
    else {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const url = (file) => (meta.files[file] ? `/assets/dishes/${row.id}/${file}?v=${meta.files[file].hash}` : null);
      const blurFile = path.join(ROOT, 'assets', 'dishes', row.id, 'poster-blur.webp');
      assets = {
        glb: url('model.glb'),
        glbBytes: meta.files['model.glb'].bytes, // for honest loader progress when the host compresses
        usdz: meta.usdz ? url('model.usdz') : null,
        usdzBytes: meta.usdz ? meta.files['model.usdz'].bytes : null, // iPhone "preparing AR" progress
        poster: url('poster.webp'),
        blur: `data:image/webp;base64,${fs.readFileSync(blurFile).toString('base64')}`,
        spin: url('spin.webp'),
        spinLayout: meta.spin,
        posterIsPhoto: meta.poster === 'photo',
      };
      dimensions = meta.dimensions_cm;
    }
  }

  return {
    id: row.id,
    restaurant: restaurantId,
    name: row.name,
    category: row.category,
    price_pkr: price,
    description,
    ingredients,
    allergens,
    halal,
    spice_level: spice,
    dietary,
    nutrition,
    has3d: !!assets,
    assets,
    dimensions_cm: dimensions,
    confirmed_by: confirmedBy,
  };
}

// ---------- main ----------

const csvRows = parseCSV(fs.readFileSync(path.join(ROOT, 'data', 'dishes.csv'), 'utf8'));
const restaurantsDir = path.join(ROOT, 'data', 'restaurants');
const restaurants = fs.readdirSync(restaurantsDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(restaurantsDir, f), 'utf8')));

// The CSV has no restaurant column yet; every row belongs to the pilot restaurant.
const pilot = restaurants.find((r) => r.pilot) ?? restaurants[0];
const seen = new Set();
const dishes = [];
for (const row of csvRows) {
  if (seen.has(row.id)) errors.push(`dishes.csv line ${row.line}: duplicate id "${row.id}"`);
  seen.add(row.id);
  dishes.push(dish(row, pilot.id));
}

if (errors.length) {
  console.error(`\n✗ data/dishes.csv has ${errors.length} problem(s) — dishes.json was NOT written:\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

const out = {
  generated: new Date().toISOString(),
  restaurants: restaurants.map((r) => {
    const own = dishes.filter((d) => d.restaurant === r.id);
    return { ...r, categories: [...new Set(own.map((d) => d.category))], dishes: own }; // categories in CSV order
  }),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`data/build/dishes.json: ${dishes.length} dishes, ${dishes.filter((d) => d.has3d).length} with 3D`);
if (warnings.length) console.log(`\n${warnings.length} note(s):\n  - ${warnings.join('\n  - ')}`);
