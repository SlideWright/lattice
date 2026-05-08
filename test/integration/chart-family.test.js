/**
 * Integration: lattice-emulator's chart-family DOM transform.
 *
 * Builds a small fixture deck with one slide per chart layout (progress,
 * timeline-list, piechart) plus modifier composition, then asserts the
 * HTML sidecar contains the expected chart-frame skeleton and the
 * layout-specific markup the runtime/emulator parity contract depends on.
 *
 * The runtime path is verified at structural parity with the emulator in
 * the integration smoke test under .scratch/integration; this test pins
 * the build-path output so a regression in either path fails CI.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { execFileSync } = require('child_process');

const ROOT     = path.join(__dirname, '..', '..');
const EMULATOR = path.join(ROOT, 'lattice-emulator.js');
const THEME    = path.join(ROOT, 'lattice.css');
const FIXTURE  = path.join(ROOT, 'test', 'fixtures', 'chart-family.md');

function buildFixture() {
  const out = path.join(os.tmpdir(), `chart-family-${process.pid}-${Date.now()}.pdf`);
  execFileSync(
    process.execPath,
    [EMULATOR, FIXTURE, THEME, out, 'indaco', '-q'],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 },
  );
  const html = out.replace(/\.pdf$/, '.html');
  if (!fs.existsSync(html)) throw new Error(`HTML sidecar missing: ${html}`);
  const text = fs.readFileSync(html, 'utf8');
  const cleanup = () => {
    for (const f of [out, html]) { if (fs.existsSync(f)) fs.unlinkSync(f); }
  };
  return { html: text, cleanup };
}

test('chart-family: every chart-layout slide gets the chart-frame class', { timeout: 180000 }, () => {
  const { html, cleanup } = buildFixture();
  try {
    const sections = html.match(/<section[^>]*class="[^"]*"/g) || [];
    const charty = sections.filter(s =>
      /\b(progress|timeline-list|piechart)\b/.test(s) && !/\bagenda\b/.test(s)
    );
    assert.ok(charty.length >= 4, `expected ≥4 chart sections, got ${charty.length}`);
    for (const s of charty) {
      assert.match(s, /\bchart-frame\b/, `chart-frame missing from: ${s}`);
    }
  } finally { cleanup(); }
});

test('chart-family: progress slide emits progress-bars with one row per item', { timeout: 180000 }, () => {
  const { html, cleanup } = buildFixture();
  try {
    assert.match(html, /<div class="progress-bars">/);
    // Five rows in the first progress slide
    const firstProgress = html.match(/<section[^>]*class="progress chart-frame"[^>]*>[\s\S]*?<\/section>/);
    assert.ok(firstProgress, 'first progress section not found');
    const rows = (firstProgress[0].match(/<div class="progress-row">/g) || []).length;
    assert.equal(rows, 5, `expected 5 progress-row, got ${rows}`);
    // Status data attribute carries the pill token through to the fill
    assert.match(firstProgress[0], /<div class="progress-fill" data-s="on-track"/);
    assert.match(firstProgress[0], /<div class="progress-fill" data-s="blocked"/);
    // Numeric percentage extracted into progress-pct
    assert.match(firstProgress[0], /<div class="progress-pct">92%<\/div>/);
  } finally { cleanup(); }
});

test('chart-family: progress dark + minimal modifiers compose with chart-frame', { timeout: 180000 }, () => {
  const { html, cleanup } = buildFixture();
  try {
    // The combo slide: progress + dark + minimal + chart-frame all present
    assert.match(html, /class="progress dark minimal chart-frame"/);
  } finally { cleanup(); }
});

test('chart-family: timeline-list emits a spine with date pills + status pills + body', { timeout: 180000 }, () => {
  const { html, cleanup } = buildFixture();
  try {
    assert.match(html, /<div class="timeline-spine">/);
    const tl = html.match(/<section[^>]*class="timeline-list chart-frame"[^>]*>[\s\S]*?<\/section>/);
    assert.ok(tl, 'timeline-list section not found');
    const items = (tl[0].match(/<div class="timeline-item">/g) || []).length;
    assert.equal(items, 4, `expected 4 timeline-item, got ${items}`);
    // Date pills
    assert.match(tl[0], /<div class="timeline-pill">2024 Q3<\/div>/);
    assert.match(tl[0], /<div class="timeline-pill">2026 Q1<\/div>/);
    // Trailing status pills
    assert.match(tl[0], /<span class="chart-status" data-s="decision">decision<\/span>/);
    assert.match(tl[0], /<span class="chart-status" data-s="live">live<\/span>/);
    // Body of nested bullets
    assert.match(tl[0], /<div class="timeline-body">/);
  } finally { cleanup(); }
});

test('chart-family: piechart donut emits an SVG donut with proportional wedges and a legend', { timeout: 180000 }, () => {
  const { html, cleanup } = buildFixture();
  try {
    const pc = html.match(/<section[^>]*class="piechart donut chart-frame"[^>]*>[\s\S]*?<\/section>/);
    assert.ok(pc, 'piechart donut section not found');
    assert.match(pc[0], /<div class="piechart-figure">/);
    assert.match(pc[0], /<svg class="piechart-svg" viewBox="0 0 200 200"/);
    // Donut path uses inner radius (r=50) — solid pies wouldn't carry it
    assert.match(pc[0], /A 50 50 0/);
    // 5 wedges + 5 legend rows
    const wedges = (pc[0].match(/<path class="wedge"/g) || []).length;
    const legend = (pc[0].match(/<li><span class="legend-swatch"/g) || []).length;
    assert.equal(wedges, 5, `expected 5 wedges, got ${wedges}`);
    assert.equal(legend, 5, `expected 5 legend rows, got ${legend}`);
  } finally { cleanup(); }
});

test('chart-family: header/body/caption skeleton extracts eyebrow, subtitle, italic caption', { timeout: 180000 }, () => {
  const { html, cleanup } = buildFixture();
  try {
    const firstProgress = html.match(/<section[^>]*class="progress chart-frame"[^>]*>[\s\S]*?<\/section>/);
    assert.ok(firstProgress);
    // Eyebrow extracted from the leading <p><code>...</code></p>
    assert.match(firstProgress[0], /<div class="chart-header">[\s\S]*<p class="chart-eyebrow"><code>H1 2026 · Phase 1 readiness<\/code><\/p>/);
    // Subtitle is the first paragraph after h2
    assert.match(firstProgress[0], /<p class="chart-subtitle">Snapshot taken at 14:00 UTC[^<]*<\/p>/);
    // Caption is the trailing italic paragraph, stripped of the <em> wrapper
    assert.match(firstProgress[0], /<p class="chart-caption">Source: Linear · refreshed 2026-05-07<\/p>/);
  } finally { cleanup(); }
});
