/**
 * Unit: the universal-token crosswalk transforms + the safety guarantee that
 * flipping to the new system resolves every bridge token to the IDENTICAL value
 * as the current system. This is the automated proof behind the Drawing Board's
 * "Token system: Current / Universal" toggle — the flip is byte-identical.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PAIRS, flipTheme, flip } = require('../../../lib/tokens/crosswalk');
const { resolveTokenExpr } = require('../../../lib/core/resolve-token-expr');

const ROOT = path.join(__dirname, '..', '..', '..');

function rawRootVars(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  for (const block of stripped.match(/:root\s*\{[^}]*\}/g) || []) {
    for (const d of block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || []) {
      const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  return vars;
}

describe('crosswalk transforms', () => {
  test('flipTheme renames a definition and a reference', () => {
    const css = ':root{--c1-light:#abc; --x:var(--c1-light)}';
    const out = flipTheme(css);
    assert.match(out, /--cat-1-fill:#abc/);
    assert.match(out, /var\(--cat-1-fill\)/);
    assert.doesNotMatch(out, /c1-light/);
  });

  test('flipTheme respects token boundaries (c1 ≠ c10, dark-bg ≠ dark-bg-alt)', () => {
    assert.match(flipTheme('--c1-light:#a'), /^--cat-1-fill:#a$/);
    assert.match(flipTheme('--c10-light:#a'), /^--cat-10-fill:#a$/);
    const o = flipTheme('--dark-bg:#a; --dark-bg-alt:#b');
    assert.match(o, /--scheme-dark-bg:#a/);
    assert.match(o, /--scheme-dark-bg-alt:#b/);
  });

  test('flip renames consumers and drops the now self-referential aliases', () => {
    // a forward alias + a real consumer + a derivation
    const css = ':root{--cat-1-fill: var(--c1-light); --x: var(--c1-light); --c1-light: light-dark(#a,#b)}';
    const out = flip(css);
    assert.doesNotMatch(out, /--cat-1-fill:\s*var\(--cat-1-fill\)/); // self-ref alias removed
    assert.match(out, /--x:\s*var\(--cat-1-fill\)/);                 // consumer renamed
    assert.match(out, /--cat-1-fill:\s*light-dark\(#a,#b\)/);        // canonical def renamed
  });
});

describe('flip safety — universal resolves identically to current (bridge tokens)', () => {
  const lattice = fs.readFileSync(path.join(ROOT, 'dist', 'lattice.css'), 'utf8');
  const uniLattice = flip(lattice);

  for (const theme of ['indaco', 'cuoio']) {
    const themeCss = fs.readFileSync(path.join(ROOT, 'themes', `${theme}.css`), 'utf8');
    const legacy = rawRootVars(`${lattice}\n${themeCss}`);
    const universal = rawRootVars(`${uniLattice}\n${flip(themeCss)}`);

    for (const isDark of [false, true]) {
      test(`${theme}/${isDark ? 'dark' : 'light'}: every flipped token resolves to its current value`, () => {
        const drift = [];
        for (const { old, new: nu } of PAIRS) {
          // current system resolves the OLD name; universal resolves the NEW name.
          const cur = resolveTokenExpr(legacy[old], legacy, isDark);
          const uni = resolveTokenExpr(universal[nu], universal, isDark);
          if (cur !== uni) drift.push(`--${old}→--${nu}: current ${cur} vs universal ${uni}`);
        }
        assert.deepEqual(drift, [], `flip changed a resolved value (${theme}/${isDark ? 'dark' : 'light'}):\n${drift.join('\n')}`);
      });
    }
  }
});
