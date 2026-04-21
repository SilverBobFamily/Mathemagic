/**
 * Experiments to get a genuinely hard-to-find hidden object.
 * Run: npx tsx scripts/sample-art.ts
 * Results in ./art-samples/
 */
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ZOMBIE_STYLE = "Spooky-fun Halloween cartoon in the style of a Goosebumps book cover — muted greens, purples, grays, amber accents, bold black outlines, expressive characters, no blood or gore, ages 8+";

const SAMPLES: Array<{ name: string; model: 'imagen' | 'gemini'; prompt: string }> = [

  // ── Approach F — gemini-2.5-flash-image, explicit hiding challenge ────────
  {
    name: 'ZombieHorde-F-gemini-panda',
    model: 'gemini',
    prompt: `Draw trading card art for a card called "Zombie Horde" in a Goosebumps-style cartoon: a massive crowd of goofy cartoonish zombies filling the image edge to edge under a full moon, arms outstretched, shambling forward. Muted greens, purples, grays, amber accents. Bold outlines. Fun spooky, no gore, ages 8+. Square format. No text in the image.

The image contains one hidden easter egg: a tiny stuffed panda toy, the size of a fist, tucked partially behind a zombie in the mid-background — it is shadowed to match the surrounding tones, more than half-obscured behind the zombie body, and genuinely difficult to spot without looking carefully. It is NOT in the foreground and is NOT lit or highlighted.`,
  },

  // ── Approach G — gemini, graveyard scene ─────────────────────────────────
  {
    name: 'Graveyard-G-gemini-bunny',
    model: 'gemini',
    prompt: `Draw trading card art for a card called "Undead Rising" in a Goosebumps Halloween cartoon style: spooky graveyard at night, cartoon skeletal hands breaking through the earth, tilting tombstones, bats against a full moon. Muted greens, grays, purples. Bold black outlines. Fun spooky, no gore, ages 8+. Square format. No text.

Hidden easter egg: a very small all-aqua stuffed bunny rabbit is partially visible peeking from behind one of the far gravestones in the background — it is rendered in dark shadowed muted tones so it blends with its surroundings, and at least half of it is occluded by the gravestone. It should be a genuine challenge to find. It is a background detail, not a subject.`,
  },

  // ── Approach I — gemini, plague doctor ───────────────────────────────────
  {
    name: 'PlagueDoctor-I-gemini-panda',
    model: 'gemini',
    prompt: `Draw trading card art for a card called "Plague Doctor" in a Goosebumps-style Halloween cartoon: a mysterious plague doctor in a classic bird-beak mask and wide-brimmed hat, long dark coat, gnarled cane, silhouetted against a foggy purple night sky. Crumbling stone doorway framing the figure, cobwebs, candles on ledges, bare twisted trees. Muted colors. Bold outlines. Spooky but fun, ages 8+. Square format. No text.

Hidden easter egg: a tiny stuffed panda is barely visible deep in the upper background, partially hidden behind the stone archway in shadow, colored in the same dark gray as the stone around it. It occupies a very small area of the image. It blends in. The panda is not a subject — it is a secret.`,
  },
];

fs.mkdirSync('./art-samples', { recursive: true });

async function generateImagen(name: string, prompt: string) {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-fast-generate-001',
    prompt,
    config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/png' },
  });
  const bytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!bytes) throw new Error('No image returned');
  const outPath = `./art-samples/${name}.png`;
  fs.writeFileSync(outPath, Buffer.from(bytes, 'base64'));
  return outPath;
}

async function generateGemini(name: string, prompt: string) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseModalities: ['IMAGE', 'TEXT'] } as any,
  });
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart?.inlineData?.data) throw new Error('No image in response');
  const outPath = `./art-samples/${name}.png`;
  fs.writeFileSync(outPath, Buffer.from(imagePart.inlineData.data, 'base64'));
  return outPath;
}

async function main() {
  for (const s of SAMPLES) {
    console.log(`\nGenerating [${s.model}]: ${s.name}...`);
    try {
      const out = s.model === 'imagen'
        ? await generateImagen(s.name, s.prompt)
        : await generateGemini(s.name, s.prompt);
      console.log(`  Saved: ${out}`);
    } catch (e: any) {
      console.error(`  Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log('\nDone. Check ./art-samples/');
}

main().catch(console.error);
