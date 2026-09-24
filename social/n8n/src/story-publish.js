// Publish the Story. A Story problem never fails the run: the feed post is what matters,
// so it only logs and alerts.
const p = $("Pick today's post").first().json;
const s = $('Build story request').first().json;
const helpers = this.helpers;
const ok = fs.existsSync(s.filePath) && fs.statSync(s.filePath).size > 1000;
if (!ok) {
  logLine([p.n, p.id, 'story-render-failed', s.renderUrl]);
  await notify(helpers, `MENVA: story for #${p.n} not made`, 'The feed post is fine; only the Story image failed to render.');
  return [{ json: { story: 'render-failed' } }];
}
if (!p.live) { logLine([p.n, p.id, 'story-dry-run', s.imageUrl]); return [{ json: { story: 'dry-run', image: s.imageUrl } }]; }

const G = ($env.IG_GRAPH_URL || 'https://graph.instagram.com').replace(/\/$/, '');
const state = readState();
const token = (state.token && state.token.value) || ($env.IG_ACCESS_TOKEN || '').trim();
async function graph(method, path, qs) {
  const r = await helpers.httpRequest({ method, url: G + path, qs: Object.assign({}, qs, { access_token: token }), json: true, timeout: 60000, returnFullResponse: true, ignoreHttpStatusErrors: true });
  if (r.statusCode >= 200 && r.statusCode < 300) return r.body;
  throw new Error(`Instagram ${method} ${path} failed (${r.statusCode}): ${(r.body && r.body.error && r.body.error.message) || JSON.stringify(r.body)}`);
}
try {
  let userId = ($env.IG_USER_ID || '').trim();
  if (!userId) userId = String((await graph('GET', '/me', { fields: 'user_id' })).user_id);
  const c = await graph('POST', `/${userId}/media`, { image_url: s.imageUrl, media_type: 'STORIES' });
  for (let i = 0; i < 20; i++) {
    const st = await graph('GET', `/${c.id}`, { fields: 'status_code' });
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error('Instagram could not process the Story image (' + st.status_code + ')');
    await new Promise((r) => setTimeout(r, 5000));
  }
  const pub = await graph('POST', `/${userId}/media_publish`, { creation_id: c.id });
  logLine([p.n, p.id, 'story-posted', pub.id]);
  return [{ json: { story: 'posted', mediaId: pub.id } }];
} catch (e) {
  logLine([p.n, p.id, 'story-failed', e.message]);
  await notify(helpers, `MENVA: story for #${p.n} failed`, e.message + '\nThe feed post itself went out.');
  return [{ json: { story: 'failed', error: e.message } }];
}
