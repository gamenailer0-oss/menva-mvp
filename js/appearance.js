/* MENVA — Appearance bootstrap. Runs in <head> before paint.
   Uses in-memory state (sandboxed iframes block localStorage).
   Reads prefers-color-scheme. No flash. */
(() => {
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  let mode = system.matches ? 'dark' : 'light';

  function apply(m) {
    root.dataset.mode = m;
    root.style.colorScheme = m;
    mode = m;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = m === 'dark' ? '#14110E' : '#FAF5EA';
    document.querySelectorAll('[data-mode-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', 'Switch to ' + (m === 'dark' ? 'light' : 'dark') + ' mode');
    });
  }

  apply(mode);
  system.addEventListener('change', e => { apply(e.matches ? 'dark' : 'light'); });

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-mode-toggle]')) return;
    apply(mode === 'dark' ? 'light' : 'dark');
  });
})();
