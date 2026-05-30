/**
 * Unit: the emulator's MERMAID_VAR_MAP and the palette files agree.
 *
 * MERMAID_VAR_MAP is the source of truth for which CSS custom
 * properties Mermaid needs at build time. Every `{ var: '...' }`
 * entry must resolve against every shipped palette. If the emulator
 * references a token a palette doesn't define, Mermaid silently falls
 * back to its own defaults and the diagram drifts off-brand.
 *
 * The list of required vars is derived from the emulator source by
 * regex (we don't `require()` lattice-emulator.js because it's a
 * top-level CLI; see test/unit/source-parse.test.js for the rationale).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('fs');
const path   = require('path');
const { loadPalette } = require('../../helpers/palette');

describe('mermaid-var-map', () => {
  const EMULATOR_SRC = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'lattice-emulator.js'),
    'utf8',
  );

  function extractRequiredVars(src) {
    // Locate the MERMAID_VAR_MAP block; bail loudly if its shape changes.
    const mapStart = src.indexOf('const MERMAID_VAR_MAP = {');
    assert.ok(mapStart > 0, 'MERMAID_VAR_MAP not found in lattice-emulator.js');
    const mapEnd = src.indexOf('\n};', mapStart);
    assert.ok(mapEnd > mapStart, 'MERMAID_VAR_MAP closing brace not found');
    const block = src.slice(mapStart, mapEnd);

    const vars = new Set();
    const re = /\{\s*var:\s*['"]([a-z0-9-]+)['"]\s*\}/gi;
    let m;
    while ((m = re.exec(block)) !== null) {
      vars.add(m[1]);
    }
    return [...vars].sort();
  }

  const required = extractRequiredVars(EMULATOR_SRC);

  test('extracts a non-trivial set of required vars', () => {
    assert.ok(required.length >= 20,
      `expected MERMAID_VAR_MAP to reference at least 20 distinct CSS vars, got ${required.length}`);
  });

  for (const name of ['indaco', 'cuoio']) {
    test(`mermaid-var-map: every required var is defined in themes/${name}.css`, () => {
      const p = loadPalette(name);
      const missing = required.filter(v => !p.vars[v]);
      assert.deepEqual(missing, [],
        `themes/${name}.css does not define: ${missing.join(', ')}\n` +
        `MERMAID_VAR_MAP in lattice-emulator.js references these but the palette is silent. ` +
        `Either define the variable in the palette or change the map entry.`);
    });
  }

  // The two build-time Mermaid maps (emulator MERMAID_VAR_MAP and the runtime
  // bundle's buildMermaidThemeVars) must agree on the PIE TEXT colours. These
  // sit ON the pale wedge fill, so they must resolve to the on-fill ink
  // (c-ink-light), not the canvas text colour (text-heading) — otherwise the
  // VS Code preview path renders pie-slice text below AA on darker fills while
  // the CLI path renders it correctly. Regression guard for that drift.
  describe('emulator ↔ runtime pie-text parity', () => {
    const RUNTIME_SRC = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'lib', 'runtime', 'index.js'), 'utf8');

    // emulator: `pieSectionTextColor: { var: 'c-ink-light' },`
    const emuVar = (key) =>
      (EMULATOR_SRC.match(new RegExp(`${key}:\\s*\\{\\s*var:\\s*['"]([a-z0-9-]+)['"]`)) || [])[1];
    // runtime: `pieSectionTextColor: ink,` — resolve the local back to its vc() token
    const rtToken = (key) => {
      const local = (RUNTIME_SRC.match(new RegExp(`${key}:\\s*([a-zA-Z_$][\\w$]*)`)) || [])[1];
      if (!local) return undefined;
      const bind = RUNTIME_SRC.match(new RegExp(`const\\s+${local}\\s*=\\s*vc\\(['"]([a-z0-9-]+)['"]\\)`));
      return bind ? bind[1] : local; // fall back to the literal if not a vc() local
    };

    for (const key of ['pieTitleTextColor', 'pieSectionTextColor', 'pieLegendTextColor']) {
      test(`${key} resolves to the same token in both renderers`, () => {
        const e = emuVar(key), r = rtToken(key);
        assert.ok(e, `emulator MERMAID_VAR_MAP has no { var } for ${key}`);
        assert.equal(r, e,
          `${key} drift: emulator → ${e}, runtime → ${r}. ` +
          `Pie-slice text sits on the fill; both must use the on-fill ink (c-ink-light).`);
      });
    }

    test('pie section text uses the on-fill ink, not the canvas text colour', () => {
      assert.equal(emuVar('pieSectionTextColor'), 'c-ink-light');
      assert.equal(rtToken('pieSectionTextColor'), 'c-ink-light');
    });
  });
});
