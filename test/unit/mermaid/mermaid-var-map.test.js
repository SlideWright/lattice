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

  // ── Lockstep gate: the build (PDF/PPTX/PNG export) and runtime (preview /
  // HTML export) Mermaid theme-var maps must theme the SAME set of Mermaid keys.
  // They drifted silently once (#511): the runtime themed ER attribute-row fills
  // + xy-chart axes that the emulator did NOT, so those rendered off-brand in the
  // exported PDF (the deliverable). This asserts the two key-SETS are identical so
  // a key present in one path can never go missing from the other again. (It does
  // NOT assert token-value parity — a few keys intentionally map to different
  // tokens per path; that reconciliation is tracked separately on #511.)
  const RUNTIME_SRC = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'lib', 'runtime', 'index.js'),
    'utf8',
  );

  // Flatten a `{ key: ... }` block to the set of Mermaid variable keys it sets:
  // strip comments, match every `identifier:`, drop the structural wrapper words
  // (`var`/`literal`/`nested`/`joinVars`/`xyChart`). xy-chart leaf keys flatten in
  // alongside the top-level keys — symmetric across both blocks, so the set
  // comparison stays valid.
  const STRUCT = new Set(['var', 'literal', 'nested', 'joinVars', 'xyChart']);
  function keysetOf(block) {
    const noComments = block.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const out = new Set();
    let m;
    const re = /\b([A-Za-z]\w*)\s*:/g;
    while ((m = re.exec(noComments)) !== null) {
      if (!STRUCT.has(m[1])) out.add(m[1]);
    }
    return out;
  }

  function emulatorKeyset() {
    const start = EMULATOR_SRC.indexOf('const MERMAID_VAR_MAP = {');
    const end = EMULATOR_SRC.indexOf('\n};', start);
    assert.ok(start > 0 && end > start, 'MERMAID_VAR_MAP block not found in lattice-emulator.js');
    return keysetOf(EMULATOR_SRC.slice(start, end));
  }
  function runtimeKeyset() {
    const fn = RUNTIME_SRC.indexOf('const result = {');
    const end = RUNTIME_SRC.indexOf('\n    };', fn);
    assert.ok(fn > 0 && end > fn, 'buildMermaidThemeVars `result` object not found in lib/runtime/index.js');
    return keysetOf(RUNTIME_SRC.slice(fn, end));
  }

  test('the build and runtime Mermaid var-maps theme the identical key set (no silent drift)', () => {
    const emu = emulatorKeyset();
    const rt = runtimeKeyset();
    const emuOnly = [...emu].filter((k) => !rt.has(k)).sort();
    const rtOnly = [...rt].filter((k) => !emu.has(k)).sort();
    assert.deepEqual(
      { emulatorOnly: emuOnly, runtimeOnly: rtOnly },
      { emulatorOnly: [], runtimeOnly: [] },
      'Mermaid theme-var maps drifted (#511): a key set in one render path is missing from the other.\n' +
      `  build-only (in lattice-emulator.js, not lib/runtime/index.js): ${emuOnly.join(', ') || '—'}\n` +
      `  runtime-only (in lib/runtime/index.js, not lattice-emulator.js): ${rtOnly.join(', ') || '—'}\n` +
      'Add the missing key to the other map so preview and exported PDF theme the same elements.',
    );
    assert.ok(emu.size >= 40, `expected a substantial shared key set, got ${emu.size}`);
  });
});
