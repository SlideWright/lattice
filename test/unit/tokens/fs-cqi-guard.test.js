const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..');

// ── Drift guard: readable text sizes its font through the typography manifest,
// never a raw `cqi` literal.
//
// A raw `cqi` font-size (e.g. `font-size: 0.86cqi`) bypasses the curated
// landscape/square/portrait scales (lib/typography/scale.js): it renders at the
// SAME coefficient on a tall portrait box as on a wide landscape one, so it
// collapses to fine print the moment the deck goes portrait/square — the exact
// "corner tags can't be read" class of bug the categories were built to kill.
// Readable text must use `var(--fs-<role>)` (or `var(--pill-fs)`), which is
// orientation-aware.
//
// LEGITIMATE exceptions exist — a decorative glyph (oversized quote mark,
// watermark) or text fitted INSIDE a cqi-sized shape (initials in a disc, an
// index numeral in a diagram node) is correctly proportional to its cqi frame,
// not to the reader. Mark those lines with a `cqi-ok:` comment stating why; the
// guard skips them. The bar for the marker is "this is not body/label text a
// board member reads", not "I want it smaller".
//
// See engineering/decisions/2026-06-20-typography-categories.md.
test('no raw cqi font-sizes in bundled CSS (use a --fs-* token or mark cqi-ok)', () => {
  // Walk all hand-authored CSS under lib/ (the build bundles these into dist), so a
  // new lib/<dir>/*.css is guarded automatically.
  const cssFiles = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.css')) cssFiles.push(p);
    }
  };
  walk(path.join(ROOT, 'lib'));

  // A `font-size:` (or `font:` shorthand) declaration whose value mentions `cqi`
  // (raw or inside calc()). `font\b` (not `font-`) so it skips font-family /
  // font-variant / font-feature-settings, which legitimately carry no size.
  const fsCqiRe = /(?:font-size|font)\s*:\s*[^;{}]*cqi/i;
  const offenders = [];
  for (const file of cssFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!fsCqiRe.test(line)) return;
      if (/cqi-ok/.test(line)) return; // sanctioned (decorative / shape-fitted)
      offenders.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepStrictEqual(
    offenders,
    [],
    `raw cqi font-sizes bypass the orientation-aware --fs-* scale — route through a ` +
      `var(--fs-*) token, or add a "cqi-ok: <reason>" comment if it is decorative / ` +
      `fitted inside a cqi-sized shape:\n${offenders.join('\n')}`,
  );
  assert.ok(cssFiles.length > 0, 'expected to scan some CSS files');
});
