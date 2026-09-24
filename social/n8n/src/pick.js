// Pick today's post from the calendar.
// Scheduled runs (every 15 min): only after POST_TIME, only if today's post isn't done yet.
// "Run now (test)": today's post if there is one, otherwise the next upcoming post — and a
// test run of a future post is always a dry run, so nothing is ever published early.
const manual = $('Run now (test)').isExecuted;
const cal = JSON.parse(fs.readFileSync(CALENDAR, 'utf8'));
const state = readState();

const zone = 'Asia/Karachi';
const now = DateTime.now().setZone(zone);
const today = now.toISODate();
const startIso = ($env.MENVA_START_DATE || cal.defaultStart || '').trim();
const start = DateTime.fromISO(startIso, { zone });
if (!start.isValid) throw new Error('START_DATE "' + startIso + '" is not a date like 2026-10-05 — fix it in .env');

const dateOf = (p) => start.plus({ days: p.day - 1 }).toISODate();
const [hh, mm] = String($env.MENVA_POST_TIME || '20:30').split(':').map(Number);
const postTime = now.set({ hour: hh || 0, minute: mm || 0, second: 0, millisecond: 0 });

let post = cal.posts.find((p) => dateOf(p) === today);
let test = false;
if (manual && !post) {
  post = cal.posts.find((p) => dateOf(p) > today);
  test = true;
}
if (!post) return []; // rest day (5 posts a week) or the calendar has ended

const live = !dryRun() && !test;
const done = live ? state.posted && state.posted[post.id] : state.dry && state.dry[post.id];
const attempts = ((state.attempts || {})[post.id + '@' + today]) || 0;

if (!manual) {
  if (now < postTime) return [];
  if (done) return [];
  if (attempts >= MAX_ATTEMPTS) return [];
} else if (live && state.posted && state.posted[post.id]) {
  return [{ json: { skip: true, reason: 'Already posted: ' + state.posted[post.id].permalink } }];
}

return [{
  json: {
    n: post.n, id: post.id, date: dateOf(post), format: post.format,
    caption: [post.caption, (post.hashtags || []).join(' ')].filter(Boolean).join('\n\n'),
    alt: post.alt || '',
    slides: post.slides.map((s) => Object.assign({ handle: $env.MENVA_IG_HANDLE || '' }, s)),
    live, test, manual, attempt: attempts + 1,
  },
}];
