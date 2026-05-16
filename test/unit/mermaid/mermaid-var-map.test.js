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

  test('mermaid-var-map: extracts a non-trivial set of required vars', () => {
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
});
