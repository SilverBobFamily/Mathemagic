import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const releases = [
  { number: 1, name: 'Greek Mythology', icon: '🏛️', color_hex: '#1a237e' },
  { number: 2, name: 'Wild West',       icon: '🤠', color_hex: '#4e342e' },
  { number: 3, name: 'Dinosaurs',       icon: '🦕', color_hex: '#2e7d32' },
  { number: 4, name: 'Outer Space',     icon: '🚀', color_hex: '#0d1b2a' },
  { number: 5, name: 'Music',           icon: '🎵', color_hex: '#0d0d0d' },
  { number: 6, name: 'Zombies',         icon: '🧟', color_hex: '#1b2e1b' },
];

const r1Cards = [
  // CREATURES (14)
  { name: 'Zeus',        type: 'creature', value:  8, art_emoji: '⚡', flavor_text: 'King of the gods. His presence demands respect.' },
  { name: 'Athena',      type: 'creature', value:  7, art_emoji: '🦉', flavor_text: 'Goddess of wisdom. She always has a plan.' },
  { name: 'Apollo',      type: 'creature', value:  6, art_emoji: '🌞', flavor_text: 'God of the sun. Everything he touches shines.' },
  { name: 'Poseidon',    type: 'creature', value:  6, art_emoji: '🔱', flavor_text: 'Lord of the seas. He holds the world steady.' },
  { name: 'Ares',        type: 'creature', value:  6, art_emoji: '⚔️', flavor_text: "God of war. He doesn't need help." },
  { name: 'Artemis',     type: 'creature', value:  5, art_emoji: '🌙', flavor_text: 'Goddess of the hunt. She never misses.' },
  { name: 'Aphrodite',   type: 'creature', value:  5, art_emoji: '🌹', flavor_text: 'Goddess of love. Everyone is affected.' },
  { name: 'Hermes',      type: 'creature', value:  4, art_emoji: '👟', flavor_text: 'Fastest god alive. Also delivers packages.' },
  { name: 'Hephaestus',  type: 'creature', value:  3, art_emoji: '🔨', flavor_text: 'Forger of lightning bolts. Underrated.' },
  { name: 'Demeter',     type: 'creature', value:  3, art_emoji: '🌾', flavor_text: 'Goddess of harvest. Slow but steady.' },
  { name: 'Dionysus',    type: 'creature', value:  2, art_emoji: '🍇', flavor_text: 'God of parties. Things get unpredictable.' },
  { name: 'Persephone',  type: 'creature', value:  0, art_emoji: '🌸', flavor_text: "Half the year she's gone. It shows." },
  { name: 'Medusa',      type: 'creature', value: -2, art_emoji: '🐍', flavor_text: "Once beautiful, now a weapon. Don't look." },
  { name: 'Tantalus',    type: 'creature', value: -3, art_emoji: '😩', flavor_text: 'Forever reaching, never satisfied.' },
  // ITEMS (8)
  { name: 'Ambrosia',         type: 'item', operator: '+3', operator_value:  3, art_emoji: '🏺', effect_text: 'Add +3 to one creature.', flavor_text: 'The food of the gods. Not meant for mortals.' },
  { name: 'Nectar',           type: 'item', operator: '+5', operator_value:  5, art_emoji: '🍯', effect_text: 'Add +5 to one creature.', flavor_text: 'Sweeter than anything mortals have tasted.' },
  { name: 'Golden Fleece',    type: 'item', operator: '+2', operator_value:  2, art_emoji: '🐑', effect_text: 'Add +2 to one creature.', flavor_text: 'Worth more than it looks.' },
  { name: "Hermes' Sandals",  type: 'item', operator: '+1', operator_value:  1, art_emoji: '💨', effect_text: 'Add +1 to one creature.', flavor_text: 'A small boost. Surprisingly useful.' },
  { name: 'Lyre of Orpheus',  type: 'item', operator: '+1', operator_value:  1, art_emoji: '🎵', effect_text: 'Add +1 to one creature.', flavor_text: 'Even stones wept.' },
  { name: "Pandora's Box",    type: 'item', operator: '-3', operator_value: -3, art_emoji: '📦', effect_text: 'Subtract 3 from one creature.', flavor_text: 'You knew this was a bad idea.' },
  { name: "Circe's Potion",   type: 'item', operator: '-2', operator_value: -2, art_emoji: '🧪', effect_text: 'Subtract 2 from one creature.', flavor_text: 'Turns heroes into problems.' },
  { name: 'Midas Touch',      type: 'item', operator: '+5', operator_value:  5, art_emoji: '🤌', effect_text: 'Add +5 to one creature.', flavor_text: 'Everything it touches becomes valuable.' },
  // ACTIONS (6)
  { name: 'Cyclone of Poseidon', type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '🌀', effect_text: "Multiply one creature's value by 2.",   flavor_text: 'The seas obey his fury.' },
  { name: 'Wrath of Ares',       type: 'action', operator: '×5',    operator_value:  5,   art_emoji: '🔥', effect_text: "Multiply one creature's value by 5.",   flavor_text: 'War has a multiplier effect.' },
  { name: 'Thunderbolt',         type: 'action', operator: '×10',   operator_value:  10,  art_emoji: '⚡', effect_text: "Multiply one creature's value by 10.",  flavor_text: 'The sky splits. The earth shakes.' },
  { name: 'Labyrinth',           type: 'action', operator: '÷5',    operator_value:  0.2, art_emoji: '🌀', effect_text: "Divide one creature's value by 5.",    flavor_text: 'Even the mighty get lost in here.' },
  { name: "Echo's Voice",        type: 'action', operator: '÷2',    operator_value:  0.5, art_emoji: '🗣️', effect_text: "Divide one creature's value by 2.",    flavor_text: 'Half the impact. Still annoying.' },
  { name: 'Curse of Medusa',     type: 'action', operator: '×(-1)', operator_value: -1,   art_emoji: '🪨', effect_text: "Flip one creature's value to its opposite.", flavor_text: "Turn your enemies' strengths against them." },
  // EVENTS (2)
  { name: 'Wrath of Hades', type: 'event', effect_type: 'zero_out', art_emoji: '🌋', effect_text: 'Zero Out: Set any one creature on the field to 0.', flavor_text: 'The underworld claims what the living cannot keep.' },
  { name: 'Mount Olympus',  type: 'event', effect_type: 'x100',     art_emoji: '🏔️', effect_text: "×100: Multiply any one creature's value by 100.",  flavor_text: "The gods don't do anything small." },
];

const r2Cards = [
  // CREATURES (14)
  { name: 'Sheriff',           type: 'creature', value:  8, art_emoji: '⭐', flavor_text: 'Law and order, one bullet at a time.' },
  { name: 'Bounty Hunter',     type: 'creature', value:  7, art_emoji: '🤠', flavor_text: 'They always get their mark.' },
  { name: 'Outlaw',            type: 'creature', value:  7, art_emoji: '🔫', flavor_text: 'Wanted in three territories.' },
  { name: 'Deputy',            type: 'creature', value:  5, art_emoji: '🪙', flavor_text: "The sheriff's right hand." },
  { name: 'Gold Miner',        type: 'creature', value:  4, art_emoji: '⛏️', flavor_text: 'Fortune is one shovel away.' },
  { name: 'Wrangler',          type: 'creature', value:  4, art_emoji: '🐎', flavor_text: 'Nobody handles horses like he does.' },
  { name: 'Gambler',           type: 'creature', value:  3, art_emoji: '🃏', flavor_text: 'The cards always fall his way.' },
  { name: 'Saloon Girl',       type: 'creature', value:  3, art_emoji: '🪗', flavor_text: 'She hears everything. Uses it wisely.' },
  { name: 'Snake Oil Salesman',type: 'creature', value:  2, art_emoji: '🧴', flavor_text: 'Believe it or not, it sometimes works.' },
  { name: 'Stagecoach Driver', type: 'creature', value:  2, art_emoji: '🪵', flavor_text: 'On time, always. Dusty, always.' },
  { name: 'Tumbleweed',        type: 'creature', value:  0, art_emoji: '🌵', flavor_text: 'Goes where the wind takes it.' },
  { name: 'Bandit',            type: 'creature', value: -2, art_emoji: '🕵️', flavor_text: 'Robs first, escapes second.' },
  { name: 'Horse Thief',       type: 'creature', value: -3, art_emoji: '🐴', flavor_text: 'The lowest of the low.' },
  { name: 'Rustler',           type: 'creature', value: -4, art_emoji: '🐮', flavor_text: 'Takes what belongs to others.' },
  // ITEMS (8)
  { name: 'Gold Nugget',       type: 'item', operator: '+3', operator_value:  3, art_emoji: '🪙', effect_text: 'Add +3 to one creature.', flavor_text: 'Worth more than it weighs.' },
  { name: 'Dynamite',          type: 'item', operator: '+5', operator_value:  5, art_emoji: '🧨', effect_text: 'Add +5 to one creature.', flavor_text: 'Explosive results.' },
  { name: 'Lasso',             type: 'item', operator: '+2', operator_value:  2, art_emoji: '🪢', effect_text: 'Add +2 to one creature.', flavor_text: 'Ties things together nicely.' },
  { name: 'Six-Shooter',       type: 'item', operator: '+1', operator_value:  1, art_emoji: '🔫', effect_text: 'Add +1 to one creature.', flavor_text: 'Six chances. Make them count.' },
  { name: 'Lucky Horseshoe',   type: 'item', operator: '+1', operator_value:  1, art_emoji: '🧲', effect_text: 'Add +1 to one creature.', flavor_text: 'Small luck is still luck.' },
  { name: 'Whiskey',           type: 'item', operator: '-2', operator_value: -2, art_emoji: '🥃', effect_text: 'Subtract 2 from one creature.', flavor_text: 'Makes everything a little worse.' },
  { name: 'Wanted Poster',     type: 'item', operator: '-3', operator_value: -3, art_emoji: '📜', effect_text: 'Subtract 3 from one creature.', flavor_text: 'A price on your head changes everything.' },
  { name: 'Railroad Spike',    type: 'item', operator: '+5', operator_value:  5, art_emoji: '🔩', effect_text: 'Add +5 to one creature.', flavor_text: 'Progress, driven in.' },
  // ACTIONS (6)
  { name: 'Quickdraw',         type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '⚡', effect_text: "Multiply one creature's value by 2.", flavor_text: 'Faster than the eye can follow.' },
  { name: 'Stampede',          type: 'action', operator: '×5',    operator_value:  5,   art_emoji: '🐃', effect_text: "Multiply one creature's value by 5.", flavor_text: 'Nothing stops a full stampede.' },
  { name: 'Gold Rush',         type: 'action', operator: '×10',   operator_value:  10,  art_emoji: '💰', effect_text: "Multiply one creature's value by 10.", flavor_text: 'Everyone wants a piece.' },
  { name: 'Desert Heat',       type: 'action', operator: '÷2',    operator_value:  0.5, art_emoji: '☀️', effect_text: "Divide one creature's value by 2.", flavor_text: 'Drains the life right out of you.' },
  { name: 'Dust Storm',        type: 'action', operator: '÷5',    operator_value:  0.2, art_emoji: '🌪️', effect_text: "Divide one creature's value by 5.", flavor_text: "Can't see a thing." },
  { name: 'Rattlesnake Bite',  type: 'action', operator: '×(-1)', operator_value: -1,   art_emoji: '🐍', effect_text: "Flip one creature's value to its opposite.", flavor_text: 'The venom turns strength into weakness.' },
  // EVENTS (2)
  { name: 'Boot Hill',    type: 'event', effect_type: 'banish', art_emoji: '⚰️', effect_text: 'Banish: Remove any one creature from the field permanently.', flavor_text: 'Everybody ends up here eventually.' },
  { name: 'Cattle Drive', type: 'event', effect_type: 'swap',   art_emoji: '🐄', effect_text: 'Swap: Exchange any two creatures between sides.', flavor_text: 'Ownership is temporary out here.' },
];

const r3Cards = [
  // CREATURES (14)
  { name: 'T-Rex',              type: 'creature', value: 10, art_emoji: '🦖', flavor_text: 'King of the Cretaceous. No debate.' },
  { name: 'Brachiosaurus',      type: 'creature', value:  7, art_emoji: '🦕', flavor_text: 'Tallest creature that ever walked.' },
  { name: 'Triceratops',        type: 'creature', value:  6, art_emoji: '🦏', flavor_text: 'Three horns, zero tolerance.' },
  { name: 'Velociraptor',       type: 'creature', value:  6, art_emoji: '🦅', flavor_text: 'Smarter than you think. Faster than you can react.' },
  { name: 'Pterodactyl',        type: 'creature', value:  5, art_emoji: '🦇', flavor_text: 'Rules the skies before there were rules.' },
  { name: 'Stegosaurus',        type: 'creature', value:  4, art_emoji: '🐊', flavor_text: 'Armored and unimpressed.' },
  { name: 'Ankylosaurus',       type: 'creature', value:  3, art_emoji: '🐢', flavor_text: 'Built like a tank, moves like one too.' },
  { name: 'Diplodocus',         type: 'creature', value:  3, art_emoji: '🐍', flavor_text: 'Long neck, long memory.' },
  { name: 'Pachycephalosaurus', type: 'creature', value:  2, art_emoji: '🪨', flavor_text: 'Hardheaded in every sense.' },
  { name: 'Parasaurolophus',    type: 'creature', value:  2, art_emoji: '🎺', flavor_text: 'Its call echoed for miles.' },
  { name: 'Compsognathus',      type: 'creature', value:  1, art_emoji: '🐦', flavor_text: 'Small but surprisingly persistent.' },
  { name: 'Archaeopteryx',      type: 'creature', value: -1, art_emoji: '🪶', flavor_text: "Half bird, half dinosaur. Neither's impressed." },
  { name: 'Dimetrodon',         type: 'creature', value: -3, art_emoji: '🦎', flavor_text: 'Not actually a dinosaur. Still unpleasant.' },
  { name: 'Meteor',             type: 'creature', value: -5, art_emoji: '☄️', flavor_text: 'It ended everything. Including your score.' },
  // ITEMS (8)
  { name: 'Amber',          type: 'item', operator: '+3', operator_value:  3, art_emoji: '🟠', effect_text: 'Add +3 to one creature.', flavor_text: 'Preserved perfectly. Worth a fortune.' },
  { name: 'Gigantic Egg',   type: 'item', operator: '+5', operator_value:  5, art_emoji: '🥚', effect_text: 'Add +5 to one creature.', flavor_text: 'Something massive is about to hatch.' },
  { name: 'Fossil Fuel',    type: 'item', operator: '+2', operator_value:  2, art_emoji: '🛢️', effect_text: 'Add +2 to one creature.', flavor_text: 'Ancient power, modern use.' },
  { name: 'Bone Club',      type: 'item', operator: '+1', operator_value:  1, art_emoji: '🦴', effect_text: 'Add +1 to one creature.', flavor_text: 'Old school, but effective.' },
  { name: 'Fern Bush',      type: 'item', operator: '+1', operator_value:  1, art_emoji: '🌿', effect_text: 'Add +1 to one creature.', flavor_text: 'Everything ate these. Everything.' },
  { name: 'Tar Pit',        type: 'item', operator: '-3', operator_value: -3, art_emoji: '🕳️', effect_text: 'Subtract 3 from one creature.', flavor_text: 'Once you step in, you stay.' },
  { name: 'Volcanic Ash',   type: 'item', operator: '-2', operator_value: -2, art_emoji: '🌋', effect_text: 'Subtract 2 from one creature.', flavor_text: 'Settles over everything.' },
  { name: 'Carnivore Diet', type: 'item', operator: '+5', operator_value:  5, art_emoji: '🥩', effect_text: 'Add +5 to one creature.', flavor_text: 'Pure protein. Pure power.' },
  // ACTIONS (6)
  { name: 'Predator Leap', type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '🦷', effect_text: "Multiply one creature's value by 2.", flavor_text: 'No warning. Just teeth.' },
  { name: 'Herd Stampede', type: 'action', operator: '×5',    operator_value:  5,   art_emoji: '🦕', effect_text: "Multiply one creature's value by 5.", flavor_text: 'The ground shakes. Then silence.' },
  { name: 'Meteor Strike', type: 'action', operator: '×10',   operator_value:  10,  art_emoji: '☄️', effect_text: "Multiply one creature's value by 10.", flavor_text: 'The end of everything. But for one creature, a boost.' },
  { name: 'Swamp Slow',    type: 'action', operator: '÷2',    operator_value:  0.5, art_emoji: '🌊', effect_text: "Divide one creature's value by 2.", flavor_text: 'The bog takes everything down a notch.' },
  { name: 'Ice Age',       type: 'action', operator: '÷5',    operator_value:  0.2, art_emoji: '🧊', effect_text: "Divide one creature's value by 5.", flavor_text: 'Frozen in time.' },
  { name: 'Mutation',      type: 'action', operator: '×(-2)', operator_value: -2,   art_emoji: '🧬', effect_text: "Multiply one creature's value by -2.", flavor_text: 'Evolution takes a dark turn.' },
  // EVENTS (2)
  { name: 'Fossilized Echo',  type: 'event', effect_type: 'mirror',  art_emoji: '🦴', effect_text: "Mirror: Copy one creature's current value onto another creature.", flavor_text: 'An echo across millions of years.' },
  { name: 'Extinction Event', type: 'event', effect_type: 'reverse', art_emoji: '💥', effect_text: 'Reverse: Flip the sign of every creature on one side of the field.', flavor_text: 'Nothing survives unchanged.' },
];

const r4Cards = [
  // CREATURES (14)
  { name: 'Astronaut',     type: 'creature', value:  8, art_emoji: '👨‍🚀', flavor_text: 'Trained for the impossible. Ready for the unimaginable.' },
  { name: 'Alien Queen',   type: 'creature', value:  7, art_emoji: '👽', flavor_text: 'Commands with a single thought.' },
  { name: 'Quasar',        type: 'creature', value:  6, art_emoji: '✨', flavor_text: 'Brighter than a billion suns. Brief, but brilliant.' },
  { name: 'Pulsar',        type: 'creature', value:  6, art_emoji: '💫', flavor_text: 'Precise. Relentless. Cosmic.' },
  { name: 'Nebula',        type: 'creature', value:  5, art_emoji: '🌌', flavor_text: 'A stellar nursery. New things are being born.' },
  { name: 'Comet',         type: 'creature', value:  5, art_emoji: '🌠', flavor_text: 'Passes once in a lifetime. Make it count.' },
  { name: 'Space Station', type: 'creature', value:  4, art_emoji: '🛸', flavor_text: 'A foothold in the void.' },
  { name: 'Martian',       type: 'creature', value:  3, art_emoji: '🟢', flavor_text: 'Friendly enough. Mostly.' },
  { name: 'Cosmonaut',     type: 'creature', value:  3, art_emoji: '🧑‍🚀', flavor_text: 'A different approach. Same destination.' },
  { name: 'Satellite',     type: 'creature', value:  2, art_emoji: '📡', flavor_text: 'Always watching. Always orbiting.' },
  { name: 'Moon Rock',     type: 'creature', value:  2, art_emoji: '🪨', flavor_text: 'Valuable for reasons scientists argue about.' },
  { name: 'Space Junk',    type: 'creature', value: -1, art_emoji: '🗑️', flavor_text: 'We left it up there. It haunts us.' },
  { name: 'Dark Matter',   type: 'creature', value: -3, art_emoji: '⬛', flavor_text: "It's everywhere. We have no idea what it is." },
  { name: 'Void',          type: 'creature', value: -4, art_emoji: '🕳️', flavor_text: 'The absence of everything.' },
  // ITEMS (8)
  { name: 'Oxygen Tank',  type: 'item', operator: '+3', operator_value:  3, art_emoji: '🫧', effect_text: 'Add +3 to one creature.', flavor_text: 'Breathe deep. Keep going.' },
  { name: 'Antimatter',   type: 'item', operator: '+5', operator_value:  5, art_emoji: '⚛️', effect_text: 'Add +5 to one creature.', flavor_text: 'The most powerful substance in the universe.' },
  { name: 'Jetpack',      type: 'item', operator: '+2', operator_value:  2, art_emoji: '🚀', effect_text: 'Add +2 to one creature.', flavor_text: 'Ignition. Altitude. Advantage.' },
  { name: 'Space Food',   type: 'item', operator: '+1', operator_value:  1, art_emoji: '🍫', effect_text: 'Add +1 to one creature.', flavor_text: 'Freeze-dried but motivating.' },
  { name: 'Star Map',     type: 'item', operator: '+1', operator_value:  1, art_emoji: '🗺️', effect_text: "Add +1 to one creature.", flavor_text: "Know where you are. Know where you're going." },
  { name: 'Radiation',    type: 'item', operator: '-3', operator_value: -3, art_emoji: '☢️', effect_text: 'Subtract 3 from one creature.', flavor_text: "Can't see it. Can't escape it." },
  { name: 'Gravity Well', type: 'item', operator: '-2', operator_value: -2, art_emoji: '🌀', effect_text: 'Subtract 2 from one creature.', flavor_text: 'Everything bends toward it.' },
  { name: 'Warp Core',    type: 'item', operator: '+5', operator_value:  5, art_emoji: '🔵', effect_text: 'Add +5 to one creature.', flavor_text: 'Bend space. Bend the rules.' },
  // ACTIONS (6)
  { name: 'Orbit',            type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '🌍', effect_text: "Multiply one creature's value by 2.", flavor_text: 'Around and around, gaining speed.' },
  { name: 'Supernova',        type: 'action', operator: '×5',    operator_value:  5,   art_emoji: '💥', effect_text: "Multiply one creature's value by 5.", flavor_text: 'A dying star goes out screaming.' },
  { name: 'Big Bang',         type: 'action', operator: '×10',   operator_value:  10,  art_emoji: '🌌', effect_text: "Multiply one creature's value by 10.", flavor_text: 'The beginning of everything. Including this boost.' },
  { name: 'Atmospheric Drag', type: 'action', operator: '÷2',    operator_value:  0.5, art_emoji: '🌫️', effect_text: "Divide one creature's value by 2.", flavor_text: 'Resistance is unavoidable on re-entry.' },
  { name: 'Event Horizon',    type: 'action', operator: '÷5',    operator_value:  0.2, art_emoji: '🕳️', effect_text: "Divide one creature's value by 5.", flavor_text: 'Beyond this point, nothing escapes.' },
  { name: 'Antimatter Pulse', type: 'action', operator: '×(-1)', operator_value: -1,   art_emoji: '⚡', effect_text: "Flip one creature's value to its opposite.", flavor_text: 'Matter meets antimatter. Everything inverts.' },
  // EVENTS (2)
  { name: 'Black Hole',    type: 'event', effect_type: 'zero_out', art_emoji: '⚫', effect_text: 'Zero Out: Set any one creature on the field to 0.', flavor_text: 'It devours everything, even points.' },
  { name: 'Gravity Sling', type: 'event', effect_type: 'swap',     art_emoji: '🌀', effect_text: 'Swap: Exchange any two creatures between sides.', flavor_text: 'Gravity bends trajectories. And ownership.' },
];

const r5Cards = [
  // CREATURES (14)
  { name: 'Rock Star',        type: 'creature', value:  9, art_emoji: '🎸', flavor_text: 'Sold out every show. Ever.' },
  { name: 'DJ',               type: 'creature', value:  7, art_emoji: '🎧', flavor_text: 'Reads the room. Commands it.' },
  { name: 'Rapper',           type: 'creature', value:  6, art_emoji: '🎤', flavor_text: 'Words as weapons. Rhythm as power.' },
  { name: 'Conductor',        type: 'creature', value:  6, art_emoji: '🎼', flavor_text: 'Sixty musicians, one vision.' },
  { name: 'Violinist',        type: 'creature', value:  5, art_emoji: '🎻', flavor_text: 'Precision and passion, perfectly balanced.' },
  { name: 'Drummer',          type: 'creature', value:  4, art_emoji: '🥁', flavor_text: 'The heartbeat of every band.' },
  { name: 'Producer',         type: 'creature', value:  4, art_emoji: '🎚️', flavor_text: 'The invisible force behind every hit.' },
  { name: 'Sound Engineer',   type: 'creature', value:  3, art_emoji: '🔊', flavor_text: 'Nobody notices until something goes wrong.' },
  { name: 'Bassist',          type: 'creature', value:  3, art_emoji: '🎸', flavor_text: "The backbone. Often unsung, always essential." },
  { name: 'Roadie',           type: 'creature', value:  2, art_emoji: '🔧', flavor_text: 'Carries everything. Gets no credit.' },
  { name: 'Groupie',          type: 'creature', value:  0, art_emoji: '📸', flavor_text: 'Present at every show. Part of the energy.' },
  { name: 'One-Hit Wonder',   type: 'creature', value:  1, art_emoji: '⭐', flavor_text: 'One great song. Still proud.' },
  { name: 'Music Critic',     type: 'creature', value: -2, art_emoji: '📝', flavor_text: 'Has never made anything. Very opinionated.' },
  { name: 'Tone-Deaf Singer', type: 'creature', value: -4, art_emoji: '😬', flavor_text: 'Confident. Incorrect. Loud.' },
  // ITEMS (8)
  { name: 'Guitar Riff',     type: 'item', operator: '+3', operator_value:  3, art_emoji: '🎸', effect_text: 'Add +3 to one creature.', flavor_text: 'Three seconds that change everything.' },
  { name: 'Platinum Record', type: 'item', operator: '+5', operator_value:  5, art_emoji: '💿', effect_text: 'Add +5 to one creature.', flavor_text: 'A million copies. Timeless.' },
  { name: 'Bass Drop',       type: 'item', operator: '+2', operator_value:  2, art_emoji: '🔉', effect_text: 'Add +2 to one creature.', flavor_text: 'The floor shakes. The crowd erupts.' },
  { name: 'High Note',       type: 'item', operator: '+1', operator_value:  1, art_emoji: '🎵', effect_text: 'Add +1 to one creature.', flavor_text: 'Held for just a moment longer than expected.' },
  { name: 'Earplugs',        type: 'item', operator: '+1', operator_value:  1, art_emoji: '🔇', effect_text: 'Add +1 to one creature.', flavor_text: "Protect what matters. It's only +1, but still." },
  { name: 'Off-Key Verse',   type: 'item', operator: '-3', operator_value: -3, art_emoji: '😖', effect_text: 'Subtract 3 from one creature.', flavor_text: 'The crowd felt it immediately.' },
  { name: 'Broken String',   type: 'item', operator: '-2', operator_value: -2, art_emoji: '💔', effect_text: 'Subtract 2 from one creature.', flavor_text: 'Mid-solo. In front of everyone.' },
  { name: 'Stadium Sound',   type: 'item', operator: '+5', operator_value:  5, art_emoji: '🏟️', effect_text: 'Add +5 to one creature.', flavor_text: '80,000 people. Full volume.' },
  // ACTIONS (6)
  { name: 'Encore',         type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '🎤', effect_text: "Multiply one creature's value by 2.", flavor_text: 'They came back. Twice as good.' },
  { name: 'Music Festival', type: 'action', operator: '×5',    operator_value:  5,   art_emoji: '🎪', effect_text: "Multiply one creature's value by 5.", flavor_text: 'Five stages. Infinite energy.' },
  { name: 'Number One Hit', type: 'action', operator: '×10',   operator_value:  10,  art_emoji: '🥇', effect_text: "Multiply one creature's value by 10.", flavor_text: 'Charts. History. Legacy.' },
  { name: 'Acoustic Set',   type: 'action', operator: '÷2',    operator_value:  0.5, art_emoji: '🪗', effect_text: "Divide one creature's value by 2.", flavor_text: 'Stripped back. Half the impact.' },
  { name: 'Sound Check',    type: 'action', operator: '÷5',    operator_value:  0.2, art_emoji: '🎚️', effect_text: "Divide one creature's value by 5.", flavor_text: 'Testing, testing... one fifth.' },
  { name: 'Feedback Loop',  type: 'action', operator: '×(-1)', operator_value: -1,   art_emoji: '📢', effect_text: "Flip one creature's value to its opposite.", flavor_text: 'The mic screams back. Everything inverts.' },
  // EVENTS (2)
  { name: 'Remix',          type: 'event', effect_type: 'mirror', art_emoji: '🔄', effect_text: "Mirror: Copy one creature's current value onto another creature.", flavor_text: 'Same energy. New arrangement.' },
  { name: 'Cancel Culture', type: 'event', effect_type: 'banish', art_emoji: '❌', effect_text: 'Banish: Remove any one creature from the field permanently.', flavor_text: 'Here one day, gone the next.' },
];

const r6Cards = [
  // CREATURES (14)
  { name: 'Zombie Horde',       type: 'creature', value:  8, art_emoji: '🧟', flavor_text: 'Numbers beyond counting. Logic beyond reason.' },
  { name: 'Necromancer',        type: 'creature', value:  7, art_emoji: '💀', flavor_text: 'Raises the dead. Raises the stakes.' },
  { name: 'Undead Knight',      type: 'creature', value:  7, art_emoji: '⚔️', flavor_text: 'Still armored. Still dangerous. No longer breathing.' },
  { name: 'Brain Eater',        type: 'creature', value:  6, art_emoji: '🧠', flavor_text: 'Particularly attracted to the smart ones.' },
  { name: 'Survivor',           type: 'creature', value:  6, art_emoji: '🏃', flavor_text: 'Runs fast, thinks faster.' },
  { name: 'Plague Doctor',      type: 'creature', value:  5, art_emoji: '🩺', flavor_text: 'Knows the cure. Charges extra.' },
  { name: 'Ghoul',              type: 'creature', value:  3, art_emoji: '👻', flavor_text: 'Scavenger of the worst kind.' },
  { name: 'Skeleton',           type: 'creature', value:  2, art_emoji: '💀', flavor_text: 'Bare bones. Literally.' },
  { name: 'Infected Mayor',     type: 'creature', value:  1, art_emoji: '🏛️', flavor_text: 'Still giving speeches. Nobody listens.' },
  { name: 'Zombie Cheerleader', type: 'creature', value: -1, art_emoji: '📣', flavor_text: 'The spirit is there. The flesh is not.' },
  { name: 'Rotting Corpse',     type: 'creature', value: -3, art_emoji: '☠️', flavor_text: 'Past its prime. By centuries.' },
  { name: 'Undead Child',       type: 'creature', value: -4, art_emoji: '👧', flavor_text: 'The most unsettling sight on the field.' },
  { name: 'Patient Zero',       type: 'creature', value: -5, art_emoji: '🦠', flavor_text: 'It started here. Everything did.' },
  { name: 'Shambler',           type: 'creature', value:  4, art_emoji: '🚶', flavor_text: 'Slow. Persistent. Eventually arrives.' },
  // ITEMS (8)
  { name: 'First Aid Kit',   type: 'item', operator: '+3', operator_value:  3, art_emoji: '🩹', effect_text: 'Add +3 to one creature.', flavor_text: 'Precious. Increasingly rare.' },
  { name: 'Defibrillator',   type: 'item', operator: '+5', operator_value:  5, art_emoji: '⚡', effect_text: 'Add +5 to one creature.', flavor_text: 'CLEAR. Back to life.' },
  { name: 'Barricade',       type: 'item', operator: '+2', operator_value:  2, art_emoji: '🚧', effect_text: 'Add +2 to one creature.', flavor_text: 'Buys time. Time is everything.' },
  { name: 'Crowbar',         type: 'item', operator: '+1', operator_value:  1, art_emoji: '🔧', effect_text: 'Add +1 to one creature.', flavor_text: 'The tool of the apocalypse.' },
  { name: 'Torch',           type: 'item', operator: '+1', operator_value:  1, art_emoji: '🔦', effect_text: 'Add +1 to one creature.', flavor_text: "The dark is worse. The torch helps, barely." },
  { name: 'Zombie Bite',     type: 'item', operator: '-2', operator_value: -2, art_emoji: '🩸', effect_text: 'Subtract 2 from one creature.', flavor_text: 'The infection spreads.' },
  { name: 'Rotten Flesh',    type: 'item', operator: '-3', operator_value: -3, art_emoji: '🍖', effect_text: 'Subtract 3 from one creature.', flavor_text: "You don't want to know what this does." },
  { name: 'Military Rations',type: 'item', operator: '+5', operator_value:  5, art_emoji: '🥫', effect_text: 'Add +5 to one creature.', flavor_text: 'Lasts 50 years. Tastes like it.' },
  // ACTIONS (6)
  { name: 'Brain Feast',       type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '🧠', effect_text: "Multiply one creature's value by 2.", flavor_text: 'Fed. Empowered. Terrifying.' },
  { name: 'Zombie Apocalypse', type: 'action', operator: '×5',    operator_value:  5,   art_emoji: '🌍', effect_text: "Multiply one creature's value by 5.", flavor_text: 'The world falls. One side rises.' },
  { name: 'Undead Army',       type: 'action', operator: '×10',   operator_value:  10,  art_emoji: '⚔️', effect_text: "Multiply one creature's value by 10.", flavor_text: 'They keep coming. There is no end.' },
  { name: 'Decompose',         type: 'action', operator: '÷2',    operator_value:  0.5, art_emoji: '🍂', effect_text: "Divide one creature's value by 2.", flavor_text: 'Everything returns to nothing, eventually.' },
  { name: 'Brain Fog',         type: 'action', operator: '÷5',    operator_value:  0.2, art_emoji: '🌫️', effect_text: "Divide one creature's value by 5.", flavor_text: "Can't think straight. Can't function." },
  { name: 'Resurrection',      type: 'action', operator: '×(-2)', operator_value: -2,   art_emoji: '✝️', effect_text: "Multiply one creature's value by -2.", flavor_text: 'Back from the dead, and twice as wrong.' },
  // EVENTS (2)
  { name: 'Undead Rising', type: 'event', effect_type: 'reverse', art_emoji: '⬆️', effect_text: 'Reverse: Flip the sign of every creature on one side of the field.', flavor_text: 'What was weak becomes strong. What was strong rots.' },
  { name: 'Horde',         type: 'event', effect_type: 'x100',    art_emoji: '🧟', effect_text: "×100: Multiply any one creature's value by 100.", flavor_text: 'One became ten. Ten became a thousand.' },
];

const releaseCardPairs = [
  { number: 1, cards: r1Cards },
  { number: 2, cards: r2Cards },
  { number: 3, cards: r3Cards },
  { number: 4, cards: r4Cards },
  { number: 5, cards: r5Cards },
  { number: 6, cards: r6Cards },
];

async function seed() {
  console.log('Starting seed...');

  // Insert releases
  const { data: releaseRows, error: relErr } = await supabase
    .from('releases')
    .insert(releases)
    .select();

  if (relErr) {
    console.error('Release error:', relErr);
    process.exit(1);
  }

  console.log(`Inserted ${releaseRows!.length} releases`);

  // Insert cards for each release
  for (const { number, cards } of releaseCardPairs) {
    const release = releaseRows!.find(r => r.number === number)!;
    const cardRows = cards.map(c => ({ ...c, release_id: release.id }));

    const { error } = await supabase.from('cards').insert(cardRows);

    if (error) {
      console.error(`Error seeding release ${number}:`, error);
      process.exit(1);
    }

    console.log(`Inserted ${cardRows.length} cards for Release ${number}`);
  }

  console.log('Seed complete!');
}

seed();
