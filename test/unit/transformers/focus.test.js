/**
 * Unit tests for the focus resolver transformer.
 *
 * Covers both the HTML-string kernel (applyToHtml, used by lattice-emulator via
 * lib/engine) and the DOM walk (applyToDom, used by lattice-runtime) — the two
 * must agree (HARD RULE 1). The contract: the ordinal target of `_focus:` (via
 * the `data-focus` attribute the directive apply step stamps) is tagged
 * `.lat-focus`, siblings `.lat-recede`; the section gets `data-focus-axis` and
 * the resolved `data-focus-style` (content-aware default, or explicit override).
 *
 * Design: engineering/decisions/2026-06-16-focus-highlighting.md.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const focus = require('../../../lib/transformers/focus');

describe('focus — grammar', () => {
  test('parses a single ordinal', () => {
    assert.deepEqual(focus.parseFocusSpec('row 4').map((g) => ({ axis: g.axis, i: [...g.indices] })),
      [{ axis: 'row', i: [4] }]);
  });
  test('parses a range and merges repeated axes', () => {
    assert.deepEqual(focus.parseFocusSpec('item 2-4, item 6').map((g) => ({ axis: g.axis, i: [...g.indices] })),
      [{ axis: 'item', i: [2, 3, 4, 6] }]);
  });
  test('ignores malformed tokens without throwing', () => {
    assert.deepEqual(focus.parseFocusSpec('row banana').map((g) => [...g.indices]), [[]]);
  });
});

describe('focus — HTML kernel (applyToHtml)', () => {
  const TABLE = '<section data-focus="row 2" class="compare-table"><table><thead><tr><th>A</th></tr></thead><tbody>\n<tr><td>r1</td></tr>\n<tr><td>r2</td></tr>\n<tr><td>r3</td></tr>\n</tbody></table></section>';
  const GRID = '<section data-focus="item 2" class="cards-grid"><h2>x</h2><ul>\n<li>One<ul><li>b1</li></ul></li>\n<li>Two<ul><li>b2</li></ul></li>\n<li>Three</li>\n</ul></section>';

  test('tags the Nth table row .lat-focus, siblings .lat-recede; thead untouched', () => {
    const out = focus.applyToHtml(TABLE);
    assert.match(out, /<tr class="lat-recede"><td>r1/);
    assert.match(out, /<tr class="lat-focus"><td>r2/);
    assert.match(out, /<tr class="lat-recede"><td>r3/);
    assert.match(out, /<thead><tr><th>A/); // header never tagged
  });

  test('table axis resolves to the ring default + stamps axis/resolved', () => {
    const out = focus.applyToHtml(TABLE);
    assert.match(out, /data-focus-axis="row"/);
    assert.match(out, /data-focus-style="ring"/);
    assert.match(out, /data-focus-resolved/);
  });

  test('counts only top-level <li> (nested description list is not a sibling)', () => {
    const out = focus.applyToHtml(GRID);
    assert.match(out, /<li class="lat-recede">One/);
    assert.match(out, /<li class="lat-focus">Two/);
    assert.match(out, /<li class="lat-recede">Three/);
    assert.match(out, /data-focus-style="spotlight"/); // item axis → spotlight default
  });

  test('an explicit _focusStyle overrides the content-aware default', () => {
    const out = focus.applyToHtml(GRID.replace('data-focus="item 2"', 'data-focus="item 2" data-focus-style="ring"'));
    assert.match(out, /data-focus-style="ring"/);
  });

  test('idempotent — a resolved section is left alone on a second pass', () => {
    const once = focus.applyToHtml(TABLE);
    assert.equal(focus.applyToHtml(once), once);
  });

  test('no data-focus → unchanged', () => {
    const plain = '<section class="list"><ul><li>a</li><li>b</li></ul></section>';
    assert.equal(focus.applyToHtml(plain), plain);
  });
});

describe('focus — DOM kernel (applyToDom) agrees with the HTML kernel', () => {
  test('tags rows and stamps attrs on the live DOM', () => {
    const dom = new JSDOM('<section data-focus="row 2" class="compare-table"><table><tbody><tr><td>r1</td></tr><tr><td>r2</td></tr><tr><td>r3</td></tr></tbody></table></section>');
    focus.applyToDom(dom.window.document.body);
    const sec = dom.window.document.querySelector('section');
    const rows = [...dom.window.document.querySelectorAll('tbody tr')];
    assert.equal(rows[0].className, 'lat-recede');
    assert.equal(rows[1].className, 'lat-focus');
    assert.equal(rows[2].className, 'lat-recede');
    assert.equal(sec.getAttribute('data-focus-axis'), 'row');
    assert.equal(sec.getAttribute('data-focus-style'), 'ring');
  });

  test('tags grid items (top-level li only) and applies spotlight default', () => {
    const dom = new JSDOM('<section data-focus="item 3" class="cards-grid"><ul><li>One<ul><li>b</li></ul></li><li>Two</li><li>Three</li></ul></section>');
    focus.applyToDom(dom.window.document.body);
    const items = [...dom.window.document.querySelectorAll(':scope > ul > li, section > ul > li')]
      .filter((li) => li.parentElement.parentElement.tagName === 'SECTION');
    assert.equal(items[2].classList.contains('lat-focus'), true);
    assert.equal(dom.window.document.querySelector('section').getAttribute('data-focus-style'), 'spotlight');
  });
});
