#!/usr/bin/env node
/**
 * palette-forge — derive a complete, contrast-clean Lattice palette from a
 * single brand colour, designed for BOTH light and dark canvases.
 *
 *   node tools/palette-forge.js <brand-hex> [options]
 *
 * Options:
 *   --name <name>     @theme name + filename stem (default: "forged")
 *   -o <path>         write a themes/<name>.css file (default: stdout)
 *   --audit           self-check generated tokens (WCAG + OKLab ΔE), BOTH
 *                     modes; print report; non-zero exit on any failure
 *
 * Design contract (engineering/decisions/2026-05-29-palette-recuration.md):
 *   - Universal token NAMES/roles are fixed; this tool fills the VALUES.
 *   - LIGHT + DARK as one object. Surface/ink/accent/state tokens are
 *     `light-dark()` pairs. The categorical + semantic fills follow the
 *     band-flip contract: a fill's "light" slot is pale+dark-ink on a light
 *     canvas and deep+light-ink on a dark canvas — the paired ink flips with
 *     it, so AA holds in both modes (this is how indaco works).
 *   - Mermaid stays cohesive for free: the DIAGRAM OVERRIDES in lattice.css
 *     are palette-blind and consume these same tokens (--cN-light pale fills,
 *     --c-stroke, --c-line, --c-warm/cool/alarm/mark/note). A diagram and a
 *     chart of "category 1" are two tuned expressions of one brand anchor.
 *   - Contrast: AA (4.5) text-bearing, 3:1 graphical (state discs, strokes,
 *     chart marks), decorative exempt. Chart series target OKLab ΔE ≥ 0.10.
 *
 * Output is a KNOWN-GOOD STARTING POINT (the audit's rank-1 spirit):
 * contrast-safe and cohesive, then hand-tuned to taste.
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

// Lightness search: a colour at (C,H) whose L gives AT LEAST `target`
// contrast vs `against`, scanning from the `prefer` side toward the
// reference; returns the chroma-preserving hex closest to the boundary.
function solveForContrast(against, C, H, target, prefer = 'dark') {
  const refL = hexToOklch(against).L;
  const lo = prefer === 'dark' ? 0 : refL;
  const hi = prefer === 'dark' ? refL : 1;
  let best = prefer === 'dark' ? oklch(0, C, H) : oklch(1, C, H);
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const L = prefer === 'dark' ? lo + ((hi - lo) * i) / steps : hi - ((hi - lo) * i) / steps;
    const hex = oklch(L, C, H);
    if (contrast(hex, against) >= target) best = hex; else break;
  }
  return best;
}

const ld = (a, b) => `light-dark(${a}, ${b})`;
// Natural-luminance curve: yellow-green registers light, blue-violet dark.
// Varying L with hue maximises perceptual separation (categorical recipe).
const naturalL = H => 0.92 + 0.14 * Math.cos(((H - 100) * Math.PI) / 180);

// ── EDITORIAL QUALITATIVE RINGS (the settled palette strategy) ─────────────
// Philosophy: a curated, MUTED, harmonious qualitative set — the "expensive
// consulting deck / Economist / FT" look. Not an auto-rainbow of evenly
// spaced hues. Instead we hand-pick a hue RING (12 slots) and RE-ANCHOR it so
// slot 1 = the brand hue and the whole set rotates with the brand, leaning
// toward the brand's temperature. Chroma + lightness are held to tight,
// consistent bands per tier so the colours sit together like one designed
// family rather than a primary-bright spectrum.
//
// The ring is expressed as ANGULAR OFFSETS from the brand hue (deg). The
// offsets are deliberately uneven — clustered where the eye separates well,
// spread where it doesn't — and ORDERED colourblind-aware so no two adjacent
// slots collapse to a red/green ambiguity. Two rings: a COOL-leaning ring for
// cool brands (indigo) and a WARM-leaning ring for warm brands (leather-gold).
//
// Each offset carries a per-slot lightness + chroma trim so the muted jewel /
// earthy character holds across the ring (some hues — yellow, cyan — must be
// pulled darker/desaturated to avoid reading neon or washing out pale fills).
//
//   { d: hue offset°, lt: pale-L trim, ct: chroma scale, dt: deep-L trim }
// The first EIGHT slots are the chart series AND the most-used categorical
// slots, so they are spread widely around the wheel (≈ even coverage,
// perturbed for editorial taste + a per-hue L offset so adjacent slots also
// separate in lightness — the consulting-deck trick: distinct in BOTH hue and
// value, never relying on hue alone). Slots 9–12 interleave in the gaps.
// brand hue indaco ≈ 242°, leather-gold ≈ 83°.
// The first EIGHT slots span the wheel at ~45° intervals (genuine categorical
// coverage so 8 chart series separate), but the spacing is PERTURBED — wider
// gaps on the brand's near side, tighter on the far side — and each slot
// carries a value (L) offset so it also separates in lightness. This is the
// editorial difference from auto-rainbow: deliberate, uneven, value-laddered
// spacing + heavy muting, not a mechanical 30° sweep. Slots 9–12 fill the gaps
// with the brand-temperature accents (jewel for cool, earth for warm).
// indaco ≈ 242°; leather-gold ≈ 83°.
// cdt = chart value (L) offset for the first-8 chart series — ring-specific so
// hue-adjacent slots part in lightness without affecting the band tiers.
// First 8 = 8 well-separated hues (≈36° min gap), COOL-WEIGHTED (indigo→teal
// half the wheel) but with the warm anchors muted for the counterweight.
// Order is colourblind-aware: orange (slot 7) and green (slot 4) never sit
// adjacent. Value ladder (cdt) parts hue-near slots in lightness too.
// indaco hue ≈ 242°. Resulting hues: 242,206,128,338,86,170,30,290.
const COOL_RING = [
  { d:   0, lt:  0.000, ct: 1.00, dt:  0.04, cdt:  0.02 }, // 1 indigo (brand) — anchor; H242
  { d: 324, lt:  0.000, ct: 0.92, dt:  0.02, cdt:  0.14 }, // 2 blue (light); H206
  { d: 246, lt:  0.008, ct: 0.82, dt:  0.05, cdt:  0.08 }, // 3 green; H128
  { d:  96, lt: -0.012, ct: 0.84, dt: -0.03, cdt: -0.04 }, // 4 magenta-rose (dark); H338
  { d: 204, lt:  0.006, ct: 0.84, dt:  0.06, cdt:  0.18 }, // 5 gold (light, warm cw); H86
  { d: 288, lt:  0.006, ct: 0.80, dt:  0.04, cdt: -0.04 }, // 6 teal (dark, parts from c2); H170
  { d: 148, lt: -0.004, ct: 0.88, dt:  0.00, cdt: -0.08 }, // 7 terracotta-orange (dark); H30
  { d:  48, lt: -0.014, ct: 0.82, dt: -0.04, cdt: -0.06 }, // 8 violet (dark); H290
  { d:  72, lt:  0.012, ct: 0.84, dt:  0.00 }, // 9 chartreuse-olive (light); light, gap-fill
  { d:  16, lt: -0.028, ct: 0.92, dt:  0.02 }, // 10 deep steel-blue; H258 (pale pulled darker, parts from c1)
  { d: 126, lt:  0.014, ct: 0.78, dt: -0.02 }, // 11 light sage; H8 (light)
  { d: 222, lt: -0.010, ct: 0.86, dt:  0.04 }, // 12 deep gold; H104 (dark)
];
const WARM_RING = [
  { d:   0, lt:  0.000, ct: 1.00, dt:  0.06, cdt:  0.04 }, // 1 brand leather-gold — anchor
  { d:  52, lt:  0.010, ct: 0.92, dt:  0.08, cdt:  0.18 }, // 2 amber-brass (light)
  { d: 110, lt:  0.006, ct: 0.84, dt:  0.04, cdt:  0.10 }, // 3 sage-olive
  { d: 168, lt: -0.008, ct: 0.82, dt: -0.02, cdt: -0.02 }, // 4 slate-teal (cool counterweight)
  { d: 224, lt: -0.012, ct: 0.80, dt: -0.04, cdt:  0.02 }, // 5 dusty indigo
  { d: 280, lt: -0.010, ct: 0.80, dt: -0.03, cdt:  0.16 }, // 6 plum (light)
  { d: 322, lt: -0.014, ct: 0.82, dt: -0.05, cdt: -0.06 }, // 7 burgundy-rose (dark)
  { d:  28, lt:  0.006, ct: 0.96, dt:  0.05, cdt: -0.08 }, // 8 terracotta-rust (dark, parts from c2)
  { d: 142, lt:  0.000, ct: 0.84, dt:  0.00 }, // 9 moss
  { d: 196, lt: -0.006, ct: 0.80, dt: -0.02 }, // 10 deep teal
  { d:  82, lt:  0.004, ct: 0.90, dt:  0.03 }, // 11 ochre
  { d: 250, lt: -0.008, ct: 0.78, dt: -0.02 }, // 12 indigo-violet
];

// ── Palette derivation ─────────────────────────────────────────────────────
function forge(brandHex, scheme) {
  const brand = hexToOklch(brandHex);
  const Hb = brand.H;
  const nudge = base => base * 0.85 + Hb * 0.15; // 15% toward brand hue

  // Surfaces — light canvas. Dark canvas via the --dark-* block below.
  const bgL    = oklch(0.992, 0.006, Hb);
  const bgAltL = oklch(0.965, 0.012, Hb);
  const bgDark = oklch(0.26, Math.min(brand.C, 0.09), Hb);
  const borderL = oklch(0.92, 0.018, Hb);

  // Dark-canvas surfaces/ink (consumed by light-dark() + section.dark).
  const dk = {
    bg: oklch(0.13, 0.012, Hb), bgAlt: oklch(0.20, 0.02, Hb), border: oklch(0.30, 0.025, Hb),
    heading: '#FFFFFF', body: oklch(0.86, 0.02, Hb), muted: oklch(0.60, 0.02, Hb),
    label: oklch(0.78, 0.05, Hb), display: '#FFFFFF',
  };

  // Ink — verified AA against the binding (darker) light surface; dark side
  // is white/near-white on the dark canvas.
  const headingL = solveForContrast(bgAltL, 0.045, Hb, 8.0, 'dark');
  const bodyL    = solveForContrast(bgAltL, 0.05,  Hb, 5.5, 'dark');
  const mutedL   = oklch(0.55, 0.03, Hb);
  const accentL  = solveForContrast(bgAltL, Math.max(brand.C, 0.10), Hb, 4.6, 'dark');
  const accentSoftL = oklch(0.955, 0.03, Hb);

  // Ink tokens as pairs (heading flips dark→white; the c-ink pair flips too).
  const textHeading = ld(headingL, dk.heading);
  const cInkLight   = textHeading;            // dark ink on pale; white on deep
  const cInkDark    = ld('#FFFFFF', headingL); // white on deep; dark ink on pale

  // EDITORIAL QUALITATIVE categorical cycle — 12 CURATED hues, re-anchored on
  // the brand. The ring is chosen by brand temperature: a cool brand (b-blue
  // dominant) gets the COOL ring (jewel-muted, cool-leaning); a warm brand
  // gets the WARM ring (earthy-muted). Slot 1 is always the brand hue exactly.
  //
  // DISCIPLINE (what makes it read as ONE designed set, not a rainbow):
  //   - PALE tier (Mermaid node fills): tight L band ~0.885 ± per-slot trim,
  //     muted chroma 0.072 × per-slot scale. The trims pull adjacent pale
  //     fills apart in L so Mermaid nodes stay distinguishable near white.
  //   - DEEP tier (chart-family pie/kanban + cScale marks): muted chroma
  //     ~0.118 (vs the stock 0.16) for the consulting-deck restraint, L set by
  //     a gentle natural-luminance curve trimmed per slot, capped so every
  //     deep fill clears AA on white ink.
  // Brand-temperature test: OKLab b<0 (cool, blue side) → cool ring.
  const brandAB = (() => { const hr = (Hb * Math.PI) / 180; return { a: brand.C * Math.cos(hr), b: brand.C * Math.sin(hr) }; })();
  const RING = brandAB.b < 0.02 ? COOL_RING : WARM_RING;

  const PALE_L = 0.885, PALE_C = 0.082, DEEP_C = 0.118;
  const cLightPairs = [], cDarkPairs = [], paleSet = [], deepSet = [], cycleH = [];
  for (let i = 0; i < 12; i++) {
    const slot = RING[i];
    const H = (Hb + slot.d) % 360;
    cycleH.push(H);
    // Pale fill — disciplined L band, per-slot L trim for Mermaid distinctness.
    let pale = oklch(PALE_L + slot.lt, PALE_C * slot.ct, H);
    if (contrast(pale, headingL) < 4.5) pale = solveForContrast(headingL, PALE_C * slot.ct, H, 4.5, 'light');
    // Deep fill — muted chroma, gentle natural-L curve + per-slot trim.
    const deepL = Math.min(0.40 + ((naturalL(H) - 0.78) / 0.28) * 0.12 + slot.dt, 0.52);
    let deep = oklch(deepL, DEEP_C * slot.ct, H);
    if (contrast(deep, '#FFFFFF') < 4.5) deep = solveForContrast('#FFFFFF', DEEP_C * slot.ct, H, 4.5, 'dark');
    paleSet.push(pale); deepSet.push(deep);
    cLightPairs.push(ld(pale, deep));
    cDarkPairs.push(ld(deep, pale));
  }

  // Chart series — 8 marks drawn from the FIRST 8 curated ring slots (so the
  // chart palette IS the categorical palette, one designed system). Same muted
  // discipline, a touch more chroma than bands (charts are small marks that
  // need a little more punch) and a wider L spread for separation. The dark
  // sibling is a brighter, equally-muted version on the dark canvas.
  // Charts get a touch MORE chroma than bands — data marks must read at a
  // glance — but stay well below primary-bright. Editorial restraint lives in
  // the bands/Mermaid; charts add the controlled punch a series legend needs.
  // We lean on a deliberate per-slot value (L) spread so the 8 series separate
  // in BOTH hue and lightness, which is what keeps a cool-leaning ramp legible.
  const CHART_C = 0.182;
  const chartPairs = [], chartL = [], chartD = [];
  for (let i = 0; i < 8; i++) {
    const slot = RING[i];
    const H = (Hb + slot.d) % 360;
    // Per-slot value ladder (ring-specific `cdt`) parts hue-adjacent series in
    // lightness — distinct in BOTH hue and value, the consulting-deck recipe.
    const Lc = 0.46 + ((naturalL(H) - 0.84) / 0.28) * 0.14 + (slot.cdt || 0); // muted, value-laddered
    let light = oklch(clamp01(Lc), CHART_C * slot.ct, H);
    if (contrast(light, bgL) < 3.0) light = solveForContrast(bgL, CHART_C * slot.ct, H, 3.0, 'dark');
    let darkv = oklch(clamp01(Lc + 0.16), CHART_C * slot.ct, H);
    if (contrast(darkv, dk.bg) < 3.0) darkv = solveForContrast(dk.bg, CHART_C * slot.ct, H, 3.0, 'light');
    chartL.push(light); chartD.push(darkv);
    chartPairs.push(ld(light, darkv));
  }

  // Semantic state — fixed meaning, brand-nudged hue, canvas-aware pairs.
  const statePair = hue => ld(
    solveForContrast(bgL, 0.14, nudge(hue), 3.2, 'dark'),
    solveForContrast(dk.bg, 0.16, nudge(hue), 3.2, 'light'),
  );
  const pass = statePair(145), warn = statePair(75), fail = statePair(28);

  // Universal semantic palette — pale fill (light) / deep fill (dark), each
  // holding its paired ink, brand-nudged. Same band-flip shape as the cycle.
  const semPair = (hue, C) => {
    const pale = oklch(0.87, C * 0.6, nudge(hue));
    let deep = oklch(0.44, C, nudge(hue));
    if (contrast(deep, '#FFFFFF') < 4.5) deep = solveForContrast('#FFFFFF', C, nudge(hue), 4.5, 'dark');
    return ld(pale, deep);
  };
  const warm = semPair(55, 0.11);
  const cool = semPair(245, 0.09);
  const alarm = ld(
    solveForContrast('#FFFFFF', 0.16, 28, 4.5, 'dark'),       // deep red, holds white (light mode)
    solveForContrast(headingL, 0.13, 28, 4.5, 'light'),       // bright red, holds dark ink (dark mode)
  );
  const mark = ld(oklch(0.80, 0.14, 95), oklch(0.58, 0.13, 95));
  const note = ld(oklch(0.95, 0.05, 95), oklch(0.30, 0.045, 95));

  // Structural — stroke reads on pale bands (light) / deep bands (dark).
  const stroke = ld(oklch(0.42, Math.min(brand.C, 0.11), Hb), oklch(0.80, 0.05, Hb));
  const line   = ld(oklch(0.12, 0.01, Hb), dk.body);

  return {
    brandHex, Hb, scheme,
    bgL, bgAltL, bgDark, borderL, headingL, bodyL, mutedL, accentL, accentSoftL,
    textHeading, cInkLight, cInkDark, dk,
    cLightPairs, cDarkPairs, chartPairs, paleSet, deepSet, chartL, chartD,
    pass, warn, fail, warm, cool, alarm, mark, note, stroke, line,
  };
}

// ── Emit a themes/<name>.css file ──────────────────────────────────────────
function emit(name, p) {
  const cycle = (pairs, stem) => pairs.map((v, i) => `  --${stem}${i + 1}: ${v};`).join('\n');
  return `/* @theme ${name}
 * @size 16:9 1280px 720px
 * @size 4K   3840px 2160px
 *
 * Forged by tools/palette-forge.js from brand ${p.brandHex} (hue ${p.Hb.toFixed(0)}°).
 * Designed for light AND dark canvases (light-dark() pairs throughout).
 * A contrast-clean starting point — hand-tune to taste.
 * See engineering/decisions/2026-05-29-palette-recuration.md.
 */
@import 'lattice';
:where(:root) { color-scheme: ${p.scheme}; }

:root {
  /* Surfaces */
  --bg:      light-dark(${p.bgL}, var(--dark-bg));
  --bg-alt:  light-dark(${p.bgAltL}, var(--dark-bg-alt));
  --bg-dark: ${p.bgDark};
  --border:  light-dark(${p.borderL}, var(--dark-border));

  /* Ink */
  --text-display: #FFFFFF;
  --text-heading: ${p.textHeading};
  --text-body:    light-dark(${p.bodyL}, var(--dark-text-body));
  --text-label:   light-dark(${p.accentL}, var(--dark-text-label));
  --text-muted:   ${p.mutedL};

  /* Accent */
  --accent:      light-dark(${p.accentL}, var(--dark-text-label));
  --accent-soft: light-dark(${p.accentSoftL}, ${p.dk.bgAlt});
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

/* Dark-variant tokens (section.dark + the dark side of every light-dark()) */
:root {
  --dark-bg: ${p.dk.bg};            --dark-bg-alt: ${p.dk.bgAlt};   --dark-border: ${p.dk.border};
  --dark-text-heading: ${p.dk.heading}; --dark-text-body: ${p.dk.body};
  --dark-text-muted: ${p.dk.muted};     --dark-text-label: ${p.dk.label};
  --dark-text-display: ${p.dk.display};
}

/* Categorical cycle + chart series + semantic + structural */
:root {
  /* Band fills — light-dark(pale, deep); paired ink flips with them */
${cycle(p.cLightPairs, 'c').replace(/--c(\d+):/g, '--c$1-light:')}

  /* Marks — light-dark(deep, pale), the inverse of the band fill */
${cycle(p.cDarkPairs, 'c').replace(/--c(\d+):/g, '--c$1-dark:')}

  --c-ink-light: ${p.cInkLight};
  --c-ink-dark:  ${p.cInkDark};

  /* Chart series — 8 distinct data-ink colours; brighter on dark canvas */
${cycle(p.chartPairs, 'chart-')}

  /* Universal semantic palette */
  --c-warm-light: ${p.warm}; --c-warm-dark: var(--c-stroke);
  --c-cool-light: ${p.cool}; --c-cool-dark: var(--c-stroke);
  --c-alarm: ${p.alarm};     --c-alarm-dark: var(--c-stroke);
  --c-mark: ${p.mark};       --c-note: ${p.note};

  /* Structural */
  --c-stroke: ${p.stroke};
  --c-line:   ${p.line};
  --c-accent-warm: ${p.chartL[5]};

  /* Quadrant (Q1→c1, Q2→c2, Q3→c7, Q4→c3) */
  --c-quadrant-1-fill: var(--c1-light); --c-quadrant-1-text: var(--c-ink-light);
  --c-quadrant-2-fill: var(--c2-light); --c-quadrant-2-text: var(--c-ink-light);
  --c-quadrant-3-fill: var(--c7-light); --c-quadrant-3-text: var(--c-ink-light);
  --c-quadrant-4-fill: var(--c3-light); --c-quadrant-4-text: var(--c-ink-light);
}
`;
}

// ── Self-audit (both modes) ──────────────────────────────────────────────────
function side(pair, mode) {
  const m = String(pair).match(/^light-dark\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
  if (!m) return pair;
  return mode === 'dark' ? m[2] : m[1];
}
function audit(p) {
  const fails = [];
  const check = (bar, label, fill, text) => { const r = contrast(fill, text); if (r < bar) fails.push(`${bar === 4.5 ? 'AA' : 'UI'} [${label}] ${r.toFixed(2)} (${fill}/${text})`); };
  for (const mode of ['light', 'dark']) {
    const ink = side(p.cInkLight, mode), inkD = side(p.cInkDark, mode);
    const bg = mode === 'dark' ? p.dk.bg : p.bgL;
    const bgAlt = mode === 'dark' ? p.dk.bgAlt : p.bgAltL;
    const heading = mode === 'dark' ? p.dk.heading : p.headingL;
    const body = mode === 'dark' ? p.dk.body : p.bodyL;
    const accent = mode === 'dark' ? p.dk.label : p.accentL;
    check(4.5, `${mode} heading/bgAlt`, bgAlt, heading);
    check(4.5, `${mode} body/bgAlt`, bgAlt, body);
    check(4.5, `${mode} accent/bgAlt`, bgAlt, accent);
    p.cLightPairs.forEach((pr, i) => check(4.5, `${mode} c${i + 1}-light/ink`, side(pr, mode), ink));
    p.cDarkPairs.forEach((pr, i) => check(4.5, `${mode} c${i + 1}-dark/ink`, side(pr, mode), inkD));
    for (const [n, v] of [['pass', p.pass], ['warn', p.warn], ['fail', p.fail]]) check(3.0, `${mode} ${n}/bg`, bg, side(v, mode));
    for (const [n, v] of [['warm', p.warm], ['cool', p.cool], ['note', p.note]]) check(4.5, `${mode} ${n}/ink`, side(v, mode), ink);
    check(4.5, `${mode} alarm/inkDark`, side(p.alarm, mode), inkD);
    p.chartPairs.forEach((pr, i) => check(3.0, `${mode} chart${i + 1}/bg`, bg, side(pr, mode)));
  }
  // distinctness on both chart sets
  const minDE = set => { let m = Infinity; for (let i = 0; i < set.length; i++) for (let j = i + 1; j < set.length; j++) m = Math.min(m, deltaE(set[i], set[j])); return m; };
  return { fails, deLight: minDE(p.chartL), deDark: minDE(p.chartD) };
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
    console.error('usage: node tools/palette-forge.js <brand-hex> [--name n] [-o path] [--audit]');
    process.exit(2);
  }
  const p = forge(pos[0], opt.scheme === 'dark' ? 'dark' : 'light');
  const css = emit(opt.name, p);

  if (opt.out) { require('fs').writeFileSync(opt.out, css); console.error(`wrote ${opt.out}`); }
  else if (!opt.audit) process.stdout.write(css);

  if (opt.audit) {
    const { fails, deLight, deDark } = audit(p);
    console.error(`\n  palette-forge audit — ${opt.name} (brand ${p.brandHex}, hue ${p.Hb.toFixed(0)}°)`);
    console.error(`  chart ΔE  light ${deLight.toFixed(3)}  dark ${deDark.toFixed(3)}  ${Math.min(deLight, deDark) >= 0.10 ? '✓' : '⚠ <0.10'}`);
    if (fails.length) { console.error(`  ${fails.length} contrast failures:`); fails.forEach(f => console.error(`   ✗ ${f}`)); }
    else console.error('  ✓ all gated pairs pass in BOTH light and dark');
    process.exitCode = fails.length ? 1 : 0;
  }
}
main();
