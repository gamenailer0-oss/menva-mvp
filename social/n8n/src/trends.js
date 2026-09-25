// Trend watch: every 3 hours, look at what Pakistan is searching for and what the food news says.
// When a new food trend appears, write one text post about it in MENVA's voice, check it against the
// content rules, and queue it. Your phone gets an alert with "Stop it" and "Post now"; if you do
// nothing, it goes out after TREND_DELAY_MINUTES (default 90). The autopost workflow publishes it.
//
// Settings (.env): TRENDS=true to switch on · TREND_FEEDS (comma-separated RSS URLs, optional)
// TREND_MAX_PER_WEEK (default 2) · TREND_DELAY_MINUTES (default 90) · ANTHROPIC_API_KEY (optional:
// without it only plain food words get a simple template post).
if (!isTrue($env.MENVA_TRENDS)) return [];
const helpers = this.helpers;
const zone = 'Asia/Karachi';
const now = DateTime.now().setZone(zone);
const state = readState();
state.trendsSeen = state.trendsSeen || {};
state.trendQueue = state.trendQueue || [];

// Forget old history (seen trends after 30 days, finished queue items after 14).
const monthAgo = now.minus({ days: 30 }).toISODate();
for (const k of Object.keys(state.trendsSeen)) if (state.trendsSeen[k] < monthAgo) delete state.trendsSeen[k];
state.trendQueue = state.trendQueue.filter((t) => DateTime.fromISO(t.created) > now.minus({ days: 14 }));

// Quiet periods: nothing trend-driven (content/trend-blackout.json, e.g. 1-10 Muharram).
let blackout = [];
try { blackout = JSON.parse(fs.readFileSync(CALENDAR_DIR + '/trend-blackout.json', 'utf8')).ranges || []; } catch (e) { /* none */ }
const today = now.toISODate();
const quiet = blackout.find((r) => today >= r.from && today <= r.to);
if (quiet) { writeState(state); return [{ json: { skipped: 'quiet period: ' + quiet.why } }]; }

// Weekly cap.
const maxPerWeek = Number($env.TREND_MAX_PER_WEEK || 2);
const thisWeek = state.trendQueue.filter((t) => !t.stopped && DateTime.fromISO(t.created) > now.minus({ days: 7 })).length;
if (thisWeek >= maxPerWeek) { writeState(state); return [{ json: { skipped: `already ${thisWeek} trend posts this week` } }]; }

const FEEDS = ($env.TREND_FEEDS || [
  'https://trends.google.com/trending/rss?geo=PK',
  'https://news.google.com/rss/search?q=Lahore+food+OR+restaurant+OR+viral+dessert&hl=en-PK&gl=PK&ceid=PK:en',
].join(',')).split(',').map((u) => u.trim()).filter(Boolean);

// Food words in English and Roman Urdu. A trend must match one to count.
const FOOD = /\b(food|foodie|restaurant|cafe|caf[eé]|dessert|chocolate|kunafa|knafeh|cake|cookie|cookies|donut|doughnut|pizza|burger|smash|shawarma|biryani|karahi|nihari|haleem|paratha|chai|coffee|matcha|boba|ice cream|kulfi|mango|aam|falooda|bbq|steak|sandwich|fries|noodles|ramen|sushi|brunch|buffet|iftar|sehri|menu|dish|recipe|street food|food street|bakery|croissant|tres leches|milk cake|viral (?:dessert|drink|food))\b/i;
// Never trend-jack these: tragedy, politics, religion, crime, health scares, people.
const BLOCK = /\b(dead|death|died|dies|killed|kill|blast|attack|terror|flood|earthquake|accident|crash|fire|protest|arrest|court|election|pti|pmln|pml-n|ppp|minister|army|war|strike|poison|food poisoning|sick|hospital|rape|murder|funeral|martyr|shaheed|ashura|muharram|blasphemy|boycott|israel|india|scam|fraud|raid|sealed|banned|fined)\b/i;

const decode = (x) => x.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const items = [];
for (const url of FEEDS) {
  try {
    const xml = await helpers.httpRequest({ method: 'GET', url, timeout: 30000, json: false });
    for (const m of String(xml).matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const t = (m[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1];
      if (!t) continue;
      const traffic = (m[1].match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/) || [])[1] || '';
      const news = [...m[1].matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)].map((x) => decode(x[1])).slice(0, 3);
      items.push({ title: decode(t).replace(/\s+-\s+[^-]+$/, '').slice(0, 140), traffic: decode(traffic), news, source: url });
    }
  } catch (e) { logLine(['', 'trend-watch', 'feed-failed', url + ' ' + e.message]); }
}

const key = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 6).join(' ');
const fresh = items.filter((it) => FOOD.test(it.title + ' ' + it.news.join(' ')) && !BLOCK.test(it.title + ' ' + it.news.join(' ')) && !state.trendsSeen[key(it.title)]);
for (const it of items) if (!state.trendsSeen[key(it.title)] && FOOD.test(it.title)) state.trendsSeen[key(it.title)] = today;
if (!fresh.length) { writeState(state); return [{ json: { checked: items.length, newFoodTrends: 0 } }]; }
const trend = fresh[0];

// ── Write the post ────────────────────────────────────────────────────────────
let voice = '';
try { voice = fs.readFileSync('/repo/social/marketing/voice-spice.md', 'utf8'); } catch (e) { /* write without it */ }
async function writeWithClaude() {
  const system = `You write one Instagram post for MENVA (@eatmenva), a Lahore startup: diners scan the QR on a partner restaurant's table (no app, Safari or Chrome) and see the real dish as a 3D scan, placed on their own table at true size in AR, before they order. They show the waiter their list; MENVA never takes orders, delivers, or books tables.

A trend just appeared. Decide if MENVA should post about it and, if so, write a short, funny, specific, Lahori post in the voice guide below that links the trend to "see it before you order it" (the brand line: "Pehle dekho, phir order.").

Set post=false when the trend is about a person, a specific restaurant, brand or chain, anything sad, political, religious or divisive, or when the link to seeing food before ordering would be forced.

Hard rules: no emoji; never name any restaurant, brand, chain, app or real person (Gauchos included); no prices or numbers presented as facts; no claims beyond what MENVA does; no invented stats or testimonials; no em dashes; English with Roman Urdu mixed in naturally; headline under 8 words; caption under 400 characters; 3 to 5 hashtags, always including #menva and #eatmenva.

VOICE GUIDE:
${voice}`;
  const schema = {
    type: 'object',
    properties: {
      post: { type: 'boolean' },
      reason: { type: 'string' },
      layout: { type: 'string', enum: ['statement', 'shout'] },
      over: { type: 'string' },
      headline: { type: 'string' },
      body: { type: 'string' },
      roman_urdu: { type: 'string' },
      caption: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
      alt: { type: 'string' },
    },
    required: ['post', 'reason', 'layout', 'over', 'headline', 'body', 'roman_urdu', 'caption', 'hashtags', 'alt'],
    additionalProperties: false,
  };
  const base = ($env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
  const r = await helpers.httpRequest({
    method: 'POST', url: base + '/v1/messages', timeout: 180000, json: true,
    returnFullResponse: true, ignoreHttpStatusErrors: true,
    headers: { 'x-api-key': $env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'server-side-fallback-2026-07-01', 'content-type': 'application/json' },
    body: {
      model: 'claude-opus-5', max_tokens: 16000, fallbacks: 'default',
      system,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: `Trending now in Pakistan: "${trend.title}"${trend.traffic ? ` (${trend.traffic} searches)` : ''}.${trend.news.length ? '\nRelated headlines:\n- ' + trend.news.join('\n- ') : ''}\nToday is ${now.toFormat('cccc d LLLL yyyy')} in Lahore.` }],
    },
  });
  if (r.statusCode !== 200) throw new Error(`Claude API ${r.statusCode}: ${JSON.stringify(r.body).slice(0, 300)}`);
  const msg = r.body;
  if (msg.stop_reason === 'refusal') return { post: false, reason: 'declined by the model' };
  if (msg.stop_reason === 'max_tokens') throw new Error('Claude ran out of room writing the post');
  const text = (msg.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}
// Without an API key: a safe template, only when the trend is a plain food word (no names).
function writeFromTemplate() {
  const word = (trend.title.match(FOOD) || [])[0];
  if (!word || trend.title.split(/\s+/).length > 4) return { post: false, reason: 'needs ANTHROPIC_API_KEY to write about "' + trend.title + '"' };
  const W = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  return {
    post: true, reason: 'template', layout: 'shout', over: 'Trending in Pakistan',
    headline: `${W}. *Again.*`, body: 'Everyone is talking about it. Before you order it, see it.', roman_urdu: 'Pehle dekho, phir order.',
    caption: `${W} is trending again and the group chat already has opinions.\n\nWherever you end up, see the real plate before you order it. Pehle dekho, phir order.`,
    hashtags: ['#menva', '#eatmenva', '#lahorefood', '#lahorefoodies'], alt: `A text post about ${word} trending in Pakistan.`,
  };
}

let out;
try { out = $env.ANTHROPIC_API_KEY ? await writeWithClaude() : writeFromTemplate(); } catch (e) {
  logLine(['', 'trend-watch', 'write-failed', trend.title + ': ' + e.message]);
  writeState(state);
  return [{ json: { trend: trend.title, error: e.message } }];
}
if (!out.post) { logLine(['', 'trend-watch', 'skipped', trend.title + ': ' + out.reason]); writeState(state); return [{ json: { trend: trend.title, skipped: out.reason } }]; }

const tags = [...new Set(['#menva', '#eatmenva', ...(out.hashtags || [])])].slice(0, 5);
const id = 'trend-' + today + '-' + key(trend.title).replace(/ /g, '-').slice(0, 40);
const post = {
  id, caption: out.caption.replace(/—/g, ','), hashtags: tags, alt: out.alt,
  slides: [{ layout: out.layout === 'shout' ? 'shout' : 'statement', bg: 'chili', over: out.over || 'Trending', h: out.headline, b: out.body, ru: out.roman_urdu, stamp: 'Trending' }],
};
const problems = checkPostText(post);
if (problems.length) {
  logLine(['', id, 'trend-rejected', problems.join('; ')]);
  await notify(helpers, 'MENVA: trend post not queued', `"${trend.title}" was written up but failed the content rules (${problems.join(', ')}), so nothing will be posted.`);
  writeState(state);
  return [{ json: { trend: trend.title, rejected: problems } }];
}

// When it goes out: after the veto window, between 12:30 and 22:30 Lahore time.
let due = now.plus({ minutes: Number($env.TREND_DELAY_MINUTES || 90) });
if (due.hour >= 23 || (due.hour === 22 && due.minute > 30)) due = due.plus({ days: 1 }).set({ hour: 12, minute: 30 });
if (due.hour < 12 || (due.hour === 12 && due.minute < 30)) due = due.set({ hour: 12, minute: 30 });
const token = Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
state.trendQueue.push({ created: now.toISO(), due: due.toISO(), trend: trend.title, token, post });
writeState(state);
logLine(['', id, 'trend-queued', `${trend.title} · goes out ${due.toFormat('ccc HH:mm')}`]);

const pub = ($env.MENVA_PUBLIC_URL || '').replace(/\/$/, '');
const link = (what) => `${pub}/webhook/menva-trend?do=${what}&id=${encodeURIComponent(id)}&t=${token}`;
await notify(helpers, `MENVA trend post: "${trend.title}"`,
  `Goes out ${due.toFormat('ccc HH:mm')} unless you stop it.\n\n${post.slides[0].h.replace(/\*/g, '')}\n${post.caption}`,
  link('preview'), { Actions: `http, Stop it, ${link('stop')}, method=GET, clear=true; http, Post now, ${link('now')}, method=GET, clear=true` });
return [{ json: { queued: id, trend: trend.title, due: due.toISO() } }];
