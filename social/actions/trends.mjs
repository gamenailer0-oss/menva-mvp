// Trend watch, GitHub Actions edition (every 3 hours). Finds a new food trend in Pakistan, writes one
// text post about it in MENVA's voice, checks it against the content rules and queues it. The phone
// gets "Stop it" / "Post now" buttons; with no tap it goes out after TREND_DELAY_MINUTES, between
// 12:30 and 22:30 Lahore time. autopost.mjs publishes it.
// Settings (repository variables/secrets): TRENDS, TREND_FEEDS, TREND_MAX_PER_WEEK, TREND_DELAY_MINUTES,
// ANTHROPIC_API_KEY (optional: without it only plain food words get a simple template post).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, env, isTrue, pkNow, addDays, readState, writeState, logLine, commitData, notify, controlTopic, checkPostText } from './lib.mjs';

if (!isTrue(env('TRENDS'))) { console.log('Trend watch is off (TRENDS is not true).'); process.exit(0); }
// The Stop button lives on the phone, so no phone topic = no trend posts (and no failing runs while setting up).
if (!env('NTFY_TOPIC')) { console.log('Trend watch waits for the NTFY_TOPIC secret (social/actions/README.md step 4).'); process.exit(0); }
const now = pkNow();
const today = now.date;
const state = readState();
state.trendsSeen = state.trendsSeen || {};
state.trendQueue = (state.trendQueue || []).filter((t) => Date.now() - Date.parse(t.created) < 14 * 86400000);
for (const k of Object.keys(state.trendsSeen)) if (state.trendsSeen[k] < addDays(today, -30)) delete state.trendsSeen[k];
const save = (msg) => { writeState(state); commitData(msg); };

let blackout = [];
try { blackout = JSON.parse(fs.readFileSync(path.join(ROOT, 'social/content/trend-blackout.json'), 'utf8')).ranges || []; } catch (e) { /* none */ }
const quiet = blackout.find((r) => today >= r.from && today <= r.to);
if (quiet) { console.log('Quiet period:', quiet.why); save('trends: quiet period'); process.exit(0); }
// Before launch the feed is a mystery (the Escape the menu hunt): a trend post would give the product away.
if (today <= env('START_DATE', '2026-10-05')) { console.log('Trend posts start the day after launch.'); save('trends: pre-launch'); process.exit(0); }
const thisWeek = state.trendQueue.filter((t) => !t.stopped && Date.now() - Date.parse(t.created) < 7 * 86400000).length;
if (thisWeek >= Number(env('TREND_MAX_PER_WEEK', '2'))) { console.log(`Already ${thisWeek} trend posts this week.`); save('trends: weekly cap'); process.exit(0); }

const FEEDS = env('TREND_FEEDS', [
  'https://trends.google.com/trending/rss?geo=PK',
  'https://news.google.com/rss/search?q=Lahore+food+OR+restaurant+OR+viral+dessert&hl=en-PK&gl=PK&ceid=PK:en',
].join(',')).split(',').map((u) => u.trim()).filter(Boolean);
const FOOD = /\b(food|foodie|restaurant|cafe|caf[eé]|dessert|chocolate|kunafa|knafeh|cake|cookie|cookies|donut|doughnut|pizza|burger|smash|shawarma|biryani|karahi|nihari|haleem|paratha|chai|coffee|matcha|boba|ice cream|kulfi|mango|aam|falooda|bbq|steak|sandwich|fries|noodles|ramen|sushi|brunch|buffet|iftar|sehri|menu|dish|recipe|street food|food street|bakery|croissant|tres leches|milk cake|viral (?:dessert|drink|food))\b/i;
const BLOCK = /\b(dead|death|died|dies|killed|kill|blast|attack|terror|flood|earthquake|accident|crash|fire|protest|arrest|court|election|pti|pmln|pml-n|ppp|minister|army|war|strike|poison|food poisoning|sick|hospital|rape|murder|funeral|martyr|shaheed|ashura|muharram|blasphemy|boycott|israel|india|scam|fraud|raid|sealed|banned|fined)\b/i;

const decode = (x) => x.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const items = [];
for (const url of FEEDS) {
  try {
    const xml = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (MENVA trend watch)' } })).text();
    for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const t = (m[1].match(/<title>([\s\S]*?)<\/title>/) || [])[1];
      if (!t) continue;
      const traffic = (m[1].match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/) || [])[1] || '';
      const news = [...m[1].matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)].map((x) => decode(x[1])).slice(0, 3);
      items.push({ title: decode(t).replace(/\s+-\s+[^-]+$/, '').slice(0, 140), traffic: decode(traffic), news });
    }
  } catch (e) { logLine(['', 'trend-watch', 'feed-failed', url + ' ' + e.message]); }
}
const key = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 6).join(' ');
const all = (it) => it.title + ' ' + it.news.join(' ');
const fresh = items.filter((it) => FOOD.test(all(it)) && !BLOCK.test(all(it)) && !state.trendsSeen[key(it.title)]);
for (const it of items) if (FOOD.test(all(it)) && !state.trendsSeen[key(it.title)]) state.trendsSeen[key(it.title)] = today;
if (!fresh.length) { console.log(`Checked ${items.length} items: no new food trend.`); save('trends: checked'); process.exit(0); }
const trend = fresh[0];

// ── Write the post ──
let voice = '';
try { voice = fs.readFileSync(path.join(ROOT, 'social/marketing/voice-spice.md'), 'utf8'); } catch (e) { /* without it */ }
const SCHEMA = {
  type: 'object',
  properties: {
    post: { type: 'boolean' }, reason: { type: 'string' }, layout: { type: 'string', enum: ['statement', 'shout'] },
    over: { type: 'string' }, headline: { type: 'string' }, body: { type: 'string' }, roman_urdu: { type: 'string' },
    caption: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, alt: { type: 'string' },
  },
  required: ['post', 'reason', 'layout', 'over', 'headline', 'body', 'roman_urdu', 'caption', 'hashtags', 'alt'],
  additionalProperties: false,
};
async function writeWithClaude() {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();
  const system = `You write one Instagram post for MENVA (@eatmenva), a Lahore startup: diners scan the QR on a partner restaurant's table (no app, Safari or Chrome) and see the real dish as a 3D scan, placed on their own table at true size in AR, before they order. They show the waiter their list; MENVA never takes orders, delivers, or books tables.

A trend just appeared. Decide if MENVA should post about it and, if so, write a short, funny, specific, Lahori post in the voice guide below that links the trend to "see it before you order it" (the brand line: "Pehle dekho, phir order.").

Set post=false when the trend is about a person, a specific restaurant, brand or chain, anything sad, political, religious or divisive, or when the link to seeing food before ordering would be forced.

Hard rules: no emoji; never name any restaurant, brand, chain, app or real person (Gauchos included); no prices or numbers presented as facts; no claims beyond what MENVA does; no invented stats or testimonials; no em dashes; English with Roman Urdu mixed in naturally; headline under 8 words (wrap one or two words in *asterisks* for the accent colour); caption under 400 characters; 3 to 5 hashtags, always including #menva and #eatmenva.

VOICE GUIDE:
${voice}`;
  const msg = await client.beta.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Trending now in Pakistan: "${trend.title}"${trend.traffic ? ` (${trend.traffic} searches)` : ''}.${trend.news.length ? '\nRelated headlines:\n- ' + trend.news.join('\n- ') : ''}\nToday is ${today} in Lahore.` }],
  });
  if (msg.stop_reason === 'refusal') return { post: false, reason: 'declined by the model' };
  if (msg.stop_reason === 'max_tokens') throw new Error('Claude ran out of room writing the post');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}
function writeFromTemplate() {
  // Template trend posts read as filler, so they only go out when TREND_TEMPLATE=true; otherwise a trend needs Claude.
  if (!isTrue(env('TREND_TEMPLATE'))) return { post: false, reason: 'no ANTHROPIC_API_KEY, so no trend post about "' + trend.title + '"' };
  const word = (trend.title.match(FOOD) || [])[0];
  if (!word || trend.title.split(/\s+/).length > 4) return { post: false, reason: 'needs ANTHROPIC_API_KEY to write about "' + trend.title + '"' };
  const W = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  return {
    post: true, reason: 'template', layout: 'shout', over: 'Trending in Pakistan', headline: `${W}. *Again.*`,
    body: 'Everyone is talking about it. Before you order it, see it.', roman_urdu: 'Pehle dekho, phir order.',
    caption: `${W} is trending again and the group chat already has opinions.\n\nWherever you end up, see the real plate before you order it. Pehle dekho, phir order.`,
    hashtags: ['#menva', '#eatmenva', '#lahorefood', '#lahorefoodies'], alt: `A text post about ${word} trending in Pakistan.`,
  };
}
let out;
try { out = env('ANTHROPIC_API_KEY') ? await writeWithClaude() : writeFromTemplate(); } catch (e) {
  logLine(['', 'trend-watch', 'write-failed', trend.title + ': ' + e.message]); save('trends: write failed'); process.exit(0);
}
if (!out.post) { logLine(['', 'trend-watch', 'skipped', trend.title + ': ' + out.reason]); save('trends: skipped'); process.exit(0); }

const id = 'trend-' + today + '-' + key(trend.title).replace(/ /g, '-').slice(0, 40);
const post = {
  id, caption: out.caption.replace(/—/g, ','), hashtags: [...new Set(['#menva', '#eatmenva', ...(out.hashtags || [])])].slice(0, 5), alt: out.alt,
  slides: [{ layout: out.layout === 'shout' ? 'shout' : 'statement', bg: 'chili', over: out.over || 'Trending', h: out.headline, b: out.body, ru: out.roman_urdu, stamp: 'Trending' }],
};
const problems = checkPostText(post);
if (problems.length) {
  logLine(['', id, 'trend-rejected', problems.join('; ')]);
  await notify('MENVA: trend post not queued', `"${trend.title}" was written up but failed the content rules (${problems.join(', ')}), so nothing will be posted.`);
  save('trends: rejected'); process.exit(0);
}

// Due time: after the veto window, between 12:30 and 22:30 Lahore time (Lahore is UTC+5, no DST).
const PK = 5 * 3600000;
let due = new Date(Date.now() + Number(env('TREND_DELAY_MINUTES', '90')) * 60000);
const local = new Date(due.getTime() + PK);
const mins = local.getUTCHours() * 60 + local.getUTCMinutes();
const at = (dayShift, h, m) => { const d = new Date(local); d.setUTCDate(d.getUTCDate() + dayShift); d.setUTCHours(h, m, 0, 0); return new Date(d.getTime() - PK); };
if (mins > 22 * 60 + 30) due = at(1, 12, 30); else if (mins < 12 * 60 + 30) due = at(0, 12, 30);
const token = crypto.randomBytes(10).toString('hex');
state.trendQueue.push({ created: new Date().toISOString(), due: due.toISOString(), trend: trend.title, token, post });
logLine(['', id, 'trend-queued', `${trend.title} · goes out ${due.toISOString()}`]);
save(`trends: queued ${id}`);

const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(due);
const ctl = `${env('NTFY_BASE', 'https://ntfy.sh').replace(/\/$/, '')}/${encodeURIComponent(controlTopic())}`;
await notify(`MENVA trend post: "${trend.title}"`,
  `Goes out ${when} unless you tap Stop it.\n\n${post.slides[0].h.replace(/\*/g, '')}\n${post.slides[0].b}\n\n${post.caption}\n${post.hashtags.join(' ')}`,
  '', { Actions: `http, Stop it, ${ctl}, method=POST, body=stop ${id} ${token}, clear=true; http, Post now, ${ctl}, method=POST, body=now ${id} ${token}, clear=true` });
console.log('Queued', id, 'for', due.toISOString());
