// Shared helpers for the GitHub Actions autoposter (the no-server version of social/n8n).
//
// Where things live while a workflow runs:
//   ./                       the social-automation branch (calendars, templates, dish renders, Reels)
//   ./menva-autopost-data/   the menva-autopost-data branch: state.enc (encrypted posting history + token),
//                            log/posts.csv (readable log) and media/ (finished images Instagram downloads)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA = process.env.MENVA_DATA_DIR || path.join(ROOT, 'menva-autopost-data');
export const DATA_BRANCH = 'menva-autopost-data';
export const env = (k, d = '') => (process.env[k] ?? '').toString().trim() || d;
export const isTrue = (v) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim());
export const dryRun = () => env('DRY_RUN') === '' ? true : isTrue(env('DRY_RUN'));
export const MAX_ATTEMPTS = 3;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Pakistan time ──
const ZONE = 'Asia/Karachi';
export function pkNow() {
  const d = new Date();
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hh: Number(p.hour), mm: Number(p.minute), iso: d.toISOString(), ms: d.getTime() };
}
export const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const weekday = (iso) => new Date(iso + 'T00:00:00Z').toUTCString().slice(0, 3);

// ── Calendars (same rules as social/n8n/src/lib.js) ──
export function readCalendars() {
  const dir = path.join(ROOT, 'social/content');
  const num = (f) => Number((f.match(/-(\d+)\.json$/) || [0, 1])[1]);
  const first = JSON.parse(fs.readFileSync(path.join(dir, 'calendar.json'), 'utf8'));
  const posts = [];
  for (const f of fs.readdirSync(dir).filter((x) => /^calendar(-\d+)?\.json$/.test(x)).sort((a, b) => num(a) - num(b))) {
    const cal = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const p of cal.posts) posts.push({ ...p, day: p.day + (num(f) - 1) * 100, part: num(f) });
  }
  for (const f of fs.readdirSync(dir).filter((x) => /^series-[a-z0-9-]+\.json$/.test(x))) {
    for (const p of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).posts) posts.push({ ...p, part: 0, series: f });
  }
  posts.sort((a, b) => a.day - b.day);
  return { defaultStart: first.defaultStart, posts };
}

// ── State: encrypted, because the data branch of a public repo is public ──
function key() {
  const secret = env('MENVA_SECRET') || env('NTFY_TOPIC') || env('IG_ACCESS_TOKEN');
  if (!secret) throw new Error('No secret to encrypt the posting history with: set NTFY_TOPIC (or MENVA_SECRET) in the repository secrets.');
  return crypto.createHash('sha256').update('menva-state-v1:' + secret).digest();
}
export let STATE_PROBLEM = '';
export function readState() {
  const f = path.join(DATA, 'state.enc');
  if (!fs.existsSync(f)) return {};
  try {
    const buf = Buffer.from(fs.readFileSync(f, 'utf8'), 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'));
  } catch (e) {
    STATE_PROBLEM = 'The posting history could not be read (' + e.message + '; did a secret change?). A fresh one was started; the caption check still prevents double posts.';
    fs.renameSync(f, f + '.unreadable-' + Date.now());
    return {};
  }
}
export function writeState(s) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(s), 'utf8'), c.final()]);
  fs.writeFileSync(path.join(DATA, 'state.enc'), Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64') + '\n');
}
export function logLine(fields) {
  fs.mkdirSync(path.join(DATA, 'log'), { recursive: true });
  const f = path.join(DATA, 'log/posts.csv');
  if (!fs.existsSync(f)) fs.writeFileSync(f, 'time,n,id,status,detail\n');
  const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ') + '"';
  fs.appendFileSync(f, [new Date().toISOString(), ...fields].map(cell).join(',') + '\n');
  console.log('log:', fields.join(' | '));
}

// ── The data branch: commit + push, return the commit SHA (media URLs point at it) ──
const git = (...a) => execFileSync('git', ['-C', DATA, ...a], { encoding: 'utf8' }).trim();
export function commitData(message) {
  if (isTrue(env('MENVA_NO_PUSH'))) return 'local';
  // Safety: only ever commit inside the data branch's own worktree, never the content branch.
  if (!fs.existsSync(path.join(DATA, '.git'))) throw new Error(`${DATA} is not the ${DATA_BRANCH} worktree; refusing to commit.`);
  if (git('symbolic-ref', '--short', 'HEAD') !== DATA_BRANCH) throw new Error(`${DATA} is not on branch ${DATA_BRANCH}; refusing to commit.`);
  git('add', '-A');
  if (!git('status', '--porcelain')) return git('rev-parse', 'HEAD');
  git('-c', 'user.name=MENVA autopost', '-c', 'user.email=autopost@users.noreply.github.com', 'commit', '-q', '-m', message);
  for (let i = 0; i < 4; i++) {
    try { git('push', '-q', 'origin', 'HEAD:' + DATA_BRANCH); return git('rev-parse', 'HEAD'); } catch (e) {
      try { git('pull', '-q', '--rebase', 'origin', DATA_BRANCH); } catch (e2) { /* retry push */ }
      execFileSync('sleep', [String(2 ** (i + 1))]);
    }
  }
  throw new Error('Could not push the ' + DATA_BRANCH + ' branch');
}
// Public URL for a file in the data branch at a commit (jsDelivr serves the right Content-Type).
export function mediaUrl(sha, rel) {
  if (env('MEDIA_BASE')) return env('MEDIA_BASE').replace(/\/$/, '') + '/' + rel;
  const repo = env('GITHUB_REPOSITORY', 'gamenailer0-oss/menva-mvp');
  return `https://cdn.jsdelivr.net/gh/${repo}@${sha}/${rel}`;
}
export function repoFileUrl(rel) {
  if (env('REPO_FILES_BASE')) return env('REPO_FILES_BASE').replace(/\/$/, '') + '/' + rel;
  const repo = env('GITHUB_REPOSITORY', 'gamenailer0-oss/menva-mvp');
  const sha = env('GITHUB_SHA_CONTENT') || execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  return `https://cdn.jsdelivr.net/gh/${repo}@${sha}/${rel}`;
}

// ── Phone alerts (ntfy) ──
export async function notify(title, message, click, extra = {}) {
  const topic = env('NTFY_TOPIC');
  if (!topic) return;
  try {
    const base = env('NTFY_BASE', 'https://ntfy.sh').replace(/\/$/, '');
    // ntfy headers must be plain ASCII; the body carries the full text.
    const h = { Title: title.replace(/[^\x20-\x7e]/g, ''), ...(click ? { Click: click } : {}), ...extra };
    await fetch(`${base}/${encodeURIComponent(topic)}`, { method: 'POST', body: message, headers: h });
  } catch (e) { console.log('alert failed:', e.message); }
}
export const controlTopic = () => env('NTFY_TOPIC') ? env('NTFY_TOPIC') + '-ctl' : '';

// ── Instagram Graph API ──
export function graphClient(tokenRef) {
  const G = env('IG_GRAPH_URL', 'https://graph.instagram.com').replace(/\/$/, '');
  return async function graph(method, p, params = {}) {
    const all = { ...params, access_token: tokenRef.value };
    const qs = new URLSearchParams(Object.entries(all).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v)]));
    const r = method === 'GET'
      ? await fetch(`${G}${p}?${qs}`)
      : await fetch(`${G}${p}`, { method, body: qs, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    let body = await r.text();
    try { body = JSON.parse(body); } catch (e) { /* text */ }
    if (r.ok) return body;
    const err = body && body.error ? body.error : { message: JSON.stringify(body) };
    if (err.code === 190 || /expired|access token/i.test(err.message || '')) throw new Error('Instagram token is expired or invalid: make a new one (social/actions/README.md step 3) and update the IG_ACCESS_TOKEN secret. Instagram said: ' + err.message);
    throw new Error(`Instagram ${method} ${p} failed (${r.status}): ${err.message}${err.error_user_msg ? ' ' + err.error_user_msg : ''}`);
  };
}

// ── Content rules for posts the robot writes itself (trend posts) ──
export const TREND_LAYOUTS = ['statement', 'shout'];
export function checkPostText(p) {
  const probs = [];
  const slides = p.slides || [];
  const text = JSON.stringify([p.caption, p.hashtags, p.alt, slides.map(({ layout, bg, size, ...t }) => t)]);
  if (!p.caption || p.caption.length > 2000) probs.push('caption missing or too long');
  if ((p.hashtags || []).length > 5 || (p.hashtags || []).some((h) => !/^#[\p{L}\p{N}_]+$/u.test(h))) probs.push('bad hashtags');
  if (/\p{Extended_Pictographic}/u.test(text)) probs.push('emoji');
  if (/gaucho/i.test(text)) probs.push('names Gauchos');
  if (/\b(prawns?|skewers?|fajitas?|wraps?)\b/i.test(text)) probs.push('unconfirmed dish name');
  if (/\d\s?cm\b/i.test(text)) probs.push('size in cm');
  if (/\b(PKR|Rs\.?)\s?\d/i.test(text)) probs.push('a price');
  if (/\{\{|\[fill in/i.test(text)) probs.push('placeholder');
  if (/—/.test(text)) probs.push('em dash');
  if (/pehle\s+dekho/i.test(text)) probs.push('says "pehle dekho" (the hunt answer)');
  if (slides.length !== 1 || !TREND_LAYOUTS.includes(slides[0].layout) || !slides[0].h) probs.push('needs one text slide with a headline');
  if (slides[0] && (slides[0].dish || slides[0].dishes)) probs.push('trend posts are text-only');
  return probs;
}
