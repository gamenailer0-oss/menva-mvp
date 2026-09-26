// "Madam ki Class": the Escape the menu Reels as a strict tuition teacher's class.
// Madam speaks (voice.py), every word lands on screen as she says it, and every beat has a sound (classfx.py).
//
//   KOKORO_DIR=/path/to/kokoro CHROMIUM_PATH=/opt/pw-browsers/chromium node social/reels/class.mjs [escape-01-the-photo ...]
//   writes social/reels/out/<id>.mp4 and <id>-cover.jpg for each post in social/content/series-escape.json
//   that has a "madam" script. Without KOKORO_DIR (or with VOICE=off) the Reel is made without a voice.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HERE = path.join(ROOT, 'social/reels');
const OUT = path.join(HERE, 'out');
const TMP = path.join(OUT, '.class-tmp');
const FPS = 30;
let ffmpeg = process.env.FFMPEG;
if (!ffmpeg) { try { ffmpeg = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim(); } catch { ffmpeg = 'ffmpeg'; } }
const cal = JSON.parse(fs.readFileSync(path.join(ROOT, 'social/content/series-escape.json'), 'utf8'));
const only = process.argv.slice(2);
const withVoice = process.env.VOICE !== 'off' && process.env.KOKORO_DIR;

// Madam's lines: `say` is what the viewer reads (Roman Urdu, *accent*), `hi` is what the voice reads.
// A beat is one line. Its visuals start with the line; `after` adds a pause after it.
function timeline(p, dur) {
  const m = p.madam, riddle = p.frames.find((f) => f.layout === 'riddle');
  const riddles = p.frames.filter((f) => f.layout === 'riddle');
  const events = [], voice = [], whacks = [], hits = [], scenes = [], tick = [];
  let t = 0;
  const line = (id) => { const d = dur[id] || m.lines.find((l) => l.id === id).est || 1.5; voice.push({ t, file: path.join(TMP, p.id, id + '.wav') }); return d; };
  const words = (text, d, lead = 0.05) => { const n = String(text).split(/\s+/).length; return Array.from({ length: n }, (_, i) => lead + (d * 0.92) * i / n); };
  const popAll = (at, ws) => ws.forEach((w) => events.push({ t: at + w, type: 'pop', gain: 0.6 }));
  const L = (id) => m.lines.find((l) => l.id === id);

  // 1. The hook: bell, WHACK, "PHONE NEECHAY NAHI!"
  events.push({ t: 0, type: 'bell' });
  whacks.push({ t: 0.18, y: 980 }); events.push({ t: 0.18, type: 'whack' }); hits.push({ t: 0.18, zoom: 0.09, shake: 26, flash: true });
  t = 0.3;
  let d = line('hook');
  const hookWords = words(L('hook').say, d, 0);
  scenes.push({ t: [0, t + d + 0.15], bg: 'inkbg', reg: ['Madam ki Class', m.room], els: [{ type: 'say', size: 'huge', y: 620, text: L('hook').say, at: t, words: hookWords }] });
  popAll(t, hookWords);
  t += d + 0.15;

  // 2. The scolding, on an exam paper, ending in a stamp (and a whack).
  const s0 = t;
  events.push({ t, type: 'whoosh', dur: 0.4 }); hits.push({ t, zoom: 0.04, shake: 8 });
  const els = [];
  let y = 360;
  for (const id of m.scold) {
    const ln = L(id); d = line(id);
    const ws = words(ln.say, d);
    els.push({ type: 'say', size: ln.size || 'big', y: els.length ? 0 : 360, text: ln.say, at: t - s0, words: ws }); // later lines stack below (class.html)
    popAll(t, ws);
    y += ln.size === 'mid' ? 360 : 460;
    t += d + 0.12;
  }
  // the verdict: stamp + Madam's order
  const vd = line('verdict');
  const st = t + 0.05;
  els.push({ type: 'stamp', text: m.stamp, x: 330, y: 0, at: st - s0, rot: -9 });
  events.push({ t: st, type: 'stamp' }); hits.push({ t: st, zoom: 0.07, shake: 22 });
  whacks.push({ t: st + 0.02, y: Math.min(y + 60, 1220) }); events.push({ t: st + 0.02, type: 'whack', gain: 0.8 });
  els.push({ type: 'pen', text: L('verdict').say, x: 190, y: 0, size: 96, at: st + 0.2 - s0 });
  events.push({ t: st + 0.2, type: 'scribble', gain: 0.7 });
  t += vd + 0.25;
  scenes.push({ t: [s0, t], bg: 'paper', reg: [m.format, m.room], els });

  // 3. "Aaj ka sawal" on the board: chalk writes the riddle, a red ring marks the letter, the code slides up.
  for (const [ri, rd] of riddles.entries()) {
    const b0 = t;
    events.push({ t: b0 - 0.05, type: 'riser', dur: 0.8, gain: 0.6 }); events.push({ t: b0, type: 'impact', big: 0.8 }); hits.push({ t: b0, zoom: 0.05, shake: 12 });
    const qid = ri ? 'sawal2' : 'sawal';
    d = L(qid) ? line(qid) : 0;
    const write = Math.min(2.2, 0.9 + rd.h.length / 40);
    const wAt = 0.25;
    const ringAt = wAt + 0.2 + write + 0.45;
    const codeAt = ringAt + 0.5;
    // Madam gets impatient while the riddle sits there: "Jaldi karo!" (keeps the board from going quiet)
    const hurryAt = codeAt + 0.6;
    const hid = ri ? null : 'hurry';
    let hd = 0;
    if (hid && L(hid)) { const save = t; t = b0 + hurryAt; hd = line(hid); t = save; events.push({ t: b0 + hurryAt, type: 'whack', gain: 0.7 }); whacks.push({ t: b0 + hurryAt, y: 1250 }); hits.push({ t: b0 + hurryAt, zoom: 0.05, shake: 18 }); }
    const hold = Math.max(ringAt + 2.6, d + 0.3, hurryAt + hd + 0.5);
    events.push({ t: b0 + wAt + 0.2, type: 'chalk', dur: write });
    events.push({ t: b0 + ringAt, type: 'scribble' }); events.push({ t: b0 + ringAt + 0.3, type: 'lock', gain: 0.7 });
    events.push({ t: b0 + codeAt, type: 'whoosh', dur: 0.35, gain: 0.6 });
    const qLines = rd.h.length > 70 ? 3 : 2;
    scenes.push({ t: [b0, b0 + hold], bg: 'board', reg: ['Aaj ka sawal', m.room], els: [{ type: 'riddle', over: ri ? 'Aakhri sawal' : 'Aaj ka sawal', q: rd.h, pattern: rd.pattern,
      note: rd.b, board: rd.board, by: 340 + qLines * 105 + 80, at: wAt, write, ringAt, codeAt, hurry: hid && L(hid) ? L(hid).say : '', hurryAt }] });
    tick.push([b0 + 0.3, b0 + hold]);
    t = b0 + hold;
  }

  // 4. The outro: attendance + homework + "Kal 8:30. Late aaye to absent!" + WHACK (loops into the bell).
  const o0 = t;
  events.push({ t: o0, type: 'whoosh', dur: 0.4 }); hits.push({ t: o0, zoom: 0.04, shake: 8 });
  d = line('outro');
  const ow = words(L('outro').say, d);
  scenes.push({ t: [o0, o0 + d + 0.55], bg: 'chili', reg: ['Homework', m.room], els: [
    { type: 'hw', y: 330, at: 0.05, html: m.homework },
    { type: 'say', size: 'big', y: 1000, text: L('outro').say, at: 0.1, words: ow }] });
  popAll(o0 + 0.1, ow);
  const endW = o0 + 0.1 + d + 0.1;
  whacks.push({ t: endW, y: 1300 }); events.push({ t: endW, type: 'whack' }); hits.push({ t: endW, zoom: 0.08, shake: 24, flash: true });
  const len = endW + 0.35;
  scenes[scenes.length - 1].t[1] = len + 1;
  return { len, events, voice, whacks, hits, scenes, tick };
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
fs.mkdirSync(TMP, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

for (const p of cal.posts.filter((x) => x.madam && (!only.length || only.includes(x.id)))) {
  const dir = path.join(TMP, p.id); fs.mkdirSync(dir, { recursive: true });
  let dur = {};
  if (withVoice) {
    const cfg = { voice: p.madam.voice || 'hf_beta', speed: 1.12, lines: p.madam.lines.map((l) => ({ id: l.id, text: l.hi, speed: l.speed, pitch: l.pitch })) };
    dur = JSON.parse(execFileSync('python3', [path.join(HERE, 'voice.py'), JSON.stringify(cfg), dir], { env: process.env }).toString().trim().split('\n').pop());
  }
  const tl = timeline(p, dur);
  if (!withVoice) tl.voice = [];
  const wav = path.join(dir, 'mix.wav');
  execFileSync('python3', [path.join(HERE, 'classfx.py'), JSON.stringify({ len: tl.len, voice: tl.voice, events: tl.events, tick: tl.tick }), wav], { cwd: HERE });

  await page.goto(`http://127.0.0.1:${server.address().port}/social/reels/class.html`);
  await page.waitForFunction(() => window.__ready === true);
  await page.evaluate((x) => window.load(x), { scenes: tl.scenes, whacks: tl.whacks, hits: tl.hits });
  const frames = Math.round(tl.len * FPS);
  const mp4 = path.join(OUT, p.id + '.mp4');
  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', wav,
    '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
  // The grid cover: the scolding at its peak (stamp landed), as a 4:5 crop from the middle of the frame.
  const coverT = tl.hits[2] ? tl.hits[2].t + 0.4 : tl.len * 0.4;
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i === Math.round(coverT * FPS)) await page.screenshot({ path: path.join(OUT, p.id + '-cover.jpg'), type: 'jpeg', quality: 92, clip: { x: 0, y: 285, width: 1080, height: 1350 } });
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg failed ' + c)) : r())));
  console.log(`${p.id}.mp4  ${tl.len.toFixed(1)} s  ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB  voice: ${withVoice ? 'yes' : 'no'}`);
}
await browser.close(); server.close();
