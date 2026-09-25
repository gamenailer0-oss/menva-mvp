// Publish the rendered images to Instagram (Instagram API with Instagram Login), then record it.
// Dry run: skip Instagram, just report where the images are.
const p = $("Pick today's post").first().json;
const images = $('Build render requests').all().map((i) => i.json.imageUrl);
const helpers = this.helpers;
const state = readState();

if (!p.live) {
  state.dry = state.dry || {};
  state.dry[p.id] = { at: DateTime.now().toISO(), images };
  delete state.lock;
  writeState(state);
  logLine([p.n, p.id, 'dry-run', images.join(' ')]);
  await notify(helpers, `MENVA test image ready (#${p.n})`, `Nothing was posted (dry run). Open to check:\n${images.join('\n')}`, images[0]);
  return [{ json: { dryRun: true, n: p.n, id: p.id, images, caption: p.caption } }];
}

const G = ($env.IG_GRAPH_URL || 'https://graph.instagram.com').replace(/\/$/, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Token: the newest refreshed one we saved, unless a new token was pasted into .env since.
const envToken = ($env.IG_ACCESS_TOKEN || '').trim();
if (!envToken && !(state.token && state.token.value)) throw new Error('IG_ACCESS_TOKEN is empty in .env — see SETUP.md step 6');
const envTag = envToken.slice(-12);
if (!state.token || state.token.fromEnv !== envTag) state.token = { value: envToken, fromEnv: envTag, refreshedAt: null };
let token = state.token.value;

async function graph(method, path, qs) {
  const r = await graphCall(helpers, G, token, method, path, qs);
  if (r.statusCode >= 200 && r.statusCode < 300) return r.body;
  const err = r.body && r.body.error ? r.body.error : { message: JSON.stringify(r.body) };
  if (err.code === 190 || /expired|access token/i.test(err.message || '')) {
    throw new Error('Instagram token is expired or invalid: make a new one (SETUP.md step 6), paste it into .env, then run: docker compose up -d. Instagram said: ' + err.message);
  }
  throw new Error(`Instagram ${method} ${path} failed (${r.statusCode}): ${err.message}${err.error_user_msg ? ' ' + err.error_user_msg : ''}`);
}

// Long-lived tokens last 60 days; refreshing weekly keeps them alive forever.
const ageDays = state.token.refreshedAt ? DateTime.now().diff(DateTime.fromISO(state.token.refreshedAt), 'days').days : 99;
if (ageDays > 7) {
  try {
    const r = await graph('GET', '/refresh_access_token', { grant_type: 'ig_refresh_token' });
    if (r.access_token) { token = r.access_token; state.token.value = token; }
    state.token.refreshedAt = DateTime.now().toISO();
    state.token.expiresInDays = r.expires_in ? Math.round(r.expires_in / 86400) : null;
    writeState(state);
  } catch (e) {
    await notify(helpers, 'MENVA: Instagram token refresh failed', e.message + '\nPosting will still be tried with the current token.');
  }
}

let userId = ($env.IG_USER_ID || '').trim();
if (!userId) userId = String((await graph('GET', '/me', { fields: 'user_id,username' })).user_id);

// Belt and braces against double posts: is this caption already on the profile?
const head = p.caption.slice(0, 80);
const recent = await graph('GET', `/${userId}/media`, { fields: 'id,caption,permalink,timestamp', limit: 10 });
const already = (recent.data || []).find((m) => (m.caption || '').slice(0, 80) === head);
if (already) {
  state.posted = state.posted || {};
  state.posted[p.id] = { at: already.timestamp, mediaId: already.id, permalink: already.permalink, n: p.n };
  delete state.lock;
  writeState(state);
  logLine([p.n, p.id, 'already-on-instagram', already.permalink]);
  return [{ json: { alreadyPosted: true, permalink: already.permalink } }];
}

async function waitReady(id) {
  for (let i = 0; i < 20; i++) {
    const s = await graph('GET', `/${id}`, { fields: 'status_code,status' });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram could not process the image (${s.status_code}: ${s.status || ''}). Check that ${images[0]} opens in a browser.`);
    await sleep(5000);
  }
  throw new Error('Instagram took too long to process the image; it will be retried in 15 minutes.');
}

let creationId;
if (images.length === 1) {
  const params = { image_url: images[0], caption: p.caption };
  let c;
  try {
    c = await graph('POST', `/${userId}/media`, p.alt ? Object.assign({ alt_text: p.alt }, params) : params);
  } catch (e) {
    if (!p.alt || !/alt_text/i.test(e.message)) throw e;
    c = await graph('POST', `/${userId}/media`, params); // older API versions don't know alt_text
  }
  creationId = c.id;
} else {
  const children = [];
  for (const url of images) {
    const c = await graph('POST', `/${userId}/media`, { image_url: url, is_carousel_item: 'true' });
    children.push(c.id);
  }
  for (const id of children) await waitReady(id);
  const c = await graph('POST', `/${userId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: p.caption });
  creationId = c.id;
}
await waitReady(creationId);
const published = await graph('POST', `/${userId}/media_publish`, { creation_id: creationId });
let permalink = '';
try { permalink = (await graph('GET', `/${published.id}`, { fields: 'permalink' })).permalink || ''; } catch (e) { /* posted anyway */ }

state.posted = state.posted || {};
state.posted[p.id] = { at: DateTime.now().toISO(), mediaId: published.id, permalink, n: p.n };
delete state.lock;
writeState(state);
logLine([p.n, p.id, 'posted', permalink || published.id]);
await notify(helpers, `MENVA posted #${p.n}`, permalink || 'Posted to Instagram.', permalink);
return [{ json: { posted: true, n: p.n, id: p.id, mediaId: published.id, permalink } }];
