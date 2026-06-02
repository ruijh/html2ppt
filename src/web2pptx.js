import { renderSections } from './renderSections.js';
import { convertToPptx } from './convert.js';

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error('Usage: node src/web2pptx.js <path-to-html>');
  process.exit(1);
}

try {
  const outputPath = htmlPath.replace(/\.html$/, '.pptx');

  console.log('Rendering sections...');
  const { buffers, sectionIds } = await renderSections(htmlPath);
  console.log(`Captured ${buffers.length} sections: ${sectionIds.join(', ')}`);

  console.log('Building PPTX...');
  await convertToPptx(buffers.map(b => b.buffer), outputPath);
  console.log(`Done: ${outputPath}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
