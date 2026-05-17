/**
 * Unit: lib/slot-label-lift.js — auto-wrap slot label in <strong>.
 *
 * Used by named-slot layouts (decision, before-after, compare-prose) so
 * authors can write `- Build` instead of `- **Build**` and still get
 * the corner-tag chrome. The function is pure HTML→HTML and runs
 * downstream of markdown-it parsing, so inputs reflect the parser's
 * canonical shape: a <p>-wrapped lead followed by a nested <ul>/<ol>.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { liftSlotLabel } = require('../../../lib/engine/slot-label-lift');

describe('slot-label-lift', () => {
  // ── happy path ──────────────────────────────────────────────────────────

  test('lift: wraps plain p-wrapped lead in <strong>', () => {
    const input  = '<p>Build</p><ul><li>body</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Build</strong><ul><li>body</li></ul>');
  });

  test('lift: wraps lead text without <p> wrapper', () => {
    // markdown-it sometimes emits inline-only leads without a <p> wrapper
    // (e.g. when the markdown is `Build\n  - body` and the AST chooses
    // to keep them inline). Lift should still fire.
    const input  = 'Build<ul><li>body</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Build</strong><ul><li>body</li></ul>');
  });

  test('lift: works with <ol> body just like <ul>', () => {
    const input  = '<p>Step</p><ol><li>one</li></ol>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Step</strong><ol><li>one</li></ol>');
  });

  // ── idempotency ─────────────────────────────────────────────────────────

  test('lift: leaves already-wrapped <strong> lead alone (idempotent)', () => {
    // Author wrote `- **Build**` already → markdown emits <strong>Build</strong>
    // wrapped in <p>. Lift should NOT double-wrap.
    const input  = '<p><strong>Build</strong></p><ul><li>body</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Build</strong><ul><li>body</li></ul>');
  });

  test('lift: idempotent when already-wrapped without <p>', () => {
    const input  = '<strong>Build</strong><ul><li>body</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Build</strong><ul><li>body</li></ul>');
  });

  test('lift: running twice yields the same result', () => {
    const input  = '<p>Build</p><ul><li>body</li></ul>';
    const once   = liftSlotLabel(input);
    const twice  = liftSlotLabel(once);
    assert.equal(once, twice);
  });

  // ── no-op cases ─────────────────────────────────────────────────────────

  test('lift: returns input unchanged when there is no nested ul/ol body', () => {
    // No nested list = not a slot-label layout shape. Hands-off.
    const input  = '<p>Just a paragraph, no list</p>';
    assert.equal(liftSlotLabel(input), input);
  });

  test('lift: returns input unchanged when lead is empty (only <ul>)', () => {
    const input  = '<ul><li>just a body</li></ul>';
    assert.equal(liftSlotLabel(input), input);
  });

  test('lift: returns input unchanged when lead is whitespace-only', () => {
    const input  = '   \n  <ul><li>body</li></ul>';
    assert.equal(liftSlotLabel(input), input);
  });

  // ── inline markup inside lead ───────────────────────────────────────────

  test('lift: preserves inline <em> inside the lead', () => {
    const input  = '<p>Why <em>not</em> buy</p><ul><li>body</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Why <em>not</em> buy</strong><ul><li>body</li></ul>');
  });

  test('lift: preserves inline <code> inside the lead', () => {
    const input  = '<p>Build <code>v2</code></p><ul><li>body</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Build <code>v2</code></strong><ul><li>body</li></ul>');
  });

  test('lift: multi-word lead with punctuation', () => {
    const input  = '<p>Why not delay?</p><ul><li>body</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Why not delay?</strong><ul><li>body</li></ul>');
  });

  // ── edge cases ──────────────────────────────────────────────────────────

  test('lift: trims leading/trailing whitespace inside the <p> wrapper', () => {
    const input  = '<p>  Build  </p><ul><li>body</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Build</strong><ul><li>body</li></ul>');
  });

  test('lift: handles <ol> with start attribute (counter-style cards)', () => {
    const input  = '<p>Step</p><ol start="2"><li>x</li></ol>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Step</strong><ol start="2"><li>x</li></ol>');
  });

  test('lift: only the FIRST nested ul/ol triggers the split (greedy matters)', () => {
    // The regex captures from the start of the string up to the first
    // <ul> or <ol> opener. Anything after — even more lists — stays in
    // the body chunk, untouched.
    const input  = '<p>Build</p><ul><li>a</li></ul><ul><li>b</li></ul>';
    const output = liftSlotLabel(input);
    assert.equal(output, '<strong>Build</strong><ul><li>a</li></ul><ul><li>b</li></ul>');
  });

  test('lift: empty string input', () => {
    assert.equal(liftSlotLabel(''), '');
  });
});
