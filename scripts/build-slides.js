import path from 'path';
import { readFile, writeFile } from 'fs/promises';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/build-slides.js <input.html> [output.html]');
  process.exit(1);
}

const outputPath = process.argv[3] || inputPath.replace(/\.html$/, '-幻灯片.html');

try {
  const html = await readFile(inputPath, 'utf8');

  if (html.trim().length === 0) {
    throw new Error(`Input file is empty: ${inputPath}`);
  }

  const fontsLink = (html.match(/<link[^>]*fonts\.googleapis[^>]*>/) || [])[0] || '';

  const styles = (html.match(/<style>([\s\S]*?)<\/style>/g) || [])
    .map(s => s.replace(/<\/?style>/g, ''))
    .join('\n');

  const sectionIds = [];
  const re = /<section[^>]*id="([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(html)) != null) sectionIds.push(m[1]);

  if (sectionIds.length === 0) {
    throw new Error(`No <section id="..."> elements found in ${inputPath}`);
  }

  function extractSection(html, id) {
    const startTag = `<section[^>]*id="${id}"[^>]*>`;
    const startIdx = html.search(new RegExp(startTag));
    if (startIdx === -1) return null;
    const afterStart = html.indexOf('>', startIdx) + 1;
    let depth = 1;
    let i = afterStart;
    while (i < html.length && depth > 0) {
      if (html.slice(i, i + 9) === '<section') depth++;
      else if (html.slice(i, i + 10) === '</section>') depth--;
      i++;
    }
    return html.slice(afterStart, i - 1);
  }

  const extraStyles = `
#deck { width: 1280px; height: 720px; position: relative; overflow: hidden; margin: 0 auto; }
.slide { position: absolute; inset: 0; display: none; overflow: hidden; }
.slide.active { display: block; }
.nav, body::before, .chapter-nav, .hero-scroll { display: none !important; }
section.hero, section.section { min-height: 720px; height: 720px; overflow: hidden; padding: 40px 60px; box-sizing: border-box; display: block; }
.section { max-width: 1280px; margin: 0; }
`;

  const slidesHtml = sectionIds.map((id, i) => {
    const content = extractSection(html, id);
    return `<div class="slide${i === 0 ? ' active' : ''}" id="s${i + 1}">${content || ''}</div>`;
  }).join('\n');

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
  const title = titleMatch ? titleMatch[1] : path.basename(inputPath, '.html');

  const deckHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${fontsLink}
<style>
${styles}
${extraStyles}
</style>
</head>
<body>
<div id="deck">
${slidesHtml}
</div>
</body>
</html>`;

  await writeFile(outputPath, deckHtml, 'utf8');
  console.log(`Generated: ${outputPath}`);
  console.log(`Slides: ${sectionIds.length} (${sectionIds.join(', ')})`);
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
