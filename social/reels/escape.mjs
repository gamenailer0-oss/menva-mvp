// Turns the "Escape the menu" teasers into Reels, because Instagram only lets an app post sound with a video.
// Each Reel shows the post's frames (4:5 slides on a 9:16 canvas), cut like an editor would: punch-in zooms,
// slide transitions, camera shake on every landing, and sound design from sfx.py (impacts, whooshes, risers,
// a lock click on each riddle, a ticking clock underneath). All synthesised here, so nothing gets muted.
//
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node social/reels/escape.mjs
//     reads  social/content/series-escape.json (each post's "frames" are ordinary post slides)
//     writes social/reels/out/<id>.mp4 and <id>-cover.jpg (the first frame, used for the grid and the Story)
// ffmpeg with libx264: set FFMPEG=/path/to/ffmpeg, or `pip install imageio-ffmpeg`.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { slideUrl } from '../scripts/slide-url.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'social/reels/out');
const TMP = path.join(OUT, '.escape-tmp');
const SERIES = path.join(ROOT, 'social/content/series-escape.json');
let ffmpeg = process.env.FFMPEG;
if (!ffmpeg) { try { ffmpeg = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim(); } catch { ffmpeg = 'ffmpeg'; } }

const BG = { paper: '#EFEBE2', sand: '#E3DCCF', white: '#FFFFFF', chili: '#B5371F', ink: '#1A1714' };
// Seconds on screen: the problem is a quick read, a riddle needs time.
const holdFor = (s) => (s.layout === 'riddle' ? 8 : 4);

const cal = JSON.parse(fs.readFileSync(SERIES, 'utf8'));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
fs.mkdirSync(TMP, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

// The 4:5 slide, centred on a 9:16 canvas in the slide's own background colour.
async function frame(slide, file) {
  const bg = BG[slide.bg || 'paper'];
  await page.setContent(`<html><body style="margin:0;width:1080px;height:1920px;background:${bg};display:flex;align-items:center;justify-content:center">
    <iframe src="${slideUrl(base, { handle: cal.handle, ...slide })}" style="border:0;width:1080px;height:1350px"></iframe></body></html>`);
  const f = page.frames()[1];
  await f.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 20000 });
  const err = await f.evaluate(() => window.__error);
  if (err) throw new Error(err);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
}

const TR = 0.35; // transition length: a fast slide, like an editor's cut
const FPS = 30;

// The edit, as an editor would cut it: every frame lands with a punch-in, a camera shake and an impact;
// the clock stops (suck) and a riser builds just before each cut; a whoosh carries the slide across;
// a riddle frame clicks in with a lock sound. The ticking clock and heartbeat run underneath.
function timeline(holds, frames) {
  const events = [{ t: 0.02, type: 'impact', big: 1.0 }];
  const lands = [0];
  let at = 0;
  holds.forEach((h, i) => {
    if (!i) { at = h; return; }
    const start = at - TR;                 // xfade starts here
    const land = at;                        // and has fully landed here
    events.push({ t: start - 0.45, type: 'suck', dur: 0.45 + TR + 0.15 });
    events.push({ t: start, type: 'riser', dur: 1.3 });
    events.push({ t: start + TR / 2, type: 'whoosh', dur: 0.7 });
    events.push({ t: land, type: 'impact', big: 1.0 });
    if (frames[i].layout === 'riddle') events.push({ t: land + 0.35, type: 'lock' });
    lands.push(land);
    at = land + h - TR;
  });
  if (frames[0].layout === 'riddle') events.push({ t: 0.4, type: 'lock' });
  const len = at;
  events.push({ t: len - 0.9, type: 'end' });
  return { len, events, lands };
}

// Camera shake after each landing: a few pixels, decaying in a quarter second.
const shake = (lands, axis) => lands.map((c) =>
  `if(between(t,${c.toFixed(3)},${(c + 0.3).toFixed(3)}),${axis === 'x' ? 14 : 10}*sin((t-${c.toFixed(3)})*${axis === 'x' ? 95 : 77})*exp(-(t-${c.toFixed(3)})*14),0)`).join('+');

for (const p of cal.posts) {
  const frames = p.frames || [];
  if (!frames.length) continue;
  const files = [];
  for (const [i, s] of frames.entries()) { const f = path.join(TMP, `${p.id}-${i + 1}.jpg`); await frame(s, f); files.push(f); }
  const holds = frames.map(holdFor);
  const tl = timeline(holds, frames);
  const wav = path.join(TMP, p.id + '.wav');
  execFileSync('python3', [path.join(ROOT, 'social/reels/sfx.py'), JSON.stringify({ len: tl.len, events: tl.events }), wav]);

  // Each frame: a punch-in that settles in 8 frames, then a slow push for the rest of the hold.
  const inputs = files.flatMap((f) => ['-loop', '1', '-framerate', String(FPS), '-i', f]);
  let chain = '';
  files.forEach((_, i) => {
    const n = Math.round(holds[i] * FPS);
    chain += `[${i}:v]scale=2160:3840,zoompan=z='if(lt(on,8),1.12-0.015*on,1+0.0009*(on-8))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${n}:s=1080x1920:fps=${FPS},trim=end_frame=${n},setpts=PTS-STARTPTS,fps=${FPS}[f${i}];`;
  });
  let last = '[f0]', off = 0;
  for (let i = 1; i < files.length; i++) {
    off += holds[i - 1] - TR;
    const tr = frames[i].layout === 'riddle' && frames[i - 1].layout === 'riddle' ? 'slideup' : 'slideleft';
    chain += `${last}[f${i}]xfade=transition=${tr}:duration=${TR}:offset=${off.toFixed(3)}[x${i}];`;
    last = `[x${i}]`;
  }
  chain += `${last}crop=w=1044:h=1856:x='18+${shake(tl.lands, 'x')}':y='32+${shake(tl.lands, 'y')}',scale=1080:1920,setsar=1,format=yuv420p[v]`;
  const mp4 = path.join(OUT, p.id + '.mp4');
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', ...inputs, '-i', wav,
    '-filter_complex', chain, '-map', '[v]', '-map', `${files.length}:a`, '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', mp4]);
  // The cover is the first frame on its own at 4:5, so the profile grid shows the whole slide.
  await page.setViewportSize({ width: 1080, height: 1350 });
  await page.goto(slideUrl(base, { handle: cal.handle, ...frames[0] }));
  await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 20000 });
  await page.screenshot({ path: path.join(OUT, p.id + '-cover.jpg'), type: 'jpeg', quality: 92 });
  await page.setViewportSize({ width: 1080, height: 1920 });
  console.log(`${p.id}.mp4  ${tl.len.toFixed(1)} s  ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB`);
}
await browser.close();
server.close();
fs.rmSync(TMP, { recursive: true, force: true });
