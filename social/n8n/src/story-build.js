// Story teaser for the post that just went out (or was just test-rendered): its first slide
// on a 1080×1920 card. Set STORIES=false in .env to switch this off.
if (/^(0|false|no|off)$/i.test(String($env.MENVA_STORIES ?? 'true').trim())) return [];
const p = $("Pick today's post").first().json;
const result = $input.first().json;
if (result.alreadyPosted || result.manualReel) return [];
const first = $('Build render requests').first().json;
const base = ($env.MENVA_RENDER_BASE || 'http://caddy:8081').replace(/\/$/, '');
const pub = ($env.MENVA_PUBLIC_URL || '').replace(/\/$/, '');
const file = first.filePath.split('/').pop().replace(/\.jpg$/, '-story.jpg');
// (no URLSearchParams in n8n's Code sandbox)
const qs = Object.entries({ img: '/media/' + first.filePath.split('/').pop(), n: p.trend ? '' : String(p.n), handle: $env.MENVA_IG_HANDLE || '' })
  .map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
return [{ json: { renderUrl: `${base}/social/templates/story.html?${qs}`, filePath: '/files/media/' + file, imageUrl: pub + '/media/' + file } }];
