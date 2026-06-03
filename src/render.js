import { chromium } from 'playwright';
import path from 'path';
import { pathToFileURL } from 'url';
import { readFile } from 'fs/promises';
import { RENDER } from '../scripts/common.js';

const DEFAULT_VIEWPORT = RENDER.VIEWPORT;

export async function renderSlides(htmlPath, { headless = true, viewport = DEFAULT_VIEWPORT } = {}) {
  const browser = await chromium.launch({ headless, args: ['--no-sandbox'] });

  try {
    const resolvedUrl = pathToFileURL(path.resolve(htmlPath)).href;
    const htmlContent = await readFile(htmlPath, 'utf8');

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.setViewportSize(viewport);
    await page.setContent(htmlContent, { url: resolvedUrl });

    const slideCount = await page.locator('.slide').count();
    if (slideCount === 0) {
      throw new Error(`No .slide elements found in ${htmlPath}`);
    }

    await page.addStyleTag({ content: '#nav, #cnt { display: none !important; }' });

    const buffers = [];

    for (let i = 0; i < slideCount; i++) {
      await page.evaluate((idx) => {
        // 强制覆盖所有 slide 的显示和可见性状态，统一通过内联样式控制
        // 这样可以兼容三种 HTML 格式：
        // - frontend-slides / guizang-ppt: 通过 .active 类控制 (opacity/visibility)
        // - html-ppt-skill: 通过 .is-active 类控制 (display/flex)
        document.querySelectorAll('.slide').forEach((s) => {
          s.style.display = 'none';
          s.style.opacity = '0';
          s.style.visibility = 'hidden';
          // 移除可能干扰的类
          s.classList.remove('active', 'is-active');
        });
        const target = document.querySelectorAll('.slide')[idx];
        if (target) {
          target.style.display = 'flex';
          target.style.opacity = '1';
          target.style.visibility = 'visible';
        }
      }, i);
      await page.waitForTimeout(300);

      const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: viewport.width, height: viewport.height }
      });
      buffers.push(buffer);
    }

    await ctx.close();
    return { buffers, width: viewport.width, height: viewport.height };
  } finally {
    await browser.close();
  }
}