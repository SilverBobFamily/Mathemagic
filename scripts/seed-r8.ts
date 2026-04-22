import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const r8Cards = [
  // CREATURES (21)
  { name: 'Josh (Dad)',        type: 'creature', value:  10, art_emoji: '👨‍💻', flavor_text: 'Created this game. Wrote his own card.' },
  { name: 'Rachel (Mom)',      type: 'creature', value:  10, art_emoji: '💚',  flavor_text: 'Keeps everything running. Somehow.' },
  { name: 'Gana',              type: 'creature', value:   9, art_emoji: '🫶',  flavor_text: '95 years of wisdom. Still the most powerful person in any room.' },
  { name: 'Nana & Papa',       type: 'creature', value:   8, art_emoji: '🏡',  flavor_text: 'Double the wisdom, double the cookies.' },
  { name: 'Grandpa & Judy',    type: 'creature', value:   7, art_emoji: '🎣',  flavor_text: "They've seen it all. They're not worried." },
  { name: 'Readee McGee',      type: 'creature', value:   5, art_emoji: '📚',  flavor_text: 'Always has his nose in a book. He knows things.' },
  { name: 'Blue Lou',          type: 'creature', value:   5, art_emoji: '💙',  flavor_text: 'Cool, calm, and perpetually fabulous.' },
  { name: 'Anna',              type: 'creature', value:   4, art_emoji: '🌸',  flavor_text: 'Steady. Reliable. Always there.' },
  { name: 'Watchee McGee',     type: 'creature', value:   3, art_emoji: '📺',  flavor_text: 'Eyes on the screen. Knows more than he lets on.' },
  { name: 'Danny',             type: 'creature', value:   3, art_emoji: '🔥',  flavor_text: 'Shows up ready. Every time.' },
  { name: 'Benny',             type: 'creature', value:   3, art_emoji: '💪',  flavor_text: 'Small but mighty. Never count him out.' },
  { name: 'Abby',              type: 'creature', value:   3, art_emoji: '🐾',  flavor_text: 'Pure joy, unconditional. Four legs optional.' },
  { name: 'Hearee McGee',      type: 'creature', value:   2, art_emoji: '👂',  flavor_text: 'Hears everything, pretends otherwise. Classic panda move.' },
  { name: 'Melvin',            type: 'creature', value:   1, art_emoji: '🤓',  flavor_text: "Goes by Steve now. Steve prefers it that way." },
  { name: 'Maple',             type: 'creature', value:   1, art_emoji: '🇨🇦', flavor_text: "Sweet on the outside, proudly Canadian. Don't test her." },
  { name: 'Dizzy McGee',       type: 'creature', value:   1, art_emoji: '😵‍💫', flavor_text: "Impossibly fluffy. Spins for fun. He's having a great time." },
  { name: 'Meh McGee',         type: 'creature', value:   0, art_emoji: '😑',  flavor_text: 'Absolutely unbothered. Perfectly neutral. A true 0.' },
  { name: 'Squatchy',          type: 'creature', value:  -1, art_emoji: '🦶',  flavor_text: 'Definitely real. Definitely watching. Probably judging.' },
  { name: 'Blippy Sue',        type: 'creature', value:  -2, art_emoji: '💫',  flavor_text: 'Southern charm at full speed. Gracious, quick, and genuinely delightful.' },
  { name: 'CiCi',              type: 'creature', value:  -3, art_emoji: '💨',  flavor_text: 'She means well. We all suffer for it.' },
  { name: 'Luna',              type: 'creature', value:  -5, art_emoji: '🧛‍♀️', flavor_text: 'Only comes out at night. Beware.' },
  // ITEMS (12)
  { name: 'Shabbat Dinner',       type: 'item', operator: '+5', operator_value:  5, art_emoji: '🕯️', effect_text: 'Add +5 to one creature.',      flavor_text: 'Every Friday, without fail. The table is always full.' },
  { name: 'Lake House',           type: 'item', operator: '+4', operator_value:  4, art_emoji: '🌊',  effect_text: 'Add +4 to one creature.',      flavor_text: 'Where everyone wants to be. The math just works out better there.' },
  { name: 'Library Books',        type: 'item', operator: '+3', operator_value:  3, art_emoji: '📖',  effect_text: 'Add +3 to one creature.',      flavor_text: 'Due in three weeks. Renewed twice already.' },
  { name: "Angel's Potatoes",     type: 'item', operator: '+2', operator_value:  2, art_emoji: '🥔',  effect_text: 'Add +2 to one creature.',      flavor_text: 'Cubed, golden, perfect. The benchmark for all other potatoes.' },
  { name: 'Pottery Wheel',        type: 'item', operator: '+2', operator_value:  2, art_emoji: '🏺',  effect_text: 'Add +2 to one creature.',      flavor_text: 'Centering. Grounding. Surprisingly calming.' },
  { name: 'Yogibo',               type: 'item', operator: '+2', operator_value:  2, art_emoji: '🛋️', effect_text: 'Add +2 to one creature.',      flavor_text: "Sits you down. Holds you there. You don't mind." },
  { name: 'Robo-Sushi',           type: 'item', operator: '+1', operator_value:  1, art_emoji: '🍣',  effect_text: 'Add +1 to one creature.',      flavor_text: 'The best part is watching it go by. The second best is eating it.' },
  { name: 'Bruno (the Rhinocorn)', type: 'item', operator: '+1', operator_value:  1, art_emoji: '🦏', effect_text: 'Add +1 to one creature.',      flavor_text: 'One part rhino, one part unicorn, one hundred percent magnificent.' },
  { name: '3D Printer',           type: 'item', operator: '+0', operator_value:  0, art_emoji: '🖨️', effect_text: 'Add +0 to one creature.',      flavor_text: "Sometimes works. Sometimes doesn't. Today is a mystery." },
  { name: 'Legos',                type: 'item', operator: '-1', operator_value: -1, art_emoji: '🧱',  effect_text: 'Subtract 1 from one creature.', flavor_text: 'Endless creativity. Until 2am. Barefoot. In the dark.' },
  { name: 'Monkeys!',             type: 'item', operator: '-2', operator_value: -2, art_emoji: '🐒',  effect_text: 'Subtract 2 from one creature.', flavor_text: 'The answer to life, the universe, and everything. Not 42.' },
  { name: "Dad's Softball Gear",  type: 'item', operator: '-3', operator_value: -3, art_emoji: '⚾',  effect_text: 'Subtract 3 from one creature.', flavor_text: "It's in the trunk. It will always be in the trunk." },
  // ACTIONS (9)
  { name: 'Get Coached',      type: 'action', operator: '×10',   operator_value:  10,  art_emoji: '📋', effect_text: "Multiply one creature's value by 10.", flavor_text: 'Dad does this for a living. Family rates apply.' },
  { name: 'Build with Legos', type: 'action', operator: '×5',    operator_value:  5,   art_emoji: '🧱', effect_text: "Multiply one creature's value by 5.",  flavor_text: 'The floor is a minefield. The creation is magnificent.' },
  { name: 'Dance Party',      type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '🪩', effect_text: "Multiply one creature's value by 2.",  flavor_text: 'Spontaneous. Inevitable. No one is excused.' },
  { name: 'Watch Bluey',      type: 'action', operator: '×2',    operator_value:  2,   art_emoji: '🦘', effect_text: "Multiply one creature's value by 2.",  flavor_text: 'Educational, emotional, somehow better than adult television.' },
  { name: 'Take A Nap',       type: 'action', operator: '×(-2)', operator_value: -2,   art_emoji: '😴', effect_text: "Multiply one creature's value by −2.", flavor_text: "Mom's down for the count (again). The inmates are running the asylum." },
  { name: 'Go to Shul',       type: 'action', operator: '÷2',    operator_value:  0.5, art_emoji: '✡️', effect_text: "Divide one creature's value by 2.",   flavor_text: 'Community, tradition, and a lot of standing and sitting.' },
  { name: 'Screen Time!',     type: 'action', operator: '÷5',    operator_value:  0.2, art_emoji: '📱', effect_text: "Divide one creature's value by 5.",   flavor_text: 'Just five more minutes. For the fifth time.' },
  { name: "Papa Tells A Story", type: 'action', operator: '÷5', operator_value:  0.2, art_emoji: '💬', effect_text: "Divide one creature's value by 5.",   flavor_text: '"Take three more bites and I\'ll tell you the best story I\'ve ever told about Spidey. Or Chase. Or Pikachu."' },
  { name: 'Run Out of Gas',   type: 'action', operator: '×(-1)', operator_value: -1,   art_emoji: '⛽', effect_text: "Flip one creature's value to its opposite.", flavor_text: "Aunt Wendy's signature move. The car had opinions." },
  // EVENTS (3)
  { name: 'QFaRT',           type: 'event', effect_type: 'reset',       art_emoji: '📚', effect_text: 'Reset: Return one creature to its original base value.',        flavor_text: "Quality Family Reading Time. aka 'Let's read books and ignore each other.'" },
  { name: 'Family Vacation', type: 'event', effect_type: 'reverse_all', art_emoji: '🚗', effect_text: 'Reverse All: Flip the signs of every creature on one side.',    flavor_text: "Spent a fortune on the resort. The best memory is the gas station hot dogs at midnight." },
  { name: 'Sibling Love',    type: 'event', effect_type: 'multi_zero',  art_emoji: '💔', effect_text: 'Family Brawl: Zero out all creatures on one side.',             flavor_text: 'They just have a funny way of showing how much they love each other.' },
];

async function seedR8() {
  const { data: releaseRows, error: relErr } = await supabase
    .from('releases')
    .upsert({ number: 8, name: 'SilverBobs', icon: '🩶', color_hex: '#9e9e9e' }, { onConflict: 'number' })
    .select();
  if (relErr) { console.error('Release error:', relErr); process.exit(1); }
  const release = releaseRows![0];
  console.log(`Release 8 upserted (id: ${release.id})`);

  const { error: cardErr } = await supabase
    .from('cards')
    .insert(r8Cards.map(c => ({ ...c, release_id: release.id })));
  if (cardErr) { console.error('Cards error:', cardErr); process.exit(1); }
  console.log(`Inserted ${r8Cards.length} cards for Release 8 — SilverBobs`);
}

seedR8();
