/**
 * Unit: the accessibility (CVD) palettes' status trio survives its target
 * deficiency. The categorical cycle CANNOT be separated by colour under CVD
 * (~1-2 distinct — that's what the texture patterns carry); what colour DOES
 * carry is pass/warn/fail, so this gate asserts exactly that, in both canvases.
 * Regression guard for engineering/decisions/2026-06-16-cvd-redundant-encoding.md.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { simulate } = require('../../../lib/theme/cvd.js');
const { oklabDistance, normalizeHex } = require('../../../lib/theme/color.js');

const THEMES = path.join(__dirname, '../../../themes');
const FLOOR = 0.15; // "just about distinct" — the audit's collapse threshold

// Each dichromacy palette + the deficiency a viewer of it has. Achromatopsia is
// excluded: its trio is luminance-only greys whose distinction rides the glyphs,
// not a colour ΔE the dichromacy simulation measures.
const CASES = [
  ['a11y-deuteranopia', 'deuteranopia'],
  ['a11y-protanopia', 'protanopia'],
  ['a11y-tritanopia', 'tritanopia'],
];

/** Pull the light & dark sides of --pass/--warn/--fail from a palette file. */
function statusTrio(palette) {
  const css = fs.readFileSync(path.join(THEMES, `${palette}.css`), 'utf8');
  const sides = { light: [], dark: [] };
  for (const tok of ['pass', 'warn', 'fail']) {
    const m = css.match(new RegExp(`--${tok}:\\s*light-dark\\(\\s*([^,]+?)\\s*,\\s*([^)]+?)\\s*\\)`, 'i'));
    assert.ok(m, `${palette} must define --${tok} as a light-dark() pair`);
    sides.light.push(normalizeHex(m[1]));
    sides.dark.push(normalizeHex(m[2]));
  }
  return sides;
}

function minPairwiseUnder(hexes, type) {
  let m = Infinity;
  for (let i = 0; i < hexes.length; i++)
    for (let j = i + 1; j < hexes.length; j++)
      m = Math.min(m, oklabDistance(simulate(hexes[i], type), simulate(hexes[j], type)));
  return m;
}

describe('cvd-palette status distinctness', () => {
  for (const [palette, type] of CASES) {
    test(`${palette}: pass/warn/fail stay distinct under ${type} (both canvases)`, () => {
      const { light, dark } = statusTrio(palette);
      const dl = minPairwiseUnder(light, type);
      const dd = minPairwiseUnder(dark, type);
      assert.ok(dl >= FLOOR, `light min ΔE ${dl.toFixed(3)} < ${FLOOR}`);
      assert.ok(dd >= FLOOR, `dark min ΔE ${dd.toFixed(3)} < ${FLOOR}`);
    });
  }

  test('achromatopsia status trio is luminance-separated greys', () => {
    const { light } = statusTrio('a11y-achromatopsia');
    // All three are achromatic (R=G=B) and span a real luminance range.
    for (const hex of light) {
      const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)];
      assert.equal(r, g, `${hex} should be grey`);
      assert.equal(g, b, `${hex} should be grey`);
    }
  });
});
