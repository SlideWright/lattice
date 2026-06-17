'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { texturePatternDefs } = require('../../../lib/core/accessibility-textures.js');

// Regression guard for the all-black-pie-on-Safari bug: the pattern colours MUST
// be applied via CSS rules (`fill: var(…)` in a <style>), NOT via SVG presentation
// ATTRIBUTES (`fill="var(…)"`). `var()` in a presentation attribute is unresolved
// on older WebKit/Safari → the fill is invalid → SVG paints BLACK. `var()` in a
// CSS `fill:` property is supported far further back. See
// engineering/decisions/2026-06-16-cvd-redundant-encoding.md.
test('texturePatternDefs paints via CSS rules, never var() in presentation attributes', () => {
  const defs = texturePatternDefs();
  // No `fill="var(…)"` / `stroke="var(…)"` attribute anywhere — that's the form
  // that renders black on older Safari.
  assert.doesNotMatch(defs, /(?:fill|stroke)\s*=\s*"var\(/, 'must not use var() in an SVG presentation attribute');
  // The colours ride in a <style> as CSS properties instead.
  assert.match(defs, /<style>/, 'colours must be applied via a <style> block');
  assert.match(defs, /#latt-a11y-chart-tex-1>rect\{fill:var\(--chart-cat1\)\}/, 'chart pattern fill via CSS rule');
  assert.match(defs, /#latt-a11y-tex-1>rect\{fill:var\(--cat-1-fill\)\}/, 'categorical pattern fill via CSS rule');
});

test('texturePatternDefs emits both pattern families (12 categorical + 8 chart)', () => {
  const defs = texturePatternDefs();
  assert.equal((defs.match(/id="latt-a11y-tex-\d+"/g) || []).length, 12);
  assert.equal((defs.match(/id="latt-a11y-chart-tex-\d+"/g) || []).length, 8);
});
