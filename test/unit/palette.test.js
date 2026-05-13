/**
 * Unit: palette resolution.
 *
 * Every palette must define the categorical cycle (--cN-light/--cN-dark
 * for N=1..12) and the structural diagram tokens (stroke, line, state,
 * note, error, quadrant) consumed by the renderer bridges and the
 * palette-blind overrides in lattice-diagram.css.
 *
 * test/unit/mermaid-var-map.test.js cross-checks the emulator's
 * MERMAID_VAR_MAP against the palette tokens automatically; this file
 * is the source-of-truth required list.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const { loadPalette } = require('../helpers/palette');

const REQUIRED_DIAGRAM_VARS = [
  // Brand primitives consumed by the renderer
  'bg', 'bg-alt', 'text-heading',

  // Non-flipping ink paired with every --cN-light fill
  'c-ink',

  // Categorical cycle (12 paired slots)
  'c1-light',  'c2-light',  'c3-light',  'c4-light',
  'c5-light',  'c6-light',  'c7-light',  'c8-light',
  'c9-light',  'c10-light', 'c11-light', 'c12-light',
  'c1-dark',   'c2-dark',   'c3-dark',   'c4-dark',
  'c5-dark',   'c6-dark',   'c7-dark',   'c8-dark',
  'c9-dark',   'c10-dark',  'c11-dark',  'c12-dark',

  // Structural
  'diagram-stroke', 'diagram-line', 'diagram-accent-warm',

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
  test(`palette: ${name} defines all ${REQUIRED_DIAGRAM_VARS.length} required palette tokens`, () => {
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
