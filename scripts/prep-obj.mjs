// Prep for Apple Object Capture scans (OBJ + baked_mesh_*_tex0/norm0/ao0.png): OBJ → indexed GLB
// with the full-resolution colour, normal and ambient-occlusion maps, ready for incoming-models/<dish>/.
// The pipeline then bakes the AO into the colour, Draco-compresses and renders as usual.
//
// Optional texture grading for food (--grade "sat=1.12,bright=1.03,contrast=1.08,sharpen=0.8,warm=4"):
// small, global corrections only — it never paints or invents detail.
//
// Scan repair (--patch ring.json): closes a see-through tear (e.g. a window torn in a foil wrap). The
// ring is the tear's edge in 3D (metres), mapped with scripts/map-tear.mjs (see the Matilda notes in
// data/model-sources.json). A double-sided fan is fitted to the ring's best plane; each new vertex takes
// one UV: the most foil-like (neutral, mid-grey) texel on the wall just below the tear, so the patch
// reads as the same material instead of smearing neighbouring colours across it.
//
// Shadow lift (in --grade: shadows=0.75): gamma on the darkest 40% only, so crushed-black chocolate
// shows its crumb again without washing out whites. warmShadows=6 tints those shadows toward cocoa.
//
// Usage: node scripts/prep-obj.mjs <dir-with-3DModel.obj> <out.glb> [--grade ...] [--patch ring.json]
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, dedup, prune } from '@gltf-transform/functions';
import sharp from 'sharp';

const [dir, output, ...rest] = process.argv.slice(2);
const gradeArg = rest[rest.indexOf('--grade') + 1];
const grade = rest.includes('--grade')
  ? Object.fromEntries(gradeArg.split(',').map((kv) => { const [k, v] = kv.split('='); return [k, +v]; }))
  : null;

const objFile = fs.readdirSync(dir).find((f) => /\.obj$/i.test(f));
const texDir = path.join(dir, path.basename(objFile, '.obj'));
const find = (tag) => {
  const f = fs.existsSync(texDir) && fs.readdirSync(texDir).find((n) => n.includes(tag));
  return f ? path.join(texDir, f) : null;
};

const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
const group = new OBJLoader().parse(fs.readFileSync(path.join(dir, objFile), 'utf8'));

if (rest.includes('--patch')) {
  const { ring } = JSON.parse(fs.readFileSync(rest[rest.indexOf('--patch') + 1], 'utf8'));
  const geo = group.children[0].geometry;
  const P = geo.attributes.position.array, UVs = geo.attributes.uv.array;
  const c = ring.reduce((m, p) => m.map((v, i) => v + p[i] / ring.length), [0, 0, 0]);
  // best-fit plane (smallest-variance axis via power iteration on the inverse-ish: use two in-plane axes)
  const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of ring) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += (p[i] - c[i]) * (p[j] - c[j]);
  const mul = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
  let e1 = [1, 0.3, 0.2]; for (let k = 0; k < 60; k++) e1 = norm(mul(cov, e1));
  const defl = cov.map((r, i) => r.map((x, j) => x - (mul(cov, e1)[i] * e1[j])));
  let e2 = norm([0.2, 1, 0.1].map((x, i) => x - e1[i] * (0.2 * e1[0] + e1[1] + 0.1 * e1[2]))); for (let k = 0; k < 60; k++) { e2 = mul(defl, e2); const d = e2[0] * e1[0] + e2[1] * e1[1] + e2[2] * e1[2]; e2 = norm(e2.map((x, i) => x - d * e1[i])); }
  const n = norm([e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]);
  // 48 angular bins around the centre → an ordered outline in the plane
  const bins = Array.from({ length: 48 }, () => []);
  for (const p of ring) { const d = p.map((v, i) => v - c[i]); const a = Math.atan2(d[0] * e2[0] + d[1] * e2[1] + d[2] * e2[2], d[0] * e1[0] + d[1] * e1[1] + d[2] * e1[2]); bins[Math.floor(((a + Math.PI) / (2 * Math.PI)) * 48) % 48].push(p); }
  const outline = bins.filter((b) => b.length).map((b) => { const m = b.reduce((s, p) => s.map((v, i) => v + p[i] / b.length), [0, 0, 0]); const d = m.map((v, i) => v - c[i]), off = d[0] * n[0] + d[1] * n[1] + d[2] * n[2]; return m.map((v, i) => c[i] + (v - off * n[i] - c[i]) * 1.2); }); // 20% larger so it overlaps the tear's edges
  const tex = await sharp(find('tex0')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const texel = (u, v) => { const x = Math.round(u * (tex.info.width - 1)), y = Math.round((1 - v) * (tex.info.height - 1)); const o = (y * tex.info.width + x) * 3; return [tex.data[o], tex.data[o + 1], tex.data[o + 2]]; };
  const below = [c[0], c[1] - 0.012, c[2]];
  let patchUV = null, bestScore = Infinity;
  for (let i = 0, k = 0; i < P.length; i += 3, k += 2) {
    if (Math.hypot(P[i] - below[0], P[i + 1] - below[1], P[i + 2] - below[2]) > 0.008) continue;
    const [r, g, b] = texel(UVs[k], UVs[k + 1]), lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const score = (Math.max(r, g, b) - Math.min(r, g, b)) + Math.abs(lum - 150) * 0.5; // neutral, mid-grey = foil
    if (score < bestScore) { bestScore = score; patchUV = [UVs[k], UVs[k + 1]]; }
  }
  const nearestUV = () => patchUV;
  const pos = [], nor = [], uv = [];
  const push = (p, nn) => { pos.push(...p); nor.push(...nn); uv.push(...nearestUV(p)); };
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    push(c, n); push(a, n); push(b, n);                               // front
    const m = n.map((x) => -x); push(c, m); push(b, m); push(a, m);  // back
  }
  const cat = (name, add, size) => { const old = geo.attributes[name].array, arr = new Float32Array(old.length + add.length); arr.set(old); arr.set(add, old.length); geo.setAttribute(name, new (geo.attributes[name].constructor)(arr, size)); };
  cat('position', pos, 3); cat('normal', nor, 3); cat('uv', uv, 2);
  console.log(`patched a tear: ${outline.length}-point outline, ${outline.length * 2} triangles`);
}

const doc = new Document();
const buffer = doc.createBuffer();
const material = doc.createMaterial('food').setRoughnessFactor(0.9).setMetallicFactor(0);
const scene = doc.createScene('scene');
let tris = 0;
group.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry;
  const uv = g.attributes.uv.array.slice();
  for (let i = 1; i < uv.length; i += 2) uv[i] = 1 - uv[i]; // OBJ texture space has V up; glTF has V down
  const acc = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', new Float32Array(g.attributes.position.array)))
    .setAttribute('NORMAL', acc('VEC3', new Float32Array(g.attributes.normal.array)))
    .setAttribute('TEXCOORD_0', acc('VEC2', new Float32Array(uv)))
    .setMaterial(material);
  tris += g.attributes.position.count / 3;
  scene.addChild(doc.createNode('mesh').setMesh(doc.createMesh('mesh').addPrimitive(prim)));
});
await doc.transform(dedup(), weld(), prune({ keepAttributes: true }));

async function colour(file) {
  let img = sharp(file).removeAlpha();
  if (grade) {
    const { sat = 1, bright = 1, contrast = 1, sharpen = 0, warm = 0, shadows = 1, warmShadows = 0 } = grade;
    if (shadows !== 1 || warmShadows) {
      const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
      for (let o = 0; o < data.length; o += info.channels) {
        const L = (0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]) / 255;
        if (L >= 0.4 || L <= 0) continue;
        const k = (0.4 * Math.pow(L / 0.4, shadows)) / L, t = 1 - L / 0.4;
        data[o] = Math.min(255, data[o] * k + warmShadows * t);
        data[o + 1] = Math.min(255, data[o + 1] * k + warmShadows * 0.35 * t);
        data[o + 2] = Math.max(0, Math.min(255, data[o + 2] * k - warmShadows * 0.4 * t));
      }
      img = sharp(data, { raw: info });
    }
    img = img.modulate({ brightness: bright, saturation: sat });
    if (contrast !== 1) img = img.linear(contrast, -(128 * contrast) + 128);
    if (warm) img = img.recomb([[1 + warm / 100, 0, 0], [0, 1, 0], [0, 0, 1 - warm / 100]]);
    if (sharpen) img = img.sharpen({ sigma: sharpen });
  }
  return img.jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
}
const jpg = (file) => sharp(file).removeAlpha().jpeg({ quality: 92, mozjpeg: true }).toBuffer();
const tex = async (name, buf) => doc.createTexture(name).setMimeType('image/jpeg').setImage(buf);

material.setBaseColorTexture(await tex('albedo', await colour(find('tex0'))));
if (find('norm0')) material.setNormalTexture(await tex('normal', await jpg(find('norm0'))));
if (find('ao0')) material.setOcclusionTexture(await tex('ao', await jpg(find('ao0'))));

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.writeFileSync(output, await io.writeBinary(doc));
const verts = doc.getRoot().listMeshes()[0].listPrimitives()[0].getAttribute('POSITION').getCount();
console.log(`wrote ${output}: ${Math.round(tris)} triangles, ${verts} vertices, ${(fs.statSync(output).size / 1e6).toFixed(2)} MB${grade ? ` (graded ${gradeArg})` : ''}`);
