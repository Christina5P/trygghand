import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

const repoRoot = path.resolve(process.cwd());
const manifestPath = path.join(repoRoot, 'public/images/items/manifest.json');
const outDir = path.join(repoRoot, 'public/images/items');

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error('Missing API key. Set GEMINI_API_KEY (preferred) or GOOGLE_API_KEY.');
  process.exit(1);
}

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlyIds = onlyArg ? new Set(onlyArg.replace('--only=', '').split(',').map((s) => s.trim()).filter(Boolean)) : null;
const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(manifestPath)) {
  console.error(`Missing manifest at ${path.relative(repoRoot, manifestPath)}. Run: node scripts/item-image-prompts.mjs`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const items = manifest.items ?? [];

fs.mkdirSync(outDir, { recursive: true });

const ai = new GoogleGenAI({ apiKey });
const model = process.env.IMAGEN_MODEL || 'imagen-3.0-generate-002';

let generated = 0;
let skipped = 0;

for (const item of items) {
  if (onlyIds && !onlyIds.has(item.id)) continue;

  const outPath = path.join(outDir, `${item.id}.png`);
  if (fs.existsSync(outPath)) {
    skipped++;
    continue;
  }

  console.log(`Generating ${item.id} (${item.name}) ...`);
  if (dryRun) {
    console.log('  [dry-run] prompt:', item.prompt);
    continue;
  }

  const response = await ai.models.generateImages({
    model,
    prompt: item.prompt,
    config: {
      numberOfImages: 1,
    },
  });

  const image = response?.generatedImages?.[0]?.image;
  const bytesB64 = image?.imageBytes;

  if (!bytesB64) {
    console.warn(`  No image returned for ${item.id}.`);
    continue;
  }

  const buffer = Buffer.from(bytesB64, 'base64');
  fs.writeFileSync(outPath, buffer);
  generated++;
}

console.log(`Done. Generated: ${generated}. Skipped (already existed): ${skipped}.`);
console.log('Tip: to generate only a few, run: node scripts/generate-item-images.mjs --only=sofa-3,bed-double');
