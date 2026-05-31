#!/usr/bin/env node
/**
 * build-chart-palette.js — generate the DECOUPLED chart palette
 * (--chart-1 … --chart-8) for every theme, bespoke per theme,
 * vividness scaled to each theme's temperament.
 *
 * WHY THIS IS SEPARATE FROM build-categorical.js
 * ───────────────────────────────────────────────
 * The cN tokens (build-categorical.js) are constrained by Mermaid's
 * one-ink-per-diagram quirk → pale fills, twelve slots. Lattice's own
 * chart-family engine (pie/donut/…) has no such limit, so it draws from
 * this independent set: eight saturated, perceptually-distinct marks with
 * two hand-tuned variants per slot (light deepened for the white canvas,
 * dark brightened to pop on near-black) — the Apple-HIG discipline, but
 * every theme its OWN hues. Consumed via var(--chart-N) by chart-family
 * components only; Mermaid never sees these.
 *
 * THE BESPOKE INPUT lives in SPEC below, NOT in a uniform L/C target:
 *   • lead   — the theme's signature hue; becomes --chart-1 (primary series)
 *   • hues   — eight hand-picked angles, ORDERED so adjacent pie wedges
 *              (and the slot-8↔slot-1 wrap) stay far apart in hue
 *   • chroma — the temperament ceiling. Bold/modern themes (indaco, laguna,
 *              mustard) ride high; heritage themes (cuoio, burgundy, …) pull
 *              down for restraint. This is "vividness scaled to temperament."
 *   • lLight / lDark — OKLCH lightness targets per canvas (light deepened so
 *              white labels stay legible; dark lifted so marks pop on black).
 *
 * Three palette MODES:
 *   chromatic — the 8 chromatic themes: 8 hues at the temperament chroma.
 *   muted     — carbone/ardesia/atelier (already carry an accent): 8 hues at
 *               low chroma — a quiet chromatic whisper subordinate to grey.
 *   mono      — onyx/concrete (pure austerity): a stepped grey ramp + ONE
 *               signature accent pop at slot 1.
 *
 * The OKLCH→sRGB gamut clamp (lchToHex) guarantees every value is real and
 * in gamut; the L bands keep marks legible by construction.
 *
 * darkOnly themes (carbone) emit a single value per slot (no light-dark()),
 * matching how their cN tokens are written.
 *
 * Emitted between sentinels, idempotent, NO selector changes — only values:
 *   --chart-N: light-dark(<light>, <dark>);   (or single value if darkOnly)
 *
 * Sibling: tools/build-categorical.js (the cN/Mermaid tier). Both are run by
 * `npm run build` and gated stale by `--check`.
 *
 * Usage:
 *   node tools/build-chart-palette.js            # all themes
 *   node tools/build-chart-palette.js --check    # CI stale gate
 *   node tools/build-chart-palette.js --dry indaco
 */
const fs   = require('fs');
const path = require('path');

// ── OKLCH → sRGB, gamut-clamped (shared math with build-categorical.js) ──────
const linToS = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklabToSrgb({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [linToS(4.0767416621*l - 3.3077115913*m + 0.2309699292*s),
          linToS(-1.2684380046*l + 2.6097574011*m - 0.3413193965*s),
          linToS(-0.0041960863*l - 0.7034186147*m + 1.7076147010*s)];
}
const toHex = ([r,g,b]) => '#' + [r,g,b]
  .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0').toUpperCase()).join('');
const inGamut = rgb => rgb.every(c => c >= -0.5 && c <= 255.5);
/** LCH → hex, reducing chroma until in sRGB gamut (hue preserved exactly). */
function lchToHex(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  for (let c = C; c >= 0; c -= 0.002) {
    const rgb = oklabToSrgb({ L, a: c * Math.cos(h), b: c * Math.sin(h) });
    if (inGamut(rgb)) return toHex(rgb);
  }
  return toHex(oklabToSrgb({ L, a: 0, b: 0 }));
}

// ── THE DESIGN: bespoke per-theme chart spec ─────────────────────────────────
// chroma is the temperament ceiling (OKLCH). hues[0] === lead by construction.
const SPEC = {
  // ── chromatic 8 — bold tier (high chroma) ──
  indaco:     { mode: 'chromatic', lead: 250, chroma: 0.150, lLight: 0.58, lDark: 0.66,
                hues: [250, 40, 152, 305, 196, 12, 272, 92] },   // cool slate-blue, tech
  laguna:     { mode: 'chromatic', lead: 195, chroma: 0.145, lLight: 0.58, lDark: 0.66,
                hues: [195, 35, 150, 300, 250, 12, 270, 88] },   // fresh aqua
  mustard:    { mode: 'chromatic', lead: 88,  chroma: 0.150, lLight: 0.58, lDark: 0.66,
                hues: [88, 255, 350, 160, 25, 200, 130, 300] },  // punchy gold
  // ── chromatic 8 — heritage tier (restrained chroma) ──
  brina:      { mode: 'chromatic', lead: 232, chroma: 0.115, lLight: 0.59, lDark: 0.67,
                hues: [232, 38, 155, 305, 12, 195, 270, 95] },   // frost — airy, cool
  crepuscolo: { mode: 'chromatic', lead: 295, chroma: 0.125, lLight: 0.57, lDark: 0.66,
                hues: [295, 45, 150, 230, 12, 195, 330, 95] },   // twilight violet
  cuoio:      { mode: 'chromatic', lead: 78,  chroma: 0.110, lLight: 0.56, lDark: 0.65,
                hues: [78, 250, 350, 160, 25, 120, 200, 300] },  // leather ochre, earthy
  burgundy:   { mode: 'chromatic', lead: 18,  chroma: 0.110, lLight: 0.55, lDark: 0.65,
                hues: [18, 152, 255, 80, 200, 320, 100, 230] },  // oxblood, deep
  magnolia:   { mode: 'chromatic', lead: 350, chroma: 0.115, lLight: 0.57, lDark: 0.66,
                hues: [350, 150, 255, 80, 200, 315, 105, 235] }, // rose, soft

  // ── achromatic — muted multi-hue (accent-carriers) ──
  carbone:    { mode: 'muted', lead: 150, chroma: 0.055, lLight: 0.60, lDark: 0.62, darkOnly: true,
                hues: [150, 30, 250, 350, 80, 200, 305, 110] },  // electric-green accent family
  ardesia:    { mode: 'muted', lead: 250, chroma: 0.050, lLight: 0.58, lDark: 0.64,
                hues: [250, 35, 150, 350, 80, 200, 300, 110] },  // cool slate
  atelier:    { mode: 'muted', lead: 80,  chroma: 0.050, lLight: 0.58, lDark: 0.64,
                hues: [80, 250, 350, 150, 25, 200, 300, 120] },  // warm oat

  // ── achromatic — mono + one signature pop (pure austerity) ──
  // greyL: stepped lightness ramp for slots 2..8 (alternating for adjacency).
  onyx:       { mode: 'mono', popHue: 245, popChroma: 0.110,
                popLLight: 0.50, popLDark: 0.70,
                greyLLight: [0.62, 0.74, 0.55, 0.83, 0.48, 0.68, 0.42],
                greyLDark:  [0.55, 0.45, 0.63, 0.40, 0.70, 0.50, 0.74],
                greyChroma: 0 },                                  // steel pop, neutral greys
  concrete:   { mode: 'mono', popHue: 42, popChroma: 0.090,
                popLLight: 0.52, popLDark: 0.70,
                greyLLight: [0.62, 0.74, 0.55, 0.83, 0.48, 0.68, 0.42],
                greyLDark:  [0.55, 0.45, 0.63, 0.40, 0.70, 0.50, 0.74],
                greyChroma: 0.008, greyHue: 70 },                 // warm clay pop, warm-grey ramp
};

/** Return [{light, dark}] × 8 for a theme spec. */
function tones(spec) {
  if (spec.mode === 'mono') {
    const out = [{ light: lchToHex(spec.popLLight, spec.popChroma, spec.popHue),
                   dark:  lchToHex(spec.popLDark,  spec.popChroma + 0.01, spec.popHue) }];
    for (let i = 0; i < 7; i++) {
      out.push({ light: lchToHex(spec.greyLLight[i], spec.greyChroma, spec.greyHue || 0),
                 dark:  lchToHex(spec.greyLDark[i],  spec.greyChroma, spec.greyHue || 0) });
    }
    return out;
  }
  // chromatic / muted: 8 hues at one chroma + L per canvas
  return spec.hues.map(h => ({
    light: lchToHex(spec.lLight, spec.chroma, h),
    dark:  lchToHex(spec.lDark,  spec.chroma, h),
  }));
}

function buildBlock(name, spec) {
  const t = tones(spec);
  const head = [
    `  /* CHART-PALETTE:START */`,
    `  /* GENERATED by tools/build-chart-palette.js — edit SPEC.${name} there, not these.`,
    `   * Decoupled chart marks (chart-family only; never Mermaid). mode=${spec.mode}` +
      (spec.mode === 'mono' ? `` : ` chroma=${spec.chroma} lead=${spec.lead}`) + ` */`,
  ];
  const rows = t.map((c, i) => {
    const val = spec.darkOnly ? c.dark : `light-dark(${c.light}, ${c.dark})`;
    return `  --chart-${i + 1}: ${val};`;
  });
  return [...head, ...rows, `  /* CHART-PALETTE:END */`].join('\n');
}

// ── file patching ────────────────────────────────────────────────────────────
const START = '/* CHART-PALETTE:START */', END = '/* CHART-PALETTE:END */';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BLOCK_RE = new RegExp(`\\s*${esc(START)}[\\s\\S]*?${esc(END)}`);
// legacy hand-written --chart-1..8 block (indaco slice-1) — replace wholesale.
const LEGACY_RE = /\n\s*--chart-1:[\s\S]*?--chart-8:[^\n]*\n/;

function processFile(file, { dry, check }) {
  const name = path.basename(file, '.css');
  const spec = SPEC[name];
  if (!spec) return { status: 'skip' };
  let css = fs.readFileSync(file, 'utf8');
  const block = buildBlock(name, spec);

  if (dry) { console.log(`/* ${name} */\n${block}\n`); return { status: 'ok' }; }

  let next;
  if (BLOCK_RE.test(css)) {
    next = css.replace(BLOCK_RE, '\n' + block);
  } else if (LEGACY_RE.test(css)) {
    // indaco's hand-written block → sentineled generated block
    next = css.replace(LEGACY_RE, '\n' + block + '\n');
  } else {
    // first roll-out: insert right before --c-ink-light (present in every theme)
    const anchor = css.match(/\n\s*--c-ink-light:/);
    if (!anchor) return { status: 'skip' };
    next = css.slice(0, anchor.index) + '\n' + block + '\n' + css.slice(anchor.index + 1);
  }
  if (next === css) return { status: 'ok' };
  if (check) return { status: 'stale' };
  fs.writeFileSync(file, next);
  return { status: 'patched' };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const dry = argv.includes('--dry'), check = argv.includes('--check');
  const only = argv.find(a => !a.startsWith('--'));
  const dir = path.join(__dirname, '..', 'themes');
  const files = (only ? [only] : Object.keys(SPEC)).map(n => path.join(dir, n.endsWith('.css') ? n : `${n}.css`));

  let stale = 0, patched = 0;
  for (const f of files) {
    const r = processFile(f, { dry, check });
    if (r.status === 'stale') { stale++; console.error(`STALE: ${path.basename(f)} — regenerate with \`npm run chart:build\``); }
    else if (r.status === 'patched') { patched++; console.log(`patched ${path.basename(f)} (8 chart marks)`); }
  }
  if (!dry) console.log(check ? (stale ? `${stale} theme(s) stale` : 'chart palette: all themes up to date')
                               : `chart palette: regenerated ${patched} theme(s)`);
  process.exit(stale > 0 ? 1 : 0);
}

module.exports = { SPEC, tones, lchToHex };
