import PptxGenJS from 'pptxgenjs';

export async function convertToPptx(buffers, outputPath) {
  if (!buffers || buffers.length === 0) {
    throw new Error('No slide images to convert');
  }
  if (!Buffer.isBuffer(buffers[0])) {
    throw new Error('Invalid slide image: expected Buffer, got ' + typeof buffers[0]);
  }

  const pptx = new PptxGenJS();

  pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 5.625 });
  pptx.layout = 'CUSTOM';

  for (const buffer of buffers) {
    const slide = pptx.addSlide();
    slide.addImage({
      data: `image/png;base64,${buffer.toString('base64')}`,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%'
    });
  }

  await pptx.writeFile({ fileName: outputPath });
}
