---
name: html2ppt
description: "Convert HTML slides and web pages to PowerPoint PPTX. Invoke when user wants to convert HTML to PPTX, turn a webpage into slides, batch-convert HTML files, preview slides as PNG, or check supported HTML slide skills."
---

# html2ppt

Converts HTML content to PowerPoint (.pptx) by rendering each page/section as a PNG via Playwright (Chromium headless) and embedding them into a PptxGenJS presentation. Supports two input formats:

1. **Slide deck mode** — HTML files with `.slide` class elements (presentations, courseware)
2. **Web page mode** — Long-form HTML with `<section id="...">` structure (reports, whitepapers)

## Pipeline

```
HTML file → Playwright (Chromium headless)
          → PNG screenshots (1280×720)
          → PptxGenJS (one image per slide)
          → PPTX file
```

## Architecture

| File | Role |
|------|------|
| `src/render.js` | Slide deck renderer: captures each `.slide` element as PNG |
| `src/renderSections.js` | Web page renderer: captures each `<section id>` as PNG |
| `src/convert.js` | PptxGenJS: creates slides, embeds images, writes `.pptx` |
| `src/index.js` | CLI: slide deck → PPTX |
| `src/web2pptx.js` | CLI: web page → PPTX |
| `src/batch.js` | CLI: batch-convert directory |
| `scripts/render-slides.js` | Dev: preview render to `output/<name>/` PNGs |
| `scripts/build-slides.js` | Transform web page into slide deck HTML |
| `scripts/common.js` | Shared constants (PATHS, VERIFIED_SKILLS, RENDER) |
| `scripts/regression-test.js` | Regression test for 5 verified skills |
| `scripts/pptx-diff.js` | PPTX internal XML diff (using adm-zip) |
| `scripts/visual-eval.js` | Heuristic image quality scoring |
| `scripts/ci-cd.js` | CI/CD pipeline orchestrator (regression + diff + visual eval + report) |

## When Users Ask…

| User says | What you should do |
|-----------|---------------------|
| "把这份 HTML 转成 PPTX" / "convert this HTML to PowerPoint" | `pnpm convert` (slide deck) or `pnpm web2pptx` (long-form page) |
| "把这份网页/报告/白皮书做成幻灯片" | `node scripts/build-slides.js` → `pnpm convert` |
| "把这份 Markdown 转成幻灯片" | **No direct Markdown→PPTX path.** html2ppt only does HTML→PPTX. You must first convert Markdown → HTML using one of the [Verified Skills](#verified-skills) below (markdown-slides is the most direct), then `pnpm convert`. See the skill-picker guide in [Choosing a Skill](#choosing-a-skill) to pick the right one. |
| "批量转换整个文件夹的 HTML" | `pnpm batch` |
| "支持哪些 HTML 技能？" | See [Verified Skills](#verified-skills) section below |

## Commands

### Convert HTML to PPTX (user-facing)

```bash
# Convert an HTML slide deck to PPTX
node src/index.js <path-to-slides.html>
# or: pnpm convert <path-to-slides.html>

# Convert a long-form web page / report to PPTX
node src/web2pptx.js <path-to-report.html>
# or: pnpm web2pptx <path-to-report.html>

# Batch convert every HTML file in a directory
node src/batch.js [directory]
# or: pnpm batch

# Convert a web page → slide deck HTML → PPTX (two-step)
node scripts/build-slides.js <input.html> [output.html]
node src/index.js <output.html>
```

### Preview Before Converting (user-facing)

```bash
# Render slide previews as PNGs (no PPTX generated)
node scripts/render-slides.js <path-to-slides.html>
# or: pnpm render
# Output: output/<basename>/slide-NNN.png
```

### Quality Assurance / CI (developer-facing)

```bash
# Full CI pipeline (regression + PPTX diff + visual eval + report)
node scripts/ci-cd.js
# or: pnpm ci

# Regression test only (5 verified skills)
node scripts/regression-test.js
# or: pnpm regression
```

## CI/CD Pipeline

The `ci-cd.js` orchestrator runs four stages:

1. **Regression test** — Renders 5 verified skills (frontend-slides, guizang-ppt-skill, html-ppt-skill, cjl-slides, markdown-slides) in parallel, converts each to PPTX
2. **PPTX diff** — Decompresses each PPTX with `adm-zip`, compares every XML/media file against the previous snapshot, archives a 7-day rolling snapshot history
3. **Visual evaluation** — Heuristic scoring (file size, naming consistency) on each slide PNG
4. **Report generation** — Markdown + JSON report saved to `docs/reports/compatibility-<timestamp>.{md,json}` and `compatibility-latest.{md,json}`

Exit code is non-zero on any skill failure.

## Verified Skills

| Skill | Style | Best for |
|-------|-------|----------|
| `frontend-slides` | 动画丰富 / 24 设计风格 | 通用商务 / 教学课件 / 营销演示 |
| `guizang-ppt-skill` | 瑞士极简 / 留白克制 | 产品发布 / 学术汇报 / 投资人路演 |
| `html-ppt-skill` | Tokyo Night 深色 / 终端风 | 开发者分享 / 技术评审 / DevOps 报告 |
| `cjl-slides` | Pitch.com 商务优雅 / 24 全球风格 | 商业提案 / 客户演示 / SaaS 介绍 |
| `markdown-slides` | Dark Terminal / 极简 | **Markdown 笔记直接转幻灯片**（最直接的 Markdown 入口） |

### Choosing a Skill

> **html2ppt only converts HTML → PPTX.** When your source is Markdown, a long web report, or any non-HTML format, you must first run one of the skills above (or any other HTML slide generator) to produce an HTML file, then come back to `pnpm convert`.

Pick a skill by answering these:

1. **Is your source already Markdown?**
   - ✅ Yes → use `markdown-slides` (designed for Markdown, lightest setup)
   - ❌ No, it's prose / notes → any skill works; pick by visual style below

2. **What look do you want?**
   - Lively & colorful → `frontend-slides` (24 styles, animation-rich)
   - Minimal & Swiss-design → `guizang-ppt-skill`
   - Dark / developer / code-heavy → `html-ppt-skill` or `markdown-slides`
   - Polished & business-classy → `cjl-slides` (24 global styles)

3. **Is the audience external (client / investor) or internal (team / devs)?**
   - External → `cjl-slides` or `frontend-slides`
   - Internal → `html-ppt-skill` or `markdown-slides`

Sample inputs for each skill are in the [`sample/`](sample/) directory.

| Sample input | Skill to use | Command |
|--------------|--------------|---------|
| `sample/sample.md` (Markdown) | `markdown-slides` | `npx clawhub@latest install markdown-slides` → invoke → `pnpm convert sample/sample-markdown-slides.html` |
| Pre-existing HTML slide deck | any | `pnpm convert <file>.html` |
| Long web report (`section[id]`) | `frontend-slides` / `cjl-slides` | invoke skill → `pnpm convert <file>.html` |

## Output

- One `.pptx` per HTML input, in the same directory
- Each slide: full-bleed 1280×720px PNG image
- Layout: `CUSTOM` (10×5.625 in, 16:9)
- Text is **not editable** — image-only for 100% visual fidelity
- Slide preview PNGs: `output/<basename>/slide-NNN.png`
- CI reports: `docs/reports/compatibility-<timestamp>.{md,json}`
- PPTX snapshots: `docs/reports/pptx-snapshots/<skill>-<ts>/`

## Dependencies

- `playwright` — Chromium headless rendering
- `pptxgenjs` — PPTX generation
- `adm-zip` — PPTX internal XML diff

## Node Version

Requires Node.js >= 18 (uses native ESM).