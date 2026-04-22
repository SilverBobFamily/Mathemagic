import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const r7Cards = [
  // CREATURES (14)
  { name: 'Ra',        type: 'creature', value: 10, art_emoji: '☀️', flavor_text: 'The sun god. His light gives life — and takes it.' },
  { name: 'Amun-Ra',   type: 'creature', value:  9, art_emoji: '👑', flavor_text: 'King of the gods, hidden and all-powerful.' },
  { name: 'Osiris',    type: 'creature', value:  8, art_emoji: '🌿', flavor_text: 'Lord of the afterlife. Death itself answers to him.' },
  { name: 'Horus',     type: 'creature', value:  7, art_emoji: '🦅', flavor_text: 'The falcon-headed sky god. His eye sees everything.' },
  { name: 'Isis',      type: 'creature', value:  6, art_emoji: '🪶', flavor_text: 'Goddess of magic. She rewrites the rules.' },
  { name: 'Thoth',     type: 'creature', value:  6, art_emoji: '📜', flavor_text: 'God of wisdom. He invented writing — and winning.' },
  { name: 'Anubis',    type: 'creature', value:  5, art_emoji: '⚖️', flavor_text: 'Weighs your heart against a feather. No pressure.' },
  { name: 'Sekhmet',   type: 'creature', value:  5, art_emoji: '🦁', flavor_text: 'Goddess of war and plague. A dangerous combination.' },
  { name: 'Bastet',    type: 'creature', value:  4, art_emoji: '🐱', flavor_text: 'Cat goddess of protection. Purrs before she strikes.' },
  { name: 'Set',       type: 'creature', value:  3, art_emoji: '🌪️', flavor_text: 'God of chaos and the desert. Unpredictable by design.' },
  { name: 'Sobek',     type: 'creature', value:  3, art_emoji: '🐊', flavor_text: 'The crocodile god. The Nile belongs to him.' },
  { name: 'Hathor',    type: 'creature', value:  2, art_emoji: '🐄', flavor_text: 'Goddess of love and music. Her favor is worth having.' },
  { name: 'Sphinx',    type: 'creature', value: -3, art_emoji: '🗿', flavor_text: 'Answers only to those who solve the riddle. Most do not.' },
  { name: 'Nefertiti', type: 'creature', value: -1, art_emoji: '💎', flavor_text: 'Her beauty was legendary. Her power, quietly devastating.' },
  // ITEMS (8)
  { name: 'Ankh',                   type: 'item', operator: '+3', operator_value:  3, art_emoji: '☥',  effect_text: 'Add +3 to one creature.', flavor_text: 'Symbol of eternal life. It adds up.' },
  { name: 'Eye of Ra',              type: 'item', operator: '+5', operator_value:  5, art_emoji: '👁️', effect_text: 'Add +5 to one creature.', flavor_text: 'The all-seeing eye grants tremendous power.' },
  { name: 'Scarab Amulet',          type: 'item', operator: '+1', operator_value:  1, art_emoji: '🪲', effect_text: 'Add +1 to one creature.', flavor_text: 'Small but sacred. Every point counts.' },
  { name: 'Serpent Crown',          type: 'item', operator: '+2', operator_value:  2, art_emoji: '🐍', effect_text: 'Add +2 to one creature.', flavor_text: 'The double crown of a unified Egypt.' },
  { name: 'Lotus Blossom',          type: 'item', operator: '+1', operator_value:  1, art_emoji: '🌸', effect_text: 'Add +1 to one creature.', flavor_text: 'Symbol of rebirth. Even a small revival helps.' },
  { name: 'Book of the Dead',       type: 'item', operator: '-3', operator_value: -3, art_emoji: '📖', effect_text: 'Subtract 3 from one creature.', flavor_text: 'Contains spells for the afterlife. Deadly in the wrong hands.' },
  { name: 'Mummification Bandages', type: 'item', operator: '-2', operator_value: -2, art_emoji: '🩹', effect_text: 'Subtract 2 from one creature.', flavor_text: 'Preservation at a price.' },
  { name: 'Golden Mask',            type: 'item', operator: '+5', operator_value:  5, art_emoji: '🎭', effect_text: 'Add +5 to one creature.', flavor_text: 'The face of the pharaoh in death. Priceless.' },
  // ACTIONS (6)
  { name: 'Solar Flare',       type: 'action', operator: '×10',   operator_value:  10,  art_emoji: '🌞', effect_text: "Multiply one creature's value by 10.", flavor_text: "The full wrath of Ra. Nothing survives at full force." },
  { name: "Pyramid's Power",   type: 'action', operator: '×5',    operator_value:  5,   art_emoji: '🔺', effect_text: "Multiply one creature's value by 5.", flavor_text: 'Amplified by ancient geometry that still defies explanation.' },
  { name: 'Flood Season',      type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '🌊', effect_text: "Multiply one creature's value by 2.", flavor_text: "The Nile's annual gift. Everything doubles in its wake." },
  { name: 'Plague of Locusts', type: 'action', operator: '÷2',    operator_value:  0.5, art_emoji: '🦗', effect_text: "Divide one creature's value by 2.", flavor_text: 'They consumed half of everything. Exactly half.' },
  { name: 'Desert Winds',      type: 'action', operator: '÷5',    operator_value:  0.2, art_emoji: '💨', effect_text: "Divide one creature's value by 5.", flavor_text: 'The desert scatters all power to the wind.' },
  { name: "Mummy's Curse",     type: 'action', operator: '×(-2)', operator_value: -2,   art_emoji: '⚰️', effect_text: "Multiply one creature's value by -2.", flavor_text: 'The curse doubles its target and inverts it. Beware.' },
  // EVENTS (2)
  { name: 'Sand Storm',      type: 'event', effect_type: 'swap',   art_emoji: '🌪️', effect_text: 'Swap: Exchange any two creatures between sides.', flavor_text: 'The desert rearranges everything. Nothing stays where you left it.' },
  { name: 'Buried Treasure', type: 'event', effect_type: 'square', art_emoji: '🏺', effect_text: "x²: Square one creature's current value.", flavor_text: 'Beneath the sand, the reward grows beyond imagination.' },
];

async function seedR7() {
  // Upsert the release
  const { data: releaseRows, error: relErr } = await supabase
    .from('releases')
    .upsert({ number: 7, name: 'Egyptian Mythology', icon: '𓂀', color_hex: '#c9a96e' }, { onConflict: 'number' })
    .select();
  if (relErr) { console.error('Release error:', relErr); process.exit(1); }
  const release = releaseRows![0];
  console.log(`Release 7 upserted (id: ${release.id})`);

  const { error: cardErr } = await supabase
    .from('cards')
    .insert(r7Cards.map(c => ({ ...c, release_id: release.id })));
  if (cardErr) { console.error('Cards error:', cardErr); process.exit(1); }
  console.log(`Inserted ${r7Cards.length} cards for Release 7 — Egyptian Mythology`);
}

seedR7();
