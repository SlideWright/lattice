/**
 * Unit tests for the Form runtime DOM injectors (lib/runtime/form-dom.js)
 * — the browser/preview render path for the meta / progress / watermark
 * Tiles. Two jobs:
 *   1. assert each injector's structure + idempotence on a JSDOM document, and
 *   2. PIN cross-renderer parity: run the DOM injector and the HTML-string
 *      kernel (the marp-cli + emulator path) on the same deck and assert the
 *      injected Tile markup is byte-identical. This is what keeps the third
 *      render path from drifting from the other two.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const dom = require('../../../lib/runtime/form-dom');
const { plugins } = require('../../../marp.config');

// A Marp-shaped section. The injectors scope to [data-marpit-slide].
const sec = (cls, inner = '') => `<section class="${cls}" data-marpit-slide="x">${inner}</section>`;
const doc = (html) => new JSDOM(`<!DOCTYPE html><body>${html}</body>`).window.document;
// Normalised set of injected Tile markup, order-independent.
const tilesIn = (html, sel) =>
  [...doc(html).querySelectorAll(sel)].map((n) => n.outerHTML).sort();
const domTilesIn = (document, sel) =>
  [...document.querySelectorAll(sel)].map((n) => n.outerHTML).sort();

describe('form-dom — injectMastheadMeta', () => {
  const bay = (cls = 'content form') =>
    sec(cls, '<div class="cell-masthead"><div class="masthead-lede"><h2>T</h2></div><div class="masthead-bay"></div></div>');

  test('fills the empty bay; `|` → stacked lines; escapes HTML', () => {
    const d = doc(bay());
    dom.injectMastheadMeta(d, 'Q2 <b> | Owner & Co');
    const meta = d.querySelector('.masthead-bay > .tile-meta');
    assert.ok(meta, 'meta Tile injected');
    assert.equal(meta.innerHTML, 'Q2 &lt;b&gt;<br>Owner &amp; Co');
  });

  test('no-op without a value, and idempotent', () => {
    const d = doc(bay());
    dom.injectMastheadMeta(d, '');
    assert.equal(d.querySelector('.tile-meta'), null);
    dom.injectMastheadMeta(d, 'X');
    dom.injectMastheadMeta(d, 'X');
    assert.equal(d.querySelectorAll('.tile-meta').length, 1);
  });

  test('parity: DOM output === HTML-string kernel output', () => {
    const meta = 'Q2 FY26 · Board | Owner';
    const d = doc(bay());
    dom.injectMastheadMeta(d, meta);
    const kernelHtml = plugins.applyMastheadMetaToHtml(bay(), `---\nmeta: "${meta}"\n---\n`);
    assert.deepEqual(domTilesIn(d, '.tile-meta'), tilesIn(kernelHtml, '.tile-meta'));
  });
});

describe('form-dom — injectProgressRail', () => {
  const deck = sec('divider', '<h2>The Lift</h2>') + sec('content form') +
               sec('divider', '<h2>The Bay</h2>') + sec('content form no-progress') +
               sec('content form');

  test('one rail per eligible form slide; dots + .on + label correct', () => {
    const d = doc(deck);
    dom.injectProgressRail(d);
    const rails = [...d.querySelectorAll('.tile-progress')];
    assert.equal(rails.length, 2, 'skips the no-progress slide');
    assert.equal(rails[0].querySelector('.seg').textContent, 'The Lift');
    assert.deepEqual([...rails[0].querySelectorAll('.dot')].map((x) => x.className), ['dot on', 'dot']);
    assert.deepEqual([...rails[1].querySelectorAll('.dot')].map((x) => x.className), ['dot', 'dot on']);
  });

  test('no dividers → no-op; idempotent', () => {
    const d = doc(sec('content form'));
    dom.injectProgressRail(d);
    assert.equal(d.querySelector('.tile-progress'), null);
    const d2 = doc(deck);
    dom.injectProgressRail(d2);
    dom.injectProgressRail(d2);
    assert.equal(d2.querySelectorAll('.tile-progress').length, 2);
  });

  test('parity: DOM output === HTML-string kernel output', () => {
    const d = doc(deck);
    dom.injectProgressRail(d);
    assert.deepEqual(
      domTilesIn(d, '.tile-progress'),
      tilesIn(plugins.applyProgressRailToHtml(deck), '.tile-progress'),
    );
  });
});

describe('form-dom — injectWatermark', () => {
  const deck = sec('divider', '<h2>One</h2>') + sec('content form watermark') +
               sec('divider', '<h2>Two</h2>') + sec('content form watermark') +
               sec('content form'); // no watermark token → skipped

  test('2-digit section number on form+watermark slides only', () => {
    const d = doc(deck);
    dom.injectWatermark(d);
    assert.deepEqual([...d.querySelectorAll('.tile-watermark')].map((n) => n.textContent), ['01', '02']);
  });

  test('no dividers → no-op; idempotent', () => {
    const d = doc(sec('content form watermark'));
    dom.injectWatermark(d);
    assert.equal(d.querySelector('.tile-watermark'), null);
    const d2 = doc(deck);
    dom.injectWatermark(d2);
    dom.injectWatermark(d2);
    assert.equal(d2.querySelectorAll('.tile-watermark').length, 2);
  });

  test('parity: DOM output === HTML-string kernel output', () => {
    const d = doc(deck);
    dom.injectWatermark(d);
    assert.deepEqual(
      domTilesIn(d, '.tile-watermark'),
      tilesIn(plugins.applyWatermarkToHtml(deck), '.tile-watermark'),
    );
  });
});
