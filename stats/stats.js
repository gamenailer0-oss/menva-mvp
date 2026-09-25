// Private pilot dashboard. Open /stats?key=<STATS_KEY>. The key is moved from the address bar
// into this tab's sessionStorage so it isn't left on screen or in shared screenshots.
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  let key = params.get('key');
  try {
    if (key) sessionStorage.setItem('menva.statsKey', key);
    else key = sessionStorage.getItem('menva.statsKey');
  } catch {}
  if (params.has('key')) history.replaceState(null, '', location.pathname);

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (v, unit = '') => (v == null ? '—' : `${v}${unit}`);
  const secs = (ms) => (ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`);
  const tiers = (t) => [1, 2, 3, 4, 5].map((n) => t[n] || 0).join(' / ');

  function table(el, head, rows) {
    el.innerHTML = `<thead><tr>${head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>`
      + `<tbody>${rows.length ? rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}">No data yet</td></tr>`}</tbody>`;
  }

  // Restaurant picker: All + every id seen in the data, so a private pitch demo (Baraza) never
  // mixes into the pilot's (Gauchos) numbers unless picked on purpose.
  function syncRestaurantOptions(list) {
    const sel = $('restaurant');
    const current = sel.value;
    sel.innerHTML = '<option value="">All</option>' + (list || []).map((r) => `<option value="${esc(r.id)}">${esc(r.id)} (${r.sessions})</option>`).join('');
    sel.value = (list || []).some((r) => r.id === current) ? current : '';
  }

  async function load() {
    if (!key) { $('meta').textContent = 'Open this page with ?key= followed by your stats key.'; return; }
    const days = $('days').value;
    const restaurant = $('restaurant').value;
    const q = `key=${encodeURIComponent(key)}&days=${days}${restaurant ? `&r=${encodeURIComponent(restaurant)}` : ''}`;
    $('csv').href = `/api/stats?${q}&format=csv`;
    $('message').textContent = '';
    let res;
    try { res = await fetch(`/api/stats?${q}`); } catch { $('message').textContent = 'Could not reach the server. Check the connection and reload.'; return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { $('meta').textContent = data.error || `Error ${res.status}`; return; }

    syncRestaurantOptions(data.restaurants);
    $('meta').textContent = `Last ${data.range_days} days · ${restaurant || 'all restaurants'} · ${data.batches} batches · updated ${new Date(data.generated).toLocaleString()}`;
    table($('by-day'),
      ['Day', 'Sessions', 'Scans', 'Dish opens', 'Median load', 'Load failures', 'Tiers 1/2/3/4/5', 'AR launches', 'AR launch rate', 'Median tap → placed', 'Added to table', 'Waiter views'],
      data.days.map((d) => [d.day, d.sessions, d.scans, d.dish_opens, secs(d.median_load_ms), fmt(d.failure_rate_pct, '%'), tiers(d.tiers), d.ar_launches, fmt(d.ar_launch_rate_pct, '%'), secs(d.median_tap_to_placed_ms), d.tray_adds, d.waiter_views]));
    table($('by-dish'),
      ['Dish', 'Opens', 'Median load', 'Load failures', 'Tiers 1/2/3/4/5', 'AR launches', 'AR launch rate', 'Median tap → placed', 'Added to table'],
      data.dishes.map((d) => [d.dish, d.opens, secs(d.median_load_ms), fmt(d.failure_rate_pct, '%'), tiers(d.tiers), d.ar_launches, fmt(d.ar_launch_rate_pct, '%'), secs(d.median_tap_to_placed_ms), d.tray_adds]));
  }

  $('days').addEventListener('change', load);
  $('restaurant').addEventListener('change', load);
  load();
})();
