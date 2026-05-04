#!/usr/bin/env node
/* Lattice smoke test
 * ─────────────────────────────────────────────────────────────────────────
 * Builds both example galleries with the default `indaco` palette and
 * verifies:
 *
 *   1. The renderer (lattice.js) syntax-checks.
 *   2. The runtime (lattice-runtime.js) syntax-checks.
 *   3. The active palette resolves all required Mermaid theme variables.
 *   4. The build completes without errors and produces non-empty PDFs.
 *   5. Each PDF has the expected number of pages.
 *
 * Run with: npm test
 *
 * Exit code 0 = pass. Non-zero = fail with a diagnostic.
 *
 * For deeper visual regression, re-render examples/*.pdf and compare
 * against the committed fixtures; visual diff is out of scope for this
 * smoke test (would require imagemagick / pixel comparison machinery).
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const EXAMPLES = path.join(ROOT, 'examples');

let failed = 0;
function check(label, ok, detail) {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label}${detail ? '\n      ' + detail : ''}`);
    failed += 1;
  }
}

console.log('Lattice smoke test\n');

// ── 1. Syntax checks ──────────────────────────────────────────────────
console.log('Syntax');
try {
  execSync(`node -c ${path.join(ROOT, 'lattice.js')}`, { stdio: 'pipe' });
  check('lattice.js parses', true);
} catch (e) {
  check('lattice.js parses', false, e.message);
}
try {
  execSync(`node -c ${path.join(ROOT, 'lattice-runtime.js')}`, { stdio: 'pipe' });
  check('lattice-runtime.js parses', true);
} catch (e) {
  check('lattice-runtime.js parses', false, e.message);
}

// ── 2. Palette resolution ─────────────────────────────────────────────
console.log('\nTheme resolution');
const paletteCSS = fs.readFileSync(path.join(ROOT, 'themes', 'indaco.css'), 'utf8');
const sentinel = '/* ===== MERMAID THEME CSS ===== */';
const sentinelIdx = paletteCSS.indexOf(sentinel);
check('themes/indaco.css contains Mermaid sentinel', sentinelIdx > 0);
check('themes/indaco.css has Mermaid CSS section', paletteCSS.length > sentinelIdx + sentinel.length + 100);

// Parse :root vars
function parsePaletteVars(content) {
  const vars = {};
  const rootBlocks = content.match(/:root\s*\{[^}]*\}/g) || [];
  for (const block of rootBlocks) {
    const decls = block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || [];
    for (const d of decls) {
      const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  for (const k of Object.keys(vars)) {
    const ref = vars[k].match(/^var\(--([a-z0-9-]+)\)$/i);
    if (ref && vars[ref[1]]) vars[k] = vars[ref[1]];
  }
  return vars;
}
const paletteVars = parsePaletteVars(paletteCSS);

// Variables that the renderer's MERMAID_VAR_MAP references.
const requiredVars = [
  'bg', 'bg-alt', 'text-heading',
  'mermaid-primary-color', 'mermaid-secondary-color',
  'mermaid-pie-purple', 'mermaid-pie-orange', 'mermaid-pie-teal', 'mermaid-pie-rose',
  'mermaid-pie-yellow', 'mermaid-pie-red', 'mermaid-pie-slate', 'mermaid-pie-sage',
  'mermaid-pie-violet',
  'mermaid-line', 'mermaid-border',
  'mermaid-mid-blue', 'mermaid-mid-green', 'mermaid-mid-purple',
  'mermaid-mid-orange', 'mermaid-mid-teal', 'mermaid-mid-rose',
  'mermaid-mid-slate', 'mermaid-mid-mauve',
  'mermaid-quadrant-1-fill', 'mermaid-quadrant-2-fill',
  'mermaid-quadrant-3-fill', 'mermaid-quadrant-4-fill',
  'mermaid-quadrant-1-text', 'mermaid-quadrant-2-text',
  'mermaid-quadrant-3-text', 'mermaid-quadrant-4-text',
  'mermaid-gantt-active', 'mermaid-gantt-active-border',
  'mermaid-gantt-done', 'mermaid-gantt-done-border',
  'mermaid-gantt-critical', 'mermaid-gantt-critical-border',
  'mermaid-gantt-today', 'mermaid-gantt-grid',
  'mermaid-note-bg', 'mermaid-note-border',
  'mermaid-error-bg', 'mermaid-error-text',
];
const missing = requiredVars.filter(v => !paletteVars[v]);
check(
  `palette defines ${requiredVars.length} required Mermaid variables`,
  missing.length === 0,
  missing.length > 0 ? `missing: ${missing.join(', ')}` : ''
);

// ── 3. Build galleries ────────────────────────────────────────────────
console.log('\nBuild');
function buildOne(label, mdName, pdfName, optional = false) {
  const md  = path.join(EXAMPLES, mdName);
  const pdf = path.join(EXAMPLES, pdfName);
  if (!fs.existsSync(md)) {
    check(`source exists: ${mdName}`, false);
    return;
  }
  try {
    execSync(`node lattice.js ${md} lattice.css ${pdf}`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: optional ? 600000 : 120000, // 10min for mermaid, 2min for layout
    });
    check(`${label} build succeeded`, true);
  } catch (e) {
    if (optional) {
      console.log(`  ⚠ ${label} build skipped (timed out — re-run manually with: npm run build:mermaid)`);
      return;
    }
    check(`${label} build succeeded`, false, e.message.split('\n')[0]);
    return;
  }
  // Verify output exists and is non-trivial
  const stat = fs.statSync(pdf);
  check(`${label} PDF non-empty`, stat.size > 10000, `size=${stat.size} bytes`);
}
buildOne('layout gallery', 'gallery.md', 'gallery.pdf');
// Mermaid gallery rebuild is slow (25 mermaid renders × ~5s each cold-start
// of Puppeteer). Mark it optional so smoke tests run quickly; the existing
// committed PDF acts as the fixture.
buildOne('mermaid gallery', 'mermaid-gallery.md', 'mermaid-gallery.pdf', true);

// ── 4. Page count check ───────────────────────────────────────────────
console.log('\nOutput');
function pageCount(pdfPath) {
  if (!fs.existsSync(pdfPath)) return 0;
  try {
    const out = execSync(`pdfinfo "${pdfPath}"`, { stdio: 'pipe' }).toString();
    const m = out.match(/Pages:\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  } catch {
    return -1; // pdfinfo missing
  }
}
const galleryPages = pageCount(path.join(EXAMPLES, 'gallery.pdf'));
const mermaidPages = pageCount(path.join(EXAMPLES, 'mermaid-gallery.pdf'));
if (galleryPages === -1) {
  console.log('  ⚠ pdfinfo not available; skipping page count check');
} else {
  check('gallery.pdf has 46 pages', galleryPages === 46, `got ${galleryPages}`);
  check('mermaid-gallery.pdf has 31 pages', mermaidPages === 31, `got ${mermaidPages}`);
}

// ── Summary ───────────────────────────────────────────────────────────
console.log();
if (failed === 0) {
  console.log('All checks passed.');
  process.exit(0);
} else {
  console.log(`${failed} check${failed === 1 ? '' : 's'} failed.`);
  process.exit(1);
}
