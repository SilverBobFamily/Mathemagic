import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const R1 = `Neoclassical oil painting in the style of Jacques-Louis David, marble textures, deep cerulean and gold palette, formal symmetrical composition, divine light from above`;
const R3 = `Victorian natural history illustration with precise Audubon-style linework, earth tones and jungle greens, botanical-scientific composition, white vignette border`;
const R5 = `Art Deco poster design with 1970s psychedelic album cover aesthetics, bold geometric patterns, vibrant neons on black, musical notation elements, swirling color gradients`;
const CLOSE = `Square format, portrait orientation, no text or letters in the image, suitable for a trading card game.`;
const panda = (loc: string, match: string) =>
  `Hidden easter egg: a tiny stuffed panda is ${loc}, rendered in the same ${match} so it blends in. It occupies a very small area of the image. It is NOT a subject — it is a hidden secret that requires careful inspection to find.`;
const bunny = (loc: string, match: string) =>
  `Hidden easter egg: a tiny all-aqua stuffed bunny is ${loc}, rendered in the same ${match} so it blends in. It occupies a very small area of the image. It is NOT a subject — it is a hidden secret that requires careful inspection to find.`;

const TARGETS = [
  {
    id: 22, name: 'Midas Touch', releaseNum: 1,
    prompt: `${R1}. Subject: King Midas surrounded by everything accidentally turned to solid gold — his throne, fruit, a wine cup — everything glittering, his hands raised in horror and wonder, palatial chamber behind him. ${bunny('barely visible already turned to gold on a shelf in the background, only its shape giving it away', 'gleaming gold tones of all the transformed objects')} ${CLOSE}`,
  },
  {
    id: 24, name: 'Wrath of Ares', releaseNum: 1,
    prompt: `${R1}. Subject: Ares unleashing divine wrath on a battlefield, armored in blazing crimson, sword sweeping in a wide arc surrounded by divine fire, defeated warriors falling away, smoky dramatic sky. ${bunny('barely visible in the distant battlefield rubble in the background', 'ash-gray and smoke tones of the ruined battlefield background')} ${CLOSE}`,
  },
  {
    id: 84, name: 'Herd Stampede', releaseNum: 3,
    prompt: `${R3}. Subject: a herd of dinosaurs stampeding across an open prehistoric plain, depicted in Victorian natural history panorama style showing multiple species in motion, dramatic earth tones, dust rising, white vignette border. ${panda('barely visible in the dust cloud at the far right edge of the stampede', 'warm tan-gray of the billowing prehistoric dust')} ${CLOSE}`,
  },
  {
    id: 128, name: 'Sound Engineer', releaseNum: 5,
    prompt: `${R5}. Subject: a sound engineer at a massive geometric mixing console in 1970s studio style, sliding faders shown as Art Deco geometric columns, VU meters as bold neon arcs, psychedelic color gradients, neons on black. ${bunny('barely visible behind the mixing console in the shadow of the studio background', 'dark shadow of the studio wall behind the equipment')} ${CLOSE}`,
  },
  {
    id: 146, name: 'Acoustic Set', releaseNum: 5,
    prompt: `${R5}. Subject: an acoustic guitar depicted in Art Nouveau style with psychedelic 1970s color treatment, geometric soundhole patterns, flowing organic curves contrasting with bold geometric sound wave shapes, neons on black. ${bunny('barely visible in the geometric soundhole pattern within the guitar body', 'dark interior black of the acoustic guitar body soundhole')} ${CLOSE}`,
  },
];

async function generateAndUpload(t: typeof TARGETS[0]) {
  console.log(`Generating: ${t.name} (id=${t.id})`);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ role: 'user', parts: [{ text: t.prompt }] }],
    config: { responseModalities: ['IMAGE', 'TEXT'] } as any,
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!img?.inlineData?.data) throw new Error(`No image returned`);
  const buffer = Buffer.from(img.inlineData.data, 'base64');

  const outDir = `./art-output/release-${t.releaseNum}`;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${t.id}-${t.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`), buffer);
  console.log(`  Saved locally`);

  const storagePath = `cards/release-${t.releaseNum}/${t.id}.png`;
  const { error: uploadError } = await supabase.storage
    .from('card-art').upload(storagePath, buffer, { contentType: 'image/png', upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('card-art').getPublicUrl(storagePath);
  const { error: dbError } = await supabase.from('cards').update({ art_url: urlData.publicUrl }).eq('id', t.id);
  if (dbError) throw dbError;
  console.log(`  ✓ ${urlData.publicUrl}`);
}

async function main() {
  for (const t of TARGETS) {
    try { await generateAndUpload(t); }
    catch (e: any) { console.error(`  ✗ ${t.name}: ${e.message}`); }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\nDone.');
}
main().catch(console.error);
