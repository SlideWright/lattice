/**
 * Unit: palette resolution.
 *
 * Both canonical palettes (indaco, cuoio) must define every --diagram-*
 * token the renderer bridges (lattice-emulator.js, lattice-runtime.js)
 * and the palette-blind overrides (lattice-diagram.css) consume.
 *
 * The required-vars list mirrors what `lattice-emulator.js` consumes via
 * its MERMAID_VAR_MAP plus the band-text/band slots referenced by
 * lattice-diagram.css. test/unit/mermaid-var-map.test.js cross-checks
 * the emulator map against this list automatically; this file is the
 * source-of-truth list.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const { loadPalette } = require('../helpers/palette');

const REQUIRED_DIAGRAM_VARS = [
  // Brand primitives consumed by the renderer
  'bg', 'bg-alt', 'text-heading',

  // Band cycle (12 slots) + paired text
  'diagram-band-1',  'diagram-band-2',  'diagram-band-3',  'diagram-band-4',
  'diagram-band-5',  'diagram-band-6',  'diagram-band-7',  'diagram-band-8',
  'diagram-band-9',  'diagram-band-10', 'diagram-band-11', 'diagram-band-12',
  'diagram-band-text-1',  'diagram-band-text-2',  'diagram-band-text-3',
  'diagram-band-text-4',  'diagram-band-text-5',  'diagram-band-text-6',
  'diagram-band-text-7',  'diagram-band-text-8',  'diagram-band-text-9',
  'diagram-band-text-10', 'diagram-band-text-11', 'diagram-band-text-12',

  // Structural
  'diagram-stroke', 'diagram-line', 'diagram-accent-warm',

  // Mid-tone categorical (consumed beyond Mermaid by chart-family / kpi)
  'cat-blue', 'cat-green', 'cat-purple', 'cat-orange',
  'cat-teal', 'cat-rose', 'cat-slate', 'cat-mauve',

  // Quadrant (4-slot, fill + text paired)
  'diagram-quadrant-1-fill', 'diagram-quadrant-2-fill',
  'diagram-quadrant-3-fill', 'diagram-quadrant-4-fill',
  'diagram-quadrant-1-text', 'diagram-quadrant-2-text',
  'diagram-quadrant-3-text', 'diagram-quadrant-4-text',

  // State (gantt lifecycle)
  'diagram-state-active',   'diagram-state-active-stroke',
  'diagram-state-done',     'diagram-state-done-stroke',
  'diagram-state-critical', 'diagram-state-critical-stroke',
  'diagram-state-today',    'diagram-state-grid',

  // Note (sequence aside) + error (alarm)
  'diagram-note-bg', 'diagram-note-stroke',
  'diagram-error-bg', 'diagram-error-text',
];

for (const name of ['indaco', 'cuoio']) {
  test(`palette: ${name} defines all ${REQUIRED_DIAGRAM_VARS.length} required --diagram-* tokens`, () => {
    const p = loadPalette(name);
    const missing = REQUIRED_DIAGRAM_VARS.filter(v => !p.vars[v]);
    assert.deepEqual(missing, [], `missing vars in themes/${name}.css: ${missing.join(', ')}`);
  });

  test(`palette: ${name} no longer carries the legacy MERMAID THEME CSS sentinel`, () => {
    const p = loadPalette(name);
    assert.equal(
      p.raw.indexOf('===== MERMAID THEME CSS ====='),
      -1,
      `themes/${name}.css still contains the legacy sentinel comment; the post-sentinel CSS now lives in lattice-diagram.css`,
    );
  });

  test(`palette: ${name} no longer declares legacy --mermaid-* tokens`, () => {
    const p = loadPalette(name);
    const legacy = Object.keys(p.vars).filter(v => v.startsWith('mermaid-'));
    assert.deepEqual(legacy, [], `themes/${name}.css still declares legacy tokens: ${legacy.join(', ')}`);
  });
}
