// ── Shared helpers (build-workflow.mjs puts this at the top of every Code node) ──
const fs = require('fs');
// calendar.json covers days 1–100 from START_DATE; calendar-2.json the next 100 days, and so on.
const CALENDAR_DIR = '/repo/social/content';
function readCalendars() {
  const files = fs.readdirSync(CALENDAR_DIR).filter((f) => /^calendar(-\d+)?\.json$/.test(f))
    .sort((a, b) => (Number((a.match(/-(\d+)/) || [0, 1])[1])) - (Number((b.match(/-(\d+)/) || [0, 1])[1])));
  const first = JSON.parse(fs.readFileSync(CALENDAR_DIR + '/calendar.json', 'utf8'));
  const posts = [];
  files.forEach((f) => {
    const num = Number((f.match(/-(\d+)\.json$/) || [0, 1])[1]); // calendar.json = 1, calendar-2.json = 2…
    const cal = num === 1 ? first : JSON.parse(fs.readFileSync(CALENDAR_DIR + '/' + f, 'utf8'));
    const offset = (num - 1) * 100; // each file is a 100-day block, placed by its number, not its position
    for (const p of cal.posts) posts.push(Object.assign({}, p, { day: p.day + offset, part: num }));
  });
  // series-*.json: extra runs (e.g. the Khana kahan? sitcom) whose posts carry their own absolute
  // day and land on days the calendar leaves free (check-calendar.mjs refuses clashes).
  fs.readdirSync(CALENDAR_DIR).filter((f) => /^series-[a-z0-9-]+\.json$/.test(f)).forEach((f) => {
    const ser = JSON.parse(fs.readFileSync(CALENDAR_DIR + '/' + f, 'utf8'));
    for (const p of ser.posts) posts.push(Object.assign({}, p, { part: 0, series: f }));
  });
  posts.sort((a, b) => a.day - b.day);
  return { defaultStart: first.defaultStart, posts };
}
const STATE = '/files/state.json';   // what has been posted, the current Instagram token
const LOG = '/files/log/posts.csv';  // one line per attempt, human-readable
const MAX_ATTEMPTS = 3;              // per post per day, then give up and alert

// A damaged state.json is set aside (never silently lost) and reported through STATE_PROBLEM; the
// caption check in Publish still prevents double posts while the history is gone.
let STATE_PROBLEM = '';
function readState() {
  if (!fs.existsSync(STATE)) return {};
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) {
    const aside = STATE + '.broken-' + Date.now();
    try { fs.renameSync(STATE, aside); } catch (err) { /* ignore */ }
    STATE_PROBLEM = `state.json could not be read (${e.message}); it was moved to ${aside} and a fresh one started.`;
    return {};
  }
}
function writeState(s) {
  fs.writeFileSync(STATE + '.tmp', JSON.stringify(s, null, 2));
  fs.renameSync(STATE + '.tmp', STATE);
}
function logLine(fields) {
  fs.mkdirSync('/files/log', { recursive: true });
  if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, 'time,n,id,status,detail\n');
  const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ') + '"';
  fs.appendFileSync(LOG, [DateTime.now().setZone('Asia/Karachi').toISO(), ...fields].map(cell).join(',') + '\n');
}
const isTrue = (v) => /^(1|true|yes|on)$/i.test(String(v ?? '').trim());
const dryRun = () => $env.MENVA_DRY_RUN === undefined || $env.MENVA_DRY_RUN === '' ? true : isTrue($env.MENVA_DRY_RUN);

// Form-encode parameters by hand (no URLSearchParams in n8n's Code sandbox).
const formBody = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null)
  .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');
// One Graph API call. POST parameters go in a form body (captions can be long; URLs have limits),
// GET parameters in the query string. Returns { statusCode, body }.
async function graphCall(helpers, base, token, method, path, params) {
  const all = Object.assign({}, params, { access_token: token });
  const opts = { method, url: base + path, json: true, timeout: 60000, returnFullResponse: true, ignoreHttpStatusErrors: true };
  if (method === 'GET') opts.qs = all;
  else { opts.body = formBody(all); opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; opts.json = false; }
  const r = await helpers.httpRequest(opts);
  let body = r.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { /* leave as text */ } }
  return { statusCode: r.statusCode, body };
}

// Phone alert through ntfy.sh, only if NTFY_TOPIC is set. Never throws.
async function notify(helpers, title, message, click, extra) {
  const topic = ($env.NTFY_TOPIC || '').trim();
  if (!topic) return;
  try {
    await helpers.httpRequest({
      method: 'POST', url: 'https://ntfy.sh/' + encodeURIComponent(topic), body: message,
      headers: Object.assign({ Title: title, 'Content-Type': 'text/plain' }, click ? { Click: click } : {}, extra || {}),
    });
  } catch (e) { /* alerts are best-effort */ }
}
// The content rules from check-calendar.mjs, for posts the server writes itself (trend posts).
// Returns a list of problems; empty means OK.
const TREND_LAYOUTS = ['statement', 'shout', 'chat', 'notes', 'receipt', 'note', 'list'];
function checkPostText(p) {
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
  if (slides.length !== 1 || !TREND_LAYOUTS.includes(slides[0].layout) || !slides[0].h) probs.push('needs one text slide with a headline');
  if (slides[0] && (slides[0].dish || slides[0].dishes)) probs.push('trend posts are text-only');
  return probs;
}
// ── end of shared helpers ──
