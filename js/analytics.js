/**
 * MENVA — analytics. track(event, props) records anonymous events and sends them in small
 * batches with navigator.sendBeacon to /api/e (Netlify Function → Netlify Blobs).
 * No personal data: a random session id for this tab (sessionStorage), the restaurant, the table
 * number, the event and a few timings. No cookies, no IP, no user agent.
 * window.__menvaEvents keeps a local copy for tests and debugging.
 */
(function () {
  'use strict';

  const ENDPOINT = '/api/e';
  const events = (window.__menvaEvents = []);
  let queue = [];
  let context = { r: null, t: null };
  let timer = 0;
  // Automated browsers (our Playwright runs against the live site) aren't diners: record locally,
  // send nothing, so pilot numbers stay clean. ?track=1 forces sending, to check the pipeline end to end.
  const send = !navigator.webdriver || new URLSearchParams(location.search).has('track');

  function sessionId() {
    try {
      let id = sessionStorage.getItem('menva.sid');
      if (!id) {
        id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem('menva.sid', id);
      }
      return id;
    } catch {
      return (window.__menvaSid ??= Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join(''));
    }
  }

  function flush() {
    clearTimeout(timer);
    timer = 0;
    if (!send) { queue = []; return; }
    if (!queue.length || !context.r) return;
    const body = JSON.stringify({ s: sessionId(), r: context.r, t: context.t, e: queue.splice(0, 50) });
    try {
      if (!navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) {
        fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
      }
    } catch { /* analytics must never break the page */ }
    if (queue.length) flush();
  }

  // props.dish is sent as `d`; everything else as-is (the server keeps only known fields).
  function track(event, props = {}) {
    const { dish, ...rest } = props;
    events.push({ event, t: Math.round(performance.now()), dish, ...rest });
    queue.push({ e: event, ...(dish && { d: dish }), ...rest });
    if (!timer) timer = setTimeout(flush, 4000);
  }

  // Which restaurant/table the events belong to (set by the router).
  function setContext(restaurantId, table) {
    context = { r: restaurantId, t: table || null };
  }

  // Send what's queued when the diner leaves or switches apps (AR hand-off included).
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  addEventListener('pagehide', flush);

  window.MenvaTrack = track;
  window.MenvaTrack.setContext = setContext;
  window.MenvaTrack.flush = flush;
})();
