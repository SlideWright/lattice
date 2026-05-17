/**
 * Unit tests for the word-cloud transformer's applyToDom (DOM-walk path).
 *
 * applyToDom delegates to engine.transformWordCloudSection — same
 * kernel marp.config.js and lattice-emulator.js use. These tests
 * verify the delegation produces a .word-cloud-canvas with the
 * expected weighted wc-word spans and is idempotent.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const wordCloud = require('../../../lib/transformers/word-cloud');

function makeDoc(bodyHtml) {
  const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`);
  return dom.window.document;
}

describe('word-cloud.applyToDom', () => {
  test('rewrites a word-cloud section\'s <ul> into .word-cloud-canvas', () => {
    const doc = makeDoc(`
      <section class="word-cloud">
        <h2>Words by weight</h2>
        <ul>
          <li>component <code>5</code></li>
          <li>manifest <code>4</code></li>
          <li>function <code>3</code></li>
        </ul>
      </section>
    `);
    wordCloud.applyToDom(doc);
    const canvas = doc.querySelector('section.word-cloud > .word-cloud-canvas');
    assert.ok(canvas, 'word-cloud-canvas wrapper present');
    const words = canvas.querySelectorAll('.wc-word');
    assert.equal(words.length, 3, 'three wc-word spans');
    for (const w of words) {
      const style = w.getAttribute('style') || '';
      assert.ok(style.includes('--wc-x:'),     `${w.textContent}: --wc-x set`);
      assert.ok(style.includes('--wc-color:'), `${w.textContent}: --wc-color set`);
    }
  });

  test('passes through non-word-cloud sections', () => {
    const doc = makeDoc(`
      <section class="content"><h2>plain</h2><p>nothing.</p></section>
    `);
    const before = doc.querySelector('section.content').outerHTML;
    wordCloud.applyToDom(doc);
    const after = doc.querySelector('section.content').outerHTML;
    assert.equal(after, before);
  });

  test('idempotent: a second pass is a no-op', () => {
    const doc = makeDoc(`
      <section class="word-cloud">
        <h2>Test</h2>
        <ul>
          <li>alpha <code>4</code></li>
          <li>beta  <code>2</code></li>
        </ul>
      </section>
    `);
    wordCloud.applyToDom(doc);
    const once = doc.querySelector('section.word-cloud').innerHTML;
    wordCloud.applyToDom(doc);
    const twice = doc.querySelector('section.word-cloud').innerHTML;
    assert.equal(twice, once);
  });

  test('respects variant modifier classes (compact / accent)', () => {
    const doc = makeDoc(`
      <section class="word-cloud accent">
        <h2>Accent</h2>
        <ul><li>focus <code>5</code></li><li>tier2 <code>3</code></li></ul>
      </section>
    `);
    wordCloud.applyToDom(doc);
    assert.ok(doc.querySelector('section.word-cloud.accent > .word-cloud-canvas'),
      'accent variant still produces canvas wrapper');
  });

  test('safely returns on null / non-DOM root', () => {
    assert.doesNotThrow(() => wordCloud.applyToDom(null));
    assert.doesNotThrow(() => wordCloud.applyToDom(undefined));
    assert.doesNotThrow(() => wordCloud.applyToDom({}));
  });
});
