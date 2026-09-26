// "Madam ki Class: Table Edition", Room 1: four friends at a restaurant table, and Ayesha turns into Madam.
//   KOKORO_DIR=/path/to/kokoro CHROMIUM_PATH=/opt/pw-browsers/chromium node social/reels/skit/skit.mjs
//   → social/reels/out/table-edition-room-1.mp4 (+ -cover.jpg)
// Structure (see .claude/skills/menva-reels): a 2-second cold open on the loudest moment with an on-screen
// headline, a tape rewind to "10 second pehle...", the story (but/therefore beats, room to breathe), and an end
// card asking viewers to send it to their group's Ayesha. Voices: voice.py. Sound: classfx.py. Cast: cast.mjs.
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

const seats = {
  hamza: { x: 80, y: 520, size: 420 },
  zain: { x: 580, y: 520, size: 420 },
  ayesha: { x: 30, y: 850, size: 510 },
  sara: { x: 540, y: 850, size: 510 },
};
const NAMES = { ayesha: 'Ayesha', madam: 'Ayesha (Madam mode)', hamza: 'Hamza', sara: 'Sara', zain: 'Zain' };
const VOICE = { ayesha: ['hf_beta', 1.12, 0.92], madam: ['hf_beta', 1.0, 1.0], sara: ['hf_alpha', 1.06, 0.95], hamza: ['hm_omega', 1.04, 1.08], zain: ['hm_psi', 1.0, 0.92] }; // voice, pitch, speed

// Every line has a reason in the story: Zain complains (the menu lied), Madam punishes (bench), Sara objects,
// Madam sets a "saza" (the riddle, or you pay the bill), the friends try, Madam breaks the fourth wall (DM).
const SCRIPT = [
  { id: 'l0', who: 'zain', say: 'Bhai... menu pe ye *jumbo* tha.', hi: 'भाई... मेन्यू पे ये जंबो था।' },
  { id: 'l1', who: 'hamza', say: 'Nahi nahi nahi! Ayesha, *phir se nahi!*', hi: 'नहीं नहीं नहीं! आयशा, फिर से नहीं!' },
  { id: 'l2a', who: 'madam', say: 'Menu ki photo pe *bharosa* kiya?', hi: 'मेन्यू की फ़ोटो पे भरोसा किया?' },
  { id: 'l2b', who: 'madam', say: 'Bench pe *khade* ho jao!', hi: 'बेंच पे खड़े हो जाओ!' },
  { id: 'l3', who: 'sara', say: 'Yaar chup kar, *log dekh rahe hain!*', hi: 'यार चुप कर, लोग देख रहे हैं!' },
  { id: 'l3b', who: 'sara', say: '...main to bas *keh rahi thi.*', hi: '...मैं तो बस कह रही थी।' },
  { id: 'l4', who: 'madam', say: 'Saza milegi. Sawal solve karo, *warna bill tumhara!*', hi: 'सज़ा मिलेगी। सवाल सॉल्व करो, वरना बिल तुम्हारा!' },
  { id: 'l5', who: 'madam', say: 'Market jahan shopping kam, *gol gappay zyada.* Pehla letter!', hi: 'मार्केट जहाँ शॉपिंग कम, गोलगप्पे ज़्यादा। पहला लेटर!' },
  { id: 'l6', who: 'zain', say: 'Gol gappay wali market... *wo to...*', hi: 'गोलगप्पे वाली मार्केट... वो तो...' },
  { id: 'l7', who: 'hamza', say: 'Mujhe pata hai! *Pehla letter...*', hi: 'मुझे पता है! पहला लेटर...' },
  { id: 'l8a', who: 'madam', say: '*Chup!*', hi: 'चुप!' },
  { id: 'l8b', who: 'madam', say: 'Aur tum... answer sirf *DM* mein. 4 October ke baad.', hi: 'और तुम... आंसर सिर्फ़ डीएम में। चार अक्टूबर के बाद।' },
  { id: 'l9', who: 'ayesha', say: 'Kya hua? Khana *thanda* ho raha hai.', hi: 'क्या हुआ? खाना ठंडा हो रहा है।' },
];

function build(dur) {
  const lines = [], voice = [], events = [], hits = [], whacks = [], shakes = [], camera = [];
  const faces = { ayesha: [], hamza: [], zain: [], sara: [] };
  const face = (who, t, f) => faces[who].push({ t, f });
  let t = 0;
  const say = (id, pause = 0.45, overlap = 0) => {
    const s = SCRIPT.find((x) => x.id === id); const d = dur[id] || 1.6;
    t -= overlap;
    lines.push({ ...s, t, d, name: NAMES[s.who] }); voice.push({ t, file: path.join(TMP, id + '.wav'), gain: s.id.startsWith('l3') ? 0.8 : 1 });
    const start = t; t += d + pause; return start;
  };
  const hold = (secs) => { t += secs; };
  // camera: `move` is the eased travel time from the previous shot (0 = cut)
  const cam = (tt, shot, zoom, move = 0.5, extra = {}) => camera.push({ t: tt, shot, zoom, move, ...extra });
  const whack = (tt, y = 1150, big = 1) => { whacks.push({ t: tt, y }); events.push({ t: tt, type: 'whack', gain: big }); hits.push({ t: tt, zoom: 0.06 * big, shake: 18 * big }); };

  for (const w of Object.keys(faces)) face(w, 0, 'smile');
  face('zain', 0, 'calm');

  // 1. Dinner arrives. A slow push from the table toward the plate.
  cam(0, 'wide', 1, 0); hold(0.8);
  cam(t, 'plate', 2.4, 1.1, { cx: 590, cy: 1430 }); events.push({ t, type: 'whoosh', dur: 0.5, gain: 0.35 }); hold(1.5);
  // 2. A tiny burger. BUT the menu said jumbo: Zain holds up the photo.
  cam(t, 'zain', 1.7, 0.6); face('zain', t, 'suspicious');
  const menu = { t: t + 0.25, until: 0 }; events.push({ t: t + 0.3, type: 'pop', gain: 0.9 });
  let s = say('l0', 0.5);
  face('hamza', s + 0.6, 'awe'); face('sara', s + 0.6, 'awe');
  menu.until = t;
  // 3. THEREFORE everyone looks at Ayesha. BUT she has gone very quiet.
  cam(t, 'wide', 1, 0.6); face('ayesha', t, 'blank'); face('hamza', t + 0.3, 'concernedFear'); hold(0.8);
  cam(t, 'ayesha', 1.9, 0.9); face('ayesha', t + 0.3, 'serious'); events.push({ t, type: 'riser', dur: 1.4, gain: 0.5 }); hold(1.3);
  // 4. The glasses. Bell, flash, chalk puff: the restaurant becomes a classroom.
  const tr = { t, until: 0 };
  events.push({ t: t - 0.25, type: 'bell' }); face('ayesha', t, 'madam:rage'); events.push({ t, type: 'impact', big: 1 }); hits.push({ t, zoom: 0.08, shake: 20, flash: true });
  face('hamza', t + 0.35, 'fear'); face('sara', t + 0.35, 'concernedFear'); face('zain', t + 0.35, 'fear');
  hold(1.1);
  // 5. THEREFORE Hamza panics.
  cam(t, 'hamza', 2.0, 0.45); shakes.push({ who: 'hamza', t, d: (dur.l1 || 1.5) + 0.4 }); events.push({ t, type: 'whoosh', dur: 0.4, gain: 0.45 });
  say('l1', 0.45);
  // 6. BUT it's too late. Madam: "Menu ki photo pe bharosa kiya?" (to Zain, who trusted the photo)
  cam(t, 'ayesha', 2.1, 0.45); whack(t + 0.25, 1180); hold(0.45);
  face('ayesha', t, 'madam:veryAngry');
  say('l2a', 0.35);
  cam(t, 'zain', 2.0, 0.35); face('zain', t, 'fear'); events.push({ t: t + 0.2, type: 'pop', gain: 0.5 }); hold(0.7);
  cam(t, 'ayesha', 2.2, 0.3);
  const coldStart = t - 0.1;
  say('l2b', 0.25);
  // 7. THEREFORE Zain actually stands on his chair. Silence.
  cam(t, 'wide', 1, 0.55); face('zain', t, 'hectic');
  const stand = { who: 'zain', t: t + 0.2, until: 0 }; events.push({ t: t + 0.2, type: 'whoosh', dur: 0.35, gain: 0.5 }); events.push({ t: t + 0.7, type: 'impact', big: 0.35 });
  hold(1.4);
  const coldEnd = t;
  // 8. BUT Sara tries to stop her. THEREFORE the glare. Sara backs off.
  cam(t, 'sara', 2.0, 0.5); face('sara', t, 'concernedFear');
  say('l3', 0.35);
  cam(t, 'ayesha', 2.1, 0.4); face('ayesha', t, 'madam:suspicious'); events.push({ t: t + 0.15, type: 'pop', gain: 0.6 }); hold(1.0);
  cam(t, 'sara', 2.0, 0.35); face('sara', t, 'fear');
  say('l3b', 0.45);
  // 9. THEREFORE the punishment: "Saza milegi. Sawal solve karo, warna bill tumhara!" The board drops.
  cam(t, 'ayesha', 2.0, 0.4); face('ayesha', t, 'madam:explaining'); whack(t + 0.2, 1180, 0.9); hold(0.3);
  say('l4', 0.3);
  cam(t, 'wide', 1, 0.55);
  const board = { t, until: 0, write: 2.0, over: 'Saza · Aaj ka sawal', q: riddle.h, pattern: riddle.pattern, note: riddle.b };
  events.push({ t: t + 0.1, type: 'impact', big: 0.7 }); events.push({ t: t + 0.45, type: 'chalk', dur: 2.0 }); hits.push({ t: t + 0.1, zoom: 0.03, shake: 10 });
  face('zain', t, 'suspicious'); face('hamza', t, 'concernedFear'); face('sara', t, 'suspicious');
  hold(0.5);
  say('l5', 0.2);
  events.push({ t: board.t + 2.6, type: 'scribble' }); events.push({ t: board.t + 2.9, type: 'lock', gain: 0.6 });
  const tickFrom = board.t + 0.4;
  hold(1.5);
  // 10. The friends try: Zain thinks, BUT Hamza jumps in, AND Madam cuts him off mid-word.
  cam(t, 'zain', 1.9, 0.5); face('zain', t, 'explaining');
  say('l6', 0.35);
  cam(t, 'hamza', 1.9, 0.35); face('hamza', t, 'smileBig');
  say('l7', 0, 0.35);
  cam(t, 'ayesha', 2.2, 0.15); whack(t, 1180, 1.1); face('ayesha', t, 'madam:angryWithFang'); face('hamza', t + 0.1, 'fear'); shakes.push({ who: 'hamza', t: t + 0.1, d: 1.0 });
  say('l8a', 0.35);
  board.until = t;
  const tickTo = t;
  // 11. She turns to us: the fourth wall. Slow push to her face.
  cam(t, 'ayesha', 2.6, 0.7, { face: true }); face('ayesha', t, 'madam:serious'); events.push({ t, type: 'riser', dur: 0.7, gain: 0.3 });
  hold(0.4);
  say('l8b', 0.5);
  // 12. Frozen table.
  cam(t, 'wide', 1, 0.6); hold(0.9);
  // 13. Glasses off. Sweet as ever. (last line = the loop back to the cold open)
  tr.until = t; stand.until = t;
  events.push({ t, type: 'whoosh', dur: 0.4, gain: 0.45 }); face('ayesha', t, 'smile');
  for (const w of ['hamza', 'zain', 'sara']) face(w, t + 0.15, 'blank');
  cam(t + 0.2, 'ayesha', 1.8, 0.6); hold(0.9);
  face('ayesha', t, 'lovingGrin1');
  say('l9', 0.5);
  cam(t, 'wide', 1, 0.6); hold(0.5); events.push({ t, type: 'bell', gain: 0.35 }); hold(0.5);
  // 14. End card: send it to your group's Ayesha.
  const ctaAt = t; events.push({ t, type: 'impact', big: 0.4 }); hold(2.2);
  const len = t;
  for (const k of Object.keys(faces)) faces[k].sort((a, b) => a.t - b.t);
  camera.sort((a, b) => a.t - b.t);
  return {
    len, voice, events, tick: [[tickFrom, tickTo]], coldStart, coldEnd, ctaAt,
    tl: { lines, faces, camera, hits, whacks, shakes, menu, transform: tr, board, stand,
      tag: ['Madam ki Class', 'Room 1'], headline: 'Har group mein ek *Ayesha* hoti hai', rewindText: '10 second pehle...',
      cta: { big: 'Apne group ki *Ayesha* ko bhejo.', small: 'Escape the menu, Room 1. Code DM karo, 4 October ke baad. Pehle 5 ka dinner humari taraf se.' } },
  };
}

// ── voices ──
fs.mkdirSync(TMP, { recursive: true });
const lines = SCRIPT.map((l) => { const [v, pitch, speed] = VOICE[l.who]; return { id: l.id, text: l.hi, voice: v, pitch, speed }; });
let dur = {};
if (process.env.KOKORO_DIR && process.env.VOICE !== 'off') {
  dur = JSON.parse(execFileSync('python3', [path.join(REELS, 'voice.py'), JSON.stringify({ lines }), TMP], { env: process.env }).toString().trim().split('\n').pop());
}
const B = build(dur);
if (!Object.keys(dur).length) B.voice = [];

// ── the edit: [cold open] [rewind] [story + end card] ──
const REW = 0.9;
const coldLen = B.coldEnd - B.coldStart;
const storyWav = path.join(TMP, 'story.wav'), rewWav = path.join(TMP, 'rewind.wav'), wav = path.join(TMP, 'mix.wav');
execFileSync('python3', [path.join(REELS, 'classfx.py'), JSON.stringify({ len: B.len, voice: B.voice, events: B.events, tick: B.tick }), storyWav], { cwd: REELS });
execFileSync('python3', [path.join(REELS, 'classfx.py'), JSON.stringify({ len: REW, voice: [], events: [{ t: 0, type: 'rewind', dur: REW }] }), rewWav], { cwd: REELS });
execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', storyWav, '-i', rewWav, '-filter_complex',
  `[0:a]atrim=${B.coldStart.toFixed(3)}:${B.coldEnd.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=out:st=${(coldLen - 0.15).toFixed(3)}:d=0.15[c];[0:a]asetpts=PTS-STARTPTS[s];[c][1:a][s]concat=n=3:v=0:a=1[a]`,
  '-map', '[a]', wav]);

const plan = [];
for (let i = 0; i < Math.round(coldLen * FPS); i++) { const tt = B.coldStart + i / FPS; plan.push({ t: tt, ov: { headline: Math.min(1, (i / FPS) / 0.25) } }); }
for (let i = 0; i < Math.round(REW * FPS); i++) { const k = i / (REW * FPS); plan.push({ t: B.coldEnd - (B.coldEnd - 0.2) * (k * k * (3 - 2 * k)), ov: { rewind: Math.min(1, k * 6, (1 - k) * 6 + 0.3) } }); }
for (let i = 0; i < Math.round(B.len * FPS); i++) { const tt = i / FPS; plan.push({ t: tt, ov: { cta: tt >= B.ctaAt ? Math.min(1, (tt - B.ctaAt) / 0.6) : 0 } }); }

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
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mp4], { stdio: ['pipe', 'inherit', 'inherit'] });
for (const [i, f] of plan.entries()) {
  await page.evaluate(([t, ov]) => window.render(t, ov), [f.t, f.ov]);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 90 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i === 20) fs.writeFileSync(path.join(OUT, NAME + '-cover.jpg'), jpg); // the cold open, with the headline
}
ff.stdin.end();
await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg failed ' + c)) : r())));
await browser.close(); server.close();
console.log(`${NAME}.mp4  ${(plan.length / FPS).toFixed(1)} s  ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB  (cold ${coldLen.toFixed(1)} s, story ${B.len.toFixed(1)} s)`);
