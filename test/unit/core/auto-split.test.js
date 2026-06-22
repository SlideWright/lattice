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
const { autoSplitDeck, capacityForClass } = require('../../../lib/core/auto-split');

const sec = (cls, inner) => `<section class="${cls}">${inner}</section>`;
const list = (n) => `<ul>${Array.from({ length: n }, (_, i) => `<li>item ${i + 1}</li>`).join('')}</ul>`;
const cap = { cards: { axis: 'item', hard: 4 }, redline: { axis: 'col', hard: 2 } };

describe('core: autoSplitDeck', () => {
  test('splits an over-capacity slide into ceil(n/hard) slides, heading repeated', () => {
    const html = sec('cards', `<h2>T</h2>${list(9)}`); // 9 items, hard 4 → 3 slides
    const { html: out, splits } = autoSplitDeck(html, cap);
    assert.equal(splits, 1);
    assert.equal((out.match(/<section/g) || []).length, 3);
    assert.equal((out.match(/<h2>T<\/h2>/g) || []).length, 3); // heading on every slide
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
