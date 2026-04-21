# Generate Card Art

Generate AI artwork for cards in one release using Gemini Imagen, upload to Supabase Storage, and update card records with the new art_url.

---

## Release Artistic Styles

Each release has a locked visual style. Every card in that release must be rendered in that style — do not mix styles.

| # | Theme | Style Directive |
|---|-------|----------------|
| 1 | Greek Mythology | **Neoclassical oil painting** — marble textures, deep cerulean and gold palette, formal symmetrical composition, divine light from above, reminiscent of Jacques-Louis David |
| 2 | Wild West | **Vintage sepia daguerreotype / woodcut** — warm burnt sienna and tan, scratched aged texture, dusty frontier landscapes, dramatic silhouettes at sunset |
| 3 | Dinosaurs | **Victorian natural history illustration** — precise linework like Audubon plates, earth tones and jungle greens, botanical-scientific composition, white vignette border |
| 4 | Outer Space | **NASA concept art meets retro 1960s pulp sci-fi** — deep navy background, electric cyan and silver, geometric retro spacecraft shapes, cosmic scale |
| 5 | Music | **Art Deco poster / 1970s psychedelic album cover** — bold geometric patterns, vibrant neons on black, musical notation elements, swirling color gradients |
| 6 | Zombies | **Spooky-fun Halloween cartoon** — muted greens, purples, and grays with warm amber accents, expressive cartoonish characters, bold outlines, Goosebumps/children's graphic novel style, no blood or gore, suitable for ages 8+ |

---

## Workflow

### Step 1 — Choose a release

Ask the user which release number to generate art for (1–6). Confirm the theme and style.

### Step 2 — Check which cards need art

Run this query against the project's Supabase instance to find cards without art_url:

```typescript
// scripts/check-missing-art.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ local: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const { data } = await supabase
  .from('cards')
  .select('id, name, type, art_emoji, flavor_text')
  .eq('release_id', RELEASE_ID)
  .is('art_url', null);

console.log(JSON.stringify(data, null, 2));
```

Run with: `npx tsx scripts/check-missing-art.ts`

List all cards needing art to the user before generating.

### Step 3 — Generate image prompts

For each card, compose a prompt using this template:

```
[STYLE DIRECTIVE for release]. Subject: [card name], a [card type] card. [Specific visual description based on card name and flavor text]. Hidden somewhere in the scene, difficult to spot, is either a small stuffed panda or an all-aqua stuffed bunny rabbit — tucked into the background, partially obscured, easy to miss on first glance. Square format, portrait orientation, no text or letters in the image, suitable for a trading card game.
```

**Hidden object rule:** Every card contains either a stuffed panda or an all-aqua stuffed bunny rabbit hidden in the image. Alternate between them across the batch.

**What actually works** (confirmed through experiments — Imagen ignores hiding instructions and makes the object prominent; `gemini-2.5-flash-image` follows them):

Integrate the hidden object INTO a structural or architectural element of the scene — carved into stonework, partially visible behind a large figure, tucked behind foliage with its coloring matching the surroundings. Use this prompt pattern at the end:

```
Hidden easter egg: a tiny [stuffed panda / all-aqua stuffed bunny] is [specific location — e.g., barely visible peeking from behind the rightmost column, carved as a tiny relief into the stone wall in the upper background, half-hidden behind a tree trunk in the far background]. It is rendered in the same tones as the surrounding [stone/shadow/foliage] so it blends in. It occupies a very small area. It is NOT a subject — it is a hidden secret that requires careful inspection to find.
```

The goal: a kid who looks carefully for 30 seconds should have a chance of finding it. A kid who glances at the card should not notice it.

**Examples:**

- Release 1, Zeus (creature): *"Neoclassical oil painting in the style of Jacques-Louis David, marble textures, cerulean and gold palette. Subject: Zeus, king of the gods, depicted as a powerful bearded figure seated on a throne of clouds, right hand raised holding a lightning bolt, divine light radiating from above. Hidden in the background clouds, partially obscured and easy to miss, is a small stuffed panda rendered in the same painterly style. Square format, portrait orientation, no text or letters, trading card game art."*

- Release 3, T-Rex (creature): *"Victorian natural history illustration, precise Audubon-style linework, earth tones and jungle greens, white vignette border. Subject: Tyrannosaurus Rex in full profile, mouth open, depicted in the style of a 19th century paleontological plate with careful anatomical detail. Hidden in the lower corner foliage, barely visible among the ferns, is a small all-aqua stuffed bunny rabbit drawn in the same engraving style. Square format, no text or letters, trading card game art."*

- Release 5, Bass Drop (item): *"Art Deco poster design with 1970s psychedelic album cover aesthetics, vibrant neons on black, geometric patterns. Subject: a massive sound wave rippling outward from a glowing bass speaker, abstract and geometric, electric blue and purple hues. Hidden within the geometric wave pattern, camouflaged but findable, is a tiny stuffed panda silhouette in the same Art Deco style. Square format, no text or letters, trading card game art."*

Show the user a few sample prompts and ask for approval before generating the batch.

### Step 4 — Create the generation script

Create `scripts/generate-art.ts` with the following structure. **Requires a Google AI API key** (`GEMINI_API_KEY` in `.env.local`).

**Model choice:** Use `gemini-2.5-flash-image` (not Imagen). Experiments showed Imagen renders hidden objects as prominent subjects regardless of instructions. `gemini-2.5-flash-image` reliably integrates the hidden object into architecture/background details at a small scale.

```typescript
// scripts/generate-art.ts
// Usage: RELEASE_ID=1 npx tsx scripts/generate-art.ts
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const RELEASE_ID = parseInt(process.env.RELEASE_ID ?? '1', 10);
const OUTPUT_DIR = `./art-output/release-${RELEASE_ID}`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }); // set GEMINI_API_KEY in .env.local

// ── Paste prompts here (generated in Step 3) ──────────────────────────────
const CARD_PROMPTS: Array<{ id: number; name: string; prompt: string }> = [
  // { id: 1, name: 'Zeus', prompt: '...' },
];

async function generateAndUpload(entry: { id: number; name: string; prompt: string }) {
  console.log(`Generating: ${entry.name}`);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ role: 'user', parts: [{ text: entry.prompt }] }],
    config: { responseModalities: ['IMAGE', 'TEXT'] } as any,
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart?.inlineData?.data) throw new Error(`No image returned for ${entry.name}`);
  const imageBytes = imagePart.inlineData.data;

  // Save locally
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const localPath = path.join(OUTPUT_DIR, `${entry.id}-${entry.name.replace(/\s+/g, '-')}.png`);
  const buffer = Buffer.from(imageBytes, 'base64');
  fs.writeFileSync(localPath, buffer);
  console.log(`  Saved locally: ${localPath}`);

  // Upload to Supabase Storage
  const storagePath = `cards/release-${RELEASE_ID}/${entry.id}.png`;
  const { error: uploadError } = await supabase.storage
    .from('card-art')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });
  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage.from('card-art').getPublicUrl(storagePath);
  const publicUrl = urlData.publicUrl;
  console.log(`  Uploaded: ${publicUrl}`);

  // Update card record
  const { error: dbError } = await supabase
    .from('cards')
    .update({ art_url: publicUrl })
    .eq('id', entry.id);
  if (dbError) throw dbError;

  console.log(`  ✓ ${entry.name} done`);
}

async function main() {
  for (const entry of CARD_PROMPTS) {
    await generateAndUpload(entry);
    // Brief pause to respect API rate limits
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log('\nAll done!');
}

main().catch(console.error);
```

Install the required package if not present: `npm install @google/genai`

### Step 5 — Set up Supabase Storage bucket

If the `card-art` bucket doesn't exist yet, create it:

1. Go to Supabase dashboard → Storage → New bucket
2. Name: `card-art`
3. Public: **yes** (so art_url links work without auth)

Or run via SQL editor:
```sql
insert into storage.buckets (id, name, public)
values ('card-art', 'card-art', true)
on conflict do nothing;
```

### Step 6 — Add prompts and run

1. Fill `CARD_PROMPTS` array in `scripts/generate-art.ts` with the prompts from Step 3
2. Ensure `GEMINI_API_KEY=your-key` is in `.env.local`
3. Run: `RELEASE_ID=1 npx tsx scripts/generate-art.ts`

Watch the console. Each card logs: saved locally → uploaded → DB updated.

### Step 7 — Verify

Spot-check 2–3 cards in the Supabase dashboard (Table Editor → cards, check art_url column). Then open the live app card browser for that release and confirm images load.

If an image looks wrong, regenerate just that card by running the script with a single-entry CARD_PROMPTS array.

---

## Notes

- **API key**: Get a Google AI API key from https://aistudio.google.com/app/apikey
- **Billing required**: Image generation (Imagen 4) requires a paid plan — free tier quota is 0. Enable billing at https://ai.dev/projects before running. Pay-as-you-go; 30 cards with Imagen 4 Fast costs ~$1–3.
- **Model to use**: `imagen-4.0-fast-generate-001` for samples/drafts, `imagen-4.0-generate-001` for final quality. Use `generateImages()` not `generateContent()`.
- **Cost**: Imagen 4 charges per image. Check current pricing before generating all 30 cards in a release.
- **Local backup**: All images are saved to `./art-output/release-N/` before upload. Never lose work if upload fails.
- **Re-running**: The Supabase upload uses `upsert: true` — safe to re-run for individual cards.
- **Style consistency**: Generate all cards for one release in a single session to keep the model's style consistent. Do not split a release across multiple days/sessions.
