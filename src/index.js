import { renderSlides } from './render.js';
import { convertToPptx } from './convert.js';

const htmlPath = process.argv[2];
if (!htmlPath) {
  console.error('Usage: node src/index.js <path-to-html>');
  process.exit(1);
}

try {
  const outputPath = htmlPath.replace(/\.html$/, '.pptx');

  console.log('Rendering slides...');
  const { buffers } = await renderSlides(htmlPath);
  console.log(`Captured ${buffers.length} slides`);

  console.log('Building PPTX...');
  await convertToPptx(buffers, outputPath);
  console.log(`Done: ${outputPath}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
