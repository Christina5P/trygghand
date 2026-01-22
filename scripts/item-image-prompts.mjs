import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const itemsFile = path.join(repoRoot, 'src/portal/cube-planner/data/items.ts');
const outDir = path.join(repoRoot, 'public/images/items');
const outManifest = path.join(outDir, 'manifest.json');
const outCsv = path.join(outDir, 'prompts.csv');
const outTxt = path.join(outDir, 'prompts.txt');

const source = fs.readFileSync(itemsFile, 'utf8');

// Extract (id, name) pairs from the movingItems array.
// This is intentionally simple and assumes the current data-file formatting.
const re = /\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'/g;
const seen = new Set();
const items = [];

let match;
while ((match = re.exec(source))) {
  const id = match[1];
  const name = match[2];
  if (seen.has(id)) continue;
  seen.add(id);

  const filename = `${id}.png`;
  const file = `/images/items/${filename}`;
  const prompt = [
    `Fotorealistisk produktbild av en ${name} på ren vit bakgrund.`,
    `Centrerad, mjuk skugga, hög detalj.`,
    `Inga människor, inga logotyper, inga varumärken, ingen text.`,
    `Format: kvadratisk bild.`
  ].join(' ');

  items.push({ id, name, filename, file, prompt });
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outManifest, JSON.stringify({ generatedAt: new Date().toISOString(), items }, null, 2));

// CSV (Excel/Sheets-friendly)
const csvHeader = 'id,name,filename,prompt\n';
const csvLines = items.map((it) => {
  const esc = (v) => `"${String(v).replaceAll('"', '""')}"`;
  return [it.id, it.name, it.filename, it.prompt].map(esc).join(',');
});
fs.writeFileSync(outCsv, csvHeader + csvLines.join('\n') + '\n');

// TXT (copy/paste-friendly)
const txt = items
  .map((it) => `${it.filename}\n${it.prompt}\n`)
  .join('\n');
fs.writeFileSync(outTxt, txt);

console.log(`Wrote ${items.length} prompts to:`);
console.log(`- ${path.relative(repoRoot, outManifest)}`);
console.log(`- ${path.relative(repoRoot, outCsv)}`);
console.log(`- ${path.relative(repoRoot, outTxt)}`);
console.log('Example:', items[0]);
