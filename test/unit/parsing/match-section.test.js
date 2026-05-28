/**
 * Unit: lib/match-section.js — selector matching for screenshot-slides.
 *
 * Pure logic; the corresponding integration tests in
 * test/integration/screenshot.test.js exercise the same selectors
 * end-to-end through Puppeteer to confirm parity.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { parseSelector, matchSection, resolveSelector } = require('../../../lib/core/match-section');

describe('match-section', () => {
  const SECTIONS = [
    { cls: 'title',                   h2: '',                                    footer: 'Title slide · title' },
    { cls: 'cards-grid',              h2: 'Three cards for selector tests.',     footer: 'fixture · cards-grid' },
    { cls: 'before-after banner-tag', h2: 'Same comparison, banner-tag variant.',footer: 'Variant — before-after · banner-tag' },
    { cls: 'closing',                 h2: 'Final slide of the fixture deck.',    footer: 'fixture · closing' },
  ];

  // ── parseSelector ──────────────────────────────────────────────────────

  test('parseSelector: "all" → kind:all', () => {
    assert.deepEqual(parseSelector('all'), { kind: 'all' });
  });

  test('parseSelector: integer → kind:index', () => {
    assert.deepEqual(parseSelector('47'), { kind: 'index', value: 47 });
  });

  test('parseSelector: kind:value forms', () => {
    assert.deepEqual(parseSelector('h2:Foo'),     { kind: 'h2',     value: 'foo' });
    assert.deepEqual(parseSelector('class:Bar'),  { kind: 'class',  value: 'bar' });
    assert.deepEqual(parseSelector('footer:Baz'), { kind: 'footer', value: 'baz' });
    assert.deepEqual(parseSelector('match:abc'),  { kind: 'match',  value: 'abc' });
  });

  test('parseSelector: kind keywords are case-insensitive', () => {
    assert.deepEqual(parseSelector('H2:foo'), { kind: 'h2', value: 'foo' });
    assert.deepEqual(parseSelector('CLASS:bar'), { kind: 'class', value: 'bar' });
  });

  test('parseSelector: needle is lowercased for case-insensitive matching', () => {
    assert.equal(parseSelector('h2:BANNER').value, 'banner');
  });

  test('parseSelector: invalid → kind:invalid', () => {
    assert.equal(parseSelector('gibberish').kind, 'invalid');
    assert.equal(parseSelector('foo:bar').kind, 'invalid');
    assert.equal(parseSelector('').kind, 'invalid');
  });

  test('parseSelector: needle preserves colons after the first', () => {
    // `h2:foo:bar` — the entire post-colon string is the needle.
    assert.deepEqual(parseSelector('h2:foo:bar'), { kind: 'h2', value: 'foo:bar' });
  });

  // ── matchSection ──────────────────────────────────────────────────────

  test('matchSection: h2 substring matches case-insensitively', () => {
    const parsed = { kind: 'h2', value: 'banner-tag' };
    assert.equal(matchSection(SECTIONS[2], parsed), true);
    assert.equal(matchSection(SECTIONS[0], parsed), false);
  });

  test('matchSection: class substring matches', () => {
    assert.equal(matchSection(SECTIONS[1], { kind: 'class', value: 'cards-grid' }), true);
    assert.equal(matchSection(SECTIONS[1], { kind: 'class', value: 'closing' }), false);
  });

  test('matchSection: footer substring matches', () => {
    assert.equal(matchSection(SECTIONS[0], { kind: 'footer', value: 'title' }), true);
    assert.equal(matchSection(SECTIONS[0], { kind: 'footer', value: 'fixture' }), false);
  });

  test('matchSection: match: kind matches against any of h2/class/footer', () => {
    // Slide 2's class is "before-after banner-tag" — match: should hit on class.
    assert.equal(matchSection(SECTIONS[2], { kind: 'match', value: 'before-after' }), true);
    // Slide 3's footer is "fixture · closing" — match: should hit on footer.
    assert.equal(matchSection(SECTIONS[3], { kind: 'match', value: 'fixture' }), true);
    // Slide 1's h2 is "Three cards…" — match: should hit on h2.
    assert.equal(matchSection(SECTIONS[1], { kind: 'match', value: 'three cards' }), true);
  });

  test('matchSection: empty meta fields are tolerated (no h2 etc.)', () => {
    const empty = { cls: '', h2: '', footer: '' };
    assert.equal(matchSection(empty, { kind: 'h2', value: 'anything' }), false);
    assert.equal(matchSection(empty, { kind: 'match', value: 'anything' }), false);
  });

  test('matchSection: undefined kind returns false (not an exception)', () => {
    assert.equal(matchSection(SECTIONS[0], { kind: 'invalid' }), false);
    assert.equal(matchSection(SECTIONS[0], { kind: 'all' }), false);
  });

  // ── resolveSelector ──────────────────────────────────────────────────

  test('resolveSelector: "all" returns every index in order', () => {
    const r = resolveSelector('all', SECTIONS);
    assert.deepEqual(r.indices, [0, 1, 2, 3]);
  });

  test('resolveSelector: integer N returns [N-1] when in range', () => {
    assert.deepEqual(resolveSelector('1', SECTIONS).indices, [0]);
    assert.deepEqual(resolveSelector('4', SECTIONS).indices, [3]);
  });

  test('resolveSelector: integer out of range returns []', () => {
    assert.deepEqual(resolveSelector('0', SECTIONS).indices, []);
    assert.deepEqual(resolveSelector('99', SECTIONS).indices, []);
  });

  test('resolveSelector: substring forms return first hit only', () => {
    // Both slide 2 and "fixture" footer on slide 3 match — h2 only matches one.
    assert.deepEqual(resolveSelector('h2:Three cards', SECTIONS).indices, [1]);
    assert.deepEqual(resolveSelector('class:before-after', SECTIONS).indices, [2]);
    assert.deepEqual(resolveSelector('footer:closing', SECTIONS).indices, [3]);
  });

  test('resolveSelector: substring with no match returns []', () => {
    assert.deepEqual(resolveSelector('h2:no-such-text', SECTIONS).indices, []);
    assert.deepEqual(resolveSelector('class:nonesuch', SECTIONS).indices, []);
  });

  test('resolveSelector: invalid syntax returns error:invalid + indices:[]', () => {
    const r = resolveSelector('gibberish', SECTIONS);
    assert.equal(r.error, 'invalid');
    assert.deepEqual(r.indices, []);
  });

  test('resolveSelector: empty sections array → []  for every kind', () => {
    assert.deepEqual(resolveSelector('all', []).indices, []);
    assert.deepEqual(resolveSelector('1', []).indices, []);
    assert.deepEqual(resolveSelector('h2:foo', []).indices, []);
  });

  test('resolveSelector: result includes parsed selector for caller use', () => {
    const r = resolveSelector('h2:Foo', SECTIONS);
    assert.equal(r.parsed.kind, 'h2');
    assert.equal(r.parsed.value, 'foo');
  });
});
