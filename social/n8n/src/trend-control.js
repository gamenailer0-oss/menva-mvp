// The "Stop it" / "Post now" / preview buttons on a trend alert land here (GET /webhook/menva-trend).
// Each link carries the post id and its one-off token, so nobody else can trigger it.
const q = $input.first().json.query || {};
const state = readState();
const item = (state.trendQueue || []).find((t) => t.post.id === q.id && t.token === q.t);
if (!item) return [{ json: { message: 'This link has expired or is not valid.' } }];
const when = DateTime.fromISO(item.due).setZone('Asia/Karachi').toFormat('ccc HH:mm');
if (q.do === 'stop') {
  if (item.posted || (state.posted && state.posted[item.post.id])) return [{ json: { message: 'Too late: this one has already been posted. Delete it in the Instagram app if needed.' } }];
  item.stopped = DateTime.now().toISO(); writeState(state);
  logLine(['', item.post.id, 'trend-stopped', item.trend]);
  return [{ json: { message: `Stopped. "${item.trend}" will not be posted.` } }];
}
if (q.do === 'now') {
  if (item.stopped) return [{ json: { message: 'This one was stopped earlier, so it stays stopped.' } }];
  item.approved = DateTime.now().toISO(); writeState(state);
  logLine(['', item.post.id, 'trend-approved', item.trend]);
  return [{ json: { message: `Approved. It goes out within 15 minutes.` } }];
}
const s = item.post.slides[0];
return [{ json: { message: `${item.stopped ? 'STOPPED' : 'Queued for ' + when}\n\n${(s.over || '').toUpperCase()}\n${s.h.replace(/\*/g, '')}\n${s.b || ''}\n${s.ru || ''}\n\nCaption:\n${item.post.caption}\n${item.post.hashtags.join(' ')}` } }];
