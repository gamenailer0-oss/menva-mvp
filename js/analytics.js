/**
 * MENVA — analytics. track(event, props) records anonymous events.
 * Phase 5: events are kept in memory (window.__menvaEvents) so timings can be checked.
 * Phase 8 sends them with navigator.sendBeacon to /api/e.
 */
(function () {
  'use strict';

  const events = (window.__menvaEvents = []);

  function track(event, props = {}) {
    events.push({ event, t: Math.round(performance.now()), ...props });
  }

  window.MenvaTrack = track;
})();
