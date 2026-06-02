# html2ppt

将 HTML 幻灯片和网页内容转换为 PowerPoint（PPTX）文件。支持两种输入格式：

1. **幻灯片模式** — 带 `.slide` 类的 HTML 课件/演示文稿
2. **网页模式** — `<section id="...">` 结构的长文报告/白皮书

## 依赖

- Node.js 18+
- Chromium（Playwright 自动安装）

## 安装

```bash
npm install
```

## 使用

### 幻灯片模式（html2ppt）

适用于带 `.slide` 类的 HTML 幻灯片

```bash
# 单文件转换
node src/index.js <path-to-slides.html>

# 批量转换目录下所有 HTML
node src/batch.js [directory]

# 预览：渲染为 PNG 截图
node scripts/render-slides.js <path-to-slides.html>
```

### 网页模式（web2pptx）

适用于 `<section id="...">` 结构的长文报告/白皮书

```bash
node src/web2pptx.js <path-to-report.html>
```

### 网页改造为幻灯片

将长文网页改造为幻灯片格式后再转换

```bash
node scripts/build-slides.js <input.html> [output.html]
node src/index.js <output.html>
```

## 输出

- PPTX 文件生成在输入 HTML 同目录下
- 每张幻灯片为 1280×720px PNG 图像（文字不可编辑）
- 幻灯片模式：隐藏 `#nav`/`#cnt`，保留 `pnum` 页码
- 网页模式：隐藏 `.nav` 和 `body::before`，统一 section 高度为 720px

## HTML 格式要求

### 幻灯片模式

```html
<div class="slide" id="s1">第一页内容</div>
<div class="slide" id="s2">第二页内容</div>
<!-- #nav 和 #cnt 为导航元素，输出时自动隐藏 -->
```

### 网页模式

```html
<section id="overview">概述内容</section>
<section id="chapter1">章节内容</section>
```

## 技术栈

- **Playwright** — Chromium 无头浏览器截图
- **PptxGenJS** — 生成 PPTX 文件

## License

[MIT](LICENSE)
