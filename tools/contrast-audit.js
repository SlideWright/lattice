#!/usr/bin/env node
/**
 * contrast-audit.js — contrast & cohesion audit for all Lattice themes.
 *
 * Rebuilt 2026-05-29 against the LIVE token set (the prior version audited
 * --chart-1..6 / --mermaid-primary-color, deleted in the 2026-05-12
 * migration, so every check silently skipped). See
 * engineering/decisions/2026-05-29-color-token-recuration.md.
 *
 * Three bars, run for every theme in BOTH canvas modes:
 *   1. AA 4.5:1  — text-bearing pairs (ink on fills, headings on surfaces).
 *   2. Floor 3:1 — graphical / structural pairs (border-on-bg, stroke-on-
 *                  fill, line-on-canvas). WCAG 1.4.11 non-text contrast.
 *                  Reported, not exempted — the bg↔border↔text relationship.
 *   3. Cohesion  — per categorical slot, OKLCH hue distance between the
 *                  pale fill and the deep mark (should be ~0° once the slot
 *                  is generated from one anchor) + pass/warn/fail mutual
 *                  OKLab ΔE (the status distinctness contract).
 *
 * Usage:
 *   node tools/contrast-audit.js                 # all themes, summary
 *   node tools/contrast-audit.js indaco          # one theme, verbose
 *   node tools/contrast-audit.js --report        # write audit md artifact
 *   node tools/contrast-audit.js --fails-only
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const THEMES_DIR = path.join(ROOT, 'themes');
const ENGINE_CSS = path.join(ROOT, 'dist', 'lattice.css');

// ── CSS load + mode-aware token resolve ─────────────────────────────────────
function loadCss(name, seen = new Set()) {
  const file = path.join(THEMES_DIR, `${name}.css`);
  if (seen.has(file) || !fs.existsSync(file)) return '';
  seen.add(file);
  const content = fs.readFileSync(file, 'utf8');
  let out = '';
  const re = /@import\s+["']?([A-Za-z0-9_-]+)["']?\s*;/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[1] === 'lattice-diagram') continue;
    out += (m[1] === 'lattice'
      ? (fs.existsSync(ENGINE_CSS) ? fs.readFileSync(ENGINE_CSS, 'utf8') : '')
      : loadCss(m[1], seen)) + '\n';
  }
  return out + content;
}

function resolveVars(css, mode) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  for (const block of (stripped.match(/:root\s*\{[^}]*\}/g) || [])) {
    for (const d of (block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || [])) {
      const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  for (const k of Object.keys(vars)) {
    const ld = vars[k].match(/^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i);
    if (ld) vars[k] = (mode === 'dark' ? ld[2] : ld[1]).trim();
  }
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const k of Object.keys(vars)) {
      const ref = vars[k].match(/^var\(--([a-z0-9-]+)\)$/i);
      if (ref && vars[ref[1]] && vars[ref[1]] !== vars[k]) { vars[k] = vars[ref[1]]; changed = true; }
    }
    if (!changed) break;
  }
  return vars;
}

// ── colour math (sRGB → luminance / OKLab / OKLCH) ──────────────────────────
function parseHex(hex) {
  if (!hex) return null;
  hex = hex.trim().replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
}
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function luminance(hex) { const p = parseHex(hex); if (!p) return null; const [r, g, b] = p.map(toLin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function ratio(a, b) { const la = luminance(a), lb = luminance(b); if (la == null || lb == null) return null; const hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05); }
function oklab(hex) {
  const p = parseHex(hex); if (!p) return null;
  const [r, g, b] = p.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return { L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s };
}
function deltaE(h1, h2) { const a = oklab(h1), b = oklab(h2); if (!a || !b) return null; return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b); }
function hueDeg(hex) { const o = oklab(hex); if (!o) return null; let d = Math.atan2(o.b, o.a) * 180 / Math.PI; return (d + 360) % 360; }
function hueDist(h1, h2) { const a = hueDeg(h1), b = hueDeg(h2); if (a == null || b == null) return null; const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

// ── pair specs ──────────────────────────────────────────────────────────────
const AA = 4.5, FLOOR = 3.0, STATUS_DE = 0.10, HUE_TOL = 12;

const textPairs = (v) => [
  ['text-heading', 'bg', 'heading on canvas'],
  ['text-heading', 'bg-alt', 'heading on card'],
  ['text-body', 'bg', 'body on canvas'],
  ['text-body', 'bg-alt', 'body on card'],
  ['text-label', 'bg', 'label on canvas'],
  ['on-accent', 'accent', 'on-accent on accent'],
  ['text-heading', 'accent-soft', 'heading on accent-soft'],
  ['c-ink-dark', 'c-alarm', 'ink on alarm'],
  ...Array.from({ length: 12 }, (_, i) => [`c${i + 1}-light`, 'c-ink-light', `c${i + 1}-light fill / ink`].slice()).map(([f, t, c]) => [t, f, c]),
  ...Array.from({ length: 12 }, (_, i) => ['c-ink-dark', `c${i + 1}-dark`, `c${i + 1}-dark mark / ink`]),
  ...[1, 2, 3, 4].map(n => [`c-quadrant-${n}-text`, `c-quadrant-${n}-fill`, `quadrant ${n} text/fill`]),
];
const floorPairs = () => [
  ['border', 'bg', 'hairline on canvas'],
  ['c-stroke', 'bg', 'stroke on canvas'],
  // Stroke-on-band-fill is the load-bearing relationship for the pale
  // categorical fills (the wedge/node outline is what separates pale slices
  // and reads them against the canvas) — audit it on EVERY slot, not just c1.
  ...Array.from({ length: 12 }, (_, i) => ['c-stroke', `c${i + 1}-light`, `stroke on c${i + 1} band fill`]),
  ['c-line', 'bg', 'edge line on canvas'],
  ['accent', 'bg', 'accent rule on canvas'],
];

// ── runner ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const failsOnly = args.includes('--fails-only');
const doReport = args.includes('--report');
const picked = args.filter(a => !a.startsWith('-'));
const themes = (picked.length ? picked : fs.readdirSync(THEMES_DIR)
  .filter(f => f.endsWith('.css') && !f.endsWith('-dark.css') && f !== 'README.md')
  .map(f => f.replace('.css', '')).sort());

const report = [];
let aaFails = 0, floorWarns = 0, cohesionWarns = 0, statusWarns = 0, checks = 0;
const log = s => { report.push(s); if (!doReport) console.log(s); };

log('');
log('# Lattice contrast & cohesion audit');
log(`_${new Date().toISOString().slice(0, 10)} · AA ${AA}:1 · non-text floor ${FLOOR}:1 · slot hue tol ${HUE_TOL}° · status ΔE ${STATUS_DE}_`);

for (const theme of themes) {
  const css = loadCss(theme);
  const lines = [];
  for (const mode of ['light', 'dark']) {
    const v = resolveVars(css, mode);
    for (const [fg, bg, ctx] of textPairs(v)) {
      if (!parseHex(v[fg]) || !parseHex(v[bg])) continue;
      checks++; const r = ratio(v[fg], v[bg]);
      if (r < AA) { aaFails++; lines.push(`  ✗ AA   ${r.toFixed(2)}:1  ${mode}  ${ctx}  (${v[fg]} on ${v[bg]})`); }
    }
    for (const [fg, bg, ctx] of floorPairs()) {
      if (!parseHex(v[fg]) || !parseHex(v[bg])) continue;
      checks++; const r = ratio(v[fg], v[bg]);
      if (r < FLOOR) { floorWarns++; lines.push(`  ⚠ floor ${r.toFixed(2)}:1  ${mode}  ${ctx}  (${v[fg]} on ${v[bg]})`); }
    }
    // status distinctness (light mode only — the curated trio)
    if (mode === 'light') {
      const trio = [['pass', 'warn'], ['warn', 'fail'], ['pass', 'fail']];
      for (const [x, y] of trio) {
        if (!parseHex(v[x]) || !parseHex(v[y])) continue;
        const de = deltaE(v[x], v[y]);
        if (de < STATUS_DE) { statusWarns++; lines.push(`  ⚠ status ΔE ${de.toFixed(3)}  ${x} vs ${y} too close (${v[x]} / ${v[y]})`); }
      }
    }
  }
  // cohesion: pale vs deep hue per slot (light mode)
  const vl = resolveVars(css, 'light');
  const slotWarn = [];
  for (let i = 1; i <= 12; i++) {
    const pale = vl[`c${i}-light`], deep = vl[`c${i}-dark`];
    if (!parseHex(pale) || !parseHex(deep)) continue;
    const dh = hueDist(pale, deep);
    if (dh != null && dh > HUE_TOL) { cohesionWarns++; slotWarn.push(`  ⚠ cohesion c${i}  Δhue ${dh.toFixed(0)}°  pale ${pale} ≠ deep ${deep}`); }
  }
  lines.push(...slotWarn);

  if (failsOnly && lines.length === 0) continue;
  log('');
  log(`## ${theme}`);
  if (lines.length === 0) log('  ✓ all pairs clear AA · all slots one-hue · status distinct');
  else lines.forEach(log);
}

log('');
log('---');
log(`**${aaFails} AA failures · ${floorWarns} below-floor · ${cohesionWarns} slot hue splits · ${statusWarns} status collisions · ${checks} pairs across ${themes.length} themes**`);

if (doReport) {
  const dir = path.join(ROOT, 'engineering', 'audits');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `contrast-${new Date().toISOString().slice(0, 10)}.md`);
  fs.writeFileSync(out, report.join('\n') + '\n');
  console.log(`wrote ${path.relative(ROOT, out)} (${aaFails} AA fails, ${floorWarns} floor, ${cohesionWarns} hue splits)`);
}
process.exit(aaFails > 0 ? 1 : 0);
