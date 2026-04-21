import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await supabase
    .from('cards')
    .select('id, name, type, release:releases(id, number, name)')
    .is('art_url', null)
    .order('release_id')
    .order('name');
  if (error) { console.error(error); return; }
  if (!data?.length) { console.log('All cards have art!'); return; }
  for (const c of data) {
    const r = c.release as any;
    console.log(`  [id=${c.id}] "${c.name}" (${c.type}) — Release ${r.number}: ${r.name}`);
  }
  console.log(`\nTotal missing: ${data.length}`);
}
main().catch(console.error);
