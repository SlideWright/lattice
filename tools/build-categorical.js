#!/usr/bin/env node
/**
 * build-categorical.js — generate the categorical tier from hue anchors,
 * tuned INDEPENDENTLY for light and dark canvas.
 *
 * The curated artistic input is twelve hue anchors:
 *   --c1-anchor … --c12-anchor   (saturated hex, the slot's identity)
 *
 * Per slot, one hue H + its chroma C are taken from the anchor, then FOUR
 * tones are derived (OKLCH, hue preserved, chroma reduced to stay in gamut):
 *
 *               role on canvas              ink it pairs with     L target
 *   pale-light  Mermaid band fill (light)   one dark ink          PALE_L_LIGHT
 *   deep-light  chart mark      (light)     white                 DEEP_L_LIGHT
 *   deep-dark   Mermaid band fill (dark)    white                 DEEP_L_DARK
 *   pale-dark   chart mark      (dark)      one dark ink          PALE_L_DARK
 *
 * Dark is NOT a literal inversion of light: deep-dark sits a touch lighter
 * (legible on the near-black canvas) and pale-dark sits richer than the
 * paper-pale light fill. This is what makes the dark deck read boardroom-
 * grade rather than washed-out. All four clear WCAG AA against their ink
 * BY CONSTRUCTION (L clamped into the safe band), which also satisfies
 * Mermaid's one-ink-per-diagram quirk for all twelve slots at once.
 *
 * Emitted as the existing engine tokens — NO layout/chart/Mermaid selector
 * changes, only values, now provably one hue per slot:
 *   --cN-light: light-dark(<pale-light>, <deep-dark>)   the FILL token
 *   --cN-dark:  light-dark(<deep-light>, <pale-dark>)   the MARK token
 *
 * Sibling consumers: test/unit/palette/contrast.test.js (AA assertions),
 * tools/contrast-audit.js (hue-cohesion + floor report).
 *
 * Usage:
 *   node tools/build-categorical.js themes/indaco.css
 *   node tools/build-categorical.js themes/cand-x.css --dry
 *   node tools/build-categorical.js themes/cand-x.css \
 *        --pale-l-light .91 --deep-l-light .47 --deep-l-dark .50 \
 *        --pale-l-dark .80 --pale-chroma .05
 *
 * Per-theme overrides may also be declared in-file as a comment the tool
 * reads, so `npm run build` reproduces them without flags:
 *   /* CATEGORICAL-CFG paleLLight=.91 deepLDark=.50 paleChroma=.045 *␊/
 */

const fs   = require('fs');
const path = require('path');

// ── tunable defaults (a strategy tunes these) ───────────────────────────────
const CFG = {
  paleLLight: 0.90,  // band fill on light canvas → dark ink
  deepLLight: 0.47,  // chart mark on light canvas → white
  deepLDark:  0.49,  // band fill on dark canvas → white (a touch lighter)
  paleLDark:  0.82,  // chart mark on dark canvas → dark ink (richer than paper-pale)
  paleChroma: 0.050, // chroma cap for the pale tiers (restraint)
  deepChroma: 0.130, // chroma cap for the deep tiers
};

// ── sRGB ↔ OKLab/OKLCH ──────────────────────────────────────────────────────
function parseHex(hex) {
  hex = hex.trim().replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
}
function toHex([r, g, b]) {
  const h = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
  return `#${h(r)}${h(g)}${h(b)}`;
}
const sToLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const linToS = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function srgbToOklab([R, G, B]) {
  const r = sToLin(R), g = sToLin(G), b = sToLin(B);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}
function oklabToSrgb({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    linToS(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linToS(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linToS(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ];
}
const inGamut = rgb => rgb.every(c => c >= -0.5 && c <= 255.5);

// LCH → hex, reducing chroma until in sRGB gamut (preserves hue exactly).
function lchToHex(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  for (let c = C; c >= 0; c -= 0.002) {
    const rgb = oklabToSrgb({ L, a: c * Math.cos(h), b: c * Math.sin(h) });
    if (inGamut(rgb)) return toHex(rgb);
  }
  return toHex(oklabToSrgb({ L, a: 0, b: 0 }));
}

/** Derive the four same-hue tones for one anchor hex. */
function tonesFromAnchor(anchorHex, cfg = CFG) {
  const { a, b } = srgbToOklab(parseHex(anchorHex));
  const C = Math.hypot(a, b);
  const H = (Math.atan2(b, a) * 180) / Math.PI;
  return {
    paleLight: lchToHex(cfg.paleLLight, Math.min(C, cfg.paleChroma), H),
    deepLight: lchToHex(cfg.deepLLight, Math.min(C, cfg.deepChroma), H),
    deepDark:  lchToHex(cfg.deepLDark,  Math.min(C, cfg.deepChroma), H),
    paleDark:  lchToHex(cfg.paleLDark,  Math.min(C, cfg.paleChroma + 0.02), H),
    hue: H,
  };
}

module.exports = { tonesFromAnchor, srgbToOklab, parseHex, CFG };

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const argv = process.argv.slice(2);
  const file = argv.find(a => !a.startsWith('--'));
  const dry  = argv.includes('--dry');
  if (!file) { console.error('usage: build-categorical.js <theme.css> [--dry] [--<cfg> <n>…]'); process.exit(1); }

  const css = fs.readFileSync(file, 'utf8');
  const cfg = { ...CFG };
  // in-file config comment
  const mc = css.match(/CATEGORICAL-CFG\s+([^*]+)/);
  if (mc) for (const tok of mc[1].trim().split(/\s+/)) {
    const [k, v] = tok.split('='); if (k in cfg && v) cfg[k] = parseFloat(v);
  }
  // CLI flag overrides: --pale-l-light .91 → paleLLight
  const flagMap = { 'pale-l-light': 'paleLLight', 'deep-l-light': 'deepLLight', 'deep-l-dark': 'deepLDark', 'pale-l-dark': 'paleLDark', 'pale-chroma': 'paleChroma', 'deep-chroma': 'deepChroma' };
  for (const [flag, key] of Object.entries(flagMap)) {
    const i = argv.indexOf(`--${flag}`);
    if (i >= 0 && argv[i + 1]) cfg[key] = parseFloat(argv[i + 1]);
  }

  const anchors = [];
  for (let i = 1; i <= 12; i++) {
    const m = css.match(new RegExp(`--c${i}-anchor\\s*:\\s*(#[0-9a-fA-F]{3,6})`));
    if (!m) { console.error(`missing --c${i}-anchor in ${file}`); process.exit(1); }
    anchors.push(m[1]);
  }

  const tones = anchors.map(h => tonesFromAnchor(h, cfg));
  const rows = [`  /* GENERATED by tools/build-categorical.js — edit --cN-anchor, not these.`,
    `   * cfg: paleLLight=${cfg.paleLLight} deepLLight=${cfg.deepLLight} deepLDark=${cfg.deepLDark} paleLDark=${cfg.paleLDark} paleChroma=${cfg.paleChroma} deepChroma=${cfg.deepChroma}`,
    `   * Each slot is ONE hue; light/dark canvas tuned independently. FILL`,
    `   * token --cN-light, MARK token --cN-dark. */`];
  tones.forEach((t, i) => { rows.push(`  --c${i + 1}-light: light-dark(${t.paleLight}, ${t.deepDark});`); });
  rows.push('');
  tones.forEach((t, i) => { rows.push(`  --c${i + 1}-dark:  light-dark(${t.deepLight}, ${t.paleDark});`); });
  const block = rows.join('\n');

  if (dry) { console.log(block); process.exit(0); }

  const START = '/* CATEGORICAL:START */', END = '/* CATEGORICAL:END */';
  if (!css.includes(START) || !css.includes(END)) { console.error(`sentinels not found in ${file}`); process.exit(1); }
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  fs.writeFileSync(file, css.replace(new RegExp(`${esc(START)}[\\s\\S]*?${esc(END)}`), `${START}\n${block}\n  ${END}`));
  console.log(`patched ${path.basename(file)} (12 anchors → 24 same-hue tokens, light+dark tuned)`);
}
