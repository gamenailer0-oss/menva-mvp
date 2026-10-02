// Shared helpers for the MENVA film pack. Everything is a pure function of time, so any frame can be drawn on its own.
export const W = 1080, H = 1920;
export const EMBER = '#B5371F', PAPER = '#EFEBE2', INK = '#1A1714';

// ---------- maths ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const inv = (a, b, t) => clamp((t - a) / (b - a));                 // 0 before a, 1 after b
export const eO = (k) => 1 - Math.pow(1 - k, 3);                          // decelerate
export const eI = (k) => k * k * k;                                       // accelerate
export const eIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const eBack = (k, s = 1.7) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
// Closed-form damped spring 0 -> 1, t in seconds since the move began (motion-graphic skill presets).
export const SPRING = { snappy: [320, 28], default: [170, 26], heavy: [90, 19], playful: [220, 16], jelly: [260, 9] };
export function spring(t, k = 170, d = 26) {
  if (t <= 0) return 0;
  const w = Math.sqrt(k), z = d / (2 * w);
  if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
}
// A value that springs to each new target at its key time: keys = [[t, v], ...] sorted.
export function track(t, keys, k, d) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
  return v;
}
export function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
export function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- fonts ----------
const FS = '/social/reels/node_modules/@fontsource/';
const FONTS = {
  serif: ['S', '/vendor/fonts/instrument-serif-400.woff2', 'normal', 400], serifI: ['S', '/vendor/fonts/instrument-serif-400-italic.woff2', 'italic', 400],
  sans: ['D', '/vendor/fonts/dm-sans-400.woff2', 'normal', 400], sansM: ['D', '/vendor/fonts/dm-sans-500.woff2', 'normal', 500], sansB: ['D', '/vendor/fonts/dm-sans-600.woff2', 'normal', 600],
};
const fsFont = (fam, pkg, w = 400) => [fam, `${FS}${pkg}/files/${pkg}-latin-${w}-normal.woff2`, 'normal', w];
Object.assign(FONTS, {
  pixel: fsFont('Pixel', 'press-start-2p'), toon: fsFont('Toon', 'luckiest-guy'), round: fsFont('Round', 'fredoka', 600), roundR: fsFont('Round', 'fredoka', 400),
  bebas: fsFont('Bebas', 'bebas-neue'), archivo: fsFont('Archivo', 'archivo-black'), neon: fsFont('Neon', 'monoton'), vhs: fsFont('VHS', 'vt323'),
  bangers: fsFont('Bangers', 'bangers'), hand: fsFont('Hand', 'caveat', 700), handR: fsFont('Hand', 'caveat', 400), type: fsFont('Type', 'special-elite'),
  mono: fsFont('RubikMono', 'rubik-mono-one'), rye: fsFont('Rye', 'rye'), cinzel: fsFont('Cinzel', 'cinzel-decorative', 700), amiri: fsFont('Amiri', 'amiri', 700),
  shade: fsFont('Shade', 'bungee-shade'), baloo: fsFont('Baloo', 'baloo-2', 800), righteous: fsFont('Righteous', 'righteous'),
});
export async function loadFonts(...names) {
  for (const n of ['serif', 'serifI', 'sans', 'sansB', ...names]) {
    const [fam, url, style, weight] = FONTS[n];
    const f = new FontFace(fam, `url(${url})`, { style, weight: String(weight) });
    document.fonts.add(await f.load());
  }
}

// ---------- canvas text ----------
// T(ctx, text, x, y, {z, f, w, c, al, a, ls, fit, it}) one line; returns the drawn width.
export function T(ctx, s, x, y, o = {}) {
  const { z = 60, f = 'D', w = 400, c = INK, al = 'left', a = 1, ls = 0, fit = 0, it = false, base = 'alphabetic' } = o;
  if (a <= 0) return 0;
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = c; ctx.textAlign = al; ctx.textBaseline = base;
  let size = z; ctx.font = `${it ? 'italic ' : ''}${w} ${size}px ${f}`;
  if (ls) ctx.letterSpacing = ls + 'px';
  if (fit) { const m = ctx.measureText(s).width; if (m > fit) { size = z * fit / m; ctx.font = `${it ? 'italic ' : ''}${w} ${size}px ${f}`; } }
  ctx.fillText(s, x, y); const width = ctx.measureText(s).width; ctx.restore(); return width;
}
// A line that rises out of a mask: p = 0 hidden below, 1 in place, then out above while q goes 0 -> 1.
export function rise(ctx, draw, x, y, h, p, q = 0) {
  if (p <= 0 || q >= 1) return;
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - h, W, h * 1.3); ctx.clip();
  ctx.translate(0, (1 - p) * h * 1.15 - q * h * 1.3); draw(); ctx.restore();
}

// ---------- the QR (real: opens instagram.com/eatmenva) ----------
export function drawQR(ctx, x, y, size, fg = INK, bg = '#fff', pad = 0.08) {
  const Q = window.QR || { size: 25, data: Array(625).fill(0) };
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(x, y, size, size);
  const inner = size * (1 - pad * 2), cell = inner / Q.size, ox = x + size * pad, oy = y + size * pad;
  ctx.fillStyle = fg;
  for (let r = 0; r < Q.size; r++) for (let c = 0; c < Q.size; c++) if (Q.data[r * Q.size + c]) ctx.fillRect(ox + c * cell - 0.25, oy + r * cell - 0.25, cell + 0.5, cell + 0.5);
  ctx.restore();
}

// ---------- the logo: identical in every film ----------
// lowercase italic Instrument Serif "menva" + an ember disc for the dot. ink adapts to the background, the rest never changes.
export function logo(ctx, cx, baseY, p = 1, ink = INK, scale = 1) {
  if (p <= 0) return;
  ctx.save();
  const z = 300 * scale; ctx.font = `italic 400 ${z}px S`; ctx.textBaseline = 'alphabetic';
  const wM = ctx.measureText('menva').width, gap = 4 * scale, r = 25 * scale;
  const left = cx - (wM + gap + r * 2) / 2;
  ctx.beginPath(); ctx.rect(0, baseY - z * 0.95, W, z * 1.15); ctx.clip();
  const k = spring(p * 0.9, ...SPRING.heavy);
  ctx.translate(0, (1 - k) * z * 0.9);
  ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.fillText('menva', left, baseY);
  ctx.restore();
  // the dot lands a beat after the word, with a tiny settle
  const d = spring((p - 0.25) * 1.2, ...SPRING.playful);
  if (d > 0) { ctx.save(); ctx.fillStyle = EMBER; ctx.beginPath(); ctx.arc(left + wM + gap + r, baseY - r * 0.9, r * d, 0, 7); ctx.fill(); ctx.restore(); }
}
// The end card: logo, the promise, the handle. t0 = when it starts; ink/sub colours follow the film's background.
export function endCard(ctx, t, t0, { ink = INK, sub = '#5C5349', line = 'See it before you order it.', line2 = 'Order se pehle dekh lo.' } = {}) {
  const lt = t - t0; if (lt < 0) return;
  logo(ctx, W / 2, 900, lt / 0.9, ink);
  rise(ctx, () => T(ctx, line, W / 2, 1060, { z: 76, f: 'S', c: ink, al: 'center' }), 0, 1060, 80, spring(lt - 0.6, ...SPRING.heavy));
  rise(ctx, () => T(ctx, line2, W / 2, 1140, { z: 42, f: 'D', c: sub, al: 'center' }), 0, 1140, 50, spring(lt - 0.85, ...SPRING.heavy));
  const hp = spring(lt - 1.15, ...SPRING.default);
  if (hp > 0) {
    ctx.save(); ctx.globalAlpha = hp; ctx.translate(0, (1 - hp) * 24);
    ctx.font = '500 36px D'; const s = '@eatmenva · Lahore', w = ctx.measureText(s).width + 76;
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(W / 2 - w / 2, 1290, w, 76, 38); ctx.stroke();
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText(s, W / 2, 1340); ctx.restore();
  }
}

// ---------- cues ----------
export function cues() { const list = []; const add = (t, type, extra = {}) => { list.push({ t, type, ...extra }); }; return { list, add }; }

// ---------- film grain (a fresh, seeded offset every frame) ----------
export function grainLayer(alpha = 0.06) {
  const n = document.createElement('canvas'); n.width = n.height = 256;
  const g = n.getContext('2d'), d = g.createImageData(256, 256), r = rng(9);
  for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  return (ctx, t) => {
    const ox = Math.floor(hash(Math.floor(t * 60)) * 256), oy = Math.floor(hash(Math.floor(t * 60) + 7) * 256);
    ctx.save(); ctx.globalAlpha = alpha; ctx.globalCompositeOperation = 'overlay';
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(n, x, y);
    ctx.restore();
  };
}
