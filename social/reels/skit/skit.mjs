// "Madam ki Class: Table Edition", Room 1: four friends at a restaurant table, and Ayesha turns into Madam.
//   KOKORO_DIR=/path/to/kokoro CHROMIUM_PATH=/opt/pw-browsers/chromium node social/reels/skit/skit.mjs
//   → social/reels/out/table-edition-room-1.mp4 (+ -cover.jpg)
// Voices: voice.py (one voice per friend). Sound: classfx.py. Characters: cast.mjs (Open Peeps, CC0).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { cast } from './cast.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REELS = path.join(ROOT, 'social/reels');
const OUT = path.join(REELS, 'out');
const NAME = 'table-edition-room-1';
const TMP = path.join(OUT, '.class-tmp', NAME);
const FPS = 30;
let ffmpeg = process.env.FFMPEG;
if (!ffmpeg) { try { ffmpeg = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim(); } catch { ffmpeg = 'ffmpeg'; } }

const room1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'social/content/series-escape.json'), 'utf8')).posts[0];
const riddle = room1.frames.find((f) => f.layout === 'riddle');

// Who sits where (the back row is higher and smaller; the front row sits right behind the table).
const seats = {
  hamza: { x: 80, y: 520, size: 420 },
  zain: { x: 580, y: 520, size: 420 },
  ayesha: { x: 30, y: 850, size: 510 },
  sara: { x: 540, y: 850, size: 510 },
};
const NAMES = { ayesha: 'Ayesha', madam: 'Ayesha (Madam mode)', hamza: 'Hamza', sara: 'Sara', zain: 'Zain' };
const VOICE = { ayesha: ['hf_beta', 1.12, 0.92], madam: ['hf_beta', 1.0, 1.0], sara: ['hf_alpha', 1.06, 0.95], hamza: ['hm_omega', 1.04, 1.08], zain: ['hm_psi', 1.0, 0.92] }; // voice, pitch, speed

// The script. `say` is on screen (Roman Urdu, *accent*); `hi` is what the voice reads.
const SCRIPT = [
  { id: 'l0', who: 'zain', say: 'Bhai... ye *menu* wala burger hai?', hi: 'भाई... ये मेन्यू वाला बर्गर है?' },
  { id: 'l1', who: 'hamza', say: 'Nahi nahi nahi! Ayesha, *phir se nahi!*', hi: 'नहीं नहीं नहीं! आयशा, फिर से नहीं!' },
  { id: 'l2', who: 'madam', style: 'madam', say: 'Menu ki photo pe *bharosa* kiya? Bench pe khade ho jao!', hi: 'मेन्यू की फ़ोटो पे भरोसा किया? बेंच पे खड़े हो जाओ!' },
  { id: 'l3', who: 'sara', style: 'whisper', say: 'Yaar chup kar, *log dekh rahe hain!*', hi: 'यार चुप कर, लोग देख रहे हैं!' },
  { id: 'l4', who: 'madam', style: 'madam', say: 'Aaj ka *sawal!*', hi: 'आज का सवाल!' },
  { id: 'l5', who: 'madam', style: 'madam', say: 'Market jahan shopping kam, *gol gappay zyada.* Pehla letter!', hi: 'मार्केट जहाँ शॉपिंग कम, गोलगप्पे ज़्यादा। पहला लेटर!' },
  { id: 'l6', who: 'zain', say: 'Gol gappay wali market... *wo to...*', hi: 'गोलगप्पे वाली मार्केट... वो तो...' },
  { id: 'l7', who: 'hamza', say: 'Mujhe pata hai! *Pehla letter...*', hi: 'मुझे पता है! पहला लेटर...' },
  { id: 'l8', who: 'madam', style: 'madam', say: 'Chup! Answer sirf *DM* mein! Kal *8:30,* late aaye to absent!', hi: 'चुप! आंसर सिर्फ़ डीएम में! कल साढ़े आठ, लेट आए तो एब्सेंट!' },
  { id: 'l9', who: 'ayesha', say: 'Kya hua? Khana *thanda* ho raha hai.', hi: 'क्या हुआ? खाना ठंडा हो रहा है।' },
];

function build(dur) {
  const lines = [], voice = [], events = [], hits = [], whacks = [], shakes = [], pops = [], camera = [];
  const faces = { ayesha: [], hamza: [], zain: [], sara: [] };
  const face = (who, t, f) => faces[who].push({ t, f });
  let t = 0;
  // say(): the line starts at t; t moves to its end plus a pause. Pauses are the comedy: let each beat land.
  const say = (id, pause = 0.45, overlap = 0) => {
    const s = SCRIPT.find((x) => x.id === id); const d = dur[id] || 1.6;
    t -= overlap;
    lines.push({ ...s, t, d, name: NAMES[s.who] }); voice.push({ t, file: path.join(TMP, id + '.wav'), gain: s.style === 'whisper' ? 0.75 : 1 });
    const start = t; t += d + pause; return start;
  };
  const hold = (secs) => { t += secs; };
  const cam = (tt, shot, zoom, cx, cy) => camera.push({ t: tt, shot, zoom, cx, cy });
  const whack = (tt, y = 1150, big = 1) => { whacks.push({ t: tt, y }); events.push({ t: tt, type: 'whack', gain: big }); hits.push({ t: tt, zoom: 0.07 * big, shake: 22 * big }); };

  for (const w of Object.keys(faces)) face(w, 0, 'smile');
  face('zain', 0, 'calm');

  // 1. Establish: four friends, a table, dinner arrives. Let it breathe.
  cam(0, 'wide'); hold(1.1);
  // 2. The reveal: push in on the plate. A tiny burger. A beat of silence.
  cam(t, 'plate', 2.7, 590, 1440); events.push({ t, type: 'whoosh', dur: 0.35, gain: 0.5 }); hold(0.9);
  const menu = { t, until: 0 }; events.push({ t, type: 'impact', big: 0.55 }); hits.push({ t, zoom: 0.03, shake: 6 }); hold(1.0);
  // 3. Zain says what everyone is thinking.
  cam(t, 'zain', 2.0); face('zain', t, 'suspicious');
  let s = say('l0', 0.35);
  menu.until = t;
  face('hamza', s + 0.5, 'awe'); face('sara', s + 0.5, 'awe');
  // 4. Everyone slowly turns to Ayesha. She goes quiet. Uh oh.
  cam(t, 'wide'); face('ayesha', t, 'blank'); hold(0.7);
  cam(t, 'ayesha', 1.9); face('ayesha', t, 'serious'); events.push({ t, type: 'riser', dur: 1.2, gain: 0.5 }); hold(1.1);
  // 5. The transformation: bell, FLASH, chalk puff, the restaurant becomes a classroom. Hold on her.
  const tr = { t, until: 0 };
  events.push({ t: t - 0.3, type: 'bell' }); face('ayesha', t, 'madam:rage'); events.push({ t, type: 'impact', big: 1 }); hits.push({ t, zoom: 0.1, shake: 26, flash: true });
  face('hamza', t + 0.3, 'fear'); face('sara', t + 0.3, 'concernedFear'); face('zain', t + 0.3, 'fear');
  hold(1.2);
  // 6. Hamza panics.
  cam(t, 'hamza', 2.1); shakes.push({ who: 'hamza', t, d: (dur.l1 || 1.5) + 0.3 }); events.push({ t, type: 'whoosh', dur: 0.3, gain: 0.5 });
  say('l1', 0.4);
  // 7. Madam: WHACK. "Menu ki photo pe bharosa kiya? Bench pe khade ho jao!"
  cam(t, 'ayesha', 2.2); whack(t, 1180); hold(0.35);
  face('ayesha', t, 'madam:veryAngry');
  say('l2', 0.2);
  const stamp = { t, until: t + 1.6, x: 250, y: 700 };
  events.push({ t, type: 'stamp' }); hits.push({ t, zoom: 0.06, shake: 18 });
  cam(t, 'wide'); hold(0.6);
  // 8. Zain actually gets up on his chair. Slowly. Silence.
  face('zain', t, 'hectic');
  const stand = { who: 'zain', t, until: 0 }; pops.push({ who: 'zain', t: t + 0.4 }); events.push({ t: t + 0.4, type: 'pop', gain: 1 });
  hold(1.3);
  // 9. Sara tries to stop her, whispering. Madam turns and glares. Sara shrinks.
  cam(t, 'sara', 2.1); face('sara', t, 'concernedFear');
  say('l3', 0.3);
  cam(t, 'ayesha', 2.0); face('ayesha', t, 'madam:suspicious'); events.push({ t, type: 'pop', gain: 0.6 }); hold(0.9);
  face('sara', t - 0.4, 'fear');
  // 10. "Aaj ka sawal!" The board drops. She dictates. The clock ticks; let viewers read.
  cam(t, 'wide'); face('ayesha', t, 'madam:explaining'); whack(t, 1180, 0.9);
  say('l4', 0.3);
  const board = { t, until: 0, write: 2.0, over: 'Aaj ka sawal · Room 1', q: riddle.h, pattern: riddle.pattern, note: riddle.b };
  events.push({ t, type: 'impact', big: 0.7 }); events.push({ t: t + 0.3, type: 'chalk', dur: 2.0 }); hits.push({ t, zoom: 0.04, shake: 10 });
  face('zain', t, 'suspicious'); face('hamza', t, 'concernedFear'); face('sara', t, 'suspicious');
  hold(0.3);
  s = say('l5', 0.2);
  events.push({ t: board.t + 2.5, type: 'scribble' }); events.push({ t: board.t + 2.8, type: 'lock', gain: 0.6 });
  const tickFrom = board.t + 0.3;
  hold(1.6);
  // 11. The friends try to crack it. Hamza gets excited, and Madam cuts him off mid-word.
  cam(t, 'zain', 2.0); face('zain', t, 'explaining'); pops.push({ who: 'zain', t });
  say('l6', 0.35);
  cam(t, 'hamza', 2.0); face('hamza', t, 'smileBig'); pops.push({ who: 'hamza', t });
  say('l7', 0, 0.35);
  cam(t, 'ayesha', 2.3); whack(t, 1180, 1.1); face('ayesha', t, 'madam:angryWithFang'); face('hamza', t + 0.1, 'fear'); shakes.push({ who: 'hamza', t: t + 0.1, d: 1.0 });
  board.until = t;
  const tickTo = t;
  hold(0.2);
  say('l8', 0.3);
  // 12. Frozen table. Nobody moves.
  cam(t, 'wide'); hold(1.0);
  // 13. Glasses off. Sweet as ever.
  tr.until = t; stand.until = t;
  events.push({ t, type: 'whoosh', dur: 0.35, gain: 0.5 }); face('ayesha', t, 'smile');
  for (const w of ['hamza', 'zain', 'sara']) face(w, t + 0.1, 'blank');
  cam(t, 'ayesha', 1.8); hold(0.6);
  face('ayesha', t, 'lovingGrin1');
  say('l9', 0.5);
  // 14. The stare. Silence. One bell.
  cam(t, 'wide'); hold(0.4); events.push({ t, type: 'bell', gain: 0.4 }); hold(0.8);
  const len = t + 1.2;
  for (const k of Object.keys(faces)) faces[k].sort((a, b) => a.t - b.t);
  camera.sort((a, b) => a.t - b.t);
  return { len, voice, events, tick: [[tickFrom, tickTo]], tl: { lines, faces, camera, hits, whacks, shakes, pops, menu, transform: tr, stamp, board, stand, tag: ['Madam ki Class', 'Room 1 · Table edition'] } };
}

// voices
fs.mkdirSync(TMP, { recursive: true });
const byVoice = {};
for (const l of SCRIPT) { const [v, pitch, speed] = VOICE[l.who]; byVoice[v] = byVoice[v] || []; byVoice[v].push({ id: l.id, text: l.hi, voice: v, pitch, speed }); }
let dur = {};
if (process.env.KOKORO_DIR && process.env.VOICE !== 'off') {
  const all = Object.values(byVoice).flat();
  dur = JSON.parse(execFileSync('python3', [path.join(REELS, 'voice.py'), JSON.stringify({ lines: all }), TMP], { env: process.env }).toString().trim().split('\n').pop());
}
const B = build(dur);
if (!Object.keys(dur).length) B.voice = [];
const wav = path.join(TMP, 'mix.wav');
execFileSync('python3', [path.join(REELS, 'classfx.py'), JSON.stringify({ len: B.len, voice: B.voice, events: B.events, tick: B.tick }), wav], { cwd: REELS });

// frames
const TYPES = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(`http://127.0.0.1:${server.address().port}/social/reels/skit/skit.html`);
await page.waitForFunction(() => window.__ready === true);
await page.evaluate((d) => window.load(d), { cast: cast(), seats, tl: B.tl });
const mp4 = path.join(OUT, NAME + '.mp4');
const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', wav,
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.round(B.len * FPS);
const coverAt = Math.round((B.tl.stamp.t + 0.4) * FPS);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.render(t), i / FPS);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 90 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i === coverAt) fs.writeFileSync(path.join(OUT, NAME + '-cover.jpg'), jpg);
}
ff.stdin.end();
await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg failed ' + c)) : r())));
await browser.close(); server.close();
console.log(`${NAME}.mp4  ${B.len.toFixed(1)} s  ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB`);
