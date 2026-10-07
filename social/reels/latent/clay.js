// Clay toolkit for "Bhook's Got Latent": plasticine material, replacement mouths and a puppet builder.
// Everything is deterministic: the "boil" (stop-motion surface jitter) comes from BOIL.uSeed, set once per drawing.
import * as THREE from 'three';
import { rng } from '../films/common.js';

export const BOIL = { uSeed: { value: 0 } };

// ---------- fingerprint + thumb-smear HEIGHT map (made once, procedurally; sampled triplanar in the shader) ----------
function fingerprintHeight() {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), R = rng(77);
  g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
  const wrap = (fn) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };   // tileable
  for (let k = 0; k < 30; k++) {                        // whorls of thumb prints
    const cx = R() * N, cy = R() * N, rot = R() * 3.14, sq = 0.55 + R() * 0.4, rings = 6 + (R() * 8 | 0), v = R() > 0.5 ? 255 : 0;
    wrap(() => { g.lineWidth = 1.3; g.strokeStyle = `rgba(${v},${v},${v},0.16)`;
      for (let i = 1; i < rings; i++) { g.beginPath(); g.ellipse(cx, cy, i * 3.4, i * 3.4 * sq, rot, R() * 2, R() * 2 + 4.2); g.stroke(); } });
  }
  for (let k = 0; k < 70; k++) {                        // smears where a thumb pressed the clay flat
    const x = R() * N, y = R() * N, rr = 18 + R() * 46, v = R() > 0.5 ? 255 : 0;
    wrap(() => { const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${v},${v},${v},0.14)`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); });
  }
  for (let k = 0; k < 26; k++) {                        // modelling-tool drags
    const x = R() * N, y = R() * N, a = R() * 6.28, l = 30 + R() * 70;
    wrap(() => { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2 + R() * 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 8, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace;
  return t;
}
let FP = null;
const NOISE = `
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z) * 2.0 - 1.0; }
`;
const BUMP = `
uniform sampler2D bumpMap; uniform float bumpScale; uniform float uTex, uGroove, uDimple;
varying vec3 vObjPos; varying vec3 vObjN;
float triH() {
  vec3 w = pow(abs(normalize(vObjN)), vec3(4.0)); w /= (w.x + w.y + w.z + 1e-5);
  vec3 p = vObjPos * uTex;
  float h = texture2D(bumpMap, p.yz).x * w.x + texture2D(bumpMap, p.xz + 0.37).x * w.y + texture2D(bumpMap, p.xy + 0.71).x * w.z;
  if (uGroove > 0.0) h += 0.22 * sin(atan(vObjPos.z, vObjPos.x) * uGroove + vObjPos.y * 9.0 + vn(vObjPos * 6.0) * 2.0);   // sculpted hair strands
  if (uDimple > 0.0) { vec3 q = fract(vObjPos * uDimple) - 0.5; h -= 0.25 * smoothstep(0.12, 0.0, length(q)); }          // upholstery buttons
  return h;
}
vec2 dHdxy_fwd() { float H = bumpScale * triH(); return vec2(dFdx(H), dFdy(H)); }
vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
  vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) ); vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) ); vec3 vN = surf_norm;
  vec3 R1 = cross( vSigmaY, vN ); vec3 R2 = cross( vN, vSigmaX ); float fDet = dot( vSigmaX, R1 ) * faceDirection;
  vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 ); return normalize( abs( fDet ) * surf_norm - vGrad );
}
`;
// Plasticine: triplanar fingerprints and tool marks that stick to the object, colour mottling, a soft sheen,
// a lumpy silhouette (static) and the boil (changes every drawing, like re-handled clay in stop-motion).
export function clay(color, { rough = 0.6, lump = 0.012, boil = 0.0035, freq = 9, emissive = 0, ei = 0, fp = 1.0, tex = 2.4, groove = 0, dimple = 0, mottle = 0.05, map = null, sheen = 0.35, clearcoat = 0 } = {}) {
  FP = FP || fingerprintHeight();
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, bumpMap: FP, bumpScale: fp * 0.9, map,
    sheen, sheenRoughness: 0.75, sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.45), clearcoat, clearcoatRoughness: 0.25,
    emissive: emissive || 0x000000, emissiveIntensity: ei });
  const U = { uLump: { value: lump }, uBoil: { value: boil }, uFreq: { value: freq }, uTex: { value: tex }, uGroove: { value: groove }, uDimple: { value: dimple }, uMottle: { value: mottle } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, BOIL);
    sh.vertexShader = 'uniform float uSeed, uLump, uBoil, uFreq;\nvarying vec3 vObjPos; varying vec3 vObjN;\n' + NOISE + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vObjPos = position; vObjN = objectNormal;
      vec3 wp = position * uFreq;
      float n = vn(wp) * uLump + vn(wp * 2.7 + 11.0) * uLump * 0.45;
      float b = vn(wp * 1.6 + vec3(uSeed * 7.31, uSeed * 3.17, uSeed * 5.53)) * uBoil;
      transformed += objectNormal * (n + b);`);
    sh.fragmentShader = 'uniform float uMottle;\n' + NOISE + sh.fragmentShader
      .replace('#include <bumpmap_pars_fragment>', BUMP)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float mo = vn(vObjPos * 3.0) * 0.6 + vn(vObjPos * 11.0) * 0.4;
        diffuseColor.rgb *= 1.0 + uMottle * mo;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.04, 0.98, 0.95), uMottle * 4.0 * clamp(vn(vObjPos * 1.7 + 5.0), 0.0, 1.0));`);
  };
  m.customProgramCacheKey = () => 'clay2' + (map ? 'm' : '') + (clearcoat ? 'c' : '');
  return m;
}

// ---------- replacement mouths (Rhubarb shapes A-H, X rest, S sad, M smile) ----------
export const SHAPES = 'ABCDEFGHXSM';
function mouthAtlas() {
  const cw = 160, ch = 110, c = document.createElement('canvas'); c.width = cw * SHAPES.length; c.height = ch;
  const g = c.getContext('2d');
  const IN = '#3B1410', LIP = 'rgba(70,25,18,0.9)', TEETH = '#F4EDE0', TONGUE = '#C9545A';
  const blob = (cx, cy, rx, ry, top = 0, bot = 0) => { g.beginPath(); g.moveTo(cx - rx, cy);
    g.bezierCurveTo(cx - rx * 0.6, cy - ry - top, cx + rx * 0.6, cy - ry - top, cx + rx, cy);
    g.bezierCurveTo(cx + rx * 0.6, cy + ry + bot, cx - rx * 0.6, cy + ry + bot, cx - rx, cy); g.closePath(); };
  for (let i = 0; i < SHAPES.length; i++) {
    const s = SHAPES[i], x0 = i * cw, cx = x0 + cw / 2, cy = ch / 2;
    g.save(); g.lineCap = g.lineJoin = 'round';
    const open = (rx, ry, teethTop = 0, teethBot = 0, tongue = 0) => {
      blob(cx, cy, rx, ry); g.fillStyle = IN; g.fill();
      g.save(); g.clip();
      if (teethTop) { g.fillStyle = TEETH; g.fillRect(cx - rx, cy - ry - 4, rx * 2, teethTop); }
      if (teethBot) { g.fillStyle = TEETH; g.fillRect(cx - rx, cy + ry + 4 - teethBot, rx * 2, teethBot); }
      if (tongue) { g.fillStyle = TONGUE; g.beginPath(); g.ellipse(cx, cy + ry * 0.75, rx * 0.6, ry * 0.55, 0, 0, 7); g.fill(); }
      g.restore();
      g.strokeStyle = LIP; g.lineWidth = 7; blob(cx, cy, rx, ry); g.stroke();
    };
    const line = (w, curve) => { g.strokeStyle = LIP; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - w, cy - curve * 0.3); g.quadraticCurveTo(cx, cy + curve, cx + w, cy - curve * 0.3); g.stroke(); };
    if (s === 'A') line(40, 2);                         // M B P: lips pressed
    if (s === 'B') open(44, 9, 9, 7);                   // most consonants: teeth together
    if (s === 'C') open(46, 18, 10, 6, 1);              // EH AE
    if (s === 'D') open(50, 30, 10, 0, 1);              // AA: wide open
    if (s === 'E') open(32, 20, 6, 0, 1);               // AO ER: rounded
    if (s === 'F') open(18, 14);                        // OO W: pucker
    if (s === 'G') { open(40, 12, 12, 0); g.fillStyle = 'rgba(70,25,18,0.95)'; g.fillRect(cx - 40, cy + 4, 80, 10); } // F V
    if (s === 'H') open(42, 22, 8, 0, 1);               // L: tongue up
    if (s === 'X') line(34, 3);                         // rest
    if (s === 'S') line(34, -12);                       // sad
    if (s === 'M') line(40, 14);                        // smile
    g.restore();
  }
  return c;
}
let ATLAS = null;
function mouthTex() {
  ATLAS = ATLAS || mouthAtlas();
  const t = new THREE.CanvasTexture(ATLAS); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / SHAPES.length, 1);
  return t;
}

// a patch of sphere surface (front of a head), UVs 0..1 across it
const patch = (r, w, h, thetaC) => new THREE.SphereGeometry(r, 18, 10, Math.PI / 2 - w / 2, w, thetaC - h / 2, h);

// stripes for a shirt, wrapped by the capsule's UVs
export function stripes(base, line, n = 7) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 256); g.fillStyle = line; for (let i = 0; i < n; i++) g.fillRect(0, (i + 0.5) * 256 / n - 9, 64, 18);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a garment that follows the body: the same capsule, a little bigger (so arms and limbs never cut through it)
export function shell(P, color, { grow = 1.06, top = 1, bottom = 0, o = {} } = {}) {
  const b = P.body, g = b.geometry.parameters;
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(g.radius * grow, g.height * top, 8, 18), clay(color, { tex: 2.0, fp: 0.8, ...o }));
  m.scale.copy(b.scale); m.position.copy(b.position); m.position.y += bottom; m.castShadow = m.receiveShadow = true; P.torso.add(m); return m;
}
// a hair cap that sits on the skull with sculpted strands
export function hair(P, color, { sx = 1.0, sy = 0.62, sz = 1.04, y = 0.1, z = -0.02, groove = 46 } = {}) {
  const r = P.hr * 1.04, m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), clay(color, { groove, tex: 3, rough: 0.7 }));
  m.scale.set(sx, sy * 1.6, sz); m.position.set(0, y * 0.4, z); m.castShadow = true; P.head.add(m); return m;
}

// ---------- puppet builder ----------
// o: { skin, top, pants, headR, bodyR, bodyL, seat (seated height or 0 standing), eye: white size, lidRest 0 wide .. 1 closed }
export function puppet(o) {
  const g = new THREE.Group(), P = { g };
  const skin = clay(o.skin, { tex: 3.0, mottle: 0.06 }), top = o.topMat || clay(o.top, { tex: 2.0, fp: 0.8 }), pants = clay(o.pants || 0x2B2A33, { tex: 2.0, fp: 0.8 });
  const sit = !!o.seat, hr = o.headR || 0.24, br = o.bodyR || 0.2, bl = o.bodyL || 0.3; P.hr = hr; P.br = br;
  const hip = sit ? o.seat : 0.62;
  // legs
  for (const s of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(br * 0.42, sit ? 0.28 : 0.36, 6, 12), pants);
    if (sit) { thigh.rotation.x = Math.PI / 2; thigh.position.set(s * br * 0.5, hip, 0.18); }
    else thigh.position.set(s * br * 0.5, hip * 0.55, 0);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(br * 0.38, sit ? hip * 0.62 : 0.01, 6, 12), pants);
    shin.position.set(s * br * 0.5, sit ? hip * 0.5 : 0.12, sit ? 0.38 : 0);
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(br * 0.48, 16, 10), clay(o.shoe || 0x1E1A1A));
    shoe.scale.set(1, 0.6, 1.5); shoe.position.set(s * br * 0.5, 0.05, sit ? 0.45 : 0.06);
    g.add(thigh, shin, shoe);
  }
  // torso pivots at the hip so it can lean
  const torso = new THREE.Group(); torso.position.y = hip; g.add(torso); P.torso = torso;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(br, bl, 8, 18), top);
  body.position.y = bl / 2 + br * 0.75; body.scale.set(o.bodyW || 1, 1, o.bodyD || 0.82); torso.add(body); P.body = body;
  const neckY = bl + br * 1.6;
  // arms: shoulder pivots
  P.arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * br * (o.bodyW || 1) * 0.95, neckY - 0.08, 0); torso.add(sh);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(br * 0.3, 0.2, 6, 10), top); up.position.y = -0.14; sh.add(up);
    const elbow = new THREE.Group(); elbow.position.y = -0.28; sh.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(br * 0.27, 0.18, 6, 10), top); fore.position.y = -0.12; elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(br * 0.34, 14, 10), skin); hand.position.y = -0.27; hand.scale.set(1, 1.1, 0.8); elbow.add(hand);
    sh.rotation.z = s * 0.28; P.arms.push({ sh, elbow, hand, s });
  }
  // head pivots at the neck
  const neck = new THREE.Group(); neck.position.y = neckY; torso.add(neck); P.neck = neck;
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(br * 0.32, br * 0.4, 0.12, 12), skin); nk.position.y = 0.03; neck.add(nk);
  const head = new THREE.Group(); head.position.y = hr * 0.95; neck.add(head); P.head = head;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(hr, 32, 24), skin); skull.scale.set(o.headW || 1, o.headH || 1.02, 0.95); head.add(skull);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(hr * (o.nose || 0.17), 14, 10), skin); nose.scale.set(1, 0.9, 1.1); nose.position.set(0, -hr * 0.08, hr * 0.93); head.add(nose);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(hr * 0.2, 12, 8), skin); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * hr * (o.headW || 1) * 0.97, 0, 0); head.add(ear); }
  // eyes: white ball, pupil, lid (top hemisphere that rotates down over the ball)
  P.eyes = [];
  const er = hr * (o.eye || 0.2), white = clay(0xEAE3D6, { lump: 0.001, boil: 0.0006, rough: 0.35, clearcoat: 1, fp: 0.15, sheen: 0 }), pup = new THREE.MeshPhysicalMaterial({ color: 0x0E0A09, roughness: 0.2, clearcoat: 1 }), iris = new THREE.MeshPhysicalMaterial({ color: o.iris || 0x4A2C1A, roughness: 0.3, clearcoat: 1 });
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(s * hr * 0.36, hr * 0.17, hr * 0.86); head.add(e);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(er, 18, 14), white); ball.scale.z = 0.7; e.add(ball);
    const p = new THREE.Group(); p.position.z = er * 0.6; e.add(p);
    const ir = new THREE.Mesh(new THREE.SphereGeometry(er * 0.5, 16, 12), iris); ir.scale.z = 0.35; p.add(ir);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(er * 0.27, 12, 10), pup); pu.scale.z = 0.35; pu.position.z = er * 0.06; p.add(pu);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(er * 0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(er * 0.17, er * 0.2, er * 0.8); e.add(glint);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(er * 1.12, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.scale.z = 0.75; e.add(lid);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(er * 0.22, er * 1.3, 4, 8), clay(o.brow || 0x2A1A14)); brow.rotation.z = Math.PI / 2; brow.position.set(0, er * 1.6, er * 0.62); e.add(brow);
    P.eyes.push({ e, p, lid, brow, s });
  }
  // replacement mouth on a patch of the face
  const mt = mouthTex();
  const mw = o.mouthW || 0.75, mouth = new THREE.Mesh(patch(hr * 1.012, mw, mw * 0.5, Math.PI * 0.64),
    new THREE.MeshStandardMaterial({ map: mt, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
  mouth.scale.set(o.headW || 1, o.headH || 1.02, 0.95); head.add(mouth); P.mouth = mouth;
  P.setMouth = (s) => { mt.offset.x = Math.max(0, SHAPES.indexOf(s)) / SHAPES.length; };
  P.lidRest = o.lidRest ?? 0.15;
  // pose: { lid 0 open .. 1 shut, look [x,y] -1..1, brow [l,r] raise -1..1, nod, turn, tilt, lean, mouth }
  P.pose = (q = {}) => {
    const lid = q.lid ?? P.lidRest;
    for (const E of P.eyes) {
      E.lid.rotation.x = -1.35 + lid * 2.75;
      E.p.position.x = (q.look ? q.look[0] : 0) * er * 0.32; E.p.position.y = (q.look ? q.look[1] : 0) * er * 0.28;
      const br2 = q.brow ? q.brow[E.s < 0 ? 0 : 1] : 0; E.brow.position.y = er * (1.6 + br2 * 0.45); E.brow.rotation.z = Math.PI / 2 + E.s * (q.browTilt || 0);
    }
    head.rotation.set(q.nod || 0, q.turn || 0, q.tilt || 0);
    torso.rotation.x = q.lean || 0; torso.rotation.y = q.twist || 0;
    torso.position.y = hip + (q.bob || 0);
    P.setMouth(q.mouth || 'X');
  };
  P.pose();
  return P;
}
