// MENVA autoposter, GitHub Actions edition. Runs every 15 minutes (see .github/workflows/menva-social.yml).
//   node social/actions/autopost.mjs --check   decide if there is anything to post now (no browser needed);
//                                              also applies Stop / Post-now taps from the phone
//   node social/actions/autopost.mjs           render + publish today's post (and its Story)
// Same behaviour as the n8n server version: posts after POST_TIME on calendar days, never twice,
// retries up to 3 times a day, refreshes the Instagram token weekly, alerts the phone on everything.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {
  ROOT, DATA, env, isTrue, dryRun, MAX_ATTEMPTS, sleep, pkNow, addDays, readCalendars, readState, writeState, STATE_PROBLEM,
  logLine, commitData, mediaUrl, repoFileUrl, notify, controlTopic, graphClient,
} from './lib.mjs';

const CHECK = process.argv.includes('--check');
const now = pkNow();
const cal = readCalendars();
const state = readState();
let changed = false;

const startIso = env('START_DATE', cal.defaultStart);
if (!/^\d{4}-\d{2}-\d{2}$/.test(startIso)) throw new Error(`START_DATE "${startIso}" is not a date like 2026-10-05`);
const dateOf = (p) => addDays(startIso, p.day - 1);

if (STATE_PROBLEM) { logLine(['', '', 'state-recovered', STATE_PROBLEM]); await notify('MENVA: posting history was reset', STATE_PROBLEM); changed = true; }

// 1. Stop / Post-now taps from the phone arrive as messages on the private control topic.
if (controlTopic() && (state.trendQueue || []).length) {
  try {
    const base = env('NTFY_BASE', 'https://ntfy.sh').replace(/\/$/, '');
    const txt = await (await fetch(`${base}/${encodeURIComponent(controlTopic())}/json?poll=1&since=12h`)).text();
    for (const line of txt.split('\n').filter(Boolean)) {
      let m; try { m = JSON.parse(line); } catch (e) { continue; }
      const [what, id, token] = String(m.message || '').trim().split(/\s+/);
      const item = (state.trendQueue || []).find((t) => t.post.id === id && t.token === token);
      if (!item || item.posted) continue;
      if (what === 'stop' && !item.stopped) { item.stopped = now.iso; changed = true; logLine(['', id, 'trend-stopped', item.trend]); }
      if (what === 'now' && !item.stopped && !item.approved) { item.approved = now.iso; changed = true; logLine(['', id, 'trend-approved', item.trend]); }
    }
  } catch (e) { console.log('control topic check failed:', e.message); }
}

// 2. Once, after the last calendar day: say so instead of going quiet.
const last = cal.posts.filter((p) => p.part > 0).pop();
if (last && now.date > dateOf(last) && !state.endedAlerted) {
  state.endedAlerted = now.date; changed = true;
  logLine(['', '', 'calendar-ended', 'last post was ' + dateOf(last)]);
  await notify('MENVA: the content calendar has ended', `The last post (#${last.n}, ${dateOf(last)}) has gone out. Add social/content/calendar-${last.part + 1}.json to keep posting.`);
}

// 3. What to post now?
const attemptsOf = (id) => ((state.attempts || {})[id + '@' + now.date]) || 0;
const done = (id) => dryRun() ? !!(state.dry && state.dry[id]) : !!(state.posted && state.posted[id]);
let job = null;
// A trend post is news: drop it if it is more than 6 hours past its time (e.g. queued while in test mode).
const fresh = (t) => now.ms - Date.parse(t.due) < 6 * 3600000;
const trend = (state.trendQueue || []).find((t) => !t.stopped && !t.posted && fresh(t) && (t.approved || Date.parse(t.due) <= now.ms) && !done(t.post.id));
if (trend && attemptsOf(trend.post.id) < MAX_ATTEMPTS) {
  const tp = trend.post;
  job = { n: 0, id: tp.id, format: 'single', trend: true, caption: [tp.caption, (tp.hashtags || []).join(' ')].filter(Boolean).join('\n\n'), alt: tp.alt || '', slides: tp.slides };
} else {
  // Several posts can share a day (a daytime meme and the 8:30 pm Reel): take the earliest one still due.
  const timeOf = (p) => String(p.time || env('POST_TIME', '20:30'));
  const todays = cal.posts.filter((p) => dateOf(p) === now.date && !done(p.id)).sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
  for (const post of todays) {
    const [hh, mm] = timeOf(post).split(':').map(Number);
    const due = now.hh > hh || (now.hh === hh && now.mm >= mm);
    if (due && attemptsOf(post.id) >= MAX_ATTEMPTS) {
      const k = post.id + '@' + now.date;
      state.gaveUp = state.gaveUp || {};
      if (!state.gaveUp[k]) {
        state.gaveUp[k] = true; changed = true;
        logLine([post.n, post.id, 'gave-up', `${MAX_ATTEMPTS} failed attempts today`]);
        await notify(`MENVA: post #${post.n} did not go out today`, `It failed ${MAX_ATTEMPTS} times, so it was skipped. The calendar carries on tomorrow. Open the repository's Actions tab for the reason.`);
      }
    } else if (due) {
      job = { n: post.n, id: post.id, format: post.format, prelaunch: post.day < 1, video: post.video || null, caption: [post.caption, (post.hashtags || []).join(' ')].filter(Boolean).join('\n\n'), alt: post.alt || '', slides: post.slides };
      break;
    }
  }
}

if (CHECK) {
  if (changed) { writeState(state); commitData('autopost: phone taps and notices'); }
  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, `work=${job ? 'true' : 'false'}\n`);
  console.log(job ? `Due now: ${job.id}` : 'Nothing to post right now.');
  process.exit(0);
}
if (!job) { if (changed) { writeState(state); commitData('autopost: notices'); } console.log('Nothing to post right now.'); process.exit(0); }

const handle = env('IG_HANDLE');
const live = !dryRun();
const stamp = now.iso.replace(/[-:T]/g, '').slice(0, 14);
const base = `${String(job.n).padStart(3, '0')}-${job.id}`;

// 4. Count the attempt first, so a post that keeps crashing stops after 3 tries today.
state.attempts = state.attempts || {};
state.attempts[job.id + '@' + now.date] = attemptsOf(job.id) + 1;
const weekAgo = addDays(now.date, -7);
for (const k of Object.keys(state.attempts)) if ((k.split('@')[1] || '') < weekAgo) delete state.attempts[k];

// 5. Render the slides (and the Story) with the same templates the server version uses.
const MEDIA = path.join(DATA, 'media');
fs.mkdirSync(MEDIA, { recursive: true });
for (const f of fs.readdirSync(MEDIA)) { const st = fs.statSync(path.join(MEDIA, f)); if (Date.now() - st.mtimeMs > 30 * 86400000) fs.unlinkSync(path.join(MEDIA, f)); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = u.startsWith('/media/') ? path.join(MEDIA, u.slice(7)) : path.join(ROOT, u);
  if (!(file.startsWith(ROOT) || file.startsWith(MEDIA)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const local = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch(env('CHROMIUM_PATH') ? { executablePath: env('CHROMIUM_PATH') } : {});
const page = await browser.newPage();
async function shoot(url, w, h, file) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(url);
  await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 30000 });
  const err = await page.evaluate(() => window.__error);
  if (err) throw new Error('Slide could not be drawn: ' + err);
  await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
}
const files = [];
try {
  for (const [i, s] of job.slides.entries()) {
    const f = `${base}-${i + 1}-${stamp}.jpg`;
    const d = Buffer.from(JSON.stringify({ handle, ...s }), 'utf8').toString('base64url');
    await shoot(`${local}/social/templates/post.html?d=${d}`, 1080, s.tall ? 1920 : 1350, path.join(MEDIA, f));
    files.push(f);
  }
  var storyFile = null;
  if (!/^(0|false|no|off)$/i.test(env('STORIES', 'true')) && !(job.format === 'reel' && /^notify$/i.test(env('REELS_MODE')))) {
    storyFile = `${base}-1-${stamp}-story.jpg`;
    const qs = new URLSearchParams({ img: '/media/' + files[0], n: job.trend || job.prelaunch ? '' : String(job.n), handle });
    try { await shoot(`${local}/social/templates/story.html?${qs}`, 1080, 1920, path.join(MEDIA, storyFile)); } catch (e) { logLine([job.n, job.id, 'story-render-failed', e.message]); storyFile = null; }
  }
} finally { await browser.close(); server.close(); }

// 6. Publish the images (commit + push), so Instagram can download them from a public URL.
state.lock = { id: job.id, at: now.iso };
writeState(state);
const sha = commitData(`autopost: images for ${job.id}`);
const images = files.map((f) => mediaUrl(sha, 'media/' + f));
const storyUrl = storyFile ? mediaUrl(sha, 'media/' + storyFile) : null;
if (!isTrue(env('MENVA_NO_PUSH'))) await sleep(5000); // let the CDN see the new commit

function finish(msg) { delete state.lock; writeState(state); commitData(msg); }

if (!live) {
  state.dry = state.dry || {};
  state.dry[job.id] = { at: now.iso, images };
  logLine([job.n, job.id, 'dry-run', images.join(' ')]);
  finish(`autopost: dry run ${job.id}`);
  await notify(`MENVA test image ready (${job.id})`, `Nothing was posted (dry run). Open to check:\n${images.join('\n')}`, images[0]);
  process.exit(0);
}

// Reels by hand (REELS_MODE=notify): send the video to the phone instead of posting.
if (job.format === 'reel' && /^notify$/i.test(env('REELS_MODE'))) {
  const v = repoFileUrl(job.video);
  state.posted = state.posted || {};
  state.posted[job.id] = { at: now.iso, manual: true, video: v, n: job.n };
  logLine([job.n, job.id, 'reel-sent-to-phone', v]);
  finish(`autopost: ${job.id} sent to phone`);
  await notify(`MENVA: Reel ready to post (${job.id.replace(/^reel-/, '')})`, `Open the link, save the video, post it as a Reel with a trending sound, and paste this caption:\n\n${job.caption}`, v);
  process.exit(0);
}

// 7. Instagram.
const envToken = env('IG_ACCESS_TOKEN');
if (!envToken && !(state.token && state.token.value)) throw new Error('The IG_ACCESS_TOKEN secret is empty: see social/actions/README.md step 3');
const tag = envToken.slice(-12);
if (envToken && (!state.token || state.token.fromEnv !== tag)) state.token = { value: envToken, fromEnv: tag, refreshedAt: now.iso };
const tokenRef = { value: state.token.value };
const graph = graphClient(tokenRef);
if ((Date.now() - Date.parse(state.token.refreshedAt || 0)) / 86400000 > 7) {
  try {
    const r = await graph('GET', '/refresh_access_token', { grant_type: 'ig_refresh_token' });
    if (!r.access_token) throw new Error('no token in the answer');
    tokenRef.value = state.token.value = r.access_token; state.token.refreshedAt = now.iso;
  } catch (e) { await notify('MENVA: Instagram token refresh failed', e.message + '\nPosting will still be tried with the current token.'); }
}
let userId = env('IG_USER_ID');
if (!userId) userId = String((await graph('GET', '/me', { fields: 'user_id,username' })).user_id);

const head = job.caption.slice(0, 80);
const recent = await graph('GET', `/${userId}/media`, { fields: 'id,caption,permalink,timestamp', limit: 10 });
const already = (recent.data || []).find((m) => (m.caption || '').slice(0, 80) === head);
if (already) {
  state.posted = state.posted || {};
  state.posted[job.id] = { at: already.timestamp, mediaId: already.id, permalink: already.permalink, n: job.n };
  logLine([job.n, job.id, 'already-on-instagram', already.permalink]);
  finish(`autopost: ${job.id} was already on Instagram`);
  process.exit(0);
}
async function waitReady(id, tries = 24, delay = 5000) {
  for (let i = 0; i < tries; i++) {
    const s = await graph('GET', `/${id}`, { fields: 'status_code,status' });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram could not process the ${job.format === 'reel' ? 'video' : 'image'} (${s.status_code}: ${s.status || ''}).`);
    await sleep(delay);
  }
  throw new Error('Instagram took too long to process it; it will be retried in 15 minutes.');
}
let creationId;
if (job.format === 'reel') {
  const c = await graph('POST', `/${userId}/media`, { media_type: 'REELS', video_url: repoFileUrl(job.video), cover_url: images[0], caption: job.caption, share_to_feed: 'true' });
  creationId = c.id; await waitReady(creationId, 60, 10000);
} else if (images.length === 1) {
  let c;
  try { c = await graph('POST', `/${userId}/media`, { image_url: images[0], caption: job.caption, ...(job.alt ? { alt_text: job.alt } : {}) }); } catch (e) {
    if (!job.alt || !/alt_text/i.test(e.message)) throw e;
    c = await graph('POST', `/${userId}/media`, { image_url: images[0], caption: job.caption });
  }
  creationId = c.id; await waitReady(creationId);
} else {
  const kids = [];
  for (const url of images) kids.push((await graph('POST', `/${userId}/media`, { image_url: url, is_carousel_item: 'true' })).id);
  for (const k of kids) await waitReady(k);
  creationId = (await graph('POST', `/${userId}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: job.caption })).id;
  await waitReady(creationId);
}
const published = await graph('POST', `/${userId}/media_publish`, { creation_id: creationId });
let permalink = '';
try { permalink = (await graph('GET', `/${published.id}`, { fields: 'permalink' })).permalink || ''; } catch (e) { /* posted anyway */ }
state.posted = state.posted || {};
state.posted[job.id] = { at: now.iso, mediaId: published.id, permalink, n: job.n };
if (job.trend) { const t = state.trendQueue.find((x) => x.post.id === job.id); if (t) t.posted = now.iso; }
logLine([job.n, job.id, 'posted', permalink || published.id]);
finish(`autopost: posted ${job.id}`);
await notify(job.trend ? 'MENVA posted the trend post' : `MENVA posted #${job.n}`, permalink || 'Posted to Instagram.', permalink);

// 8. The Story teaser. A Story problem never fails the run.
if (storyUrl) {
  try {
    const c = await graph('POST', `/${userId}/media`, { image_url: storyUrl, media_type: 'STORIES' });
    await waitReady(c.id);
    const s = await graph('POST', `/${userId}/media_publish`, { creation_id: c.id });
    logLine([job.n, job.id, 'story-posted', s.id]);
  } catch (e) {
    logLine([job.n, job.id, 'story-failed', e.message]);
    await notify(`MENVA: story for ${job.id} failed`, e.message + '\nThe feed post itself went out.');
  }
  writeState(state); commitData(`autopost: story for ${job.id}`);
}
