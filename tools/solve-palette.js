#!/usr/bin/env node
/**
 * Palette solver — generate AA-perfect chameleon tokens from per-slot hues.
 *
 * Author specifies HUE per slot + AA target per tier + chroma + the
 * paired ink token. Solver binary-searches OKLCH lightness in each
 * canvas mode to hit the contrast target against the paired ink.
 *
 * Emits two files alongside the input:
 *   themes/<name>.tokens.generated.css   — :root { --cN-light: light-dark(…, …); }
 *   themes/<name>.contrast.md            — per-token WCAG report
 *
 * Usage:
 *   node tools/solve-palette.js themes/indaco.palette.json
 *
 * Design rationale: docs/notes/2026-05-17-color-strategy.md (Strategy 5).
 * AA formula mirrors test/unit/palette/contrast.test.js so the two agree
 * to the digit.
 */

const fs   = require('fs');
const path = require('path');

// ── OKLCH ↔ linear-sRGB ↔ sRGB ───────────────────────────────────────────
// Math from https://bottosson.github.io/posts/oklab/ (the OKLab spec).

function oklchToLinearRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

function linearToSrgb(c) {
  if (c <= 0) return 0;
  if (c >= 1) return 1;
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function srgbToLinear(c) {
  if (c <= 0.04045) return c / 12.92;
  return ((c + 0.055) / 1.055) ** 2.4;
}

function oklchToHex(L, C, h) {
  const lin = oklchToLinearRgb(L, C, h);
  const r = Math.round(linearToSrgb(lin.r) * 255);
  const g = Math.round(linearToSrgb(lin.g) * 255);
  const b = Math.round(linearToSrgb(lin.b) * 255);
  const clip = (v) => Math.max(0, Math.min(255, v));
  const hex = (v) => clip(v).toString(16).padStart(2, '0').toUpperCase();
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hexToRgb(hex) {
  const h = hex.replace(/^#/, '');
  const expand = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(expand.slice(0, 2), 16),
    g: parseInt(expand.slice(2, 4), 16),
    b: parseInt(expand.slice(4, 6), 16),
  };
}

// ── WCAG contrast (same formula as test/unit/palette/contrast.test.js) ───

function relativeLuminance({ r, g, b }) {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(rgbA, rgbB) {
  const la = relativeLuminance(rgbA);
  const lb = relativeLuminance(rgbB);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ── Solver ───────────────────────────────────────────────────────────────
// Binary search OKLCH lightness in [lo, hi] until contrast vs ink hits
// target ± tolerance. Direction of search depends on whether ink is
// darker or lighter than the candidate fill.

function solveLightness(hue, chroma, inkHex, targetAA, range) {
  const inkRgb = hexToRgb(inkHex);
  const inkLum = relativeLuminance(inkRgb);
  let [lo, hi] = range;
  let bestL = (lo + hi) / 2;
  let bestErr = Infinity;
  for (let i = 0; i < 40; i++) {
    const L = (lo + hi) / 2;
    const fillRgb = hexToRgb(oklchToHex(L, chroma, hue));
    const ratio = contrastRatio(fillRgb, inkRgb);
    const err = Math.abs(ratio - targetAA);
    if (err < bestErr) { bestErr = err; bestL = L; }
    // If candidate is lighter than ink, increasing L → more contrast.
    // If candidate is darker than ink, increasing L → less contrast.
    const fillLum = relativeLuminance(fillRgb);
    const candidateLighter = fillLum > inkLum;
    const needMoreContrast = ratio < targetAA;
    if (candidateLighter === needMoreContrast) lo = L; else hi = L;
    if (Math.abs(hi - lo) < 1e-4) break;
  }
  return bestL;
}

// Chroma-fallback wrapper: AA is the harder constraint. If the requested
// chroma can't hit target AA at any lightness in range, step chroma down
// 10% at a time until it does. Caps at 12 iterations.
function solveWithChromaFallback(hue, chroma, inkHex, targetAA, range) {
  const inkRgb = hexToRgb(inkHex);
  let C = chroma;
  for (let attempt = 0; attempt < 12; attempt++) {
    const L = solveLightness(hue, C, inkHex, targetAA, range);
    const ratio = contrastRatio(hexToRgb(oklchToHex(L, C, hue)), inkRgb);
    if (ratio >= targetAA - 0.005) return [L, C];
    C *= 0.85; // step down 15%
  }
  // Last resort: search at C=0 (achromatic). Always hits target if any L does.
  return [solveLightness(hue, 0, inkHex, targetAA, range), 0];
}

// ── Main ─────────────────────────────────────────────────────────────────

function wcagBand(ratio) {
  if (ratio >= 7)   return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3)   return 'AA-large';
  return 'FAIL';
}

// Resolve one tier spec (aa target + chroma + lightness ranges per mode)
// to the four parameters the solver needs per slot.
function resolveTier(spec, paired) {
  const chromaIn = spec.chroma ?? 0.10;
  return {
    aa: spec.aa ?? 4.5,
    chroma: {
      light: typeof chromaIn === 'object' ? chromaIn.light : chromaIn,
      dark:  typeof chromaIn === 'object' ? chromaIn.dark  : chromaIn,
    },
    lightRange: spec.lightLightRange ?? [0.78, 0.92],
    darkRange:  spec.darkLightRange  ?? [0.30, 0.50],
    paired,
  };
}

function generate(inputPath) {
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const { palette, inks, slots, tier, tiers, status } = input;
  if (!palette || !inks?.primary || !Array.isArray(slots)) {
    throw new Error('input requires { palette, inks.primary, slots, (tier | tiers) }');
  }

  // Two-tier mode: emit BOTH --cN-light (recessive, paired with c-ink-light)
  // and --cN-dark (prominent, paired with c-ink-dark) per slot. Each slot's
  // hue is shared across both tokens — that's what gives palette coherence
  // across charts using different registers (pie reads --cN-dark, mermaid
  // reads --cN-light; with shared hue both tokens at slot 2 are in the
  // same colour family).
  //
  // Single-tier (legacy) mode: emit only --cN-light. Kept for back-compat
  // with the Phase 1 input files.
  const twoTier = !tier && tiers?.recessive && tiers?.prominent;
  const recessive = twoTier
    ? resolveTier(tiers.recessive,  inks.primary)
    : resolveTier(tier ?? tiers?.recessive ?? {}, inks.primary);
  const prominent = twoTier ? resolveTier(tiers.prominent, inks.prominent ?? inks.primary) : null;
  if (twoTier && !inks.prominent) {
    throw new Error('two-tier input requires inks.prominent (paired with --cN-dark)');
  }

  const css = [];
  css.push('/* GENERATED by tools/solve-palette.js — DO NOT EDIT */');
  css.push(`/* Source: ${path.basename(inputPath)} */`);
  css.push(`/* Re-run: node tools/solve-palette.js ${path.relative(process.cwd(), inputPath)} */`);
  css.push(`/* Generated: ${new Date().toISOString().slice(0, 10)} */`);
  css.push('');
  css.push(':root {');

  function solveTierFor(slot, t) {
    const slotChroma = slot.chroma;
    const cLight = typeof slotChroma === 'object' ? slotChroma.light : (slotChroma ?? t.chroma.light);
    const cDark  = typeof slotChroma === 'object' ? slotChroma.dark  : (slotChroma ?? t.chroma.dark);
    const [lightL, finalCLight] = solveWithChromaFallback(slot.hue, cLight, t.paired.light, t.aa, t.lightRange);
    const [darkL,  finalCDark]  = solveWithChromaFallback(slot.hue, cDark,  t.paired.dark,  t.aa, t.darkRange);
    const lightHex = oklchToHex(lightL, finalCLight, slot.hue);
    const darkHex  = oklchToHex(darkL,  finalCDark,  slot.hue);
    const lightRatio = contrastRatio(hexToRgb(lightHex), hexToRgb(t.paired.light));
    const darkRatio  = contrastRatio(hexToRgb(darkHex),  hexToRgb(t.paired.dark));
    return { lightHex, darkHex, lightRatio, darkRatio };
  }

  const report = [];
  slots.forEach((slot, i) => {
    const n = i + 1;
    const rec = solveTierFor(slot, recessive);
    const label = slot.label ? ` /* ${slot.label} */` : '';
    css.push(`  --c${n}-light: light-dark(${rec.lightHex}, ${rec.darkHex});${label}`);
    const row = { n, label: slot.label, recessive: rec };
    if (twoTier) {
      const prom = solveTierFor(slot, prominent);
      css.push(`  --c${n}-dark:  light-dark(${prom.lightHex}, ${prom.darkHex});`);
      row.prominent = prom;
    }
    report.push(row);
  });

  // ── Chart-status tokens ──────────────────────────────────────────────
  // Slot-pinned aliases for chart-data semantic statuses. Each status owns
  // one hue (independent from the categorical cycle, but solved through
  // the same tier machinery). Emits {name}-fill (recessive register, for
  // large surfaces like progress bars / kanban cards) and {name}-mark
  // (prominent register, for narrow accents like lane stripes / pie
  // wedges of the status). Same naming contract everywhere — pie wedge
  // in slot N and progress-bar-shipped both pull from --chart-positive-*
  // when they encode the same semantic.
  //
  // Naming vocabulary: positive / neutral / negative / inactive / exploratory.
  // See docs/notes/2026-05-17-color-strategy.md for the rationale.
  const statusReport = [];
  if (status && twoTier) {
    css.push('  /* ── Chart status tokens (universal, two-register) ─────────── */');
    for (const [name, spec] of Object.entries(status)) {
      if (name.startsWith('$')) continue; // skip JSON metadata keys like $comment
      const slot = { hue: spec.hue ?? 0, chroma: spec.chroma };
      // "inactive" defaults to achromatic (gray); explicit chroma=0 if not provided.
      if (spec.neutral && slot.chroma === undefined) slot.chroma = 0;
      const rec = solveTierFor(slot, recessive);
      const prom = solveTierFor(slot, prominent);
      css.push(`  --chart-${name}-fill: light-dark(${rec.lightHex}, ${rec.darkHex});  /* ${spec.label ?? name} */`);
      css.push(`  --chart-${name}-mark: light-dark(${prom.lightHex}, ${prom.darkHex});`);
      statusReport.push({ name, label: spec.label, recessive: rec, prominent: prom });
    }
  }

  css.push('}');
  css.push('');

  const cssOut = path.join(path.dirname(inputPath), `${palette}.tokens.generated.css`);
  fs.writeFileSync(cssOut, css.join('\n'));

  // ── Contrast report ────────────────────────────────────────────────────
  const md = [];
  md.push(`# ${palette} — contrast report`);
  md.push('');
  md.push(`Generated by \`tools/solve-palette.js\` on ${new Date().toISOString().slice(0, 10)}.`);
  md.push(`Recessive (\`--cN-light\`): AA ${recessive.aa}:1 vs \`--c-ink-light\`.`);
  if (twoTier) md.push(`Prominent (\`--cN-dark\`):  AA ${prominent.aa}:1 vs \`--c-ink-dark\`.`);
  md.push('');
  md.push('| Slot | Label | Token | Mode | Fill | Ink | Ratio | WCAG |');
  md.push('|------|-------|-------|------|------|-----|-------|------|');
  report.forEach(({ n, label, recessive: rec, prominent: prom }) => {
    md.push(`| c${n} | ${label || ''} | \`--c${n}-light\` | light | \`${rec.lightHex}\` | \`${inks.primary.light}\` | ${rec.lightRatio.toFixed(2)}:1 | ${wcagBand(rec.lightRatio)} |`);
    md.push(`| c${n} | ${label || ''} | \`--c${n}-light\` | dark  | \`${rec.darkHex}\` | \`${inks.primary.dark}\` | ${rec.darkRatio.toFixed(2)}:1 | ${wcagBand(rec.darkRatio)} |`);
    if (prom) {
      md.push(`| c${n} | ${label || ''} | \`--c${n}-dark\` | light | \`${prom.lightHex}\` | \`${inks.prominent.light}\` | ${prom.lightRatio.toFixed(2)}:1 | ${wcagBand(prom.lightRatio)} |`);
      md.push(`| c${n} | ${label || ''} | \`--c${n}-dark\` | dark  | \`${prom.darkHex}\` | \`${inks.prominent.dark}\` | ${prom.darkRatio.toFixed(2)}:1 | ${wcagBand(prom.darkRatio)} |`);
    }
  });
  if (statusReport.length) {
    md.push('');
    md.push('## Chart status tokens');
    md.push('');
    md.push('| Status | Label | Token | Mode | Fill | Ink | Ratio | WCAG |');
    md.push('|--------|-------|-------|------|------|-----|-------|------|');
    statusReport.forEach(({ name, label, recessive: rec, prominent: prom }) => {
      md.push(`| ${name} | ${label || ''} | \`--chart-${name}-fill\` | light | \`${rec.lightHex}\` | \`${inks.primary.light}\` | ${rec.lightRatio.toFixed(2)}:1 | ${wcagBand(rec.lightRatio)} |`);
      md.push(`| ${name} | ${label || ''} | \`--chart-${name}-fill\` | dark  | \`${rec.darkHex}\` | \`${inks.primary.dark}\` | ${rec.darkRatio.toFixed(2)}:1 | ${wcagBand(rec.darkRatio)} |`);
      md.push(`| ${name} | ${label || ''} | \`--chart-${name}-mark\` | light | \`${prom.lightHex}\` | \`${inks.prominent.light}\` | ${prom.lightRatio.toFixed(2)}:1 | ${wcagBand(prom.lightRatio)} |`);
      md.push(`| ${name} | ${label || ''} | \`--chart-${name}-mark\` | dark  | \`${prom.darkHex}\` | \`${inks.prominent.dark}\` | ${prom.darkRatio.toFixed(2)}:1 | ${wcagBand(prom.darkRatio)} |`);
    });
  }
  md.push('');

  const mdOut = path.join(path.dirname(inputPath), `${palette}.contrast.md`);
  fs.writeFileSync(mdOut, md.join('\n'));

  // Self-verify with small ε tolerance — WCAG ratios round to 2 decimals
  // (e.g. 7.50 displayed for actual 7.4995 still rounds to AA). The visual
  // contract is at the ratio's printed precision, not float exactness.
  const EPSILON = 0.005;
  const failures = report.flatMap(({ n, recessive: rec, prominent: prom }) => {
    const fails = [];
    if (rec.lightRatio < recessive.aa - EPSILON) fails.push(`c${n}-light (light): ${rec.lightRatio.toFixed(2)} < ${recessive.aa}`);
    if (rec.darkRatio  < recessive.aa - EPSILON) fails.push(`c${n}-light (dark): ${rec.darkRatio.toFixed(2)} < ${recessive.aa}`);
    if (prom) {
      if (prom.lightRatio < prominent.aa - EPSILON) fails.push(`c${n}-dark (light): ${prom.lightRatio.toFixed(2)} < ${prominent.aa}`);
      if (prom.darkRatio  < prominent.aa - EPSILON) fails.push(`c${n}-dark (dark): ${prom.darkRatio.toFixed(2)} < ${prominent.aa}`);
    }
    return fails;
  });
  for (const { name, recessive: rec, prominent: prom } of statusReport) {
    if (rec.lightRatio < recessive.aa - EPSILON) failures.push(`chart-${name}-fill (light): ${rec.lightRatio.toFixed(2)} < ${recessive.aa}`);
    if (rec.darkRatio  < recessive.aa - EPSILON) failures.push(`chart-${name}-fill (dark): ${rec.darkRatio.toFixed(2)} < ${recessive.aa}`);
    if (prom.lightRatio < prominent.aa - EPSILON) failures.push(`chart-${name}-mark (light): ${prom.lightRatio.toFixed(2)} < ${prominent.aa}`);
    if (prom.darkRatio  < prominent.aa - EPSILON) failures.push(`chart-${name}-mark (dark): ${prom.darkRatio.toFixed(2)} < ${prominent.aa}`);
  }
  if (failures.length) {
    console.error(`AA verification failed for ${failures.length} token(s):`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }

  const verifiedCount = report.length * (twoTier ? 4 : 2) + statusReport.length * 4;
  console.log(`wrote ${path.relative(process.cwd(), cssOut)}`);
  console.log(`wrote ${path.relative(process.cwd(), mdOut)}`);
  console.log(`verified ${verifiedCount} pairs`);
}

if (require.main === module) {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node tools/solve-palette.js <palette.json>');
    process.exit(1);
  }
  generate(path.resolve(inputPath));
}

module.exports = { oklchToHex, hexToRgb, contrastRatio, relativeLuminance, solveLightness };
