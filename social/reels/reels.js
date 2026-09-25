// MENVA motion Reels. Each reel is a list of scenes; each scene has a time window, a background
// and some HTML. Elements with class "a" animate in at data-at (seconds after the scene starts)
// with data-fx: rise | fade | drop | pop. Dish images are the logo-free crops of the real renders
// (made by social/print/print.mjs into social/print/.cache/).
(function () {
  'use strict';
  const dish = (name, w, extra = '') => `<img class="a dishimg" data-fx="drop" data-at="${extra || 0.9}" src="../print/.cache/${name}.png" style="width:${w}px;margin-left:-${w / 2}px;transform:translate(0,-50%)">`;
  const table = (d, w, at = 0.9) => `<div class="floor a" data-fx="fade" data-at="0"></div><div class="reticle a" data-fx="fade" data-at="0.3"></div>
    <div class="shadow a" data-fx="fade" data-at="${at + 0.35}"></div>${dish(d, w, at)}`;
  const wm = (at) => `<div class="a wm" data-fx="fade" data-at="${at}">menva<i>.</i></div>`;

  const REELS = {
    'pehle-dekho': { len: 11, scenes: [
      { t: [0, 3.2], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Menu pe likha hai <em>"large".</em></div><div class="a small muted" data-fx="rise" data-at="1.0" style="margin-top:40px">Kitna large? Kisi ko nahi pata.</div>` },
      { t: [3.2, 7.6], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.15" style="position:relative;z-index:2">Pehle <em>dekho,</em></div>${table('steak-sandwich-full', 760, 0.9)}<div class="a" data-fx="pop" data-at="2.2" style="position:absolute;left:0;right:0;top:1490px;text-align:center;z-index:3"><span class="tag">True size, on your table</span></div>` },
      { t: [7.6, 11], bg: 'chili', cls: 'center', html: `<div class="a big" data-fx="rise" data-at="0.1">phir <em>order.</em></div><div class="a small" data-fx="rise" data-at="0.7" style="margin-top:40px">See it before you order it.</div><div style="margin-top:90px">${wm(1.3)}</div>` },
    ] },
    'sight-test': { len: 12.5, scenes: [
      { t: [0, 2.8], bg: 'ink', cls: 'center', html: `<div class="a over" data-fx="fade" data-at="0" style="font-size:34px;color:rgba(255,255,255,.8)">The sight test</div><div class="a mid" data-fx="rise" data-at="0.3" style="margin-top:36px">Guess the size <em>first.</em></div>` },
      { t: [2.8, 6.2], bg: 'paper', html: `<div class="a over muted" data-fx="fade" data-at="0" style="font-size:34px">The menu says</div><div class="a menu-card" data-fx="rise" data-at="0.2" style="margin-top:40px"><div class="name">Steak sandwich</div><div class="dots"></div><div class="desc">Sliced steak, greens, aioli.</div></div><div class="a mid" data-fx="rise" data-at="1.3" style="margin-top:90px">One person, or <em>two?</em></div>` },
      { t: [6.2, 8.6], bg: 'paper', cls: 'center', html: [3, 2, 1].map((n, i) => `<div class="a count" data-fx="pop" data-at="${i * 0.8}" data-out="${i * 0.8 + 0.75}" style="position:absolute">${n}</div>`).join('') },
      { t: [8.6, 12.5], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="1.4" style="position:relative;z-index:2">Real size. <em>Close?</em></div>${table('steak-sandwich-full', 760, 0.2)}<div class="a small" data-fx="rise" data-at="2.2" style="position:absolute;left:90px;right:90px;top:1490px;text-align:center;z-index:3">Comment your guess.</div>` },
    ] },
    'menu-photos-lie': { len: 11, scenes: [
      { t: [0, 2.6], bg: 'chili', cls: 'center', html: `<div class="a big" data-fx="rise" data-at="0.1">Menu photos <em>lie.</em></div>` },
      { t: [2.6, 5.2], bg: 'ink', cls: 'center', html: `<div class="a big" data-fx="rise" data-at="0.1">Scans <em>don't.</em></div>` },
      { t: [5.2, 9.2], bg: 'paper', html: `<div class="a mid" data-fx="rise" data-at="0.1">Real dishes. <em>Real scans.</em></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:70px">${['steak-main-board', 'steak-sandwich-full', 'garlic-prawn-skewers-full', 'chicken-fajita-wrap-board'].map((d, i) => `<div class="a" data-fx="pop" data-at="${0.5 + i * 0.45}" style="background:var(--stage);border-radius:32px;height:430px;display:flex;align-items:center;justify-content:center"><img src="../print/.cache/${d}.png" style="max-width:88%;max-height:88%"></div>`).join('')}</div>
        <div class="a small muted" data-fx="rise" data-at="2.6" style="margin-top:50px">No AI food, ever.</div>` },
      { t: [9.2, 11], bg: 'paper', cls: 'center', html: `${wm(0.1)}<div class="a small" data-fx="rise" data-at="0.4" style="margin-top:30px">See it before you order it.</div>` },
    ] },
    'for-restaurants': { len: 14, scenes: [
      { t: [0, 5], bg: 'ink', html: `<div class="a over" data-fx="fade" data-at="0" style="font-size:32px;color:rgba(255,255,255,.8)">What your staff hears every night</div><div class="qs" style="margin-top:60px">${['"What does it look like?"', '"How big is it?"', '"Is it enough for two?"', '"Which one should I get?"'].map((q, i) => `<div class="a" data-fx="rise" data-at="${0.4 + i * 0.7}">${q}</div>`).join('')}</div>` },
      { t: [5, 9.2], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.15" style="position:relative;z-index:2">Answer it <em>at the table.</em></div>${table('steak-main-board', 820, 0.9)}` },
      { t: [9.2, 14], bg: 'chili', html: `<div class="a over" data-fx="fade" data-at="0" style="font-size:32px;color:rgba(255,255,255,.85)">For restaurants in Lahore</div><div class="a mid" data-fx="rise" data-at="0.2" style="margin-top:40px">Real 3D dishes on <em>your tables.</em></div><div class="a small" data-fx="rise" data-at="0.9" style="margin-top:40px">No app for guests. Your waiters stay in charge.</div><div class="a mid" data-fx="rise" data-at="1.6" style="margin-top:80px">Pilot: <em>PKR 25,000</em></div><div class="a" data-fx="pop" data-at="2.4" style="margin-top:60px"><span class="tag">DM "PILOT"</span></div><div style="margin-top:auto">${wm(2.8)}</div>` },
    ] },
  };

  const name = new URLSearchParams(location.search).get('reel') || 'pehle-dekho';
  const reel = REELS[name];
  const stage = document.getElementById('stage');
  const BG = { paper: 'var(--paper)', stage: 'var(--stage)', chili: 'var(--chili)', ink: 'var(--ink)' };
  const scenes = reel.scenes.map((s) => {
    const el = document.createElement('section');
    el.className = `scene ${s.cls || ''} bg-${s.bg === 'stage' ? 'paper' : s.bg}`;
    el.style.background = BG[s.bg];
    el.innerHTML = s.html;
    stage.appendChild(el);
    return { ...s, el, items: [...el.querySelectorAll('.a')] };
  });
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const FADE = 0.28; // scene crossfade, seconds

  window.REEL = { name, length: reel.len, names: Object.keys(REELS) };
  window.render = (t) => {
    for (const s of scenes) {
      const [a, b] = s.t;
      const vis = t < a || t > b ? 0 : Math.min(clamp((t - a) / FADE), clamp((b - t) / FADE), 1);
      s.el.style.opacity = s.t[0] === 0 && t < FADE ? 1 : vis; // first frame is never blank
      if (!vis && !(s.t[0] === 0 && t < FADE)) continue;
      const local = t - a;
      for (const it of s.items) {
        const at = Number(it.dataset.at || 0), out = it.dataset.out ? Number(it.dataset.out) : Infinity;
        const fx = it.dataset.fx || 'fade';
        const p = ease(clamp((local - at) / (fx === 'drop' ? 0.7 : 0.55)));
        const o = local > out ? 1 - clamp((local - out) / 0.15) : 1;
        let tr = '';
        if (fx === 'rise') tr = `translateY(${(1 - p) * 60}px)`;
        if (fx === 'pop') tr = `scale(${0.85 + 0.15 * p})`;
        if (fx === 'drop') tr = `translate(0, calc(-50% - ${(1 - p) * 420}px))`;
        it.style.opacity = String((fx === 'drop' ? clamp(p * 2) : p) * o);
        if (tr) it.style.transform = tr;
      }
    }
  };
  document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.complete ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))))
    .then(() => { window.render(0); window.__ready = true; });
})();
