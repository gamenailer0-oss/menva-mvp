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
const FPS = 30;
let ffmpeg = process.env.FFMPEG;
if (!ffmpeg) { try { ffmpeg = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim(); } catch { ffmpeg = 'ffmpeg'; } }

import { EPISODES } from './episodes.mjs';
const ID = process.argv[2] || 'escape-01-the-photo';
const EP = EPISODES[ID];
if (!EP) throw new Error('Unknown episode ' + ID + ' (see episodes.mjs)');
const post = JSON.parse(fs.readFileSync(path.join(ROOT, 'social/content/series-escape.json'), 'utf8')).posts.find((p) => p.id === ID);
const riddles = post.frames.filter((f) => f.layout === 'riddle');
const NUM = EP.room.replace(/\D/g, '');
const NAME = 'table-edition-room-' + NUM;
const TMP = path.join(OUT, '.class-tmp', NAME);

const seats = {
  hamza: { x: 80, y: 520, size: 420 },
  zain: { x: 580, y: 520, size: 420 },
  ayesha: { x: 30, y: 850, size: 510 },
  sara: { x: 540, y: 850, size: 510 },
};
const NAMES = { ayesha: 'Ayesha', madam: 'Ayesha (Madam mode)', hamza: 'Hamza', sara: 'Sara', zain: 'Zain', waiter: 'Waiter' };
const VOICE = { ayesha: ['hf_beta', 1.12, 0.92], madam: ['hf_beta', 1.0, 1.0], sara: ['hf_alpha', 1.06, 0.95], hamza: ['hm_omega', 1.04, 1.08], zain: ['hm_psi', 1.0, 0.92], waiter: ['hm_omega', 0.92, 0.95] }; // voice, pitch, speed
const SCRIPT = [...EP.setup, EP.panic, EP.scoldA, EP.scoldB, EP.object, EP.back, EP.saza, ...EP.read, EP.try1, EP.try2, EP.chup, EP.fourth, EP.sweet];

// The shared episode shape (see episodes.mjs). Every beat is linked by BUT / THEREFORE.
function build(dur) {
  const lines = [], voice = [], events = [], hits = [], whacks = [], shakes = [], camera = [];
  const faces = { ayesha: [], hamza: [], zain: [], sara: [] };
  const face = (who, t, f) => { if (faces[who]) faces[who].push({ t, f }); };
  let t = 0;
  const say = (L, pause = 0.45, overlap = 0) => {
    const d = dur[L.id] || 1.6;
    t -= overlap;
    lines.push({ ...L, t, d, name: NAMES[L.who] }); voice.push({ t, file: path.join(TMP, L.id + '.wav'), gain: L.id === 'object' || L.id === 'back' ? 0.85 : 1 });
    const start = t; t += d + pause; return start;
  };
  const hold = (secs) => { t += secs; };
  const cam = (tt, shot, zoom, move = 0.5, extra = {}) => camera.push({ t: tt, shot, zoom, move, ...extra });
  const whack = (tt, y = 1150, big = 1) => { whacks.push({ t: tt, y }); events.push({ t: tt, type: 'whack', gain: big }); hits.push({ t: tt, zoom: 0.06 * big, shake: 18 * big }); };
  const others = (...ex) => ['hamza', 'zain', 'sara'].filter((w) => !ex.includes(w));

  for (const w of Object.keys(faces)) face(w, 0, 'smile');
  // 1. The table. (Room 1 pushes onto the tiny burger.)
  cam(0, 'wide', 1, 0); hold(0.8);
  if (NUM === '1') { cam(t, 'plate', 2.4, 1.1, { cx: 590, cy: 1430 }); events.push({ t, type: 'whoosh', dur: 0.5, gain: 0.35 }); hold(1.5); }
  // 2. The problem, with its prop.
  const menu = { t: 0, until: 0, holder: EP.holder, label: EP.prop.label, html: EP.prop.html };
  EP.setup.forEach((L, i) => {
    if (L.who === 'waiter') { cam(t, 'wide', 1, 0.5); events.push({ t, type: 'pop', gain: 0.5 }); for (const w of ['hamza', 'zain', 'sara']) face(w, t, 'awe'); }
    else { cam(t, L.who, 1.8, i ? 0.4 : 0.6); face(L.who, t, i ? 'explaining' : 'suspicious'); }
    if (i === 0 && EP.holder) { menu.t = t + 0.25; events.push({ t: t + 0.3, type: 'pop', gain: 0.9 }); }
    const s = say(L, 0.45);
    for (const w of others(L.who)) if (w !== EP.holder || i) face(w, s + 0.6, 'awe');
  });
  menu.until = t;
  // 3. BUT Ayesha has gone very quiet.
  cam(t, 'wide', 1, 0.6); face('ayesha', t, 'blank'); face(EP.panicker, t + 0.3, 'concernedFear'); hold(0.8);
  cam(t, 'ayesha', 1.9, 0.9); face('ayesha', t + 0.3, 'serious'); events.push({ t, type: 'riser', dur: 1.4, gain: 0.5 }); hold(1.3);
  // 4. THEREFORE: glasses. Bell, flash, chalk puff, classroom.
  const tr = { t, until: 0 };
  events.push({ t: t - 0.25, type: 'bell' }); face('ayesha', t, 'madam:rage'); events.push({ t, type: 'impact', big: 1 }); hits.push({ t, zoom: 0.08, shake: 20, flash: true });
  for (const w of ['hamza', 'zain', 'sara']) face(w, t + 0.35, w === 'sara' ? 'concernedFear' : 'fear');
  hold(1.1);
  // 5. Someone panics.
  cam(t, EP.panicker, 2.0, 0.45); shakes.push({ who: EP.panicker, t, d: (dur.panic || 1.5) + 0.4 }); events.push({ t, type: 'whoosh', dur: 0.4, gain: 0.45 });
  say(EP.panic, 0.45);
  // 6. BUT it's too late: Madam scolds the one who messed up.
  cam(t, 'ayesha', 2.1, 0.45); whack(t + 0.25, 1180); hold(0.45);
  face('ayesha', t, 'madam:veryAngry');
  say(EP.scoldA, 0.35);
  cam(t, EP.victim, 2.0, 0.35); face(EP.victim, t, 'fear'); events.push({ t: t + 0.2, type: 'pop', gain: 0.5 }); hold(0.7);
  cam(t, 'ayesha', 2.2, 0.3);
  const coldStart = t - 0.1;
  say(EP.scoldB, 0.25);
  // 7. THEREFORE the punishment.
  cam(t, 'wide', 1, 0.55); face(EP.victim, t, 'hectic');
  const stand = { who: EP.victim, kind: EP.punish, t: t + 0.2, until: 0 };
  events.push({ t: t + 0.2, type: 'whoosh', dur: 0.35, gain: 0.5 }); events.push({ t: t + 0.7, type: 'impact', big: 0.35 });
  hold(1.4);
  const coldEnd = t;
  // 8. BUT someone objects. THEREFORE the glare. They back off.
  cam(t, EP.objector, 2.0, 0.5); face(EP.objector, t, 'concernedFear');
  say(EP.object, 0.35);
  cam(t, 'ayesha', 2.1, 0.4); face('ayesha', t, 'madam:suspicious'); events.push({ t: t + 0.15, type: 'pop', gain: 0.6 }); hold(1.0);
  cam(t, EP.objector, 2.0, 0.35); face(EP.objector, t, 'fear');
  say(EP.back, 0.45);
  // 9. THEREFORE the "saza": the riddle.
  cam(t, 'ayesha', 2.0, 0.4); face('ayesha', t, 'madam:explaining'); whack(t + 0.2, 1180, 0.9); hold(0.3);
  say(EP.saza, 0.3);
  const boards = [];
  const tickFrom = t + 0.4;
  EP.read.forEach((L, i) => {
    cam(t, 'wide', 1, 0.55);
    const rd = riddles[i] || riddles[0];
    const b = { t, until: 0, write: 2.0, over: riddles.length > 1 ? `Aakhri sawal ${i + 1}/${riddles.length}` : 'Saza · Aaj ka sawal', q: rd.h, pattern: rd.pattern, note: rd.b };
    if (boards.length) boards[boards.length - 1].until = t;
    boards.push(b);
    events.push({ t: t + 0.1, type: 'impact', big: 0.7 }); events.push({ t: t + 0.45, type: 'chalk', dur: 2.0 }); hits.push({ t: t + 0.1, zoom: 0.03, shake: 10 });
    for (const w of ['hamza', 'zain', 'sara']) face(w, t, i % 2 ? 'concernedFear' : 'suspicious');
    hold(0.5);
    say(L, 0.2);
    events.push({ t: b.t + 2.6, type: 'scribble' }); events.push({ t: b.t + 2.9, type: 'lock', gain: 0.6 });
    hold(1.5);
  });
  // 10. The friends try; the second one gets cut off.
  const [a1, a2] = EP.solvers;
  cam(t, a1, 1.9, 0.5); face(a1, t, 'explaining');
  say(EP.try1, 0.35);
  cam(t, a2, 1.9, 0.35); face(a2, t, 'smileBig');
  say(EP.try2, 0, 0.35);
  cam(t, 'ayesha', 2.2, 0.15); whack(t, 1180, 1.1); face('ayesha', t, 'madam:angryWithFang'); face(a2, t + 0.1, 'fear'); shakes.push({ who: a2, t: t + 0.1, d: 1.0 });
  say(EP.chup, 0.35);
  boards[boards.length - 1].until = t;
  const tickTo = t;
  // 11. The fourth wall.
  cam(t, 'ayesha', 2.6, 0.7, { face: true }); face('ayesha', t, 'madam:serious'); events.push({ t, type: 'riser', dur: 0.7, gain: 0.3 });
  hold(0.4);
  say(EP.fourth, 0.5);
  // 12. Frozen table. 13. Glasses off.
  cam(t, 'wide', 1, 0.6); hold(0.9);
  tr.until = t; stand.until = t;
  events.push({ t, type: 'whoosh', dur: 0.4, gain: 0.45 }); face('ayesha', t, 'smile');
  for (const w of ['hamza', 'zain', 'sara']) face(w, t + 0.15, 'blank');
  cam(t + 0.2, 'ayesha', 1.8, 0.6); hold(0.9);
  face('ayesha', t, 'lovingGrin1');
  say(EP.sweet, 0.5);
  cam(t, 'wide', 1, 0.6); hold(0.5); events.push({ t, type: 'bell', gain: 0.35 }); hold(0.5);
  // 14. End card.
  const ctaAt = t; events.push({ t, type: 'impact', big: 0.4 }); hold(2.2);
  const len = t;
  for (const k of Object.keys(faces)) faces[k].sort((x, y) => x.t - y.t);
  camera.sort((x, y) => x.t - y.t);
  return {
    len, voice, events, tick: [[tickFrom, tickTo]], coldStart, coldEnd, ctaAt,
    tl: { lines, faces, camera, hits, whacks, shakes, menu, transform: tr, boards, stand, burger: NUM === '1',
      tag: ['Madam ki Class', EP.room], headline: EP.headline, rewindText: '10 second pehle...', cta: EP.cta },
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
