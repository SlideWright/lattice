/**
 * Unit: the self-contained progress Tile kernel
 * (lib/forms/tile/progress/progress.transform.js).
 *
 * The progress Tile owns both render adapters in one file (issue #356), so this
 * single test exercises both and PINS the cross-path parity that previously
 * lived split across marp-plugins.test.js and form-runtime.test.js.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const progress = require('../../../lib/forms/tile/progress/progress.transform');

const sec = (cls, inner = '') => `<section class="${cls}" data-marpit-slide="x">${inner}</section>`;
const deckHtml = (sections) => sections.join('');
const doc = (html) => new JSDOM(`<!DOCTYPE html><body>${html}</body>`).window.document;
const tilesIn = (html) => [...doc(html).querySelectorAll('.tile-progress')].map((n) => n.outerHTML).sort();
const domTilesIn = (d) => [...d.querySelectorAll('.tile-progress')].map((n) => n.outerHTML).sort();

const deck = sec('divider', '<h2>The Lift</h2>') + sec('content form') +
             sec('divider', '<h2>The Bay</h2>') + sec('content form no-progress') +
             sec('content form');

describe('progress Tile — applyToHtml (HTML-string path)', () => {
  test('injects a dot-rail into form slides within a section', () => {
    const html = deckHtml([
      sec('divider', '<h2>One</h2>'),
      sec('content form'),
      sec('divider', '<h2>Two</h2>'),
      sec('content form'),
    ]);
    const out = progress.applyToHtml(html);
    assert.equal((out.match(/class="tile-progress"/g) || []).length, 2);
  });

  test('marks rail-bearing sections has-progress (footer Cell yields the centre zone)', () => {
    const html = deckHtml([sec('divider', '<h2>S</h2>'), sec('content form')]);
    const out = progress.applyToHtml(html);
    assert.match(out, /class="content form has-progress"/);
  });

  test('rail label prefers the divider eyebrow over its heading', () => {
    const html = deckHtml([
      sec('divider', '<p><code>Section 01</code></p><h2>A long editorial heading</h2>'),
      sec('content form'),
    ]);
    const seg = progress.applyToHtml(html).match(/<span class="seg">([^<]*)<\/span>/);
    assert.equal(seg[1], 'Section 01');
  });

  test('no dividers → no-op (nothing to orient against)', () => {
    const html = deckHtml([sec('content form')]);
    assert.equal(progress.applyToHtml(html), html);
  });

  test('divider slides and non-form slides get no rail', () => {
    const html = deckHtml([sec('divider', '<h2>S</h2>'), sec('content')]);
    assert.ok(!/tile-progress/.test(progress.applyToHtml(html)));
  });

  test('`no-progress` and `silent` suppress the rail', () => {
    const html = deckHtml([
      sec('divider', '<h2>S</h2>'),
      sec('content form no-progress'),
      sec('content form silent'),
    ]);
    assert.ok(!/tile-progress/.test(progress.applyToHtml(html)));
  });

  test('idempotent', () => {
    const html = deckHtml([sec('divider', '<h2>S</h2>'), sec('content form')]);
    const once = progress.applyToHtml(html);
    assert.equal(progress.applyToHtml(once), once);
  });
});

describe('progress Tile — applyToDom (live-DOM path)', () => {
  test('one rail per eligible form slide; dots + .on + label correct', () => {
    const d = doc(deck);
    progress.applyToDom(d);
    const rails = [...d.querySelectorAll('.tile-progress')];
    assert.equal(rails.length, 2, 'skips the no-progress slide');
    assert.equal(rails[0].querySelector('.seg').textContent, 'The Lift');
    assert.deepEqual([...rails[0].querySelectorAll('.dot')].map((x) => x.className), ['dot on', 'dot']);
    assert.deepEqual([...rails[1].querySelectorAll('.dot')].map((x) => x.className), ['dot', 'dot on']);
  });

  test('no dividers → no-op; idempotent', () => {
    const d = doc(sec('content form'));
    progress.applyToDom(d);
    assert.equal(d.querySelector('.tile-progress'), null);
    const d2 = doc(deck);
    progress.applyToDom(d2);
    progress.applyToDom(d2);
    assert.equal(d2.querySelectorAll('.tile-progress').length, 2);
  });

  test('null document → no throw', () => {
    assert.doesNotThrow(() => progress.applyToDom(null));
  });
});

describe('progress Tile — cross-path parity', () => {
  test('applyToDom and applyToHtml inject byte-identical Tile markup', () => {
    const d = doc(deck);
    progress.applyToDom(d);
    assert.deepEqual(domTilesIn(d), tilesIn(progress.applyToHtml(deck)));
  });
});
