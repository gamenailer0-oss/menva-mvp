// ── Shared helpers (build-workflow.mjs puts this at the top of every Code node) ──
const fs = require('fs');
// calendar.json covers days 1–100 from START_DATE; calendar-2.json the next 100 days, and so on.
const CALENDAR_DIR = '/repo/social/content';
function readCalendars() {
  const files = fs.readdirSync(CALENDAR_DIR).filter((f) => /^calendar(-\d+)?\.json$/.test(f))
    .sort((a, b) => (Number((a.match(/-(\d+)/) || [0, 1])[1])) - (Number((b.match(/-(\d+)/) || [0, 1])[1])));
  const first = JSON.parse(fs.readFileSync(CALENDAR_DIR + '/calendar.json', 'utf8'));
  const posts = [];
  files.forEach((f, i) => {
    const cal = i === 0 ? first : JSON.parse(fs.readFileSync(CALENDAR_DIR + '/' + f, 'utf8'));
    const offset = i * 100; // each file is a 100-day block
    for (const p of cal.posts) posts.push(Object.assign({}, p, { day: p.day + offset, part: i + 1 }));
  });
  return { defaultStart: first.defaultStart, posts };
}
const STATE = '/files/state.json';   // what has been posted, the current Instagram token
const LOG = '/files/log/posts.csv';  // one line per attempt, human-readable
const MAX_ATTEMPTS = 3;              // per post per day, then give up and alert

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; }
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

// Phone alert through ntfy.sh, only if NTFY_TOPIC is set. Never throws.
async function notify(helpers, title, message, click) {
  const topic = ($env.NTFY_TOPIC || '').trim();
  if (!topic) return;
  try {
    await helpers.httpRequest({
      method: 'POST', url: 'https://ntfy.sh/' + encodeURIComponent(topic), body: message,
      headers: Object.assign({ Title: title, 'Content-Type': 'text/plain' }, click ? { Click: click } : {}),
    });
  } catch (e) { /* alerts are best-effort */ }
}
// ── end of shared helpers ──
