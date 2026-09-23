/**
 * MENVA — 360° sprite spinner (fallback tier 4): swipe or use arrow keys to turn the dish.
 * The sprite is a grid of frames produced by the asset pipeline (spin.webp).
 */
(function () {
  'use strict';

  function mount(container, { url, layout }) {
    if (!url || !layout) return null;
    const { frames, columns, rows } = layout;
    const el = document.createElement('div');
    el.className = 'spin';
    el.tabIndex = 0;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', '360° view of the dish — swipe or use the arrow keys to turn it');
    el.style.backgroundImage = `url("${url}")`;
    el.style.backgroundSize = `${columns * 100}% ${rows * 100}%`;

    let frame = 0;
    const show = (f) => {
      frame = ((f % frames) + frames) % frames;
      const col = frame % columns, row = Math.floor(frame / columns);
      el.style.backgroundPosition = `${(col / (columns - 1)) * 100}% ${(row / (rows - 1)) * 100}%`;
    };
    show(0);

    let startX = null, startFrame = 0;
    el.addEventListener('pointerdown', (e) => { startX = e.clientX; startFrame = frame; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (startX !== null) show(startFrame - Math.round((e.clientX - startX) / 10)); });
    el.addEventListener('pointerup', () => { startX = null; });
    el.addEventListener('pointercancel', () => { startX = null; });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(frame + 1);
      else if (e.key === 'ArrowRight') show(frame - 1);
    });

    container.append(el);
    return el;
  }

  window.MenvaSpin = { mount };
})();
