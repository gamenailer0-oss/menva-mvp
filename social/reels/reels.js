// MENVA motion Reels. Each reel is a list of scenes; each scene has a time window, a background
// and some HTML. Elements with class "a" animate in at data-at (seconds after the scene starts)
// with data-fx: rise | fade | drop | pop. Dish images are the logo-free crops of the real renders
// (made by social/print/print.mjs into social/print/.cache/).
(function () {
  'use strict';
  const dish = (name, w, extra = '') => `<img class="a dishimg" data-fx="drop" data-at="${extra || 0.9}" src="../print/.cache/${name}.png" style="width:${w}px;margin-left:-${w / 2}px;transform:translate(0,-50%)">`;
  const table = (d, w, at = 0.9) => `<div class="floor a" data-fx="fade" data-at="0"></div><div class="reticle a" data-fx="fade" data-at="0.3"></div>
    <div class="shadow a" data-fx="fade" data-at="${at + 0.35}"></div>${dish(d, w, at)}`;
  // A QR-style pattern (decorative: finder squares + fixed pseudo-random modules). Not a real code.
  const qrArt = (size) => {
    const n = 25, c = size / n; let r = '';
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const finder = (x, y) => `<rect x="${x * c}" y="${y * c}" width="${7 * c}" height="${7 * c}" fill="#1A1714"/><rect x="${(x + 1) * c}" y="${(y + 1) * c}" width="${5 * c}" height="${5 * c}" fill="#fff"/><rect x="${(x + 2) * c}" y="${(y + 2) * c}" width="${3 * c}" height="${3 * c}" fill="#1A1714"/>`;
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd() > 0.52) r += `<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="#1A1714"/>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${r}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
  };
  // A group chat whose messages pop in one by one (same look as the "chat" post layout).
  const chat = (title, members, msgs, start = 0.5, step = 0.75) => `<div class="a chat" data-fx="rise" data-at="0.1" style="flex:none;margin-top:50px"><div class="chat-head"><span class="chat-av"></span><span><b>${title}</b><small>${members}</small></span></div>
    <div class="chat-body">${msgs.map(([from, t], i) => `<div class="a msg${from ? '' : ' me'}" data-fx="pop" data-at="${start + i * step}">${from ? `<span class="from">${from}</span>` : ''}<p>${t}</p></div>`).join('')}</div></div>`;
  const shout = (h, at = 0.1) => `<div class="a shout" data-fx="pop" data-at="${at}" style="margin:0">${h}</div>`;
  const CAST = 'Hamza, Anum, Zain, Sara, Ali bhai, you';
  // A 360° turn of a real dish from its spin sprite (36 frames, 6×6, 480×360 each), drawn at `w` px wide.
  // render() steps the frame from the scene time: one full turn every `turn` seconds.
  const spin = (id, w, at = 0.2, turn = 4) => `<div class="a spin" data-fx="fade" data-at="${at}" data-turn="${turn}" style="width:${w}px;height:${Math.round(w * 0.75)}px;background-image:url(../../assets/dishes/${id}/spin.webp);background-size:${w * 6}px ${Math.round(w * 0.75) * 6}px"></div>`;
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
    'the-over-orderer': { len: 11, scenes: [
      { t: [0, 2.6], bg: 'ink', cls: 'center', html: `<div class="a over" data-fx="fade" data-at="0" style="font-size:34px;color:rgba(255,255,255,.8)">Types of people at dinner</div><div class="a big" data-fx="rise" data-at="0.3" style="margin-top:36px">The <em>over-orderer.</em></div>` },
      { t: [2.6, 6.6], bg: 'chili', html: `<div class="a mid" data-fx="rise" data-at="0.1">"Yeh bhi le lo,</div><div class="a mid" data-fx="rise" data-at="0.9"><em>woh bhi le lo,</em></div><div class="a mid" data-fx="rise" data-at="1.7">bach gaya toh</div><div class="a mid" data-fx="rise" data-at="2.4"><em>pack karwa lenge."</em></div>` },
      { t: [6.6, 9.2], bg: 'paper', cls: 'center', html: `<div class="a big" data-fx="pop" data-at="0.1">It never gets <em>packed.</em></div>` },
      { t: [9.2, 11], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Tag them.</div><div class="a small muted" data-fx="rise" data-at="0.5" style="margin-top:30px">Next time, see the portion first.</div><div style="margin-top:70px">${wm(0.8)}</div>` },
    ] },
    'no-app': { len: 11, scenes: [
      { t: [0, 2.8], bg: 'paper', cls: 'center', html: `<div class="a big" data-fx="rise" data-at="0.1">No app.</div><div class="a big" data-fx="rise" data-at="0.8"><em>No download.</em></div>` },
      { t: [2.8, 5.4], bg: 'ink', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Point your camera at the <em>table QR.</em></div><div class="a" data-fx="pop" data-at="0.9" style="margin-top:80px;background:#fff;border-radius:36px;padding:34px">${qrArt(380)}</div>` },
      { t: [5.4, 8.6], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.1" style="position:relative;z-index:2">The menu opens <em>in your browser.</em></div>${table('garlic-prawn-skewers-full', 800, 0.8)}<div class="a" data-fx="pop" data-at="1.8" style="position:absolute;left:0;right:0;top:1490px;text-align:center;z-index:3"><span class="tag">Safari · Chrome</span></div>` },
      { t: [8.6, 11], bg: 'chili', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Scan. Tap. <em>See it on your table.</em></div><div style="margin-top:80px">${wm(0.6)}</div>` },
    ] },
    'true-size': { len: 11.5, scenes: [
      { t: [0, 2.8], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Pinch to make it <em>bigger?</em></div><div class="a big" data-fx="pop" data-at="1.2" style="margin-top:50px"><em>Not here.</em></div>` },
      { t: [2.8, 7.4], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.1" style="position:relative;z-index:2">True size, <em>locked.</em></div>${table('steak-main-board', 820, 0.8)}<div class="a" data-fx="pop" data-at="2.0" style="position:absolute;left:0;right:0;top:1490px;text-align:center;z-index:3"><span class="tag">What you see is the portion you get</span></div>` },
      { t: [7.4, 11.5], bg: 'ink', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Honest portions.</div><div class="a mid" data-fx="rise" data-at="0.7"><em>Before you order.</em></div><div class="a small" data-fx="rise" data-at="1.3" style="margin-top:40px">Jitna dikhe, utna hi aaye.</div><div style="margin-top:80px">${wm(1.8)}</div>` },
    ] },
    'dish-drop-1': { len: 12, scenes: [
      { t: [0, 2.6], bg: 'chili', cls: 'center', html: `<div class="a over" data-fx="fade" data-at="0" style="font-size:34px;color:rgba(255,255,255,.85)">Dish drop · Week 1</div><div class="a big" data-fx="rise" data-at="0.3" style="margin-top:36px">This week on <em>the table.</em></div>` },
      { t: [2.6, 6.4], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.1" style="position:relative;z-index:2">The steak <em>board.</em></div>${table('steak-main-board', 820, 0.6)}` },
      { t: [6.4, 9.4], bg: 'paper', html: `<div class="a mid" data-fx="rise" data-at="0.1">Every <em>angle.</em></div><div class="a" data-fx="pop" data-at="0.5" style="margin-top:60px;background:var(--stage);border-radius:40px;height:820px;display:flex;align-items:center;justify-content:center"><img src="../print/.cache/steak-main-steak.png" style="width:760px"></div>` },
      { t: [9.4, 12], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Share it, or <em>keep it?</em></div><div class="a small muted" data-fx="rise" data-at="0.6" style="margin-top:30px">Comment A (share) or B (mine).</div><div style="margin-top:70px">${wm(1)}</div>` },
    ] },
    'iftar-table': { len: 12, scenes: [
      { t: [0, 3], bg: 'ink', cls: 'center', html: `<div class="a over" data-fx="fade" data-at="0" style="font-size:34px;color:rgba(255,255,255,.8)">Ramadan Mubarak, Lahore</div><div class="a mid" data-fx="rise" data-at="0.3" style="margin-top:36px">The table fills up <em>fast at iftar.</em></div>` },
      { t: [3, 7], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.1" style="position:relative;z-index:2">Decide before <em>you sit down.</em></div>${table('steak-main-board', 820, 0.8)}<div class="a" data-fx="pop" data-at="2.0" style="position:absolute;left:0;right:0;top:1490px;text-align:center;z-index:3"><span class="tag">Enough for the whole table?</span></div>` },
      { t: [7, 9.8], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Aik list,</div><div class="a mid" data-fx="rise" data-at="0.7"><em>sab ka khayal.</em></div><div class="a small muted" data-fx="rise" data-at="1.3" style="margin-top:40px">Show the waiter one list. Order once.</div>` },
      { t: [9.8, 12], bg: 'chili', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Pehle dekho, <em>phir order.</em></div><div style="margin-top:70px">${wm(0.6)}</div>` },
    ] },
    'order-before-the-toss': { len: 11, scenes: [
      { t: [0, 2.8], bg: 'chili', cls: 'center', html: `<div class="a over" data-fx="fade" data-at="0" style="font-size:34px;color:rgba(255,255,255,.85)">PSL season</div><div class="a big" data-fx="rise" data-at="0.3" style="margin-top:30px">Match night.</div>` },
      { t: [2.8, 5.4], bg: 'ink', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Everyone watches the screen.</div><div class="a mid" data-fx="rise" data-at="0.9"><em>Nobody reads the menu.</em></div>` },
      { t: [5.4, 8.8], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.1" style="position:relative;z-index:2">Order <em>before the toss.</em></div>${table('steak-sandwich-full', 760, 0.7)}<div class="a" data-fx="pop" data-at="1.8" style="position:absolute;left:0;right:0;top:1490px;text-align:center;z-index:3"><span class="tag">See it first. No surprises at the break.</span></div>` },
      { t: [8.8, 11], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Toss se pehle order.</div><div class="a small muted" data-fx="rise" data-at="0.5" style="margin-top:30px">Baqi sab match ke baad.</div><div style="margin-top:70px">${wm(0.9)}</div>` },
    ] },
    'khana-kahan-ep1': { len: 12, scenes: [
      { t: [0, 7.6], bg: 'paper', html: `<div class="a mid" data-fx="rise" data-at="0">Friday, <em>7:52 pm.</em></div>${chat('Khana kahan? (6)', CAST, [['Hamza', 'kahin bhi chalo yaar'], ['Anum', 'MM Alam?'], ['Hamza', 'nahi wahan nahi'], ['Zain', 'koi pic bhejo pehle'], ['Sara', 'jo tum log lo mera bhi wohi'], ['Ali bhai', 'main owner ko jaanta hoon']], 0.6, 1.0)}` },
      { t: [7.6, 10.2], bg: 'chili', cls: 'center', html: shout('9:40 pm.<br><em>Still</em> in the<br>car park.') },
      { t: [10.2, 12], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Tag your <em>Hamza.</em></div><div class="a small muted" data-fx="rise" data-at="0.5" style="margin-top:30px">Khana kahan? Every week.</div><div style="margin-top:70px">${wm(0.8)}</div>` },
    ] },
    'portion-police': { len: 13, scenes: [
      { t: [0, 5.6], bg: 'paper', html: `<div class="a mid" data-fx="rise" data-at="0">Anum has <em>questions.</em></div>${chat('Khana kahan? (6)', CAST, [['Anum', 'yeh board sharing hai ya single?'], ['Hamza', 'menu pe likha hai "generous"'], ['Anum', 'generous kiske liye?'], ['', 'ruko, table pe rakh ke dekhti hoon']], 0.6, 1.05)}` },
      { t: [5.6, 10.2], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.1" style="position:relative;z-index:2">This is <em>"generous."</em></div>${table('steak-main-board', 820, 0.7)}<div class="a" data-fx="pop" data-at="1.9" style="position:absolute;left:0;right:0;top:1490px;text-align:center;z-index:3"><span class="tag">Actual size, on the table</span></div>` },
      { t: [10.2, 13], bg: 'chili', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Sharing hai <em>ya single?</em></div><div class="a small" data-fx="rise" data-at="0.6" style="margin-top:36px">Comment your verdict.</div><div style="margin-top:80px">${wm(1)}</div>` },
    ] },
    'kal-se-diet': { len: 13, scenes: [
      { t: [0, 6.4], bg: 'paper', html: `<div class="a mid" data-fx="rise" data-at="0">Hamza's <em>diet,</em> day 4.</div>${chat('Khana kahan? (6)', CAST, [['Hamza', 'main sirf salad lunga'], ['Anum', 'pakka?'], ['Hamza', 'pakka'], ['Hamza', 'waise yeh steak sandwich kitna bara hai'], ['Zain', 'table pe rakh ke dekh lo']], 0.6, 0.95)}` },
      { t: [6.4, 10.6], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.1" style="position:relative;z-index:2">The salad. <em>(Hamza's version.)</em></div>${table('steak-sandwich-full', 760, 0.7)}<div class="a" data-fx="pop" data-at="1.8" style="position:absolute;left:0;right:0;top:1490px;text-align:center;z-index:3"><span class="tag">Kal se diet</span></div>` },
      { t: [10.6, 13], bg: 'ink', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">At least he <em>saw it first.</em></div><div style="margin-top:80px">${wm(0.7)}</div>` },
    ] },
    'mama-joined': { len: 13, scenes: [
      { t: [0, 6.4], bg: 'paper', html: `<div class="a mid" data-fx="rise" data-at="0">Mama has <em>joined the chat.</em></div>${chat('Family (4)', 'Mama, Hamza, Anum, you', [['Mama', 'beta itna sab kyun mangwaya'], ['Hamza', 'mama sharing hai'], ['Mama', 'itna bara? photo mein chota tha'], ['', 'mama photo nahi, asli size dekho']], 0.6, 1.1)}` },
      { t: [6.4, 10.4], bg: 'stage', html: `<div class="a mid" data-fx="rise" data-at="0.1" style="position:relative;z-index:2">Asli size. <em>Asli plate.</em></div>${table('steak-main-board', 820, 0.7)}` },
      { t: [10.4, 13], bg: 'paper', html: `${chat('Family (4)', 'Mama, Hamza, Anum, you', [['Mama', 'achha. phir theek hai.'], ['Mama', 'aur naan?']], 0.3, 0.8)}<div style="margin-top:auto;text-align:center">${wm(1.6)}</div>` },
    ] },
    'every-side': { len: 15, scenes: [
      { t: [0, 2.4], bg: 'ink', cls: 'center', html: `<div class="a big" data-fx="rise" data-at="0.1">Every side.</div><div class="a big" data-fx="rise" data-at="0.7"><em>Every dish.</em></div>` },
      { t: [2.4, 5.6], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0">The steak <em>board.</em></div><div style="margin-top:60px">${spin('steak-main', 900, 0.1, 3.2)}</div>` },
      { t: [5.6, 8.8], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0">The chicken <em>pizza.</em></div><div style="margin-top:60px">${spin('bz-chicken-pizza', 900, 0.1, 3.2)}</div>` },
      { t: [8.8, 12], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0">The steak <em>sandwich.</em></div><div style="margin-top:60px">${spin('steak-sandwich', 900, 0.1, 3.2)}</div>` },
      { t: [12, 15], bg: 'chili', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Real scans. <em>Not photos.</em></div><div class="a small" data-fx="rise" data-at="0.6" style="margin-top:36px">Turn it before you order it.</div><div style="margin-top:80px">${wm(1)}</div>` },
    ] },
    'pizza-turn': { len: 12, scenes: [
      { t: [0, 2.6], bg: 'chili', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Pizza photos <em>lie</em> about the crust.</div>` },
      { t: [2.6, 9.4], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0">So we scanned <em>the whole thing.</em></div><div style="margin-top:70px">${spin('bz-chicken-pizza', 960, 0.2, 5)}</div><div class="a" data-fx="pop" data-at="2.4" style="margin-top:60px"><span class="tag">Every side, true size</span></div>` },
      { t: [9.4, 12], bg: 'ink', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">Pehle dekho, <em>phir order.</em></div><div style="margin-top:80px">${wm(0.6)}</div>` },
    ] },
    'green-plate-turn': { len: 11, scenes: [
      { t: [0, 2.4], bg: 'paper', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">What's under <em>the garnish?</em></div>` },
      { t: [2.4, 8.6], bg: 'stage', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0">Turn it <em>and see.</em></div><div style="margin-top:70px">${spin('garlic-prawn-skewers', 960, 0.2, 4.5)}</div>` },
      { t: [8.6, 11], bg: 'chili', cls: 'center', html: `<div class="a mid" data-fx="rise" data-at="0.1">The green plate. <em>No secrets.</em></div><div style="margin-top:80px">${wm(0.6)}</div>` },
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
      for (const sp of s.el.querySelectorAll('.spin')) { // step the 360° sprite with the scene clock
        const turn = Number(sp.dataset.turn || 4), f = Math.floor(((Math.max(0, local) % turn) / turn) * 36) % 36;
        const w = sp.offsetWidth, h = sp.offsetHeight;
        sp.style.backgroundPosition = `-${(f % 6) * w}px -${Math.floor(f / 6) * h}px`;
      }
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
