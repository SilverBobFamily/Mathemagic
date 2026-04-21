import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function main() {
  const models = await ai.models.list();
  const imageModels = [];
  for await (const model of models) {
    if (
      model.name?.includes('imagen') ||
      model.name?.includes('image') ||
      model.supportedActions?.includes('generateImages') ||
      model.supportedGenerationMethods?.includes('generateImages') ||
      model.supportedGenerationMethods?.includes('predict')
    ) {
      imageModels.push(model.name);
    }
  }
  console.log('Image-capable models:');
  console.log(imageModels.length ? imageModels : '(none found)');

  console.log('\nAll models containing "flash" or "imagen":');
  const all = await ai.models.list();
  for await (const model of all) {
    if (model.name?.includes('flash') || model.name?.includes('imagen')) {
      console.log(' ', model.name, model.supportedGenerationMethods);
    }
  }
}
main().catch(console.error);
