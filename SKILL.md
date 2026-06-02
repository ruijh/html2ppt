---
name: html2ppt
description: Convert HTML slides and web pages to PPTX via Playwright + PptxGenJS
commands:
  - node src/index.js <path-to-html>               # Convert HTML slide deck to PPTX
  - node src/web2pptx.js <path-to-html>            # Convert long-form web page to PPTX
  - node src/batch.js [directory]                  # Batch-convert HTML files in directory
  - node scripts/build-slides.js <input> [output]  # Transform web page into slide deck HTML
  - node scripts/render-slides.js <path-to-html>   # Preview: render slides to PNG
triggers:
  - Convert HTML presentation to PowerPoint
  - HTML slides to PPTX
  - html template to pptx
  - Convert web page to PowerPoint
  - Long article to PPTX
  - Report page to PowerPoint
  - web page to pptx
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
| `scripts/build-slides.js` | Transform web page into slide deck HTML |
| `scripts/render-slides.js` | Dev: preview render to `output/<name>/` PNGs |

## Mode 1: Slide Deck (html2ppt)

For HTML files with `.slide` class elements.

**HTML assumptions:**
- Resolution: **1280×720px** per slide
- Slides have `.slide` class
- Navigation `#nav`/`#cnt` is hidden in output
- Right-bottom `pnum` page numbers are **preserved**

```bash
# Single file
node src/index.js <path-to-slides.html>

# Batch convert
node src/batch.js [directory]

# Preview as PNG
node scripts/render-slides.js <path-to-slides.html>
```

## Mode 2: Web Page (web2pptx)

For long-form HTML with `<section id="...">` structure.

**HTML assumptions:**
- Page contains `<section id="...">` elements
- Fixed navigation (`.nav`) and noise overlay (`body::before`) are hidden in output
- Each section is rendered at min-height 720px

```bash
# Convert web page
node src/web2pptx.js <path-to-report.html>

# Or: transform web page to slide deck first, then convert
node scripts/build-slides.js <input.html> [output.html]
node src/index.js <output.html>
```

## Output

- One `.pptx` per HTML input, in the same directory
- Each slide: full-bleed 1280×720px PNG image
- Layout: `CUSTOM` (10×5.625 in, 16:9)
- Text is **not editable** — image-only for 100% visual fidelity
