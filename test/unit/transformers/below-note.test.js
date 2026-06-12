/**
 * Unit tests for the universal below-note kernel (lib/core/below-note.js) and
 * its registry adapter (lib/transformers/below-note.js).
 *
 * Contract: a layout's trailing `<p>` that follows a structural block
 * (div/ul/ol/table/pre/blockquote) is wrapped in `.below-note` for the
 * hairline treatment — UNLESS the section's class is on the exclusion list,
 * or the `<p>` follows another `<p>` (that is main content). The kernel feeds
 * all three render paths; the emulator calls `wrapSectionBody` on a pre-chrome
 * body (no footer), marp-cli calls `applyToHtml` on full sections (with a
 * trailing `<footer>`), and the runtime calls `applyToDom`.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const belowNote = require('../../../lib/core/below-note');
const adapter = require('../../../lib/transformers/below-note');

const WRAP = '<div class="below-note">';
const sec = (cls, inner) => `<section class="${cls}">${inner}</section>`;

describe('below-note — wrapSectionBody (emulator path)', () => {
  test('wraps a trailing <p> after a list', () => {
    const out = belowNote.wrapSectionBody('<ul><li>a</li></ul><p>note</p>', 'list-checks');
    assert.equal(out, '<ul><li>a</li></ul><div class="below-note"><p>note</p></div>');
  });

  test('is byte-identical to the legacy inline regex (drops trailing whitespace)', () => {
    const out = belowNote.wrapSectionBody('<table><tr><td>x</td></tr></table>\n<p>n</p>\n', 'list-tabular');
    assert.equal(out, '<table><tr><td>x</td></tr></table>\n<div class="below-note"><p>n</p></div>');
  });

  test('skips excluded layouts', () => {
    const html = '<ul><li>a</li></ul><p>note</p>';
    for (const cls of ['content', 'diagram', 'title', 'split-panel', 'code']) {
      assert.equal(belowNote.wrapSectionBody(html, cls), html, `should skip ${cls}`);
    }
  });

  test('does not wrap a <p> that follows another <p> (main content)', () => {
    const html = '<p>body</p><p>more body</p>';
    assert.equal(belowNote.wrapSectionBody(html, 'statement'), html);
  });
});

describe('below-note — applyToHtml (marp-cli path)', () => {
  test('wraps the trailing <p> and preserves a following <footer>', () => {
    const out = belowNote.applyToHtml(
      sec('list-checks', '<ul><li>a</li></ul><p>note</p><footer>f</footer>'),
    );
    assert.ok(out.includes('<div class="below-note"><p>note</p></div><footer>f</footer>'));
  });

  test('reads each section class independently', () => {
    const out = belowNote.applyToHtml(
      sec('list-checks', '<ul><li>a</li></ul><p>kept</p>') +
      sec('content', '<ul><li>b</li></ul><p>untouched</p>'),
    );
    assert.equal(out.split(WRAP).length - 1, 1); // exactly one wrap
    assert.ok(out.includes('<p>untouched</p>'));
    assert.ok(!out.includes('below-note"><p>untouched'));
  });

  test('leaves nested split-panel sections intact (excluded outer, no inner wrap)', () => {
    const html = sec('split-panel', sec('panel', '<ul><li>a</li></ul><p>n</p>'));
    assert.equal(belowNote.applyToHtml(html), html);
  });

  test('is idempotent', () => {
    const once = belowNote.applyToHtml(sec('list-checks', '<ul><li>a</li></ul><p>n</p>'));
    assert.equal(belowNote.applyToHtml(once), once);
  });
});

describe('below-note — applyToDom (runtime path)', () => {
  const dom = (body) => new JSDOM(`<!DOCTYPE html><body>${body}</body>`).window.document;

  test('wraps a trailing <p> after a list, before the footer', () => {
    const doc = dom(sec('list-checks', '<ul><li>a</li></ul><p>note</p><footer>f</footer>'));
    adapter.applyToDom(doc);
    const wrap = doc.querySelector('section > .below-note');
    assert.ok(wrap, 'expected a .below-note wrapper');
    assert.equal(wrap.querySelector('p').textContent, 'note');
    assert.equal(wrap.nextElementSibling.tagName, 'FOOTER');
  });

  test('skips excluded sections and main-content paragraphs', () => {
    const doc = dom(
      sec('content', '<ul><li>a</li></ul><p>x</p>') +
      sec('statement', '<p>body</p><p>more</p>'),
    );
    adapter.applyToDom(doc);
    assert.equal(doc.querySelector('.below-note'), null);
  });

  test('is idempotent', () => {
    const doc = dom(sec('list-checks', '<ul><li>a</li></ul><p>n</p>'));
    adapter.applyToDom(doc);
    adapter.applyToDom(doc);
    assert.equal(doc.querySelectorAll('.below-note').length, 1);
  });
});
