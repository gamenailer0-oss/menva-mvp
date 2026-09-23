// Phase 0 audit — read-only. Inspects every model in incoming-models/ and
// cross-checks against data/dishes.csv, then writes audit-report.md.
//
// Handles three source formats:
//   - .glb   → @gltf-transform (the target format for the pipeline)
//   - .obj   → parsed directly (+ .mtl for material factors / texture slots)
//   - .usdz  → zip structure checked (stored + 64-byte aligned), mesh read with three's USDLoader
//
// Usage: node scripts/audit.mjs   (never writes anywhere except audit-report.md)

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INCOMING = path.join(ROOT, 'incoming-models');
const CSV_PATH = path.join(ROOT, 'data', 'dishes.csv');
const REPORT_PATH = path.join(ROOT, 'audit-report.md');
const REPORT_JSON = path.join(ROOT, 'audit-report.json');
const SOURCES_PATH = path.join(ROOT, 'data', 'model-sources.json');

// Budgets / thresholds from CLAUDE.md
const CLAY_ROUGHNESS = 0.85;
const PLATE_TOLERANCE = 0.15;
const PIVOT_TOL_CM = 0.5;
const TRI_LIMIT = 40_000;
const ALBEDO_MAX = 2048;
const NORMAL_MAX = 1024;
const GLB_BUDGET = 1.2 * 1024 * 1024;
const USDZ_BUDGET = 1.8 * 1024 * 1024;

// ---------- helpers ----------

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';
const size = (n) => (n >= 1024 * 1024 ? mb(n) : kb(n));
const cm = (m) => +(m * 100).toFixed(1);

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const unconfirmed = (v) => v === '' || v === 'TO_CONFIRM';

function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function jpgSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xc3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}
const imageSize = (buf) => pngSize(buf) ?? jpgSize(buf);

// Minimal zip reader: central directory → per-entry method + data offset.
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip (no EOCD)');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('bad central directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    // Data offset comes from the *local* header (its extra field can differ from the central one).
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataOffset = localOff + 30 + lNameLen + lExtraLen;
    entries.push({ name, method, csize, dataOffset, aligned: dataOffset % 64 === 0 });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function describeBox(min, max) {
  const dims = { x: cm(max[0] - min[0]), y: cm(max[1] - min[1]), z: cm(max[2] - min[2]) };
  const pivot = {
    minY: cm(min[1]),
    cx: cm((min[0] + max[0]) / 2),
    cz: cm((min[2] + max[2]) / 2),
  };
  const pivotOk =
    Math.abs(pivot.minY) <= PIVOT_TOL_CM && Math.abs(pivot.cx) <= PIVOT_TOL_CM && Math.abs(pivot.cz) <= PIVOT_TOL_CM;
  return { dims, pivot, pivotOk, horizontalMax: Math.max(dims.x, dims.z) };
}

// ---------- per-format inspectors ----------

async function inspectGLB(file) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(file);
  const root = doc.getRoot();
  let tris = 0, verts = 0;
  const indexTypes = new Set();
  const positions = [];
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const idx = prim.getIndices();
      for (const v of pos?.getArray() ?? []) positions.push(v);
      verts += pos?.getCount() ?? 0;
      tris += (idx ? idx.getCount() : pos?.getCount() ?? 0) / 3;
      indexTypes.add(idx ? idx.getArray().constructor.name.replace('Array', '') : 'none');
    }
  }
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const { min, max } = getBounds(scene);

  const textures = [];
  const materials = root.listMaterials().map((m) => {
    const slots = {
      baseColor: m.getBaseColorTexture(),
      normal: m.getNormalTexture(),
      metallicRoughness: m.getMetallicRoughnessTexture(),
      occlusion: m.getOcclusionTexture(),
      emissive: m.getEmissiveTexture(),
    };
    for (const [slot, tex] of Object.entries(slots)) {
      if (!tex) continue;
      const s = tex.getSize() ?? imageSize(Buffer.from(tex.getImage()));
      textures.push({ slot, w: s?.[0] ?? s?.w, h: s?.[1] ?? s?.h, mime: tex.getMimeType(), bytes: tex.getImage()?.byteLength ?? 0 });
    }
    return {
      name: m.getName(),
      roughness: m.getRoughnessFactor(),
      metallic: m.getMetallicFactor(),
      hasRoughnessMap: !!slots.metallicRoughness,
    };
  });

  return {
    format: 'GLB',
    tris, verts,
    indexType: [...indexTypes].join(', '),
    box: describeBox(min, max),
    materials, textures,
    extensions: root.listExtensionsUsed().map((e) => e.extensionName),
    positions,
  };
}

// Fraction of sampled vertices of `positions` (flat xyz) that also appear in `set` (see vertexKey).
const vertexKey = (x, y, z) => `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
function vertexOverlap(set, positions, step = 50) {
  let hit = 0, n = 0;
  for (let i = 0; i < positions.length; i += 3 * step, n++) if (set.has(vertexKey(positions[i], positions[i + 1], positions[i + 2]))) hit++;
  return n ? hit / n : 0;
}

// Decode a PNG to RGBA rows (8-bit RGB/RGBA only; enough to compare texture copies pixel-for-pixel).
function decodePNG(buf) {
  let p = 8, w, h, ct, idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8) return null; ct = d[9]; }
    else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const bpp = { 2: 3, 6: 4, 0: 1, 4: 2 }[ct];
  if (!bpp) return null;
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride, prev = row - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[row + x - bpp] : 0, b = y ? out[prev + x] : 0, c = x >= bpp && y ? out[prev + x - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][f];
      out[row + x] = (raw[src + x] + pred) & 0xff;
    }
  }
  return { w, h, bpp, data: out };
}
function samePixels(a, b) {
  const A = decodePNG(a), B = decodePNG(b);
  if (!A || !B || A.w !== B.w || A.h !== B.h) return false;
  const channels = Math.min(A.bpp, B.bpp) < 3 ? 1 : 3; // grayscale vs RGB(A): compare the first channel
  for (let i = 0; i < A.w * A.h; i += 97) // sample every 97th pixel
    for (let k = 0; k < channels; k++) if (A.data[i * A.bpp + k] !== B.data[i * B.bpp + k]) return false;
  return true;
}

function inspectOBJ(file) {
  const text = fs.readFileSync(file, 'utf8');
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let verts = 0, tris = 0, uvs = 0, normals = 0;
  const mtllibs = [];
  const vertexSet = new Set();
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) {
      const p = line.trim().split(/\s+/).slice(1, 4).map(Number);
      for (let k = 0; k < 3; k++) { if (p[k] < min[k]) min[k] = p[k]; if (p[k] > max[k]) max[k] = p[k]; }
      vertexSet.add(vertexKey(...p));
      verts++;
    } else if (line.startsWith('vt ')) uvs++;
    else if (line.startsWith('vn ')) normals++;
    else if (line.startsWith('f ')) tris += line.trim().split(/\s+/).length - 3; // fan triangulation
    else if (line.startsWith('mtllib ')) mtllibs.push(line.slice(7).trim());
  }

  const materials = [], textures = [];
  for (const lib of mtllibs) {
    const mtlPath = path.join(path.dirname(file), lib);
    if (!fs.existsSync(mtlPath)) continue;
    let cur = null;
    for (const raw of fs.readFileSync(mtlPath, 'utf8').split('\n')) {
      const [key, ...rest] = raw.trim().split(/\s+/);
      const val = rest.join(' ');
      if (key === 'newmtl') { cur = { name: val, roughness: null, metallic: null, hasRoughnessMap: false }; materials.push(cur); }
      if (!cur) continue;
      if (key === 'roughness' || key === 'Pr') cur.roughness = +val;
      if (key === 'metallic' || key === 'Pm') cur.metallic = +val;
      const slot = { map_Kd: 'baseColor', map_tangentSpaceNormal: 'normal', norm: 'normal', map_Bump: 'normal', map_ao: 'occlusion', map_Pr: 'roughness', map_roughness: 'roughness' }[key];
      if (slot) {
        if (slot === 'roughness') cur.hasRoughnessMap = true;
        const tp = path.join(path.dirname(mtlPath), val);
        const buf = fs.existsSync(tp) ? fs.readFileSync(tp) : null;
        const s = buf && imageSize(buf);
        textures.push({ slot, w: s?.w, h: s?.h, mime: path.extname(val).slice(1), bytes: buf?.length ?? 0, file: val, missing: !buf });
      }
    }
  }
  return {
    format: 'OBJ',
    tris, verts,
    indexType: 'n/a (OBJ, unindexed until converted)',
    box: describeBox(min, max),
    materials, textures,
    extensions: [],
    notes: [`${uvs} UVs, ${normals} normals`],
    vertexSet,
  };
}

async function inspectUSDZ(file) {
  const buf = fs.readFileSync(file);
  const entries = readZip(buf);
  const zipOk = entries.every((e) => e.method === 0 && e.aligned);

  const textures = [];
  for (const e of entries) {
    if (!/\.(png|jpe?g)$/i.test(e.name)) continue;
    const s = imageSize(buf.subarray(e.dataOffset, e.dataOffset + Math.min(e.csize, 65536)));
    const slot = /norm/i.test(e.name) ? 'normal' : /_ao|ao\d|occl/i.test(e.name) ? 'occlusion' : /rough/i.test(e.name) ? 'roughness' : 'baseColor';
    textures.push({ slot, w: s?.w, h: s?.h, mime: path.extname(e.name).slice(1), bytes: e.csize, file: e.name });
  }

  // three's USDLoader reads USDC crate files. Stub the DOM bits it touches for textures — we only
  // want geometry and material factors here (texture sizes come from the zip entries above).
  const THREE = await import('three');
  const { USDLoader } = await import('three/examples/jsm/loaders/USDLoader.js');
  globalThis.Image ??= class { addEventListener() {} removeEventListener() {} set src(_) {} };
  const origCreate = URL.createObjectURL;
  URL.createObjectURL = () => 'blob:stub';
  let group;
  try {
    group = new USDLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  } finally {
    URL.createObjectURL = origCreate;
  }
  group.updateMatrixWorld(true);

  let tris = 0, verts = 0;
  const indexTypes = new Set();
  const materials = [];
  const positions = [];
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    for (const v of g.attributes.position.array) positions.push(v);
    verts += g.attributes.position.count;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    indexTypes.add(g.index ? g.index.array.constructor.name.replace('Array', '') : 'none (unindexed)');
    for (const m of [o.material].flat()) {
      materials.push({ name: m.name || '(unnamed)', roughness: +m.roughness.toFixed(3), metallic: m.metalness, hasRoughnessMap: !!m.roughnessMap });
    }
  });
  const box = new THREE.Box3().setFromObject(group);

  return {
    format: 'USDZ (usdc inside)',
    tris, verts,
    indexType: [...indexTypes].join(', '),
    box: describeBox(box.min.toArray(), box.max.toArray()),
    materials, textures,
    extensions: [],
    zip: { ok: zipOk, entries },
    positions,
  };
}

// ---------- discovery ----------

function discover() {
  const models = new Map(); // id -> { files: [] }
  const add = (id, f) => { if (!models.has(id)) models.set(id, { id, files: [] }); models.get(id).files.push(f); };
  const walk = (dir, id) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p, id ?? ent.name);
      else if (/\.(glb|gltf|obj|usdz|png|jpe?g|mtl)$/i.test(ent.name)) add(id ?? path.parse(ent.name).name, p);
    }
  };
  walk(INCOMING, null);
  return [...models.values()];
}

// ---------- scoring ----------

function score(m) {
  const red = [], amber = [], info = [];
  const s = m.source;

  if (!s) { red.push('No readable geometry source (GLB/OBJ/USDZ) found.'); return { light: 'red', red, amber, info }; }
  if (s.error) { red.push(`Geometry could not be read: ${s.error}`); return { light: 'red', red, amber, info }; }

  if (!m.csv) red.push('No matching row in data/dishes.csv — cannot go on the menu without confirmed data.');
  if (s.verts === 0) red.push('Mesh has zero vertices.');

  // Size sanity: a plated dish should be ~5–60 cm across.
  if (s.box.horizontalMax < 3 || s.box.horizontalMax > 100)
    red.push(`Implausible size (${s.box.horizontalMax} cm across) — units or scan are wrong; needs a manual look before scaling.`);

  if (s.format !== 'GLB') amber.push(`No GLB — pipeline must convert from ${s.format}.`);
  if (s.tris > TRI_LIMIT) amber.push(`${Math.round(s.tris).toLocaleString()} triangles > ${TRI_LIMIT.toLocaleString()} — simplify.`);
  if (/Uint32/.test(s.indexType) && s.verts <= 65535) amber.push('uint32 indices on a mesh that fits uint16.');
  if (!s.box.pivotOk)
    amber.push(`Pivot not bottom-centre (min Y ${s.box.pivot.minY} cm, centre X ${s.box.pivot.cx} / Z ${s.box.pivot.cz} cm).`);

  for (const mat of s.materials) {
    if (mat.roughness != null && mat.roughness >= CLAY_ROUGHNESS && !mat.hasRoughnessMap)
      amber.push(`**Flat / clay risk:** material "${mat.name}" roughness ${mat.roughness} with no roughness map.`);
  }
  for (const t of s.textures) {
    if (t.missing) red.push(`Texture referenced but missing: ${t.file}`);
    if (t.slot === 'baseColor' && t.w > ALBEDO_MAX) amber.push(`Albedo ${t.w}×${t.h} → downsample to ${ALBEDO_MAX}.`);
    if (t.slot === 'baseColor' && t.w && t.w < 1024) amber.push(`Albedo only ${t.w}×${t.h} — low-res colour is the main quality limit.`);
    if (t.slot === 'normal' && t.w > NORMAL_MAX) amber.push(`Normal ${t.w}×${t.h} → downsample to ${NORMAL_MAX}.`);
    if (t.slot === 'occlusion') info.push('AO map present → bake into albedo in Phase 2.');
    if (t.mime === 'png' && t.slot === 'baseColor') amber.push('Albedo is PNG → re-encode JPEG.');
  }
  if (!s.extensions?.includes('KHR_draco_mesh_compression')) amber.push('No Draco compression.');

  if (m.usdz) {
    if (!m.usdz.zip.ok) amber.push('USDZ fails stored/64-byte-aligned check → rebuild or omit ios-src.');
    else info.push('USDZ zip structure valid (all entries stored, 64-byte aligned).');
    if (m.usdzBytes > USDZ_BUDGET) amber.push(`USDZ ${mb(m.usdzBytes)} > ${mb(USDZ_BUDGET)} budget — rebuild from processed GLB.`);
  }
  if (m.glbBytes > GLB_BUDGET) amber.push(`GLB ${mb(m.glbBytes)} > ${mb(GLB_BUDGET)} budget.`);

  // Plate-length cross-check
  if (m.csv) {
    const pl = m.csv.plate_length_cm;
    if (unconfirmed(pl)) amber.push('`plate_length_cm` is TO_CONFIRM — scale cannot be calibrated or cross-checked.');
    else {
      const diff = Math.abs(s.box.horizontalMax - +pl) / +pl;
      if (diff > PLATE_TOLERANCE)
        amber.push(`Bounding box ${s.box.horizontalMax} cm vs plate_length_cm ${pl} (${(diff * 100).toFixed(0)}% off, > 15%).`);
    }
  }
  if (!m.photo) info.push(`No real photo (\`${m.id}.jpg\`) — poster will have to be a render.`);

  const light = red.length ? 'red' : amber.length ? 'amber' : 'green';
  return { light, red, amber, info };
}

function dataGate(row) {
  if (!row) return ['no CSV row'];
  const missing = ['name', 'price_pkr', 'description', 'plate_length_cm', 'ingredients', 'allergens', 'halal']
    .filter((k) => unconfirmed(row[k]) || /placeholder/i.test(row[k]));
  return missing;
}

// ---------- main ----------

const csvRows = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
const csvById = new Map(csvRows.map((r) => [r.id, r]));
// data/model-sources.json: dish id -> incoming-models folder, when they differ.
const sources = fs.existsSync(SOURCES_PATH) ? JSON.parse(fs.readFileSync(SOURCES_PATH, 'utf8')) : {};
const folderToDish = {};
for (const [dish, v] of Object.entries(sources)) if (!dish.startsWith('_')) folderToDish[v.source] = dish;
const found = discover();
const results = [];

for (const { id, files } of found) {
  const byExt = (re) => files.filter((f) => re.test(f));
  const glb = byExt(/\.glb$/i)[0];
  const obj = byExt(/\.obj$/i)[0];
  const usdz = byExt(/\.usdz$/i)[0];
  const photo = files.find((f) => /\.jpe?g$/i.test(f) && path.parse(f).name === id);
  const dishId = folderToDish[id] ?? id;
  const m = { id, dishId, files, csv: csvById.get(dishId), photo };
  // This folder's dish now takes its model from another folder (model-sources.json).
  if (sources[id] && sources[id].source !== id) m.superseded = sources[id].source;

  try {
    if (glb) { m.source = await inspectGLB(glb); m.glbBytes = fs.statSync(glb).size; }
    else if (obj) m.source = m.obj = inspectOBJ(obj);
    if (usdz) {
      m.usdz = await inspectUSDZ(usdz);
      m.usdzBytes = fs.statSync(usdz).size;
      if (!m.source) m.source = m.usdz;
    }
    // A folder with both OBJ and USDZ should hold one scan in two formats. If the geometry doesn't
    // match, the OBJ can't be trusted (its MTL points at this folder's textures) — use the USDZ.
    if (m.obj && m.usdz) {
      m.objOverlap = vertexOverlap(m.obj.vertexSet, m.usdz.positions);
      if (m.objOverlap < 0.5) m.source = m.usdz;
    }
  } catch (err) {
    m.source = { error: err.message };
  }

  // Loose textures (outside USDZ): resolution + whether they duplicate the USDZ contents.
  m.looseTextures = byExt(/\.(png|jpe?g)$/i).filter((f) => f !== photo).map((f) => {
    const buf = fs.readFileSync(f);
    const s = imageSize(buf);
    return { file: path.relative(INCOMING, f).replaceAll('\\', '/'), w: s?.w, h: s?.h, bytes: buf.length, buf };
  });
  if (usdz && m.looseTextures.length) {
    // Same pixels as a copy inside the USDZ? Byte equality is too strict — they're often re-encoded.
    const zbuf = fs.readFileSync(usdz);
    const embedded = readZip(zbuf)
      .filter((e) => /\.png$/i.test(e.name))
      .map((e) => zbuf.subarray(e.dataOffset, e.dataOffset + e.csize));
    for (const t of m.looseTextures) t.inUsdz = /\.png$/i.test(t.file) && embedded.some((e) => samePixels(t.buf, e));
  }
  for (const t of m.looseTextures) delete t.buf;

  m.totalBytes = files.reduce((a, f) => a + fs.statSync(f).size, 0);
  m.score = score(m);
  m.gate = dataGate(m.csv);
  results.push(m);
}

for (const m of results) {
  if (m.objOverlap == null || m.objOverlap >= 0.5) continue;
  const owner = results.find((o) => o !== m && o.usdz && vertexOverlap(m.obj.vertexSet, o.usdz.positions) >= 0.5);
  const pct = (m.objOverlap * 100).toFixed(0);
  m.score.amber.unshift(
    `**OBJ is the wrong scan:** only ${pct}% of its vertices match this folder's USDZ` +
      (owner ? `; it matches \`${owner.id}\`'s USDZ instead` : '') +
      ". Its MTL points at this dish's textures, so OBJ+MTL would render scrambled. Pipeline must use the USDZ mesh, not the OBJ."
  );
  if (m.score.light === 'green') m.score.light = 'amber';
}

// Same scan filed under two dish ids? Compare every pair's geometry.
const toSet = (pos) => { const s = new Set(); for (let i = 0; i < pos.length; i += 3) s.add(vertexKey(pos[i], pos[i + 1], pos[i + 2])); return s; };
const readable = results.filter((m) => m.source?.positions);
const duplicates = [];
for (let i = 0; i < readable.length; i++) {
  const set = toSet(readable[i].source.positions);
  for (let j = i + 1; j < readable.length; j++) {
    const ov = vertexOverlap(set, readable[j].source.positions);
    if (ov >= 0.5) {
      const [a, b] = [readable[i], readable[j]];
      if (a.superseded === b.id || b.superseded === a.id) {
        const old = a.superseded ? a : b;
        old.score.info.push(`Same geometry as \`${old.superseded}\` (${(ov * 100).toFixed(0)}%), which replaces it per data/model-sources.json.`);
        continue;
      }
      duplicates.push([readable[i].id, readable[j].id, ov]);
      for (const m of [readable[i], readable[j]])
        m.score.red.push(`Same geometry as \`${m === readable[i] ? readable[j].id : readable[i].id}\` (${(ov * 100).toFixed(0)}% vertex match) — one scan is filed under two dishes. Confirm which dish it really is.`);
    }
  }
}
for (const m of results) if (m.score.red.length) m.score.light = 'red';
for (const m of results) if (m.superseded) m.score.light = 'superseded';

// ---------- existing app inventory ----------

const APP_SKIP = new Set(['node_modules', 'incoming-models', '.git', '.claude', 'scripts', 'vendor', 'dist', 'reports', 'assets/dishes', 'audit-report.md', 'audit-report.json', 'package-lock.json']);
const appFiles = [];
const walkApp = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    const rel = path.relative(ROOT, p).replaceAll('\\', '/');
    if (APP_SKIP.has(rel)) continue;
    if (ent.isDirectory()) walkApp(p);
    else appFiles.push({ rel, bytes: fs.statSync(p).size });
  }
};
walkApp(ROOT);
const thirdParty = [], foodpanda = [];
for (const f of appFiles.filter((f) => /\.(html|js|css|toml)$/.test(f.rel))) {
  fs.readFileSync(path.join(ROOT, f.rel), 'utf8').split('\n').forEach((line, i) => {
    for (const url of line.match(/https?:\/\/[^\s"'`)]+/g) ?? []) {
      const host = new URL(url).host;
      if (/foodpanda/i.test(host)) foodpanda.push(`${f.rel}:${i + 1}`);
      else if (!/^(www\.w3\.org|gauchos\.com\.pk)$/.test(host)) thirdParty.push({ at: `${f.rel}:${i + 1}`, url });
    }
    if (/foodpanda/i.test(line) && !/https?:\/\/[^\s]*foodpanda/i.test(line)) foodpanda.push(`${f.rel}:${i + 1}`);
  });
}

const modelIds = new Set(results.filter((r) => !r.superseded).map((r) => r.dishId));
const csvNoModel = csvRows.filter((r) => r.is_3d?.toLowerCase() === 'yes' && !modelIds.has(r.id));
const modelNoCsv = results.filter((r) => !r.csv);

// ---------- report ----------

const dot = { green: '🟢 green', amber: '🟠 amber', red: '🔴 red', superseded: '⚪ superseded' };
const L = [];
L.push('# MENVA — Phase 0 audit report', '');
L.push(`Generated by \`scripts/audit.mjs\` on ${new Date().toISOString().slice(0, 10)}. Read-only: no source files were modified.`, '');
L.push('**Score** = asset readiness (green: ship as-is · amber: ship after the Phase 2 pipeline · red: do not put on the menu).');
L.push('**Data gate** = CSV fields still `TO_CONFIRM`/placeholder. A dish cannot go live while any are open, regardless of asset score.', '');

L.push('## Summary', '');
L.push('| Model | Source | Score | Tris | Verts | Index | Bounding box (X × Y × Z cm) | Pivot OK | Albedo | Normal | AO | Roughness | Raw size | Data gate |');
L.push('|---|---|---|---:|---:|---|---|---|---|---|---|---|---:|---|');
for (const m of results) {
  const s = m.source;
  if (!s || s.error) { L.push(`| ${m.id} | — | ${dot[m.score.light]} | | | | | | | | | | ${size(m.totalBytes)} | |`); continue; }
  const tex = (slot) => s.textures.filter((t) => t.slot === slot).map((t) => `${t.w}×${t.h} ${t.mime}`).join(', ') || '—';
  const r = s.materials.map((x) => `${x.roughness ?? '?'}${x.hasRoughnessMap ? ' +map' : ''}`).join(', ') || '—';
  L.push(`| ${m.id} | ${s.format} | ${dot[m.score.light]} | ${Math.round(s.tris).toLocaleString()} | ${s.verts.toLocaleString()} | ${s.indexType} | ${s.box.dims.x} × ${s.box.dims.y} × ${s.box.dims.z} | ${s.box.pivotOk ? 'yes' : 'no'} | ${tex('baseColor')} | ${tex('normal')} | ${tex('occlusion')} | ${r} | ${size(m.totalBytes)} | ${m.gate.length ? `🔒 ${m.gate.length} open` : 'clear'} |`);
}
L.push('');

L.push('## CSV cross-check', '');
L.push(`- CSV rows: ${csvRows.length}. Models found in \`incoming-models/\`: ${results.length}.`);
L.push(`- Models with no CSV row: ${modelNoCsv.length ? modelNoCsv.map((m) => '`' + m.id + '`').join(', ') : 'none'}.`);
L.push(`- CSV rows with \`is_3d=yes\` but no model: ${csvNoModel.length ? csvNoModel.map((r) => '`' + r.id + '`').join(', ') : 'none'}.`);
const plChecked = results.filter((m) => m.csv && !unconfirmed(m.csv.plate_length_cm));
L.push(`- Bounding box vs \`plate_length_cm\` (±15%): ${plChecked.length ? `${plChecked.length} checked` : 'could not check any model — every `plate_length_cm` is TO_CONFIRM'}.`);
const spiceSuspect = csvRows.filter((r) => r.spice_level === '0' && unconfirmed(r.allergens) && unconfirmed(r.ingredients));
if (spiceSuspect.length)
  L.push(`- ⚠ \`spice_level\` is \`0\` on ${spiceSuspect.length} rows where every other food field is TO_CONFIRM (${spiceSuspect.map((r) => '`' + r.id + '`').join(', ')}). Likely a default, not a confirmed value — treat as unconfirmed until Abdullah says otherwise.`);
L.push('');

L.push(`- Duplicate scans across dishes: ${duplicates.length ? duplicates.map(([a, b, ov]) => `\`${a}\` = \`${b}\` (${(ov * 100).toFixed(0)}%)`).join(', ') : 'none'}.`, '');

L.push('## Existing app inventory', '');
const group = (re) => appFiles.filter((f) => re.test(f.rel));
const listFiles = (fs_) => fs_.map((f) => `\`${f.rel}\` (${size(f.bytes)})`).join(', ');
L.push(`- ${appFiles.length} files, ${size(appFiles.reduce((a, f) => a + f.bytes, 0))} total.`);
L.push(`- Code: ${listFiles(group(/\.(html|js|css)$/))}.`);
L.push(`- Models: ${listFiles(group(/^models\//)) || 'none'}.`);
L.push(`- Images: ${listFiles(group(/\.(jpe?g|png|webp|svg)$/)) || 'none'}.`);
L.push(`- Config/docs: ${listFiles(group(/\.(toml|md)$|^\.gitignore$/))}.`);
L.push(`- Third-party URLs referenced (must go — non-negotiable #2): ${thirdParty.length ? '' : 'none'}`);
for (const t of thirdParty) L.push(`  - \`${t.at}\` → ${t.url}`);
L.push(`- Foodpanda references (must go — Phase 3): ${foodpanda.length ? foodpanda.map((x) => '`' + x + '`').join(', ') : 'none'}.`);
const toml = fs.existsSync(path.join(ROOT, 'netlify.toml')) ? fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8') : '';
L.push(`- \`netlify.toml\` Content-Type for .glb: ${/gltf-binary/.test(toml) ? 'yes' : '**missing**'}; for .usdz: ${/usdz/.test(toml) ? 'yes' : '**missing**'}.`);
L.push('');

L.push('## Per model', '');
for (const m of results) {
  const s = m.source;
  L.push(`### ${m.id} — ${dot[m.score.light]}`, '');
  if (m.dishId !== m.id) L.push(`3D source for dish \`${m.dishId}\` (data/model-sources.json).`, '');
  if (m.superseded) L.push(`Superseded: dish \`${m.id}\` now uses the \`${m.superseded}\` scan (data/model-sources.json). Not processed by the pipeline.`, '');
  if (m.csv) L.push(`CSV: **${m.csv.name}** · ${m.csv.category} · price ${m.csv.price_pkr} · plate ${m.csv.plate_shape}, ${m.csv.plate_length_cm} × ${m.csv.plate_width_cm} cm`, '');
  if (s && !s.error) {
    L.push(`- Geometry source: ${s.format}. ${Math.round(s.tris).toLocaleString()} triangles, ${s.verts.toLocaleString()} vertices, index: ${s.indexType}.${s.notes ? ' ' + s.notes.join('; ') + '.' : ''}`);
    L.push(`- Bounding box: ${s.box.dims.x} × ${s.box.dims.y} × ${s.box.dims.z} cm (X × Y × Z); largest horizontal extent ${s.box.horizontalMax} cm.`);
    L.push(`- Pivot: min Y ${s.box.pivot.minY} cm, centre X ${s.box.pivot.cx} cm, centre Z ${s.box.pivot.cz} cm → ${s.box.pivotOk ? 'bottom-centre ✓' : 'needs normalising'}.`);
    L.push(`- Materials: ${s.materials.map((x) => `"${x.name}" roughness ${x.roughness ?? '?'}, metallic ${x.metallic ?? '?'}${x.hasRoughnessMap ? ', roughness map' : ', no roughness map'}`).join('; ') || 'none'}.`);
    L.push(`- Extensions: ${s.extensions?.length ? s.extensions.join(', ') : 'none'}.`);
  }
  if (m.usdz) {
    L.push(`- USDZ: ${size(m.usdzBytes)}, ${m.usdz.zip.entries.length} entries — ${m.usdz.zip.ok ? 'all stored + 64-byte aligned ✓' : 'FAILS stored/alignment'}.`);
    L.push('', '  | Entry | Method | Data offset | Aligned | Size | Resolution |', '  |---|---|---:|---|---:|---|');
    for (const e of m.usdz.zip.entries) {
      const t = m.usdz.textures.find((x) => x.file === e.name);
      L.push(`  | ${e.name} | ${e.method === 0 ? 'stored' : 'deflate (' + e.method + ')'} | ${e.dataOffset} | ${e.aligned ? '✓' : '✗'} | ${size(e.csize)} | ${t ? `${t.w}×${t.h}` : '—'} |`);
    }
    L.push('');
  }
  if (m.looseTextures.length) {
    L.push(`- Loose textures: ${m.looseTextures.map((t) => `\`${t.file}\` ${t.w}×${t.h} ${size(t.bytes)}${t.inUsdz === true ? ' (same pixels as USDZ copy, re-encoded)' : t.inUsdz === false ? ' (**differs** from USDZ copy)' : ''}`).join('; ')}.`);
  }
  if (m.obj) {
    const o = m.obj.box.dims;
    const ov = m.objOverlap != null ? `${(m.objOverlap * 100).toFixed(0)}%` : 'n/a';
    L.push(`- OBJ also present (${m.obj.verts.toLocaleString()} verts, ${o.x} × ${o.y} × ${o.z} cm); vertex overlap with USDZ: ${ov}${m.objOverlap < 0.5 ? ' → **mismatch, OBJ not used**' : ''}.`);
  }
  L.push(`- Real photo: ${m.photo ? path.basename(m.photo) : 'none'}.`);
  L.push(`- Data gate: ${m.gate.length ? `open fields → ${m.gate.map((g) => '`' + g + '`').join(', ')}` : 'clear'}.`);
  L.push('');
  if (m.score.red.length) L.push('**Red — blocks the menu:**', ...m.score.red.map((x) => `- ${x}`), '');
  if (m.score.amber.length) L.push('**Amber — fixed by the Phase 2 pipeline:**', ...m.score.amber.map((x) => `- ${x}`), '');
  if (m.score.info.length) L.push('**Notes:**', ...m.score.info.map((x) => `- ${x}`), '');
}

fs.writeFileSync(REPORT_PATH, L.join('\n') + '\n');
// Machine-readable scores for the pipeline (keyed by incoming-models folder).
const scores = results.map((m) => [m.id, { dish: m.superseded ? null : m.dishId, light: m.score.light, red: m.score.red, amber: m.score.amber }]);
fs.writeFileSync(REPORT_JSON, JSON.stringify(Object.fromEntries(scores), null, 2) + '\n');
console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}`);
for (const m of results) console.log(`  ${m.score.light.padEnd(5)}  ${m.id}`);
