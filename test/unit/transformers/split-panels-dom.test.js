/**
 * Unit tests for the split-panels transformer's applyToDom (DOM-walk path),
 * the runtime render path. Two layouts: split-panel (with the metric/quote/
 * steps/watermark variants) and split-compare. Mirrors the HTML-string kernel
 * in lib/core/split-panels.js.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const splitPanels = require('../../../lib/transformers/split-panels');

function dom(html) {
  return new JSDOM(`<!DOCTYPE html><body>${html}</body>`).window.document;
}

describe('split-panels.applyToDom — split-panel', () => {
  test('default: eyebrow span + h2 + lede go to panel-left; list to panel-right', () => {
    const doc = dom(`
      <section class="split-panel">
        <p><code>Eyebrow</code></p>
        <h2>Headline</h2>
        <p>Lede paragraph.</p>
        <ul><li>Point<ul><li>body</li></ul></li></ul>
      </section>`);
    splitPanels.applyToDom(doc);
    const sec = doc.querySelector('section.split-panel');
    const left = sec.querySelector('.panel-left');
    const right = sec.querySelector('.panel-right');
    assert.ok(left && right, 'panel-left + panel-right present');
    assert.ok(left.querySelector('.panel-eyebrow'), 'eyebrow lifted to span');
    assert.ok(left.querySelector('h2'), 'h2 in left');
    assert.ok(right.querySelector('ul > li'), 'list in right');
  });

  test('metric/steps: same panel-left/panel-right shape (variant is CSS-only)', () => {
    for (const variant of ['metric', 'steps']) {
      const doc = dom(`
        <section class="split-panel ${variant}">
          <p><code>Label</code></p>
          <h2>114</h2>
          <p>Context.</p>
          <ol><li>Item<ul><li>body</li></ul></li></ol>
        </section>`);
      splitPanels.applyToDom(doc);
      const sec = doc.querySelector('section.split-panel');
      assert.ok(sec.querySelector('.panel-left .panel-eyebrow'), `${variant}: eyebrow span`);
      assert.ok(sec.querySelector('.panel-right ol > li'), `${variant}: list in right`);
    }
  });

  test('quote: blockquote + cite go to panel-left', () => {
    const doc = dom(`
      <section class="split-panel pullquote">
        <blockquote><p>The quote.</p></blockquote>
        <p><code>Speaker</code></p>
        <ul><li>Implication<ul><li>body</li></ul></li></ul>
      </section>`);
    splitPanels.applyToDom(doc);
    const left = doc.querySelector('section.split-panel .panel-left');
    assert.ok(left.querySelector('blockquote'), 'blockquote in left');
    assert.ok(left.querySelector('cite'), 'cite in left');
    assert.ok(doc.querySelector('.panel-right ul > li'), 'implications in right');
  });

  test('watermark: watermark glyph + h2 in panel-left', () => {
    const doc = dom(`
      <section class="split-panel watermark">
        <h2>Scorecard</h2>
        <h5>Rubric</h5>
        <ul><li>Point<ul><li>body</li></ul></li></ul>
      </section>`);
    splitPanels.applyToDom(doc);
    const left = doc.querySelector('section.split-panel .panel-left');
    assert.ok(left.querySelector('.watermark'), 'watermark glyph present');
    assert.equal(left.querySelector('.watermark').textContent, 'S', 'first letter of h2');
    assert.ok(left.querySelector('h5') && left.querySelector('h2'), 'h5 + h2 in left');
  });
});

describe('split-panels.applyToDom — split-compare', () => {
  test('ul items become .option divs (second .preferred), blockquote → .verdict', () => {
    const doc = dom(`
      <section class="split-compare">
        <p><code>Decision</code></p>
        <h2>Choice</h2>
        <p>Context.</p>
        <ul><li><strong>A</strong></li><li><strong>B</strong></li></ul>
        <blockquote><p>Recommend B.</p></blockquote>
      </section>`);
    splitPanels.applyToDom(doc);
    const sec = doc.querySelector('section.split-compare');
    assert.ok(sec.querySelector('.compare-left .frame-label'), 'frame label');
    const opts = sec.querySelectorAll('.compare-right .option');
    assert.equal(opts.length, 2, 'two option divs');
    assert.ok(opts[1].classList.contains('preferred'), 'second is preferred');
    assert.ok(sec.querySelector('.compare-right .verdict'), 'verdict card');
  });
});

describe('split-panels.applyToDom — guards', () => {
  test('idempotent: a second pass is a no-op', () => {
    const doc = dom(`
      <section class="split-panel">
        <h2>H</h2>
        <ul><li>P<ul><li>b</li></ul></li></ul>
      </section>`);
    splitPanels.applyToDom(doc);
    const once = doc.querySelector('section.split-panel').innerHTML;
    splitPanels.applyToDom(doc);
    assert.equal(doc.querySelector('section.split-panel').innerHTML, once, 'second pass no-op');
  });

  test('safely returns on null / non-DOM root', () => {
    assert.doesNotThrow(() => splitPanels.applyToDom(null));
    assert.doesNotThrow(() => splitPanels.applyToDom({}));
  });

  test('non-split sections are left untouched', () => {
    const doc = dom(`<section class="cards-grid"><ul><li>x</li></ul></section>`);
    splitPanels.applyToDom(doc);
    assert.ok(!doc.querySelector('.panel-left'), 'no panel wrappers added');
  });
});
