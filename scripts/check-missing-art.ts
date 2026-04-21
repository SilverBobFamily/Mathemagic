import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const RELEASE_NUMBER = parseInt(process.env.RELEASE_NUMBER ?? '6', 10);

async function main() {
  const { data: release } = await supabase
    .from('releases')
    .select('id, name')
    .eq('number', RELEASE_NUMBER)
    .single();

  if (!release) { console.error('Release not found'); process.exit(1); }
  console.log(`Release ${RELEASE_NUMBER}: ${release.name} (id=${release.id})\n`);

  const { data: cards } = await supabase
    .from('cards')
    .select('id, name, type, art_emoji, flavor_text, art_url')
    .eq('release_id', release.id)
    .order('type')
    .order('name');

  const missing = cards?.filter(c => !c.art_url) ?? [];
  const have = cards?.filter(c => c.art_url) ?? [];

  console.log(`Cards with art: ${have.length}`);
  console.log(`Cards needing art: ${missing.length}\n`);

  for (const c of missing) {
    console.log(`  [${c.id}] ${c.type.padEnd(8)} ${c.name}`);
    console.log(`         "${c.flavor_text}"`);
  }
}

main().catch(console.error);
