/* PINE TAR - UI, pixel renderer, screens. Depends on engine.js (window.Engine). */
(function () {
'use strict';
const E = window.Engine;
const app = document.getElementById('app');
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
let settings = Object.assign({ mode: 'key', sound: true, fast: false }, store.get('pinetar.set', {}));
let meta = Object.assign({ runs: 0, best: 0, titles: 0, bestWins: 0 }, store.get('pinetar.meta', {}));
let run = null;
let draft = null;
const saveSettings = () => store.set('pinetar.set', settings);
const saveRun = () => { if (run) store.set('pinetar.run', run); };

/* ---------- audio ---------- */
let ac = null;
function beep(seq) {
  if (!settings.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    let t = ac.currentTime;
    for (const [f, d, type, v] of seq) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); t += d * 0.85;
    }
  } catch (e) {}
}
const SND = {
  click: [[700, 0.03]], buy: [[600, 0.05], [900, 0.08]], bad: [[150, 0.14, 'sawtooth']],
  hit: [[440, 0.05], [660, 0.08]], hr: [[523, 0.07], [659, 0.07], [784, 0.07], [1046, 0.22]],
  out: [[220, 0.1, 'triangle']], k: [[320, 0.05], [200, 0.1]], bb: [[500, 0.05]],
  win: [[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.1], [784, 0.08], [1046, 0.3]],
  lose: [[330, 0.2, 'triangle'], [262, 0.2, 'triangle'], [196, 0.4, 'triangle']],
  steal: [[500, 0.04], [700, 0.04], [900, 0.05]],
};
const snd = k => beep(SND[k]);

/* ---------- portraits ---------- */
const SKIN = ['#ffcd75', '#e8a87c', '#c68642', '#8d5524'];
const HAIR = ['#1a1c2c', '#5d275d', '#b0541f', '#333c57', '#c9a227'];
const CAPS = ['#b13e53', '#3b5dc9', '#38b764', '#ef7d57', '#5d275d', '#41a6f6'];
const ptCache = {};
function portrait(p) {
  const key = p.look + p.kind;
  if (ptCache[key]) return ptCache[key];
  let s = p.look;
  const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const skin = SKIN[Math.floor(r() * 4)], hair = HAIR[Math.floor(r() * 5)], cap = CAPS[Math.floor(r() * 6)];
  const cv = document.createElement('canvas'); cv.width = 12; cv.height = 12;
  const x = cv.getContext('2d');
  const R = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  R(cap, 1, 10, 10, 2); R('#f4f4f4', 5, 10, 2, 2); // jersey
  R(skin, 5, 9, 2, 1); R(skin, 3, 4, 6, 5);
  R(hair, 2, 4, 1, 3); R(hair, 9, 4, 1, 3);
  R(cap, 3, 1, 6, 3); R(cap, 2, 3, 8, 1); R(p.kind === 'bat' ? '#f4f4f4' : '#ffcd75', 5, 2, 2, 1);
  R('#1a1c2c', 4, 5, 1, 1); R('#1a1c2c', 7, 5, 1, 1);
  R(r() < 0.35 ? hair : '#b13e53', 5, 7, 2, 1);
  return (ptCache[key] = cv.toDataURL());
}
function ballIcon() {
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
  const x = cv.getContext('2d');
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const d = Math.hypot(i - 7.5, j - 7.5);
    if (d < 7.6) { x.fillStyle = d > 6.2 ? '#94b0c2' : '#f4f4f4'; x.fillRect(i, j, 1, 1); }
  }
  x.fillStyle = '#b13e53';
  [[3, 3], [3, 5], [2, 7], [3, 9], [3, 11], [12, 3], [12, 5], [13, 7], [12, 9], [12, 11]].forEach(([a, b]) => x.fillRect(a, b, 1, 1));
  [[4, 4], [4, 6], [4, 8], [4, 10], [11, 4], [11, 6], [11, 8], [11, 10]].forEach(([a, b]) => x.fillRect(a, b, 1, 1));
  return cv.toDataURL();
}

/* ---------- field renderer ---------- */
const Field = (() => {
  const W = 160, H = 100;
  const B = [[80, 90], [120, 60], [80, 30], [40, 60]]; // home, 1B, 2B, 3B
  const FIELD_SPOTS = [[80, 62], [80, 97], [112, 62], [98, 42], [62, 42], [48, 62], [34, 30], [80, 18], [126, 30]]; // P C 1B 2B SS 3B LF CF RF
  const US = ['#f4f4f4', '#41a6f6'];
  let cv, ctx, bg, raf = 0;
  let st = { batSide: 'opp', stat: [null, null, null], batter: null, pitcher: null, colors: { us: US, opp: ['#b13e53', '#f4f4f4'] }, anim: null, parts: [], swing: false, fielders: true };

  function buildBG() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), img = x.createImageData(W, H);
    const put = (X, Y, hex) => { const i = (Y * W + X) * 4; img.data[i] = parseInt(hex.slice(1, 3), 16); img.data[i + 1] = parseInt(hex.slice(3, 5), 16); img.data[i + 2] = parseInt(hex.slice(5, 7), 16); img.data[i + 3] = 255; };
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const dx = X - 80, dy = 90 - Y, dist = Math.hypot(dx, dy);
      const foul = dy < Math.abs(dx) * 0.75 - 0.5;
      let col;
      if (dist > 86) col = ((X * 7 + Y * 13) % 11 === 0) ? '#b13e53' : ((X * 5 + Y * 3) % 9 === 0 ? '#ffcd75' : ((X + Y) % 2 ? '#29366f' : '#333c57'));
      else if (dist > 82.5) col = '#ffcd75';
      else if (dist > 80) col = '#29366f';
      else if (dist > 73) col = '#a05b2c';
      else {
        const stripe = Math.floor(dist / 7) % 2;
        col = foul ? (stripe ? '#2d8a47' : '#287a3d') : (stripe ? '#3ba55c' : '#33954f');
        const dd = Math.abs(X - 80) / 40 + Math.abs(Y - 60) / 30;
        const inner = dd <= 0.6 && Math.hypot(dx, Y - 60) > 7;
        if (dd <= 1.2 && !inner && Y < 96) col = '#c68a4e';
        if (Math.hypot(dx, dy) < 10) col = '#c68a4e';
        if (Math.hypot(dx, Y - 60) < 5) col = '#d9a066';
        if (!foul && Math.abs(dy - Math.abs(dx) * 0.75) < 0.7 && dd > 1.2) col = '#f4f4f4';
      }
      put(X, Y, col);
    }
    x.putImageData(img, 0, 0);
    x.fillStyle = '#f4f4f4';
    for (let i = 1; i < 4; i++) x.fillRect(B[i][0] - 2, B[i][1] - 2, 5, 5);
    x.fillRect(B[0][0] - 2, B[0][1] - 1, 5, 3); x.fillRect(B[0][0] - 1, B[0][1] + 1, 3, 1);
    x.fillRect(79, 59, 3, 1);
    return c;
  }
  function px(c, a, b, w, h) { ctx.fillStyle = c; ctx.fillRect(Math.round(a), Math.round(b), w, h); }
  function person(x, y, team, p, pose, flip) {
    const skin = SKIN[(p ? p.look : 3) % 4];
    const shirt = team[0], cap = team[1];
    x = Math.round(x); y = Math.round(y);
    px('#000', x - 3, y, 7, 1); // shadow
    px(cap, x - 2, y - 11, 5, 2); px(cap, flip ? x - 3 : x + 1, y - 10, 2, 1);
    px(skin, x - 1, y - 9, 3, 2);
    px(shirt, x - 2, y - 7, 5, 3);
    px('#333c57', x - 2, y - 4, 2, 3); px('#333c57', x + 1, y - 4, 2, 3);
    px('#1a1c2c', x - 2, y - 1, 2, 1); px('#1a1c2c', x + 1, y - 1, 2, 1);
    if (pose === 'bat') { px('#c68a4e', x + 3, y - 8, 1, 1); px('#c68a4e', x + 4, y - 9, 1, 1); px('#c68a4e', x + 4, y - 10, 1, 1); px('#c68a4e', x + 4, y - 11, 1, 1); px('#c68a4e', x + 3, y - 12 , 1, 1); }
    if (pose === 'swing') { for (let i = 0; i < 6; i++) px('#c68a4e', x - 3 - i, y - 7 + (i > 2 ? 0 : 0), 1, 1); px('#f4f4f4', x - 9, y - 7, 1, 1); }
    if (pose === 'wind') { px(skin, x + 2, y - 12, 1, 3); }
    if (pose === 'throw') { px(skin, x - 3, y - 7, 1, 2); }
    if (pose === 'run') { px('#333c57', x - 3, y - 3, 1, 2); }
  }
  function ball(x, y, h) {
    px('#000', x - 1, y + 1, 3, 1);
    px('#f4f4f4', x - 1, y - (h || 0) - 1, 2, 2);
  }
  function pathPos(idxs, u) {
    const pts = idxs.map(i => B[i === 4 ? 0 : i]);
    if (pts.length === 1) return pts[0];
    const segs = pts.length - 1, f = Math.min(0.9999, u) * segs, i = Math.floor(f), t = f - i;
    return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t];
  }
  function basePath(from, to) {
    const a = [];
    if (to === 4) { for (let i = from; i <= 3; i++) a.push(i); a.push(4); }
    else if (to > from) { for (let i = from; i <= to; i++) a.push(i); }
    else a.push(from);
    return a;
  }
  function hash(p) { return p ? (p.look || 1) : 1; }
  function ballPos(ev, v, b) {
    // v: 0..1 after contact. returns [x,y,h]
    const lerp = (a, c, t) => a + (c - a) * t, hsh = hash(b);
    const home = [80, 88];
    const arc = (to, h) => [lerp(home[0], to[0], v), lerp(home[1], to[1], v), Math.sin(v * Math.PI) * h];
    switch (ev.ball) {
      case 'single': return arc([[60, 44], [100, 44], [80, 42], [52, 52], [108, 52]][hsh % 5], 3);
      case 'double': return arc(hsh % 2 ? [24, 30] : [136, 30], 8);
      case 'triple': return arc(hsh % 2 ? [14, 34] : [146, 34], 8);
      case 'hr': return arc([80 + (hsh % 2 ? -52 : 52), -10], 34);
      case 'fo': return arc([[36, 32], [80, 20], [124, 32], [60, 24]][hsh % 4], 26);
      case 'go': { const t = [[50, 60], [110, 60], [66, 46], [94, 46]][hsh % 4]; if (v < 0.5) return [lerp(home[0], t[0], v * 2), lerp(home[1], t[1], v * 2), 0]; return [lerp(t[0], 120, (v - 0.5) * 2), lerp(t[1], 60, (v - 0.5) * 2), 1]; }
      case 'bunt': return [80, lerp(88, 76, Math.min(1, v * 1.5)), 0];
      case 'k': case 'bb': return [80, 92, 0];
    }
    return [80, 90, 0];
  }
  function burst(x, y, n, cols) {
    for (let i = 0; i < n; i++) st.parts.push({ x, y, vx: (Math.random() - 0.5) * 2.4, vy: -Math.random() * 2.2 - 0.4, c: cols[i % cols.length], life: 40 + Math.random() * 20 });
  }
  function draw(now) {
    ctx.drawImage(bg, 0, 0);
    const an = st.anim;
    const defSide = st.batSide === 'us' ? 'opp' : 'us';
    const dTeam = st.colors[defSide], bTeam = st.colors[st.batSide];
    const u = an ? Math.min(1, (now - an.t0) / an.dur) : 0;
    const items = [];
    // fielders
    FIELD_SPOTS.forEach((s, i) => {
      if (i === 0) { items.push({ y: s[1], f: () => person(s[0], s[1], dTeam, st.pitcher, an && u < 0.2 ? 'wind' : (an && u < 0.32 ? 'throw' : 'stand'), false) }); return; }
      items.push({ y: s[1], f: () => person(s[0], s[1], dTeam, null, 'stand', i % 2 === 0) });
    });
    // static runners
    const moving = new Set((an && an.ev.moves ? an.ev.moves : []).map(m => m.p.id));
    st.stat.forEach((r, i) => { if (r && !moving.has(r.p.id)) items.push({ y: B[i + 1][1], f: () => person(B[i + 1][0], B[i + 1][1], st.colors[r.side], r.p, 'stand', false) }); });
    // batter at plate
    const startU = an && an.ev.type === 'steal' ? 0 : 0.34;
    if (st.batter && !(an && u > 0.5 && an.ev.type !== 'pull' && an.ev.type !== 'steal')) {
      const pose = an && an.ev.type === 'pa' && u > 0.22 && u < 0.42 ? 'swing' : 'bat';
      items.push({ y: 90, f: () => person(72, 90, bTeam, st.batter, pose, false) });
    }
    // moving runners
    let lastBall = null;
    if (an) {
      (an.ev.moves || []).forEach(m => {
        const idxs = m.to === -1 ? basePath(m.from, m.at != null ? m.at : m.from) : basePath(m.from, m.to);
        const dur = an.ev.type === 'steal' ? 0.95 : 1 - startU;
        const k = Math.max(0, Math.min(1, (u - (an.ev.type === 'steal' ? 0 : startU)) / dur));
        if (m.to === 4 && k >= 1) return;
        const pos = pathPos(idxs, k);
        const dead = m.to === -1 && k >= 0.97;
        if (m.to === -1 && m.from === 0 && (m.at === 0 || m.at == null)) return;
        items.push({ y: pos[1], f: () => { person(pos[0], pos[1], bTeam, m.p, 'run', false); if (dead) { px('#b13e53', pos[0] - 2, pos[1] - 12, 1, 1); px('#b13e53', pos[0] + 2, pos[1] - 12, 1, 1); px('#b13e53', pos[0], pos[1] - 11, 1, 1); px('#b13e53', pos[0] - 2, pos[1] - 10, 1, 1); px('#b13e53', pos[0] + 2, pos[1] - 10, 1, 1); } } });
      });
      // ball
      if (an.ev.type === 'pa' || an.ev.type === 'bunt') {
        if (u < 0.3) { const t = u / 0.3; lastBall = [80, 62 + (88 - 62) * t, 0]; }
        else lastBall = ballPos(an.ev, (u - 0.3) / 0.7, st.batter);
      }
      if (an.ev.ball === 'hr' && u > 0.62 && !an.burst) { an.burst = true; burst(an.ev.hrx || 80, 8, 26, ['#ffcd75', '#f4f4f4', '#b13e53', '#73eff7']); }
    }
    items.sort((a, b) => a.y - b.y).forEach(i => i.f());
    if (lastBall) ball(lastBall[0], lastBall[1], lastBall[2]);
    // particles
    st.parts = st.parts.filter(p => p.life > 0);
    st.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.09; p.life--; px(p.c, p.x, p.y, 2, 2); });
    if (an && u >= 1) { const a = an; st.anim = null; a.res(); }
    if (st.anim || st.parts.length) raf = requestAnimationFrame(draw); else raf = 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(draw); }
  return {
    mount() { cv = $('#field'); ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; bg = bg || buildBG(); kick(); },
    setColors(opp) { st.colors.opp = opp; },
    setState(G) {
      st.batSide = G.half === 'top' ? 'opp' : 'us';
      st.stat = G.bases.map(r => (r ? { p: r.p, side: st.batSide } : null));
      kick(); draw(performance.now());
    },
    setMatch(pa) { st.batSide = pa.side; st.batter = pa.batter; st.pitcher = pa.pitcher; kick(); draw(performance.now()); },
    clearBatter() { st.batter = null; },
    play(ev, fast, G) {
      return new Promise(res => {
        let dur = (ev.type === 'pa' || ev.type === 'bunt') ? 1000 : ev.type === 'steal' ? 750 : 450;
        if (ev.ball === 'hr') dur *= 1.4;
        if (fast) dur *= 0.5;
        ev.hrx = 80 + (hash(ev.batter) % 2 ? -52 : 52) * 0.8;
        st.anim = { ev, t0: performance.now(), dur, res };
        st.batSide = ev.side || st.batSide;
        kick();
      }).then(() => {
        st.stat = (ev.basesNow || [null, null, null]).map(r => (r ? { p: r.p, side: ev.side } : null));
        if (ev.halfEnded) st.stat = [null, null, null];
        st.batter = ev.again ? st.batter : null;
        draw(performance.now());
      });
    },
  };
})();

/* ---------- helpers ---------- */
function mount(html) { app.innerHTML = html; const s = app.firstElementChild; if (s) s.scrollTop = 0; }
const pct = v => Math.round(v * 100);
const cls = v => (v >= 66 ? 'hi' : v <= 40 ? 'lo' : '');
function statsHTML(p) {
  if (p.kind === 'bat') return `<div class="stats"><span>CON <b class="${cls(p.con)}">${p.con}</b></span><span>POW <b class="${cls(p.pow)}">${p.pow}</b></span><span>EYE <b class="${cls(p.eye)}">${p.eye}</b></span><span>SPD <b class="${cls(p.spd)}">${p.spd}</b></span><span>DEF <b class="${cls(p.def)}">${p.def}</b></span></div>`;
  return `<div class="stats"><span>STF <b class="${cls(p.stf)}">${p.stf}</b></span><span>CTL <b class="${cls(p.ctl)}">${p.ctl}</b></span><span>STA <b class="${p.sta >= 15 ? 'hi' : ''}">${p.sta}</b></span></div>`;
}
function traitChip(p) {
  if (!p.trait) return '';
  const t = (E.BAT_TRAITS[p.trait] || E.PIT_TRAITS[p.trait]);
  return `<span class="chip t" title="${t.desc}">${t.name}</span>`;
}
function traitDesc(p) { if (!p.trait) return ''; const t = (E.BAT_TRAITS[p.trait] || E.PIT_TRAITS[p.trait]); return `<div class="dim" style="font-size:7px;line-height:1.5">${t.name}: ${t.desc}</div>`; }
function playerRow(p, pos, extra) {
  return `<div class="pl ${extra && extra.cls || ''}" ${extra && extra.attr || ''}><span class="pos">${pos || (p.kind === 'bat' ? '' : p.kind.toUpperCase())}</span><img class="pt" src="${portrait(p)}" alt=""><div class="info"><div class="nm">${p.name} ${traitChip(p)}</div>${statsHTML(p)}</div><span class="y">${E.ovr(p)}</span></div>`;
}
function strikesHTML() {
  let h = '<div class="strikes">';
  for (let i = 0; i < E.MAX_LOSSES; i++) h += `<i class="${i < run.losses ? 'x' : ''}"></i>`;
  return h + '</div>';
}
function modal(html, onMount) {
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box">${html}</div>`;
  app.appendChild(m); if (onMount) onMount(m);
  return m;
}
const closeModal = m => { if (m && m.parentNode) m.parentNode.removeChild(m); };

/* ---------- title ---------- */
function screenTitle() {
  const has = !!store.get('pinetar.run', null);
  mount(`<div class="screen title">
    <img class="ballbig" src="${ballIcon()}" alt="">
    <h1 class="logo">PINE<br>TAR</h1>
    <p class="tag">A BASEBALL ROGUELITE</p>
    <div class="row" style="flex-direction:column;gap:12px;width:100%;align-items:center">
      ${has ? '<button class="btn go" id="b-cont">CONTINUE RUN</button>' : ''}
      <button class="btn ${has ? '' : 'go'}" id="b-new">NEW RUN</button>
      <button class="btn" id="b-help">HOW TO PLAY</button>
      <button class="btn" id="b-set">SETTINGS</button>
    </div>
    <p class="dim" style="font-size:7px;line-height:1.8">RUNS ${meta.runs} &nbsp; BEST GAME ${meta.best} / 12 &nbsp; TITLES ${meta.titles}</p>
  </div>`);
  $('#b-new').onclick = () => { snd('click'); if (has && !confirmNew) { confirmNew = true; $('#b-new').textContent = 'TAP AGAIN: ERASE RUN'; $('#b-new').classList.add('warn'); return; } confirmNew = false; store.del('pinetar.run'); run = null; newDraft(); };
  if (has) $('#b-cont').onclick = () => { snd('click'); run = store.get('pinetar.run', null); if (!run) return screenTitle(); resume(); };
  $('#b-help').onclick = () => { snd('click'); showHelp(); };
  $('#b-set').onclick = () => { snd('click'); showSettings(); };
}
let confirmNew = false;

function showHelp() {
  modal(`<h2>HOW TO PLAY</h2><div class="help">
  <p>Win 12 games to take the title. Lose ${E.MAX_LOSSES} and the run ends.</p>
  <p><span class="y">GAMES</span> are 6 innings. The sim runs itself. When runners are on, it stops and YOU call the play.</p>
  <p><span class="y">AT BAT:</span> pick an approach (contact, power, patient), steal, or bunt. <span class="y">PITCHING:</span> attack, nibble, walk a guy, or change pitchers before your arm tires.</p>
  <p><span class="y">CLUTCH</span> charges (3 a game) boost one at-bat or pitch. The numbers on each button are your odds.</p>
  <p><span class="y">BETWEEN GAMES:</span> spend gold on relics, free agents and training. Win a game to pick a free reward.</p>
  <p class="dim">CON contact, POW power, EYE walks, SPD legs, DEF glove. STF stuff, CTL control, STA stamina.</p>
  </div><button class="btn go" id="x">GOT IT</button>`, m => { $('#x', m).onclick = () => { snd('click'); closeModal(m); }; });
}
function showSettings(inGame) {
  const render = m => {
    const modes = [['full', 'EVERY BAT', 'Prompt on every plate appearance'], ['key', 'KEY MOMENTS', 'Prompt when runners are on or arm is tired'], ['auto', 'AUTO', 'Sim only. Auto pulls tired pitchers']];
    m.querySelector('.box').innerHTML = `<h2>SETTINGS</h2>
    <h3>DECISIONS</h3>
    ${modes.map(([k, n, d]) => `<button class="btn ${settings.mode === k ? 'on' : ''}" data-m="${k}">${n}<small>${d}</small></button>`).join('')}
    <div class="grid2"><button class="btn ${settings.fast ? 'on' : ''}" id="fast">SPEED: ${settings.fast ? 'FAST' : 'NORMAL'}</button><button class="btn ${settings.sound ? 'on' : ''}" id="snd">SOUND: ${settings.sound ? 'ON' : 'OFF'}</button></div>
    ${inGame ? '<button class="btn warn" id="quit">SAVE AND QUIT TO TITLE</button>' : ''}
    <button class="btn go" id="x">CLOSE</button>`;
    $$('[data-m]', m).forEach(b => b.onclick = () => { settings.mode = b.dataset.m; saveSettings(); snd('click'); render(m); });
    $('#fast', m).onclick = () => { settings.fast = !settings.fast; saveSettings(); snd('click'); render(m); };
    $('#snd', m).onclick = () => { settings.sound = !settings.sound; saveSettings(); snd('click'); render(m); };
    $('#x', m).onclick = () => { snd('click'); closeModal(m); };
    if (inGame) $('#quit', m).onclick = () => { quitGame = true; closeModal(m); location.reload(); };
  };
  const m = modal('', null); render(m);
}
let quitGame = false;

/* ---------- draft ---------- */
function newDraft() {
  draft = E.newDraft((Math.random() * 2 ** 31) | 0);
  screenDraft();
}
function avg(arr, k) { return Math.round(arr.reduce((a, p) => a + p[k], 0) / arr.length); }
function screenDraft() {
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">DRAFT YOUR CLUB</h2><button class="btn sm" id="back">BACK</button></div>
    <p class="dim">Pick a starting team. Every one is beatable and every one is flawed.</p>
    ${draft.map((o, i) => {
      const t = o.team; const best = t.lineup.slice().sort((a, b) => E.ovr(b) - E.ovr(a)).slice(0, 3);
      return `<div class="px"><div class="row"><h2 class="sp">${o.name}</h2><span class="chip">${E.RELICS[o.relic].name}</span></div>
      <p class="dim" style="margin:6px 0">${o.desc}</p>
      <div class="stats" style="font-size:8px;margin-bottom:6px"><span>CON <b>${avg(t.lineup, 'con')}</b></span><span>POW <b>${avg(t.lineup, 'pow')}</b></span><span>EYE <b>${avg(t.lineup, 'eye')}</b></span><span>SPD <b>${avg(t.lineup, 'spd')}</b></span><span>DEF <b>${avg(t.lineup, 'def')}</b></span><span>SP <b>${t.pitchers[0].stf}</b></span></div>
      <div style="display:flex;flex-direction:column;gap:5px">${best.map(p => playerRow(p, E.POS[t.lineup.indexOf(p)])).join('')}</div>
      <button class="btn go" style="width:100%;margin-top:10px" data-pick="${i}">DRAFT THESE ROGUES</button></div>`;
    }).join('')}
    <button class="btn" id="again">SHOW ME THREE MORE</button>
  </div>`);
  $$('[data-pick]').forEach(b => b.onclick = () => { snd('buy'); run = E.startRun(draft[+b.dataset.pick], (Math.random() * 2 ** 31) | 0); saveRun(); screenClub(); });
  $('#again').onclick = () => { snd('click'); newDraft(); };
  $('#back').onclick = () => { snd('click'); screenTitle(); };
}

/* ---------- clubhouse ---------- */
let sel = null;
function teamRating() {
  return { bat: Math.round(run.lineup.reduce((a, p) => a + E.ovr(p), 0) / 9), sp: E.ovr(run.pitchers[0]) };
}
function screenClub() {
  const opp = E.oppFor(run);
  const my = teamRating();
  const theirBat = Math.round(opp.lineup.reduce((a, p) => a + E.ovr(p), 0) / 9), theirSp = E.ovr(opp.pitchers[0]);
  const cmp = (a, b) => `<span class="${a > b ? 'g' : a < b ? 'r' : ''}">${a}</span> <span class="dim">vs</span> ${b}`;
  const rewards = run.rewards ? `<div class="sec"><h2>VICTORY! PICK ONE FREE</h2></div><div class="cards">${run.rewards.map((r, i) => itemCard(r, i, 'rw', true)).join('')}</div>` : '';
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">CLUBHOUSE</h2>${strikesHTML()}<span class="gold">$${run.gold}</span><button class="btn sm" id="set">MENU</button></div>
    <div class="px hl">
      <div class="row"><h3 class="sp">${opp.label} ${run.stage >= 8 ? '' : ''}</h3><span class="dim">${run.wins}W ${run.losses}L</span></div>
      <div class="row" style="margin:6px 0"><div class="sp"><div class="y" style="font-size:11px">${opp.name}</div></div><span style="width:22px;height:22px;background:${opp.colors[0]};border:3px solid ${opp.colors[1]};display:block"></span></div>
      <div class="stats" style="font-size:8px;margin-bottom:6px"><span>BATS ${cmp(my.bat, theirBat)}</span><span>ARM ${cmp(my.sp, theirSp)}</span></div>
      <div>${opp.quirks.map(q => `<span class="chip q">${E.QUIRKS[q].name}</span>`).join('') || '<span class="dim">No special tricks.</span>'}</div>
      <div class="dim" style="font-size:7px">${opp.quirks.map(q => E.QUIRKS[q].desc).join(' ')}</div>
    </div>
    ${rewards}
    <div class="sec"><h2>SHOP</h2><button class="btn sm" id="reroll">REROLL $${2 + run.rerolls}</button></div>
    <div class="cards">${run.shop.map((r, i) => itemCard(r, i, 'shop', false)).join('')}</div>
    <div class="sec"><h2>RELICS ${run.relics.length}/5</h2></div>
    <div class="px">${run.relics.map(id => `<div style="margin-bottom:6px"><span class="chip">${E.RELICS[id].name}</span><span class="dim" style="font-size:7px"> ${E.RELICS[id].desc}</span></div>`).join('')}</div>
    <div class="sec"><h2>LINEUP</h2><span class="dim" style="font-size:7px">TAP TWO TO SWAP ORDER</span></div>
    <div style="display:flex;flex-direction:column;gap:5px">${run.lineup.map((p, i) => playerRow(p, E.POS[i], { cls: sel === i ? 'sel' : '', attr: `data-ln="${i}"` })).join('')}</div>
    <div class="sec"><h2>PITCHERS</h2></div>
    <div style="display:flex;flex-direction:column;gap:5px">${run.pitchers.map((p, i) => playerRow(p, i === 0 ? 'SP' : 'RP')).join('')}</div>
    <div class="sticky"><button class="btn go" style="width:100%" id="play">PLAY BALL: ${opp.label}</button></div>
  </div>`);
  $('#set').onclick = () => { snd('click'); showSettings(); };
  $('#reroll').onclick = () => { if (E.rerollShop(run)) { snd('buy'); saveRun(); screenClub(); } else snd('bad'); };
  $$('[data-rw]').forEach(b => b.onclick = () => claim(+b.dataset.rw));
  $$('[data-shop]').forEach(b => b.onclick = () => buy(+b.dataset.shop));
  $$('[data-ln]').forEach(b => b.onclick = () => {
    const i = +b.dataset.ln; snd('click');
    if (sel == null) sel = i; else { if (sel !== i) { const t = run.lineup[sel]; run.lineup[sel] = run.lineup[i]; run.lineup[i] = t; saveRun(); } sel = null; }
    const y = $('.screen').scrollTop; screenClub(); $('.screen').scrollTop = y;
  });
  $('#play').onclick = () => { snd('click'); startGame(); };
}
function itemCard(it, i, kind, free) {
  const attr = kind === 'rw' ? `data-rw="${i}"` : `data-shop="${i}"`;
  const price = free ? '<span class="g">FREE</span>' : `<span class="price">$${it.price}</span>`;
  const afford = free || run.gold >= it.price;
  let body = '';
  if (it.t === 'relic') { const r = E.RELICS[it.id]; body = `<div class="nm y">${r.name}</div><div class="d">${r.desc}</div>`; }
  else if (it.t === 'train') { const t = E.TRAINING[it.id]; body = `<div class="nm c">${t.name}</div><div class="d">${t.desc}</div>`; }
  else if (it.t === 'gold') { body = `<div class="nm y">CASH $${it.amt}</div><div class="d">Pocket the money.</div>`; }
  else { const p = it.p; body = `<div class="row" style="gap:5px"><img class="pt" src="${portrait(p)}" alt=""><div class="info" style="min-width:0"><div class="nm">${p.name}</div><div class="g" style="font-size:7px">${p.kind === 'bat' ? 'HITTER' : p.kind.toUpperCase()} ${E.ovr(p)}</div></div></div>${statsHTML(p)}${traitChip(p)}`; }
  return `<div class="card ${free ? 'pick' : ''} ${it.sold ? 'sold' : ''}"><div style="flex:1;display:flex;flex-direction:column;gap:5px">${body}</div><button class="btn sm ${afford ? (free ? 'gold' : '') : ''}" ${afford ? '' : 'disabled'} ${attr}>${free ? 'TAKE IT' : (it.sold ? 'SOLD' : 'BUY ' + price)}</button></div>`;
}
async function placeItem(it) {
  // returns true if applied
  if (it.t === 'relic') {
    let rep = null;
    if (run.relics.length >= 5) { rep = await chooseRelic(it.id); if (rep == null) return false; }
    E.addRelic(run, it.id, rep); return true;
  }
  if (it.t === 'gold') { run.gold += it.amt; return true; }
  if (it.t === 'bat' || it.t === 'pit') {
    const slot = await chooseSlot({ player: it.p }); if (slot == null) return false;
    E.placePlayer(run, it.p, slot); return true;
  }
  if (it.t === 'train') {
    const slot = await chooseSlot({ train: it.id }); if (slot == null) return false;
    return E.applyTraining(run, it.id, slot);
  }
  return false;
}
async function buy(i) {
  const it = run.shop[i]; if (!it || it.sold) return;
  if (run.gold < it.price) { snd('bad'); return; }
  if (await placeItem(it)) { run.gold -= it.price; it.sold = true; snd('buy'); saveRun(); const y = $('.screen').scrollTop; screenClub(); $('.screen').scrollTop = y; }
}
async function claim(i) {
  const it = run.rewards[i]; if (!it) return;
  if (await placeItem(it)) { run.rewards = null; snd('buy'); saveRun(); screenClub(); }
}
function chooseSlot(o) {
  return new Promise(res => {
    const p = o.player, tr = o.train ? E.TRAINING[o.train] : null;
    const kind = p ? (p.kind === 'bat' ? 'bat' : 'pit') : tr.kind;
    const slots = kind === 'bat' ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [9, 10, 11];
    const head = p ? `<h3>REPLACE WHO?</h3>${playerRow(p, 'NEW', { cls: 'sel' })}` : `<h3>${tr.name.toUpperCase()}: WHO TRAINS?</h3><p class="dim">${tr.desc}</p>`;
    const m = modal(`<h2>${p ? 'SIGN' : 'TRAIN'}</h2>${head}<div style="display:flex;flex-direction:column;gap:5px">${slots.map(s => { const q = E.playerAt(run, s); return playerRow(q, s < 9 ? E.POS[s] : (s === 9 ? 'SP' : 'RP'), { attr: `data-s="${s}"` }); }).join('')}</div><button class="btn warn" id="x">CANCEL</button>`);
    $$('[data-s]', m).forEach(b => b.onclick = () => { closeModal(m); res(+b.dataset.s); });
    $('#x', m).onclick = () => { snd('click'); closeModal(m); res(null); };
  });
}
function chooseRelic(newId) {
  return new Promise(res => {
    const m = modal(`<h2>RELICS FULL</h2><p class="dim">Swap out one for <span class="y">${E.RELICS[newId].name}</span>:</p>${run.relics.map((id, i) => `<button class="btn" data-r="${i}">${E.RELICS[id].name}<small>${E.RELICS[id].desc}</small></button>`).join('')}<button class="btn warn" id="x">CANCEL</button>`);
    $$('[data-r]', m).forEach(b => b.onclick = () => { closeModal(m); res(+b.dataset.r); });
    $('#x', m).onclick = () => { closeModal(m); res(null); };
  });
}

/* ---------- game ---------- */
function resume() { if (run.G) screenGame(); else if (run.done) screenEnd(); else screenClub(); }
function startGame() {
  run.G = E.newGame(run); saveRun(); screenGame();
}
function boardHTML(G) {
  const n = Math.max(G.len, G.inn);
  const cols = []; for (let i = Math.max(1, n - 8); i <= Math.max(n, 6); i++) cols.push(i);
  const row = (side, name) => `<tr><td>${name}</td>${cols.map(i => { const v = G.line[side][i - 1]; const cur = G.inn === i && ((G.half === 'top') === (side === 'opp')) && !G.over; return `<td class="${cur ? 'cur' : ''}">${v == null ? '' : v}</td>`; }).join('')}<td class="tot">${G.score[side]}</td></tr>`;
  return `<table><tr class="dim"><th></th>${cols.map(i => `<th>${i}</th>`).join('')}<th class="tot">R</th></tr>${row('opp', G.oppName.split(' ').pop().slice(0, 3).toUpperCase())}${row('us', 'YOU')}</table>`;
}
function screenGame() {
  const G = run.G;
  mount(`<div class="screen" id="gs">
    <div class="top"><h3 class="sp">${G.oppLabel}: ${G.oppName}</h3>${strikesHTML()}<button class="btn sm" id="set">MENU</button></div>
    <div class="board" id="board"></div>
    <div class="fieldwrap" id="fw"><canvas id="field" width="160" height="100"></canvas><div class="hud"><span id="hud-inn"></span><span class="outs" id="hud-outs"></span></div><div id="banner"></div></div>
    <div class="match"><div class="px" id="m-bat"></div><div class="px" id="m-pit"></div></div>
    <div class="log" id="log"></div>
    <div id="panel"></div>
  </div>`);
  $('#set').onclick = () => { snd('click'); showSettings(true); };
  Field.mount(); Field.setColors(G.oppColors);
  updateBoard(G); Field.setState(G);
  loop();
}
function updateBoard(G) {
  $('#board').innerHTML = boardHTML(G);
  $('#hud-inn').textContent = (G.half === 'top' ? 'TOP ' : 'BOT ') + G.inn;
  $('#hud-outs').innerHTML = [0, 1, 2].map(i => `<i class="${i < G.outs ? 'o' : ''}"></i>`).join('');
}
function updateMatch(G, pa) {
  const gasMax = Math.max(1, pa.pitcher.sta + (pa.pitcher.trait === 'workhorse' ? 4 : 0));
  const gasPct = Math.max(0, Math.min(100, Math.round(100 * pa.gas / gasMax)));
  const bat = pa.batter, pit = pa.pitcher;
  const bs = bat.con !== undefined ? `<div class="stats"><span>C <b>${bat.con}</b></span><span>P <b>${bat.pow}</b></span><span>E <b>${bat.eye}</b></span><span>S <b>${bat.spd}</b></span></div>` : '';
  $('#m-bat').innerHTML = `<div class="dim" style="font-size:6px">AT BAT</div><div class="nm ${pa.side === 'us' ? 'g' : ''}">${bat.name}</div>${bs}`;
  $('#m-pit').innerHTML = `<div class="dim" style="font-size:6px">PITCHING</div><div class="nm ${pa.side === 'opp' ? 'g' : ''}">${pit.name}</div><div class="stats"><span>STF <b>${pit.stf}</b></span><span>CTL <b>${pit.ctl}</b></span></div><div class="gas ${pa.gas <= 0 ? 'low' : ''}"><i style="width:${gasPct}%"></i></div>`;
}
function setLog(t) { const l = $('#log'); if (l) l.textContent = t || ''; }
function situation(G) {
  const names = ['1st', '2nd', '3rd'];
  const on = G.bases.map((r, i) => (r ? names[i] : null)).filter(Boolean);
  const diff = G.score.us - G.score.opp;
  return `${G.outs} out${G.outs === 1 ? '' : 's'}, ${on.length ? 'runners: ' + on.join(' ') : 'bases empty'}. ${diff === 0 ? 'Tied' : diff > 0 ? 'Up ' + diff : 'Down ' + (-diff)}.`;
}
function quietPanel(text) {
  $('#panel').innerHTML = `<div class="panel quiet"><div class="row"><span class="dim sp">${text || 'PLAYING...'}</span><button class="btn sm ${settings.fast ? 'on' : ''}" id="ff">${settings.fast ? 'FAST' : 'NORMAL'}</button></div></div>`;
  $('#ff').onclick = () => { settings.fast = !settings.fast; saveSettings(); snd('click'); $('#ff').className = 'btn sm' + (settings.fast ? ' on' : ''); $('#ff').textContent = settings.fast ? 'FAST' : 'NORMAL'; };
}
function oddsText(o) { return `K${pct(o.K)} BB${pct(o.BB)}<br>H${pct(o.H)} HR${pct(o.HR)}`; }

function askDecision(G, pa) {
  return new Promise(res => {
    let clutch = false;
    const bat = pa.side === 'us';
    const apprs = bat ? E.APPR_BAT : E.APPR_PIT;
    let infield = false;
    const render = () => {
      const keys = Object.keys(apprs);
      const odds = {}; keys.forEach(k => { odds[k] = E.preview(G, pa.side, { appr: k, clutch, infield }); });
      const nextP = !bat && pa.canPull ? G.t.us.pitchers[G.t.us.pi + 1] : null;
      const tired = !bat && pa.gas <= 0;
      let h = `<div class="panel"><div class="row"><h3 class="sp">${bat ? 'YOU ARE UP: ' + pa.batter.name : 'ON THE MOUND: ' + pa.pitcher.name}</h3>${pa.canClutch ? `<button class="btn sm ${clutch ? 'on' : ''}" id="cl">CLUTCH x${G.clutch}</button>` : '<span class="dim">NO CLUTCH</span>'}</div>
      <div class="dim" style="font-size:7px">${situation(G)}${tired ? ' <span class="r">ARM IS TIRED!</span>' : ''}</div>
      <div class="${bat ? 'grid4' : 'grid4'}" style="${bat ? '' : 'grid-template-columns:repeat(3,1fr)'}">${keys.map(k => `<button class="btn ${k === 'normal' ? 'go' : ''}" data-a="${k}">${apprs[k].name}<small class="odds">${oddsText(odds[k])}</small></button>`).join('')}</div>`;
      const sp = [];
      if (bat) {
        if (pa.canSteal) sp.push(`<button class="btn" data-x="steal">STEAL ${pct(E.stealProb(G))}%<small>${G.bases[1] && !G.bases[2] ? 'to 3rd' : 'to 2nd'}</small></button>`);
        if (pa.canBunt) sp.push(`<button class="btn" data-x="bunt">BUNT ${pct(E.buntProb(G))}%<small>move them up</small></button>`);
      } else {
        if (pa.canIBB) sp.push(`<button class="btn" data-x="ibb">WALK HIM<small>intentional</small></button>`);
        if (pa.canInfield) sp.push(`<button class="btn ${infield ? 'on' : ''}" data-x="inf">INFIELD IN<small>${infield ? 'ON: holds runner, +hits' : 'cut off the run'}</small></button>`);
        if (nextP) sp.push(`<button class="btn ${tired ? 'warn' : ''}" data-x="pull">PULL ${nextP.name.split(' ')[1].slice(0, 7).toUpperCase()}<small>STF ${nextP.stf} CTL ${nextP.ctl}</small></button>`);
      }
      if (sp.length) h += `<div class="grid2">${sp.join('')}</div>`;
      h += '</div>';
      $('#panel').innerHTML = h;
      const cl = $('#cl'); if (cl) cl.onclick = () => { clutch = !clutch; snd('click'); render(); };
      $$('[data-a]').forEach(b => b.onclick = () => { snd('click'); res(bat ? { type: 'swing', appr: b.dataset.a, clutch } : { type: 'pitch', appr: b.dataset.a, clutch, infield }); });
      $$('[data-x]').forEach(b => b.onclick = () => {
        const x = b.dataset.x; snd('click');
        if (x === 'inf') { infield = !infield; render(); return; }
        res({ type: x, clutch });
      });
    };
    render();
    const sc = $('#gs'); if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
  });
}

const BANNER = {
  K: ['STRIKEOUT!', 'k'], BB: ['WALK', 'bb'], '1B': ['SINGLE!', 'hit'], '2B': ['DOUBLE!', 'hit'], '3B': ['TRIPLE!', 'hit'], HR: ['HOME RUN!', 'hr'],
  GO: ['GROUND OUT', 'out'], FO: ['FLY OUT', 'out'], SAC: ['SAC BUNT', 'out'], FC: ['BUNT FAIL', 'out'],
};
async function animate(G, ev) {
  const fast = settings.fast;
  let label = null, good = true, sound = 'out';
  if (ev.type === 'steal') { label = ev.res === 'safe' ? 'SAFE!' : 'OUT!'; good = ev.res === 'safe'; sound = ev.res === 'safe' ? 'steal' : 'bad'; }
  else if (ev.type === 'pa' || ev.type === 'bunt') {
    const b = BANNER[ev.code]; if (b) { label = b[0]; sound = b[1]; }
    if (ev.code === 'GO' && ev.outs === 2) label = 'DOUBLE PLAY';
    if (ev.code === 'FO' && ev.runs) label = 'SAC FLY';
    const hitish = ['1B', '2B', '3B', 'HR', 'BB'].includes(ev.code);
    good = (ev.side === 'us') === hitish;
    if (ev.type === 'bunt') good = ev.side === 'us';
    if (ev.runs && ev.side === 'us') good = true;
  }
  setLog(ev.text);
  if (label) {
    const bn = $('#banner'); bn.textContent = label; bn.style.color = good ? '#a7f070' : '#ef7d57';
    if (ev.code === 'HR') bn.style.color = good ? '#ffcd75' : '#b13e53';
    bn.className = ''; void bn.offsetWidth; bn.className = 'show' + (fast ? ' fast' : '');
  }
  if (ev.type !== 'pull') snd(sound);
  if (ev.code === 'HR') { const fw = $('#fw'); fw.classList.remove('shake'); void fw.offsetWidth; fw.classList.add('shake'); setTimeout(() => snd('hr'), 250); }
  await Field.play(ev, fast, G);
  if (ev.type === 'pull') await sleep(fast ? 200 : 500);
  updateBoard(G);
  await sleep(fast ? 150 : (ev.runs ? 700 : 380));
}

async function loop() {
  const G = run.G;
  while (!G.over) {
    if (quitGame) return;
    const pa = E.nextPA(G, settings.mode);
    let ev;
    if (pa.auto) { ev = pa.auto; }
    else {
      updateMatch(G, pa); Field.setMatch(pa);
      let act;
      if (pa.decision) { setLog('Your call, skipper.'); act = await askDecision(G, pa); }
      else { quietPanel(pa.side === 'us' ? 'YOU BAT' : 'THEY BAT'); if (pa.autoPull) act = { type: 'pull' }; else act = { type: pa.side === 'us' ? 'swing' : 'pitch', appr: 'normal' }; await sleep(settings.fast ? 80 : 250); }
      quietPanel();
      ev = E.resolve(G, pa, act);
      if (!ev) continue;
    }
    saveRun();
    await animate(G, ev);
  }
  await gameOver(G);
}
async function gameOver(G) {
  const won = G.winner === 'us';
  snd(won ? 'win' : 'lose');
  await sleep(300);
  const info = E.finishGame(run, G);
  if (run.done) { meta.runs++; meta.best = Math.max(meta.best, Math.min(12, run.stage + (run.champion ? 0 : 1))); if (run.champion) meta.titles++; meta.bestWins = Math.max(meta.bestWins, run.wins); store.set('pinetar.meta', meta); }
  saveRun();
  const m = modal(`<div class="center"><div class="big">${won ? (G.walkoff ? 'WALK-OFF!' : 'VICTORY') : 'DEFEAT'}</div></div>
    <div class="center y" style="font-size:14px">${G.score.us} - ${G.score.opp}</div>
    <p class="center dim">${won ? 'W' : 'L'} vs ${G.oppName}. +$${info.gold} gold${run.relics.includes('piggy') && won ? ' (piggy bank!)' : ''}.</p>
    ${!won && !run.done ? `<p class="center r">STRIKE ${run.losses} of ${E.MAX_LOSSES}</p>` : ''}
    <button class="btn go" id="x">${run.done ? 'SEE RESULTS' : 'TO THE CLUBHOUSE'}</button>`, m => { $('#x', m).onclick = () => { snd('click'); closeModal(m); run.done ? screenEnd() : screenClub(); }; });
}

/* ---------- end ---------- */
function screenEnd() {
  const champ = run.champion;
  mount(`<div class="screen title">
    <img class="ballbig" src="${ballIcon()}" alt="">
    <div class="big">${champ ? 'CHAMPIONS!' : 'SEASON OVER'}</div>
    <p class="${champ ? 'g' : 'r'}">${champ ? 'You won the whole thing. Absolute ballclub.' : 'Out in ' + E.STAGE_LABELS[Math.min(run.stage, 11)] + '.'}</p>
    <div class="px" style="width:100%;text-align:left;line-height:2">
      RECORD <span class="y">${run.wins}-${run.losses}</span><br>
      HOME RUNS <span class="y">${run.stats.hr}</span><br>
      RUNS SCORED <span class="y">${run.stats.runs}</span><br>
      STEALS <span class="y">${run.stats.steals}</span><br>
      RELICS <span class="y">${run.relics.map(id => E.RELICS[id].name).join(', ')}</span>
    </div>
    <button class="btn go" id="again">NEW RUN</button><button class="btn" id="home">TITLE</button>
  </div>`);
  store.del('pinetar.run');
  $('#again').onclick = () => { snd('click'); newDraft(); };
  $('#home').onclick = () => { snd('click'); screenTitle(); };
}

/* ---------- boot ---------- */
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__NO_SW) { navigator.serviceWorker.register('sw.js').catch(() => {}); }
const saved = store.get('pinetar.run', null);
if (saved && saved.G) { run = saved; screenTitle(); } else screenTitle();
window.__pt = { E, get run() { return run; }, screenTitle };
})();
