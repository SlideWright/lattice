/**
 * Unit: WCAG contrast on every shipped palette.
 *
 * Asserts AA (4.5:1) for the band/text pairs and the heading/canvas pairs
 * defined by each canonical palette. WCAG 2.x sRGB luminance formula:
 *
 *   1. Convert hex → sRGB → linearized channel (piecewise gamma).
 *   2. L = 0.2126·R + 0.7152·G + 0.0722·B.
 *   3. Contrast = (L_lighter + 0.05) / (L_darker + 0.05).
 *
 * Light-mode and dark-mode are tested separately by parsing each palette
 * twice (light-dark() resolution flips on the second pass). The test runs
 * against indaco + cuoio; sibling palettes (ardesia, atelier, …) inherit
 * indaco's band-text tokens by cascade and are covered by the indaco run.
 *
 * If a test fails: a palette tweak put a text token below 4.5:1 on its
 * paired surface. Either lift the text (darker on light surface, lighter
 * on dark) or lift the surface; do NOT lower the bar.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const path   = require('path');

describe('contrast', () => {
  // ── Palette parser with light/dark mode awareness ───────────────────────
  // Same shape as test/helpers/palette.js's parsePaletteVars but accepts a
  // `mode` argument so we can resolve light-dark() to either side and run
  // contrast assertions for both deck-wide modes.
  function parsePaletteVars(content, mode = 'light') {
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
    const vars = {};
    const rootBlocks = stripped.match(/:root\s*\{[^}]*\}/g) || [];
    for (const block of rootBlocks) {
      const decls = block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || [];
      for (const d of decls) {
        const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
        if (m) vars[m[1]] = m[2].trim();
      }
    }
    for (const k of Object.keys(vars)) {
      const ld = vars[k].match(/^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i);
      if (ld) vars[k] = mode === 'dark' ? ld[2] : ld[1];
    }
    for (let pass = 0; pass < 8; pass++) {
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

  function loadPaletteWithImports(name, mode) {
    const rootDir = path.join(__dirname, '..', '..', '..');
    const themesDir = path.join(rootDir, 'themes');
    const seen = new Set();
    let combined = '';
    function walk(file) {
      if (seen.has(file)) return;
      seen.add(file);
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      const importRe = /@import\s+["']?([A-Za-z0-9_-]+)["']?\s*;/g;
      let m;
      while ((m = importRe.exec(content)) !== null) {
        if (m[1] === 'lattice-diagram') continue;
        // Resolve `lattice` to the engine's own CSS for the universal
        // semantic palette defaults; theme @imports of sibling palettes
        // resolve under themes/.
        const target = m[1] === 'lattice'
          ? path.join(rootDir, 'dist', 'lattice.css')
          : path.join(themesDir, `${m[1]}.css`);
        walk(target);
      }
      combined += content + '\n';
    }
    walk(path.join(themesDir, `${name}.css`));
    return parsePaletteVars(combined, mode);
  }

  // ── WCAG sRGB luminance + contrast ratio ────────────────────────────────
  function hexToRgb(hex) {
    const h = hex.trim().replace(/^#/, '');
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16),
      ];
    }
    if (h.length === 6) {
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    }
    throw new Error(`not a hex color: ${hex}`);
  }

  function relativeLuminance(rgb) {
    const linear = rgb.map(v => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }

  function contrastRatio(hexA, hexB) {
    const lA = relativeLuminance(hexToRgb(hexA));
    const lB = relativeLuminance(hexToRgb(hexB));
    const [hi, lo] = lA > lB ? [lA, lB] : [lB, lA];
    return (hi + 0.05) / (lo + 0.05);
  }

  // ── Pair definitions ────────────────────────────────────────────────────
  // Each entry is a [fill-token, text-token] tuple. The contrast bar is
  // 4.5:1 (AA for normal-size text); large text (≥18pt or ≥14pt bold) can
  // use 3:1 but we hold all diagram text to the stricter bar.
  //
  // Two tiers per slot in the new categorical contract:
  //   --cN-light pairs with --c-ink-light (non-flipping dark ink, AA against fill)
  //   --cN-dark  pairs with --c-ink-dark  (white-ish, AA against deep fill)
  //
  // --text-heading is NOT used for cN-light pairs because it flips via
  // light-dark() — in dark-canvas mode it resolves to white, which would
  // give white-on-pale and break AA. The bands stay pale in both canvas
  // modes (bands are "figure windows" with their own ink/paper contract,
  // not panels that flip with the surrounding canvas), so their text
  // must stay dark in both modes too.
  const LIGHT_PAIRS = Array.from({ length: 12 }, (_, i) => [
    `c${i + 1}-light`,
    'c-ink-light',
  ]);
  const DEEP_PAIRS = Array.from({ length: 12 }, (_, i) => [
    `c${i + 1}-dark`,
    'c-ink-dark',
  ]);

  // (Quadrant charts read the cN palette directly now — fills are cN-light
  // region tints, data marks are cN-dark graphical objects, and ALL text is
  // neutral --text-heading, which is covered by the --text-heading/bg test
  // below. No quadrant-specific text-contrast pair remains.)

  const AA_THRESHOLD = 4.5;

  for (const name of ['indaco', 'cuoio']) {
    for (const mode of ['light', 'dark']) {
      test(`contrast: ${name} (${mode}) every --cN-light / --c-ink-light pair clears AA`, () => {
        const vars = loadPaletteWithImports(name, mode);
        const failures = [];
        for (const [fillKey, textKey] of LIGHT_PAIRS) {
          const fill = vars[fillKey];
          const text = vars[textKey];
          if (!fill || !text) {
            failures.push(`${fillKey} or ${textKey} not defined`);
            continue;
          }
          try {
            const ratio = contrastRatio(fill, text);
            if (ratio < AA_THRESHOLD) {
              failures.push(`${fillKey} (${fill}) / ${textKey} (${text}) = ${ratio.toFixed(2)}:1 (< ${AA_THRESHOLD})`);
            }
          } catch (e) {
            failures.push(`${fillKey}=${fill} or ${textKey}=${text}: ${e.message}`);
          }
        }
        assert.deepEqual(failures, [], `WCAG AA failures in ${name} (${mode}):\n  ${failures.join('\n  ')}`);
      });

      test(`contrast: ${name} (${mode}) every --cN-dark / --c-ink-dark pair clears AA`, () => {
        const vars = loadPaletteWithImports(name, mode);
        const failures = [];
        for (const [fillKey, textKey] of DEEP_PAIRS) {
          const fill = vars[fillKey];
          const text = vars[textKey];
          if (!fill || !text) {
            failures.push(`${fillKey} or ${textKey} not defined`);
            continue;
          }
          try {
            const ratio = contrastRatio(fill, text);
            if (ratio < AA_THRESHOLD) {
              failures.push(`${fillKey} (${fill}) / ${textKey} (${text}) = ${ratio.toFixed(2)}:1 (< ${AA_THRESHOLD})`);
            }
          } catch (e) {
            failures.push(`${fillKey}=${fill} or ${textKey}=${text}: ${e.message}`);
          }
        }
        assert.deepEqual(failures, [], `WCAG AA failures in ${name} (${mode}):\n  ${failures.join('\n  ')}`);
      });

      test(`contrast: ${name} (${mode}) --text-heading clears AA on --bg and --bg-alt`, () => {
        const vars = loadPaletteWithImports(name, mode);
        const failures = [];
        for (const surface of ['bg', 'bg-alt']) {
          const fill = vars[surface];
          const text = vars['text-heading'];
          if (!fill || !text) continue;
          try {
            const ratio = contrastRatio(fill, text);
            if (ratio < AA_THRESHOLD) {
              failures.push(`--text-heading (${text}) on --${surface} (${fill}) = ${ratio.toFixed(2)}:1`);
            }
          } catch (e) {
            failures.push(`--text-heading / --${surface}: ${e.message}`);
          }
        }
        assert.deepEqual(failures, [], `WCAG AA failures in ${name} (${mode}):\n  ${failures.join('\n  ')}`);
      });

      test(`contrast: ${name} (${mode}) --c-ink-dark clears AA on --c-alarm`, () => {
        const vars = loadPaletteWithImports(name, mode);
        const fill = vars['c-alarm'];
        const text = vars['c-ink-dark'];
        assert.ok(fill && text, 'c-alarm + c-ink-dark defined');
        const ratio = contrastRatio(fill, text);
        assert.ok(
          ratio >= AA_THRESHOLD,
          `--c-ink-dark (${text}) on --c-alarm (${fill}) = ${ratio.toFixed(2)}:1 (< ${AA_THRESHOLD})`,
        );
      });
    }
  }
});
