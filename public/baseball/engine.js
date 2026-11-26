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
/* Real players, slightly bent. */
const HITTERS = ['Derek Jetter','Ken Griffly Jr.','Barry Bondz','Babe Ruthe','Hank Aron','Willie Mayes','Mickey Mantel','Ted Willians','Joe DiMadgio','Jackie Robinsen','Roberto Clementi','Cal Ripkin Jr.','Tony Gwinn','Wade Boggz','Ozzie Smitt','Rickey Henderzon','Mike Trowt','Mookie Bettz','Aaron Judd','Juan Sotto','Ronald Acunya','Freddie Freedman','Bryce Harpur','Manny Machadoh','Fernando Tatiz Jr.','Vlad Guerrera Jr.','Bobby Whitt Jr.','Julio Rodriguex','Corey Seegar','Jose Altuvay','Francisco Lindar','Pete Alonzo','Paul Goldschmitt','Nolan Arenada','Albert Pujolz','Miguel Cabrero','David Ortez','Manny Ramires','Chipper Jonez','Ichiro Suzaki','Frank Thoma','Jim Thomey','Ryne Sandburg','Ernie Banx','Kirby Puckette','George Brette','Mike Schmitt','Johnny Benchley','Yogi Berrie','Pete Rosey','Reggie Jaxon','Rod Carewe','Joe Morgen','Craig Biggo','Jeff Bagwill','Larry Walkar','Todd Heltin','Buster Posie','Adrian Beltry','Ivan Rodriquez','Joey Vottle','Gunnar Hendersen','Elly De La Cruise','Corbin Carrol','Kyle Tucket','Yordan Alvares','Adley Rutschmann','Rafael Devors','Bo Bichett','Jose Ramirex','Christian Yelick','Andrew McCutchon','Kris Brynt','Anthony Rizzoh','Javy Baes','Matt Olsen','Austin Rilley','Marcus Semian','Cody Bellinjer','Salvador Perezz','Byron Buxtin','Carlos Correra','Trea Turnor','Kyle Schwarbar','J.T. Realmutto','Xander Bogaerds','Dustin Pedroya','Josh Hamiltin','Evan Longorio','Giancarlo Stantin','Pete Crow-Armstrung','Wyatt Langferd','Jackson Chorio','Ketel Marty','Shohei Ohtoni'];
const PITCHERS = ['Josh Smoltz','Greg Matlox','Tom Glovine','Pedro Martinex','Randy Johnstone','Roger Clemmons','Nolan Rayan','Sandy Koufox','Bob Gibsen','Tom Seever','Mariano Riviera','Trevor Hoffmore','Dennis Eckerslee','Clayton Kershew','Justin Verlaine','Max Scherzar','Jacob deGroom','Gerrit Kole','Felix Hernandes','Roy Holliday','CC Sabbathia','Curt Schilly','Johan Santanna','Zack Grienke','David Prize','Chris Sail','Madison Bumgardner','Tim Lincecomb','Corey Kluver','Stephen Strassburger','Aroldis Chapmen','Craig Kimbrow','Billy Wagoner','Jon Lestor','Cole Hammels','Blake Snail','Spencer Stryder','Paul Skeens','Tarik Skubble','Corbin Burns','Shane Bieberman','Walker Bueller','Yoshi Yamamota','Dwight Goodin','Fernando Valenzuelo','Bert Blylevin','Satchel Paage','Cy Youngblood','Orel Hershizer','Jim Palmore','Juan Marichol','Fergie Jenkens','Rollie Fingerz','Goose Gossarge','Kenley Jansin','Josh Haider','Edwin Dias','Kodai Senka','Logan Webber','Zack Wheelor','Aaron Nolo','Framber Valdex','Dylan Ceese'];
let TAKEN = null; // Set of names already on the team being generated
function pickName(h, list) {
  let n = pick(h, list);
  for (let i = 0; TAKEN && TAKEN.has(n) && i < 12; i++) n = pick(h, list);
  if (TAKEN) TAKEN.add(n);
  return n;
}
const FIRST = ['Mo','Tito','Dex','Rudy','Lou','Cal','Jimmy','Hank','Ozzie','Pablo','Nate','Gus','Ty','Wally','Marty','Ike','Felix','Dante','Cruz','Buck','Sal','Rex','Boog','Chuy','Flip','Gabe','Ivan','Kip','Lenny','Milo','Pete','Quincy','Rocco','Stu','Toby','Vic','Walt','Yogi','Zeke','Andre'];
const LAST = ['Vega','Okafor','Lindqvist','Brannigan','Tanaka','Mulligan','Delgado','Kowalski','Nguyen','Abernathy','Castillo','Dubois','Fitch','Gallo','Haverty','Ibarra','Jankowski','Kimura','Lombardi','Moreau','Novak','Ortega','Pruitt','Quigley','Rosario','Sato','Tran','Underhill','Voss','Whitaker','Yoo','Zimmer','Baptiste','Crumb','Dooley','Espinoza','Flanagan','Grizzly','Hobbs','Jones'];
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
  closer:    { name: 'Closer',    desc: '+10 STUFF from the 5th inning on' },
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
  stretch:     { name: '7th Inn. Stretch',price: 7, desc: '+6 CON/POW/EYE from the 5th inning on.',   fx: (m, r, x) => { if (r === 'bat' && x.inn >= 5) { m.con += 6; m.pow += 6; m.eye += 6; } } },
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
const MAX_LOSSES = 3;
const GAME_LEN = 6;

/* ---------- players ---------- */
const newId = h => 'p' + Math.floor(rf(h) * 1e9).toString(36);
function genBatter(h, q, bias, traitP) {
  bias = bias || {};
  const g = k => clamp(Math.round(norm(h, q + (bias[k] || 0), 8)), 20, 99);
  const p = { id: newId(h), kind: 'bat', name: pickName(h, HITTERS), con: g('con'), pow: g('pow'), eye: g('eye'), spd: g('spd'), def: g('def'), trait: null, look: ri(h, 1, 999999) };
  if (chance(h, traitP == null ? 0.22 : traitP)) p.trait = pick(h, Object.keys(BAT_TRAITS));
  return p;
}
function genPitcher(h, q, kind, traitP) {
  const g = (m) => clamp(Math.round(norm(h, m, 8)), 20, 99);
  const p = { id: newId(h), kind, name: pickName(h, PITCHERS), stf: g(q), ctl: g(q), sta: kind === 'sp' ? ri(h, 13, 19) : ri(h, 5, 8), trait: null, look: ri(h, 1, 999999) };
  if (chance(h, traitP == null ? 0.25 : traitP)) {
    const keys = Object.keys(PIT_TRAITS).filter(k => k !== 'closer' || kind === 'rp');
    p.trait = pick(h, keys);
  }
  return p;
}
const ovr = p => p.kind === 'bat'
  ? Math.round((p.con * 1.3 + p.pow * 1.1 + p.eye * 0.8 + p.spd * 0.4 + p.def * 0.4) / 4)
  : Math.round((p.stf * 1.6 + p.ctl * 1.1 + Math.min(99, p.sta * 3.5) * 0.3) / 3);
const playerPrice = p => clamp(Math.round(2 + (ovr(p) - 45) / 3), 3, 13);

/* ---------- run (the roguelite layer) ---------- */
function makeStartTeam(h, key) {
  const a = ARCH[key];
  TAKEN = new Set();
  const lineup = POS.map(() => genBatter(h, 50, a.bias, 0.2));
  const pitchers = [genPitcher(h, 52 + a.pit, 'sp', 0.4), genPitcher(h, 50 + a.pit, 'rp', 0.3), genPitcher(h, 48 + a.pit, 'rp', 0.3)];
  TAKEN = null;
  return { lineup, pitchers };
}
function newDraft(seed) {
  const h = { rs: seed | 0 };
  return Object.keys(ARCH).map(k => ({ key: k, name: ARCH[k].name, desc: ARCH[k].desc, relic: ARCH[k].relic, team: makeStartTeam(h, k) }));
}
function startRun(opt, seed, teamKey) {
  if (!TEAMS[teamKey]) teamKey = 'BOS';
  const run = {
    v: 2, seed: seed | 0, rs: hashSeed(seed, 7), arch: opt.key, team: teamKey, schedule: null, stage: 0, wins: 0, losses: 0, gold: 3,
    lineup: opt.team.lineup, pitchers: opt.team.pitchers, relics: [opt.relic],
    phase: 'club', shop: null, rewards: null, rerolls: 0, done: false, champion: false, history: [], G: null,
    stats: { hr: 0, runs: 0, steals: 0 },
  };
  run.schedule = makeSchedule(run, teamKey);
  run.shop = makeShop(run);
  return run;
}
function stageQuality(stage) { return 49 + stage * 1.9; }
function oppFor(run) {
  const st = run.stage;
  const h = { rs: hashSeed(run.seed, 100 + st) };
  const boss = st >= 8;
  const S = 44 + st * 2.1 + (boss ? 1 : 0) + (st === 11 ? 2 : 0);
  const key = run.schedule[st], T = TEAMS[key];
  const nq = boss ? (st === 11 ? 2 : 1) : (st >= 4 ? 1 : (chance(h, 0.5) ? 1 : 0));
  const quirks = sample(h, Object.keys(QUIRKS), Math.max(nq, st === 11 ? 2 : nq));
  TAKEN = new Set();
  const lineup = POS.map(() => genBatter(h, S, null, 0));
  const pitchers = [genPitcher(h, S + 3, 'sp', 0), genPitcher(h, S, 'rp', 0), genPitcher(h, S - 2, 'rp', 0)];
  TAKEN = null;
  const T2 = TEAMS[run.team];
  const where = st < 8 ? (T.div === T2.div && T.lg === T2.lg ? T.lg + ' ' + T.div.toUpperCase() : LEAGUES[T.lg].toUpperCase()) : stageLabel(run, st);
  return { stage: st, key, label: stageLabel(run, st), where, name: teamName(key), city: T.city, nick: T.nick, abbr: key, colors: T.colors, S, quirks, lineup, pitchers, boss };
}

function makeTraining(h, n) { return sample(h, Object.keys(TRAINING), n); }
function rosterNames(run) { return new Set(run.lineup.concat(run.pitchers).map(p => p.name)); }
function makeShop(run) {
  const h = run;
  TAKEN = rosterNames(run);
  const q = stageQuality(run.stage);
  const owned = new Set(run.relics);
  const relicPool = Object.keys(RELICS).filter(k => !owned.has(k));
  const items = [];
  sample(h, relicPool, 2).forEach(id => items.push({ t: 'relic', id, price: RELICS[id].price }));
  const b = genBatter(h, q + 3, null, 0.4); items.push({ t: 'bat', p: b, price: playerPrice(b) });
  const p2 = chance(h, 0.5) ? genBatter(h, q + 3, null, 0.4) : genPitcher(h, q + 3, chance(h, 0.45) ? 'sp' : 'rp', 0.5);
  items.push({ t: p2.kind === 'bat' ? 'bat' : 'pit', p: p2, price: playerPrice(p2) });
  makeTraining(h, 2).forEach(id => items.push({ t: 'train', id, price: 3 }));
  TAKEN = null;
  return items;
}
function makeRewards(run) {
  const h = run;
  TAKEN = rosterNames(run);
  const q = stageQuality(run.stage) + 6;
  const owned = new Set(run.relics);
  const pool = Object.keys(RELICS).filter(k => !owned.has(k));
  const out = [];
  if (pool.length) out.push({ t: 'relic', id: pick(h, pool) });
  const b = genBatter(h, q, null, 0.55); out.push({ t: 'bat', p: b });
  const pp = genPitcher(h, q, chance(h, 0.4) ? 'sp' : 'rp', 0.6);
  const mix = [{ t: 'pit', p: pp }, { t: 'train', id: pick(h, Object.keys(TRAINING)), free: true }, { t: 'gold', amt: 6 }];
  out.push(pick(h, mix));
  TAKEN = null;
  return out.slice(0, 3);
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
function addRelic(run, id, replaceIdx) {
  if (run.relics.length < 5) run.relics.push(id);
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
    inn: 1, half: 'top', outs: 0, bases: [null, null, null], score: { us: 0, opp: 0 }, line: { us: [], opp: [0] },
    len: GAME_LEN, over: false, winner: null, walkoff: false,
    clutch: 3 + (run.relics.includes('seeds') ? 2 : 0), used: {},
    log: [], pa: 0,
    t: {
      us:  { lineup: run.lineup.map(p => Object.assign({}, p)), pitchers: run.pitchers.map(p => Object.assign({}, p)), pi: 0, idx: 0, bf: {}, relics: run.relics.slice(), quirks: [] },
      opp: { lineup: opp.lineup, pitchers: opp.pitchers, pi: 0, idx: 0, bf: {}, relics: [], quirks: opp.quirks },
    },
    stats: { hr: 0, runs: 0, steals: 0, k: 0 },
  };
  startHalf(G);
  return G;
}
const other = s => (s === 'us' ? 'opp' : 'us');
const curPitcher = (G, key) => G.t[key].pitchers[G.t[key].pi];
function gasOf(G, key, p) {
  const t = G.t[key];
  let st = p.sta + (p.trait === 'workhorse' ? 4 : 0) + (p.kind === 'rp' && t.relics.includes('bullpen_cart') ? 4 : 0);
  return st - (t.bf[p.id] || 0);
}
function teamMods(G, key, role, x) {
  const m = { con: 0, pow: 0, eye: 0, spd: 0, def: 0, stf: 0, ctl: 0, hr: 1, k: 0, bb: 0, hit: 0, steal: 0, oppStf: 0 };
  const t = G.t[key];
  for (const id of t.relics) { const r = RELICS[id]; if (r && r.fx) r.fx(m, role, x); }
  for (const q of t.quirks) QUIRKS[q].fx(m, role, x);
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
  if (p.trait === 'closer' && G.inn >= 5) stf += 10;
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
    if (gas <= 0 || (p.kind === 'sp' && G.inn >= 5 && gas <= 3)) {
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
    pa.canSteal = stealTarget(G) >= 0;
    pa.canBunt = (G.bases[0] || G.bases[1]) && !G.bases[2] && G.outs < 2;
    pa.canClutch = G.clutch > 0;
  } else {
    const runners = !!(G.bases[0] || G.bases[1] || G.bases[2]);
    const tired = pa.gas <= 0;
    pa.decision = settingsMode === 'full' || (settingsMode === 'key' && (runners || tired)) || (settingsMode === 'auto' && false);
    pa.canPull = G.t.us.pi < G.t.us.pitchers.length - 1;
    pa.canIBB = !G.bases[0] && (G.bases[1] || G.bases[2]);
    pa.canInfield = !!G.bases[2] && G.outs < 2;
    pa.canClutch = G.clutch > 0;
    if (settingsMode === 'auto' && tired && pa.canPull && pa.gas < -2) pa.autoPull = true;
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
  const ev = { type: 'pa', code, text, runs: r.runs, outs: r.outs, moves: r.moves, ball, mulligan: mull, clutch: o.clutch, appr: o.appr, prob: { K: pr.K, BB: pr.BB, H: pr.pHit, HR: pr.pHR } };
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
    gold = 4 + Math.floor(run.stage / 3) + (run.relics.includes('piggy') ? 3 : 0);
  } else { run.losses++; gold = 2; }
  run.gold += gold;
  const info = { won, gold };
  if (!won && run.losses >= MAX_LOSSES) { run.done = true; run.phase = 'over'; return info; }
  run.stage++;
  if (run.stage >= TOTAL_STAGES) { run.done = true; run.champion = true; run.phase = 'over'; return info; }
  run.phase = 'club'; run.rerolls = 0;
  run.rewards = won ? makeRewards(run) : null;
  run.shop = makeShop(run);
  return info;
}

const api = {
  TEAMS, LEAGUES, teamName, stageLabel,
  RELICS, QUIRKS, TRAINING, ARCH, BAT_TRAITS, PIT_TRAITS, APPR_BAT, APPR_PIT, POS, STAGE_LABELS, TOTAL_STAGES, MAX_LOSSES, GAME_LEN,
  newDraft, startRun, oppFor, makeShop, makeRewards, rerollShop, placePlayer, applyTraining, addRelic, playerAt, finishGame,
  newGame, nextPA, resolve, preview, stealProb, buntProb, curPitcher, gasOf, ovr, playerPrice,
  rf, ri, pick, chance, hashSeed,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
