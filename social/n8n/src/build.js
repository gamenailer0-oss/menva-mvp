// One render request per slide: the template URL Gotenberg screenshots, and where the JPEG goes.
const p = $input.first().json;
if (p.skip) return []; // "Run now" on a post that is already live — see the previous node's output

// Count the attempt now, so a post that keeps failing stops after MAX_ATTEMPTS for the day.
const state = readState();
const key = p.id + '@' + DateTime.now().setZone('Asia/Karachi').toISODate();
state.attempts = state.attempts || {};
state.attempts[key] = (state.attempts[key] || 0) + 1;
state.lock = { id: p.id, at: DateTime.now().toISO() }; // released by Publish (or after 30 min)
writeState(state);

const base = ($env.MENVA_RENDER_BASE || 'http://caddy:8081').replace(/\/$/, '');
const pub = ($env.MENVA_PUBLIC_URL || '').replace(/\/$/, '');
const stamp = DateTime.now().toFormat('yyyyLLddHHmmss'); // new name each run, so Instagram never gets a cached old image
fs.mkdirSync('/files/media', { recursive: true });

return p.slides.map((slide, i) => {
  const file = `${String(p.n).padStart(3, '0')}-${p.id}-${i + 1}-${stamp}.jpg`;
  return {
    json: {
      slide: i + 1,
      renderUrl: base + '/social/templates/post.html?d=' + Buffer.from(JSON.stringify(slide), 'utf8').toString('base64url'),
      filePath: '/files/media/' + file,
      imageUrl: pub + '/media/' + file,
    },
  };
});
