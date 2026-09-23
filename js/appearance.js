/* MENVA — Appearance bootstrap. Runs in <head> before paint.
   Light is the default look regardless of the system preference; the sun/moon
   toggle switches to dark for the session only (in-memory — sandboxed iframes
   block localStorage, and we don't want the choice to outlive the visit). */
(() => {
  const root = document.documentElement;
  let mode = 'light';

  function apply(m) {
    root.dataset.mode = m;
    root.style.colorScheme = m;
    mode = m;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = m === 'dark' ? '#17140F' : '#FAF7F2';
    document.querySelectorAll('[data-mode-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', 'Switch to ' + (m === 'dark' ? 'light' : 'dark') + ' mode');
    });
  }

  apply(mode);

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-mode-toggle]')) return;
    apply(mode === 'dark' ? 'light' : 'dark');
  });
})();
