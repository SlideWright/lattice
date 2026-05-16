#!/usr/bin/env node
/**
 * Contrast and colour-theory audit for all Lattice themes.
 *
 * Checks WCAG AA contrast (4.5:1) for every critical text-on-fill pair
 * that appears in Mermaid diagrams and slide layouts. Also reports OKLab
 * pairwise distances between chart-1..6 to flag perceptual similarity.
 *
 * Usage:
 *   node tools/contrast-audit.js               # all themes
 *   node tools/contrast-audit.js indaco cuoio  # specific themes
 *   node tools/contrast-audit.js --fails-only  # suppress passing themes
 */



const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const THEMES_DIR = path.join(ROOT, 'themes');

// ── CSS loader (mirrors emulator's loadPaletteWithImports) ────────────────

function loadPaletteWithImports(filePath, seen = new Set()) {
  if (seen.has(filePath) || !fs.existsSync(filePath)) return '';
  seen.add(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const dir     = path.dirname(filePath);
  const importRe = /@import\s+["']?([A-Za-z0-9_-]+)["']?\s*;/g;
  let imported = '';
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const name = m[1];
    if (name === 'lattice') continue; // layout CSS; colour tokens live in themes
    const imp = path.join(dir, `${name}.css`);
    if (fs.existsSync(imp)) imported += loadPaletteWithImports(imp, seen) + '\n';
  }
  return imported + content;
}

// ── Token resolver (mirrors emulator's parsePaletteVars) ─────────────────

function parsePaletteVars(content) {
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  // Collect all :root blocks; later declarations override earlier ones.
  for (const block of (stripped.match(/:root\s*\{[^}]*\}/g) || [])) {
    for (const d of (block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || [])) {
      const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  // Collapse light-dark() to the correct side.
  const isDark = /:root\s*\{[^}]*color-scheme\s*:\s*dark\b/.test(stripped);
  for (const k of Object.keys(vars)) {
    const ld = vars[k].match(/^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i);
    if (ld) vars[k] = (isDark ? ld[2] : ld[1]).trim();
  }
  // Resolve var() one level (handles brand-axis refs like var(--brand-wine-mid)).
  for (const k of Object.keys(vars)) {
    const ref = vars[k].match(/^var\(--([a-z0-9-]+)\)$/i);
    if (ref && vars[ref[1]]) vars[k] = vars[ref[1]];
  }
  // Second pass: resolve any var() that was itself a light-dark() result.
  for (const k of Object.keys(vars)) {
    const ref = vars[k].match(/^var\(--([a-z0-9-]+)\)$/i);
    if (ref && vars[ref[1]]) vars[k] = vars[ref[1]];
  }
  return vars;
}

// ── Colour math ───────────────────────────────────────────────────────────

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

function toLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  return 0.2126 * toLinear(rgb.r)
       + 0.7152 * toLinear(rgb.g)
       + 0.0722 * toLinear(rgb.b);
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  if (l1 === null || l2 === null) return null;
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function _wcagGrade(ratio) {
  if (ratio === null)  return 'N/A  ';
  if (ratio >= 7.0)    return 'AAA  ';
  if (ratio >= 4.5)    return 'AA   ';
  return                      'FAIL ';
}

// OKLab conversion for perceptual distance checks.
function toOKLab(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const r = toLinear(rgb.r), g = toLinear(rgb.g), b = toLinear(rgb.b);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  return {
    L:  0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a:  1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b:  0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

function oklabDist(hex1, hex2) {
  const a = toOKLab(hex1), b = toOKLab(hex2);
  if (!a || !b) return null;
  return Math.sqrt((a.L-b.L)**2 + (a.a-b.a)**2 + (a.b-b.b)**2);
}

// ── Audit definition ──────────────────────────────────────────────────────

// Each entry: [fgToken, bgToken, context, minRatio]
// minRatio defaults to 4.5 (AA body text). Large/decorative text passes at 3.0.
const PAIRS = [
  // ── Slide layout (baseline) ──────────────────────────────────────────
  ['text-heading', 'bg',         'slide: heading on canvas'],
  ['text-body',    'bg',         'slide: body on canvas'],
  ['text-label',   'bg',         'slide: label on canvas'],
  ['text-heading', 'bg-alt',     'slide: heading on card'],
  ['text-heading', 'accent-soft','slide: heading on accent-soft'],
  ['on-accent',    'accent',     'slide: on-accent on accent'],
  ['bg',           'fail',       'slide: bg on fail (error chip)'],

  // ── Mermaid node fills ────────────────────────────────────────────────
  // Current state: mermaid-primary-color (may be inherited pale blue)
  ['text-heading', 'mermaid-primary-color',   'mermaid: heading on primary node fill'],
  ['text-heading', 'mermaid-secondary-color', 'mermaid: heading on secondary node fill'],

  // Proposed state after refactor: accent-soft / bg-alt as node fills
  ['text-heading', 'accent-soft', 'mermaid (post): heading on primary node fill'],
  ['text-heading', 'bg-alt',      'mermaid (post): heading on cluster fill'],

  // ── Mermaid chart fills (pie, active gantt, quadrant) ─────────────────
  // text-heading on mid-tone chart colours — high risk
  ['text-heading', 'chart-1', 'mermaid: heading on chart-1 (pie/gantt)'],
  ['text-heading', 'chart-2', 'mermaid: heading on chart-2'],
  ['text-heading', 'chart-3', 'mermaid: heading on chart-3'],
  ['text-heading', 'chart-4', 'mermaid: heading on chart-4'],
  ['text-heading', 'chart-5', 'mermaid: heading on chart-5'],
  ['text-heading', 'chart-6', 'mermaid: heading on chart-6'],

  // on-accent on mid-tone chart colours — alternative for pie text
  ['on-accent', 'chart-1', 'mermaid: on-accent on chart-1'],
  ['on-accent', 'chart-2', 'mermaid: on-accent on chart-2'],
  ['on-accent', 'chart-3', 'mermaid: on-accent on chart-3'],
  ['on-accent', 'chart-4', 'mermaid: on-accent on chart-4'],
  ['on-accent', 'chart-5', 'mermaid: on-accent on chart-5'],
  ['on-accent', 'chart-6', 'mermaid: on-accent on chart-6'],

  // ── Edge labels ───────────────────────────────────────────────────────
  ['text-heading', 'bg', 'mermaid: edge label text on canvas bg'],
];

const CHART_TOKENS = ['chart-1','chart-2','chart-3','chart-4','chart-5','chart-6'];
// OKLab distance threshold: 0.15 ≈ "just about distinct" for categorical use.
// Well-designed palettes target ≥ 0.20 for adjacent slots.
const OKLAB_THRESHOLD = 0.15;

// ── Runner ────────────────────────────────────────────────────────────────

const args       = process.argv.slice(2);
const failsOnly  = args.includes('--fails-only');
const themeArgs  = args.filter(a => !a.startsWith('-'));

const allThemes = fs.readdirSync(THEMES_DIR)
  .filter(f => f.endsWith('.css'))
  .map(f => f.replace('.css', ''))
  .sort();

const themes = themeArgs.length ? themeArgs : allThemes;

let totalFails = 0;
const totalWarns = 0;
let totalChecks = 0;

console.log('');
console.log('  Lattice · Contrast & Colour-Theory Audit');
console.log('  ══════════════════════════════════════════════════════════════');
console.log('  WCAG AA = 4.5:1 · AAA = 7:1 · OKLab ΔE threshold = 0.15');
console.log('');

for (const theme of themes) {
  const cssFile = path.join(THEMES_DIR, `${theme}.css`);
  if (!fs.existsSync(cssFile)) {
    console.log(`  [skip] ${theme} — file not found`);
    continue;
  }

  const css  = loadPaletteWithImports(cssFile);
  const vars = parsePaletteVars(css);

  const fails = [];
  const missing = [];

  for (const [fg, bg, ctx] of PAIRS) {
    const fgHex = vars[fg];
    const bgHex = vars[bg];

    // Skip pairs where either token is not defined in this theme's chain.
    if (!fgHex || !bgHex) {
      if (parseHex(fgHex) === null || parseHex(bgHex) === null) {
        // Token exists but value isn't a plain hex (e.g. color-mix).
        // Flag only if both tokens exist but can't be resolved.
        if (fgHex && bgHex) {
          missing.push({ ctx, fg: fgHex, bg: bgHex });
        }
      }
      continue;
    }

    if (!parseHex(fgHex) || !parseHex(bgHex)) {
      missing.push({ ctx, fg: fgHex, bg: bgHex });
      continue;
    }

    totalChecks++;
    const ratio = contrastRatio(fgHex, bgHex);
    if (ratio < 4.5) {
      totalFails++;
      fails.push({ ctx, fgHex, bgHex, ratio });
    }
  }

  // Chart palette: OKLab pairwise distinctness.
  const chartHexes = CHART_TOKENS.map(t => vars[t]).filter(h => parseHex(h));
  const weakPairs = [];
  for (let i = 0; i < chartHexes.length; i++) {
    for (let j = i + 1; j < chartHexes.length; j++) {
      const d = oklabDist(chartHexes[i], chartHexes[j]);
      if (d !== null && d < OKLAB_THRESHOLD) {
        weakPairs.push({
          a: `chart-${i+1}(${chartHexes[i]})`,
          b: `chart-${j+1}(${chartHexes[j]})`,
          d,
        });
      }
    }
  }

  const hasIssues = fails.length || weakPairs.length || missing.length;

  if (!hasIssues && failsOnly) continue;

  const isDark = css.match(/:root\s*\{[^}]*color-scheme\s*:\s*dark\b/) ? ' [dark]' : '';
  console.log(`  ── ${theme}${isDark} ${'─'.repeat(Math.max(1, 52 - theme.length - isDark.length))}`);

  if (!hasIssues) {
    const minDist = chartHexes.length >= 2
      ? Math.min(...CHART_TOKENS.slice(0, chartHexes.length).flatMap((_, i) =>
          CHART_TOKENS.slice(i+1, chartHexes.length).map((__, j) => {
            const d = oklabDist(chartHexes[i], chartHexes[i+1+j]);
            return d ?? Infinity;
          })
        ))
      : Infinity;
    const distStr = Number.isFinite(minDist) ? `  chart min ΔE ${minDist.toFixed(3)}` : '';
    console.log(`     ✓ all checks pass${distStr}`);
  } else {
    for (const f of fails) {
      const r = f.ratio.toFixed(2).padStart(5);
      console.log(`     ✗ ${r}:1  ${f.fgHex} on ${f.bgHex}`);
      console.log(`          ${f.ctx}`);
    }
    for (const w of weakPairs) {
      console.log(`     ⚠ chart ΔE ${w.d.toFixed(3)}  ${w.a} ↔ ${w.b}`);
    }
    for (const u of missing) {
      console.log(`     ?  unresolved pair [${u.ctx}]`);
      console.log(`          fg=${u.fg}  bg=${u.bg}`);
    }
  }
  console.log('');
}

console.log('  ══════════════════════════════════════════════════════════════');
console.log(`  ${totalFails} contrast failures · ${totalWarns} warnings · ${totalChecks} pairs checked across ${themes.length} themes`);
console.log('');
