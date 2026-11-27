/* PINE TAR - game engine. Pure logic, no DOM. Works in browser (window.Engine) and Node (module.exports). */
(function (root) {
'use strict';

/* ---------- rng (serializable: state lives in holder.rs) ---------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function rf(h) {
  h.rs = (h.rs + 0x6D2B79F5) | 0;
  let t = h.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (h, a, b) => a + Math.floor(rf(h) * (b - a + 1));
const pick = (h, arr) => arr[Math.floor(rf(h) * arr.length)];
const chance = (h, p) => rf(h) < p;
const norm = (h, m, s) => { let u = 0; for (let i = 0; i < 4; i++) u += rf(h); return m + (u - 2) * 1.73 * s; };
function sample(h, arr, n) {
  const a = arr.slice(), out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(rf(h) * a.length), 1)[0]);
  return out;
}
const hashSeed = (a, b) => ((a * 2654435761) ^ (b * 40503 + 977)) | 0;

/* ---------- data ---------- */
let TAKEN = null; // Set of names already on the team being generated
let POOL = null;  // names a code game wants to surface in shops and rewards
function poolPick(h, kind) {
  if (!POOL || !POOL.length) return null;
  const c = POOL.filter(n => { const w = PDB.WHO[n]; return w && w.kind === kind && !(TAKEN && TAKEN.has(n)); });
  if (!c.length || !chance(h, 0.6)) return null;
  const n = pick(h, c); if (TAKEN) TAKEN.add(n);
  return { name: n, tier: PDB.WHO[n].tier };
}
const PDB = (typeof module !== 'undefined' && module.exports) ? require('./players.js') : root.PT_PLAYERS;
const TIERS = PDB.TIERS;
/* weighted rarity roll. lift 0..1 shifts odds toward the good stuff */
function rollTier(h, lift, legendX) {
  lift = clamp(lift || 0, 0, 1);
  const w = { C: Math.max(8, 58 - 44 * lift), U: 28 + 6 * lift, R: 11 + 22 * lift, L: (3 + 9 * lift) * (legendX || 1) };
  let r = rf(h) * (w.C + w.U + w.R + w.L);
  for (const t of ['L', 'R', 'U', 'C']) { if ((r -= w[t]) < 0) return t; }
  return 'C';
}
function pickName(h, kind, tier) {
  const list = PDB.DB[kind === 'bat' ? 'bat' : 'pit'][tier || 'C'];
  let n = pick(h, list);
  for (let i = 0; TAKEN && TAKEN.has(n) && i < 12; i++) n = pick(h, list);
  if (TAKEN) TAKEN.add(n);
  return n;
}
const POS = ['C','1B','2B','3B','SS','LF','CF','RF','DH'];

const BAT_TRAITS = {
  clutch:  { name: 'Clutch',    desc: '+10 CON/POW with a runner in scoring position' },
  slugger: { name: 'Slugger',   desc: 'Home run chance x1.3' },
  burner:  { name: 'Burner',    desc: '+12 SPD on the bases' },
  eagle:   { name: 'Eagle Eye', desc: '+4% walks, -3% strikeouts' },
  contact: { name: 'Bat Ctrl',  desc: '-4% strikeouts' },
};
const PIT_TRAITS = {
  fireball:  { name: 'Fireball',  desc: '+4% strikeouts' },
  sinker:    { name: 'Sinker',    desc: 'More double plays, fewer homers' },
  workhorse: { name: 'Workhorse', desc: '+4 stamina' },
  closer:    { name: 'Closer',    desc: '+10 STUFF in the 9th inning and later' },
};

const RELICS = {
  pine_tar:    { name: 'Pine Tar',        price: 5, desc: '+6 CON for every hitter.',                 fx: (m, r) => { if (r === 'bat') m.con += 6; } },
  radar_gun:   { name: 'Radar Gun',       price: 5, desc: '+6 STUFF for your pitchers.',              fx: (m, r) => { if (r === 'pit') m.stf += 6; } },
  corked_bat:  { name: 'Corked Bat',      price: 6, desc: 'Homers x1.3, but +2% strikeouts.',         fx: (m, r) => { if (r === 'bat') { m.hr *= 1.3; m.k += 0.02; } } },
  eye_black:   { name: 'Eye Black',       price: 5, desc: '+10 EYE for every hitter.',                fx: (m, r) => { if (r === 'bat') m.eye += 10; } },
  gold_glove:  { name: 'Golden Glove',    price: 6, desc: '+8 team DEF.',                             fx: (m, r) => { if (r === 'pit') m.def += 8; } },
  steal_signs: { name: 'Steal Signs',     price: 5, desc: '+15% steal and bunt success.',             fx: (m, r) => { if (r === 'bat') m.steal += 0.15; } },
  rally_cap:   { name: 'Rally Cap',       price: 6, desc: '+8 CON and POW while trailing.',           fx: (m, r, x) => { if (r === 'bat' && x.trail) { m.con += 8; m.pow += 8; } } },
  seeds:       { name: 'Sunflower Seeds', price: 6, desc: '+2 CLUTCH charges every game.' },
  piggy:       { name: 'Piggy Bank',      price: 5, desc: '+3 gold after every win.' },
  bullpen_cart:{ name: 'Bullpen Cart',    price: 6, desc: 'Relievers: +10 STUFF, +4 stamina.',        fx: (m, r, x) => { if (r === 'pit' && x.pitcher.kind === 'rp') m.stf += 10; } },
  launch:      { name: 'Launch Angle',    price: 6, desc: '+8 POW, -3 CON for every hitter.',         fx: (m, r) => { if (r === 'bat') { m.pow += 8; m.con -= 3; } } },
  mulligan:    { name: 'Mulligan Glove',  price: 7, desc: 'Once a game, re-roll an out with a runner in scoring position.' },
  stretch:     { name: '7th Inn. Stretch',price: 7, desc: '+6 CON/POW/EYE in the 8th inning and later.', fx: (m, r, x) => { if (r === 'bat' && x.inn >= 8) { m.con += 6; m.pow += 6; m.eye += 6; } } },
  cleats:      { name: 'Spiked Cleats',   price: 5, desc: '+10 SPD for every runner.',                fx: (m, r) => { if (r === 'bat') m.spd += 10; } },
  scouting:    { name: 'Scouting Report', price: 6, desc: 'Enemy pitchers: -5 STUFF.',                fx: (m, r) => { if (r === 'bat') m.oppStf -= 5; } },
  rosin:       { name: 'Rosin Bag',       price: 5, desc: '+6 CTL for your pitchers.',                fx: (m, r) => { if (r === 'pit') m.ctl += 6; } },
};

const QUIRKS = {
  ace:      { name: 'Ace Starter',    desc: 'Starting pitcher +12 STUFF.',     fx: (m, r, x) => { if (r === 'pit' && x.pitcher.kind === 'sp') m.stf += 12; } },
  sluggers: { name: 'Sluggers',       desc: '+10 POW, more homers.',           fx: (m, r) => { if (r === 'bat') { m.pow += 10; m.hr *= 1.15; } } },
  speed:    { name: 'Speed Demons',   desc: '+15 SPD, take extra bases.',      fx: (m, r) => { if (r === 'bat') m.spd += 15; } },
  lockdown: { name: 'Lockdown Pen',   desc: 'Relievers +12 STUFF.',            fx: (m, r, x) => { if (r === 'pit' && x.pitcher.kind === 'rp') m.stf += 12; } },
  tight_d:  { name: 'Tight Defense',  desc: '+10 team DEF.',                   fx: (m, r) => { if (r === 'pit') m.def += 10; } },
  contact:  { name: 'Contact Club',   desc: '+8 CON, fewer strikeouts.',       fx: (m, r) => { if (r === 'bat') { m.con += 8; m.k -= 0.02; } } },
  hot:      { name: 'Hot Streak',     desc: '+4 CON/POW/EYE.',                 fx: (m, r) => { if (r === 'bat') { m.con += 4; m.pow += 4; m.eye += 4; } } },
  clutchy:  { name: 'Ice Veins',      desc: '+8 CON/POW with RISP.',           fx: (m, r, x) => { if (r === 'bat' && x.risp) { m.con += 8; m.pow += 8; } } },
};

const TRAINING = {
  cage:    { name: 'Batting Cage',    desc: '+7 CON to a hitter',  kind: 'bat', stat: 'con', amt: 7 },
  weights: { name: 'Weight Room',     desc: '+7 POW to a hitter',  kind: 'bat', stat: 'pow', amt: 7 },
  film:    { name: 'Film Study',      desc: '+7 EYE to a hitter',  kind: 'bat', stat: 'eye', amt: 7 },
  sprints: { name: 'Sprint Drills',   desc: '+8 SPD to a hitter',  kind: 'bat', stat: 'spd', amt: 8 },
  glove:   { name: 'Glove Work',      desc: '+8 DEF to a hitter',  kind: 'bat', stat: 'def', amt: 8 },
  heat:    { name: 'Bullpen Session', desc: '+7 STF to a pitcher', kind: 'pit', stat: 'stf', amt: 7 },
  command: { name: 'Command Drills',  desc: '+7 CTL to a pitcher', kind: 'pit', stat: 'ctl', amt: 7 },
  cond:    { name: 'Conditioning',    desc: '+3 STA to a pitcher', kind: 'pit', stat: 'sta', amt: 3 },
};

const ARCH = {
  small: { name: 'SMALL BALL',    desc: 'Contact, speed and patience. Manufacture runs.', bias: { con: 8, eye: 6, spd: 10, pow: -10 }, pit: 0,  relic: 'steal_signs' },
  slug:  { name: 'THE SLUGGERS',  desc: 'Big power, big whiffs. Live by the long ball.',  bias: { pow: 14, con: -4, eye: -4, spd: -6 }, pit: 0,  relic: 'corked_bat' },
  duel:  { name: 'PITCHING DUEL', desc: 'Ace arm, deep pen, glove-first bats.',           bias: { con: -4, pow: -2, def: 6 },           pit: 11, relic: 'radar_gun' },
};

/* Real cities and leagues, nicknames swapped for synonyms, real team colors [primary, secondary]. */
const TEAMS = {
  BAL: { city: 'Baltimore',     nick: 'Orange Birds',  lg: 'AL', div: 'East',    colors: ['#DF4601', '#1a1c2c'] },
  BOS: { city: 'Boston',        nick: 'Crimson Hose',  lg: 'AL', div: 'East',    colors: ['#BD3039', '#0C2340'] },
  NYY: { city: 'New York',      nick: 'Pinstripes',    lg: 'AL', div: 'East',    colors: ['#0C2340', '#C4CED3'] },
  TB:  { city: 'Tampa Bay',     nick: 'Sunbeams',      lg: 'AL', div: 'East',    colors: ['#092C5C', '#8FBCE6'] },
  TOR: { city: 'Toronto',       nick: 'Bluebirds',     lg: 'AL', div: 'East',    colors: ['#134A8E', '#E8291C'] },
  CWS: { city: 'Chicago',       nick: 'Pale Hose',     lg: 'AL', div: 'Central', colors: ['#27251F', '#C4CED4'] },
  CLE: { city: 'Cleveland',     nick: 'Sentinels',     lg: 'AL', div: 'Central', colors: ['#00385D', '#E50022'] },
  DET: { city: 'Detroit',       nick: 'Big Cats',      lg: 'AL', div: 'Central', colors: ['#0C2340', '#FA4616'] },
  KC:  { city: 'Kansas City',   nick: 'Monarchs',      lg: 'AL', div: 'Central', colors: ['#004687', '#BD9B60'] },
  MIN: { city: 'Minnesota',     nick: 'Doubles',       lg: 'AL', div: 'Central', colors: ['#002B5C', '#D31145'] },
  HOU: { city: 'Houston',       nick: 'Rocketeers',    lg: 'AL', div: 'West',    colors: ['#002D62', '#EB6E1F'] },
  LAA: { city: 'Anaheim',       nick: 'Halos',         lg: 'AL', div: 'West',    colors: ['#BA0021', '#003263'] },
  ATH: { city: 'Sacramento',    nick: 'Elephants',     lg: 'AL', div: 'West',    colors: ['#003831', '#EFB21E'] },
  SEA: { city: 'Seattle',       nick: 'Sailors',       lg: 'AL', div: 'West',    colors: ['#0C2C56', '#005C5C'] },
  TEX: { city: 'Texas',         nick: 'Lawmen',        lg: 'AL', div: 'West',    colors: ['#003278', '#C0111F'] },
  ATL: { city: 'Atlanta',       nick: 'Warriors',      lg: 'NL', div: 'East',    colors: ['#CE1141', '#13274F'] },
  MIA: { city: 'Miami',         nick: 'Swordfish',     lg: 'NL', div: 'East',    colors: ['#00A3E0', '#EF3340'] },
  NYM: { city: 'New York',      nick: 'Metros',        lg: 'NL', div: 'East',    colors: ['#002D72', '#FF5910'] },
  PHI: { city: 'Philadelphia',  nick: 'Liberty',       lg: 'NL', div: 'East',    colors: ['#E81828', '#002D72'] },
  WSH: { city: 'Washington',    nick: 'Senators',      lg: 'NL', div: 'East',    colors: ['#AB0003', '#14225A'] },
  CHC: { city: 'Chicago',       nick: 'Bear Cubs',     lg: 'NL', div: 'Central', colors: ['#0E3386', '#CC3433'] },
  CIN: { city: 'Cincinnati',    nick: 'Redlegs',       lg: 'NL', div: 'Central', colors: ['#C6011F', '#1a1c2c'] },
  MIL: { city: 'Milwaukee',     nick: 'Brewmasters',   lg: 'NL', div: 'Central', colors: ['#12284B', '#FFC52F'] },
  PIT: { city: 'Pittsburgh',    nick: 'Buccos',        lg: 'NL', div: 'Central', colors: ['#27251F', '#FDB827'] },
  STL: { city: 'St. Louis',     nick: 'Redbirds',      lg: 'NL', div: 'Central', colors: ['#C41E3A', '#0C2340'] },
  ARI: { city: 'Arizona',       nick: 'Rattlers',      lg: 'NL', div: 'West',    colors: ['#A71930', '#E3D4AD'] },
  COL: { city: 'Colorado',      nick: 'Peaks',         lg: 'NL', div: 'West',    colors: ['#33006F', '#C4CED4'] },
  LAD: { city: 'Los Angeles',   nick: 'Blue Crew',     lg: 'NL', div: 'West',    colors: ['#005A9C', '#EF3E42'] },
  SD:  { city: 'San Diego',     nick: 'Friars',        lg: 'NL', div: 'West',    colors: ['#2F241D', '#FFC425'] },
  SF:  { city: 'San Francisco', nick: 'Titans',        lg: 'NL', div: 'West',    colors: ['#FD5A1E', '#27251F'] },
};
const LEAGUES = { AL: 'American League', NL: 'National League' };
const teamName = k => TEAMS[k].city + ' ' + TEAMS[k].nick;
function stageLabel(run, st) {
  const lg = TEAMS[run.team] ? TEAMS[run.team].lg : 'AL';
  return ['GAME 1', 'GAME 2', 'GAME 3', 'GAME 4', 'GAME 5', 'GAME 6', 'GAME 7', 'GAME 8', 'WILD CARD', lg + 'DS', lg + 'CS', 'WORLD SERIES'][st];
}
const STAGE_LABELS = ['GAME 1', 'GAME 2', 'GAME 3', 'GAME 4', 'GAME 5', 'GAME 6', 'GAME 7', 'GAME 8', 'WILD CARD', 'DIVISION SERIES', 'LEAGUE CHAMPIONSHIP', 'WORLD SERIES'];
/* 8 league games (division rivals first), 3 league playoff rounds, World Series vs the other league */
function makeSchedule(h, us) {
  const me = TEAMS[us];
  const keys = Object.keys(TEAMS).filter(k => k !== us);
  const rivals = keys.filter(k => TEAMS[k].lg === me.lg && TEAMS[k].div === me.div);
  const league = keys.filter(k => TEAMS[k].lg === me.lg && TEAMS[k].div !== me.div);
  const other = keys.filter(k => TEAMS[k].lg !== me.lg);
  const reg = sample(h, rivals, 4).concat(sample(h, league, 4));
  const po = sample(h, league.concat(rivals), 3);
  return reg.concat(po, [pick(h, other)]);
}
const TOTAL_STAGES = 12;
/* Relic packs: 0 is the starter pool, the rest unlock in the Front Office. */
const RELIC_PACK = { seeds: 1, piggy: 1, bullpen_cart: 1, rosin: 1, scouting: 1, launch: 2, mulligan: 2, stretch: 2 };
const relicPack = id => RELIC_PACK[id] || 0;
/* Playbook: tactics you earn during a run. You start with NORMAL/CONTACT/POWER and NORMAL/ATTACK. */
const PLAYS = {
  steal:   { name: 'STEAL SIGN',   side: 'bat', desc: 'Unlocks STEAL when a runner has an open base.' },
  bunt:    { name: 'BUNT SIGN',    side: 'bat', desc: 'Unlocks the sacrifice BUNT.' },
  patient: { name: 'TAKE SIGN',    side: 'bat', desc: 'Unlocks PATIENT at bat: work the count, draw walks.' },
  nibble:  { name: 'NIBBLE',       side: 'pit', desc: 'Unlocks NIBBLE on the mound: pitch around hitters.' },
  ibb:     { name: 'FOUR WIDE',    side: 'pit', desc: 'Unlocks the intentional walk.' },
  infield: { name: 'INFIELD IN',   side: 'pit', desc: 'Unlocks INFIELD IN to cut off runs at the plate.' },
};
const hasPlay = (run, id) => !run.plays || run.plays.includes(id);
/* Front Office: permanent unlocks bought with Fans earned from every run. */
const FRONT_OFFICE = [
  { id: 'daily',     name: 'Daily Game',          desc: 'Unlock the Daily Game mode.', cost: 40, mode: true },
  { id: 'draft',     name: 'Draft Day',           desc: 'Unlock Draft Day: build your roster pick by pick.', cost: 80, mode: true },
  { id: 'franchise', name: 'Franchise Legends',   desc: 'Unlock Franchise Legends: start with your city\'s all-time greats.', cost: 100, mode: true },
  { id: 'trade',     name: 'Trade Desk',          desc: 'Unlock Trade Desk: trade offers and poaching.', cost: 100, mode: true },
  { id: 'gauntlet',  name: 'Gauntlet',            desc: 'Unlock endless Gauntlet. Also unlocks free when you reach the playoffs.', cost: 150, mode: true },
  { id: 'relics1',   name: 'Clubhouse Classics',  desc: '5 new relics join the pool: Sunflower Seeds, Piggy Bank, Bullpen Cart, Rosin Bag, Scouting Report.', cost: 60 },
  { id: 'relics2',   name: 'Superstitions',       desc: '3 big relics join the pool: Launch Angle, Mulligan Glove, 7th Inning Stretch.', cost: 120, req: 'relics1' },
  { id: 'booster',   name: 'Booster Club',        desc: 'Start every run with +$3.', cost: 50 },
  { id: 'playbook',  name: 'Spring Training',     desc: 'Start every run with the STEAL SIGN.', cost: 60 },
  { id: 'bigshop',   name: 'Bigger Shop',         desc: 'One more player for sale in every shop.', cost: 90 },
  { id: 'bullpen',   name: 'Bullpen Coach',       desc: 'Your relievers get +4 STUFF.', cost: 80 },
  { id: 'academy',   name: 'Clutch Academy',      desc: '+1 CLUTCH every game.', cost: 110 },
  { id: 'scouts',    name: 'Scouting Department', desc: 'Rare and Legendary players show up more often.', cost: 120 },
  { id: 'trophy',    name: 'Trophy Case',         desc: '+1 relic slot from the start.', cost: 140 },
];
/* Fans earned at the end of a run */
function fansFor(run) {
  if (run.mode === 'gauntlet') return 8 * run.wins + 5;
  return 10 * run.wins + 3 * Math.min(run.stage, 12) + (run.champion ? 60 : 0) + 5;
}
/* World Series boss. Its gimmick punishes predictable managing. */
const BOSSES = {
  signs: {
    name: 'THE SIGN STEALERS',
    tag: 'They read every call you make.',
    rules: [
      'Every time you call a play, they read it. Each READ on a batting call: about +3.5% strikeouts and -2.5% hits.',
      'Each READ on a pitching call: their hitters get about +2.5% hits and more homers.',
      'Call something different and every other play cools off by one READ. Max 4 READS per call.',
      'CLUTCH can\'t be read. Once per game, CHANGE SIGNS wipes every READ.',
      'Their ace is a Legendary arm. You call every pitch and every at-bat in this one.',
    ],
  },
};
const READ_CAP = 4;
const readsOf = (G, kind, ap) => Math.min(READ_CAP, (G.reads && G.reads[kind] && G.reads[kind][ap]) || 0);
const MODES = {
  season:   { name: 'SEASON',   desc: '12 games: 8 in your league, then 4 playoff rounds. Climb the Pressure ladder.' },
  daily:    { name: 'DAILY GAME', desc: 'Same city, rosters and twists for everyone today. One shot.' },
  gauntlet: { name: 'GAUNTLET', desc: 'Endless. Every game is harder. How many can you win before 3 losses?' },
  draft:    { name: 'DRAFT DAY', desc: 'Build your roster one pick at a time: 12 rounds, every position, pick 1 of 4. Then play a Season.' },
  franchise:{ name: 'FRANCHISE LEGENDS', desc: 'Start with your city\'s all-time greats. A little past their prime. Then play a Season.' },
  seeded:   { name: 'CODE GAME', desc: 'Type a code. Same code, same game, for anyone you share it with.' },
  trade:    { name: 'TRADE DESK', desc: 'A Season where GMs call you between games, and you can poach players off your next opponent.' },
};
const SEASON_LIKE = ['season', 'daily', 'draft', 'franchise', 'trade', 'seeded'];
/* Pre-built code games. Any other code still works: it seeds a normal season everyone can replay. */
const SEEDS = {
  jooz: {
    title: 'TEAM JOOZ',
    desc: '31 Jewish big leaguers, slightly bent. You start with 12. The other 19, Sandy Koufox included, turn up in your shops and free picks.',
    team: 'LAD', relic: 'rally_cap',
    lineup: [['Mike Liebertal', 'C'], ['Hank Greenburg', '1B'], ['Ian Kinslar', '2B'], ['Kevin Youkilus', '3B'], ['Alex Bregmann', 'SS'], ['Ryan Braune', 'LF'], ['Harrison Baider', 'CF'], ['Shawn Greene', 'RF'], ['Joc Pedersen', 'DH']],
    pitchers: ['Max Freid', 'Dean Kremmer', 'Steve Stoan'],
    pool: ['Sandy Koufox', 'Ike Davish', 'Zack Geloff', 'Gabe Kaplar', 'Kevin Pillarr', 'Rowdy Tellas', 'Hunter Bishopp', 'Alex Dickersen', 'Sam Fould', 'Dalton Guthry', 'Ryan Lavarnwey', 'Matt Mervys', 'Al Rosenn', 'Garrett Stubbz', 'Jake Fishmann', 'Rob Kaminski', 'Jared Schuster', 'Jacob Steinmitz', 'Rob Stocke'],
  },
  canada: {
    title: 'TRUE NORTH', team: 'TOR', relic: 'eye_black', dmods: [],
    desc: 'The best Canadians to play in the bigs, eh. Freddie Freedman and a young Vlad Guerrera Jr. are out there somewhere.',
    lineup: [['Russell Martinn', 'C'], ['Joey Vottle', '1B'], ['Brett Lawry', '2B'], ['Corey Koskey', '3B'], ['Abraham Torro', 'SS'], ['Jason Baye', 'LF'], ["Tyler O'Neil", 'CF'], ['Larry Walkar', 'RF'], ['Justin Morneu', 'DH']],
    pitchers: ['Fergie Jenkens', 'Eric Ganye', 'Ryan Dempstar'],
    pool: ['Freddie Freedman', 'Vlad Guerrera Jr.', 'Josh Naylar', 'Bo Naylar', 'Matt Stairz', 'Jeff Franciss', 'James Paxtonn', 'Cal Quantrel', 'John Axfurd', 'Nick Pivettah', 'Rich Hardin', 'Paul Quantril'],
  },
  japan: {
    title: 'SAMURAI SQUAD', team: 'SEA', relic: 'steal_signs', dmods: ['speedway'],
    desc: 'Japan\'s best in MLB, playing small ball on fast legs (+12 SPD for everyone). Shohei Ohtoni is out there. So is Roki Sasakki.',
    lineup: [['Kenji Jojima', 'C'], ['Masataka Yoshido', '1B'], ['Tadahito Iguchy', '2B'], ['Akinori Iwamora', '3B'], ['Kazuo Matsuey', 'SS'], ['Kosuke Fukudomi', 'LF'], ['Seiya Suzuky', 'CF'], ['Ichiro Suzaki', 'RF'], ['Hideki Matsuy', 'DH']],
    pitchers: ['Hideo Nomoh', 'Kazuhiro Sasakee', 'Koji Uehera'],
    pool: ['Shohei Ohtoni', 'Yu Darvesh', 'Masahiro Tanaki', 'Kodai Senka', 'Yoshi Yamamota', 'Shota Imanoga', 'Daisuke Matsuzawa', 'Hiroki Kuroder', 'Roki Sasakki', 'So Taguchy', 'Munetaka Murakame'],
  },
  moneyball: {
    title: 'MONEYBALL', team: 'ATH', relic: 'eye_black', dmods: ['smallmkt'],
    desc: 'The 2002 Elephants: no budget, all on-base. You start with $0 and earn +2 extra per win. Walks are cheap. Use them.',
    lineup: [['Ramon Hernanz', 'C'], ['Scott Hattenberg', '1B'], ['Mark Elliss', '2B'], ['Eric Chavezz', '3B'], ['Miguel Tejadah', 'SS'], ['Terrence Longg', 'LF'], ['Chris Singletin', 'CF'], ['Jermaine Dey', 'RF'], ['David Justis', 'DH']],
    pitchers: ['Barry Zitto', 'Billy Koche', 'Chad Bradferd'],
    pool: ['Tim Hudsen', 'Mark Mulderr', 'Ray Durhamm', 'Jeremy Giambee', 'Mike Magnant', 'Jim Mecirr', 'Carlos Penya', 'Ted Lilley', 'Cory Lidel'],
  },
  idiots: {
    title: 'THE IDIOTS', team: 'BOS', relic: 'rally_cap', dmods: [],
    desc: 'The 2004 Crimson Hose. Down 3-0 and nobody believed. They hit better when they\'re behind. Pedro Martinex and Dave Robertz are out there.',
    lineup: [['Jason Varitech', 'C'], ['Kevin Millarr', '1B'], ['Mark Bellhorne', '2B'], ['Bill Muller', '3B'], ['Orlando Cabrero', 'SS'], ['Manny Ramires', 'LF'], ['Johnny Daemon', 'CF'], ['Trot Nixxon', 'RF'], ['David Ortez', 'DH']],
    pitchers: ['Curt Schilly', 'Keith Foulk', 'Mike Timlinn'],
    pool: ['Pedro Martinex', 'Tim Wakefeld', 'Derek Loew', 'Bronson Arroya', 'Dave Robertz', 'Doug Mientkewicz', 'Gabe Kaplar', 'Pokey Reece', 'Alan Embrey'],
  },
  nlb: {
    title: 'NEGRO LEAGUES LEGENDS', team: 'KC', relic: 'cleats', dmods: ['speedway'],
    desc: 'The Kansas City Monarchs and the greats of the Negro Leagues, finally getting their due. Fast and fearless (+12 SPD for everyone). Josh Gibsun, Satchel Paage and Oscar Charlstone are out there.',
    lineup: [['Biz Mackie', 'C'], ['Buck Leonardo', '1B'], ['Newt Allan', '2B'], ['Judy Johnsen', '3B'], ['Willie Welles', 'SS'], ['Turkey Stearns', 'LF'], ['Cool Papa Belle', 'CF'], ['Martin Dihego', 'RF'], ['Mule Suttle', 'DH']],
    pitchers: ['Bullet Rogann', 'Hilton Smyth', 'Ray Browne'],
    pool: ['Josh Gibsun', 'Satchel Paage', 'Oscar Charlstone', 'Pop Loyd', 'Smokey Joe Willams', 'Ray Dandrige', 'Monte Irvine', 'Larry Dobie', 'Jackie Robinsen', 'Leon Daye'],
  },
};
const normCode = c => String(c || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
function codeSeed(code) { let h = 2166136261; for (const ch of normCode(code)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h | 0; }
function codeInfo(code) {
  const c = normCode(code); if (!c) return null;
  const seed = codeSeed(c), known = SEEDS[c];
  const team = known ? known.team : Object.keys(TEAMS)[Math.abs(hashSeed(seed, 5)) % Object.keys(TEAMS).length];
  return { code: c, seed, team, known: known || null };
}
function makeSeedTeam(code) {
  const info = codeInfo(code); if (!info || !info.known) return null;
  const K = info.known, h = { rs: hashSeed(info.seed, 4243) };
  const who = n => PDB.WHO[n] || { kind: 'bat', tier: 'C' };
  const age = t => TIERS[t].boost * 0.45;
  const lineup = K.lineup.map(([n]) => genBatter(h, 45 - age(who(n).tier), null, 0.3, who(n).tier, n));
  const pitchers = K.pitchers.map((n, i) => genPitcher(h, (i === 0 ? 47 : 45) - age(who(n).tier), i === 0 ? 'sp' : 'rp', 0.3, who(n).tier, n));
  return { lineup, pitchers, relic: K.relic, pool: K.pool.slice(), positions: K.lineup.map(x => x[1]), dmods: (K.dmods || []).slice() };
}
const PRESSURE = [
  { name: 'ROOKIE',     desc: 'The standard season.' },
  { name: 'PRESSURE 1', desc: 'Opponents +3 across the board.' },
  { name: 'PRESSURE 2', desc: 'Start with $0.' },
  { name: 'PRESSURE 3', desc: 'Shop prices +1.' },
  { name: 'PRESSURE 4', desc: 'Every opponent brings an extra trick.' },
  { name: 'PRESSURE 5', desc: 'Only 2 CLUTCH charges per game.' },
  { name: 'PRESSURE 6', desc: 'Free picks offer 2 choices, not 3.' },
  { name: 'PRESSURE 7', desc: 'Only 2 losses allowed.' },
  { name: 'PRESSURE 8', desc: 'The World Series opponent is stacked.' },
];
const DAILY_MODS = {
  juiced:   { name: 'Juiced Balls',        desc: 'Home runs x1.4 for everyone.' },
  deadarms: { name: 'Dead Arms',           desc: 'Every pitcher -4 stamina.' },
  bandbox:  { name: 'Bandbox Parks',       desc: '+8 POW for every hitter.' },
  smallmkt: { name: 'Small Market',        desc: 'Start with $0, +2 gold per win.' },
  quick:    { name: 'Rain-Shortened',      desc: 'Games start in the 8th: just 2 innings.' },
  deep:     { name: 'Deep Pockets',        desc: 'Start with $12, shop prices +1.' },
  oldtimers:{ name: 'Old-Timers Day',      desc: 'Legends show up 3x as often.' },
  speedway: { name: 'Speedway',            desc: '+12 SPD for every runner.' },
  aces:     { name: 'Year of the Pitcher', desc: '+8 STUFF for every pitcher.' },
};
function buildCfg(mode, pressure, dmods, perks) {
  const P = mode === 'season' ? (pressure || 0) : 0;
  const c = { oppBoost: 0, startGold: 3, priceUp: 0, extraQuirk: 0, clutch: 3, rewardN: 3, maxLosses: 3, wsBoost: 0,
    hr: 1, sta: 0, pow: 0, spd: 0, stf: 0, gameLen: GAME_LEN, startInn: START_INN, winGold: 0, legendX: 1,
    relicPack: 0, shopBonus: 0, rpStf: 0, slotBonus: 0, scoutLift: 0, startPlays: [] };
  // daily runs are the same for everyone: no perks, full relic pool, full playbook
  const pk = mode === 'daily' || mode === 'seeded' ? null : (perks || []);
  if (!pk) { c.relicPack = 2; c.startPlays = Object.keys(PLAYS); }
  else {
    if (pk.includes('relics1')) c.relicPack = 1;
    if (pk.includes('relics2')) c.relicPack = 2;
    if (pk.includes('booster')) c.startGold += 3;
    if (pk.includes('playbook')) c.startPlays.push('steal');
    if (pk.includes('bigshop')) c.shopBonus = 1;
    if (pk.includes('bullpen')) c.rpStf = 4;
    if (pk.includes('academy')) c.clutch += 1;
    if (pk.includes('scouts')) c.scoutLift = 0.15;
    if (pk.includes('trophy')) c.slotBonus = 1;
  }
  if (P >= 1) c.oppBoost += 3;
  if (P >= 2) c.startGold = Math.max(0, c.startGold - 3);
  if (P >= 3) c.priceUp += 1;
  if (P >= 4) c.extraQuirk += 1;
  if (P >= 5) c.clutch -= 1;
  if (P >= 6) c.rewardN = 2;
  if (P >= 7) c.maxLosses = 2;
  if (P >= 8) c.wsBoost = 6;
  (dmods || []).forEach(m => {
    if (m === 'juiced') c.hr *= 1.4;
    if (m === 'deadarms') c.sta -= 4;
    if (m === 'bandbox') c.pow += 8;
    if (m === 'smallmkt') { c.startGold = 0; c.winGold += 2; }
    if (m === 'quick') c.startInn = 8;
    if (m === 'deep') { c.startGold = 12; c.priceUp += 1; }
    if (m === 'oldtimers') c.legendX = 3;
    if (m === 'speedway') c.spd += 12;
    if (m === 'aces') c.stf += 8;
  });
  return c;
}
function dailyInfo(dateKey) {
  const n = parseInt(String(dateKey).replace(/\D/g, ''), 10) || 1;
  const h = { rs: hashSeed(n, 31337) };
  const keys = Object.keys(TEAMS);
  return { seed: hashSeed(n, 99), team: pick(h, keys), dmods: sample(h, Object.keys(DAILY_MODS), 2), dateKey };
}
const cfgOf = run => run.cfg || buildCfg('season', 0, []);
const isEndless = run => run.mode === 'gauntlet';
const MAX_LOSSES = 3;
/* Every game picks up in the top of the 7th, scoreless through 6: three innings to win it. */
const GAME_LEN = 9;
const START_INN = 7;

/* ---------- players ---------- */
const newId = h => 'p' + Math.floor(rf(h) * 1e9).toString(36);
function traitChance(traitP, tier) {
  const t = TIERS[tier].trait;
  if (traitP == null) return t;
  if (traitP === 0) return tier === 'L' ? 1 : 0;
  return Math.max(traitP, t);
}
function genBatter(h, q, bias, traitP, tier, fixedName) {
  bias = bias || {}; tier = tier || 'C';
  if (!fixedName) { const pp = poolPick(h, 'bat'); if (pp) { fixedName = pp.name; tier = pp.tier; } }
  const bq = q + TIERS[tier].boost;
  const g = k => clamp(Math.round(norm(h, bq + (bias[k] || 0), 8)), 20, 99);
  const p = { id: newId(h), kind: 'bat', tier, name: fixedName || pickName(h, 'bat', tier), con: g('con'), pow: g('pow'), eye: g('eye'), spd: g('spd'), def: g('def'), trait: null, look: ri(h, 1, 999999) };
  if (chance(h, traitChance(traitP, tier))) p.trait = pick(h, Object.keys(BAT_TRAITS));
  return p;
}
function genPitcher(h, q, kind, traitP, tier, fixedName) {
  tier = tier || 'C';
  if (!fixedName) { const pp = poolPick(h, 'pit'); if (pp) { fixedName = pp.name; tier = pp.tier; } }
  const bq = q + TIERS[tier].boost;
  const g = (m) => clamp(Math.round(norm(h, m, 8)), 20, 99);
  const p = { id: newId(h), kind, tier, name: fixedName || pickName(h, 'pit', tier), stf: g(bq), ctl: g(bq), sta: (kind === 'sp' ? ri(h, 13, 19) : ri(h, 5, 8)) + (tier === 'L' ? 2 : tier === 'R' ? 1 : 0), trait: null, look: ri(h, 1, 999999) };
  if (chance(h, traitChance(traitP, tier))) {
    const keys = Object.keys(PIT_TRAITS).filter(k => k !== 'closer' || kind === 'rp');
    p.trait = pick(h, keys);
  }
  return p;
}
const ovr = p => p.kind === 'bat'
  ? Math.round((p.con * 1.3 + p.pow * 1.1 + p.eye * 0.8 + p.spd * 0.4 + p.def * 0.4) / 4)
  : Math.round((p.stf * 1.6 + p.ctl * 1.1 + Math.min(99, p.sta * 3.5) * 0.3) / 3);
const TIER_PREMIUM = { C: 0, U: 1, R: 2, L: 4 };
const playerPrice = (p, stage) => clamp(Math.round(4 + (ovr(p) - (stage == null ? 50 : 47 + Math.min(stage, 14) * 1.9 + Math.max(0, stage - 14))) / 3) + (TIER_PREMIUM[p.tier || 'C'] || 0), 3, 14);

/* ---------- run (the roguelite layer) ---------- */
function makeStartTeam(h, key) {
  const a = ARCH[key];
  TAKEN = new Set();
  const uSlots = sample(h, [0, 1, 2, 3, 4, 5, 6, 7, 8], 2);
  const lineup = POS.map((_, i) => genBatter(h, 49, a.bias, 0.2, uSlots.includes(i) ? 'U' : 'C'));
  const pitchers = [genPitcher(h, 51 + a.pit, 'sp', 0.4, 'U'), genPitcher(h, 50 + a.pit, 'rp', 0.3), genPitcher(h, 48 + a.pit, 'rp', 0.3)];
  TAKEN = null;
  return { lineup, pitchers };
}
function newDraft(seed) {
  const h = { rs: seed | 0 };
  return Object.keys(ARCH).map(k => ({ key: k, name: ARCH[k].name, desc: ARCH[k].desc, relic: ARCH[k].relic, team: makeStartTeam(h, k) }));
}
function startRun(opt, seed, teamKey, o) {
  o = o || {};
  if (!TEAMS[teamKey]) teamKey = 'BOS';
  const mode = o.mode || 'season', pressure = o.pressure || 0, dmods = o.dmods || [];
  const cfg = buildCfg(mode, pressure, dmods, o.perks);
  const sig = { small: 'steal', slug: 'patient', duel: 'nibble' }[opt.key];
  const run = {
    v: 3, mode, pressure, dmods, dateKey: o.dateKey || null, cfg, code: o.code || null, namePool: o.namePool || null, clutchBonus: 0, lossBonus: 0, nextQuirk: 0, event: null, lastEventStage: -9,
    seed: seed | 0, rs: hashSeed(seed, 7), arch: opt.key, team: teamKey, schedule: null, stage: 0, wins: 0, losses: 0, gold: cfg.startGold,
    lineup: opt.team.lineup, pitchers: opt.team.pitchers, relics: [opt.relic],
    plays: Array.from(new Set(cfg.startPlays.concat(sig ? [sig] : []))),
    phase: 'club', shop: null, rewards: null, rerolls: 0, done: false, champion: false, history: [], G: null,
    stats: { hr: 0, runs: 0, steals: 0 },
  };
  run.schedule = makeSchedule(run, teamKey);
  run.shop = makeShop(run);
  if (mode === 'trade') run.trades = makeTradeOffers(run);
  return run;
}
/* ---------- franchise legends ---------- */
function makeFranchiseTeam(seed, teamKey) {
  const h = { rs: hashSeed(seed, 4242) }, F = PDB.FR[teamKey] || PDB.FR.BOS;
  const age = t => TIERS[t].boost * 0.45; // past their prime: legends start strong, not broken
  const hit = sample(h, F.bat, 9), pit = sample(h, F.pit, 3);
  const lineup = hit.map(x => genBatter(h, 45 - age(x.tier), null, 0.3, x.tier, x.name));
  const sp = pit.reduce((a, x) => (TIERS[x.tier].boost > TIERS[a.tier].boost ? x : a), pit[0]);
  const rest = pit.filter(x => x !== sp);
  const pitchers = [genPitcher(h, 47 - age(sp.tier), 'sp', 0.3, sp.tier, sp.name)].concat(rest.map(x => genPitcher(h, 45 - age(x.tier), 'rp', 0.3, x.tier, x.name)));
  return { lineup, pitchers };
}
function relicChoices(seed, pack) { return sample({ rs: hashSeed(seed, 31) }, Object.keys(RELICS).filter(k => k !== 'piggy' && relicPack(k) <= (pack || 0)), 3); }

/* ---------- draft day ---------- */
const DRAFT_SLOTS = POS.concat(['SP', 'RP', 'RP']);
function draftRound(seed, round, takenNames) {
  const h = { rs: hashSeed(seed, 9000 + round) };
  TAKEN = new Set(takenNames || []);
  const slot = DRAFT_SLOTS[round], out = [];
  for (let i = 0; i < 4; i++) {
    const t = rollTier(h, 0.1);
    out.push(slot === 'SP' || slot === 'RP' ? genPitcher(h, slot === 'SP' ? 46 : 44, slot.toLowerCase(), 0.3, t) : genBatter(h, 44, null, 0.3, t));
  }
  TAKEN = null;
  return { slot, options: out };
}

/* ---------- trade desk ---------- */
const TV = { C: 0, U: 2, R: 4, L: 8 };
const tradeValue = p => ovr(p) + TV[p.tier || 'C'];
function makeTradeOffers(run) {
  const h = run, offers = [];
  const teams = Object.keys(TEAMS).filter(k => k !== run.team && k !== run.schedule[run.stage]);
  const used = new Set();
  TAKEN = rosterNames(run);
  for (let i = 0; i < 2; i++) {
    const isBat = chance(h, 0.7), arr = isBat ? run.lineup : run.pitchers;
    let idx = ri(h, 0, arr.length - 1); if (used.has(isBat + ':' + idx)) idx = (idx + 1) % arr.length; used.add(isBat + ':' + idx);
    const mine = arr[idx], delta = ri(h, -3, 6), tier = rollTier(h, 0.3);
    const q = tradeValue(mine) + delta - TV[tier] - TIERS[tier].boost;
    const p = isBat ? genBatter(h, q, null, 0.4, tier) : genPitcher(h, q, mine.kind === 'sp' ? 'sp' : 'rp', 0.4, tier);
    offers.push({ team: pick(h, teams), slot: isBat ? idx : 9 + idx, give: mine.id, get: p, gold: delta < 0 ? ri(h, 2, 4) : 0, done: false });
  }
  TAKEN = null;
  return offers;
}
function acceptOffer(run, i) {
  const o = run.trades && run.trades[i]; if (!o || o.done) return false;
  const cur = playerAt(run, o.slot); if (!cur || cur.id !== o.give) { o.done = true; return false; }
  placePlayer(run, o.get, o.slot); run.gold += o.gold; o.done = true;
  return true;
}
function oppTradeVerdict(run, theirIdx, mySlot, sweet) {
  const opp = oppFor(run), theirs = theirIdx < 9 ? opp.lineup[theirIdx] : opp.pitchers[theirIdx - 9], mine = playerAt(run, mySlot);
  if (!theirs || !mine || (theirIdx < 9) !== (mySlot < 9)) return { ok: false, gap: 99, theirs, mine };
  const give = tradeValue(mine) + (sweet || 0) * 0.8, want = tradeValue(theirs) + 2;
  return { ok: give >= want, gap: Math.max(0, Math.ceil((want - give) / 0.8)), theirs, mine };
}
function doOppTrade(run, theirIdx, mySlot, sweet) {
  if (run.oppTraded === run.stage || run.gold < (sweet || 0)) return false;
  const v = oppTradeVerdict(run, theirIdx, mySlot, sweet); if (!v.ok) return false;
  run.gold -= sweet || 0;
  const incoming = Object.assign({}, v.theirs, { id: newId(run) });
  run.oppSwaps = run.oppSwaps || {};
  (run.oppSwaps[run.stage] = run.oppSwaps[run.stage] || []).push({ idx: theirIdx, p: Object.assign({}, v.mine) });
  placePlayer(run, incoming, mySlot);
  run.oppTraded = run.stage;
  return incoming;
}

function stageQuality(stage) { return 46 + Math.min(stage, 14) * 1.9 + Math.max(0, stage - 14) * 1.0; }
function oppFor(run) {
  const st = run.stage, cfg = cfgOf(run), endless = isEndless(run);
  const h = { rs: hashSeed(run.seed, 100 + st) };
  const boss = endless ? (st % 5 === 4) : st >= 8;
  let S = endless ? 44 + st * 2.0 + (boss ? 3 : 0) : 44 + st * 2.1 + (boss ? 1 : 0) + (st === 11 ? 2 + cfg.wsBoost : 0);
  S += cfg.oppBoost - 3; // tiers add ~3 on average
  let key = run.schedule[st];
  if (!key) { const keys = Object.keys(TEAMS).filter(k => k !== run.team); key = keys[Math.abs(hashSeed(run.seed, 777 + st)) % keys.length]; }
  const T = TEAMS[key];
  let nq = endless ? Math.min(4, Math.floor(st / 4) + (boss ? 1 : 0)) : boss ? (st === 11 ? 2 : 1) : (st >= 4 ? 1 : (chance(h, 0.5) ? 1 : 0));
  nq = Math.min(5, nq + cfg.extraQuirk + (run.nextQuirk || 0));
  const quirks = sample(h, Object.keys(QUIRKS), nq);
  const lift = endless ? Math.min(1, st / 30) : st / 24;
  TAKEN = new Set();
  const bossId = (!endless && st === 11) || (endless && st % 10 === 9) ? 'signs' : null;
  const lineup = POS.map(() => genBatter(h, S, null, 0, rollTier(h, lift)));
  const pitchers = [genPitcher(h, S + (bossId ? -14 : 3), 'sp', 0, bossId ? 'L' : rollTier(h, lift)), genPitcher(h, S, 'rp', 0, rollTier(h, lift)), genPitcher(h, S - 2, 'rp', 0, rollTier(h, lift))];
  TAKEN = null;
  ((run.oppSwaps && run.oppSwaps[st]) || []).forEach(sw => { if (sw.idx < 9) lineup[sw.idx] = sw.p; else pitchers[sw.idx - 9] = sw.p; });
  const T2 = TEAMS[run.team];
  const label = endless ? 'GAUNTLET ' + (st + 1) + (boss ? ' BOSS' : '') : stageLabel(run, st);
  const where = endless ? (T.lg + ' ' + T.div.toUpperCase()) : st < 8 ? (T.div === T2.div && T.lg === T2.lg ? T.lg + ' ' + T.div.toUpperCase() : LEAGUES[T.lg].toUpperCase()) : stageLabel(run, st);
  return { stage: st, key, label, where, name: teamName(key), city: T.city, nick: T.nick, abbr: key, colors: T.colors, S, quirks, lineup, pitchers, boss, bossId };
}

/* ---------- events between games ---------- */
const EVENTS = {
  scout:   { title: 'A SCOUT CALLS', text: 'A guy in a windbreaker swears he found a kid who can really play. He wants $5 for the tip.' },
  poker:   { title: 'CLUBHOUSE POKER', text: 'The bullpen guys have a card game going. Buy in for $4. Winner takes $9.' },
  mentor:  { title: 'GRIZZLED VETERAN', text: 'A 41-year-old bench coach offers to work with your weakest hitter. Or he\'ll sell you his memoir rights.' },
  hammy:   { title: 'TWEAKED HAMSTRING', text: 'Your fastest hitter felt something pop running out a grounder.' },
  fans:    { title: 'FAN APPRECIATION NIGHT', text: 'The crowd is electric. The owner is in a good mood.' },
  trade:   { title: 'TRADE DEADLINE CALL', text: 'A GM on line two wants your worst hitter. He won\'t say who you\'d get back.' },
  rain:    { title: 'RAIN DELAY', text: 'Three hours of tarp. You can work the pitchers in the cage or work the autograph line.' },
  gum:     { title: 'MYSTERY BUBBLE GUM', text: 'A pack of gum in the dugout has a weird glow. Chewing it feels like a bad idea.' },
  socks:   { title: 'LUCKY SOCKS', text: 'A fan offers you a pair of socks that haven\'t been washed since 2004. Supposedly lucky. $7.' },
  dogs:    { title: 'DOLLAR DOG NIGHT', text: 'The whole lineup wants to hit the concourse before the game.' },
};
function eventChoices(run) {
  const e = run.event; if (!e) return [];
  const g = run.gold;
  switch (e.id) {
    case 'scout':  return [{ label: 'PAY $5', desc: 'Sign a Rare or Legendary prospect', ok: g >= 5 }, { label: 'HANG UP', desc: 'Nothing happens', ok: true }];
    case 'poker':  return [{ label: 'BUY IN $4', desc: '50%: win $9. 50%: lose it', ok: g >= 4 }, { label: 'GO TO BED', desc: 'Nothing happens', ok: true }];
    case 'mentor': return [{ label: 'TAKE THE LESSONS', desc: 'Weakest hitter: +6 CON, +6 EYE', ok: true }, { label: 'BUY THE MEMOIR', desc: '+$4', ok: true }];
    case 'hammy':  return [{ label: 'PLAY THROUGH IT', desc: 'Fastest hitter: -8 SPD for good', ok: true }, { label: 'PAY THE TRAINER', desc: '-$3, no harm done', ok: g >= 3 }];
    case 'fans':   return [{ label: 'PASS THE HAT', desc: '+$5', ok: true }, { label: 'FEED OFF IT', desc: '+1 CLUTCH every game, rest of the run', ok: true }];
    case 'trade':  return [{ label: 'MAKE THE DEAL', desc: 'Worst hitter for a mystery player', ok: true }, { label: 'HANG UP', desc: 'Nothing happens', ok: true }];
    case 'rain':   return [{ label: 'CAGE WORK', desc: '+4 STF to every pitcher', ok: true }, { label: 'SIGN AUTOGRAPHS', desc: '+$3', ok: true }];
    case 'gum':    return [{ label: 'CHEW IT', desc: 'Random relic. Next opponent gets an extra trick', ok: true }, { label: 'TOSS IT', desc: 'Nothing happens', ok: true }];
    case 'socks':  return [{ label: 'BUY THE SOCKS $7', desc: '+1 loss allowed this run', ok: g >= 7 }, { label: 'NO THANKS', desc: 'Nothing happens', ok: true }];
    case 'dogs':   return [{ label: 'LET THEM EAT', desc: 'Every hitter +3 POW, -3 SPD', ok: true }, { label: 'SALAD BAR', desc: 'Every hitter +2 EYE', ok: true }];
  }
  return [];
}
function maybeEvent(run) {
  if (run.done || run.stage - run.lastEventStage < 2 || run.stage < 1) return;
  const h = run;
  if (!chance(h, 0.45)) return;
  run.event = { id: pick(h, Object.keys(EVENTS)) };
  run.lastEventStage = run.stage;
}
const worst = arr => arr.reduce((a, p) => (ovr(p) < ovr(a) ? p : a), arr[0]);
function resolveEvent(run, idx) {
  const e = run.event; if (!e) return null;
  const ch = eventChoices(run)[idx]; if (!ch || !ch.ok) return null;
  const h = run; let text = '', give = null;
  const lu = run.lineup;
  switch (e.id) {
    case 'scout':
      if (idx === 0) {
        run.gold -= 5; TAKEN = rosterNames(run);
        const tier = chance(h, 0.2) ? 'L' : 'R', q = stageQuality(run.stage) - 2;
        const p = chance(h, 0.6) ? genBatter(h, q, null, 0.6, tier) : genPitcher(h, q, chance(h, 0.5) ? 'sp' : 'rp', 0.6, tier);
        TAKEN = null; give = { t: p.kind === 'bat' ? 'bat' : 'pit', p };
        text = 'The kid is legit: ' + p.name + ' (' + TIERS[tier].name + ').';
      } else text = 'You hang up. Probably fine.';
      break;
    case 'poker':
      if (idx === 0) { run.gold -= 4; if (chance(h, 0.5)) { run.gold += 9; text = 'Full house. You rake in $9.'; } else text = 'The backup catcher had aces. You\'re out $4.'; }
      else text = 'Smart. Early night.';
      break;
    case 'mentor':
      if (idx === 0) { const p = worst(lu); p.con = Math.min(99, p.con + 6); p.eye = Math.min(99, p.eye + 6); text = p.name + ' looks like a new hitter. +6 CON, +6 EYE.'; }
      else { run.gold += 4; text = 'The memoir is terrible. +$4.'; }
      break;
    case 'hammy': {
      const p = lu.reduce((a, q) => (q.spd > a.spd ? q : a), lu[0]);
      if (idx === 0) { p.spd = Math.max(20, p.spd - 8); text = p.name + ' plays through it. -8 SPD.'; }
      else { run.gold -= 3; text = 'The trainer works a miracle. ' + p.name + ' is fine.'; }
      break;
    }
    case 'fans':
      if (idx === 0) { run.gold += 5; text = 'The hat comes back heavy. +$5.'; }
      else { run.clutchBonus = (run.clutchBonus || 0) + 1; text = 'The dugout is buzzing. +1 CLUTCH every game.'; }
      break;
    case 'trade':
      if (idx === 0) {
        const old = worst(lu), slot = lu.indexOf(old);
        TAKEN = rosterNames(run);
        const r = rf(h), tier = r < 0.3 ? 'C' : r < 0.7 ? 'U' : r < 0.94 ? 'R' : 'L';
        const p = genBatter(h, stageQuality(run.stage), null, 0.4, tier); TAKEN = null;
        lu[slot] = p; text = old.name + ' is gone. Say hello to ' + p.name + ' (' + TIERS[tier].name + ').';
        e.gotPlayer = p;
      } else text = 'You hang up. Loyalty.';
      break;
    case 'rain':
      if (idx === 0) { run.pitchers.forEach(p => { p.stf = Math.min(99, p.stf + 4); }); text = 'Bullpen sessions in the cage. +4 STF to every pitcher.'; }
      else { run.gold += 3; text = 'Sharpies out. +$3.'; }
      break;
    case 'gum':
      if (idx === 0) {
        const pool = Object.keys(RELICS).filter(k => !run.relics.includes(k) && relicPack(k) <= (cfgOf(run).relicPack || 0));
        run.nextQuirk = 1;
        if (pool.length) { const id = pick(h, pool); give = { t: 'relic', id }; text = 'You feel... different. Found: ' + RELICS[id].name + '. The next team heard about it, though.'; }
        else { run.gold += 4; text = 'Nothing happens, except $4 falls out of the wrapper.'; }
      } else text = 'Into the trash it goes.';
      break;
    case 'socks':
      if (idx === 0) { run.gold -= 7; run.lossBonus = (run.lossBonus || 0) + 1; text = 'They smell like victory. You can lose one more game.'; }
      else text = 'Your nose thanks you.';
      break;
    case 'dogs':
      if (idx === 0) { lu.forEach(p => { p.pow = Math.min(99, p.pow + 3); p.spd = Math.max(20, p.spd - 3); }); text = 'Thirty-six hot dogs later: +3 POW, -3 SPD.'; }
      else { lu.forEach(p => { p.eye = Math.min(99, p.eye + 2); }); text = 'Clean living. +2 EYE.'; }
      break;
  }
  run.event = null;
  return { text, give };
}

function makeTraining(h, n) { return sample(h, Object.keys(TRAINING), n); }
function rosterNames(run) { return new Set(run.lineup.concat(run.pitchers).map(p => p.name)); }
function makeShop(run) {
  const h = run;
  TAKEN = rosterNames(run); POOL = run.namePool || null;
  const q = stageQuality(run.stage);
  const owned = new Set(run.relics);
  const relicPool = Object.keys(RELICS).filter(k => !owned.has(k) && relicPack(k) <= (cfgOf(run).relicPack || 0));
  const items = [];
  const cfg = cfgOf(run), up = cfg.priceUp, lift = Math.min(1, run.stage / 16), lx = cfg.legendX;
  const lift2 = Math.min(1, lift + (cfg.scoutLift || 0));
  // the shop starts small and grows: 1 relic, 1 player, 1 training early; more as the season goes
  const nRelic = run.stage >= 6 ? 2 : 1, nPlayer = 1 + (run.stage >= 3 ? 1 : 0) + (cfg.shopBonus || 0), nTrain = run.stage >= 4 ? 2 : 1;
  sample(h, relicPool, nRelic).forEach(id => items.push({ t: 'relic', id, price: RELICS[id].price + up }));
  for (let i = 0; i < nPlayer; i++) {
    const p2 = i === 0 || chance(h, 0.5) ? genBatter(h, q, null, 0.4, rollTier(h, lift2, lx)) : genPitcher(h, q, chance(h, 0.45) ? 'sp' : 'rp', 0.5, rollTier(h, lift2, lx));
    items.push({ t: p2.kind === 'bat' ? 'bat' : 'pit', p: p2, price: playerPrice(p2, run.stage) + up });
  }
  const lockedPlays = Object.keys(PLAYS).filter(k => run.plays && !run.plays.includes(k));
  if (lockedPlays.length) { const id = pick(h, lockedPlays); items.push({ t: 'play', id, price: 4 + up }); }
  makeTraining(h, nTrain).forEach(id => items.push({ t: 'train', id, price: 3 + up }));
  TAKEN = null; POOL = null;
  return items;
}
function makeRewards(run) {
  const h = run;
  TAKEN = rosterNames(run); POOL = run.namePool || null;
  const q = stageQuality(run.stage) + 2;
  const cfg = cfgOf(run), lift = Math.min(1, 0.25 + run.stage / 14), lx = cfg.legendX;
  const owned = new Set(run.relics);
  const pool = Object.keys(RELICS).filter(k => !owned.has(k) && relicPack(k) <= (cfg.relicPack || 0));
  const out = [];
  if (pool.length) out.push({ t: 'relic', id: pick(h, pool) });
  const b = genBatter(h, q, null, 0.55, rollTier(h, lift, lx)); out.push({ t: 'bat', p: b });
  const pp = genPitcher(h, q, chance(h, 0.4) ? 'sp' : 'rp', 0.6, rollTier(h, lift, lx));
  const mix = [{ t: 'pit', p: pp }, { t: 'train', id: pick(h, Object.keys(TRAINING)), free: true }, { t: 'gold', amt: 6 }];
  const lockedPlays = Object.keys(PLAYS).filter(k => run.plays && !run.plays.includes(k));
  if (lockedPlays.length) { mix.push({ t: 'play', id: pick(h, lockedPlays) }); mix.push({ t: 'play', id: pick(h, lockedPlays) }); }
  out.push(pick(h, mix));
  TAKEN = null; POOL = null;
  return out.slice(0, cfg.rewardN);
}
function rerollShop(run) {
  const cost = 2 + run.rerolls;
  if (run.gold < cost) return false;
  run.gold -= cost; run.rerolls++;
  run.shop = makeShop(run);
  return true;
}
/* slot index: 0-8 lineup, 9-11 pitchers */
function playerAt(run, slot) { return slot < 9 ? run.lineup[slot] : run.pitchers[slot - 9]; }
function placePlayer(run, p, slot) {
  if (p.kind === 'bat' && slot < 9) run.lineup[slot] = p;
  else if (p.kind !== 'bat' && slot >= 9) run.pitchers[slot - 9] = p;
  else return false;
  return true;
}
function applyTraining(run, trId, slot) {
  const tr = TRAINING[trId]; const p = playerAt(run, slot);
  if (!p || (tr.kind === 'bat') !== (p.kind === 'bat')) return false;
  p[tr.stat] = Math.min(tr.stat === 'sta' ? 40 : 99, p[tr.stat] + tr.amt);
  return true;
}
function relicSlots(run) { return Math.min(5, 2 + Math.floor(run.wins / 3) + (cfgOf(run).slotBonus || 0)); }
function addRelic(run, id, replaceIdx) {
  if (run.relics.length < relicSlots(run)) run.relics.push(id);
  else if (replaceIdx != null && replaceIdx >= 0) run.relics[replaceIdx] = id;
  else return false;
  return true;
}

/* ---------- game ---------- */
function newGame(run) {
  const opp = oppFor(run);
  const G = {
    rs: hashSeed(run.seed, 5000 + run.stage * 17 + run.wins * 3 + run.losses),
    stage: run.stage, oppName: opp.name, oppNick: opp.nick, oppAbbr: opp.abbr, oppColors: opp.colors, oppLabel: opp.label, boss: opp.boss,
    usAbbr: run.team, usColors: TEAMS[run.team].colors,
    plays: run.plays ? run.plays.slice() : null, rpStf: cfgOf(run).rpStf || 0,
    bossId: opp.bossId || null, reads: { bat: {}, pit: {} }, signsUsed: false, bossIntro: false,
    inn: cfgOf(run).startInn || START_INN, half: 'top', outs: 0, bases: [null, null, null], score: { us: 0, opp: 0 },
    line: { us: Array((cfgOf(run).startInn || START_INN) - 1).fill(0), opp: Array((cfgOf(run).startInn || START_INN) - 1).fill(0) },
    len: cfgOf(run).gameLen, over: false, winner: null, walkoff: false,
    gm: { hr: cfgOf(run).hr, sta: cfgOf(run).sta, pow: cfgOf(run).pow, spd: cfgOf(run).spd, stf: cfgOf(run).stf },
    clutch: cfgOf(run).clutch + (run.clutchBonus || 0) + (run.relics.includes('seeds') ? 2 : 0), used: {},
    log: [], pa: 0,
    t: {
      us:  { lineup: run.lineup.map(p => Object.assign({}, p)), pitchers: run.pitchers.map(p => Object.assign({}, p)), pi: 0, idx: 0, bf: {}, relics: run.relics.slice(), quirks: [] },
      opp: { lineup: opp.lineup, pitchers: opp.pitchers, pi: 0, idx: 0, bf: {}, relics: [], quirks: opp.quirks },
    },
    stats: { hr: 0, runs: 0, steals: 0, k: 0 },
  };
  run.nextQuirk = 0;
  // six innings already happened: starters are tired, and the order is somewhere mid-lineup
  const hp = { rs: hashSeed(G.rs, 61) };
  ['us', 'opp'].forEach(k => {
    const t = G.t[k], sp = t.pitchers[0];
    t.bf[sp.id] = Math.max(0, sp.sta + (sp.trait === 'workhorse' ? 4 : 0) - ri(hp, 2, 6));
    t.idx = ri(hp, 0, 8);
  });
  startHalf(G);
  return G;
}
const other = s => (s === 'us' ? 'opp' : 'us');
const curPitcher = (G, key) => G.t[key].pitchers[G.t[key].pi];
function gasOf(G, key, p) {
  const t = G.t[key];
  let st = p.sta + (p.trait === 'workhorse' ? 4 : 0) + (p.kind === 'rp' && t.relics.includes('bullpen_cart') ? 4 : 0) + ((G.gm && G.gm.sta) || 0);
  return st - (t.bf[p.id] || 0);
}
function teamMods(G, key, role, x) {
  const m = { con: 0, pow: 0, eye: 0, spd: 0, def: 0, stf: 0, ctl: 0, hr: 1, k: 0, bb: 0, hit: 0, steal: 0, oppStf: 0 };
  const t = G.t[key];
  for (const id of t.relics) { const r = RELICS[id]; if (r && r.fx) r.fx(m, role, x); }
  for (const q of t.quirks) QUIRKS[q].fx(m, role, x);
  if (key === 'us' && role === 'pit' && G.rpStf && x.pitcher && x.pitcher.kind === 'rp') m.stf += G.rpStf;
  const gm = G.gm;
  if (gm) { if (role === 'bat') { m.pow += gm.pow; m.spd += gm.spd; m.hr *= gm.hr; } else m.stf += gm.stf; }
  return m;
}

const APPR_BAT = {
  normal:  { name: 'NORMAL',  hint: 'Balanced' },
  contact: { name: 'CONTACT', hint: 'Fewer K, sac flies' },
  power:   { name: 'POWER',   hint: 'More HR, more K' },
  patient: { name: 'PATIENT', hint: 'Work a walk' },
};
const APPR_PIT = {
  normal: { name: 'NORMAL', hint: 'Balanced' },
  attack: { name: 'ATTACK', hint: 'More K, more HR' },
  nibble: { name: 'NIBBLE', hint: 'Walks, soft contact' },
};

function ctxFor(G, side, o) {
  const oth = other(side);
  const bt = G.t[side], ft = G.t[oth];
  const b = bt.lineup[bt.idx % 9], p = ft.pitchers[ft.pi];
  const risp = !!(G.bases[1] || G.bases[2]);
  const bx = { inn: G.inn, risp, batter: b, pitcher: p, trail: G.score[side] < G.score[oth] };
  const fx = { inn: G.inn, risp, batter: b, pitcher: p, trail: G.score[oth] < G.score[side] };
  return { oth, bt, ft, b, p, risp, bm: teamMods(G, side, 'bat', bx), fm: teamMods(G, oth, 'pit', fx) };
}
function probs(G, side, o) {
  o = o || {};
  const c = ctxFor(G, side, o);
  const { b, p, bm, fm } = c;
  let con = b.con + bm.con, pow = b.pow + bm.pow, eye = b.eye + bm.eye;
  let hr = bm.hr, k = bm.k, bb = bm.bb, hit = bm.hit, dbl = 0;
  if (b.trait === 'clutch' && c.risp) { con += 10; pow += 10; }
  if (b.trait === 'slugger') hr *= 1.3;
  if (b.trait === 'eagle') { bb += 0.04; k -= 0.03; }
  if (b.trait === 'contact') k -= 0.04;
  const gas = gasOf(G, c.oth, p);
  const fat = gas < 0 ? -gas * 3.5 : 0;
  let stf = p.stf + fm.stf + bm.oppStf - fat, ctl = p.ctl + fm.ctl - fat * 0.8;
  if (p.trait === 'closer' && G.inn >= 9) stf += 10;
  if (p.trait === 'fireball') k += 0.04;
  if (p.trait === 'sinker') hr *= 0.8;
  if (o.clutch) {
    if (side === 'us') { con += 18; pow += 18; eye += 8; } else { stf += 18; ctl += 10; }
  }
  const ap = o.appr || 'normal';
  if (side === 'us') {
    if (ap === 'contact') { con += 8; k -= 0.05; hr *= 0.7; }
    if (ap === 'power')   { pow += 12; k += 0.06; hit -= 0.02; hr *= 1.4; dbl += 0.05; }
    if (ap === 'patient') { bb += 0.07; k -= 0.01; hit -= 0.03; }
  } else {
    if (ap === 'attack') { k += 0.03; bb -= 0.03; hit += 0.02; hr *= 1.25; }
    if (ap === 'nibble') { k -= 0.015; bb += 0.06; hit -= 0.03; hr *= 0.75; }
    if (o.infield) hit += 0.04;
  }
  if (G.bossId === 'signs' && !o.clutch) {
    if (side === 'us') { const r = readsOf(G, 'bat', ap); k += 0.035 * r; hit -= 0.025 * r; }
    else { const r = readsOf(G, 'pit', ap); hit += 0.025 * r; hr *= 1 + 0.12 * r; }
  }
  const def = c.ft.lineup.reduce((a, q) => a + q.def, 0) / 9 + fm.def;
  const K = clamp(0.205 + (stf - con) / 260 + k, 0.05, 0.45);
  const BB = clamp(0.085 + (eye - ctl) / 420 + bb, 0.015, 0.26);
  const hitBIP = clamp(0.30 + (con - 50) / 330 + (pow - 50) / 800 - (def - 50) / 320 - (stf - 50) / 800 + hit, 0.14, 0.52);
  const spd = b.spd + bm.spd + (b.trait === 'burner' ? 12 : 0);
  let hrS = clamp((0.10 + (pow - 50) / 230) * hr, 0.02, 0.6);
  const triS = clamp(0.035 + (spd - 50) / 700, 0.01, 0.08);
  const dblS = clamp(0.22 + (pow - 50) / 450 + dbl, 0.12, 0.4);
  const pHit = (1 - K - BB) * hitBIP;
  return { K, BB, hitBIP, hrS, triS, dblS, pHit, pHR: pHit * hrS, pK: K, pBB: BB, gas, sinker: p.trait === 'sinker', bm, fm, b, p, risp: c.risp };
}
function rollOutcome(G, pr) {
  const r = rf(G);
  if (r < pr.K) return 'K';
  if (r < pr.K + pr.BB) return 'BB';
  const rest = (r - pr.K - pr.BB) / (1 - pr.K - pr.BB);
  if (rest < pr.hitBIP) {
    const h = rf(G);
    if (h < pr.hrS) return 'HR';
    if (h < pr.hrS + pr.triS) return '3B';
    if (h < pr.hrS + pr.triS + pr.dblS) return '2B';
    return '1B';
  }
  return rf(G) < (pr.sinker ? 0.7 : 0.55) ? 'GO' : 'FO';
}
const isOut = c => c === 'K' || c === 'GO' || c === 'FO';

function spdOf(r, bm) { return clamp((r.p.spd + bm.spd + (r.p.trait === 'burner' ? 12 : 0) - 50) / 300, -0.15, 0.25); }

/* apply an outcome to the bases. Returns {runs, outs, moves, nb} */
function applyOutcome(G, code, b, bm, o) {
  const R = G.bases, outs0 = G.outs;
  const nb = [null, null, null], moves = [];
  let runs = 0, outs = 0;
  const sp = r => spdOf(r, bm);
  const score = (r, from) => { runs++; moves.push({ p: r.p, from, to: 4 }); };
  const mv = (r, from, to) => moves.push({ p: r.p, from, to });
  const out = (r, from, at) => { outs++; moves.push({ p: r.p, from, to: -1, at }); };
  const me = { p: b };
  const [r1, r2, r3] = R;
  switch (code) {
    case 'K': out(me, 0, 0); break;
    case 'BB': {
      if (r1 && r2 && r3) score(r3, 3);
      if (r1 && r2) { nb[2] = r2; mv(r2, 2, 3); } else if (r2) nb[1] = r2;
      if (r3 && !(r1 && r2)) nb[2] = r3;
      if (r1) { nb[1] = r1; mv(r1, 1, 2); }
      nb[0] = me; mv(me, 0, 1); break;
    }
    case '1B': {
      if (r3) score(r3, 3);
      if (r2) { if (chance(G, 0.55 + sp(r2))) score(r2, 2); else { nb[2] = r2; mv(r2, 2, 3); } }
      if (r1) { if (!nb[2] && chance(G, 0.22 + sp(r1))) { nb[2] = r1; mv(r1, 1, 3); } else { nb[1] = r1; mv(r1, 1, 2); } }
      nb[0] = me; mv(me, 0, 1); break;
    }
    case '2B': {
      if (r3) score(r3, 3);
      if (r2) score(r2, 2);
      if (r1) { if (chance(G, 0.40 + sp(r1))) score(r1, 1); else { nb[2] = r1; mv(r1, 1, 3); } }
      nb[1] = me; mv(me, 0, 2); break;
    }
    case '3B': {
      [r3, r2, r1].forEach((r, i) => { if (r) score(r, 3 - i); });
      nb[2] = me; mv(me, 0, 3); break;
    }
    case 'HR': {
      [r3, r2, r1].forEach((r, i) => { if (r) score(r, 3 - i); });
      score(me, 0); break;
    }
    case 'GO': {
      out(me, 0, 1);
      let dp = false;
      if (r1 && outs0 < 2) {
        const dpP = clamp(0.40 + (o.dpBonus || 0) - sp(me) * 0.9, 0.1, 0.65);
        if (chance(G, dpP)) { dp = true; out(r1, 1, 2); }
      }
      if (dp) {
        if (r3) { if (outs0 === 0 && chance(G, 0.7)) score(r3, 3); else nb[2] = r3; }
        if (r2) { nb[2] = nb[2] || r2; if (nb[2] === r2) mv(r2, 2, 3); else nb[1] = r2; }
        break;
      }
      // no double play: forced runners advance
      if (r1) { nb[1] = r1; mv(r1, 1, 2); if (r2) { nb[2] = r2; mv(r2, 2, 3); if (r3) { if (outs0 < 2) score(r3, 3); else nb[2] = nb[2]; } } }
      if (r3 && !(r1 && r2)) {
        if (outs0 < 2) {
          const ps = o.infieldIn ? 0.18 : 0.62;
          if (chance(G, ps)) score(r3, 3);
          else if (o.infieldIn && chance(G, 0.35)) out(r3, 3, 4);
          else nb[2] = r3;
        } else nb[2] = r3;
      }
      if (r2 && !r1 && !nb[2]) {
        if (outs0 < 2 && chance(G, 0.45 + sp(r2))) { nb[2] = r2; mv(r2, 2, 3); } else nb[1] = r2;
      } else if (r2 && !r1 && nb[2]) nb[1] = r2;
      break;
    }
    case 'FO': {
      out(me, 0, 0);
      if (r3) { if (outs0 < 2 && chance(G, 0.5 + (o.sacBonus || 0))) score(r3, 3); else nb[2] = r3; }
      if (r2) { if (!nb[2] && outs0 < 2 && chance(G, 0.18 + sp(r2))) { nb[2] = r2; mv(r2, 2, 3); } else nb[1] = r2; }
      if (r1) nb[0] = r1;
      break;
    }
  }
  // fix: runner on first after FO should stay on first (index 0)
  if (code === 'FO' && r1) { /* nb[0] already r1 */ }
  // inning-ending out by the batter: no runs
  if (outs0 + outs >= 3 && (code === 'K' || code === 'FO' || (code === 'GO'))) runs = 0;
  return { runs, outs, moves, nb };
}

function pushLine(G, side, runs) {
  const i = G.inn - 1;
  G.line[side][i] = (G.line[side][i] || 0) + runs;
}

function startHalf(G) {
  const side = G.half === 'top' ? 'opp' : 'us';
  if (G.line[side][G.inn - 1] == null) G.line[side][G.inn - 1] = 0;
  G.outs = 0; G.bases = [null, null, null];
  if (G.inn > G.len) { // ghost runner
    const t = G.t[side];
    G.bases[1] = { p: t.lineup[(t.idx + 8) % 9] };
  }
}
function endHalf(G) {
  G.bases = [null, null, null]; G.outs = 0;
  if (G.half === 'top') {
    G.half = 'bot';
    if (G.inn >= G.len && G.score.us > G.score.opp) { G.over = true; G.winner = 'us'; G.line.us[G.inn - 1] = 'X'; return; }
  } else {
    if (G.inn >= G.len && G.score.us !== G.score.opp) { G.over = true; G.winner = G.score.us > G.score.opp ? 'us' : 'opp'; return; }
    G.inn++; G.half = 'top';
  }
  startHalf(G);
}

/* opponent bullpen AI */
function oppAI(G) {
  const t = G.t.opp;
  const p = t.pitchers[t.pi];
  if (t.pi < t.pitchers.length - 1) {
    const gas = gasOf(G, 'opp', p);
    if (gas <= 0 || (p.kind === 'sp' && G.inn >= 8 && gas <= 2)) {
      t.pi++;
      return { type: 'pull', text: 'The ' + (G.oppNick || G.oppName) + ' bring in ' + t.pitchers[t.pi].name + '.', again: true, side: 'us', runs: 0, outs: 0, score: { us: G.score.us, opp: G.score.opp }, basesNow: G.bases.slice(), outsNow: G.outs };
    }
  }
  return null;
}

/* ---------- PA lifecycle ---------- */
function mode(G) { return G.mode || 'key'; }
function nextPA(G, settingsMode) {
  const side = G.half === 'top' ? 'opp' : 'us';
  const bt = G.t[side];
  const b = bt.lineup[bt.idx % 9];
  const pit = curPitcher(G, other(side));
  const pa = { side, batter: b, pitcher: pit, gas: gasOf(G, other(side), pit), bases: G.bases.slice(), outs: G.outs, decision: false };
  if (side === 'us') {
    const ai = oppAI(G);
    if (ai) { pa.auto = ai; return pa; }
    const pitcher2 = curPitcher(G, 'opp'); pa.pitcher = pitcher2; pa.gas = gasOf(G, 'opp', pitcher2);
    const runners = !!(G.bases[0] || G.bases[1] || G.bases[2]);
    pa.decision = settingsMode === 'full' || (settingsMode === 'key' && runners);
    pa.canSteal = stealTarget(G) >= 0 && hasPlay(G, 'steal');
    pa.canBunt = (G.bases[0] || G.bases[1]) && !G.bases[2] && G.outs < 2 && hasPlay(G, 'bunt');
    pa.canClutch = G.clutch > 0;
    if (G.bossId && settingsMode !== 'auto') pa.decision = true;
    pa.canSigns = G.bossId === 'signs' && !G.signsUsed && Object.values(G.reads.bat).concat(Object.values(G.reads.pit)).some(v => v > 0);
  } else {
    const runners = !!(G.bases[0] || G.bases[1] || G.bases[2]);
    const tired = pa.gas <= 0;
    pa.decision = settingsMode === 'full' || (settingsMode === 'key' && (runners || tired)) || (settingsMode === 'auto' && false);
    pa.canPull = G.t.us.pi < G.t.us.pitchers.length - 1;
    pa.canIBB = !G.bases[0] && (G.bases[1] || G.bases[2]) && hasPlay(G, 'ibb');
    pa.canInfield = !!G.bases[2] && G.outs < 2 && hasPlay(G, 'infield');
    pa.canClutch = G.clutch > 0;
    if (settingsMode === 'auto' && tired && pa.canPull && pa.gas < -2) pa.autoPull = true;
    if (G.bossId && settingsMode !== 'auto') pa.decision = true;
    pa.canSigns = G.bossId === 'signs' && !G.signsUsed && Object.values(G.reads.bat).concat(Object.values(G.reads.pit)).some(v => v > 0);
  }
  return pa;
}

function stealTarget(G) {
  // returns index (0 or 1) of lead runner that can steal, or -1
  if (G.bases[1] && !G.bases[2]) return 1;
  if (G.bases[0] && !G.bases[1]) return 0;
  return -1;
}
function stealProb(G) {
  const i = stealTarget(G); if (i < 0) return 0;
  const bt = G.t.us, ft = G.t.opp;
  const c = ctxFor(G, 'us', {});
  const r = G.bases[i];
  const def = ft.lineup.reduce((a, q) => a + q.def, 0) / 9 + c.fm.def;
  const s = r.p.spd + c.bm.spd + (r.p.trait === 'burner' ? 12 : 0);
  return clamp(0.60 + (s - 50) / 120 - (def - 50) / 250 + c.bm.steal - (i === 1 ? 0.12 : 0), 0.15, 0.95);
}
function buntProb(G) {
  const c = ctxFor(G, 'us', {});
  const b = c.b;
  return clamp(0.68 + (b.spd + c.bm.spd - 50) / 300 + (b.con - 50) / 400 + c.bm.steal, 0.4, 0.95);
}

function finishPA(G, side, ev, b, p, consumed) {
  ev.side = side; ev.batter = b; ev.pitcher = p;
  if (consumed) { G.t[side].idx++; const pk = other(side); G.t[pk].bf[p.id] = (G.t[pk].bf[p.id] || 0) + 1; G.pa++; }
  if (ev.runs) {
    G.score[side] += ev.runs; pushLine(G, side, ev.runs);
    if (side === 'us') G.stats.runs += ev.runs;
  }
  G.outs += ev.outs || 0;
  ev.score = { us: G.score.us, opp: G.score.opp };
  // walk-off
  if (side === 'us' && G.half === 'bot' && G.inn >= G.len && G.score.us > G.score.opp) {
    G.over = true; G.winner = 'us'; G.walkoff = true; ev.halfEnded = false; ev.gameOver = true; ev.walkoff = true;
    ev.outsNow = G.outs; ev.basesNow = G.bases.slice();
    return ev;
  }
  if (G.outs >= 3) { ev.halfEnded = true; endHalf(G); ev.gameOver = G.over; ev.outsNow = 3; }
  else { ev.outsNow = G.outs; }
  ev.basesNow = G.bases.slice();
  ev.inn = G.inn; ev.half = G.half;
  if (G.log.length > 50) G.log.shift();
  G.log.push(ev.text);
  return ev;
}

function describe(code, b, side, extra) {
  const n = b.name;
  switch (code) {
    case 'K': return n + ' strikes out.';
    case 'BB': return n + ' draws a walk.';
    case '1B': return n + ' singles.';
    case '2B': return n + ' doubles!';
    case '3B': return n + ' triples!!';
    case 'HR': return n + ' goes DEEP! Home run!';
    case 'GO': return n + ' grounds out.';
    case 'FO': return n + ' flies out.';
  }
  return '';
}

/* resolve: act = {type:'swing'|'pitch', appr, clutch, infield} | {type:'steal'} | {type:'bunt'} | {type:'ibb'} | {type:'pull'} */
function resolve(G, pa, act) {
  if (pa.auto) return pa.auto;
  const side = pa.side;
  const b = pa.batter, p = pa.pitcher;
  act = act || { type: side === 'us' ? 'swing' : 'pitch', appr: 'normal' };
  if (act.clutch) { if (G.clutch <= 0) act.clutch = false; }
  const o = { appr: act.appr || 'normal', clutch: !!act.clutch, infield: !!act.infield };

  if (act.type === 'pull' || pa.autoPull) {
    const t = G.t.us;
    if (t.pi < t.pitchers.length - 1) {
      t.pi++;
      const ev = { type: 'pull', again: true, text: 'Pitching change: ' + t.pitchers[t.pi].name + ' takes the mound.', runs: 0, outs: 0, side, batter: b, pitcher: t.pitchers[t.pi], score: { us: G.score.us, opp: G.score.opp }, basesNow: G.bases.slice(), outsNow: G.outs };
      return ev;
    }
  }

  if (act.type === 'signs' && G.bossId === 'signs' && !G.signsUsed) {
    G.signsUsed = true; G.reads = { bat: {}, pit: {} };
    const text = 'You change every sign. Their dugout is lost again.';
    G.log.push(text);
    return { type: 'signs', again: true, text, runs: 0, outs: 0, moves: [], side, batter: b, pitcher: p, score: { us: G.score.us, opp: G.score.opp }, basesNow: G.bases.slice(), outsNow: G.outs };
  }

  if (act.type === 'steal' && side === 'us') {
    const i = stealTarget(G);
    if (i >= 0) {
      const pr = stealProb(G);
      const r = G.bases[i];
      const ok = chance(G, pr);
      const ev = { type: 'steal', again: true, runs: 0, outs: 0, moves: [], text: '' };
      if (ok) {
        G.bases[i] = null; G.bases[i + 1] = r;
        ev.moves.push({ p: r.p, from: i + 1, to: i + 2 });
        ev.text = r.p.name + ' steals ' + (i === 0 ? 'second!' : 'third!');
        G.stats.steals++;
        ev.res = 'safe';
      } else {
        G.bases[i] = null;
        ev.moves.push({ p: r.p, from: i + 1, to: -1, at: i + 2 });
        ev.text = r.p.name + ' is caught stealing!';
        ev.outs = 1; ev.res = 'out';
        G.outs += 1;
      }
      ev.side = side; ev.batter = b; ev.pitcher = p; ev.score = { us: G.score.us, opp: G.score.opp };
      if (G.outs >= 3) { ev.halfEnded = true; endHalf(G); ev.gameOver = G.over; ev.outsNow = 3; ev.outs = 0; ev.moves = ev.moves; }
      else ev.outsNow = G.outs;
      ev.basesNow = G.bases.slice(); ev.inn = G.inn; ev.half = G.half;
      G.log.push(ev.text);
      return ev;
    }
  }

  if (act.type === 'clutchOnly') return null;

  if (act.type === 'bunt' && side === 'us') {
    const c = ctxFor(G, 'us', o);
    const bm = c.bm;
    const ps = buntProb(G);
    const ev = { type: 'bunt', runs: 0, outs: 0, moves: [], ball: 'bunt' };
    const [r1, r2] = G.bases;
    const nb = [null, null, null];
    const roll = rf(G);
    const hitP = 0.05 + spdOf({ p: b }, bm) * 0.5;
    if (roll < hitP) {
      ev.code = '1B'; ev.text = b.name + ' beats out a bunt single!';
      if (r2) { nb[2] = r2; ev.moves.push({ p: r2.p, from: 2, to: 3 }); }
      if (r1) { nb[1] = r1; ev.moves.push({ p: r1.p, from: 1, to: 2 }); }
      nb[0] = { p: b }; ev.moves.push({ p: b, from: 0, to: 1 });
    } else if (roll < hitP + ps * (1 - hitP)) {
      ev.code = 'SAC'; ev.text = b.name + ' lays down the sacrifice.';
      ev.outs = 1; ev.moves.push({ p: b, from: 0, to: -1, at: 1 });
      if (r2) { nb[2] = r2; ev.moves.push({ p: r2.p, from: 2, to: 3 }); }
      if (r1) { nb[1] = r1; ev.moves.push({ p: r1.p, from: 1, to: 2 }); }
    } else if (chance(G, 0.5)) {
      ev.code = 'FO'; ev.text = b.name + ' pops up the bunt.'; ev.outs = 1;
      ev.moves.push({ p: b, from: 0, to: -1, at: 0 });
      nb[0] = r1; nb[1] = r2;
    } else {
      ev.code = 'FC'; ev.text = 'Bunt gone wrong - lead runner is out!'; ev.outs = 1;
      if (r2) { ev.moves.push({ p: r2.p, from: 2, to: -1, at: 3 }); if (r1) { nb[1] = r1; ev.moves.push({ p: r1.p, from: 1, to: 2 }); } }
      else if (r1) { ev.moves.push({ p: r1.p, from: 1, to: -1, at: 2 }); }
      nb[0] = { p: b }; ev.moves.push({ p: b, from: 0, to: 1 });
    }
    G.bases = nb;
    return finishPA(G, 'us', ev, b, p, true);
  }

  if (act.type === 'ibb' && side === 'opp') {
    const c = ctxFor(G, 'opp', {});
    const r = applyOutcome(G, 'BB', b, c.bm, {});
    G.bases = r.nb;
    const ev = { type: 'pa', code: 'BB', text: b.name + ' is intentionally walked.', runs: r.runs, outs: 0, moves: r.moves, ball: 'bb' };
    return finishPA(G, 'opp', ev, b, p, true);
  }

  // normal PA
  if (act.clutch) G.clutch--;
  let pr = probs(G, side, o);
  let code = rollOutcome(G, pr);
  let mull = false;
  if (side === 'us' && isOut(code) && pr.risp && G.t.us.relics.includes('mulligan') && !G.used.mulligan) {
    G.used.mulligan = true; mull = true; code = rollOutcome(G, pr);
  }
  const c = ctxFor(G, side, o);
  const aoo = side === 'us'
    ? { sacBonus: o.appr === 'contact' ? 0.22 : 0 }
    : { infieldIn: o.infield, dpBonus: pr.sinker ? 0.2 : 0 };
  const r = applyOutcome(G, code, b, c.bm, aoo);
  G.bases = r.nb;
  if (code === 'HR' && side === 'us') G.stats.hr++;
  if (code === 'K' && side === 'opp') G.stats.k++;
  let text = describe(code, b, side);
  if (r.runs) text += ' ' + r.runs + (r.runs > 1 ? ' runs score!' : ' run scores!');
  if (code === 'GO' && r.outs === 2) text = b.name + ' grounds into a double play.';
  if (code === 'GO' && r.moves.some(m => m.to === -1 && m.at === 4)) text += ' Cut down at the plate!';
  if (code === 'FO' && r.runs && r.outs === 1) text = b.name + ' hits a sacrifice fly. Run scores!';
  if (mull) text = 'MULLIGAN! ' + text;
  const ball = code === 'K' ? 'k' : code === 'BB' ? 'bb' : code === 'HR' ? 'hr' : code === 'GO' ? 'go' : code === 'FO' ? 'fo' : code === '1B' ? 'single' : code === '2B' ? 'double' : 'triple';
  let read = 0;
  if (G.bossId === 'signs' && act.chosen && !o.clutch) {
    const kind = side === 'us' ? 'bat' : 'pit', R = G.reads[kind];
    Object.keys(side === 'us' ? APPR_BAT : APPR_PIT).forEach(a => { if (a !== o.appr && R[a]) R[a] = Math.max(0, R[a] - 1); });
    R[o.appr] = Math.min(READ_CAP, (R[o.appr] || 0) + 1);
    read = R[o.appr];
    const nm = (side === 'us' ? APPR_BAT : APPR_PIT)[o.appr].name;
    if (read >= 2) text += ' They\'re reading ' + nm + ' (' + read + ').';
  }
  const ev = { type: 'pa', code, text, runs: r.runs, outs: r.outs, moves: r.moves, ball, mulligan: mull, clutch: o.clutch, appr: o.appr, read, prob: { K: pr.K, BB: pr.BB, H: pr.pHit, HR: pr.pHR } };
  return finishPA(G, side, ev, b, p, true);
}

/* odds preview for UI */
function preview(G, side, o) {
  const pr = probs(G, side, o);
  return { K: pr.K, BB: pr.BB, H: pr.pHit, HR: pr.pHR };
}

/* ---------- game -> run bookkeeping ---------- */
function finishGame(run, G) {
  const won = G.winner === 'us';
  run.history.push({ stage: run.stage, opp: G.oppName, us: G.score.us, them: G.score.opp, won });
  run.stats.hr += G.stats.hr; run.stats.runs += G.stats.runs; run.stats.steals += G.stats.steals;
  run.G = null;
  let gold = 0;
  if (won) {
    run.wins++;
    gold = 4 + Math.min(4, Math.floor(run.stage / 3)) + (run.relics.includes('piggy') ? 3 : 0) + cfgOf(run).winGold;
  } else { run.losses++; gold = 2; }
  run.gold += gold;
  const info = { won, gold };
  if (!won && run.losses >= maxLosses(run)) { run.done = true; run.phase = 'over'; return info; }
  run.stage++;
  if (!isEndless(run) && run.stage >= TOTAL_STAGES) { run.done = true; run.champion = true; run.phase = 'over'; return info; }
  run.phase = 'club'; run.rerolls = 0;
  run.rewards = won ? makeRewards(run) : null;
  run.shop = makeShop(run);
  if (run.mode === 'trade') run.trades = makeTradeOffers(run);
  maybeEvent(run);
  return info;
}
function maxLosses(run) { return cfgOf(run).maxLosses + (run.lossBonus || 0); }
function totalStages(run) { return isEndless(run) ? Infinity : TOTAL_STAGES; }
function allPlayers() {
  const out = [];
  ['bat', 'pit'].forEach(k => ['L', 'R', 'U', 'C'].forEach(t => PDB.DB[k][t].forEach(n => out.push({ name: n, kind: k, tier: t }))));
  return out;
}

const api = {
  SEEDS, codeInfo, makeSeedTeam, normCode,
  PLAYS, FRONT_OFFICE, fansFor, relicSlots, relicPack, hasPlay,
  BOSSES, READ_CAP, readsOf, SEASON_LIKE, makeFranchiseTeam, relicChoices, DRAFT_SLOTS, draftRound, tradeValue, acceptOffer, oppTradeVerdict, doOppTrade,
  TEAMS, LEAGUES, teamName, stageLabel, TIERS, MODES, PRESSURE, DAILY_MODS, EVENTS, buildCfg, dailyInfo, eventChoices, resolveEvent, maxLosses, totalStages, allPlayers, rollTier,
  RELICS, QUIRKS, TRAINING, ARCH, BAT_TRAITS, PIT_TRAITS, APPR_BAT, APPR_PIT, POS, STAGE_LABELS, TOTAL_STAGES, MAX_LOSSES, GAME_LEN,
  newDraft, startRun, oppFor, makeShop, makeRewards, rerollShop, placePlayer, applyTraining, addRelic, playerAt, finishGame,
  newGame, nextPA, resolve, preview, stealProb, buntProb, curPitcher, gasOf, ovr, playerPrice,
  rf, ri, pick, chance, hashSeed,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
