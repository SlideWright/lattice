/**
 * Unit tests for the S4 responsiveness lint (tools/check-chart-responsiveness.js).
 *
 * Two halves:
 *   1. findViolations() logic — flags fixed-px layout lengths, and honours the
 *      three legitimate escapes (SVG-viewBox context, clamp() hairlines, and
 *      /* sanctioned: *​/ notes) plus the var()-fallback case.
 *   2. The guard — every real chart component CSS file is clean, so the lint
 *      codifies the cqi-first end state the #180 conversions reached.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { findViolations } = require('../../../tools/check-chart-responsiveness');

const ROOT = path.join(__dirname, '..', '..', '..');
const props = (css) => findViolations(css).map((v) => v.prop);

describe('check-chart-responsiveness — findViolations', () => {
  test('flags a fixed-px layout-box length', () => {
    const v = findViolations('section.foo .bar {\n  width: 240px;\n}');
    assert.equal(v.length, 1);
    assert.equal(v[0].prop, 'width');
    assert.equal(v[0].value, '240px');
  });

  test('flags padding / gap / inset / margin / font-size / top', () => {
    const css = `.a{padding:12px}\n.b{gap:20px}\n.c{inset:8px}\n` +
                `.d{margin-top:30px}\n.e{font-size:18px}\n.f{top:40px}`;
    assert.deepEqual(props(css).sort(), ['font-size', 'gap', 'inset', 'margin-top', 'padding', 'top']);
  });

  test('does NOT flag px inside clamp() — the hairline idiom', () => {
    assert.deepEqual(props('.a{ width: clamp(2px, 0.2cqi, 4px) }'), []);
  });

  test('does NOT flag px on a trailing /* sanctioned: … */ line', () => {
    assert.deepEqual(props('.a{\n  min-width: 12px; /* sanctioned: swatch floor */\n}'), []);
  });

  test('does NOT flag px inside a var(--token, …) fallback', () => {
    assert.deepEqual(props('.a{ width: var(--chart-spine-w, 2px) }'), []);
  });

  test('does NOT flag non-layout properties (border / stroke-width / box-shadow / transform)', () => {
    const css = `.a{ border: 3px solid red }\n.b{ box-shadow: 0 0 0 4px black }\n` +
                `.c{ transform: translateY(-1px) }\n.d{ outline: 2px solid }`;
    assert.deepEqual(props(css), []);
  });

  test('does NOT flag px in an SVG-context rule (SVG-only property in the block)', () => {
    // The font-size sits on a sibling line to `fill` — rule-BLOCK detection,
    // not per-line, is what excludes it (the quadrant `.quadrant-label` case).
    const css = `.quadrant-label {\n  fill: var(--ink);\n  font-size: 11px;\n}`;
    assert.deepEqual(props(css), []);
  });

  test('does NOT flag px in an SVG-context rule (SVG element/class selector)', () => {
    assert.deepEqual(props('.wc-svg text { font-size: 84px }'), []);
    assert.deepEqual(props('.radar-area { stroke-width: 2px; }'), []);
  });

  test('still flags an HTML rule whose body comment contains a brace', () => {
    // Regression: the body-comment `{` must not make the parser treat the rule
    // as a wrapper and skip it (the .gantt-bar bug).
    const css = `.gantt-bar {\n  /* fill is color-mix(…) {not a rule} */\n  top: 5px;\n}`;
    assert.deepEqual(props(css), ['top']);
  });

  test('reports the correct 1-based line number', () => {
    const v = findViolations('.a {\n\n  height: 50px;\n}');
    assert.equal(v[0].line, 3);
  });
});

describe('check-chart-responsiveness — guard', () => {
  test('every chart component CSS file is clean (no unsanctioned fixed-px layout lengths)', () => {
    const files = execSync('ls lib/components/chart/*/*.css', { cwd: ROOT, encoding: 'utf8' })
      .trim().split('\n').filter(Boolean);
    const offenders = [];
    for (const rel of [...new Set(files)]) {
      const css = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      for (const v of findViolations(css)) offenders.push(`${rel}:${v.line} ${v.prop}: ${v.value}`);
    }
    assert.deepEqual(offenders, [],
      `fixed-px layout lengths in chart CSS — convert to cqi, wrap a hairline in clamp(), or add /* sanctioned: <reason> */:\n${offenders.join('\n')}`);
  });
});
