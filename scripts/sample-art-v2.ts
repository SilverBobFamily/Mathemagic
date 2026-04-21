/**
 * Generates 4 style-check samples — one per release style.
 * Run: npx tsx scripts/sample-art-v2.ts
 * Results saved to ./art-samples/v2/
 */
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const OUT = './art-samples/v2';

const SAMPLES = [
  {
    name: 'R1-Zeus-panda',
    prompt: `Neoclassical oil painting in the style of Jacques-Louis David, marble textures, deep cerulean and gold palette, formal symmetrical composition, divine light from above. Subject: Zeus, king of the gods, a majestic bearded figure enthroned on stormclouds, right arm raised with a crackling lightning bolt, golden divine light radiating from above, flanked by marble columns. Hidden easter egg: a tiny stuffed panda is barely visible tucked behind the base of the rightmost marble column in the deep background, rendered in the same pale ivory and shadow tones of the stone so it blends in. It occupies a very small area of the image. It is NOT a subject — it is a hidden secret that requires careful inspection to find. Square format, portrait orientation, no text or letters in the image, suitable for a trading card game.`,
  },
  {
    name: 'R2-WantedPoster-bunny',
    prompt: `Vintage sepia daguerreotype and woodcut illustration, warm burnt sienna and tan tones, scratched aged texture, dusty frontier landscapes, dramatic silhouettes at sunset. Subject: a weathered Wanted Poster nailed to a splintered wooden post on a dusty frontier road, the paper torn at the edges, a shadowy outlaw portrait sketched in the center, cacti and a setting sun behind it. Hidden easter egg: a tiny all-aqua stuffed bunny is barely visible sitting at the base of the wooden post in the background, its color matching the same warm sand tones of the desert floor around it, more than half-obscured by dust and shadow. It occupies a very small area. It is NOT a subject. Square format, portrait orientation, no text or letters, trading card game art.`,
  },
  {
    name: 'R4-BlackHole-bunny',
    prompt: `NASA retro concept art meets 1960s pulp sci-fi illustration, deep navy background, electric cyan and silver, geometric spacecraft shapes, cosmic scale. Subject: a Black Hole depicted as a perfect geometric void surrounded by an accretion disk of electric cyan and silver light spiraling inward in concentric arcs, dramatic cosmic scale, stars warping at the edges. Hidden easter egg: a tiny all-aqua stuffed bunny is barely visible, camouflaged within a dark dust cloud in the far upper corner of the image, its form rendered in the same navy-gray tones as the surrounding cosmic cloud. It occupies a very small area. It is NOT a subject. Square format, portrait orientation, no text or letters, trading card game art.`,
  },
  {
    name: 'R6-PlagueDoctor-panda',
    prompt: `Spooky-fun Halloween cartoon in the Goosebumps children's book cover style, muted greens, purples and grays, warm amber accents, bold black outlines, expressive characters, no blood or gore, ages 8+. Subject: a Plague Doctor in a long bird-beak mask and wide-brimmed hat, dark coat, holding a gnarled cane, standing in a foggy cobblestone alley with flickering amber lanterns. Hidden easter egg: a tiny stuffed panda is barely visible peeking from behind a stone chimney in the upper background, colored in the same dark gray-purple as the foggy stonework around it, its form blending into the architecture. It occupies a very small area. It is NOT a subject. Square format, portrait orientation, no text or letters, trading card game art.`,
  },
];

async function generate(name: string, prompt: string) {
  console.log(`Generating: ${name}...`);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseModalities: ['IMAGE', 'TEXT'] } as any,
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!img?.inlineData?.data) throw new Error(`No image returned for ${name}`);
  const out = `${OUT}/${name}.png`;
  fs.writeFileSync(out, Buffer.from(img.inlineData.data, 'base64'));
  console.log(`  Saved: ${out}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const s of SAMPLES) {
    try {
      await generate(s.name, s.prompt);
    } catch (e: any) {
      console.error(`  Error (${s.name}): ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\nDone. Check ./art-samples/v2/');
}

main().catch(console.error);
