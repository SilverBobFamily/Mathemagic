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
/* Speed: auto-played at-bats always run one notch faster than the at-bats you call yourself. */
const SPEEDS = ['normal', 'fast', 'turbo'];
if (!SPEEDS.includes(settings.speed)) settings.speed = settings.speed === 'turbo' ? 'turbo' : 'fast';
const SPEED = {
  normal: { anim: 0.75, pre: 150, post: 300, postRun: 600, pull: 400 },
  fast:   { anim: 0.4,  pre: 30,  post: 90,  postRun: 280, pull: 180 },
  turbo:  { anim: 0.16, pre: 0,   post: 25,  postRun: 110, pull: 60 },
  instant:{ anim: 0.05, pre: 0,   post: 4,   postRun: 45,  pull: 20 },
};
const speedFor = auto => SPEED[auto ? ['fast', 'turbo', 'instant'][SPEEDS.indexOf(settings.speed)] : settings.speed];
const nextSpeed = () => { settings.speed = SPEEDS[(SPEEDS.indexOf(settings.speed) + 1) % 3]; settings.fast = settings.speed !== 'normal'; saveSettings(); };
let meta = Object.assign({ runs: 0, best: 0, titles: 0, bestWins: 0, onboarded: false, tips: {}, tipsOff: false, lastTeam: null, hof: {}, pressure: 0, daily: {}, gauntletBest: 0 }, store.get('pinetar.meta', {}));
const saveMeta = () => store.set('pinetar.meta', meta);
/* Front Office: owned unlocks + Fans. Players from before this update get Fans for the runs they already played. */
if (meta.fans == null) { meta.fans = meta.runs * 25 + meta.titles * 100; meta.fo = []; }
meta.fo = meta.fo || [];
if (meta.best >= 9 && !meta.fo.includes('gauntlet')) meta.fo.push('gauntlet');
const owns = id => meta.fo.includes(id);
const perks = () => meta.fo.slice();
let pendingTeam = null;
/* drop saves from before the MLB-cities update */
(function () { const r = store.get('pinetar.run', null); if (r && !(r.v >= 2)) store.del('pinetar.run'); })();
let run = null;
let draft = null;
const saveSettings = () => store.set('pinetar.set', settings);
/* ---------- autosave ----------
   Every at-bat, every purchase and every screen change writes to this device. The last 3 between-game
   snapshots are kept as backups, and the app asks the browser not to evict its storage. */
let lastFlash = 0;
function flashSaved() {
  const now = Date.now(); if (now - lastFlash < 1500) return; lastFlash = now;
  let el = document.getElementById('saved');
  if (!el) { el = document.createElement('div'); el.id = 'saved'; el.textContent = 'SAVED'; document.body.appendChild(el); }
  el.classList.add('on'); clearTimeout(flashSaved.t); flashSaved.t = setTimeout(() => el.classList.remove('on'), 900);
}
function saveRun(quiet) {
  if (!run) return;
  run.savedAt = Date.now();
  try { localStorage.setItem('pinetar.run', JSON.stringify(run)); if (!quiet) flashSaved(); } catch (e) {}
}
function runLabel(r) {
  const T = E.TEAMS[r.team] || { nick: '?' };
  const m = r.mode === 'season' || !r.mode ? (r.pressure ? 'P' + r.pressure + ' SEASON' : 'SEASON') : (E.MODES[r.mode] ? E.MODES[r.mode].name : 'SEASON');
  const where = r.done ? 'FINAL' : r.mode === 'gauntlet' ? 'GAME ' + (r.stage + 1) : E.stageLabel(r, Math.min(r.stage, 11));
  return `${T.nick} &middot; ${m} &middot; ${where} &middot; ${r.wins}-${r.losses}`;
}
function backupRun() {
  if (!run || run.done) return;
  const ring = store.get('pinetar.bak', []).filter(b => b.run && b.run.seed !== run.seed || (b.run && b.run.stage !== run.stage));
  ring.unshift({ at: Date.now(), run: JSON.parse(JSON.stringify(run)) });
  store.set('pinetar.bak', ring.slice(0, 3));
}
function ago(t) {
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago';
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveRun(true); });
window.addEventListener('pagehide', () => saveRun(true));
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
function collect(p) { if (p && p.name && !meta.hof[p.name]) { meta.hof[p.name] = p.tier || 'C'; saveMeta(); } }
function collectRoster() { if (!run) return; run.lineup.concat(run.pitchers).forEach(collect); }
let pendingMode = { mode: 'season', pressure: 0 };
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

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
function myCap() { const k = (run && run.team) || pendingTeam; return k && E.TEAMS[k] ? E.TEAMS[k].colors[0] : null; }
function portrait(p, capColor) {
  capColor = capColor || myCap();
  const key = p.look + p.kind + (capColor || '');
  if (ptCache[key]) return ptCache[key];
  let s = p.look;
  const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const skin = SKIN[Math.floor(r() * 4)], hair = HAIR[Math.floor(r() * 5)], cap = capColor || CAPS[Math.floor(r() * 6)];
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
    // 1px dark outline so players read against grass and dirt
    ctx.fillStyle = '#10121c';
    ctx.fillRect(x - 3, y - 12, 7, 12); ctx.fillRect(x - 2, y - 13, 5, 1);
    if (pose === 'bat') ctx.fillRect(x + 2, y - 13, 4, 7);
    if (pose === 'swing') ctx.fillRect(x - 10, y - 8, 8, 3);
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
    setColors(opp, us) { st.colors.opp = [opp[0], opp[1]]; if (us) st.colors.us = ['#f4f4f4', us[0]]; },
    setState(G) {
      st.batSide = G.half === 'top' ? 'opp' : 'us';
      st.stat = G.bases.map(r => (r ? { p: r.p, side: st.batSide } : null));
      kick(); draw(performance.now());
    },
    setMatch(pa) { st.batSide = pa.side; st.batter = pa.batter; st.pitcher = pa.pitcher; kick(); draw(performance.now()); },
    clearBatter() { st.batter = null; },
    play(ev, mult, G) {
      return new Promise(res => {
        let dur = (ev.type === 'pa' || ev.type === 'bunt') ? 1000 : ev.type === 'steal' ? 750 : 450;
        if (ev.ball === 'hr') dur *= 1.4;
        dur *= (typeof mult === 'number' ? mult : (mult ? 0.5 : 1));
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
function traitDesc(p) { if (!p.trait) return ''; const t = (E.BAT_TRAITS[p.trait] || E.PIT_TRAITS[p.trait]); return `<div class="dim" style="font-size:18px;line-height:1.5">${t.name}: ${t.desc}</div>`; }
const tierOf = p => p.tier || 'C';
const tierBadge = p => `<span class="tb tier-${tierOf(p)}" title="${E.TIERS[tierOf(p)].name}">${tierOf(p)}</span>`;
function playerRow(p, pos, extra) {
  return `<div class="pl tier-${tierOf(p)} ${extra && extra.cls || ''}" ${extra && extra.attr || ''}><span class="pos">${pos || (p.kind === 'bat' ? '' : p.kind.toUpperCase())}</span><img class="pt" src="${portrait(p)}" alt=""><div class="info"><div class="nm">${tierBadge(p)}${p.name}</div>${statsHTML(p)}${traitChip(p)}</div><span class="ov">${E.ovr(p)}</span></div>`;
}
function strikesHTML() {
  let h = '<div class="strikes">';
  for (let i = 0; i < E.maxLosses(run); i++) h += `<i class="${i < run.losses ? 'x' : ''}"></i>`;
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
  const sv = store.get('pinetar.run', null);
  const has = !!sv;
  mount(`<div class="screen title">
    <img class="ballbig" src="${ballIcon()}" alt="">
    <h1 class="logo">PINE<br>TAR</h1>
    <p class="tag">A BASEBALL ROGUELITE</p>
    <div class="row" style="flex-direction:column;gap:12px;width:100%;align-items:center">
      ${has ? `<button class="btn go" id="b-cont">CONTINUE<small>${runLabel(sv)}</small><small>autosaved ${ago(sv.savedAt)}</small></button>` : ''}
      <button class="btn ${has ? '' : 'go'}" id="b-new">${meta.onboarded ? 'NEW RUN' : 'PLAY BALL'}</button>
      <button class="btn gold" id="b-fo">FRONT OFFICE<small>${meta.fans} fans to spend</small></button>
      <button class="btn" id="b-hof">HALL OF FAME</button>
      <button class="btn" id="b-help">HOW TO PLAY</button>
      <button class="btn" id="b-set">SETTINGS</button>
    </div>
    <p class="dim" style="font-size:19px;line-height:1.5">Runs ${meta.runs} &middot; Titles ${meta.titles}<br>Pressure ${meta.pressure}/8 &middot; Gauntlet best ${meta.gauntletBest}</p>
  </div>`);
  $('#b-new').onclick = () => { snd('click'); if (has && !confirmNew) { confirmNew = true; $('#b-new').textContent = 'TAP AGAIN: ERASE RUN'; $('#b-new').classList.add('warn'); return; } confirmNew = false; store.del('pinetar.run'); run = null; if (!meta.onboarded) screenIntro(0); else screenModes(); };
  $('#b-hof').onclick = () => { snd('click'); screenHof(); };
  $('#b-fo').onclick = () => { snd('click'); screenFrontOffice(); };
  if (has) $('#b-cont').onclick = () => { snd('click'); run = store.get('pinetar.run', null); if (!run) return screenTitle(); resume(); };
  $('#b-help').onclick = () => { snd('click'); showHelp(); };
  $('#b-set').onclick = () => { snd('click'); showSettings(); };
}
let confirmNew = false;

function showHelp() {
  modal(`<h2>HOW TO PLAY</h2><div class="help">
  <p><span class="y">START SMALL:</span> every run starts with a thin PLAYBOOK (NORMAL, CONTACT, POWER at bat; NORMAL, ATTACK on the mound) and 2 relic slots. Buy STEAL, BUNT, TAKE, NIBBLE, FOUR WIDE and INFIELD IN cards in the shop. You get one more relic slot every 3 wins.</p>
  <p><span class="y">FRONT OFFICE:</span> every run earns Fans, win or lose. Spend them on new modes (Daily, Draft Day, Franchise Legends, Trade Desk, Gauntlet), relic packs and permanent perks.</p>
  <p><span class="y">SEASON:</span> 12 games ending in the World Series against the Sign Stealers. Win one to unlock the next PRESSURE level (8 total).</p>
  <p>Lose ${E.MAX_LOSSES} games and the run ends.</p>
  <p><span class="y">GAMES</span> pick up in the top of the 7th, scoreless: three innings to win it (extras if tied). Your starter is already tired. The sim runs itself. When runners are on, it stops and YOU call the play.</p>
  <p><span class="y">AT BAT:</span> pick an approach (contact, power, patient), steal, or bunt. <span class="y">PITCHING:</span> attack, nibble, walk a guy, or change pitchers before your arm tires.</p>
  <p><span class="y">CLUTCH</span> charges (3 a game) boost one at-bat or pitch. The numbers on each button are your odds.</p>
  <p><span class="y">BETWEEN GAMES:</span> spend gold on relics, free agents and training. Win a game to pick a free reward. Sometimes something weird happens in the clubhouse. Choose wisely.</p>
  <p><span class="y">RARITY:</span> players come <span style="color:var(--tC)">COMMON</span>, <span style="color:var(--tU)">UNCOMMON</span>, <span style="color:var(--tR)">RARE</span> and <span style="color:var(--tL)">LEGENDARY</span>. Better players are rarer. Every player you sign goes in your Hall of Fame.</p>
  <p class="dim">The game saves itself on this device after every at-bat.</p>
  <p class="dim">CON contact, POW power, EYE walks, SPD legs, DEF glove. STF stuff, CTL control, STA stamina.</p>
  </div><button class="btn go" id="x">GOT IT</button>`, m => { $('#x', m).onclick = () => { snd('click'); closeModal(m); }; });
}
function showSettings(inGame) {
  const render = m => {
    const modes = [['full', 'EVERY BAT', 'Prompt on every plate appearance'], ['key', 'KEY MOMENTS', 'Prompt when runners are on or arm is tired'], ['auto', 'AUTO', 'Sim only. Auto pulls tired pitchers']];
    m.querySelector('.box').innerHTML = `<h2>SETTINGS</h2>
    <h3>DECISIONS</h3>
    ${modes.map(([k, n, d]) => `<button class="btn ${settings.mode === k ? 'on' : ''}" data-m="${k}">${n}<small>${d}</small></button>`).join('')}
    <div class="grid2"><button class="btn ${settings.speed !== 'normal' ? 'on' : ''}" id="fast">SPEED: ${settings.speed.toUpperCase()}<small>auto at-bats go one notch faster</small></button><button class="btn ${settings.sound ? 'on' : ''}" id="snd">SOUND: ${settings.sound ? 'ON' : 'OFF'}</button></div>
    <button class="btn ${meta.tipsOff ? '' : 'on'}" id="tips">COACH TIPS: ${meta.tipsOff ? 'OFF' : 'ON'}</button>
    ${inGame ? '<button class="btn warn" id="quit">SAVE AND QUIT TO TITLE</button>' : '<button class="btn" id="replay">REPLAY TUTORIAL</button><button class="btn" id="restore">RESTORE A BACKUP<small>Last 3 between-game autosaves</small></button>'}
    <button class="btn go" id="x">CLOSE</button>`;
    $$('[data-m]', m).forEach(b => b.onclick = () => { settings.mode = b.dataset.m; saveSettings(); snd('click'); render(m); });
    $('#fast', m).onclick = () => { nextSpeed(); snd('click'); render(m); };
    $('#snd', m).onclick = () => { settings.sound = !settings.sound; saveSettings(); snd('click'); render(m); };
    $('#x', m).onclick = () => { snd('click'); closeModal(m); };
    $('#tips', m).onclick = () => { meta.tipsOff = !meta.tipsOff; saveMeta(); snd('click'); render(m); };
    if (!inGame) $('#restore', m).onclick = () => { snd('click'); closeModal(m); showBackups(); };
    if (!inGame) $('#replay', m).onclick = () => { meta.tips = {}; meta.tipsOff = false; meta.onboarded = false; saveMeta(); snd('click'); closeModal(m); screenTitle(); };
    if (inGame) $('#quit', m).onclick = () => { quitGame = true; closeModal(m); location.reload(); };
  };
  const m = modal('', null); render(m);
}
let quitGame = false;
function showBackups() {
  const ring = store.get('pinetar.bak', []);
  const m = modal(`<h2>BACKUPS</h2><p class="dim">Restoring replaces your current run.</p>${ring.length ? ring.map((b, i) => `<button class="btn" data-b="${i}">${runLabel(b.run)}<small>saved ${ago(b.at)}</small></button>`).join('') : '<p>No backups yet. One is made before every game.</p>'}<button class="btn go" id="x">CLOSE</button>`);
  $$('[data-b]', m).forEach(b => b.onclick = () => { run = ring[+b.dataset.b].run; run.G = null; saveRun(); closeModal(m); snd('buy'); resume(); });
  $('#x', m).onclick = () => { snd('click'); closeModal(m); };
}

/* ---------- onboarding ---------- */
const COACH = { look: 424242, kind: 'bat' };
const coachImg = () => portrait(COACH, '#b13e53');
const INTRO = [
  { h: 'WELCOME, SKIPPER', t: 'I\'m Coach Sparky. You run the ballclub. The players play. You make the calls that win or lose it.', art: 'field' },
  { h: 'ONE SEASON PER RUN', t: '8 games against your league. Then the playoffs: Wild Card, Division Series, League Championship, World Series. Lose 3 games and you\'re fired.', art: 'season' },
  { h: 'CALL THE PLAY', t: 'When runners get on, the sim stops and asks you. Swing for power, bunt, steal, yank your pitcher. Every button shows the real odds.', art: 'odds' },
  { h: 'START SMALL, GET BIG', t: 'You start with a thin playbook and 2 relic slots. Win games, earn gold, buy new signs, relics and free agents. Every run earns Fans to unlock new modes in the Front Office.', art: 'relics' },
];
function introArt(kind) {
  if (kind === 'field') return `<img class="ballbig" src="${ballIcon()}" alt="">`;
  if (kind === 'season') {
    const pips = []; for (let i = 0; i < 12; i++) pips.push(`<i class="${i >= 8 ? 'po' : ''}"></i>`);
    return `<div class="pips">${pips.join('')}</div><div class="dim" style="font-size:18px;margin-top:6px">8 GAMES &middot; 4 PLAYOFF ROUNDS</div>`;
  }
  if (kind === 'odds') return `<div class="grid2" style="width:100%"><div class="btn">POWER<small class="odds">K28 BB8<br>H18 HR5</small></div><div class="btn">STEAL 74%<small>to 2nd</small></div></div>`;
  return `<div><span class="chip">Pine Tar</span><span class="chip">Rally Cap</span><span class="chip">Corked Bat</span><span class="chip t">Clutch</span></div>`;
}
function screenIntro(i) {
  const sl = INTRO[i];
  mount(`<div class="screen title intro">
    <div class="row" style="width:100%"><span class="sp"></span><button class="btn sm" id="skip">SKIP</button></div>
    <img class="pt coachpt" src="${coachImg()}" alt="Coach Sparky">
    <h2>${sl.h}</h2>
    <p class="introtext">${sl.t}</p>
    <div class="introart">${introArt(sl.art)}</div>
    <div class="dots">${INTRO.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div>
    <button class="btn go" id="next" style="width:230px">${i < INTRO.length - 1 ? 'NEXT' : 'LET\'S GO'}</button>
  </div>`);
  $('#next').onclick = () => { snd('click'); if (i < INTRO.length - 1) screenIntro(i + 1); else { meta.onboarded = true; saveMeta(); screenModes(); } };
  $('#skip').onclick = () => { snd('click'); meta.onboarded = true; saveMeta(); screenModes(); };
}
function screenTeams() {
  const groups = [];
  ['AL', 'NL'].forEach(lg => ['East', 'Central', 'West'].forEach(div => groups.push({ lg, div, keys: Object.keys(E.TEAMS).filter(k => E.TEAMS[k].lg === lg && E.TEAMS[k].div === div) })));
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">PICK YOUR CITY</h2><button class="btn sm" id="back">BACK</button></div>
    <p class="dim">Your city sets your league, your division rivals and your colors.</p>
    ${groups.map(g => `<h3 style="margin-top:4px">${g.lg} ${g.div.toUpperCase()}</h3><div class="teams">${g.keys.map(k => { const T = E.TEAMS[k]; return `<button class="team ${meta.lastTeam === k ? 'last' : ''}" data-t="${k}"><span class="sw" style="background:${T.colors[0]};border-color:${T.colors[1]}"></span><span class="tn"><span class="dim">${T.city}</span><br>${T.nick}</span></button>`; }).join('')}</div>`).join('')}
  </div>`);
  $$('[data-t]').forEach(b => b.onclick = () => {
    snd('buy'); pendingTeam = b.dataset.t; meta.lastTeam = pendingTeam; saveMeta();
    if (pendingMode.mode === 'draft') startDraftDay();
    else if (pendingMode.mode === 'franchise') screenFranchise();
    else newDraft();
  });
  $('#back').onclick = () => { snd('click'); screenModes(); };
  tips([['teams', 'Pick any club. Your city sets your schedule: division rivals first, then the rest of your league, then the playoffs.', '.teams']]);
}

/* coach tips: one-time callouts that spotlight part of the screen */
let tipQueue = Promise.resolve();
function tips(list) {
  tipQueue = tipQueue.then(async () => { for (const [id, html, sel] of list) await tip(id, html, sel); });
  return tipQueue;
}
function tip(id, html, sel) {
  if (meta.tipsOff || meta.tips[id]) return Promise.resolve();
  const target = sel ? $(sel) : null;
  if (sel && !target) return Promise.resolve();
  return new Promise(res => {
    let spot = target;
    if (spot && spot.closest('.sticky')) spot = spot.closest('.sticky');
    if (spot) { spot.scrollIntoView({ block: 'center' }); spot.classList.add('spot'); }
    const r = spot ? spot.getBoundingClientRect() : null;
    const low = r && (r.top + r.height / 2) < window.innerHeight * 0.5;
    const ov = document.createElement('div'); ov.className = 'coach-ov';
    ov.innerHTML = `<div class="coach ${low ? 'at-bottom' : 'at-top'}"><div class="row" style="align-items:flex-start"><img class="pt" src="${coachImg()}" alt=""><div class="sp"><div class="who">COACH SPARKY</div><div class="ct">${html}</div></div></div><div class="row" style="margin-top:8px"><button class="btn sm" id="tip-off">SKIP ALL TIPS</button><span class="sp"></span><button class="btn sm go" id="tip-ok">GOT IT</button></div></div>`;
    app.appendChild(ov);
    const done = off => { meta.tips[id] = 1; if (off) meta.tipsOff = true; saveMeta(); if (spot) spot.classList.remove('spot'); closeModal(ov); snd('click'); res(); };
    $('#tip-ok', ov).onclick = () => done(false);
    $('#tip-off', ov).onclick = () => done(true);
  });
}

/* ---------- modes ---------- */
let pressSel = null;
function screenModes() {
  if (pressSel == null) pressSel = meta.pressure;
  const today = todayKey(), di = E.dailyInfo(today), dd = meta.daily[today];
  const gUnlocked = owns('gauntlet');
  const lockedCard = (k) => { const it = E.FRONT_OFFICE.find(x => x.id === k); return `<div class="d r">Locked. Unlock in the Front Office for ${it.cost} fans.</div><button class="btn gold" data-fo="1">FRONT OFFICE (${meta.fans} fans)</button>`; };
  const P = E.PRESSURE;
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">CHOOSE A MODE</h2><button class="btn sm" id="back">BACK</button></div>
    <div class="px hl mode" id="m-season">
      <h2>${E.MODES.season.name}</h2><div class="d">${E.MODES.season.desc}</div>
      <h3>PRESSURE</h3>
      <div class="press">${P.map((_, i) => `<button data-p="${i}" class="${i === pressSel ? 'on' : ''}" ${i > meta.pressure ? 'disabled' : ''}>${i}</button>`).join('')}</div>
      <div class="d"><span class="y">${P[pressSel].name}:</span> ${pressSel ? P.slice(1, pressSel + 1).map(x => x.desc).join(' ') : P[0].desc}${meta.pressure < 8 ? ` <span class="dim">Win at Pressure ${meta.pressure} to unlock ${meta.pressure + 1}.</span>` : ''}</div>
      <button class="btn go" id="go-season">START SEASON</button>
    </div>
    <div class="px mode" id="m-code">
      <h2>ENTER A CODE</h2><div class="d">Same code, same game: city, rosters, schedule, shops. Share one with a friend and compare, or try a themed roster:</div>
      <div class="codes">${Object.keys(E.SEEDS).map(k => `<button class="chip m" data-code="${k}">${k}</button>`).join('')}</div>
      <div class="row"><input id="code" class="codein" maxlength="20" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="type a code" aria-label="Game code"><button class="btn go" id="go-code">GO</button></div>
    </div>
    <div class="px mode" id="m-daily">
      <h2>${E.MODES.daily.name}</h2><div class="d">${E.MODES.daily.desc}</div>
      <div class="d">Today: <span class="y">${E.teamName(di.team)}</span></div>
      <div>${di.dmods.map(k => `<span class="chip m">${E.DAILY_MODS[k].name}</span>`).join('')}</div>
      <div class="d">${di.dmods.map(k => E.DAILY_MODS[k].desc).join(' ')}</div>
      ${dd ? `<div class="d g">${dd.done ? `Today's result: ${dd.wins}-${dd.losses}${dd.champ ? ', CHAMPIONS' : ''}. Back tomorrow.` : 'Started. Finish it from CONTINUE on the title screen.'}</div>` : ''}
      ${owns('daily') ? `<button class="btn ${dd ? '' : 'go'}" id="go-daily" ${dd ? 'disabled' : ''}>PLAY TODAY</button>` : lockedCard('daily')}
    </div>
    <div class="px mode ${gUnlocked ? '' : 'locked'}" id="m-gauntlet">
      <h2>${E.MODES.gauntlet.name}</h2><div class="d">${E.MODES.gauntlet.desc}</div>
      ${gUnlocked ? `<div class="d">Best: <span class="y">${meta.gauntletBest} wins</span></div><button class="btn go" id="go-gauntlet">START GAUNTLET</button>` : '<div class="d dim">Unlocks free when you reach the playoffs.</div>' + lockedCard('gauntlet')}
    </div>
    ${['draft', 'franchise', 'trade'].map(k => `<div class="px mode ${owns(k) ? '' : 'locked'}" id="m-${k}"><h2>${E.MODES[k].name}</h2><div class="d">${E.MODES[k].desc}</div>${owns(k) ? `<button class="btn go" id="go-${k}">START ${E.MODES[k].name}</button>` : lockedCard(k)}</div>`).join('')}
  </div>`);
  ['draft', 'franchise', 'trade'].forEach(k => { const b = $('#go-' + k); if (b) b.onclick = () => { snd('click'); pendingMode = { mode: k, seed: null }; screenTeams(); }; });
  $$('[data-fo]').forEach(b => b.onclick = () => { snd('click'); screenFrontOffice(true); });
  const goCode = () => {
    const info = E.codeInfo($('#code').value);
    if (!info) { snd('bad'); $('#code').focus(); return; }
    snd('click');
    pendingMode = { mode: 'seeded', seed: info.seed, code: info.code };
    pendingTeam = info.team;
    if (info.known) screenSeedPreview(info); else newDraft();
  };
  $('#go-code').onclick = goCode;
  $$('[data-code]').forEach(b => b.onclick = () => { $('#code').value = b.dataset.code; goCode(); });
  $('#code').addEventListener('keydown', e => { if (e.key === 'Enter') goCode(); });
  $('#back').onclick = () => { snd('click'); screenTitle(); };
  $$('[data-p]').forEach(b => b.onclick = () => { pressSel = +b.dataset.p; snd('click'); const y = $('.screen').scrollTop; screenModes(); $('.screen').scrollTop = y; });
  $('#go-season').onclick = () => { snd('click'); pendingMode = { mode: 'season', pressure: pressSel, seed: null }; screenTeams(); };
  if ($('#go-daily')) $('#go-daily').onclick = () => {
    snd('click'); pendingMode = { mode: 'daily', dmods: di.dmods, dateKey: today, seed: di.seed };
    pendingTeam = di.team; newDraft();
  };
  if ($('#go-gauntlet')) $('#go-gauntlet').onclick = () => { snd('click'); pendingMode = { mode: 'gauntlet', seed: null }; screenTeams(); };
  tips([['modes', 'Start with a <span class="y">SEASON</span>. Win one and you unlock <span class="y">PRESSURE</span> levels, each one harder. The <span class="y">DAILY GAME</span> is a fresh challenge every day.', '#m-season']]);
}

/* ---------- code games ---------- */
function screenSeedPreview(info) {
  const K = info.known, team = E.makeSeedTeam(info.code), T = E.TEAMS[info.team];
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">CODE: ${info.code.toUpperCase()}</h2><button class="btn sm" id="back">BACK</button></div>
    <div class="px hl"><h2>${K.title}</h2><p class="dim" style="font-size:18px;margin-top:6px">${K.desc}</p>
      <p style="font-size:18px;margin-top:6px">Playing as the <span class="y">${E.teamName(info.team)}</span>. Starting relic: <span class="y">${E.RELICS[K.relic].name}</span>.</p>
      ${(K.dmods || []).length ? `<div style="margin-top:6px">${K.dmods.map(k => `<span class="chip m">${E.DAILY_MODS[k].name}</span>`).join('')}</div>` : ''}</div>
    <h3>STARTING LINEUP</h3>
    <div style="display:flex;flex-direction:column;gap:5px">${team.lineup.map((p, i) => playerRow(p, team.positions[i])).join('')}</div>
    <h3>PITCHING STAFF</h3>
    <div style="display:flex;flex-direction:column;gap:5px">${team.pitchers.map((p, i) => playerRow(p, i === 0 ? 'SP' : 'RP')).join('')}</div>
    <h3>STILL OUT THERE (${team.pool.length})</h3>
    <div class="hof">${team.pool.map(n => `<span class="tier-${(E.TIERS && window.PT_PLAYERS.WHO[n] ? window.PT_PLAYERS.WHO[n].tier : 'C')}">${n}</span>`).join('')}</div>
    <div class="sticky"><button class="btn go" style="width:100%" id="ok">PLAY BALL</button></div>
  </div>`);
  $('#back').onclick = () => { snd('click'); screenModes(); };
  $('#ok').onclick = () => {
    snd('buy');
    run = E.startRun({ key: 'custom', team: { lineup: team.lineup, pitchers: team.pitchers }, relic: team.relic }, info.seed, info.team,
      { mode: 'seeded', code: info.code, namePool: team.pool, dmods: team.dmods });
    collectRoster(); saveRun(); backupRun(); screenClub();
  };
}

/* ---------- front office ---------- */
function screenFrontOffice(fromModes) {
  const items = E.FRONT_OFFICE;
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">FRONT OFFICE</h2><span class="gold">${meta.fans} FANS</span><button class="btn sm" id="back">BACK</button></div>
    <p class="dim" style="font-size:18px">Every run earns Fans, win or lose. Spend them on permanent upgrades. Your club starts small and grows.</p>
    ${items.map(it => {
      const have = owns(it.id), blocked = it.req && !owns(it.req), afford = meta.fans >= it.cost;
      return `<div class="px fo ${have ? 'own' : ''}"><div class="row"><h3 class="sp">${it.name.toUpperCase()}${it.mode ? ' <span class="chip m">MODE</span>' : ''}</h3>${have ? '<span class="g" style="font-size:20px">OWNED</span>' : `<span class="gold">${it.cost}</span>`}</div>
        <div class="d">${it.desc}${blocked ? ` <span class="r">Needs ${items.find(x => x.id === it.req).name} first.</span>` : ''}</div>
        ${have ? '' : `<button class="btn ${afford && !blocked ? 'go' : ''}" data-buy="${it.id}" ${afford && !blocked ? '' : 'disabled'}>${afford ? 'UNLOCK' : 'NEED ' + (it.cost - meta.fans) + ' MORE FANS'}</button>`}</div>`;
    }).join('')}
  </div>`);
  $('#back').onclick = () => { snd('click'); fromModes ? screenModes() : screenTitle(); };
  $$('[data-buy]').forEach(b => b.onclick = () => {
    const it = items.find(x => x.id === b.dataset.buy);
    if (!it || owns(it.id) || meta.fans < it.cost) return;
    meta.fans -= it.cost; meta.fo.push(it.id); saveMeta(); snd('win');
    const y = $('.screen').scrollTop; screenFrontOffice(fromModes); $('.screen').scrollTop = y;
  });
}

/* ---------- clubhouse events ---------- */
function screenEvent() {
  const ev = E.EVENTS[run.event.id], ch = E.eventChoices(run);
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">MEANWHILE...</h2>${strikesHTML()}<span class="gold">$${run.gold}</span></div>
    <div class="px event">
      <div class="row" style="align-items:flex-start;margin-bottom:8px"><img class="pt" src="${coachImg()}" alt=""><h2 class="sp">${ev.title}</h2></div>
      <p class="story">${ev.text}</p>
    </div>
    <div id="choices" style="display:flex;flex-direction:column;gap:10px">${ch.map((c, i) => `<button class="btn ${i === 0 ? 'go' : ''}" data-c="${i}" ${c.ok ? '' : 'disabled'}>${c.label}<small>${c.desc}${c.ok ? '' : ' (not enough gold)'}</small></button>`).join('')}</div>
  </div>`);
  $$('[data-c]').forEach(b => b.onclick = async () => {
    snd('click');
    const res = E.resolveEvent(run, +b.dataset.c); if (!res) return;
    let extra = '';
    if (res.give) { const ok = await placeItem(res.give); if (!ok) extra = ' You let it go.'; }
    collectRoster(); saveRun();
    $('#choices').innerHTML = `<div class="px"><p class="result">${res.text}${extra}</p></div><button class="btn go" id="ok">BACK TO THE CLUBHOUSE</button>`;
    $('#ok').onclick = () => { snd('click'); screenClub(); };
  });
  tips([['event', 'Between games, weird stuff happens. Every choice has a tradeoff. Some cost gold. Some are free and still cost you.', '.event']]);
}

/* ---------- hall of fame ---------- */
function screenHof() {
  const all = E.allPlayers();
  const tiers = ['L', 'R', 'U', 'C'];
  const got = meta.hof;
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">HALL OF FAME</h2><button class="btn sm" id="back">BACK</button></div>
    <p class="dim">Every player who ever suited up for you. ${Object.keys(got).length} of ${all.length} collected.</p>
    ${tiers.map(t => {
      const list = all.filter(p => p.tier === t), have = list.filter(p => got[p.name]);
      return `<div class="px tier-${t}" style="border-color:var(--tc)">
        <div class="row"><h2 class="sp" style="color:var(--tc)">${E.TIERS[t].name}</h2><span class="gold" style="color:var(--tc)">${have.length}/${list.length}</span></div>
        <div class="bar" style="margin:8px 0"><i style="width:${Math.round(100 * have.length / list.length)}%"></i></div>
        <div class="hof">${have.length ? have.map(p => `<span>${p.name}</span>`).join('') : '<span class="dim" style="border:0;background:none">Nobody yet.</span>'}</div>
      </div>`;
    }).join('')}
  </div>`);
  $('#back').onclick = () => { snd('click'); screenTitle(); };
}

/* ---------- draft day ---------- */
let dd = null;
function startDraftDay() { dd = { seed: (Math.random() * 2 ** 31) | 0, round: 0, picks: [] }; screenDraftDay(); }
function screenDraftDay() {
  const rd = E.draftRound(dd.seed, dd.round, dd.picks.map(p => p.name));
  const slotName = { C: 'CATCHER', '1B': 'FIRST BASE', '2B': 'SECOND BASE', '3B': 'THIRD BASE', SS: 'SHORTSTOP', LF: 'LEFT FIELD', CF: 'CENTER FIELD', RF: 'RIGHT FIELD', DH: 'DESIGNATED HITTER', SP: 'STARTING PITCHER', RP: 'RELIEF PITCHER' }[rd.slot];
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">DRAFT DAY</h2><span class="gold">${dd.round + 1}/12</span><button class="btn sm" id="back">QUIT</button></div>
    <div class="px hl"><h3>ROUND ${dd.round + 1}: ${slotName}</h3><p class="dim" style="font-size:18px;margin-top:4px">${E.teamName(pendingTeam)} are on the clock. Pick one.</p></div>
    <div style="display:flex;flex-direction:column;gap:8px">${rd.options.map((p, i) => `<div data-dp="${i}" style="cursor:pointer">${playerRow(p, rd.slot)}</div>`).join('')}</div>
    ${dd.picks.length ? `<h3>YOUR PICKS</h3><div class="hof">${dd.picks.map((p, i) => `<span class="tier-${p.tier || 'C'}">${E.DRAFT_SLOTS[i]} ${p.name}</span>`).join('')}</div>` : ''}
  </div>`);
  $$('[data-dp]').forEach(b => b.onclick = () => {
    snd('buy'); dd.picks.push(rd.options[+b.dataset.dp]); dd.round++;
    if (dd.round >= 12) { const lineup = dd.picks.slice(0, 9), pitchers = dd.picks.slice(9); screenRelicPick({ lineup, pitchers }, dd.seed, 'Draft complete. Pick a starting relic.'); }
    else screenDraftDay();
  });
  $('#back').onclick = () => { snd('click'); screenModes(); };
  tips([['draftday', 'Draft Day: 12 rounds, one position per round. Rarer players have better stats, but a great Common can beat a bad Rare. Watch the overall number on the right.', '[data-dp="0"]']]);
}

/* ---------- franchise legends ---------- */
function screenFranchise() {
  const seed = (Math.random() * 2 ** 31) | 0;
  const team = E.makeFranchiseTeam(seed, pendingTeam);
  const T = E.TEAMS[pendingTeam];
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">${T.nick.toUpperCase()} LEGENDS</h2><button class="btn sm" id="back">BACK</button></div>
    <p class="dim" style="font-size:18px">The ${E.teamName(pendingTeam)} all-time greats, reunited. They're a step slower than they used to be.</p>
    <h3>LINEUP</h3>
    <div style="display:flex;flex-direction:column;gap:5px">${team.lineup.map((p, i) => playerRow(p, E.POS[i])).join('')}</div>
    <h3>PITCHING STAFF</h3>
    <div style="display:flex;flex-direction:column;gap:5px">${team.pitchers.map((p, i) => playerRow(p, i === 0 ? 'SP' : 'RP')).join('')}</div>
    <div class="grid2"><button class="btn" id="again">SHUFFLE LEGENDS</button><button class="btn go" id="ok">SIGN THEM</button></div>
  </div>`);
  $('#back').onclick = () => { snd('click'); screenTeams(); };
  $('#again').onclick = () => { snd('click'); screenFranchise(); };
  $('#ok').onclick = () => { snd('buy'); screenRelicPick(team, seed, 'Pick a starting relic for the old-timers.'); };
}

/* ---------- starting relic pick (draft day, franchise) ---------- */
function screenRelicPick(team, seed, line) {
  const choices = E.relicChoices(seed, E.buildCfg('season', 0, [], perks()).relicPack);
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">STARTING RELIC</h2></div>
    <p class="dim" style="font-size:18px">${line}</p>
    ${choices.map(id => `<button class="btn" data-r="${id}">${E.RELICS[id].name}<small>${E.RELICS[id].desc}</small></button>`).join('')}
  </div>`);
  $$('[data-r]').forEach(b => b.onclick = () => {
    snd('buy');
    run = E.startRun({ key: 'custom', team, relic: b.dataset.r }, seed, pendingTeam, Object.assign({}, pendingMode, { perks: perks() }));
    collectRoster(); saveRun(); backupRun(); screenClub();
  });
}

/* ---------- trade desk ---------- */
function tradeDeskHTML(opp) {
  if (run.mode !== 'trade') return '';
  const offers = (run.trades || []).map((o, i) => {
    const mine = E.playerAt(run, o.slot);
    if (o.done || !mine || mine.id !== o.give) return '';
    const T = E.TEAMS[o.team];
    return `<div class="px trade"><div class="row"><span class="tsw" style="background:${T.colors[0]};border-color:${T.colors[1]}"></span><h3 class="sp">${T.city.toUpperCase()} ${T.nick.toUpperCase()} CALL</h3></div>
      <div class="tlabel r">YOU GIVE</div>${playerRow(mine, o.slot < 9 ? E.POS[o.slot] : (o.slot === 9 ? 'SP' : 'RP'))}
      <div class="tlabel g">YOU GET${o.gold ? ' + $' + o.gold : ''}</div>${playerRow(o.get, o.slot < 9 ? E.POS[o.slot] : (o.slot === 9 ? 'SP' : 'RP'))}
      <div class="grid2"><button class="btn" data-tno="${i}">PASS</button><button class="btn go" data-tyes="${i}">ACCEPT</button></div></div>`;
  }).join('');
  const used = run.oppTraded === run.stage;
  return `<div class="sec" id="tradehead"><h2>TRADE DESK</h2></div>
    ${offers || '<p class="dim" style="font-size:18px">No calls right now. More come after every game.</p>'}
    <div class="px"><h3>POACH FROM THE ${opp.nick.toUpperCase()}</h3><p class="dim" style="font-size:18px;margin:4px 0 8px">Trade with your next opponent. Their best guy plays for you, and your guy plays for them. One deal per game.</p>
    <button class="btn ${used ? '' : 'gold'}" id="poach" ${used ? 'disabled' : ''}>${used ? 'DEAL DONE THIS ROUND' : 'MAKE AN OFFER'}</button></div>`;
}
function poachFlow() {
  const opp = E.oppFor(run);
  const theirs = opp.lineup.map((p, i) => ({ p, idx: i, pos: E.POS[i] })).concat(opp.pitchers.map((p, i) => ({ p, idx: 9 + i, pos: i === 0 ? 'SP' : 'RP' })));
  const m = modal(`<h2>WHO DO YOU WANT?</h2><p class="dim">From the ${opp.name}:</p><div style="display:flex;flex-direction:column;gap:5px">${theirs.map(x => `<div data-th="${x.idx}" style="cursor:pointer">${playerRow(x.p, x.pos)}</div>`).join('')}</div><button class="btn warn" id="x">CANCEL</button>`);
  $('#x', m).onclick = () => { snd('click'); closeModal(m); };
  $$('[data-th]', m).forEach(b => b.onclick = () => { snd('click'); closeModal(m); poachPickMine(+b.dataset.th); });
}
function poachPickMine(theirIdx) {
  const slots = theirIdx < 9 ? [0, 1, 2, 3, 4, 5, 6, 7, 8] : [9, 10, 11];
  let sweet = 0;
  const m = modal('');
  const render = () => {
    const rows = slots.map(s => { const v = E.oppTradeVerdict(run, theirIdx, s, sweet); return `<div data-mine="${s}" style="cursor:pointer;position:relative">${playerRow(E.playerAt(run, s), s < 9 ? E.POS[s] : (s === 9 ? 'SP' : 'RP'))}<span class="verdict ${v.ok ? 'g' : 'r'}">${v.ok ? 'THEY ACCEPT' : 'NEED $' + v.gap + ' MORE'}</span></div>`; }).join('');
    const target = E.oppTradeVerdict(run, theirIdx, slots[0], 0).theirs;
    m.querySelector('.box').innerHTML = `<h2>WHO GOES BACK?</h2>${playerRow(target, 'GET')}
      <div class="row"><span class="sp" style="font-size:18px">Cash sweetener: <span class="y">$${sweet}</span> (you have $${run.gold})</span><button class="btn sm" id="sm">-</button><button class="btn sm" id="sp">+</button></div>
      <div style="display:flex;flex-direction:column;gap:5px">${rows}</div><button class="btn warn" id="x">CANCEL</button>`;
    $('#sm', m).onclick = () => { sweet = Math.max(0, sweet - 1); render(); };
    $('#sp', m).onclick = () => { sweet = Math.min(run.gold, sweet + 1); render(); };
    $('#x', m).onclick = () => { snd('click'); closeModal(m); };
    $$('[data-mine]', m).forEach(b => b.onclick = () => {
      const s = +b.dataset.mine, v = E.oppTradeVerdict(run, theirIdx, s, sweet);
      if (!v.ok) { snd('bad'); return; }
      const got = E.doOppTrade(run, theirIdx, s, sweet);
      if (got) { snd('buy'); collect(got); saveRun(); closeModal(m); screenClub(); }
    });
  };
  render();
}

/* ---------- draft ---------- */
function newDraft() {
  if (!pendingTeam) pendingTeam = meta.lastTeam || 'BOS';
  draft = E.newDraft(pendingMode.seed != null ? pendingMode.seed : (Math.random() * 2 ** 31) | 0);
  screenDraft();
}
function avg(arr, k) { return Math.round(arr.reduce((a, p) => a + p[k], 0) / arr.length); }
function screenDraft() {
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">PICK A STARTING ROSTER</h2><button class="btn sm" id="back">BACK</button></div>
    <p class="dim">${E.teamName(pendingTeam)}: pick a starting roster. Every one is beatable and every one is flawed.</p>
    ${draft.map((o, i) => {
      const t = o.team; const best = t.lineup.slice().sort((a, b) => E.ovr(b) - E.ovr(a)).slice(0, 3);
      return `<div class="px"><div class="row"><h2 class="sp">${o.name}</h2><span class="chip">${E.RELICS[o.relic].name}</span></div>
      <p class="dim" style="margin:6px 0">${o.desc}</p>
      <div class="stats" style="font-size:19px;margin-bottom:6px"><span>CON <b>${avg(t.lineup, 'con')}</b></span><span>POW <b>${avg(t.lineup, 'pow')}</b></span><span>EYE <b>${avg(t.lineup, 'eye')}</b></span><span>SPD <b>${avg(t.lineup, 'spd')}</b></span><span>DEF <b>${avg(t.lineup, 'def')}</b></span><span>SP <b>${t.pitchers[0].stf}</b></span></div>
      <h3 style="margin-top:4px">TOP HITTERS</h3>
      <div style="display:flex;flex-direction:column;gap:5px">${best.map(p => playerRow(p, E.POS[t.lineup.indexOf(p)])).join('')}</div>
      <h3 style="margin-top:8px">PITCHING STAFF</h3>
      <div style="display:flex;flex-direction:column;gap:5px">${t.pitchers.map((p, j) => playerRow(p, j === 0 ? 'SP' : 'RP')).join('')}</div>
      <button class="btn go" style="width:100%;margin-top:10px" data-pick="${i}">TAKE THIS ROSTER</button></div>`;
    }).join('')}
    <button class="btn" id="again">SHOW ME THREE MORE</button>
  </div>`);
  $$('[data-pick]').forEach(b => b.onclick = () => {
    snd('buy');
    const pm = pendingMode, seed = pm.seed != null ? pm.seed : (Math.random() * 2 ** 31) | 0;
    run = E.startRun(draft[+b.dataset.pick], seed, pendingTeam, Object.assign({}, pm, { perks: perks() }));
    if (pm.mode === 'daily') { meta.daily[pm.dateKey] = { done: false }; saveMeta(); }
    collectRoster(); saveRun(); backupRun(); screenClub();
  });
  const ag = $('#again'); if (pendingMode.seed != null) ag.remove(); else ag.onclick = () => { snd('click'); newDraft(); };
  $('#back').onclick = () => { snd('click'); pendingMode.seed != null ? screenModes() : screenTeams(); };
  tips([['draft', 'Each roster has a style and a starting <span class="y">relic</span>. Relics are permanent team-wide buffs. Don\'t like these three? Reroll for free.', '.px']]);
}

/* ---------- clubhouse ---------- */
let sel = null;
function teamRating() {
  return { bat: Math.round(run.lineup.reduce((a, p) => a + E.ovr(p), 0) / 9), sp: E.ovr(run.pitchers[0]) };
}
function screenClub() {
  if (run.event) return screenEvent();
  if (run._bak !== run.stage) { run._bak = run.stage; backupRun(); }
  saveRun(true);
  const opp = E.oppFor(run);
  const modeChips = (run.mode === 'gauntlet' ? '<span class="chip m">GAUNTLET</span>' : run.mode === 'seeded' ? `<span class="chip m">CODE: ${(run.code || '').toUpperCase()}</span>` + (run.dmods || []).map(k => `<span class="chip m">${E.DAILY_MODS[k].name}</span>`).join('') : run.mode === 'daily' ? '<span class="chip m">DAILY</span>' + (run.dmods || []).map(k => `<span class="chip m">${E.DAILY_MODS[k].name}</span>`).join('') : run.pressure ? `<span class="chip m">PRESSURE ${run.pressure}</span>` : '');
  const my = teamRating();
  const theirBat = Math.round(opp.lineup.reduce((a, p) => a + E.ovr(p), 0) / 9), theirSp = E.ovr(opp.pitchers[0]);
  const cmp = (a, b) => `<span class="${a > b ? 'g' : a < b ? 'r' : ''}">${a}</span> <span class="dim">vs</span> ${b}`;
  const rewards = run.rewards ? `<div class="sec"><h2>VICTORY! PICK ONE FREE</h2></div><div class="cards" id="rewards">${run.rewards.map((r, i) => itemCard(r, i, 'rw', true)).join('')}</div>` : '';
  mount(`<div class="screen">
    <div class="top"><h2 class="sp">${E.TEAMS[run.team].nick.toUpperCase()}</h2>${strikesHTML()}<span class="gold">$${run.gold}</span><button class="btn sm" id="set">MENU</button></div>
    <div class="px hl" id="oppcard">
      ${modeChips ? `<div>${modeChips}</div>` : ''}
      <div class="row"><h3 class="sp">${opp.label}${run.stage < 8 || run.mode === 'gauntlet' ? ' &middot; ' + opp.where : ''}</h3><span class="dim">${run.wins}W ${run.losses}L</span></div>
      <div class="row" style="margin:6px 0"><div class="sp"><div class="y" style="font-size:23px">${opp.name}</div></div><span style="width:22px;height:22px;background:${opp.colors[0]};border:3px solid ${opp.colors[1]};display:block"></span></div>
      <div class="stats" style="font-size:19px;margin-bottom:6px"><span>BATS ${cmp(my.bat, theirBat)}</span><span>ARM ${cmp(my.sp, theirSp)}</span></div>
      <div>${opp.quirks.map(q => `<span class="chip q">${E.QUIRKS[q].name}</span>`).join('') || '<span class="dim">No special tricks.</span>'}</div>
      <div class="dim" style="font-size:18px">${opp.quirks.map(q => E.QUIRKS[q].desc).join(' ')}</div>
      ${opp.bossId ? bossPanel(opp.bossId, opp.pitchers[0]) : ''}
    </div>
    ${rewards}
    ${tradeDeskHTML(opp)}
    <div class="sec" id="shophead"><h2>SHOP</h2><button class="btn sm" id="reroll">REROLL $${2 + run.rerolls}</button></div>
    <div class="cards">${run.shop.map((r, i) => itemCard(r, i, 'shop', false)).join('')}</div>
    <div class="sec" id="playhead"><h2>PLAYBOOK</h2><span class="dim" style="font-size:18px">BUY NEW SIGNS IN THE SHOP</span></div>
    <div class="px">${Object.keys(E.PLAYS).map(k => { const have = E.hasPlay(run, k); return `<span class="chip ${have ? 't' : 'lockd'}">${have ? '' : 'LOCKED '}${E.PLAYS[k].name}</span>`; }).join('')}</div>
    <div class="sec" id="relichead"><h2>RELICS ${run.relics.length}/${E.relicSlots(run)}</h2><span class="dim" style="font-size:18px">${E.relicSlots(run) < 5 ? '+1 SLOT EVERY 3 WINS' : 'MAX SLOTS'}</span></div>
    <div class="px">${run.relics.map(id => `<div style="margin-bottom:6px"><span class="chip">${E.RELICS[id].name}</span><span class="dim" style="font-size:18px"> ${E.RELICS[id].desc}</span></div>`).join('')}</div>
    <div class="sec" id="lineuphead"><h2>LINEUP</h2><span class="dim" style="font-size:18px">TAP TWO TO SWAP ORDER</span></div>
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
  $$('[data-tyes]').forEach(b => b.onclick = () => { if (E.acceptOffer(run, +b.dataset.tyes)) { snd('buy'); collectRoster(); saveRun(); const y = $('.screen').scrollTop; screenClub(); $('.screen').scrollTop = y; } });
  $$('[data-tno]').forEach(b => b.onclick = () => { run.trades[+b.dataset.tno].done = true; snd('click'); saveRun(); const y = $('.screen').scrollTop; screenClub(); $('.screen').scrollTop = y; });
  const pb = $('#poach'); if (pb) pb.onclick = () => { snd('click'); poachFlow(); };
  const T = [];
  if (run.rewards) T.push(['reward', 'You won, so you get a <span class="y">free pick</span>. Players replace someone on your roster. Training boosts one guy for good.', '#rewards']);
  if (run.mode === 'trade') T.push(['trade', 'Trade Desk: GMs call with offers after every game. You can also poach a player from your <span class="y">next opponent</span>. You get better and they get worse.', '#tradehead']);
  T.push(['playbook', 'You start with a thin <span class="y">PLAYBOOK</span>. Steals, bunts, walks and more show up in the shop as cards. Relic slots grow too: one more every 3 wins.', '#playhead']);
  T.push(['club_opp', 'Scouting report on your next opponent. <span class="g">Green</span> means you have the edge. <span class="r">Red chips</span> are their tricks. Plan around them.', '#oppcard']);
  T.push(['club_shop', 'Gold buys <span class="y">relics</span>, <span class="y">free agents</span> and <span class="y">training</span>. You earn more every game, more for wins. Reroll if nothing fits.', '#shophead']);
  T.push(['club_lineup', 'Your lineup. Tap two players to swap them. Top of the order bats most, so stack your best hitters up there.', '#lineuphead']);
  T.push(['club_play', 'When you\'re set, play ball. Your progress saves after every at-bat.', '#play']);
  tips(T);
}
function bossPanel(id, ace) {
  const B = E.BOSSES[id];
  return `<div class="boss" id="bosspanel"><div class="row"><span class="bosstag">BOSS</span><h2 class="sp">${B.name}</h2></div>
    <p class="bossline">${B.tag}</p>
    ${ace ? `<div class="row" style="margin:6px 0"><img class="pt" src="${portrait(ace, '#1a1c2c')}" alt=""><div class="sp"><div class="bossace">${tierBadge(ace)}${ace.name}</div><div class="stats"><span>STF <b>${ace.stf}</b></span><span>CTL <b>${ace.ctl}</b></span><span>STA <b>${ace.sta}</b></span></div></div></div>` : ''}
    <ul class="rules">${B.rules.map(r => `<li>${r}</li>`).join('')}</ul></div>`;
}
function itemCard(it, i, kind, free) {
  const attr = kind === 'rw' ? `data-rw="${i}"` : `data-shop="${i}"`;
  const price = free ? '<span class="g">FREE</span>' : `<span class="price">$${it.price}</span>`;
  const afford = free || run.gold >= it.price;
  let body = '';
  if (it.t === 'relic') { const r = E.RELICS[it.id]; body = `<div class="nm y">${r.name}</div><div class="d">${r.desc}</div>`; }
  else if (it.t === 'train') { const t = E.TRAINING[it.id]; body = `<div class="nm c">${t.name}</div><div class="d">${t.desc}</div>`; }
  else if (it.t === 'gold') { body = `<div class="nm y">CASH $${it.amt}</div><div class="d">Pocket the money.</div>`; }
  else if (it.t === 'play') { const pl = E.PLAYS[it.id]; body = `<div class="nm g">${pl.name}</div><div class="kind">PLAYBOOK CARD</div><div class="d">${pl.desc}</div>`; }
  else { const p = it.p; body = `<div class="row" style="gap:6px"><img class="pt" src="${portrait(p)}" alt=""><div class="info" style="min-width:0"><div class="nm">${p.name}</div><div class="kind">${tierBadge(p)}${p.kind === 'bat' ? 'HITTER' : p.kind.toUpperCase()} <span class="y">${E.ovr(p)}</span></div></div></div>${statsHTML(p)}<div>${traitChip(p)}</div>`; }
  const tcls = it.p ? 'tier-' + tierOf(it.p) : '';
  return `<div class="card ${tcls} ${free ? 'pick' : ''} ${it.sold ? 'sold' : ''}"><div style="flex:1;display:flex;flex-direction:column;gap:5px">${body}</div><button class="btn sm ${afford ? (free ? 'gold' : '') : ''}" ${afford ? '' : 'disabled'} ${attr}>${free ? 'TAKE IT' : (it.sold ? 'SOLD' : 'BUY ' + price)}</button></div>`;
}
async function placeItem(it) {
  // returns true if applied
  if (it.t === 'relic') {
    let rep = null;
    if (run.relics.length >= E.relicSlots(run)) { rep = await chooseRelic(it.id); if (rep == null) return false; }
    E.addRelic(run, it.id, rep); return true;
  }
  if (it.t === 'gold') { run.gold += it.amt; return true; }
  if (it.t === 'play') { if (!run.plays) return true; if (!run.plays.includes(it.id)) run.plays.push(it.id); return true; }
  if (it.t === 'bat' || it.t === 'pit') {
    const slot = await chooseSlot({ player: it.p }); if (slot == null) return false;
    E.placePlayer(run, it.p, slot); collect(it.p); return true;
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
  return `<table><tr class="dim"><th></th>${cols.map(i => `<th>${i}</th>`).join('')}<th class="tot">R</th></tr>${row('opp', G.oppAbbr || 'OPP')}${row('us', G.usAbbr || 'YOU')}</table>`;
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
  Field.mount(); Field.setColors(G.oppColors, G.usColors);
  updateBoard(G); Field.setState(G);
  const intro = G.bossId && !G.bossIntro ? new Promise(res => {
    G.bossIntro = true; saveRun();
    snd('hr');
    const m = modal(`<div class="center"><span class="bosstag">BOSS</span></div><div class="center big">${E.BOSSES[G.bossId].name}</div>
      <p class="center" style="font-size:20px">The ${G.oppName} ${E.BOSSES[G.bossId].tag.toLowerCase().replace(/^they /, '')}</p>
      ${bossPanel(G.bossId, G.t.opp.pitchers[0])}
      <p class="dim" style="font-size:18px">Mix up your calls. Watch the red READ tags on every button.</p>
      <button class="btn go" id="x">PLAY BALL</button>`, mm => { $('#x', mm).onclick = () => { snd('click'); closeModal(mm); res(); }; });
  }) : Promise.resolve();
  intro.then(() => tips([['game_field', 'The sim plays itself. In the <span class="y">TOP</span> of each inning they bat. In the <span class="y">BOTTOM</span> you bat. Every game picks up in the 7th, scoreless: three innings to win it. Under the field: who\'s up, who\'s pitching, and the pitcher\'s <span class="g">gas</span> bar.', '#fw']])).then(() => loop());
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
  $('#m-bat').innerHTML = `<div class="lbl">AT BAT</div><div class="nm ${pa.side === 'us' ? 'g' : ''}">${bat.tier ? tierBadge(bat) : ''}${bat.name}</div>${bs}`;
  $('#m-pit').innerHTML = `<div class="lbl">PITCHING</div><div class="nm ${pa.side === 'opp' ? 'g' : ''}">${pit.tier ? tierBadge(pit) : ''}${pit.name}</div><div class="stats"><span>STF <b>${pit.stf}</b></span><span>CTL <b>${pit.ctl}</b></span></div><div class="gas ${pa.gas <= 0 ? 'low' : ''}"><i style="width:${gasPct}%"></i></div>`;
}
function setLog(t) { const l = $('#log'); if (l) l.textContent = t || ''; }
function situation(G) {
  const names = ['1st', '2nd', '3rd'];
  const on = G.bases.map((r, i) => (r ? names[i] : null)).filter(Boolean);
  const diff = G.score.us - G.score.opp;
  return `${G.outs} out${G.outs === 1 ? '' : 's'}, ${on.length ? 'runners: ' + on.join(' ') : 'bases empty'}. ${diff === 0 ? 'Tied' : diff > 0 ? 'Up ' + diff : 'Down ' + (-diff)}.`;
}
function quietPanel(text) {
  $('#panel').innerHTML = `<div class="panel quiet"><div class="row"><span class="dim sp">${text || 'PLAYING...'}</span><button class="btn sm ${settings.speed !== 'normal' ? 'on' : ''}" id="ff">${settings.speed.toUpperCase()}</button></div></div>`;
  $('#ff').onclick = () => { nextSpeed(); snd('click'); const f = $('#ff'); f.className = 'btn sm' + (settings.speed !== 'normal' ? ' on' : ''); f.textContent = settings.speed.toUpperCase(); };
}
/* plain-language odds: on base, homer, strikeout, with the change vs NORMAL colored good/bad for you */
function oddsBlock(o, base, bat, isBase) {
  const rows = [[bat ? 'On base' : 'They reach', o.H + o.BB, base.H + base.BB, true], [bat ? 'Homer' : 'They homer', o.HR, base.HR, true], ['Strikeout', o.K, base.K, false]];
  return '<span class="ob">' + rows.map(([lab, v, bv, upGoodForBatter]) => {
    const d = Math.round(v * 100) - Math.round(bv * 100);
    const good = (d > 0) === (bat ? upGoodForBatter : !upGoodForBatter);
    const delta = isBase || !d ? '' : `<em class="${good ? 'up' : 'dn'}">${d > 0 ? '+' : ''}${d}</em>`;
    return `<span class="or"><span>${lab}</span><b>${pct(v)}%${delta}</b></span>`;
  }).join('') + '</span>';
}

function askDecision(G, pa) {
  return new Promise(res => {
    let clutch = false;
    const bat = pa.side === 'us';
    const apprs = bat ? E.APPR_BAT : E.APPR_PIT;
    let infield = false;
    const render = () => {
      const keys = Object.keys(apprs).filter(k => (k !== 'patient' && k !== 'nibble') || E.hasPlay(G, k));
      const odds = {}; keys.forEach(k => { odds[k] = E.preview(G, pa.side, { appr: k, clutch, infield }); });
      const nextP = !bat && pa.canPull ? G.t.us.pitchers[G.t.us.pi + 1] : null;
      const tired = !bat && pa.gas <= 0;
      let h = `<div class="panel"><div class="row"><h3 class="sp">${bat ? 'YOU ARE UP: ' + pa.batter.name : 'ON THE MOUND: ' + pa.pitcher.name}</h3>${pa.canClutch ? `<button class="btn sm ${clutch ? 'on' : ''}" id="cl">CLUTCH x${G.clutch}</button>` : '<span class="dim">NO CLUTCH</span>'}</div>
      <div class="dim" style="font-size:18px">${situation(G)}${tired ? ' <span class="r">ARM IS TIRED!</span>' : ''}</div>
      <div class="oddshead">${bat ? 'Your odds this at-bat' : 'Their odds against each pitch call'}<span>vs NORMAL</span></div>
      <div class="grid2 appr">${keys.map(k => { const rd = G.bossId ? E.readsOf(G, bat ? 'bat' : 'pit', k) : 0; return `<button class="btn ${k === 'normal' && !rd ? 'go' : ''} ${rd >= 3 ? 'warn' : ''}" data-a="${k}">${apprs[k].name}${rd && !clutch ? `<span class="read">READ ${rd}</span>` : ''}${oddsBlock(odds[k], odds.normal, bat, k === 'normal')}</button>`; }).join('')}</div>`;
      const sp = [];
      if (bat) {
        if (pa.canSteal) sp.push(`<button class="btn" data-x="steal">STEAL ${pct(E.stealProb(G))}%<small>${G.bases[1] && !G.bases[2] ? 'to 3rd' : 'to 2nd'}</small></button>`);
        if (pa.canSigns) sp.push(`<button class="btn gold" data-x="signs">CHANGE SIGNS<small>wipe every READ, once</small></button>`);
        if (pa.canBunt) sp.push(`<button class="btn" data-x="bunt">BUNT ${pct(E.buntProb(G))}%<small>move them up</small></button>`);
      } else {
        if (pa.canIBB) sp.push(`<button class="btn" data-x="ibb">WALK HIM<small>intentional</small></button>`);
        if (pa.canInfield) sp.push(`<button class="btn ${infield ? 'on' : ''}" data-x="inf">INFIELD IN<small>${infield ? 'ON: holds runner, +hits' : 'cut off the run'}</small></button>`);
        if (pa.canSigns) sp.push(`<button class="btn gold" data-x="signs">CHANGE SIGNS<small>wipe every READ, once</small></button>`);
        if (nextP) sp.push(`<button class="btn ${tired ? 'warn' : ''}" data-x="pull">PULL ${nextP.name.split(' ')[1].slice(0, 7).toUpperCase()}<small>STF ${nextP.stf} CTL ${nextP.ctl}</small></button>`);
      }
      if (sp.length) h += `<div class="grid2">${sp.join('')}</div>`;
      h += '</div>';
      $('#panel').innerHTML = h;
      const cl = $('#cl'); if (cl) cl.onclick = () => { clutch = !clutch; snd('click'); render(); };
      $$('[data-a]').forEach(b => b.onclick = () => { snd('click'); res(bat ? { type: 'swing', appr: b.dataset.a, clutch, chosen: true } : { type: 'pitch', appr: b.dataset.a, clutch, infield, chosen: true }); });
      $$('[data-x]').forEach(b => b.onclick = () => {
        const x = b.dataset.x; snd('click');
        if (x === 'inf') { infield = !infield; render(); return; }
        res({ type: x, clutch });
      });
    };
    render();
    const sc = $('#gs'); if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
    const T = [];
    if (bat) {
      T.push(['bat', 'Your call, skipper. Each button shows your odds this at-bat: <span class="c">On base</span> (hit or walk), <span class="c">Homer</span>, and <span class="c">Strikeout</span>. The small number is the change from NORMAL: <span class="g">green helps you</span>, <span class="r">orange hurts</span>.', '#panel']);
      if (pa.canSteal) T.push(['steal', 'Runner on? <span class="y">STEAL</span> shows the success odds. Under 70% is usually a bad bet. <span class="y">BUNT</span> trades an out to move runners up.', '[data-x="steal"]']);
    } else {
      T.push(['pitch', 'Now you\'re pitching. <span class="y">ATTACK</span> gets strikeouts but serves up homers. <span class="y">NIBBLE</span> avoids damage but walks guys.', '#panel']);
      if (pa.gas <= 0 && pa.canPull) T.push(['tired', 'Your pitcher is <span class="r">gassed</span>. Tired arms get crushed. <span class="y">PULL</span> brings in a fresh reliever. You only have two.', '[data-x="pull"]']);
    }
    if (G.bossId) T.push(['boss', 'Boss rules: every call you repeat gets <span class="r">READ</span>. The tag and the odds on each button show it. Switch it up, save CLUTCH for big spots, and burn <span class="y">CHANGE SIGNS</span> when they have you figured out.', '#panel']);
    if (pa.canClutch) T.push(['clutch', '<span class="y">CLUTCH</span> is a one-shot boost. You get 3 a game. Tap it to arm it, then pick your play.', '#cl']);
    tips(T);
  });
}

const BANNER = {
  K: ['STRIKEOUT!', 'k'], BB: ['WALK', 'bb'], '1B': ['SINGLE!', 'hit'], '2B': ['DOUBLE!', 'hit'], '3B': ['TRIPLE!', 'hit'], HR: ['HOME RUN!', 'hr'],
  GO: ['GROUND OUT', 'out'], FO: ['FLY OUT', 'out'], SAC: ['SAC BUNT', 'out'], FC: ['BUNT FAIL', 'out'],
};
async function animate(G, ev, auto) {
  const sp = speedFor(auto), fast = sp.anim < 0.5;
  let label = null, good = true, sound = 'out';
  if (ev.type === 'signs') { label = 'NEW SIGNS'; good = true; sound = 'steal'; }
  else if (ev.type === 'steal') { label = ev.res === 'safe' ? 'SAFE!' : 'OUT!'; good = ev.res === 'safe'; sound = ev.res === 'safe' ? 'steal' : 'bad'; }
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
  await Field.play(ev, sp.anim, G);
  if (ev.type === 'pull') await sleep(sp.pull);
  updateBoard(G);
  await sleep(ev.runs || ev.code === 'HR' ? sp.postRun : sp.post);
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
      else { quietPanel(pa.side === 'us' ? 'YOU BAT' : 'THEY BAT'); if (pa.autoPull) act = { type: 'pull' }; else act = { type: pa.side === 'us' ? 'swing' : 'pitch', appr: 'normal' }; const pre = speedFor(true).pre; if (pre) await sleep(pre); }
      quietPanel();
      ev = E.resolve(G, pa, act);
      if (!ev) continue;
    }
    saveRun(true);
    await animate(G, ev, !pa.decision);
  }
  await gameOver(G);
}
async function gameOver(G) {
  const won = G.winner === 'us';
  snd(won ? 'win' : 'lose');
  await sleep(300);
  const info = E.finishGame(run, G);
  if (run.done) {
    meta.runs++; meta.bestWins = Math.max(meta.bestWins, run.wins);
    run.fansEarned = E.fansFor(run); meta.fans += run.fansEarned;
    if (meta.best >= 9 || run.stage >= 8) { if (!meta.fo.includes('gauntlet')) { meta.fo.push('gauntlet'); run.gauntletUnlocked = true; } }
    if (run.mode === 'season') {
      meta.best = Math.max(meta.best, Math.min(12, run.stage + (run.champion ? 0 : 1)));
      if (run.champion) { meta.titles++; if ((run.pressure || 0) >= meta.pressure && meta.pressure < 8) { meta.pressure = (run.pressure || 0) + 1; run.unlocked = meta.pressure; } }
    } else if (run.mode === 'daily') { meta.daily[run.dateKey] = { done: true, wins: run.wins, losses: run.losses, champ: run.champion }; if (run.champion) meta.titles++; }
    else if (run.mode === 'gauntlet') { run.newBest = run.wins > meta.gauntletBest; meta.gauntletBest = Math.max(meta.gauntletBest, run.wins); }
    else { meta.best = Math.max(meta.best, Math.min(12, run.stage + (run.champion ? 0 : 1))); if (run.champion) meta.titles++; }
    saveMeta();
  } else backupRun();
  saveRun();
  if (!won && !run.done) await tips([['loss', 'That\'s a <span class="r">strike</span>. Three losses and you\'re fired. Spend your gold, shore up the weak spots.', '.strikes']]);
  const m = modal(`<div class="center"><div class="big">${won ? (G.walkoff ? 'WALK-OFF!' : 'VICTORY') : 'DEFEAT'}</div></div>
    <div class="center gold" style="font-size:14px">${G.score.us} - ${G.score.opp}</div>
    <p class="center dim">${won ? 'W' : 'L'} vs ${G.oppName}. +$${info.gold} gold${run.relics.includes('piggy') && won ? ' (piggy bank!)' : ''}.</p>
    ${!won && !run.done ? `<p class="center r">STRIKE ${run.losses} of ${E.maxLosses(run)}</p>` : ''}
    <button class="btn go" id="x">${run.done ? 'SEE RESULTS' : 'TO THE CLUBHOUSE'}</button>`, m => { $('#x', m).onclick = () => { snd('click'); closeModal(m); run.done ? screenEnd() : screenClub(); }; });
}

/* ---------- end ---------- */
function screenEnd() {
  const champ = run.champion;
  mount(`<div class="screen title">
    <img class="ballbig" src="${ballIcon()}" alt="">
    <div class="big">${run.mode === 'gauntlet' ? 'GAUNTLET OVER' : champ ? 'CHAMPIONS!' : 'SEASON OVER'}</div>
    <p class="${champ || run.newBest ? 'g' : 'r'}" style="font-size:23px;line-height:1.4">${run.mode === 'gauntlet' ? 'The ' + E.TEAMS[run.team].nick + ' won ' + run.wins + ' straight-up games.' + (run.newBest ? ' NEW BEST!' : ' Best: ' + meta.gauntletBest + '.') : champ ? 'The ' + E.teamName(run.team) + ' win the World Series. Absolute ballclub.' : (run.stage < 8 ? 'The ' + E.TEAMS[run.team].nick + ' got you fired in game ' + (run.stage + 1) + '.' : 'The ' + E.TEAMS[run.team].nick + ' are out in the ' + E.stageLabel(run, Math.min(run.stage, 11)) + '.')}</p>
    ${run.fansEarned ? `<p class="gold" style="font-size:14px">+${run.fansEarned} FANS</p><p class="dim" style="font-size:18px">Spend them in the Front Office. You have ${meta.fans}.</p>` : ''}
    ${run.unlocked ? `<p class="y" style="font-size:23px">PRESSURE ${run.unlocked} UNLOCKED</p>` : ''}
    ${run.gauntletUnlocked ? '<p class="y" style="font-size:23px">GAUNTLET UNLOCKED</p>' : ''}
    ${run.mode === 'daily' ? '<p class="dim" style="font-size:20px">A new Daily Game drops tomorrow.</p>' : ''}
    <div class="px" style="width:100%;text-align:left;line-height:1.7;font-size:22px">
      RECORD <span class="y">${run.wins}-${run.losses}</span><br>
      HOME RUNS <span class="y">${run.stats.hr}</span><br>
      RUNS SCORED <span class="y">${run.stats.runs}</span><br>
      STEALS <span class="y">${run.stats.steals}</span><br>
      RELICS <span class="y">${run.relics.map(id => E.RELICS[id].name).join(', ')}</span><br>
      BEST PLAYER <span class="y">${(() => { const b = run.lineup.concat(run.pitchers).reduce((a, p) => (E.ovr(p) > E.ovr(a) ? p : a)); return b.name + ' (' + E.TIERS[tierOf(b)].name + ')'; })()}</span>
    </div>
    <button class="btn go" id="again">NEW RUN</button><button class="btn" id="home">TITLE</button>
  </div>`);
  store.del('pinetar.run');
  $('#again').onclick = () => { snd('click'); screenModes(); };
  $('#home').onclick = () => { snd('click'); screenTitle(); };
}

/* ---------- boot ---------- */
window.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__NO_SW) { navigator.serviceWorker.register('/baseball/sw.js', { scope: '/baseball/' }).catch(() => {}); }
const saved = store.get('pinetar.run', null);
if (saved && saved.G) { run = saved; screenTitle(); } else screenTitle();
window.__pt = { E, get run() { return run; }, screenTitle };
})();
