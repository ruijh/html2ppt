import { readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { renderSlides } from './render.js';
import { convertToPptx } from './convert.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const samplesDir = process.argv[2] || path.join(__dirname, '..', 'sample');

  let files;
  try {
    files = await readdir(samplesDir);
  } catch (err) {
    console.error(`Error: Cannot read directory ${samplesDir}: ${err.message}`);
    process.exit(1);
  }

  const htmlFiles = files.filter(f => f.endsWith('.html'));

  if (htmlFiles.length === 0) {
    console.error(`No HTML files found in ${samplesDir}`);
    process.exit(1);
  }

  console.log(`Found ${htmlFiles.length} HTML files in ${samplesDir}`);

  let success = 0;
  let failed = 0;

  for (const file of htmlFiles) {
    const htmlPath = path.join(samplesDir, file);
    const outputPath = htmlPath.replace(/\.html$/, '.pptx');

    console.log(`\nProcessing: ${file}`);
    try {
      const { buffers } = await renderSlides(htmlPath);
      console.log(`  Captured ${buffers.length} slides`);
      await convertToPptx(buffers, outputPath);
      console.log(`  → ${path.basename(outputPath)}`);
      success++;
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`);
}

main().catch(e => { console.error(`Fatal: ${e.message}`); process.exit(1); });
