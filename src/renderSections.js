import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';
import { readFile } from 'fs/promises';
import { RENDER } from '../scripts/common.js';

const DEFAULT_VIEWPORT = RENDER.VIEWPORT;

export async function renderSections(htmlPath, { headless = true, viewport = DEFAULT_VIEWPORT } = {}) {
  const browser = await chromium.launch({ headless, args: ['--no-sandbox'] });

  try {
    const resolvedUrl = pathToFileURL(path.resolve(htmlPath)).href;
    const htmlContent = await readFile(htmlPath, 'utf8');

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.setViewportSize(viewport);
    await page.setContent(htmlContent, { url: resolvedUrl });
    await page.waitForTimeout(1000);

    const sectionIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('section[id]')).map(s => s.id)
    );

    if (sectionIds.length === 0) {
      throw new Error(`No <section id="..."> elements found in ${htmlPath}`);
    }

    await page.addStyleTag({
      content: `.nav, body::before { display: none !important; } body { padding-top: 0 !important; } section[id] { min-height: ${viewport.height}px; overflow: hidden; box-sizing: border-box; }`
    });

    const buffers = [];
    for (const id of sectionIds) {
      const sectionEl = page.locator(`section#${id}`);
      await sectionEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      const box = await sectionEl.boundingBox();
      if (!box) {
        console.warn(`  Warning: section#${id} has no bounding box, skipping`);
        continue;
      }

      const clipY = Math.max(0, box.y);
      const clipH = Math.min(viewport.height, box.height);

      const buf = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: clipY, width: viewport.width, height: clipH }
      });
      buffers.push(buf);
    }

    await ctx.close();
    return { buffers, sectionIds, width: viewport.width };
  } finally {
    await browser.close();
  }
}
