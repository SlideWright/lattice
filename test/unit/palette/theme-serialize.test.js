/**
 * Unit: lib/theme/serialize.js — derived token map → themes/<name>.css text.
 *
 * Proves the emitted CSS (1) names a valid @theme directive, (2) imports the
 * engine, (3) parses back through the SAME parser the contrast gate uses, and
 * (4) the parsed result is still contrast-clean in both modes — i.e. nothing
 * is lost or malformed between derivation and a droppable theme file.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { deriveTheme, requiredTokenList } = require('../../../lib/theme/derive.js');
const { serializeTheme } = require('../../../lib/theme/serialize.js');
const { auditVars } = require('../../../lib/theme/contrast.js');
const { STARTERS } = require('../../../lib/theme/starters.js');

// Same parser shape as test/unit/palette/contrast.test.js (light-dark aware),
// widened to accept `_` in token names (hljs-built_in).
function parsePaletteVars(content, mode = 'light') {
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  for (const block of stripped.match(/:root\s*\{[^}]*\}/g) || []) {
    for (const d of block.match(/--[a-z0-9_-]+\s*:\s*[^;]+/gi) || []) {
      const m = d.match(/--([a-z0-9_-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  for (const k of Object.keys(vars)) {
    const ld = vars[k].match(/^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i);
    if (ld) vars[k] = mode === 'dark' ? ld[2] : ld[1];
  }
  return vars;
}

describe('theme-serialize', () => {
  test('rejects an invalid theme name', () => {
    const map = deriveTheme(STARTERS[0].essentials);
    assert.throws(() => serializeTheme(map, { name: 'Bad Name' }), /slug/);
    assert.throws(() => serializeTheme(map, { name: '1leading' }), /slug/);
    assert.throws(() => serializeTheme(map, {}), /slug/);
  });

  for (const s of STARTERS) {
    test(`serialize(${s.name}) emits a valid, complete theme file`, () => {
      const map = deriveTheme(s.essentials);
      const css = serializeTheme(map, { name: s.name, label: s.label, description: s.description });

      assert.match(css, new RegExp(`@theme ${s.name}\\b`));
      assert.match(css, /@import 'lattice';/);
      assert.match(css, /:where\(:root\) \{ color-scheme: light; \}/);

      // every required token survives serialization
      const parsed = parsePaletteVars(css, 'light');
      const missing = requiredTokenList().filter(k => parsed[k] == null);
      assert.deepEqual(missing, [], `lost tokens: ${missing.join(', ')}`);
    });

    test(`serialize(${s.name}) round-trips contrast-clean (gate parser)`, () => {
      const map = deriveTheme(s.essentials);
      const css = serializeTheme(map, { name: s.name });
      for (const mode of ['light', 'dark']) {
        const audit = auditVars(parsePaletteVars(css, mode), { mode, level: 'gate' });
        const fmt = audit.failures.concat(audit.missing).map(f => `${f.fill}/${f.ink}[${f.status}]`);
        assert.ok(audit.ok, `${mode}: ${fmt.join(', ')}`);
      }
    });
  }
});
