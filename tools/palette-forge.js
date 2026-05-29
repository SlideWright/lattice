#!/usr/bin/env node
/**
 * palette-forge — derive a complete, contrast-clean Lattice palette from a
 * single brand colour.
 *
 *   node tools/palette-forge.js <brand-hex> [options]
 *
 * Options:
 *   --name <name>        @theme name + filename stem (default: "forged")
 *   --scheme light|dark  canvas the palette is authored for (default: light)
 *   -o <path>            write a themes/<name>.css file (default: stdout)
 *   --audit              self-check the generated tokens (WCAG + OKLab ΔE)
 *                        and print a report; non-zero exit on any failure
 *
 * Design contract (engineering/decisions/2026-05-29-palette-recuration.md):
 *   - Universal token NAMES/roles are fixed; this tool fills the VALUES.
 *   - Every text-bearing token clears AA (4.5:1); state discs + strokes
 *     clear the graphical floor (3:1); decorative tokens are exempt.
 *   - The 12 categorical slots and the 8 chart series both derive from the
 *     brand hue, so charts and diagrams share one visual family (cohesion
 *     via shared anchors). The deep tier and the chart series vary lightness
 *     per hue (natural-luminance curve) to maximise categorical distinctness
 *     — the looser lightness contract that the rigid L≈32 lockstep lacked.
 *
 * The output is a KNOWN-GOOD STARTING POINT, in the spirit of the audit's
 * rank-1 proposals: contrast-safe and cohesive, then hand-tuned to taste.
 */

'use strict';

// ── sRGB ↔ linear ↔ OKLab ↔ OKLCH ─────────────────────────────────────────
const clamp01 = x => Math.min(1, Math.max(0, x));
const srgbToLinear = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error(`not a hex colour: ${hex}`);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHex([r, g, b]) {
  const to = v => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${to(r)}${to(g)}${to(b)}`;
}
function linearRgbToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}
function oklabToLinearRgb(L, a, b) {
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    +4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
  ];
}
function hexToOklch(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => srgbToLinear(v / 255));
  const { L, a, b: bb } = linearRgbToOklab(r, g, b);
  return { L, C: Math.hypot(a, bb), H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}
function inGamut([r, g, b]) {
  const e = 1e-4;
  return r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && b >= -e && b <= 1 + e;
}
// OKLCH → sRGB hex, reducing chroma (binary search) until in gamut.
function oklch(L, C, H) {
  L = clamp01(L);
  const hr = (H * Math.PI) / 180;
  let lo = 0, hi = C;
  const at = c => oklabToLinearRgb(L, c * Math.cos(hr), c * Math.sin(hr));
  if (!inGamut(at(C))) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid; else hi = mid;
    }
    C = lo;
  }
  return rgbToHex(at(C).map(linearToSrgb));
}

// ── WCAG contrast + OKLab ΔE ──────────────────────────────────────────────
function relLum(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => srgbToLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = relLum(a), lb = relLum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function deltaE(h1, h2) {
  const a = hexToOklch(h1), b = hexToOklch(h2);
  const a1 = a.C * Math.cos((a.H * Math.PI) / 180), b1 = a.C * Math.sin((a.H * Math.PI) / 180);
  const a2 = b.C * Math.cos((b.H * Math.PI) / 180), b2 = b.C * Math.sin((b.H * Math.PI) / 180);
  return Math.hypot(a.L - b.L, a1 - a2, b1 - b2);
}

// Find an OKLCH colour at hue H, chroma C, whose lightness gives AT LEAST
// `target` contrast against `against`, searching from the `prefer` side
// ('dark' = below the reference, 'light' = above). Returns the hex closest
// to the reference that still clears the bar (most chroma-preserving).
function solveForContrast(against, C, H, target, prefer = 'dark') {
  const refL = hexToOklch(against).L;
  const lo = prefer === 'dark' ? 0 : refL;
  const hi = prefer === 'dark' ? refL : 1;
  let best = prefer === 'dark' ? oklch(0, C, H) : oklch(1, C, H);
  // Scan inward from the extreme toward the reference; keep the last that passes.
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const L = prefer === 'dark' ? lo + ((hi - lo) * i) / steps : hi - ((hi - lo) * i) / steps;
    const hex = oklch(L, C, H);
    if (contrast(hex, against) >= target) best = hex; else break;
  }
  return best;
}

// ── Hue + lightness curves for distinctness ───────────────────────────────
// Evenly spread N hues from the brand hue. Natural-luminance curve: yellow/
// green register light, blue/violet register dark — varying L with hue
// maximises perceptual separation at constant chroma (the categorical-palette
// recipe). Returns L multiplier 0.78..1.06 keyed by hue.
function naturalL(H) {
  // peak ~100° (yellow-green) lightest, trough ~280° (blue-violet) darkest
  return 0.92 + 0.14 * Math.cos(((H - 100) * Math.PI) / 180);
}

// ── Palette derivation ─────────────────────────────────────────────────────
function forge(brandHex, scheme) {
  const brand = hexToOklch(brandHex);
  const Hb = brand.H;
  const dark = scheme === 'dark';

  // Surfaces (light-canvas authoring; dark-scheme inverts via the wrapper).
  const bg     = dark ? oklch(0.16, 0.012, Hb) : oklch(0.992, 0.006, Hb);
  const bgAlt  = dark ? oklch(0.22, 0.018, Hb) : oklch(0.965, 0.012, Hb);
  const bgDark = oklch(0.26, Math.min(brand.C, 0.09), Hb);
  const border = dark ? oklch(0.32, 0.02, Hb)  : oklch(0.92, 0.018, Hb);

  // Ink ramp — verified AA against the binding (darker) surface.
  const bindSurface = dark ? bg : bgAlt;
  const heading = solveForContrast(bindSurface, 0.045, Hb, 8.0, dark ? 'light' : 'dark');
  const body    = solveForContrast(bindSurface, 0.05,  Hb, 5.5, dark ? 'light' : 'dark');
  const muted   = oklch(dark ? 0.62 : 0.55, 0.03, Hb); // decorative
  // Accent — brand hue, lightness pushed until AA on the BINDING surface
  // (bg-alt is darker than bg, so clearing it clears bg too; this is the
  // bug that lets light-brand accents pass on white but fail on cards).
  const accent  = solveForContrast(bindSurface, Math.max(brand.C, 0.10), Hb, 4.6, dark ? 'light' : 'dark');
  const accentSoft = dark ? oklch(0.24, 0.05, Hb) : oklch(0.955, 0.03, Hb);
  const label   = accent;

  // Categorical cycle — 12 evenly-spread hues anchored on the brand.
  // Pale tier (cN-light): uniform pale fill, holds dark ink (distinctness
  // matters little; these are backgrounds). Deep tier (cN-dark): natural-L
  // curve + high chroma, holds white ink (distinctness matters: charts/marks).
  const inkLight = heading;                 // dark ink on pale fills
  const inkDark  = dark ? heading : '#FFFFFF';
  const cLight = [], cDeep = [];
  for (let i = 0; i < 12; i++) {
    const H = (Hb + i * 30) % 360;
    cLight.push(oklch(0.87, 0.085, H));
    // deep tier: lightness from the natural curve scaled into [0.42,0.56]
    // so white ink stays AA, with per-hue variation for ΔE separation.
    const Ld = 0.42 + (naturalL(H) - 0.78) * (0.14 / 0.28);
    let hex = oklch(Math.min(Ld, 0.55), 0.16, H);
    if (contrast(hex, inkDark) < 4.5) hex = solveForContrast(inkDark, 0.16, H, 4.5, 'dark');
    cDeep.push(hex);
  }

  // Chart series — 8 saturated, maximally distinct data-ink colours sharing
  // the brand anchor. Even 45° hue spread + a WIDE natural-L range (light
  // yellows, dark blues) + max chroma — the spread in BOTH hue and lightness
  // is what makes categorical slots pop. These are marks (bars/lines/slices),
  // gated as graphical on the canvas; per-slice label ink is the consumer's
  // job (pair light slices with ink-light, dark slices with ink-dark).
  const chart = [];
  for (let i = 0; i < 8; i++) {
    const H = (Hb + i * 45) % 360;
    const L = 0.42 + ((naturalL(H) - 0.78) / 0.28) * 0.30; // ~0.42..0.72 by hue
    let hex = oklch(L, 0.24, H);
    if (contrast(hex, bg) < 3.0) hex = solveForContrast(bg, 0.24, H, 3.0, dark ? 'light' : 'dark');
    chart.push(hex);
  }

  // Semantic state — fixed meaning, brand-nudged hue, canvas-aware pairs.
  // Light side clears 3:1 on bg; dark side clears 3:1 on bgDark.
  const nudge = (base) => (base * 0.85 + Hb * 0.15);     // 15% toward brand
  const statePair = (hue) => {
    const lightHex = solveForContrast(bg, 0.14, nudge(hue), 3.2, dark ? 'light' : 'dark');
    const darkHex  = solveForContrast(bgDark, 0.16, nudge(hue), 3.2, 'light');
    return `light-dark(${lightHex}, ${darkHex})`;
  };
  const pass = statePair(145), warn = statePair(75), fail = statePair(28);

  // Universal semantic palette — pale fill + its ink, brand-nudged.
  const warmLight = oklch(dark ? 0.40 : 0.86, 0.07, nudge(55));
  const coolLight = oklch(dark ? 0.40 : 0.87, 0.045, nudge(245));
  const alarm     = solveForContrast(inkDark, 0.15, 28, 4.5, 'dark');
  const mark      = oklch(dark ? 0.55 : 0.80, 0.14, 95);
  const note      = oklch(dark ? 0.30 : 0.95, 0.05, 95);
  const stroke    = oklch(0.42, Math.min(brand.C, 0.11), Hb); // reads on pale bands
  const line      = dark ? oklch(0.85, 0.01, Hb) : oklch(0.12, 0.01, Hb);

  // Dark-variant tokens (consumed by section.dark + light-dark pairs).
  const dk = {
    bg: oklch(0.13, 0.012, Hb), bgAlt: oklch(0.20, 0.02, Hb), border: oklch(0.30, 0.025, Hb),
    heading: '#FFFFFF', body: oklch(0.86, 0.02, Hb), muted: oklch(0.60, 0.02, Hb),
    label: oklch(0.78, 0.04, Hb), display: '#FFFFFF',
  };

  return {
    brandHex, Hb, scheme,
    bg, bgAlt, bgDark, border, heading, body, muted, label, accent, accentSoft,
    cLight, cDeep, inkLight, inkDark, chart, pass, warn, fail,
    warmLight, coolLight, alarm, mark, note, stroke, line, dk,
  };
}

// ── Emit a themes/<name>.css file ──────────────────────────────────────────
function emit(name, p) {
  const list = (arr, stem) => arr.map((v, i) => `  --${stem}${i + 1}: ${v};`).join('\n');
  return `/* @theme ${name}
 * @size 16:9 1280px 720px
 * @size 4K   3840px 2160px
 *
 * Forged by tools/palette-forge.js from brand ${p.brandHex} (hue ${p.Hb.toFixed(0)}°),
 * scheme: ${p.scheme}. A contrast-clean starting point — hand-tune to taste.
 * See engineering/decisions/2026-05-29-palette-recuration.md.
 */
@import 'lattice';
:where(:root) { color-scheme: ${p.scheme}; }

:root {
  /* Surfaces */
  --bg:      light-dark(${p.bg}, var(--dark-bg));
  --bg-alt:  light-dark(${p.bgAlt}, var(--dark-bg-alt));
  --bg-dark: ${p.bgDark};
  --border:  light-dark(${p.border}, var(--dark-border));

  /* Ink */
  --text-display: ${p.dk.display};
  --text-heading: light-dark(${p.heading}, var(--dark-text-heading));
  --text-body:    light-dark(${p.body}, var(--dark-text-body));
  --text-label:   light-dark(${p.label}, var(--dark-text-label));
  --text-muted:   ${p.muted};

  /* Accent */
  --accent:      light-dark(${p.accent}, var(--dark-text-label));
  --accent-soft: light-dark(${p.accentSoft}, ${p.dk.bgAlt});
  --on-accent:   light-dark(#FFFFFF, ${p.bgDark});

  /* Semantic state — fixed meaning, canvas-aware */
  --pass: ${p.pass};
  --warn: ${p.warn};
  --fail: ${p.fail};
  --pass-bg: color-mix(in srgb, var(--pass) 10%, transparent);
  --warn-bg: color-mix(in srgb, var(--warn) 10%, transparent);
  --fail-bg: color-mix(in srgb, var(--fail) 10%, transparent);

  --scale-500: var(--accent);
}

/* Dark-variant tokens */
:root {
  --dark-bg: ${p.dk.bg};        --dark-bg-alt: ${p.dk.bgAlt};   --dark-border: ${p.dk.border};
  --dark-text-heading: ${p.dk.heading}; --dark-text-body: ${p.dk.body};
  --dark-text-muted: ${p.dk.muted};     --dark-text-label: ${p.dk.label};
  --dark-text-display: ${p.dk.display};
}

/* Categorical cycle + chart series + structural */
:root {
  /* Pale tier — diagram band fills (hold dark ink) */
${list(p.cLight, 'c').replace(/--c(\d+):/g, '--c$1-light:')}

  /* Deep tier — saturated marks / kanban / gantt (hold white ink) */
${list(p.cDeep, 'c').replace(/--c(\d+):/g, '--c$1-dark:')}

  --c-ink-light: ${p.inkLight};
  --c-ink-dark:  ${p.inkDark};

  /* Chart series — 8 distinct data-ink colours, brand-anchored */
${list(p.chart, 'chart-')}

  /* Universal semantic palette */
  --c-warm-light: ${p.warmLight}; --c-warm-dark: var(--c-stroke);
  --c-cool-light: ${p.coolLight}; --c-cool-dark: var(--c-stroke);
  --c-alarm: ${p.alarm};          --c-alarm-dark: var(--c-stroke);
  --c-mark: ${p.mark};            --c-note: ${p.note};

  /* Structural */
  --c-stroke: ${p.stroke};
  --c-line:   light-dark(${p.line}, var(--dark-text-body));
  --c-accent-warm: ${p.chart[5]};

  /* Quadrant (Q1→c1, Q2→c2, Q3→c7, Q4→c3) */
  --c-quadrant-1-fill: var(--c1-light); --c-quadrant-1-text: var(--c-ink-light);
  --c-quadrant-2-fill: var(--c2-light); --c-quadrant-2-text: var(--c-ink-light);
  --c-quadrant-3-fill: var(--c7-light); --c-quadrant-3-text: var(--c-ink-light);
  --c-quadrant-4-fill: var(--c3-light); --c-quadrant-4-text: var(--c-ink-light);
}
`;
}

// ── Self-audit ──────────────────────────────────────────────────────────────
function audit(p) {
  const fails = [];
  const aa = (label, fill, text) => { const r = contrast(fill, text); if (r < 4.5) fails.push(`AA  ${label}: ${r.toFixed(2)} (${fill}/${text})`); };
  const ui = (label, fill, text) => { const r = contrast(fill, text); if (r < 3.0) fails.push(`UI  ${label}: ${r.toFixed(2)} (${fill}/${text})`); };
  aa('heading/bg-alt', p.bgAlt, p.heading);
  aa('body/bg-alt', p.bgAlt, p.body);
  aa('label/bg', p.bg, p.label);
  aa('label/bg-alt', p.bgAlt, p.label);
  aa('accent/bg-alt', p.bgAlt, p.accent);
  p.cLight.forEach((c, i) => aa(`c${i + 1}-light/ink`, c, p.inkLight));
  p.cDeep.forEach((c, i) => aa(`c${i + 1}-dark/ink`, c, p.inkDark));
  p.chart.forEach((c, i) => ui(`chart-${i + 1}/bg`, p.bg, c)); // marks: graphical floor
  // state light sides
  for (const [n, v] of [['pass', p.pass], ['warn', p.warn], ['fail', p.fail]]) {
    const lightHex = v.match(/light-dark\(([^,]+),/)[1].trim();
    ui(`${n}/bg`, p.bg, lightHex);
  }
  ui('stroke/c1-light', p.cLight[0], p.stroke);
  // chart distinctness
  let minDE = Infinity;
  for (let i = 0; i < p.chart.length; i++)
    for (let j = i + 1; j < p.chart.length; j++) minDE = Math.min(minDE, deltaE(p.chart[i], p.chart[j]));
  return { fails, minDE };
}

// ── CLI ─────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const opt = { name: 'forged', scheme: 'light', out: null, audit: false };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--name') opt.name = argv[++i];
    else if (a === '--scheme') opt.scheme = argv[++i];
    else if (a === '-o' || a === '--out') opt.out = argv[++i];
    else if (a === '--audit') opt.audit = true;
    else pos.push(a);
  }
  if (!pos[0]) {
    console.error('usage: node tools/palette-forge.js <brand-hex> [--name n] [--scheme light|dark] [-o path] [--audit]');
    process.exit(2);
  }
  const p = forge(pos[0], opt.scheme === 'dark' ? 'dark' : 'light');
  const css = emit(opt.name, p);

  if (opt.out) {
    require('fs').writeFileSync(opt.out, css);
    console.error(`wrote ${opt.out}`);
  } else if (!opt.audit) {
    process.stdout.write(css);
  }

  if (opt.audit) {
    const { fails, minDE } = audit(p);
    console.error(`\n  palette-forge audit — ${opt.name} (brand ${p.brandHex}, ${opt.scheme})`);
    console.error(`  chart-series min ΔE: ${minDE.toFixed(3)}  ${minDE >= 0.10 ? '✓' : '⚠ (<0.10, slots may confuse)'}`);
    if (fails.length) { console.error(`  ${fails.length} contrast failures:`); fails.forEach(f => console.error(`   ✗ ${f}`)); }
    else console.error('  ✓ all gated contrast pairs pass');
    process.exitCode = fails.length ? 1 : 0;
  }
}
main();
