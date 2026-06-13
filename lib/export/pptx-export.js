// Image-per-slide PPTX writer (the owned, marp-free PPTX export).
//
// Sibling implementations (keep in lockstep — same library, same image-slide
// model, so the CLI and the web playground emit byte-comparable .pptx files):
//   - This module                                  — the Node CLI path
//     (lattice-emulator.js, rasterizing via headless Chromium screenshots).
//   - docs/src/playground/drawing-board-export.js  — the browser path
//     (rasterizing via html-to-image).
// Both build a `LAYOUT_WIDE` (13.333 × 7.5in, 16:9) deck and full-bleed one PNG
// per slide. PowerPoint's .pptx is an OOXML zip; pptxgenjs owns that packaging
// (it ships its own jszip) and runs in both Node and the browser, so there is no
// hand-rolled OOXML and no marp-cli in the export path.
//
// `--pptx-editable` (marp's LibreOffice-backed editable variant) is intentionally
// NOT implemented here — image-per-slide matches marp's *default* PPTX and needs
// no external `soffice`. See engineering/decisions/2026-06-12-…-retire-marp.md.

// pptxgenjs is a runtime dependency (esbuild keeps it external — see
// tools/build-emulator.js `packages: 'external'`), required lazily so a
// PDF/PNG-only invocation never loads it.
function loadPptxGenJS() {
  const mod = require('pptxgenjs');
  // v3 ships as both a CJS export and an ESM default; normalize to the class.
  return mod.default || mod;
}

/**
 * Write an image-per-slide .pptx.
 *
 * @param {string}   outPath     destination `.pptx` path.
 * @param {Buffer[]} pngBuffers  one full-bleed PNG per slide, in deck order.
 * @param {object}   [meta]      document properties (title/author/subject/company).
 * @returns {Promise<number>}    the slide count written.
 */
async function writePptx(outPath, pngBuffers, meta = {}) {
  if (!Array.isArray(pngBuffers) || pngBuffers.length === 0) {
    throw new Error('writePptx: no slide images to export');
  }
  const PptxGenJS = loadPptxGenJS();
  const pptx = new PptxGenJS();

  pptx.title = (meta.title || 'deck').trim();
  if (meta.subject) pptx.subject = meta.subject;
  pptx.author = meta.author || 'Lattice';
  pptx.company = meta.company || 'Lattice';
  // 16:9 wide — matches any 16:9 @size (HD/4K); the PNG full-bleeds the page.
  pptx.layout = 'LAYOUT_WIDE';

  for (const buf of pngBuffers) {
    // `Buffer.from` normalizes puppeteer's screenshot return (a Uint8Array in
    // v23+) — calling `.toString('base64')` straight on a Uint8Array yields
    // comma-joined decimals, not base64, which corrupts the OOXML zip.
    const data = 'data:image/png;base64,' + Buffer.from(buf).toString('base64');
    pptx.addSlide().addImage({ data, x: 0, y: 0, w: '100%', h: '100%' });
  }

  await pptx.writeFile({ fileName: outPath });
  return pngBuffers.length;
}

module.exports = { writePptx };
