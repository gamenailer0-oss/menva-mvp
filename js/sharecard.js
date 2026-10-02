/**
 * MENVA — Table Card: a shareable 1080×1920 story image for a dish, drawn on a <canvas> on the
 * diner's phone in the restaurant's own look (logo, brand colours, self-hosted fonts, the dish's
 * transparent cut-out). Styled like a ticket: table, branch, date and time print on a stub.
 *
 * Privacy: nothing is uploaded. The card is built and kept in memory; the diner chooses whether to
 * share it (Web Share with a JPEG file) or save it. The table number and time appear only on that
 * image. The only things stored, on this phone only (localStorage): the dishes already opened, the
 * days visited and the dishes marked as favourites — per restaurant, no names, no account.
 *
 * Moods change the badge, the line pool and the look. The line pools come from the restaurant's
 * `shareLines` in data/restaurants/<id>.json; "|" inside a line forces a line break on the card.
 */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const PI2 = Math.PI * 2;

  // ─── Moods ──────────────────────────────────────────────────────
  const MOODS = [
    { id: 'firstLook', label: 'First look' },
    { id: 'selfie', label: 'Selfie' }, // only when the restaurant has selfieCard: true
    { id: 'fav', label: 'My fav' },
    { id: 'new', label: 'Tried something new' },
    { id: 'streak', label: 'Streak' },
    { id: 'roast', label: 'Roast' },
    { id: 'sarcastic', label: 'Sarcastic' },
    { id: 'goodVibes', label: 'Good vibes' },
  ];
  const MOOD_IDS = MOODS.map((m) => m.id);

  // Used only when a restaurant has no lines for a mood yet.
  const FALLBACK_LINES = {
    firstLook: ['Seen in 3D|before it reached|my table.'],
    fav: ['My order.|Every time.'],
    new: ['New on|my list.'],
    streak: ['Back again.|Obviously.'],
    roast: ['Sized it up.|It sized me up back.'],
    sarcastic: ['Calories don\'t|count in 3D.'],
    goodVibes: ['Good company.|Better food.'],
    selfie: ['Say|cheese.', 'Food first.|Face second.'],
  };

  const badgeText = (mood, streak) => ({
    firstLook: 'Live 3D · First look',
    fav: 'My fav',
    new: 'New on my list',
    streak: `Visit streak · ${streak}`,
    roast: 'Live 3D · Roast mode',
    sarcastic: 'Live 3D · Sarcastic',
    goodVibes: 'Live 3D · Good vibes',
    selfie: 'Selfie · Live AR',
  }[mood]);

  const subText = (mood, streak) => ({
    firstLook: 'Seen in 3D before it reached my table.',
    fav: 'My usual. Seen in 3D first.',
    new: 'Never had it. Seen in 3D. Now I\'m having it.',
    streak: `${streak} visits, ${streak} different days.`,
    roast: '',
    sarcastic: 'Seen in 3D. Ordered anyway.',
    goodVibes: 'Seen in 3D. Shared with good company.',
    selfie: '',
  }[mood]);

  // mood → colour scheme (see BRANDS[*].sch)
  const SCHEME_OF = { firstLook: 'base', fav: 'deep', new: 'paper', streak: 'dark', roast: 'base', sarcastic: 'paper', goodVibes: 'warm', selfie: 'dark' };

  // ─── Brands ─────────────────────────────────────────────────────
  // The approved Table Card directions (one per restaurant). hl = [headline colour, last-line
  // colour]; pill = badge; stub = ticket stub. Colours are the restaurants' own palettes.
  const HD = {
    head: { family: 'Jost', weight: 300, accWeight: 500, upperMoods: ['firstLook', 'streak'], upperSize: 240, mixedSize: 190, upperLs: -0.012, mixedLs: -0.025 },
    nameFont: { family: 'Jost', weight: 500, size: 60, upper: false, ls: 0.005 },
    num: { family: 'Jost', weight: 300, size: 148 },
    signature: 'tag',
    tagWords: ['Indulge', 'Capture', 'Share', 'Repeat'],
    logo: 'wide', logoW: 520, logoTop: 138, pillTop: 128,
    sch: {
      base: { bg: ['#E7C3C8'], glow: '#F4DEE1', hl: ['#1C1416', '#9C2F52'], ink: '#1C1416', muted: '#6B4F53', pill: { fill: null, stroke: '#1C1416', ink: '#1C1416', dot: '#9C2F52', halo: 'rgba(156,47,82,.18)' }, stub: { panel: '#FAF3F2', ink: '#1C1416', accent: '#9C2F52' }, shadow: 'rgba(120,50,70,.5)', drop: 'rgba(110,40,60,.24)', logoTint: null, deco: '#9C2F52' },
      deep: { bg: ['#8A2446', '#9C2F52', '#7E2040'], glow: '#B8426A', hl: ['#FAF3F2', '#F3B6C6'], ink: '#FAF3F2', muted: '#E7C3C8', pill: { fill: '#FAF3F2', ink: '#9C2F52', dot: '#9C2F52' }, stub: { panel: '#FAF3F2', ink: '#1C1416', accent: '#9C2F52' }, shadow: 'rgba(40,8,20,.65)', drop: 'rgba(40,8,20,.35)', logoTint: '#FFFFFF', deco: '#F3B6C6' },
      paper: { bg: ['#FAF3F2'], disc: '#E7C3C8', hl: ['#1C1416', '#9C2F52'], ink: '#1C1416', muted: '#6B4F53', pill: { fill: '#1C1416', ink: '#FAF3F2', dot: '#F3B6C6' }, stub: { panel: '#E7C3C8', ink: '#1C1416', accent: '#9C2F52' }, shadow: 'rgba(120,50,70,.5)', drop: 'rgba(110,40,60,.24)', logoTint: null, deco: '#9C2F52' },
      dark: { bg: ['#4A1F2B', '#2C1219', '#1A1113'], glow: 'rgba(229,138,168,.34)', hl: ['#F6E3E7', '#E58AA8'], ink: '#F6E3E7', muted: '#C79AA6', pill: { fill: '#E58AA8', ink: '#1A1113', dot: '#1A1113' }, stub: { panel: '#E7C3C8', ink: '#1C1416', accent: '#9C2F52' }, shadow: 'rgba(0,0,0,.75)', drop: 'rgba(0,0,0,.5)', logoTint: '#FFFFFF', deco: '#E58AA8' },
      warm: { bg: ['#F7DCCB', '#EDC3C2'], glow: '#FBEBDF', hl: ['#1C1416', '#9C2F52'], ink: '#1C1416', muted: '#6B4F53', pill: { fill: '#9C2F52', ink: '#FAF3F2', dot: '#F3B6C6' }, stub: { panel: '#FAF3F2', ink: '#1C1416', accent: '#9C2F52' }, shadow: 'rgba(120,50,70,.5)', drop: 'rgba(110,40,60,.24)', logoTint: null, deco: '#E9A98E' },
    },
  };
  const BARAZA = {
    head: { family: 'Barlow Condensed', weight: 600, accWeight: 600, upperMoods: MOOD_IDS, upperSize: 300, mixedSize: 300, upperLs: -0.005, mixedLs: -0.005 },
    nameFont: { family: 'Barlow Condensed', weight: 600, size: 66, upper: true, ls: 0.03 },
    num: { family: 'Barlow Condensed', weight: 600, size: 132 },
    signature: 'dial',
    logo: 'round', logoTop: 118, pillTop: 135,
    sch: {
      base: { bg: ['#8A9060'], glow: '#9DA472', hl: ['#FAF5EC', '#10150F'], ink: '#10150F', muted: '#10150F', pill: { fill: '#10150F', ink: '#FAF5EC', dot: '#C9D38F', halo: 'rgba(201,211,143,.22)' }, stub: { panel: '#FAF5EC', ink: '#10150F', accent: '#4B5A2B' }, shadow: 'rgba(16,21,15,.6)', drop: 'rgba(16,21,15,.3)', deco: '#10150F' },
      deep: { bg: ['#3E4A22', '#4B5A2B', '#2F3A18'], glow: '#5F7036', hl: ['#FAF5EC', '#D9E3A4'], ink: '#FAF5EC', muted: '#D9DDC3', pill: { fill: '#FAF5EC', ink: '#4B5A2B', dot: '#4B5A2B' }, stub: { panel: '#FAF5EC', ink: '#10150F', accent: '#4B5A2B' }, shadow: 'rgba(8,12,4,.65)', drop: 'rgba(8,12,4,.35)', deco: '#D9E3A4' },
      paper: { bg: ['#FAF5EC'], disc: '#C9CFA6', hl: ['#10150F', '#4B5A2B'], ink: '#10150F', muted: '#4A4F3A', pill: { fill: '#10150F', ink: '#FAF5EC', dot: '#C9D38F' }, stub: { panel: '#DCE0C3', ink: '#10150F', accent: '#4B5A2B' }, shadow: 'rgba(16,21,15,.45)', drop: 'rgba(16,21,15,.25)', deco: '#4B5A2B' },
      dark: { bg: ['#1E2A14', '#141C0E', '#10150F'], glow: 'rgba(201,211,143,.26)', hl: ['#FAF5EC', '#C9D38F'], ink: '#FAF5EC', muted: '#B7BE9B', pill: { fill: '#C9D38F', ink: '#10150F', dot: '#10150F' }, stub: { panel: '#FAF5EC', ink: '#10150F', accent: '#4B5A2B' }, shadow: 'rgba(0,0,0,.75)', drop: 'rgba(0,0,0,.5)', deco: '#C9D38F' },
      warm: { bg: ['#FAF5EC', '#E3E6C3'], glow: '#FFFDF6', hl: ['#10150F', '#4B5A2B'], ink: '#10150F', muted: '#4A4F3A', pill: { fill: '#4B5A2B', ink: '#FAF5EC', dot: '#C9D38F' }, stub: { panel: '#FAF5EC', ink: '#10150F', accent: '#4B5A2B' }, shadow: 'rgba(16,21,15,.45)', drop: 'rgba(16,21,15,.25)', deco: '#C9D38F' },
    },
  };
  const GAUCHOS = {
    head: { family: 'Instrument Serif', weight: 400, accWeight: 400, accItalic: true, upperMoods: [], upperSize: 156, mixedSize: 156, upperLs: -0.018, mixedLs: -0.018 },
    nameFont: { family: 'Instrument Serif', weight: 400, size: 64, upper: false, ls: -0.01 },
    num: { family: 'Instrument Serif', weight: 400, size: 150 },
    signature: 'stage',
    logo: 'wide', logoW: 250, logoTop: 118, pillTop: 134,
    dishBox: { x: 140, y: 748, w: 800, h: 512 },
    sch: {
      base: { bg: ['#EFEBE2'], stage: '#E3DCCF', stageLine: 'rgba(124,42,28,.45)', hl: ['#1A1714', '#7C2A1C'], ink: '#1A1714', muted: '#5C5349', pill: { fill: '#7C2A1C', ink: '#EFEBE2', dot: '#F2A48F' }, stub: { panel: '#7C2A1C', ink: '#EFEBE2', accent: '#F2B5A3' }, shadow: 'rgba(26,23,20,.5)', drop: 'rgba(26,23,20,.26)', logoTint: null, deco: '#7C2A1C' },
      deep: { bg: ['#6A2217', '#7C2A1C', '#561A10'], glow: '#95392A', stage: 'rgba(0,0,0,.18)', stageLine: 'rgba(239,235,226,.4)', hl: ['#EFEBE2', '#F2B5A3'], ink: '#EFEBE2', muted: '#E3C9BE', pill: { fill: '#EFEBE2', ink: '#7C2A1C', dot: '#7C2A1C' }, stub: { panel: '#EFEBE2', ink: '#1A1714', accent: '#7C2A1C' }, shadow: 'rgba(20,6,3,.65)', drop: 'rgba(20,6,3,.35)', logoTint: '#EFEBE2', deco: '#F2B5A3' },
      paper: { bg: ['#F7F3EA'], disc: '#E3DCCF', hl: ['#1A1714', '#7C2A1C'], ink: '#1A1714', muted: '#5C5349', pill: { fill: '#1A1714', ink: '#EFEBE2', dot: '#F2A48F' }, stub: { panel: '#E3DCCF', ink: '#1A1714', accent: '#7C2A1C' }, shadow: 'rgba(26,23,20,.5)', drop: 'rgba(26,23,20,.26)', logoTint: null, deco: '#7C2A1C' },
      dark: { bg: ['#2A201B', '#1F1814', '#1A1714'], glow: 'rgba(242,164,143,.26)', stage: 'rgba(255,255,255,.05)', stageLine: 'rgba(242,164,143,.4)', hl: ['#EFEBE2', '#F2A48F'], ink: '#EFEBE2', muted: '#BDB1A4', pill: { fill: '#F2A48F', ink: '#1A1714', dot: '#1A1714' }, stub: { panel: '#EFEBE2', ink: '#1A1714', accent: '#7C2A1C' }, shadow: 'rgba(0,0,0,.75)', drop: 'rgba(0,0,0,.5)', logoTint: '#EFEBE2', deco: '#F2A48F' },
      warm: { bg: ['#F6E4CB', '#EFEBE2'], glow: '#FFF6E6', hl: ['#1A1714', '#7C2A1C'], ink: '#1A1714', muted: '#5C5349', pill: { fill: '#7C2A1C', ink: '#EFEBE2', dot: '#F2A48F' }, stub: { panel: '#7C2A1C', ink: '#EFEBE2', accent: '#F2B5A3' }, shadow: 'rgba(26,23,20,.5)', drop: 'rgba(26,23,20,.26)', logoTint: null, deco: '#E9C9A0' },
    },
  };
  const brandFor = (r) => ({ 'haute-dolci': HD, baraza: BARAZA, gauchos: GAUCHOS }[r.theme] || GAUCHOS);

  const FONTS = [
    '300 40px "Jost"', '500 40px "Jost"', '400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"',
    '400 30px "DM Sans"', '500 30px "DM Sans"', '600 30px "DM Sans"', '600 40px "Barlow Condensed"',
  ];

  // ─── Small helpers ──────────────────────────────────────────────
  const setSpacing = (ctx, px) => { if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`; };
  const setFont = (ctx, { weight = 400, size, family, italic = false }) => { ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${family}"`; };
  const width = (ctx, text) => ctx.measureText(text).width;
  const plain = (s) => String(s).replace(/\s*\|\s*/g, ' ');

  function wrap(ctx, text, maxW) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && width(ctx, t) > maxW) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // Largest size (≤ max) at which `text` fits `maxW`.
  function fitSize(ctx, f, text, maxW, max) {
    let size = max;
    for (; size > 14; size -= 1) { setFont(ctx, { ...f, size }); if (width(ctx, text) <= maxW) break; }
    return size;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const FLAME = new Path2D('M12 1C13.2 6.4 20 9.6 20 17.6A8 8 0 0 1 4 17.6C4 13.6 6 11 8 9C8.5 11.3 9.5 12.5 10.7 12.9C10 8.6 10.4 4.5 12 1ZM12 15.4C13 17.4 15 18.4 15 20.8A3 3 0 0 1 9 20.8C9 19.2 10.5 18 12 15.4Z');
  const HEART = new Path2D('M12 21.2C5.2 15.6 1.2 12 1.2 7.3 1.2 3.9 3.8 1.4 7 1.4c2 0 3.8 1 5 2.8 1.2-1.8 3-2.8 5-2.8 3.2 0 5.8 2.5 5.8 5.9 0 4.7-4 8.3-10.8 13.9Z');

  function drawFlame(ctx, x, y, h, color) { ctx.save(); ctx.translate(x, y); ctx.scale(h / 28, h / 28); ctx.fillStyle = color; ctx.fill(FLAME, 'evenodd'); ctx.restore(); return h * 24 / 28; }
  function drawHeart(ctx, x, y, h, color) { ctx.save(); ctx.translate(x, y); ctx.scale(h / 22, h / 22); ctx.fillStyle = color; ctx.fill(HEART); ctx.restore(); return h * 24 / 22; }

  function drawSparkle(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx, cy, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx, cy, cx - r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - r);
    ctx.fill();
    ctx.restore();
  }

  function drawSun(ctx, cx, cy, r, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, PI2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
      ctx.lineTo(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Film grain: a small noise tile, multiplied over the whole card. Seeded so the same card always looks the same.
  let grainTile = null;
  function grain(ctx) {
    if (!grainTile) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const img = g.createImageData(256, 256);
      let seed = 7;
      for (let i = 0; i < img.data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const v = 90 + ((seed >>> 16) & 0x7f);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grainTile = c;
    }
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // ─── Images (same-origin; cached for the page's lifetime) ───────
  const imageCache = new Map();
  function loadImage(src) {
    if (!src) return Promise.resolve(null);
    if (!imageCache.has(src)) {
      imageCache.set(src, new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }));
    }
    return imageCache.get(src);
  }

  // A silhouette of a (single-colour) logo in another colour, e.g. a black wordmark → white.
  function tinted(img, w, h, color) {
    const c = document.createElement('canvas');
    c.width = Math.round(w); c.height = Math.round(h);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  let fontsReady = null;
  function loadFonts() {
    fontsReady ??= Promise.all(FONTS.map((f) => document.fonts.load(f).catch(() => {}))).then(() => document.fonts.ready);
    return fontsReady;
  }

  // ─── Card drawing ───────────────────────────────────────────────
  function background(ctx, sc) {
    const stops = sc.bg;
    if (stops.length === 1) ctx.fillStyle = stops[0];
    else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, W, H);
    if (sc.glow) {
      ctx.save();
      ctx.translate(W / 2, 980);
      ctx.scale(1, 0.8);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 560);
      g.addColorStop(0, sc.glow);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-W, -W, W * 2, W * 2);
      ctx.restore();
    }
  }

  function drawLogo(ctx, brand, sc, r, imgs) {
    if (brand.logo === 'round') {
      const s = 108, x = 60, y = brand.logoTop;
      if (imgs.logoRound) {
        ctx.save();
        ctx.shadowColor = 'rgba(16,21,15,.3)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
        ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, PI2); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2, 0, PI2); ctx.clip();
        ctx.drawImage(imgs.logoRound, x, y, s, s);
        ctx.restore();
      }
      ctx.fillStyle = sc.ink;
      setSpacing(ctx, 5.6);
      setFont(ctx, { family: 'Barlow Condensed', weight: 600, size: 40 });
      ctx.fillText((r.name || r.displayName).toUpperCase(), 188, y + 38);
      if (r.hours) {
        setFont(ctx, { family: 'DM Sans', weight: 500, size: 20 });
        setSpacing(ctx, 2.8);
        ctx.globalAlpha = 0.8;
        ctx.fillText(r.hours.toUpperCase(), 188, y + 70);
        ctx.globalAlpha = 1;
      }
      setSpacing(ctx, 0);
      return;
    }
    const img = imgs.logo;
    if (!img) {
      ctx.fillStyle = sc.ink;
      setFont(ctx, { family: brand.head.family, weight: 500, size: 44 });
      ctx.fillText((r.displayName || r.name).toUpperCase(), 60, brand.logoTop + 60);
      return;
    }
    const w = brand.logoW;
    const ratio = (img.naturalHeight || 1) / (img.naturalWidth || 1);
    const h = w * (ratio || 0.4);
    if (sc.logoTint) ctx.drawImage(tinted(img, w * 2, h * 2, sc.logoTint), 60, brand.logoTop, w, h);
    else ctx.drawImage(img, 60, brand.logoTop, w, h);
  }

  function drawPill(ctx, brand, sc, text, icon) {
    const p = sc.pill;
    setFont(ctx, { family: 'DM Sans', weight: 600, size: 22 });
    setSpacing(ctx, 3.3);
    const label = text.toUpperCase();
    const tw = width(ctx, label);
    const iconW = icon === 'flame' ? 26 : icon === 'heart' ? 28 : icon === 'sun' ? 30 : 14;
    const padL = icon === 'flame' ? 20 : 24;
    const w = padL + iconW + 14 + tw + 28 - 3.3;
    const h = 66, x = W - 60 - w, y = brand.pillTop;
    roundRect(ctx, x, y, w, h, h / 2);
    if (p.fill) { ctx.fillStyle = p.fill; ctx.fill(); }
    if (p.stroke) { ctx.lineWidth = 2.5; ctx.strokeStyle = p.stroke; ctx.stroke(); }
    const cy = y + h / 2, ix = x + padL;
    if (icon === 'flame') drawFlame(ctx, ix, cy - 16, 32, p.dot);
    else if (icon === 'heart') drawHeart(ctx, ix, cy - 13, 26, p.dot);
    else if (icon === 'sun') drawSun(ctx, ix + 15, cy, 14, p.dot);
    else {
      if (p.halo) { ctx.beginPath(); ctx.arc(ix + 7, cy, 13, 0, PI2); ctx.fillStyle = p.halo; ctx.fill(); }
      ctx.beginPath(); ctx.arc(ix + 7, cy, 7, 0, PI2); ctx.fillStyle = p.dot; ctx.fill();
    }
    ctx.fillStyle = p.ink;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, ix + iconW + 14, cy + 8);
    setSpacing(ctx, 0);
  }

  // Headline: as large as fits 960 px wide and the space above the dish. Returns its bottom and widest line.
  function drawHeadline(ctx, brand, sc, mood, raw) {
    const h = brand.head;
    const upper = h.upperMoods.includes(mood);
    const base = { family: h.family, weight: h.weight };
    const top = 262, maxW = 940, maxH = mood === 'roast' ? 470 : 430;
    let text = raw;
    if (mood === 'sarcastic') text = `“${text.replace(/\s*\|\s*/g, ' ')}”`;

    // Roast with three parts: small italic lead, huge accent middle, big closing line.
    const parts = text.split('|').map((s) => s.trim()).filter(Boolean);
    if (mood === 'roast' && parts.length === 3) {
      const fit = (t, f, max) => fitSize(ctx, f, t, maxW, max);
      const f1 = { family: 'Instrument Serif', weight: 400, italic: true };
      const f2 = { family: h.family, weight: 500 };
      const up = (t) => (upper ? t.toUpperCase() : t);
      setSpacing(ctx, -0.01 * 112); const s1 = fit(parts[0], f1, 112);
      setSpacing(ctx, -0.045 * 330); const s2 = fit(up(parts[1]), f2, 330);
      setSpacing(ctx, -0.04 * 200); const s3 = fit(up(parts[2]), f2, 200);
      let y = top + 100;
      setFont(ctx, { ...f1, size: s1 }); setSpacing(ctx, -0.01 * s1); ctx.fillStyle = sc.hl[0]; ctx.fillText(parts[0], 64, y);
      y += s2 * 0.82;
      setFont(ctx, { ...f2, size: s2 }); setSpacing(ctx, -0.045 * s2); ctx.fillStyle = sc.hl[1]; ctx.fillText(up(parts[1]), 54, y);
      y += s3 * 0.92;
      setFont(ctx, { ...f2, size: s3 }); setSpacing(ctx, -0.04 * s3); ctx.fillStyle = sc.hl[0]; ctx.fillText(up(parts[2]), 58, y);
      setSpacing(ctx, 0);
      return { bottom: y + 30, widest: maxW };
    }

    const segs = parts.length ? parts : [text];
    const ls = upper ? h.upperLs : h.mixedLs;
    const max = upper ? h.upperSize : h.mixedSize;
    const lh = h.family === 'Barlow Condensed' ? 0.84 : upper ? 0.92 : 0.98;
    let best = null;
    for (let size = max; size >= 54; size -= 4) {
      setFont(ctx, { ...base, weight: Math.max(h.weight, h.accWeight), italic: !!h.accItalic, size }); // wrap with the wider (accent) style so no line overflows
      setSpacing(ctx, ls * size);
      const lines = segs.flatMap((s) => wrap(ctx, upper ? s.toUpperCase() : s, maxW));
      const widest = Math.max(...lines.map((l) => width(ctx, l)));
      best = { size, lines, widest };
      if (widest <= maxW && lines.length * size * lh <= maxH && lines.length <= 5) break;
    }
    const { size, lines, widest } = best;
    lines.forEach((l, i) => {
      const accent = i === lines.length - 1; // the closing line carries the accent colour
      setFont(ctx, { ...base, weight: accent ? h.accWeight : h.weight, italic: accent && !!h.accItalic, size });
      setSpacing(ctx, ls * size);
      ctx.fillStyle = accent ? sc.hl[1] : sc.hl[0];
      ctx.fillText(l, 60, top + size * lh * (i + 0.5) + size * 0.34);
    });
    setSpacing(ctx, 0);
    return { bottom: top + lines.length * size * lh, widest };
  }

  function drawDish(ctx, img, box, sc, rot) {
    if (!img) return;
    const s = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    ctx.save();
    ctx.translate(cx, cy + h * 0.44);
    ctx.scale(1, 0.17);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.47);
    g.addColorStop(0, sc.shadow);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, w * 0.47, 0, PI2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.shadowColor = sc.drop; ctx.shadowBlur = 34; ctx.shadowOffsetY = 22;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawDial(ctx, sc, box) {
    const c = document.createElement('canvas');
    c.width = c.height = 800;
    const g = c.getContext('2d');
    g.translate(400, 400);
    g.strokeStyle = sc.deco;
    g.lineCap = 'round';
    g.globalAlpha = 0.35; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, 376, 0, PI2); g.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * PI2, major = i % 6 === 0;
      const r1 = 362, r2 = major ? 323 : 342;
      g.globalAlpha = major ? 0.85 : 0.5; g.lineWidth = major ? 6 : 3.4;
      g.beginPath(); g.moveTo(Math.sin(a) * r1, -Math.cos(a) * r1); g.lineTo(Math.sin(a) * r2, -Math.cos(a) * r2); g.stroke();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    const m = g.createLinearGradient(0, 0, 0, 800);
    m.addColorStop(0.04, 'rgba(0,0,0,0)'); m.addColorStop(0.24, '#000'); m.addColorStop(0.6, '#000'); m.addColorStop(0.8, 'rgba(0,0,0,0)');
    g.fillStyle = m; g.fillRect(0, 0, 800, 800);
    ctx.drawImage(c, box.x + box.w / 2 - 400, box.y + box.h / 2 - 380);
  }

  function cutRect(ctx, x, y, w, h, c) {
    ctx.beginPath();
    ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c); ctx.closePath();
  }

  function drawRays(ctx, sc) {
    const cx = W / 2, cy = 985, n = 24;
    ctx.save();
    ctx.translate(cx, cy);
    const g = ctx.createRadialGradient(0, 0, 60, 0, 0, 760);
    g.addColorStop(0, sc.deco); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < n; i += 2) {
      const a0 = (i / n) * PI2, a1 = ((i + 1) / n) * PI2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 760, a0, a1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawSeal(ctx, sc, x, y, size, rot) {
    const k = size / 300;
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(rot);
    ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, 0, 146, 0, PI2); ctx.fillStyle = sc.deco; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 138, 0, PI2); ctx.strokeStyle = sc.bg[0]; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; ctx.setLineDash([3, 6]); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // text round the rim
    const txt = 'LIVE 3D · FIRST LOOK · LIVE 3D · FIRST LOOK · ';
    setFont(ctx, { family: 'DM Sans', weight: 600, size: 24 });
    setSpacing(ctx, 0);
    const chars = [...txt];
    const total = chars.reduce((s, c) => s + width(ctx, c), 0);
    const gap = (PI2 * 112 - total) / chars.length;
    ctx.fillStyle = sc.bg[0];
    let a = -Math.PI / 2;
    for (const c of chars) {
      const cw = width(ctx, c) + gap;
      ctx.save(); ctx.rotate(a + (cw / 2) / 112); ctx.translate(0, -112); ctx.textAlign = 'center'; ctx.fillText(c, 0, 0); ctx.restore();
      a += cw / 112;
    }
    ctx.textAlign = 'center';
    setFont(ctx, { family: 'Jost', weight: 500, size: 76 });
    setSpacing(ctx, 1);
    ctx.fillText('NEW', 0, 26);
    ctx.restore();
    ctx.textAlign = 'left';
    setSpacing(ctx, 0);
  }

  function drawSticker(ctx, sc, text, x, y) {
    ctx.save();
    setFont(ctx, { family: 'DM Sans', weight: 600, size: 24 });
    setSpacing(ctx, 4.3);
    const label = text.toUpperCase();
    const w = width(ctx, label) + 52, h = 62;
    ctx.translate(x, y);
    ctx.rotate(-7 * Math.PI / 180);
    roundRect(ctx, 0, 8, w, h, 14); ctx.fillStyle = sc.ink; ctx.fill();
    roundRect(ctx, 0, 0, w, h, 14); ctx.fillStyle = sc.deco; ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(label, 26, 40);
    ctx.restore();
    setSpacing(ctx, 0);
  }

  // The ticket stub: table · branch · date and time · link · MENVA.
  function drawStub(ctx, brand, sc, info) {
    const s = sc.stub, SW = 960, SH = 280, NY = 190, NR = 28;
    const c = document.createElement('canvas');
    c.width = SW; c.height = SH;
    const g = c.getContext('2d');
    roundRect(g, 0, 0, SW, SH, 30);
    g.fillStyle = s.panel; g.fill();
    g.globalCompositeOperation = 'destination-out';
    for (const x of [0, SW]) { g.beginPath(); g.arc(x, NY, NR, 0, PI2); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    g.textBaseline = 'alphabetic';

    let tx = 48;
    if (info.table) {
      g.fillStyle = s.ink; g.globalAlpha = 0.7;
      setFont(g, { family: 'DM Sans', weight: 600, size: 19 }); setSpacing(g, 4.2);
      g.fillText('TABLE', 48, 42);
      g.globalAlpha = 1;
      setSpacing(g, 0);
      const nf = { ...brand.num };
      const size = fitSize(g, nf, info.table, 170, nf.size);
      setFont(g, { ...nf, size });
      g.fillStyle = s.accent;
      g.fillText(info.table, 44, 44 + size * 0.84);
      g.fillStyle = s.ink; g.globalAlpha = 0.18; g.fillRect(226, 34, 2, 130); g.globalAlpha = 1;
      tx = 262;
    }
    g.fillStyle = s.ink;
    setFont(g, { family: 'DM Sans', weight: 600, size: 27 }); setSpacing(g, 3.5);
    const maxTextW = SW - tx - 40;
    const place = info.place.toUpperCase();
    g.fillText(fitText(g, place, maxTextW), tx, 60);
    g.fillStyle = s.accent;
    g.fillText(fitText(g, `${info.date} · ${info.time}`.toUpperCase(), maxTextW), tx, 110);
    g.fillStyle = s.ink; g.globalAlpha = 0.75;
    setFont(g, { family: 'DM Sans', weight: 500, size: 22 }); setSpacing(g, 3.1);
    g.fillText(info.tag || 'LIVE 3D · FIRST LOOK', tx, 150);
    g.globalAlpha = 1;
    // perforation
    g.save();
    g.strokeStyle = s.ink; g.globalAlpha = 0.4; g.lineWidth = 3; g.setLineDash([14, 10]);
    g.beginPath(); g.moveTo(40, NY); g.lineTo(SW - 40, NY); g.stroke();
    g.restore();
    // link + wordmark
    g.fillStyle = s.ink;
    setFont(g, { family: 'DM Sans', weight: 500, size: 27 }); setSpacing(g, 0.5);
    g.fillText(fitText(g, info.link, 560), 48, 204 + 22);
    setSpacing(g, 0);
    setFont(g, { family: 'Instrument Serif', weight: 400, size: 50 });
    g.textAlign = 'right';
    g.fillText('menva.', SW - 48, 191 + 44);
    g.textAlign = 'left';
    ctx.drawImage(c, 60, 1420);
  }

  function fitText(ctx, text, maxW) {
    if (width(ctx, text) <= maxW) return text;
    let t = text;
    while (t.length > 4 && width(ctx, `${t}…`) > maxW) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  }

  // ─── Selfie card ────────────────────────────────────────────────
  // The guest's photo full-bleed (cover-cropped like the stage's object-fit: cover; a live-camera frame is
  // drawn mirrored to match the preview they framed, all text stays the right way round), the dish sticker
  // exactly where they put it, soft scrims, the line big at the top, the same logo, badge and ticket stub.
  function drawCover(ctx, src, mirror) {
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    if (!sw || !sh) return;
    const k = Math.max(W / sw, H / sh);
    const dw = sw * k, dh = sh * k, dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.save();
    if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    ctx.drawImage(src, dx, dy, dw, dh);
    ctx.restore();
  }

  function scrim(ctx, y0, y1, a0, a1) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, `rgba(8,8,8,${a0})`);
    g.addColorStop(1, `rgba(8,8,8,${a1})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0));
  }

  function drawSelfieSticker(ctx, img, st) {
    if (!img) return;
    const w = st.w * W, h = w * img.naturalHeight / img.naturalWidth;
    ctx.save();
    ctx.translate(st.x * W, st.y * H);
    ctx.rotate(st.rot * Math.PI / 180);
    ctx.shadowColor = 'rgba(0,0,0,.42)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 24;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  async function renderSelfieCard(state) {
    const { restaurant: r, dish, line, selfie } = state;
    const brand = brandFor(r);
    const sc = brand.sch.dark; // light ink + white logo over the photo
    const [, logoImg, roundImg, dishImg] = await Promise.all([
      loadFonts(),
      r.logo ? loadImage(r.logo) : null,
      r.logoRound ? loadImage(r.logoRound) : null,
      loadImage(dish.assets.card || dish.assets.poster),
    ]);
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#121211'; ctx.fillRect(0, 0, W, H);
    drawCover(ctx, selfie.photo, selfie.mirror);
    scrim(ctx, 0, 760, 0.55, 0);
    scrim(ctx, 1000, H, 0, 0.78);

    drawLogo(ctx, brand, sc, r, { logo: logoImg, logoRound: roundImg });
    drawPill(ctx, brand, sc, badgeText('selfie'), 'dot');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 4;
    drawHeadline(ctx, brand, sc, 'selfie', line);
    ctx.restore();

    const nf = brand.nameFont;
    const nameText = nf.upper ? dish.name.toUpperCase() : dish.name;
    const nsize = fitSize(ctx, nf, nameText, 960, nf.size);
    setFont(ctx, { ...nf, size: nsize });
    setSpacing(ctx, nf.ls * nsize);
    ctx.fillStyle = sc.ink;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 3;
    ctx.fillText(nameText, 60, 1296 + nsize * 0.82);
    ctx.restore();
    setSpacing(ctx, 0);

    drawStub(ctx, brand, sc, {
      table: state.table, place: [state.place, r.location].filter(Boolean).join(' · '),
      date: state.date, time: state.time, link: state.link, tag: 'SELFIE · LIVE AR',
    });
    drawSelfieSticker(ctx, dishImg, selfie.sticker); // the guest's own placement, on top of everything
    return canvas;
  }

  async function renderCard(state) {
    if (state.mood === 'selfie') return renderSelfieCard(state);
    const { restaurant: r, dish, mood, line } = state;
    const brand = brandFor(r);
    const sc = brand.sch[SCHEME_OF[mood]];
    const [, logoImg, roundImg, dishImg] = await Promise.all([
      loadFonts(),
      r.logo ? loadImage(r.logo) : null,
      r.logoRound ? loadImage(r.logoRound) : null,
      loadImage(dish.assets.card || dish.assets.poster),
    ]);
    const imgs = { logo: logoImg, logoRound: roundImg };

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'alphabetic';
    background(ctx, sc);

    // Behind the dish: a disc (new), sun rays (good vibes), the brand's own backdrop (otherwise).
    const box = brand.dishBox || { x: 100, y: 650, w: 880, h: 650 };
    if (mood === 'new') {
      ctx.beginPath(); ctx.arc(W / 2, 1008, 310, 0, PI2); ctx.fillStyle = sc.disc; ctx.fill();
    } else if (mood === 'goodVibes') {
      drawRays(ctx, sc);
    } else if (brand.signature === 'dial') {
      drawDial(ctx, sc, box);
    } else if (brand.signature === 'stage') {
      cutRect(ctx, 60, 730, 960, 540, 34); ctx.fillStyle = sc.stage; ctx.fill();
      cutRect(ctx, 70, 740, 940, 520, 28); ctx.lineWidth = 1.5; ctx.strokeStyle = sc.stageLine; ctx.stroke();
    }

    drawLogo(ctx, brand, sc, r, imgs);
    const icon = { fav: 'heart', streak: 'flame', goodVibes: 'sun' }[mood] || 'dot';
    drawPill(ctx, brand, sc, badgeText(mood, state.streak), icon);
    const hl = drawHeadline(ctx, brand, sc, mood, line);

    const smallBox = mood === 'new' ? { x: 260, y: 740, w: 560, h: 520 } : box;
    const rot = mood === 'roast' ? -5 * Math.PI / 180 : mood === 'sarcastic' ? 3 * Math.PI / 180 : 0;
    drawDish(ctx, dishImg, smallBox, sc, rot);
    if (mood === 'goodVibes') {
      drawSparkle(ctx, 130, 760, 34, sc.deco === '#E9A98E' ? '#E9A98E' : sc.hl[1]);
      drawSparkle(ctx, 960, 900, 26, sc.hl[1]);
      drawSparkle(ctx, 190, 1180, 20, sc.hl[1]);
    }
    if (mood === 'new') drawSeal(ctx, sc, 780, 700, 210, 12 * Math.PI / 180);
    if (mood === 'firstLook' && brand.signature === 'tag' && hl.widest < 720) {
      ctx.fillStyle = sc.hl[1];
      setFont(ctx, { family: 'Jost', weight: 500, size: 21 }); setSpacing(ctx, 4.2);
      ctx.textAlign = 'right';
      brand.tagWords.forEach((w, i) => ctx.fillText(w.toUpperCase(), W - 60, 312 + i * 34));
      ctx.textAlign = 'left'; setSpacing(ctx, 0);
    }
    if (mood === 'roast' && state.sticker) drawSticker(ctx, sc, state.sticker, 560, 1336);

    // Name block
    const nf = brand.nameFont;
    const nameText = nf.upper ? dish.name.toUpperCase() : dish.name;
    const decoW = mood === 'fav' ? 130 : mood === 'streak' ? 240 : 0;
    const nmax = mood === 'roast' && state.sticker ? 480 : 960 - decoW;
    const nsize = fitSize(ctx, nf, nameText, nmax, nf.size);
    setFont(ctx, { ...nf, size: nsize });
    setSpacing(ctx, nf.ls * nsize);
    ctx.fillStyle = sc.ink;
    const nameTop = mood === 'roast' ? 1322 : 1296;
    ctx.fillText(nameText, 60, nameTop + nsize * 0.82);
    setSpacing(ctx, 0);
    const sub = subText(mood, state.streak);
    if (sub) {
      setFont(ctx, { family: 'DM Sans', weight: 400, size: 29 });
      ctx.fillStyle = sc.muted; ctx.globalAlpha = 0.95;
      ctx.fillText(fitText(ctx, sub, 960), 60, nameTop + nsize + 14 + 26);
      ctx.globalAlpha = 1;
    }
    if (mood === 'fav') drawHeart(ctx, W - 60 - 58, 1312, 50, sc.deco);
    if (mood === 'streak') {
      const n = Math.min(state.streak, 4);
      let x = W - 60;
      for (let i = 0; i < n; i++) { const h = 72 + i * 14; x -= h * 24 / 28; drawFlame(ctx, x, 1372 - h, h, sc.deco); x -= 10; }
    }

    drawStub(ctx, brand, sc, {
      table: state.table,
      place: [state.place, r.location].filter(Boolean).join(' · '),
      date: state.date,
      time: state.time,
      link: state.link,
    });
    grain(ctx);
    return canvas;
  }

  // ─── Per-phone memory (localStorage; every call is safe without it) ─
  const store = {
    read(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } },
    write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} },
  };
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  function recordVisit(restaurantId) {
    const key = `menva.visits.${restaurantId}`;
    const days = store.read(key);
    const today = dayKey();
    if (!days.includes(today)) { days.push(today); store.write(key, days.slice(-60)); }
  }
  const visitDays = (restaurantId) => store.read(`menva.visits.${restaurantId}`).length;

  // True the first time this phone opens the dish.
  function markSeen(restaurantId, dishId) {
    const key = `menva.seen.${restaurantId}`;
    const seen = store.read(key);
    if (seen.includes(dishId)) return false;
    seen.push(dishId);
    store.write(key, seen.slice(-200));
    return true;
  }
  const isFav = (rid, did) => store.read(`menva.favs.${rid}`).includes(did);
  function setFav(rid, did) {
    const key = `menva.favs.${rid}`;
    const favs = store.read(key);
    if (!favs.includes(did)) { favs.push(did); store.write(key, favs.slice(-200)); }
  }

  // ─── The sheet ──────────────────────────────────────────────────
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const refreshIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 0 1 14-3.5M20 4v4h-4M20 14a8 8 0 0 1-14 3.5M4 20v-4h4"/></svg>';
  const shareIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  const saveIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5M5 20h14"/></svg>';
  const cameraIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.2" r="3.4"/></svg>';
  const retakeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4.5h4.5"/></svg>';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let dialog = null;
  let session = null; // the open sheet's state

  // ─── Selfie: camera stage, dish sticker, Snap ──────────────────
  // Nothing here uploads or stores anything: the camera stream, the frozen frame and the chosen file live
  // in memory for as long as the sheet is open. The camera is asked for only when the guest taps Selfie,
  // and is switched off when they leave Selfie, close the sheet, or hide the tab.
  // Dragging / pinching the sticker only changes a CSS transform; the card is composed once, on Snap.
  const STICKER_BASE = 0.55; // sticker width at scale 1, as a share of the frame
  const STICKER_MIN = 0.45, STICKER_MAX = 1.7;
  const hasCamera = () => !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');

  const newSelfie = () => ({
    phase: 'camera', // 'camera' → 'result' (after Snap)
    view: 'idle', // idle | starting | live | photo | panel
    gen: 0, stream: null, denied: false,
    photo: null, photoUrl: '', // a photo picked with the phone's own camera
    frozen: null, frozenMirror: false, // the snapped frame
    sticker: { x: 0.5, y: 0.55, s: 1, rot: -6 }, // centre as a share of the frame, scale, tilt in degrees
  });

  const sel = (q) => dialog.querySelector(q);
  const geo = { fw: 0, fh: 0, bw: 0, bh: 0 };

  function syncActions() {
    const s = session;
    if (!s || !dialog) return;
    const st = s.selfie, isSelfie = s.mood === 'selfie';
    const cam = isSelfie && st.phase === 'camera';
    sel('.share-go').hidden = cam || !s.canShare;
    sel('.share-save').hidden = cam;
    sel('.share-save').classList.toggle('is-primary', !s.canShare);
    sel('.selfie-snap').hidden = !(cam && (st.view === 'live' || st.view === 'photo'));
    sel('.selfie-retake').hidden = !(isSelfie && st.phase === 'result');
    dialog.dataset.selfie = isSelfie ? st.phase : '';
  }

  function setView(view, msg) {
    const st = session.selfie;
    st.view = view;
    sel('.selfie-stage').dataset.view = view;
    if (msg !== undefined) sel('.selfie-msg').textContent = msg;
    if (view === 'starting') sel('.selfie-msg').textContent = 'Starting the camera…';
    sel('.selfie-on').hidden = !(view === 'panel' && hasCamera() && !st.denied);
    syncActions();
  }

  function stopCamera() {
    const st = session?.selfie;
    if (!st || !dialog) return;
    st.gen++; // a camera request still waiting gets switched off when it arrives
    if (st.stream) st.stream.getTracks().forEach((t) => t.stop());
    st.stream = null;
    const v = sel('.selfie-video');
    try { v.pause(); } catch {}
    v.srcObject = null;
  }

  function clearPhoto() {
    const st = session?.selfie;
    if (!st) return;
    if (st.photoUrl) URL.revokeObjectURL(st.photoUrl);
    st.photo = null; st.photoUrl = '';
    sel('.selfie-photo').removeAttribute('src');
  }

  function resetSelfie() {
    if (!dialog) return;
    stopCamera();
    clearPhoto();
    if (session) session.selfie = newSelfie();
    const stage = sel('.selfie-stage');
    stage.hidden = true;
    stage.dataset.view = 'idle';
    sel('.selfie-sticker').removeAttribute('src');
    sel('.selfie-privacy').hidden = true;
    sel('.share-note').hidden = false;
    dialog.dataset.selfie = '';
  }

  function leaveSelfieStage() {
    const st = session.selfie;
    stopCamera();
    sel('.selfie-stage').hidden = true;
    if (st.view !== 'photo') st.view = 'idle';
    syncActions();
  }

  const promptText = () => {
    const s = session, pool = s.pools.selfie;
    return pool[s.idx.selfie % pool.length];
  };

  function showSelfieStage() {
    const s = session, st = s.selfie;
    s.token++; // a card still being composed for the previous mood is dropped
    sel('.share-preview').dataset.state = 'stage';
    sel('.share-img').hidden = true;
    sel('.selfie-stage').hidden = false;
    const stickerSrc = s.dish.assets.card || s.dish.assets.poster;
    const sticker = sel('.selfie-sticker');
    if (sticker.getAttribute('src') !== stickerSrc) sticker.src = stickerSrc;
    sticker.alt = `${s.dish.name} sticker. Drag to move it, pinch or scroll to resize.`;
    const p = sel('.selfie-prompt');
    p.textContent = '';
    promptText().split(/\s*\|\s*/).forEach((part, i) => { if (i) p.append(document.createElement('br')); p.append(part); });
    sel('.share-another').disabled = s.pools.selfie.length < 2;
    sel('.share-status').textContent = '';
    if (st.view === 'photo' && st.photoUrl) setView('photo');
    else if (st.view === 'idle') {
      if (!hasCamera()) setView('panel', 'Live camera isn’t available here. You can still take a selfie.');
      else if (st.denied) setView('panel', 'The camera is off. You can still take a selfie.');
      else startCamera();
    } else setView(st.view);
    layoutSticker();
  }

  async function startCamera() {
    const s = session, st = s.selfie;
    if (!hasCamera()) { setView('panel', 'Live camera isn’t available here. You can still take a selfie.'); return; }
    st.denied = false;
    setView('starting');
    const gen = ++st.gen;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: false });
    } catch (e) {
      if (gen !== st.gen || session !== s) return;
      st.denied = !!e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      setView('panel', st.denied ? 'The camera is off. You can still take a selfie.' : 'Live camera isn’t available here. You can still take a selfie.');
      return;
    }
    if (gen !== st.gen || session !== s || s.mood !== 'selfie' || st.phase !== 'camera') { stream.getTracks().forEach((t) => t.stop()); return; }
    if (document.hidden) { stream.getTracks().forEach((t) => t.stop()); setView('panel', 'The camera is paused.'); return; }
    st.stream = stream;
    stream.getVideoTracks().forEach((t) => t.addEventListener('ended', () => {
      if (session === s && st.stream === stream) { stopCamera(); setView('panel', 'The camera stopped. Turn it on again or take a selfie.'); }
    }));
    const v = sel('.selfie-video');
    v.srcObject = stream;
    try { await v.play(); } catch {}
    if (gen !== st.gen || session !== s) return;
    setView('live');
  }

  function loadPhoto(file) {
    const s = session, st = s.selfie;
    if (!file || (file.type && !/^image\//.test(file.type))) { setView('panel', 'That file isn’t a photo. Try again.'); return; }
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      if (session !== s || s.mood !== 'selfie' || st.phase !== 'camera') { URL.revokeObjectURL(url); return; }
      clearPhoto();
      stopCamera();
      st.photo = im; st.photoUrl = url;
      sel('.selfie-photo').src = url;
      setView('photo');
      layoutSticker();
    };
    im.onerror = () => { URL.revokeObjectURL(url); if (session === s) setView('panel', 'That photo couldn’t be opened. Try another.'); };
    im.src = url;
  }

  function snap() {
    const s = session, st = s?.selfie;
    if (!s || s.mood !== 'selfie' || st.phase !== 'camera') return;
    if (st.view === 'live') {
      const v = sel('.selfie-video');
      if (!v.videoWidth) return;
      const c = document.createElement('canvas');
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext('2d').drawImage(v, 0, 0);
      st.frozen = c; st.frozenMirror = true; // the card matches the mirror-view the guest framed
      stopCamera();
    } else if (st.view === 'photo' && st.photo) {
      st.frozen = st.photo; st.frozenMirror = false;
    } else return;
    st.phase = 'result';
    syncActions();
    draw();
  }

  function retake() {
    const s = session, st = s?.selfie;
    if (!s || st.phase !== 'result') return;
    st.phase = 'camera'; st.frozen = null; st.view = 'idle';
    clearPhoto();
    s.file = null;
    sel('.share-status').textContent = '';
    draw();
  }

  // — sticker: transform-only positioning —
  let raf = 0;
  function layoutSticker() {
    if (!session || !dialog) return;
    const stage = sel('.selfie-stage'), sticker = sel('.selfie-sticker');
    if (stage.hidden) return;
    geo.fw = stage.clientWidth; geo.fh = stage.clientHeight;
    if (!geo.fw) return;
    geo.bw = geo.fw * STICKER_BASE;
    const ratio = sticker.naturalWidth ? sticker.naturalHeight / sticker.naturalWidth : 0.75;
    geo.bh = geo.bw * ratio;
    sticker.style.width = `${geo.bw}px`;
    applySticker();
  }

  function clampSticker() {
    const k = session.selfie.sticker;
    k.s = Math.min(STICKER_MAX, Math.max(STICKER_MIN, k.s));
    const hw = geo.bw * k.s / 2, hh = geo.bh * k.s / 2;
    const cx = Math.min(geo.fw - hw, Math.max(hw, k.x * geo.fw));
    const cy = Math.min(geo.fh - hh, Math.max(hh, k.y * geo.fh));
    k.x = 2 * hw >= geo.fw ? 0.5 : cx / geo.fw;
    k.y = 2 * hh >= geo.fh ? 0.5 : cy / geo.fh;
  }

  function applySticker() {
    if (!session || !geo.fw) return;
    clampSticker();
    const k = session.selfie.sticker;
    const x = k.x * geo.fw - geo.bw / 2, y = k.y * geo.fh - geo.bh / 2;
    sel('.selfie-sticker').style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${k.rot}deg) scale(${k.s.toFixed(3)})`;
  }
  const scheduleSticker = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; applySticker(); }); };

  function wireSelfie() {
    const stage = sel('.selfie-stage'), sticker = sel('.selfie-sticker'), file = sel('.selfie-file');
    const active = () => session && session.mood === 'selfie' && session.selfie.phase === 'camera' && (session.selfie.view === 'live' || session.selfie.view === 'photo');
    sticker.addEventListener('load', layoutSticker);
    if ('ResizeObserver' in window) new ResizeObserver(layoutSticker).observe(stage);
    else window.addEventListener('resize', layoutSticker);

    // pointer gestures: one finger drags, two pinch (listeners on the frame so a second finger can land anywhere)
    const ptrs = new Map();
    let g = null;
    const pts = () => [...ptrs.values()];
    const dist = () => { const [a, b] = pts(); return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    const begin = () => {
      const k = session.selfie.sticker;
      if (ptrs.size === 1) { const [p] = pts(); g = { mode: 'drag', px: p.x, py: p.y, ox: k.x, oy: k.y }; }
      else if (ptrs.size >= 2) g = { mode: 'pinch', d0: dist(), s0: k.s };
      else g = null;
    };
    stage.addEventListener('pointerdown', (e) => {
      if (!active() || (ptrs.size === 0 && e.target !== sticker)) return;
      e.preventDefault();
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { stage.setPointerCapture(e.pointerId); } catch {}
      begin();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId) || !g || !session) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const k = session.selfie.sticker;
      if (g.mode === 'drag') {
        const p = ptrs.get(e.pointerId);
        k.x = g.ox + (p.x - g.px) / geo.fw; k.y = g.oy + (p.y - g.py) / geo.fh;
      } else k.s = g.s0 * dist() / g.d0;
      scheduleSticker();
    });
    const up = (e) => { if (ptrs.delete(e.pointerId) && session) begin(); };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('wheel', (e) => {
      if (!active()) return;
      e.preventDefault();
      session.selfie.sticker.s *= Math.exp(-e.deltaY * 0.0015);
      scheduleSticker();
    }, { passive: false });
    sticker.addEventListener('keydown', (e) => {
      if (!active()) return;
      const k = session.selfie.sticker, step = e.shiftKey ? 0.05 : 0.02;
      const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (move) { k.x += move[0]; k.y += move[1]; } else if (e.key === '+' || e.key === '=') k.s *= 1.08; else if (e.key === '-') k.s /= 1.08; else return;
      e.preventDefault();
      scheduleSticker();
    });

    sel('.selfie-take').addEventListener('click', () => file.click());
    file.addEventListener('change', () => { const f = file.files && file.files[0]; file.value = ''; if (f && session) loadPhoto(f); });
    sel('.selfie-on').addEventListener('click', () => { if (session && session.selfie.phase === 'camera') startCamera(); });
    sel('.selfie-snap').addEventListener('click', snap);
    sel('.selfie-retake').addEventListener('click', retake);

    // The camera never keeps running in the background.
    document.addEventListener('visibilitychange', () => {
      const st = session?.selfie;
      if (document.hidden && st && (st.stream || st.view === 'starting')) { stopCamera(); setView('panel', 'The camera is paused.'); }
    });
    window.addEventListener('pagehide', () => stopCamera());
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'share-dialog';
    dialog.className = 'share-dialog';
    dialog.setAttribute('aria-labelledby', 'share-title');
    dialog.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div>
      <button type="button" class="close-dialog share-close" aria-label="Close">${closeIcon}</button>
      <div class="share-body">
        <h2 id="share-title" class="share-title">Your table card</h2>
        <div class="share-preview" data-state="loading">
          <img class="share-img" alt="" width="1080" height="1920" hidden>
          <p class="share-loading" role="status">Making your card…</p>
          <div class="selfie-stage" data-view="idle" hidden>
            <video class="selfie-video" playsinline muted autoplay></video>
            <img class="selfie-photo" alt="" draggable="false">
            <div class="selfie-stub-guide" aria-hidden="true"><span>menva.</span></div>
            <p class="selfie-prompt" aria-live="polite"></p>
            <img class="selfie-sticker" alt="" draggable="false" tabindex="0">
            <div class="selfie-panel">
              <p class="selfie-msg" role="status"></p>
              <button type="button" class="selfie-on">${cameraIcon}<span>Turn camera on</span></button>
              <button type="button" class="selfie-take">${cameraIcon}<span>Take a selfie</span></button>
              <input type="file" class="selfie-file" accept="image/*" capture="user" hidden>
            </div>
          </div>
        </div>
        <p class="selfie-privacy" hidden>Your photo stays on your phone. Nothing is uploaded.</p>
        <div class="share-chips" role="group" aria-label="Card mood"></div>
        <div class="share-actions">
          <button type="button" class="selfie-snap" hidden>${cameraIcon}<span>Snap</span></button>
          <button type="button" class="share-another">${refreshIcon}<span>Another line</span></button>
          <button type="button" class="selfie-retake" hidden>${retakeIcon}<span>Retake</span></button>
          <button type="button" class="share-go" hidden>${shareIcon}<span>Share</span></button>
          <button type="button" class="share-save">${saveIcon}<span>Save image</span></button>
        </div>
        <p class="share-status" role="status" aria-live="polite"></p>
        <p class="share-note">Made on your phone. Nothing is uploaded.</p>
      </div>`;
    document.body.append(dialog);
    dialog.querySelector('.share-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      resetSelfie(); // stops the camera, forgets the photo
      const img = dialog.querySelector('.share-img');
      if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
      img.removeAttribute('src');
      session?.trigger?.focus?.();
      session = null;
    });
    dialog.querySelector('.share-another').addEventListener('click', () => {
      if (!session) return;
      const pool = session.pools[session.mood];
      session.idx[session.mood] = (session.idx[session.mood] + 1) % pool.length;
      draw();
    });
    wireSelfie();
    dialog.querySelector('.share-go').addEventListener('click', () => deliver('share'));
    dialog.querySelector('.share-save').addEventListener('click', () => deliver('save'));
    return dialog;
  }

  const canShareFiles = () => {
    try {
      if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false;
      return navigator.canShare({ files: [new File([new Blob(['x'])], 'card.jpg', { type: 'image/jpeg' })] });
    } catch { return false; }
  };

  const shuffleStart = (n) => (n > 1 ? Math.floor(Math.random() * n) : 0);

  function chipList(s) {
    return MOODS.filter((m) => {
      if (m.id === 'selfie') return s.restaurant.selfieCard === true;
      if (m.id === 'new') return s.isNew;
      if (m.id === 'streak') return s.streakDays >= 2;
      if (m.id === 'roast') return s.restaurant.roast !== false;
      return true;
    });
  }

  function renderChips() {
    const wrap = dialog.querySelector('.share-chips');
    wrap.innerHTML = chipList(session).map((m) => `<button type="button" class="share-chip" data-mood="${m.id}" aria-pressed="${m.id === session.mood}">${m.label}</button>`).join('');
    wrap.querySelectorAll('.share-chip').forEach((b) => b.addEventListener('click', () => {
      const mood = b.dataset.mood;
      if (mood === session.mood) return;
      session.mood = mood;
      if (mood === 'fav') setFav(session.restaurant.id, session.dish.id);
      wrap.querySelectorAll('.share-chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));
  }

  // Draws the card for the current mood/line, then keeps the JPEG ready so a tap on Share can call
  // navigator.share straight away (phones only allow sharing inside the tap).
  async function draw() {
    const s = session;
    if (!s) return;
    const token = ++s.token;
    const preview = dialog.querySelector('.share-preview');
    const img = dialog.querySelector('.share-img');
    const buttons = dialog.querySelectorAll('.share-go, .share-save, .share-another, .selfie-retake');
    const isSelfie = s.mood === 'selfie';
    dialog.querySelector('.selfie-privacy').hidden = !isSelfie;
    dialog.querySelector('.share-note').hidden = isSelfie;
    if (!isSelfie) leaveSelfieStage();
    else if (s.selfie.phase !== 'result') { showSelfieStage(); return; } // the camera stage: nothing is composed until Snap
    else dialog.querySelector('.selfie-stage').hidden = true;
    preview.dataset.state = 'loading';
    buttons.forEach((b) => { b.disabled = true; });
    dialog.querySelector('.share-status').textContent = '';

    const pool = s.pools[s.mood];
    const raw = pool[s.idx[s.mood] % pool.length];
    const state = {
      restaurant: s.restaurant, dish: s.dish, mood: s.mood, line: raw, streak: s.streakDays,
      table: s.table, place: s.place, date: s.date, time: s.time, link: s.link,
      sticker: s.restaurant.shareLines?.roastSticker || '',
      selfie: isSelfie ? { photo: s.selfie.frozen, mirror: s.selfie.frozenMirror, sticker: { x: s.selfie.sticker.x, y: s.selfie.sticker.y, w: STICKER_BASE * s.selfie.sticker.s, rot: s.selfie.sticker.rot } } : null,
    };
    let blob;
    try {
      const canvas = await renderCard(state);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    } catch { blob = null; }
    if (token !== s.token || session !== s) return;
    if (!blob) {
      preview.dataset.state = 'error';
      dialog.querySelector('.share-loading').textContent = 'The card couldn’t be made on this phone.';
      return;
    }
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    s.file = new File([blob], `menva-${s.restaurant.id}-${s.dish.id}${isSelfie ? '-selfie' : ''}.jpg`, { type: 'image/jpeg' });
    img.src = URL.createObjectURL(blob);
    img.hidden = false;
    img.alt = `${badgeText(s.mood, s.streakDays)}. ${plain(raw)} ${s.dish.name}, ${s.restaurant.name}.`;
    img.dataset.mood = s.mood;
    img.dataset.badge = badgeText(s.mood, s.streakDays);
    img.dataset.line = plain(raw);
    preview.dataset.state = 'ready';
    buttons.forEach((b) => { b.disabled = false; });
    dialog.querySelector('.share-another').disabled = pool.length < 2;
    syncActions();
  }

  function deliver(target) {
    const s = session;
    if (!s?.file) return;
    const status = dialog.querySelector('.share-status');
    const line = plain(s.pools[s.mood][s.idx[s.mood] % s.pools[s.mood].length]);
    const text = `${line} ${s.dish.name} at ${s.restaurant.name}, seen in ${s.mood === 'selfie' ? 'AR' : '3D'} first.`;
    const url = `${location.origin}/${s.restaurant.slug}`;
    const done = (how) => { window.MenvaTrack?.('share_card_shared', { dish: s.dish.id, mood: s.mood, target: how }); };
    if (target === 'share') {
      const data = { files: [s.file], text, url };
      let shared;
      try { shared = navigator.share(data); } catch { shared = Promise.reject(new Error('share')); }
      Promise.resolve(shared).then(() => { done('share'); status.textContent = 'Shared.'; }).catch((e) => {
        if (e && e.name === 'AbortError') return; // the diner closed the share sheet
        status.textContent = 'Sharing isn’t available here — use Save image instead.';
      });
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(s.file);
    a.download = s.file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = 'Saved to your phone. Add it to your story.';
    done('save');
  }

  /**
   * Opens the sheet. ctx: { restaurant, dish, table, isNew, trigger }
   * restaurant.shareLines: { firstLook, fav, new, streak, roast, sarcastic, goodVibes: string[] }
   */
  function open({ restaurant, dish, table, isNew, trigger }) {
    const d = ensureDialog();
    const now = new Date();
    const lines = restaurant.shareLines || {};
    const pools = Object.fromEntries(MOOD_IDS.map((m) => [m, (Array.isArray(lines[m]) && lines[m].length ? lines[m] : FALLBACK_LINES[m]).filter(Boolean)]));
    const streakDays = Math.max(visitDays(restaurant.id), 1);
    const favourite = isFav(restaurant.id, dish.id);
    session = {
      restaurant, dish, table: table ? String(table) : '', isNew: !!isNew, trigger, token: 0, file: null,
      streakDays, pools,
      idx: Object.fromEntries(MOOD_IDS.map((m) => [m, shuffleStart(pools[m].length)])),
      selfie: newSelfie(),
      mood: favourite ? 'fav' : 'firstLook',
      place: String(restaurant.area || restaurant.location || '').split(',')[0].trim(),
      date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      link: `${location.host}/${restaurant.slug}`,
    };
    d.dataset.theme = restaurant.theme || 'default';
    d.querySelector('.share-title').textContent = 'Your table card';
    session.canShare = canShareFiles();
    resetSelfie();
    d.querySelector('.share-img').hidden = true;
    d.querySelector('.share-loading').textContent = 'Making your card…';
    renderChips();
    syncActions();
    window.MenvaTrack?.('share_card_open', { dish: dish.id });
    d.showModal();
    draw();
  }

  window.MenvaShare = { open, recordVisit, markSeen, moods: MOOD_IDS, _esc: esc };
})();
