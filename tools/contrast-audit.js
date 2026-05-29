#!/usr/bin/env node
/**
 * Contrast and colour-theory audit for all Lattice themes.
 *
 * Measures WCAG contrast for every text-bearing and graphical token pair
 * in the CURRENT token taxonomy (--cN-light / --cN-dark categorical cycle,
 * universal semantic palette, state signals, quadrant, surfaces/ink), across
 * every shipped theme in BOTH canvas modes. Also reports OKLab pairwise
 * distance across the categorical cycle to flag perceptually-similar slots.
 *
 * Tiered bars (see engineering/decisions/2026-05-29-palette-recuration.md):
 *   AA   = 4.5:1  text-bearing tokens (ink on fills, headings on surfaces)
 *   UI   = 3.0:1  graphical / shape-encoded signals (state discs, strokes)
 *   DEC  =   —    decorative (hairline borders, muted chrome, lines): reported, not gated
 *
 * This tool is the measurement instrument; test/unit/palette/contrast.test.js
 * is the CI gate that holds the AA/UI bars on every theme.
 *
 * Usage:
 *   node tools/contrast-audit.js                 # all themes, both modes
 *   node tools/contrast-audit.js indaco cuoio    # specific themes
 *   node tools/contrast-audit.js --fails-only    # suppress clean themes
 *   node tools/contrast-audit.js --tier=AA       # gate AA pairs only
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const THEMES_DIR = path.join(ROOT, 'themes');
const ENGINE_CSS = path.join(ROOT, 'dist', 'lattice.css'); // universal-default source

// ── CSS loader — walk @import graph; resolve `lattice` to the engine bundle
// so universal semantic defaults (base.tokens.css → dist/lattice.css) are
// visible, exactly as the contrast unit test does. ───────────────────────
function loadPaletteWithImports(filePath, seen = new Set()) {
  if (seen.has(filePath) || !fs.existsSync(filePath)) return '';
  seen.add(filePath);
  const content  = fs.readFileSync(filePath, 'utf8');
  const importRe = /@import\s+["']?([A-Za-z0-9_-]+)["']?\s*;/g;
  let imported = '';
  let m;
  while ((m = importRe.exec(content)) !== null) {
    if (m[1] === 'lattice-diagram') continue;
    const target = m[1] === 'lattice'
      ? ENGINE_CSS
      : path.join(THEMES_DIR, `${m[1]}.css`);
    imported += loadPaletteWithImports(target, seen) + '\n';
  }
  return imported + content;
}

// ── Token resolver — light-dark() collapse per requested mode, then iterate
// var() refs to a fixed point. ───────────────────────────────────────────
function parsePaletteVars(content, mode = 'light') {
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  for (const block of (stripped.match(/:root\s*\{[^}]*\}/g) || [])) {
    for (const d of (block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || [])) {
      const mm = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (mm) vars[mm[1]] = mm[2].trim();
    }
  }
  for (const k of Object.keys(vars)) {
    const ld = vars[k].match(/^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i);
    if (ld) vars[k] = (mode === 'dark' ? ld[2] : ld[1]).trim();
  }
  for (let pass = 0; pass < 10; pass++) {
    let changed = false;
    for (const k of Object.keys(vars)) {
      const ref = vars[k].match(/^var\(--([a-z0-9-]+)\)$/i);
      if (ref && vars[ref[1]] && vars[ref[1]] !== vars[k]) {
        vars[k] = vars[ref[1]];
        changed = true;
      }
    }
    if (!changed) break;
  }
  return vars;
}

// ── Colour math (WCAG sRGB luminance + OKLab) ─────────────────────────────
function parseHex(hex) {
  if (!hex) return null;
  hex = hex.trim().replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6 || !/^[0-9a-f]{6}$/i.test(hex)) return null;
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}
function toLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }
function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}
function contrastRatio(fg, bg) {
  const l1 = luminance(fg), l2 = luminance(bg);
  if (l1 === null || l2 === null) return null;
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
function toOKLab(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const r = toLinear(rgb.r), g = toLinear(rgb.g), b = toLinear(rgb.b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}
function oklabDist(h1, h2) {
  const a = toOKLab(h1), b = toOKLab(h2);
  if (!a || !b) return null;
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

// ── Pair definitions: [label, fillToken, textToken, tier] ─────────────────
const AA = 4.5, UI = 3.0;
function buildPairs() {
  const P = [];
  // Surfaces / ink (text-bearing)
  for (const s of ['bg', 'bg-alt']) {
    P.push([`text-heading on ${s}`, s, 'text-heading', AA]);
    P.push([`text-body on ${s}`,    s, 'text-body',    AA]);
    P.push([`text-label on ${s}`,   s, 'text-label',   AA]);
  }
  P.push(['text-display on bg-dark', 'bg-dark', 'text-display', AA]);
  P.push(['accent on bg',            'bg',      'accent',       AA]); // inline-code/eyebrow text
  P.push(['on-accent on accent',     'accent',  'on-accent',    AA]);
  P.push(['code-text on code-bg',    'code-bg', 'code-text',    AA]);
  // Categorical cycle — both tiers, paired ink
  for (let i = 1; i <= 12; i++) P.push([`c${i}-light / c-ink-light`, `c${i}-light`, 'c-ink-light', AA]);
  for (let i = 1; i <= 12; i++) P.push([`c${i}-dark / c-ink-dark`,   `c${i}-dark`,  'c-ink-dark',  AA]);
  // Universal semantic fills with their ink
  P.push(['c-warm-light / c-ink-light', 'c-warm-light', 'c-ink-light', AA]);
  P.push(['c-cool-light / c-ink-light', 'c-cool-light', 'c-ink-light', AA]);
  P.push(['c-note / c-ink-light',       'c-note',       'c-ink-light', AA]);
  P.push(['c-ink-dark on c-alarm',      'c-alarm',      'c-ink-dark',  AA]);
  // Quadrant fill/text
  for (let n = 1; n <= 4; n++) P.push([`quadrant-${n} fill/text`, `c-quadrant-${n}-fill`, `c-quadrant-${n}-text`, AA]);
  // State signals — shape-encoded discs (slash mask): graphical 3:1 floor
  P.push(['pass on bg', 'bg', 'pass', UI]);
  P.push(['warn on bg', 'bg', 'warn', UI]);
  P.push(['fail on bg', 'bg', 'fail', UI]);
  // Strokes are graphical and run on PALE band fills. Only meaningful in
  // light mode — in dark mode --cN-light resolves to the DEEP tier, so the
  // "stroke on band" pairing inverts. Gated light-mode only (see caller).
  for (const band of ['c1-light', 'c5-light', 'c9-light']) {
    P.push([`c-stroke on ${band}`, band, 'c-stroke', UI, 'light-only']);
  }
  return P;
}

// Decorative pairs: reported for awareness, never gated.
const DECORATIVE = [
  ['border on bg',     'bg', 'border'],
  ['text-muted on bg', 'bg', 'text-muted'],
];

// ── Runner ────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const failsOnly = args.includes('--fails-only');
const tierArg   = (args.find(a => a.startsWith('--tier=')) || '').split('=')[1] || null;
const themeArgs = args.filter(a => !a.startsWith('-'));

const allThemes = fs.readdirSync(THEMES_DIR)
  .filter(f => f.endsWith('.css') && !f.endsWith('-dark.css'))
  .map(f => f.replace('.css', ''))
  .sort();
const themes = themeArgs.length ? themeArgs : allThemes;

const PAIRS = buildPairs().filter(([, , , tier]) =>
  !tierArg || (tierArg === 'AA' ? tier === AA : tier === UI));

let totalFails = 0, totalChecks = 0;

console.log('\n  Lattice · Contrast & Colour-Theory Audit');
console.log('  ══════════════════════════════════════════════════════════════');
console.log('  AA text = 4.5:1 · UI graphical = 3.0:1 · OKLab ΔE flag < 0.15\n');

for (const theme of themes) {
  const cssFile = path.join(THEMES_DIR, `${theme}.css`);
  if (!fs.existsSync(cssFile)) { console.log(`  [skip] ${theme} — not found`); continue; }
  const css      = loadPaletteWithImports(cssFile);
  const hasDark  = fs.existsSync(path.join(THEMES_DIR, `${theme}-dark.css`));
  const modes    = hasDark ? ['light', 'dark'] : ['light'];

  for (const mode of modes) {
    const vars = parsePaletteVars(css, mode);
    const fails = [], decoNotes = [];

    for (const [label, fk, tk, bar, scope] of PAIRS) {
      if (scope === 'light-only' && mode !== 'light') continue;
      const f = vars[fk], t = vars[tk];
      if (!parseHex(f) || !parseHex(t)) continue; // token absent or non-hex (color-mix) — skip
      totalChecks++;
      const ratio = contrastRatio(f, t);
      if (ratio < bar) { totalFails++; fails.push({ label, f, t, ratio, bar }); }
    }
    for (const [label, fk, tk] of DECORATIVE) {
      const f = vars[fk], t = vars[tk];
      if (!parseHex(f) || !parseHex(t)) continue;
      decoNotes.push({ label, ratio: contrastRatio(f, t), f, t });
    }

    // Categorical distinctness (OKLab) across the 8 CHART series slots.
    // Prefer the curated --chart-N ramp; fall back to --cN-dark for themes
    // that haven't opted in yet (deprecation window). Summarise the global
    // min ΔE and any genuinely confusable pairs (ΔE < 0.10).
    const series = [];
    for (let i = 1; i <= 8; i++) {
      const h = vars[`chart-${i}`] || vars[`c${i}-dark`];
      if (parseHex(h)) series.push([i, h]);
    }
    let minDE = Infinity; const confusable = [];
    for (let i = 0; i < series.length; i++)
      for (let j = i + 1; j < series.length; j++) {
        const d = oklabDist(series[i][1], series[j][1]);
        if (d === null) continue;
        if (d < minDE) minDE = d;
        if (d < 0.10) confusable.push(`c${series[i][0]}↔c${series[j][0]}·${d.toFixed(2)}`);
      }

    const clean = fails.length === 0 && confusable.length === 0;
    if (clean && failsOnly) continue;

    const tag = (theme === 'indaco' || theme === 'cuoio') ? 'CI' : '··';
    console.log(`  ── [${tag}] ${theme} (${mode}) ${'─'.repeat(Math.max(1, 40 - theme.length))} ${fails.length} fail`);
    for (const f of fails) {
      const t = f.bar === AA ? 'AA' : 'UI';
      console.log(`     ✗ ${f.ratio.toFixed(2).padStart(5)}:1 [${t}]  ${f.label}   ${f.f} / ${f.t}`);
    }
    if (Number.isFinite(minDE))
      console.log(`     ◦ chart series (c1..c8) min ΔE ${minDE.toFixed(2)}` +
        (confusable.length ? `  — confusable: ${confusable.join(' ')}` : ''));
    if (!failsOnly) for (const d of decoNotes)
      console.log(`     · ${d.ratio.toFixed(2).padStart(5)}:1 [dec] ${d.label}   ${d.f} / ${d.t}`);
    console.log('');
  }
}

console.log('  ══════════════════════════════════════════════════════════════');
console.log(`  ${totalFails} gated failures · ${totalChecks} pairs checked across ${themes.length} themes\n`);
process.exitCode = totalFails > 0 ? 1 : 0;
