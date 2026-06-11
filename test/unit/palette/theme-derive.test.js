/**
 * Unit: lib/theme/derive.js — the contrast-aware derivation.
 *
 * The load-bearing guarantee: deriving from any starter essential set yields a
 * COMPLETE token map that is CONTRAST-CLEAN in both canvas modes against the
 * exact pairs the shipped palette gate asserts
 * (test/unit/palette/contrast.test.js). If this passes, a graduated theme
 * passes the gate.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { deriveTheme, validateEssentials, requiredTokenList, ESSENTIAL_KEYS } = require('../../../lib/theme/derive.js');
const { auditBoth } = require('../../../lib/theme/contrast.js');
const { contrastRatio } = require('../../../lib/theme/color.js');
const { STARTERS } = require('../../../lib/theme/starters.js');

describe('theme-derive', () => {
  test('validateEssentials rejects malformed input', () => {
    assert.throws(() => validateEssentials(null));
    assert.throws(() => validateEssentials({}), /missing/);
    const partial = { ...STARTERS[0].essentials };
    delete partial.accent;
    assert.throws(() => validateEssentials(partial), /accent/);
    const badHex = { ...STARTERS[0].essentials, bg: 'periwinkle' };
    assert.throws(() => validateEssentials(badHex), /hex/);
  });

  test('every essential key is documented', () => {
    for (const s of STARTERS) {
      for (const k of ESSENTIAL_KEYS) assert.ok(s.essentials[k], `${s.name} missing ${k}`);
    }
  });

  for (const s of STARTERS) {
    test(`derive(${s.name}) yields the complete token contract`, () => {
      const t = deriveTheme(s.essentials);
      const missing = requiredTokenList().filter(k => t[k] == null);
      assert.deepEqual(missing, [], `missing tokens: ${missing.join(', ')}`);
    });

    test(`derive(${s.name}) is contrast-clean in both modes (gate parity)`, () => {
      const t = deriveTheme(s.essentials);
      const audit = auditBoth(t, { level: 'gate' });
      const fmt = a => a.failures.concat(a.missing).map(f => `${f.fill}/${f.ink}=${(f.ratio || 0).toFixed(2)}[${f.status}]`);
      assert.ok(audit.light.ok, `light failures: ${fmt(audit.light).join(', ')}`);
      assert.ok(audit.dark.ok, `dark failures: ${fmt(audit.dark).join(', ')}`);
    });
  }

  test('derivation is deterministic (same input → same output)', () => {
    const a = deriveTheme(STARTERS[0].essentials);
    const b = deriveTheme(STARTERS[0].essentials);
    assert.deepEqual(a, b);
  });

  test('cross-check: a spot pair clears AA via the raw predicate too', () => {
    // Guards against the audit and derivation sharing a hidden mutual bug.
    const t = deriveTheme(STARTERS[0].essentials);
    const headingLight = t['text-heading'].match(/light-dark\(\s*([^,]+)/)[1].trim();
    const bgLight = t['bg'].match(/light-dark\(\s*([^,]+)/)[1].trim();
    assert.ok(contrastRatio(headingLight, bgLight) >= 4.5);
    assert.ok(contrastRatio(t['c1-dark'], t['c-ink-dark']) >= 4.5);
    assert.ok(contrastRatio(t['c1-light'], t['c-ink-light']) >= 4.5);
  });
});
