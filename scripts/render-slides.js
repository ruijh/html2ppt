import { renderSlides } from '../src/render.js';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error('Usage: node scripts/render-slides.js <path-to-html>');
  process.exit(1);
}

try {
  const basename = path.basename(htmlPath, '.html');
  const outputDir = path.join(__dirname, '..', 'output', basename);
  await mkdir(outputDir, { recursive: true });

  console.log('Rendering slides...');
  const { buffers } = await renderSlides(htmlPath);

  if (buffers.length === 0) {
    console.error('No slides captured');
    process.exit(1);
  }

  console.log(`Captured ${buffers.length} slides`);

  for (let i = 0; i < buffers.length; i++) {
    const outPath = path.join(outputDir, `slide-${String(i + 1).padStart(3, '0')}.png`);
    await writeFile(outPath, buffers[i]);
    console.log(`  → ${outPath}`);
  }

  console.log(`\nSaved ${buffers.length} PNGs to ${outputDir}/`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
