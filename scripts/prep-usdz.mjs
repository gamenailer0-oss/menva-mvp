// One-off prep for heavy generated/scanned USDZ files the pipeline can't take directly:
// USDZ (binary USDC) → welded, simplified GLB with the base colour + normal maps, ready for
// incoming-models/<dish>/. Usage: node scripts/prep-usdz.mjs <in.usdz> <out.glb> [maxTriangles]
import fs from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, prune, dedup, cloneDocument } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readZip } from './lib/zip.mjs';

const [input, output, maxTris = '40000'] = process.argv.slice(2);
const buf = fs.readFileSync(input);
const { USDLoader } = await import('three/examples/jsm/loaders/USDLoader.js');
globalThis.Image ??= class { addEventListener() {} removeEventListener() {} set src(_) {} };
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
let tris = 0;
group.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  if (!g.attributes.normal) g.computeVertexNormals();
  const uv = g.attributes.uv.array.slice();
  for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i];
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', new Float32Array(g.attributes.position.array)))
    .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv)))
    .setMaterial(material);
  if (g.index) prim.setIndices(acc('SCALAR', new Uint32Array(g.index.array)));
  tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
  scene.addChild(doc.createNode('mesh').setMesh(doc.createMesh('mesh').addPrimitive(prim)));
});
console.log(`loaded: ${Math.round(tris)} triangles`);

await MeshoptSimplifier.ready;
// Normals are dropped before welding (per-face normals keep every triangle separate, so nothing
// can collapse) and rebuilt smooth after simplifying.
await doc.transform(dedup(), weld());
let ratio = Math.min(1, +maxTris / tris);
for (let i = 0; i < 6; i++) {
  const trial = cloneDocument(doc);
  await trial.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: false }));
  const n = trial.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((s, p) => s + (p.getIndices()?.getCount() ?? 0) / 3, 0);
  console.log(`ratio ${ratio.toFixed(4)} → ${Math.round(n)} triangles`);
  if (n <= +maxTris) { await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01, lockBorder: false })); break; }
  ratio *= (+maxTris / n) * 0.97;
}
await doc.transform(prune({ keepAttributes: true }), weld());
// Smooth, area-weighted normals on the indexed mesh. (gltf-transform's normals() makes flat normals,
// which splits every triangle apart again and multiplies the USDZ size.)
for (const prim of doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())) {
  const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
  const n = new Float32Array(pos.length);
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i] * 3, idx[i + 1] * 3, idx[i + 2] * 3];
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { n[k] += fx; n[k + 1] += fy; n[k + 2] += fz; }
  }
  for (let i = 0; i < n.length; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(n).setBuffer(buffer));
}

// Textures: base colour at ≤2048 and the normal map at ≤1024. The metallic map is dropped
// (it is what made the generated model read as shiny plastic) and roughness stays flat at 1.
const maps = {};
for (const e of readZip(buf)) {
  if (!/\.(png|jpe?g)$/i.test(e.name)) continue;
  const slot = /norm/i.test(e.name) ? 'normal' : /metal/i.test(e.name) ? 'metallic' : /rough/i.test(e.name) ? 'roughness' : 'albedo';
  maps[slot] ??= Buffer.from(e.data);
}
const tex = async (img, side) => sharp(img).removeAlpha().resize(side, side, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
material.setBaseColorTexture(doc.createTexture('albedo').setMimeType('image/jpeg').setImage(await tex(maps.albedo, 2048)));
if (maps.normal) material.setNormalTexture(doc.createTexture('normal').setMimeType('image/jpeg').setImage(await tex(maps.normal, 1024)));

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.writeFileSync(output, await io.writeBinary(doc));
console.log(`wrote ${output}: ${(fs.statSync(output).size / 1e6).toFixed(2)} MB`);
