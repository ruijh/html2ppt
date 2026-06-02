import { chromium } from 'playwright';
import path from 'path';
import { readFile } from 'fs/promises';

export async function renderSlides(htmlPath, { headless = true } = {}) {
  const browser = await chromium.launch({ headless, args: ['--no-sandbox'] });

  try {
    const fileUrl = path.resolve(htmlPath).replace(/\\/g, '/');
    const htmlContent = await readFile(htmlPath, 'utf8');

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setContent(htmlContent, { url: `file:///${fileUrl}` });

    const slideCount = await page.locator('.slide').count();
    if (slideCount === 0) {
      throw new Error(`No .slide elements found in ${htmlPath}`);
    }

    await page.addStyleTag({ content: '#nav, #cnt { display: none !important; }' });

    const slideIds = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.slide')).map(s => s.id)
    );

    const buffers = [];

    for (let i = 0; i < slideCount; i++) {
      await page.evaluate((idx) => {
        document.querySelectorAll('.slide').forEach((s) => {
          s.style.display = 'none';
        });
        const target = document.querySelectorAll('.slide')[idx];
        if (target) target.style.display = 'block';
      }, i);
      await page.waitForTimeout(300);

      const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });
      buffers.push(buffer);
    }

    await ctx.close();
    return { buffers, width: 1280, height: 720 };
  } finally {
    await browser.close();
  }
}