// Draws one post slide from URL data. See README.md in this folder for the fields.
(function () {
  'use strict';

  // Real dish renders only (assets/dishes/<id>/poster.webp, 1200×900, transparent background).
  // Every crop is a box in poster pixels. Two boards have "Gauchos" carved into the wood
  // (steak-main: x 315–370, y 505–590; chicken-fajita-wrap: x 770–870, y 390–470), so their
  // crops stop short of it. `fade` softens a cut edge so it doesn't read as a hard line.
  // Only crops marked brand: true show the carving — they are refused unless the slide
  // sets brandOk: true (needs Abdullah's OK to name Gauchos).
  const CROPS = {
    'steak-main': {
      board:  { x: 382, y: 240, w: 710, h: 650, fade: 'left' },
      steak:  { x: 470, y: 270, w: 470, h: 380, fade: 'all' },
      sides:  { x: 405, y: 500, w: 640, h: 330, fade: 'left' },
      full:   { x: 205, y: 235, w: 890, h: 665, brand: true },
    },
    'steak-sandwich': {
      full:   { x: 238, y: 250, w: 690, h: 655 },
      close:  { x: 460, y: 380, w: 450, h: 380, fade: 'all' },
    },
    'garlic-prawn-skewers': {
      full:   { x: 125, y: 270, w: 830, h: 520 },
      close:  { x: 320, y: 270, w: 580, h: 360, fade: 'all' },
    },
    'chicken-fajita-wrap': {
      board:  { x: 395, y: 225, w: 372, h: 610, fade: 'right' },
      close:  { x: 400, y: 540, w: 370, h: 300, fade: 'all' },
      full:   { x: 205, y: 225, w: 880, h: 645, brand: true },
    },
    // Chicken pizza (second partner restaurant): no branding on the board or paper.
    'bz-chicken-pizza': {
      full:   { x: 110, y: 270, w: 880, h: 520 },
      pizza:  { x: 150, y: 310, w: 700, h: 420, fade: 'all' },
      close:  { x: 300, y: 360, w: 460, h: 300, fade: 'all' },
    },
  };
  const DEFAULT_CROP = { 'steak-main': 'board', 'steak-sandwich': 'full', 'garlic-prawn-skewers': 'full', 'chicken-fajita-wrap': 'board', 'bz-chicken-pizza': 'full' };

  const AR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>';

  function readData() {
    const q = new URLSearchParams(location.search).get('d');
    try {
      if (q) {
        const b64 = q.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
      }
      if (location.hash.length > 1) return JSON.parse(decodeURIComponent(location.hash.slice(1)));
    } catch (e) {
      fail('Could not read slide data: ' + e.message);
    }
    return { layout: 'statement', h: 'No slide data', b: 'Open with ?d=<base64url JSON>.' };
  }

  function fail(msg) {
    window.__error = msg;
    document.title = 'ERROR: ' + msg;
    // Gotenberg runs with failOnConsoleExceptions, so a broken slide stops the post instead of going out.
    setTimeout(() => { throw new Error('MENVA slide: ' + msg); });
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // *word* → italic accent, **word** → bold, line breaks kept
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

  // A dish placeholder; fillStages() sizes it to the room left once the text is laid out.
  const stage = (id, crop, brandOk, cls = 'stage') =>
    `<div class="${cls}" data-dish="${esc(id)}" data-crop="${esc(crop || '')}" data-brand="${brandOk ? 1 : ''}"></div>`;

  // A cropped dish that fits inside a w×h box.
  // Posters are 1200 px wide, so never blow a crop up more than 2× — beyond that it goes soft.
  function dish(id, cropName, boxW, boxH, allowBrand) {
    const crops = CROPS[id];
    if (!crops) { fail('Unknown dish "' + id + '"'); return ''; }
    const name = cropName || DEFAULT_CROP[id];
    const c = crops[name];
    if (!c) { fail('Unknown crop "' + name + '" for ' + id); return ''; }
    if (c.brand && !allowBrand) { fail('Crop "' + name + '" of ' + id + ' shows restaurant branding; set brandOk only with Abdullah\'s OK'); return ''; }
    const s = Math.min(boxW / c.w, boxH / c.h, 2);
    const w = Math.round(c.w * s), h = Math.round(c.h * s);
    const mask = {
      left: 'linear-gradient(to right, transparent 0, #000 16%)',
      right: 'linear-gradient(to left, transparent 0, #000 16%)',
      all: 'radial-gradient(ellipse 50% 50% at 50% 50%, #000 62%, transparent 100%)',
    }[c.fade] || '';
    const maskCss = mask ? `-webkit-mask-image:${mask};mask-image:${mask};` : '';
    return `<div class="dish" style="width:${w}px;height:${h}px;${maskCss}">` +
      `<img src="../../assets/dishes/${esc(id)}/poster.webp" alt="" style="width:${Math.round(1200 * s)}px;left:${Math.round(-c.x * s)}px;top:${Math.round(-c.y * s)}px">` +
      `</div>`;
  }

  function top(d) {
    return `<div class="top"><span class="over ${d.bg === 'chili' || d.bg === 'ink' ? '' : 'muted'}">${esc(d.over || '')}</span><span class="count muted">${esc(d.n || '')}</span></div>`;
  }
  function foot(d) {
    const right = d.cta ? `<span class="pill ${d.bg === 'chili' ? 'pill-white' : 'pill-chili'}">${AR_ICON}${esc(d.cta)}</span>`
      : `<span class="handle muted">${esc(d.handle || '')}</span>`;
    return `<div class="foot"><span class="wordmark">menva<i>.</i></span>${right}</div>`;
  }
  const size = (d, def) => 'h-' + (d.size || def);
  const bodyHtml = (d) => (d.b ? `<p class="body">${rich(d.b)}</p>` : '') + (d.ru ? `<p class="roman muted">${rich(d.ru)}</p>` : '');

  const LAYOUTS = {
    hero: (d) => `${top(d)}${stage(d.dish, d.crop, d.brandOk)}
      <h1 class="${size(d, 'm')}">${rich(d.h)}</h1>${bodyHtml(d)}${foot(d)}`,

    statement: (d) => `${top(d)}<h1 class="${size(d, 'xl')}">${rich(d.h)}</h1>${bodyHtml(d)}${foot(d)}`,

    phone: (d) => `${top(d)}<h1 class="${size(d, 'm')}">${rich(d.h)}</h1>${d.b ? `<p class="body muted" style="margin-top:20px">${rich(d.b)}</p>` : ''}
      <div class="phone-wrap"><div class="phone"><div class="screen"><div class="table"></div><div class="reticle"></div>
      ${stage(d.dish, d.crop, d.brandOk, 'stage screen-dish')}<div class="notch"></div>
      <span class="pill pill-white">${AR_ICON}${esc(d.pill || 'See it on your table')}</span></div></div></div>`,

    step: (d) => `${top(d)}<div class="num">${esc(d.num || '')}</div><h1 class="${size(d, 'm')}">${rich(d.h)}</h1>${bodyHtml(d)}
      ${d.dish ? stage(d.dish, d.crop, d.brandOk) : ''}${foot(d)}`,

    split: (d) => `${top(d)}<h1 class="${size(d, 's')}">${rich(d.h)}</h1>
      <div class="split">
        <div class="card card-plain"><span class="label">${esc(d.leftLabel || 'A menu line')}</span>
          <div style="margin:auto 0"><div class="menu-line">${rich(d.menuLine || '')}</div><span class="dots"></span>
          ${d.menuDesc ? `<p class="menu-desc">${rich(d.menuDesc)}</p>` : ''}</div></div>
        <div class="card card-real"><span class="label">${esc(d.rightLabel || 'On MENVA')}</span>
          ${stage(d.dish, d.crop, d.brandOk)}</div>
      </div>${foot(d)}`,

    duo: (d) => `${top(d)}<h1 class="${size(d, 's')}">${rich(d.h)}</h1>
      <div class="duo">${[0, 1].map((i) => `<div class="card"><span class="letter">${'AB'[i]}</span>
        ${stage(d.dishes[i], (d.crops || [])[i], d.brandOk)}
        <span class="tagline">${esc((d.labels || [])[i] || '')}</span></div>`).join('')}</div>${bodyHtml(d)}${foot(d)}`,

    note: (d) => `${top(d)}<div class="mark">“</div><h1 class="${size(d, 's')}">${rich(d.h)}</h1>
      ${d.ru ? `<p class="roman muted" style="margin-top:32px">${rich(d.ru)}</p>` : ''}
      ${d.by ? `<p class="by">${esc(d.by)}</p>` : ''}${foot(d)}`,

    closeup: (d) => `${top(d)}${stage(d.dish, d.crop, d.brandOk)}
      <div class="caption"><h1>${rich(d.h)}</h1>${d.b ? `<p class="body">${rich(d.b)}</p>` : ''}</div>${foot(d)}`,

    list: (d) => `${top(d)}<h1 class="${size(d, 's')}">${rich(d.h)}</h1>
      <ol class="list">${(d.items || []).map((it, i) => `<li><span class="n">${i + 1}</span><span>${rich(it)}</span></li>`).join('')}</ol>${foot(d)}`,

    // chat: a group-chat screenshot drawn from scratch (no app's branding). msgs: [{ from, t }] or [{ me: true, t }]
    chat: (d) => `${top(d)}<h1 class="${size(d, 's')}">${rich(d.h)}</h1>
      <div class="chat${(d.msgs || []).length > 5 ? ' many' : ''}"><div class="chat-head"><span class="chat-av"></span><span><b>${esc(d.title || 'Dinner plan')}</b><small>${esc(d.members || '')}</small></span></div>
      <div class="chat-body">${(d.msgs || []).map((m) => m.me
        ? `<div class="msg me"><p>${rich(m.t)}</p></div>`
        : `<div class="msg"><span class="from">${esc(m.from || '')}</span><p>${rich(m.t)}</p></div>`).join('')}</div></div>
      ${bodyHtml(d)}${foot(d)}`,

    // receipt: a till slip. lines: [["item", "amount"]], total: ["Total", "amount"]. Never real prices.
    receipt: (d) => `${top(d)}<h1 class="${size(d, 's')}">${rich(d.h)}</h1>
      <div class="receipt"><div class="r-head">${esc(d.title || 'Table 7')}</div>
      ${(d.lines || []).map(([a, b]) => `<div class="r-line"><span>${rich(a)}</span><span>${rich(b || '')}</span></div>`).join('')}
      ${d.total ? `<div class="r-total"><span>${rich(d.total[0])}</span><span>${rich(d.total[1] || '')}</span></div>` : ''}
      ${d.footer ? `<div class="r-foot">${rich(d.footer)}</div>` : ''}</div>${bodyHtml(d)}${foot(d)}`,

    // notes: a phone notes page. items with ~~text~~ are struck through.
    notes: (d) => `${top(d)}<div class="notes"><div class="n-date">${esc(d.title || '')}</div><h2>${rich(d.h)}</h2>
      <ul>${(d.items || []).map((it) => `<li>${rich(it).replace(/~~(.+?)~~/g, '<s>$1</s>')}</li>`).join('')}</ul></div>
      ${bodyHtml(d)}${foot(d)}`,

    // cover: a Reel's cover frame, full bleed (img = social/reels/out/<name>-cover.jpg). Reels only.
    cover: (d) => /^social\/reels\/out\/[\w-]+\.jpg$/.test(d.img || '') ? `<img class="cover-img" src="../../${esc(d.img)}" alt="">` : (fail('cover needs img = social/reels/out/<name>-cover.jpg'), ''),

    // meme: a finished meme slide, full bleed (img = social/memes/<name>.png or .jpg), no overlay.
    meme: (d) => /^social\/memes\/(out\/)?[\w-]+\.(png|jpg)$/.test(d.img || '') ? `<img class="cover-img" src="../../${esc(d.img)}" alt="">` : (fail('meme needs img = social/memes/<name>.png'), ''),

    // riddle: the pre-launch treasure hunt. pattern: the answer's letters as boxes ('_' a letter, '?' the one
    // that counts, ' ' a gap). board: the 10-letter code so far ('_' unknown, '?' tonight's slot, letters found).
    riddle: (d) => `${top(d)}<h1 class="${size(d, 's')}">${rich(d.h)}</h1>
      <div class="blanks">${[...(d.pattern || '')].map((c) => c === ' ' ? '<span class="gap"></span>' : `<span class="bl${c === '?' ? ' hit' : ''}">${c === '?' ? '?' : ''}</span>`).join('')}</div>
      ${bodyHtml(d)}
      <div class="board"><span class="board-label">${esc(d.boardLabel || 'The code')}</span><div class="cells">${[...(d.board || '')].map((c, i) => `${i === 5 ? '<span class="gap"></span>' : ''}<span class="cell${c === '?' ? ' hit' : c === '_' ? '' : ' got'}"><b>${c === '_' || c === '?' ? '' : esc(c)}</b><i>${i + 1}</i></span>`).join('')}</div></div>
      ${foot(d)}`,

    // shout: huge, heavy, stacked sans. For punchlines only.
    shout: (d) => `${top(d)}<h1 class="shout">${rich(d.h)}</h1>${bodyHtml(d)}${foot(d)}`,

    cta: (d) => `${top(d)}<h1 class="${size(d, 'l')}">${rich(d.h)}</h1>${bodyHtml(d)}
      <div class="actions">${(d.actions || ['Link in bio']).map((a, i) => `<span class="pill ${i ? 'pill-line' : (d.bg === 'chili' ? 'pill-white' : 'pill-chili')}">${esc(a)}</span>`).join('')}</div>
      <div class="foot"><span class="wordmark">menva<i>.</i></span><span class="handle ${d.bg === 'chili' || d.bg === 'ink' ? '' : 'muted'}">${esc(d.handle || '')}</span></div>`,
  };

  const d = readData();
  const layout = LAYOUTS[d.layout] ? d.layout : (fail('Unknown layout "' + d.layout + '"'), 'statement');
  // tall: 1080×1920 for Stories/Reels covers/9:16 ads, with Instagram's top/bottom UI kept clear.
  if (d.tall) document.documentElement.classList.add('tall');
  const el = document.getElementById('slide');
  el.className = `slide l-${layout} bg-${d.bg || 'paper'}${d.peek ? ' peek' : ''}`;
  // peek: the dish is blurred (a teaser). clue: { l: 'P', pos: '1/10' }, a treasure-hunt letter.
  const clue = d.clue ? `<div class="clue"><b>${esc(d.clue.l)}</b><small>${esc(d.clue.pos)}</small></div>` : '';
  el.innerHTML = LAYOUTS[layout](d) + (d.stamp ? `<div class="stamp">${esc(d.stamp)}</div>` : '') + clue;

  // Fill each stage with its dish, as big as the stage allows (the phone screen gets a fixed box).
  function fillStages() {
    el.querySelectorAll('[data-dish]').forEach((st) => {
      const w = st.classList.contains('screen-dish') ? 440 : st.clientWidth;
      const h = st.classList.contains('screen-dish') ? 330 : st.clientHeight;
      st.innerHTML = dish(st.dataset.dish, st.dataset.crop, Math.max(w - 8, 40), Math.max(h - 8, 40), !!st.dataset.brand);
    });
  }

  // Ready once fonts and every image have loaded (or failed — then __error is set).
  // Fonts first (they decide how much room the text takes), then the dishes, then wait for images.
  const faces = ['400 40px "Instrument Serif"', 'italic 400 40px "Instrument Serif"', '400 30px "DM Sans"', '500 30px "DM Sans"', '600 30px "DM Sans"'];
  Promise.all(faces.map((f) => document.fonts.load(f))).then(() => document.fonts.ready).then(() => {
    fillStages();
    const imgs = [...el.querySelectorAll('img')].map((img) => img.complete ? Promise.resolve() : new Promise((r) => {
      img.onload = r; img.onerror = () => { fail('Image failed: ' + img.src); r(); };
    }));
    return Promise.all(imgs);
  }).catch((e) => fail('Fonts failed to load: ' + e.message))
    // On an error, fail() has already queued its throw; mark ready a moment later so Gotenberg
    // sees the exception first and refuses the render (failOnConsoleExceptions) instead of shooting it.
    .then(() => { if (window.__error) setTimeout(() => { window.__ready = true; }, 100); else window.__ready = true; });
})();
