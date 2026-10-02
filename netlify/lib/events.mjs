// Analytics events: what the site may send, how it's cleaned, and how it's summarised.
// Pure functions (no Netlify APIs) so they can be unit-tested — see tests/events.test.mjs.
//
// Privacy: no personal data is accepted or stored. No IP address, no user agent, no cookies.
// A session is a random id kept in the diner's tab (sessionStorage) and nothing else.

export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_EVENTS = 50;

const MS = { max: 10 * 60 * 1000 }; // timings above 10 minutes are noise
const num = (spec) => (v) => (Number.isFinite(v) && v >= 0 && v <= spec.max ? Math.round(v) : undefined);

// event name → allowed props (anything else is dropped)
export const EVENTS = {
  scan: {},
  menu_view: {},
  dish_open: {},
  model_progress_stalled: {},
  model_loaded: { ms: num(MS), bytes: num({ max: 50 * 1024 * 1024 }) },
  model_failed: { reason: (v) => (['viewer', 'download', 'model'].includes(v) ? v : undefined) },
  tier_assigned: {
    tier: (v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : undefined),
    reason: (v) => (['forced', 'device', 'slow', 'stalled', 'failed'].includes(v) ? v : undefined),
  },
  ar_launch: {},
  ar_session_started: { ms: num(MS) },
  ar_object_placed: { ms: num(MS) },
  ar_exit: { duration_ms: num({ max: 60 * 60 * 1000 }) },
  ar_failed: {},
  tray_add: {},
  waiter_view: {},
  // Loyalty stamp card (js/loyalty.js): a visit was stamped / a gift was redeemed. Restaurant id only.
  loyalty_stamp: {},
  loyalty_redeem: {},
  // Table Card (js/sharecard.js): the sheet was opened / the card was shared or saved. `mood` is which card.
  share_card_open: {},
  share_card_shared: {
    mood: (v) => (['firstLook', 'fav', 'new', 'streak', 'roast', 'sarcastic', 'goodVibes'].includes(v) ? v : undefined),
    target: (v) => (['share', 'save'].includes(v) ? v : undefined),
  },
};

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SESSION = /^[a-z0-9]{16}$/;
const TABLE = /^[1-9]\d{0,2}$/;

// Clean one incoming batch. Returns { events } (possibly empty) or { error }.
// body: { s: sessionId, r: restaurantId, t?: table, e: [{ e: event, d?: dishId, ...props }] }
export function clean(body) {
  if (!body || typeof body !== 'object') return { error: 'body' };
  if (!SESSION.test(body.s ?? '')) return { error: 'session' };
  if (!ID.test(body.r ?? '') || body.r.length > 40) return { error: 'restaurant' };
  if (!Array.isArray(body.e) || body.e.length === 0 || body.e.length > MAX_EVENTS) return { error: 'events' };
  const table = TABLE.test(String(body.t ?? '')) ? String(body.t) : null;

  const events = [];
  for (const raw of body.e) {
    const spec = raw && EVENTS[raw.e];
    if (!spec) continue; // unknown events are dropped, not errors (old clients, typos)
    const ev = { e: raw.e };
    if (typeof raw.d === 'string' && ID.test(raw.d) && raw.d.length <= 60) ev.d = raw.d;
    for (const [key, check] of Object.entries(spec)) {
      const v = check(raw[key]);
      if (v !== undefined) ev[key] = v;
    }
    events.push(ev);
  }
  return { events, session: body.s, restaurant: body.r, table };
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const rate = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null); // percent, 1 decimal

// batches: [{ day: 'YYYY-MM-DD', restaurant, table, session, events: [...] }]
// restaurant (optional): scope to one restaurant's batches only, e.g. so a private pitch demo's
// visits never mix into the pilot's numbers. Omitted/null/undefined → every batch, as before.
// → { days: [...], dishes: [...] } — the pilot results (CLAUDE.md Phase 8 §4).
export function summarise(batches, restaurant) {
  const scoped = restaurant == null ? batches : batches.filter((b) => b.restaurant === restaurant);
  const byDay = new Map();
  const byDish = new Map();
  const day = (d) => byDay.get(d) ?? byDay.set(d, { day: d, sessions: new Set(), scans: 0, dish_opens: 0, loads: [], failures: 0, tiers: {}, ar_launches: 0, placed: [], tray_adds: 0, waiter_views: 0, cards_opened: 0, cards_shared: 0, stamps_given: 0, gifts_redeemed: 0 }).get(d);
  const dish = (id) => byDish.get(id) ?? byDish.set(id, { dish: id, opens: 0, loads: [], failures: 0, tiers: {}, ar_launches: 0, placed: [], tray_adds: 0, cards_opened: 0, cards_shared: 0 }).get(id);

  // A dish can report more than one tier in one opening (360° at 12 s, then 3D when it lands):
  // the distribution counts the last tier each session reached for each dish, per day.
  const finalTier = new Map();

  for (const b of scoped) {
    const D = day(b.day);
    D.sessions.add(b.session);
    for (const ev of b.events) {
      const X = ev.d ? dish(ev.d) : null;
      switch (ev.e) {
        case 'scan': D.scans++; break;
        case 'dish_open': D.dish_opens++; if (X) X.opens++; break;
        case 'model_loaded': if (ev.ms != null) { D.loads.push(ev.ms); X?.loads.push(ev.ms); } break;
        case 'model_failed': D.failures++; if (X) X.failures++; break;
        case 'tier_assigned': if (ev.tier) finalTier.set(`${b.day}|${b.session}|${ev.d ?? ''}`, ev.tier); break;
        case 'ar_launch': D.ar_launches++; if (X) X.ar_launches++; break;
        case 'ar_object_placed': if (ev.ms != null) { D.placed.push(ev.ms); X?.placed.push(ev.ms); } break;
        case 'tray_add': D.tray_adds++; if (X) X.tray_adds++; break;
        case 'waiter_view': D.waiter_views++; break;
        case 'loyalty_stamp': D.stamps_given++; break;
        case 'loyalty_redeem': D.gifts_redeemed++; break;
        case 'share_card_open': D.cards_opened++; if (X) X.cards_opened++; break;
        case 'share_card_shared': D.cards_shared++; if (X) X.cards_shared++; break;
      }
    }
  }

  for (const [key, t] of finalTier) {
    const [d, , id] = key.split('|');
    const D = day(d);
    D.tiers[t] = (D.tiers[t] || 0) + 1;
    if (id) { const X = dish(id); X.tiers[t] = (X.tiers[t] || 0) + 1; }
  }

  const finish = (o) => ({
    ...o,
    ...(o.sessions && { sessions: o.sessions.size }),
    median_load_ms: median(o.loads),
    failure_rate_pct: rate(o.failures, o.dish_opens ?? o.opens),
    ar_launch_rate_pct: rate(o.ar_launches, o.dish_opens ?? o.opens),
    median_tap_to_placed_ms: median(o.placed),
    loads: undefined,
    placed: undefined,
  });
  return {
    days: [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)).map(finish),
    dishes: [...byDish.values()].sort((a, b) => b.opens - a.opens).map(finish),
  };
}

// Sessions per restaurant across every batch given — powers the restaurant picker on /stats
// (the /api/stats "restaurants" field, always computed unscoped so the picker keeps its options
// even while a filter is applied).
export function restaurantCounts(batches) {
  const sessions = new Map();
  for (const b of batches) {
    if (!b.restaurant) continue;
    (sessions.get(b.restaurant) ?? sessions.set(b.restaurant, new Set()).get(b.restaurant)).add(b.session);
  }
  return [...sessions].map(([id, s]) => ({ id, sessions: s.size })).sort((a, b) => b.sessions - a.sessions || a.id.localeCompare(b.id));
}

// Constant-time string comparison for the stats key.
export function sameKey(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
