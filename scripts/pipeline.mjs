// Phase 2 asset pipeline: incoming-models/ → assets/dishes/<id>/
//   model.glb  model.usdz  poster.webp  poster-blur.webp  spin.webp  meta.json
//
// Idempotent: a dish is skipped when its sources, CSV scale and this tooling are unchanged
// (use --force to rebuild). Never writes to incoming-models/.
//
// Usage: npm run pipeline [-- --force] [-- --only=<dish-id>]

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, dedup, prune, draco, flatten, getBounds, transformMesh, clearNodeTransform } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { createRenderer, fitWebp } from './render.mjs';
import { readZip, writeAlignedZip } from './lib/zip.mjs';
import { validateUsdz } from './usdz-validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INCOMING = path.join(ROOT, 'incoming-models');
const OUT = path.join(ROOT, 'assets', 'dishes');
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice(7);

// Budgets (CLAUDE.md Phase 2 §8) — hard fail if exceeded.
const BUDGET = { glb: 1.2 * 1024 * 1024, glbTarget: 800 * 1024, usdz: 1.8 * 1024 * 1024, poster: 80 * 1024, spin: 300 * 1024 };
const TRI_LIMIT = 40_000;
const FLAT_ROUGHNESS = 0.85;
const FIXED_ROUGHNESS = 0.6;
const AO_STRENGTH = 0.6; // how strongly AO darkens the albedo when baked in (1 = plain multiply)
const POSTER_ORBIT = '-25deg 55deg 85%'; // three-quarter, looking down — must match the dish sheet camera in js/app.js
const SPIN_PHI = '60deg';

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const size = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : kb(n));
const shortHash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);

// ---------- inputs ----------

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
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const csv = parseCSV(fs.readFileSync(path.join(ROOT, 'data', 'dishes.csv'), 'utf8'));
const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'model-sources.json'), 'utf8'));

// Fresh audit so each dish's traffic light is current.
execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'audit.mjs')], { stdio: 'ignore' });
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'audit-report.json'), 'utf8'));

const listFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)]));

// ---------- loading sources into a glTF document ----------

async function makeIO() {
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
}

// USDZ → glTF document. Geometry via three's USD loader; textures straight from the zip.
async function loadUSDZ(file) {
  const buf = fs.readFileSync(file);
  const THREE = await import('three');
  const { USDLoader } = await import('three/examples/jsm/loaders/USDLoader.js');
  globalThis.Image ??= class { addEventListener() {} removeEventListener() {} set src(_) {} }; // textures are read from the zip instead
  const createObjectURL = URL.createObjectURL;
  URL.createObjectURL = () => 'blob:unused';
  let group;
  try { group = new USDLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)); }
  finally { URL.createObjectURL = createObjectURL; }
  group.updateMatrixWorld(true);

  const doc = new Document();
  const buffer = doc.createBuffer();
  const material = doc.createMaterial('food').setRoughnessFactor(1).setMetallicFactor(0);
  const scene = doc.createScene('scene');
  let roughness = null;
  group.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    if (!g.attributes.normal) g.computeVertexNormals();
    const uv = g.attributes.uv.array.slice();
    for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i]; // USD texture space has V up; glTF has V down
    const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', acc('VEC3', new Float32Array(g.attributes.position.array)))
      .setAttribute('NORMAL', acc('VEC3', new Float32Array(g.attributes.normal.array)))
      .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv)))
      .setMaterial(material);
    if (g.index) prim.setIndices(acc('SCALAR', new Uint32Array(g.index.array)));
    scene.addChild(doc.createNode(o.name || 'mesh').setMesh(doc.createMesh(o.name || 'mesh').addPrimitive(prim)));
    roughness ??= [o.material].flat()[0]?.roughness ?? null;
  });
  if (roughness != null) material.setRoughnessFactor(roughness);

  const maps = {};
  for (const e of readZip(buf)) {
    if (!/\.(png|jpe?g)$/i.test(e.name)) continue;
    const slot = /norm/i.test(e.name) ? 'normal' : /_ao|ao\d|occl/i.test(e.name) ? 'ao' : /rough/i.test(e.name) ? 'roughness' : 'albedo';
    maps[slot] ??= Buffer.from(e.data);
  }
  return { doc, maps, hasRoughnessMap: !!maps.roughness };
}

// GLB → glTF document. Textures are pulled out so they can be reprocessed.
async function loadGLB(io, file) {
  const doc = await io.read(file);
  const [material] = doc.getRoot().listMaterials();
  const img = (tex) => (tex ? Buffer.from(tex.getImage()) : undefined);
  const maps = {
    albedo: img(material?.getBaseColorTexture()),
    normal: img(material?.getNormalTexture()),
    ao: img(material?.getOcclusionTexture()),
  };
  const hasRoughnessMap = !!material?.getMetallicRoughnessTexture();
  for (const m of doc.getRoot().listMaterials().slice(1)) m.dispose(); // one food material per scan
  for (const p of doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())) p.setMaterial(material);
  material?.setBaseColorTexture(null).setNormalTexture(null).setOcclusionTexture(null);
  return { doc, maps, hasRoughnessMap };
}

// ---------- geometry ----------

function dims(doc) {
  const { min, max } = getBounds(doc.getRoot().listScenes()[0]);
  return { min, max, cm: { x: (max[0] - min[0]) * 100, y: (max[1] - min[1]) * 100, z: (max[2] - min[2]) * 100 } };
}

async function normalise(doc, plateLengthCm, warnings) {
  await doc.transform(flatten());
  for (const node of doc.getRoot().listNodes()) if (node.getMesh()) clearNodeTransform(node);

  const { min, max, cm } = dims(doc);
  const horizontal = Math.max(cm.x, cm.z);
  let scale = 1;
  if (plateLengthCm) {
    scale = plateLengthCm / horizontal;
    if (scale < 0.85 || scale > 1.15) warnings.push(`Scale factor ${scale.toFixed(3)} is outside 0.85–1.15 — check plate_length_cm (${plateLengthCm} cm) against the scan (${horizontal.toFixed(1)} cm).`);
  } else {
    warnings.push(`plate_length_cm not confirmed — kept the scan's own scale (${horizontal.toFixed(1)} cm across). Photogrammetry scans are metric, but confirm the plate size.`);
  }
  // Pivot to bottom-centre, then scale: p' = s·(p + t)
  const t = [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2];
  const m = [scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, scale, 0, t[0] * scale, t[1] * scale, t[2] * scale, 1];
  for (const mesh of doc.getRoot().listMeshes()) transformMesh(mesh, m);
  return scale;
}

async function clean(doc, warnings) {
  // keepAttributes: textures are attached after cleaning, so UVs look "unused" to prune at this point.
  await doc.transform(dedup(), weld(), prune({ keepAttributes: true }));
  let tris = 0, verts = 0;
  for (const prim of doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())) {
    const idx = prim.getIndices();
    const count = prim.getAttribute('POSITION').getCount();
    verts += count;
    tris += (idx ? idx.getCount() : count) / 3;
    if (idx && count <= 65535 && !(idx.getArray() instanceof Uint16Array)) idx.setArray(new Uint16Array(idx.getArray()));
  }
  if (tris > TRI_LIMIT) {
    // Not needed for the current scans (all ~25k). Add meshoptimizer + simplify() if a denser scan arrives.
    throw new Error(`${Math.round(tris)} triangles > ${TRI_LIMIT}; simplification is not set up yet`);
  }
  return { tris: Math.round(tris), verts };
}

// ---------- textures ----------

async function bakeAlbedo(albedo, ao, maxSize) {
  const meta = await sharp(albedo).metadata();
  const side = Math.min(maxSize, meta.width);
  const { data, info } = await sharp(albedo).removeAlpha().resize(side, side, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  if (ao) {
    const aoRaw = await sharp(ao).resize(info.width, info.height, { fit: 'fill' }).extractChannel(0).raw().toBuffer();
    for (let i = 0, p = 0; p < aoRaw.length; p++) {
      const k = 1 - AO_STRENGTH + AO_STRENGTH * (aoRaw[p] / 255);
      for (let c = 0; c < info.channels; c++, i++) data[i] = Math.round(data[i] * k);
    }
  }
  return { raw: data, info, native: meta.width };
}

const jpeg = (input, quality, raw) =>
  sharp(input, raw ? { raw } : undefined).jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();

// Texture settings tried in order until the GLB fits the budget (spec: JPEG q82–85, albedo ≤2048, normal ≤1024).
const VARIANTS = [
  { albedo: 2048, aq: 84, normal: 1024, nq: 85 },
  { albedo: 2048, aq: 82, normal: 1024, nq: 82 },
  { albedo: 2048, aq: 82, normal: 512, nq: 82 },
  { albedo: 2048, aq: 82, normal: 0 },
  { albedo: 1536, aq: 84, normal: 0 },
  { albedo: 1024, aq: 84, normal: 0 },
];

// ---------- USDZ ----------

// USDZ attempts, largest first, until one fits the budget. Quick Look is fine without a normal map.
const USDZ_VARIANTS = [
  { maxTextureSize: 2048, normalMap: true, quality: 84 },
  { maxTextureSize: 1024, normalMap: true, quality: 84 },
  { maxTextureSize: 1024, normalMap: false, quality: 84 },
  { maxTextureSize: 1024, normalMap: false, quality: 76 },
];

// Significant digits per geometry array: 4 digits on positions is ~0.1 mm at dish scale.
const USDA_PRECISION = { points: 4, normals: 3, 'primvars:st': 4 };

// three's exporter writes PNG textures and 7-digit ASCII geometry; re-encode textures as JPEG,
// compact the geometry arrays, and re-pack stored + 64-byte aligned.
async function repackUsdz(raw, quality) {
  const entries = readZip(raw);
  const files = [];
  for (const e of entries) {
    if (/\.png$/i.test(e.name)) {
      const img = sharp(e.data).removeAlpha().jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' });
      files.push([e.name.replace(/\.png$/i, '.jpg'), await img.toBuffer()]);
    } else if (/\.usda$/i.test(e.name)) {
      const text = e.data.toString('utf8').replace(/(textures\/[^@"]+)\.png/g, '$1.jpg').split('\n').map((line) => {
        const m = line.match(/\b(points|normals|primvars:st|faceVertexIndices|faceVertexCounts) = \[/);
        if (!m) return line;
        const digits = USDA_PRECISION[m[1]];
        if (digits) line = line.replace(/-?\d+\.\d+(?:e[-+]?\d+)?/g, (n) => String(+(+n).toPrecision(digits)));
        return line.replace(/, /g, ',');
      }).join('\n');
      files.push([e.name, Buffer.from(text, 'utf8')]);
    } else files.push([e.name, e.data]);
  }
  files.sort((a, b) => (a[0] === 'model.usda' ? -1 : b[0] === 'model.usda' ? 1 : 0)); // root layer first
  return writeAlignedZip(files);
}

// ---------- per dish ----------

function sourceFiles(dishId) {
  const folder = sources[dishId]?.source ?? dishId;
  const dir = path.join(INCOMING, folder);
  if (!fs.existsSync(dir)) return null;
  const files = listFiles(dir);
  const photo = [path.join(INCOMING, `${dishId}.jpg`), path.join(dir, `${dishId}.jpg`)].find((p) => fs.existsSync(p));
  return {
    folder, files, photo,
    glb: files.find((f) => /\.glb$/i.test(f)),
    usdz: files.find((f) => /\.usdz$/i.test(f)),
  };
}

const TOOLING_HASH = shortHash(Buffer.concat(['pipeline.mjs', 'render.mjs', 'render/render.html', 'lib/zip.mjs'].map((f) => fs.readFileSync(path.join(ROOT, 'scripts', f)))));

async function processDish(row, io, getRenderer) {
  const id = row.id;
  const src = sourceFiles(id);
  if (!src) return { id, status: 'failed', error: `no folder in incoming-models/ (looked for ${sources[id]?.source ?? id})` };
  const light = audit[src.folder]?.light;
  if (light === 'red') return { id, status: 'skipped', error: `audit is red: ${audit[src.folder].red.join(' ')}` };

  const plate = Number(row.plate_length_cm) || null;
  const inputs = [src.glb ?? src.usdz, src.photo].filter(Boolean);
  const sourceHash = shortHash(Buffer.concat([...inputs.map((f) => fs.readFileSync(f)), Buffer.from(`${plate}|${TOOLING_HASH}`)]));
  const dir = path.join(OUT, id);
  const metaPath = path.join(dir, 'meta.json');
  if (!FORCE && fs.existsSync(metaPath)) {
    const prev = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (prev.sourceHash === sourceHash) return { id, status: 'unchanged', meta: prev };
  }

  const warnings = [];
  const t0 = Date.now();
  const step = (name) => process.stdout.write(`${name} ${((Date.now() - t0) / 1000).toFixed(0)}s · `);
  const { doc, maps, hasRoughnessMap } = src.glb ? await loadGLB(io, src.glb) : await loadUSDZ(src.usdz);
  if (!maps.albedo) throw new Error('no base colour texture found');
  const scale = await normalise(doc, plate, warnings);
  const { tris, verts } = await clean(doc, warnings);

  // Material sanity (spec §4): flat high roughness with no map reads as clay.
  const material = doc.getRoot().listMaterials()[0];
  const origRoughness = material.getRoughnessFactor();
  if (origRoughness >= FLAT_ROUGHNESS && !hasRoughnessMap) {
    material.setRoughnessFactor(FIXED_ROUGHNESS);
    warnings.push(`Roughness was flat ${+origRoughness.toFixed(2)} with no map — set to ${FIXED_ROUGHNESS}. Needs a manual look for clay-like appearance.`);
  }
  material.setMetallicFactor(0);

  const baked = await bakeAlbedo(maps.albedo, maps.ao, 2048);
  if (baked.native < 1024) warnings.push(`Albedo is only ${baked.native}px — low-res colour is the main quality limit; a re-scan would help most.`);
  if (maps.ao) warnings.push(`AO baked into albedo (strength ${AO_STRENGTH}); AO slot dropped.`);

  const albedoTex = doc.createTexture('albedo').setMimeType('image/jpeg');
  material.setBaseColorTexture(albedoTex).setOcclusionTexture(null);
  let normalTex = null;
  await doc.transform(draco({ method: 'edgebreaker', quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));

  // Encode, stepping down texture settings until the GLB fits.
  let glb, used;
  for (const v of VARIANTS) {
    const side = Math.min(v.albedo, baked.info.width);
    const albedoRaw = side === baked.info.width
      ? await jpeg(baked.raw, v.aq, baked.info)
      : await sharp(baked.raw, { raw: baked.info }).resize(side, side).jpeg({ quality: v.aq, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
    albedoTex.setImage(albedoRaw);
    if (v.normal && maps.normal) {
      const nSide = Math.min(v.normal, (await sharp(maps.normal).metadata()).width);
      normalTex ??= doc.createTexture('normal').setMimeType('image/jpeg');
      normalTex.setImage(await sharp(maps.normal).removeAlpha().resize(nSide, nSide, { fit: 'inside' }).jpeg({ quality: v.nq, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer());
      material.setNormalTexture(normalTex);
    } else {
      material.setNormalTexture(null);
      normalTex?.dispose();
      normalTex = null;
    }
    glb = Buffer.from(await io.writeBinary(doc));
    used = { ...v, albedo: side, normal: normalTex ? Math.min(v.normal, (await sharp(maps.normal).metadata()).width) : 0 };
    if (glb.length <= BUDGET.glb) break;
  }
  if (used !== VARIANTS[0] && (used.albedo < 2048 && baked.native >= 2048 || !used.normal && maps.normal))
    warnings.push(`To fit ${size(BUDGET.glb)}: albedo ${used.albedo}px q${used.aq}, normal ${used.normal ? `${used.normal}px q${used.nq}` : 'dropped'}.`);
  if (glb.length > BUDGET.glbTarget && glb.length <= BUDGET.glb) warnings.push(`GLB ${size(glb.length)} is over the ${size(BUDGET.glbTarget)} target (within the hard budget).`);

  // Write GLB first: the renderer loads it from disk.
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'model.glb'), glb);
  step('glb');
  const renderer = await getRenderer();

  // Poster: real photo when we have one, otherwise a render.
  let posterSrc;
  if (src.photo) posterSrc = await sharp(src.photo).resize(1200, 900, { fit: 'cover' }).png().toBuffer();
  else posterSrc = await renderer.poster(path.join(dir, 'model.glb'), POSTER_ORBIT);
  step('poster');
  const poster = await fitWebp(posterSrc, BUDGET.poster);
  const blur = await sharp(posterSrc).resize(32).webp({ quality: 50 }).toBuffer();
  const spin = await fitWebp(await renderer.spin(path.join(dir, 'model.glb'), SPIN_PHI), BUDGET.spin, [70, 60, 50, 45, 40, 35, 30, 25]);

  step('spin');
  // USDZ from the processed GLB, then validate. On failure fall back to model-viewer's on-the-fly export.
  let usdz = null, usdzInfo;
  try {
    for (const v of USDZ_VARIANTS) {
      usdz = await repackUsdz(await renderer.exportUsdz(path.join(dir, 'model.glb'), v), v.quality);
      usdzInfo = v;
      if (usdz.length <= BUDGET.usdz) break;
    }
    const check = validateUsdz(usdz);
    if (!check.ok) { warnings.push(`USDZ failed validation (${check.errors.join('; ')}) — ios-src omitted, model-viewer will build it on the fly.`); usdz = null; }
    else if (usdzInfo !== USDZ_VARIANTS[0])
      warnings.push(`USDZ (iPhone AR) uses ${usdzInfo.maxTextureSize}px textures q${usdzInfo.quality}${usdzInfo.normalMap ? '' : ', no normal map'} to fit ${size(BUDGET.usdz)}.`);
  } catch (err) {
    warnings.push(`USDZ export failed (${err.message}) — ios-src omitted, model-viewer will build it on the fly.`);
    usdz = null;
  }

  step('usdz');
  const out = { 'model.glb': glb, 'poster.webp': poster.buffer, 'poster-blur.webp': blur, 'spin.webp': spin.buffer };
  if (usdz) out['model.usdz'] = usdz;
  for (const [name, buf] of Object.entries(out)) fs.writeFileSync(path.join(dir, name), buf);

  // Budgets — hard fail.
  const over = [];
  if (glb.length > BUDGET.glb) over.push(`GLB ${size(glb.length)} > ${size(BUDGET.glb)}`);
  if (usdz && usdz.length > BUDGET.usdz) over.push(`USDZ ${size(usdz.length)} > ${size(BUDGET.usdz)}`);
  if (poster.buffer.length > BUDGET.poster) over.push(`poster ${size(poster.buffer.length)} > ${size(BUDGET.poster)}`);
  if (spin.buffer.length > BUDGET.spin) over.push(`sprite ${size(spin.buffer.length)} > ${size(BUDGET.spin)}`);

  const final = dims(doc);
  const meta = {
    id,
    source: { folder: src.folder, model: path.relative(INCOMING, src.glb ?? src.usdz).replaceAll('\\', '/'), photo: src.photo ? path.relative(INCOMING, src.photo).replaceAll('\\', '/') : null },
    sourceHash,
    audit: light,
    dimensions_cm: { width: +final.cm.x.toFixed(1), height: +final.cm.y.toFixed(1), depth: +final.cm.z.toFixed(1) },
    scale: +scale.toFixed(4),
    triangles: tris,
    vertices: verts,
    textures: { albedo: `${used.albedo}px jpeg q${used.aq}${maps.ao ? ' (AO baked)' : ''}`, normal: used.normal ? `${used.normal}px jpeg q${used.nq}` : null },
    roughness: +material.getRoughnessFactor().toFixed(2),
    poster: src.photo ? 'photo' : 'render',
    posterQuality: poster.quality,
    spin: { frames: 36, frameWidth: 480, frameHeight: 360, columns: 6, rows: 6, quality: spin.quality },
    usdz: usdz ? 'model.usdz' : null,
    usdzTextures: usdz ? { size: usdzInfo.maxTextureSize, quality: usdzInfo.quality, normalMap: usdzInfo.normalMap } : null,
    files: Object.fromEntries(Object.entries(out).map(([name, buf]) => [name, { bytes: buf.length, hash: shortHash(buf) }])),
    before: { [path.basename(src.glb ?? src.usdz)]: fs.statSync(src.glb ?? src.usdz).size },
    warnings,
    budgetErrors: over,
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
  return { id, status: over.length ? 'over-budget' : 'built', meta };
}

// ---------- main ----------

const io = await makeIO();
let renderer = null;
const getRenderer = async () => (renderer ??= await createRenderer());
const dishes = csv.filter((r) => r.is_3d?.toLowerCase() === 'yes' && (!ONLY || r.id === ONLY));
const results = [];
for (const row of dishes) {
  process.stdout.write(`${row.id} … `);
  try {
    const r = await processDish(row, io, getRenderer);
    results.push(r);
    console.log(r.status + (r.error ? ` — ${r.error}` : ''));
  } catch (err) {
    results.push({ id: row.id, status: 'failed', error: err.stack || err.message });
    console.log(`failed — ${err.message}`);
  }
}
if (renderer) {
  if (renderer.logs.length) console.log('\nRender page messages:\n  ' + [...new Set(renderer.logs)].slice(0, 10).join('\n  '));
  await renderer.close();
}

// Before/after table
console.log('\n| Dish | Before | GLB | USDZ | Poster | Sprite | Tris | Size (cm W×H×D) | Status |');
console.log('|---|---:|---:|---:|---:|---:|---:|---|---|');
for (const r of results) {
  const m = r.meta;
  if (!m) { console.log(`| ${r.id} | | | | | | | | ${r.status} |`); continue; }
  const f = (n) => (m.files[n] ? size(m.files[n].bytes) : '—');
  const d = m.dimensions_cm;
  console.log(`| ${r.id} | ${size(Object.values(m.before)[0])} | ${f('model.glb')} | ${f('model.usdz')} | ${f('poster.webp')} | ${f('spin.webp')} | ${m.triangles.toLocaleString()} | ${d.width} × ${d.height} × ${d.depth} | ${r.status} |`);
}
for (const r of results) {
  const lines = [...(r.meta?.warnings ?? []), ...(r.meta?.budgetErrors ?? []).map((e) => `BUDGET: ${e}`), ...(r.error ? [r.error] : [])];
  if (lines.length) console.log(`\n${r.id}:\n  - ${lines.join('\n  - ')}`);
}

const bad = results.filter((r) => r.status === 'failed' || r.status === 'over-budget');
if (bad.length) {
  console.error(`\nPipeline failed for: ${bad.map((r) => r.id).join(', ')}`);
  process.exit(1);
}
