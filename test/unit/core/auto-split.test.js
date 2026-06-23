/**
 * Unit: lib/core/auto-split.js — the build-time slide auto-splitter.
 *
 * Drives the partitionAxis kernel from each component's capacity contract: a slide
 * past `capacity.hard` on a splittable axis is re-emitted as several; everything
 * else passes through byte-identical (so a non-overflowing deck's export is
 * unchanged). The Fit Ladder's SPLIT move applied (the-fit-spine.md §3).
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { autoSplitDeck, resplitDoc, capacityForClass } = require('../../../lib/core/auto-split');

const sec = (cls, inner) => `<section class="${cls}">${inner}</section>`;
const docSec = (n, cls, inner) => `<section data-lattice-slide="${n}" class="${cls}">${inner}</section>`;
const list = (n) => `<ul>${Array.from({ length: n }, (_, i) => `<li>item ${i + 1}</li>`).join('')}</ul>`;
const cap = { cards: { axis: 'item', hard: 4 }, redline: { axis: 'col', hard: 2 } };
const nums = (html) => [...html.matchAll(/data-lattice-slide="(\d+)"/g)].map((m) => Number(m[1]));

describe('core: autoSplitDeck', () => {
  test('splits an over-capacity slide, heading on each, (cont.) on continuations', () => {
    const html = sec('cards', `<h2>T</h2>${list(9)}`); // hard 4, no sweet → chunk 4 → 3 slides
    const { html: out, splits } = autoSplitDeck(html, cap);
    assert.equal(splits, 1);
    assert.equal((out.match(/<section/g) || []).length, 3);
    assert.equal((out.match(/<h2>/g) || []).length, 3); // heading on every slide
    assert.equal((out.match(/lat-cont/g) || []).length, 2); // (cont.) on slides 2 & 3 only
    assert.match(out, /<h2>T<\/h2>/); // first slide keeps the plain title
  });

  test('splits into SWEET-sized chunks, not the hard max', () => {
    const capSweet = { wide: { axis: 'item', sweet: 3, soft: 5, hard: 8 } };
    const html = sec('wide', list(10)); // 10 > hard 8 → split, chunk by sweet 3 → 4 slides
    assert.equal((autoSplitDeck(html, capSweet).html.match(/<section/g) || []).length, 4);
  });

  test('a slide AT capacity is untouched (byte-identical)', () => {
    const html = sec('cards', `<h2>T</h2>${list(4)}`);
    const { html: out, splits } = autoSplitDeck(html, cap);
    assert.equal(splits, 0);
    assert.equal(out, html);
  });

  test('a non-splittable axis (col read-across) is left for the ring, never split', () => {
    const html = sec('redline', '<table><tbody><tr><td>a</td><td>b</td><td>c</td></tr></tbody></table>');
    const { html: out, splits } = autoSplitDeck(html, cap); // 3 cols > hard 2, but col → null
    assert.equal(splits, 0);
    assert.equal(out, html);
  });

  test('a slide with no capacity entry passes through', () => {
    const html = sec('quote', '<blockquote>x</blockquote>');
    assert.equal(autoSplitDeck(html, cap).splits, 0);
  });

  test('preserves gaps and the section openTag/attributes across copies', () => {
    const html = `\n<section class="cards" data-x="1">${list(6)}</section>\n`;
    const { html: out } = autoSplitDeck(html, cap); // 6/4 → 2 slides
    assert.equal((out.match(/<section class="cards" data-x="1">/g) || []).length, 2);
    assert.match(out, /^\n/); // leading gap preserved
    assert.match(out, /\n$/); // trailing gap preserved
  });

  test('no content lost: every member survives across the split', () => {
    const html = sec('cards', list(10));
    const { html: out } = autoSplitDeck(html, cap); // 10/4 → 4+4+2
    assert.equal((out.match(/<li>/g) || []).length, 10);
    assert.equal((out.match(/<section/g) || []).length, 3);
  });

  test('continuation copies drop the engine id — the split never duplicates ids', () => {
    const html = `<section class="cards" id="2">${list(6)}</section>`; // 6/4 → 2 slides
    const { html: out } = autoSplitDeck(html, cap);
    assert.equal((out.match(/<section/g) || []).length, 2);
    assert.equal((out.match(/id="2"/g) || []).length, 1); // only the first copy keeps it
    assert.match(out, /<section class="cards" id="2">/); // first intact
    assert.match(out, /<section class="cards">/); // continuation has no id
  });

  test('capacityForClass: first capacity-bearing token wins; modifiers carry none', () => {
    assert.deepEqual(capacityForClass('cards compact', cap), { axis: 'item', hard: 4 });
    assert.equal(capacityForClass('quote big', cap), null);
    assert.equal(capacityForClass('', cap), null);
  });
});

describe('core: resplitDoc (measured pass)', () => {
  test('splits a measured-overflowing slide by its ratio and renumbers, regardless of count', () => {
    // 8 cards but ratio only 1.9 — count alone (<= no static trigger here) wouldn't matter;
    // the measured ratio drives a 2-way split. The 2nd quote slide is untouched.
    const doc = docSec(1, 'cards', `<h2>T</h2>${list(8)}`) + docSec(2, 'quote', '<p>x</p>');
    const { html, changed } = resplitDoc(doc, [{ slide: 1, ratio: 1.9 }], cap);
    assert.equal(changed, 1);
    assert.deepEqual(nums(html), [1, 2, 3]); // cards → 1,2 ; quote → 3
    assert.equal((html.match(/lat-cont/g) || []).length, 1); // continuation marked
  });

  test('a steeper ratio yields more pieces (ratio 2.8 → 3 slides)', () => {
    const { html, changed } = resplitDoc(docSec(1, 'cards', list(9)), [{ slide: 1, ratio: 2.8 }], cap);
    assert.equal(changed, 1);
    assert.equal((html.match(/<section/g) || []).length, 3); // 9 / ceil(2.8) → 3 each
  });

  test('a slide NOT in the measured-overflow list is untouched', () => {
    assert.equal(resplitDoc(docSec(1, 'cards', list(8)), [{ slide: 2, ratio: 2 }], cap).changed, 0);
  });

  test('a non-splittable (col read-across) overflow is left for the ring', () => {
    const doc = docSec(1, 'redline', '<table><tbody><tr><td>a</td><td>b</td></tr></tbody></table>');
    assert.equal(resplitDoc(doc, [{ slide: 1, ratio: 2 }], cap).changed, 0);
  });

  test('renumbers every section after a mid-deck split', () => {
    const doc = docSec(1, 'quote', '<p>a</p>') + docSec(2, 'cards', list(8)) + docSec(3, 'quote', '<p>b</p>');
    const { html } = resplitDoc(doc, [{ slide: 2, ratio: 1.9 }], cap);
    assert.deepEqual(nums(html), [1, 2, 3, 4]); // quote, cards×2, quote
  });

  test('re-paginates the page-number badge so split copies do not repeat the original', () => {
    // Two paginated slides; the second (cards) splits in two. The baked pagination
    // (1, 2) must become 1, 2, 3 across the now-three pages — not 1, 2, 2.
    const pg = (n, cls, inner) => `<section data-lattice-slide="${n}" data-lattice-pagination="${n}" data-lattice-pagination-total="2" class="${cls}">${inner}</section>`;
    const doc = pg(1, 'quote', '<p>a</p>') + pg(2, 'cards', list(8));
    const { html } = resplitDoc(doc, [{ slide: 2, ratio: 1.9 }], cap);
    const pages = [...html.matchAll(/data-lattice-pagination="(\d+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(pages, [1, 2, 3]); // monotonic — no repeated badge
    assert.ok([...html.matchAll(/data-lattice-pagination-total="(\d+)"/g)].every((m) => m[1] === '3'));
  });

  test('a paginate:false slide (no pagination attr) does not advance the page counter', () => {
    const doc =
      '<section data-lattice-slide="1" class="title"><h1>cover</h1></section>' +
      `<section data-lattice-slide="2" data-lattice-pagination="1" class="cards">${list(8)}</section>`;
    const { html } = resplitDoc(doc, [{ slide: 2, ratio: 1.9 }], cap);
    const pages = [...html.matchAll(/data-lattice-pagination="(\d+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(pages, [1, 2]); // the cover carries none; the two cards pages are 1, 2
  });
});
