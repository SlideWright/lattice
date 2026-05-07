/**
 * Unit: palette resolution.
 *
 * Both palettes (indaco, cuoio) must:
 *   - Carry the Mermaid CSS sentinel.
 *   - Define every CSS custom property the emulator's Mermaid
 *     theme-variable map references.
 *
 * The required-vars list mirrors what `lattice-emulator.js` consumes via its
 * MERMAID_VAR_MAP. Phase 6 will derive this list from the source
 * directly to remove the manual sync.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const { loadPalette } = require('../helpers/palette');

const REQUIRED_MERMAID_VARS = [
  'bg', 'bg-alt', 'text-heading',
  'mermaid-primary-color', 'mermaid-secondary-color',
  'mermaid-pie-purple', 'mermaid-pie-orange', 'mermaid-pie-teal', 'mermaid-pie-rose',
  'mermaid-pie-yellow', 'mermaid-pie-red', 'mermaid-pie-slate', 'mermaid-pie-sage',
  'mermaid-pie-violet',
  'mermaid-line', 'mermaid-border',
  'cat-blue', 'cat-green', 'cat-purple',
  'cat-orange', 'cat-teal', 'cat-rose',
  'cat-slate', 'cat-mauve',
  'mermaid-quadrant-1-fill', 'mermaid-quadrant-2-fill',
  'mermaid-quadrant-3-fill', 'mermaid-quadrant-4-fill',
  'mermaid-quadrant-1-text', 'mermaid-quadrant-2-text',
  'mermaid-quadrant-3-text', 'mermaid-quadrant-4-text',
  'mermaid-gantt-active', 'mermaid-gantt-active-border',
  'mermaid-gantt-done',   'mermaid-gantt-done-border',
  'mermaid-gantt-critical', 'mermaid-gantt-critical-border',
  'mermaid-gantt-today', 'mermaid-gantt-grid',
  'mermaid-note-bg', 'mermaid-note-border',
  'mermaid-error-bg', 'mermaid-error-text',
];

for (const name of ['indaco', 'cuoio']) {
  test(`palette: ${name} carries Mermaid CSS sentinel`, () => {
    const p = loadPalette(name);
    assert.ok(p.mermaidSentinelIndex > 0, `sentinel missing in themes/${name}.css`);
    assert.ok(
      p.raw.length > p.mermaidSentinelIndex + 100,
      `Mermaid CSS section is empty in themes/${name}.css`,
    );
  });

  test(`palette: ${name} defines all ${REQUIRED_MERMAID_VARS.length} required Mermaid vars`, () => {
    const p = loadPalette(name);
    const missing = REQUIRED_MERMAID_VARS.filter(v => !p.vars[v]);
    assert.deepEqual(missing, [], `missing vars in themes/${name}.css: ${missing.join(', ')}`);
  });
}
