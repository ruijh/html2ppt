# html2ppt

将 HTML 幻灯片转换为 PowerPoint（PPTX）文件的工具。通过 Playwright 截图 + PptxGenJS 生成，保持 100% 视觉保真度。

## 核心功能

- HTML 幻灯片 → PPTX 高保真转换
- 支持多种 HTML 格式（`.slide` / `.active` / `.is-active` 类控制）
- 批量转换支持
- PNG 预览模式

## 依赖

- Node.js 18+
- Chromium（Playwright 自动安装）

## 安装

```bash
npm install
```

## 使用方式

### 1. 幻灯片模式（主模式）

适用于带 `.slide` 类的 HTML 幻灯片

```bash
# 单文件转换
node src/index.js <path-to-slides.html>

# 批量转换目录下所有 HTML
node src/batch.js [directory]

# 预览：渲染为 PNG 截图
node scripts/render-slides.js <path-to-slides.html>
```

### 2. 网页模式

适用于 `<section id="...">` 结构的长文报告/白皮书

```bash
node src/web2pptx.js <path-to-report.html>
```

### 3. 网页改造为幻灯片

将长文网页改造为幻灯片格式后再转换

```bash
node scripts/build-slides.js <input.html> [output.html]
node src/index.js <output.html>
```

## 输出

- PPTX 文件生成在输入 HTML 同目录下
- 每张幻灯片为 **1280×720px** PNG 图像
- 幻灯片模式：隐藏 `#nav`/`#cnt`，保留 `pnum` 页码

## 支持的 HTML 格式

html2ppt 兼容多种 HTML 幻灯片技能输出的格式：

| 技能 | 类名控制 | 隐藏状态 | 显示状态 |
|------|----------|----------|----------|
| frontend-slides | `.slide` + `.active` | `opacity:0; visibility:hidden` | `opacity:1; visibility:visible` |
| guizang-ppt-skill | `.slide` + `.active` | `opacity:0; visibility:hidden` | `opacity:1; visibility:visible` |
| html-ppt-skill | `.slide` + `.is-active` | `display:none; opacity:0` | `display:flex; opacity:1` |
| cjl-slides | `.slide` | flex 布局 | - |
| markdown-slides | `.slide` | - | flex 布局 |
| 其他基于 `.slide` 类的 HTML | `.slide` | - | - |

### HTML 示例

```html
<div id="stage">
  <div class="slide active" id="s1">第一页</div>
  <div class="slide" id="s2">第二页</div>
</div>
<nav id="nav"><!-- 导航，输出时自动隐藏 --></nav>
```

## HTML 幻灯片技能推荐

配合使用的 HTML 生成技能（另见 [docs/skills-briefing.md](docs/skills-briefing.md)）：

| 技能 | 风格 | 安装 |
|------|------|------|
| [frontend-slides](https://clawhub.ai/ken0122/frontend-slides) | 动画丰富、24种设计风格 | `openclaw skills install frontend-slides` |
| [guizang-ppt-skill](https://clawhub.ai/guizang/ppt) | 瑞士国际主义、极简专业 | `openclaw skills install ppt` |
| [html-ppt-skill](https://clawhub.ai/html-ppt-skill) | 开发者暗色、Tokyo Night | `openclaw skills install html-ppt-skill` |
| [cjl-slides](https://clawhub.ai/0xcjl/cjl-slides) | 24种全球设计风格 | `npx clawhub@latest install cjl-slides` |
| [markdown-slides](https://toolify.ai/openclaw-skills/markdown-slides-15668) | 轻量 Markdown | `npx clawhub@latest install markdown-slides` |

## 工作流

```
用户内容 → [HTML生成技能] → HTML文件 → [html2ppt] → PPTX文件
```

示例：使用 frontend-slides 技能生成 HTML 后转换：

```bash
# 1. 使用 frontend-slides 技能生成 HTML（由 AI agent 执行）
# 2. 转换 HTML 为 PPTX
node src/index.js output/presentation.html
```

## 技术栈

- **Playwright** — Chromium 无头浏览器截图
- **PptxGenJS** — 生成 PPTX 文件

## 项目结构

```
html2ppt/
├── src/
│   ├── index.js         # 主入口：幻灯片模式
│   ├── web2pptx.js      # 网页模式
│   ├── batch.js          # 批量转换
│   ├── render.js         # Playwright 截图引擎
│   ├── convert.js        # PptxGenJS 生成器
│   └── renderSections.js # 网页模式截图
├── scripts/
│   ├── render-slides.js  # PNG 预览脚本
│   └── build-slides.js   # 网页转幻灯片
```

## License

[MIT](LICENSE)
