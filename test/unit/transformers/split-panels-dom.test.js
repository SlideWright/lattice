/**
 * Unit tests for the split-panels transformer's applyToDom (DOM-walk path).
 *
 * applyToDom runs in the browser (lattice-runtime.js bundle), invoked from
 * lib/runtime/index.js's content-transform loop. These tests use jsdom to
 * exercise the same code path without a real browser. The HTML-string
 * kernel is covered separately in registry.test.js.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const splitPanels = require('../../../lib/transformers/split-panels');

function makeDoc(bodyHtml) {
  const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`);
  return dom.window.document;
}

describe('split-panels.applyToDom — per-layout', () => {
  test('split-brief: wraps into brief-left / brief-right', () => {
    const doc = makeDoc(`
      <section class="split-brief">
        <p><code>EYEBROW</code></p>
        <h2>Title</h2>
        <p>Intro paragraph.</p>
        <ul><li><strong>title</strong><ul><li>body</li></ul></li></ul>
      </section>
    `);
    splitPanels.applyToDom(doc);
    const sec = doc.querySelector('section.split-brief');
    const left = sec.querySelector('.brief-left');
    const right = sec.querySelector('.brief-right');
    assert.ok(left, 'brief-left created');
    assert.ok(right, 'brief-right created');
    assert.equal(left.querySelector('.eyebrow').textContent, 'EYEBROW');
    assert.equal(left.querySelector('h2').textContent, 'Title');
    assert.ok(right.querySelector('ul'), 'list moved into brief-right');
  });

  test('split-metric: code-p → unit-label; intro-p → metric-context span (not p)', () => {
    const doc = makeDoc(`
      <section class="split-metric">
        <p><code>%</code></p>
        <h2>42</h2>
        <p>of teams report cycle wins.</p>
        <ul><li>row</li></ul>
      </section>
    `);
    splitPanels.applyToDom(doc);
    const left = doc.querySelector('.metric-left');
    assert.equal(left.querySelector('.unit-label').textContent, '%');
    assert.equal(left.querySelector('h2').textContent, '42');
    const ctx = left.querySelector('.metric-context');
    assert.ok(ctx, 'metric-context span created');
    assert.equal(ctx.tagName, 'SPAN');
    assert.match(ctx.textContent, /cycle wins/);
    // Intro p must be unwrapped (moved into the span as inner HTML), not duplicated.
    assert.equal(doc.querySelectorAll('section.split-metric > p').length, 0,
      'intro-p removed from section after lift');
  });

  test('split-steps: phase-num eyebrow + h2 + intro', () => {
    const doc = makeDoc(`
      <section class="split-steps">
        <p><code>01</code></p>
        <h2>Discovery</h2>
        <p>Goal-framing interviews and constraint mapping.</p>
        <ol><li>workstream</li></ol>
      </section>
    `);
    splitPanels.applyToDom(doc);
    const left = doc.querySelector('.steps-left');
    assert.equal(left.querySelector('.phase-num').textContent, '01');
    assert.equal(left.querySelector('h2').textContent, 'Discovery');
    assert.match(doc.querySelector('.steps-right ol li').textContent, /workstream/);
  });

  test('split-compare: ul items become .option divs, second is .preferred, blockquote → .verdict', () => {
    const doc = makeDoc(`
      <section class="split-compare">
        <p><code>FRAME</code></p>
        <h2>Build or buy?</h2>
        <p>Two paths, one decision.</p>
        <ul>
          <li><strong>Build</strong> in-house</li>
          <li><strong>Buy</strong> from vendor</li>
        </ul>
        <blockquote>Verdict: buy.</blockquote>
      </section>
    `);
    splitPanels.applyToDom(doc);
    const opts = doc.querySelectorAll('.compare-right .options .option');
    assert.equal(opts.length, 2, 'two .option divs');
    assert.ok(!opts[0].classList.contains('preferred'), 'first option not preferred');
    assert.ok(opts[1].classList.contains('preferred'), 'second option is preferred');
    const verdict = doc.querySelector('.compare-right .verdict');
    assert.ok(verdict, '.verdict wrapper present');
    assert.match(verdict.textContent, /buy\./);
  });

  test('split-statement: blockquote + cite go to statement-left; rest to statement-right', () => {
    const doc = makeDoc(`
      <section class="split-statement">
        <blockquote>The plan is the plan.</blockquote>
        <p><code>— Internal memo, 2025</code></p>
        <ul><li>follow-up</li></ul>
      </section>
    `);
    splitPanels.applyToDom(doc);
    const left = doc.querySelector('.statement-left');
    assert.ok(left.querySelector('blockquote'), 'blockquote in statement-left');
    assert.equal(left.querySelector('cite').textContent, '— Internal memo, 2025');
    assert.ok(doc.querySelector('.statement-right ul li'), 'list moved to statement-right');
  });

  test('split-list: closes the legacy drift — adds panel-left / panel-right + watermark', () => {
    const doc = makeDoc(`
      <section class="split-list">
        <h5>Section heading</h5>
        <p><code>Section 02</code></p>
        <h2>Listing topic</h2>
        <ul><li>first</li><li>second</li></ul>
      </section>
    `);
    splitPanels.applyToDom(doc);
    const left = doc.querySelector('.panel-left');
    const right = doc.querySelector('.panel-right');
    assert.ok(left, 'panel-left created (regression: the legacy runtime omitted this layout)');
    assert.ok(right, 'panel-right created');
    assert.equal(left.querySelector('.watermark').textContent, 'L',
      'watermark = first character of h2 text');
    assert.ok(left.querySelector('h5'), 'h5 in panel-left');
    assert.ok(left.querySelector('h2'), 'h2 in panel-left');
    assert.ok(right.querySelector('ul'), 'list in panel-right');
  });
});

describe('split-panels.applyToDom — guards', () => {
  test('idempotent: a second pass is a no-op', () => {
    const doc = makeDoc(`
      <section class="split-brief">
        <p><code>X</code></p><h2>T</h2><p>intro.</p>
        <ul><li>a</li></ul>
      </section>
    `);
    splitPanels.applyToDom(doc);
    const afterOnce = doc.querySelector('section.split-brief').innerHTML;
    splitPanels.applyToDom(doc);
    const afterTwice = doc.querySelector('section.split-brief').innerHTML;
    assert.equal(afterTwice, afterOnce, 'second applyToDom pass should not mutate');
  });

  test('safely returns on null / non-DOM root', () => {
    assert.doesNotThrow(() => splitPanels.applyToDom(null));
    assert.doesNotThrow(() => splitPanels.applyToDom(undefined));
    assert.doesNotThrow(() => splitPanels.applyToDom({}));
  });

  test('non-split sections are left untouched', () => {
    const doc = makeDoc(`
      <section class="content"><h2>plain</h2><p>nothing.</p></section>
    `);
    const before = doc.querySelector('section.content').outerHTML;
    splitPanels.applyToDom(doc);
    const after = doc.querySelector('section.content').outerHTML;
    assert.equal(after, before);
  });

  test('scoped to root: descendants inside root are transformed, outside untouched', () => {
    const doc = makeDoc(`
      <div id="scope">
        <section class="split-brief" id="a">
          <p><code>E</code></p><h2>A</h2><p>a.</p><ul><li>x</li></ul>
        </section>
      </div>
      <section class="split-brief" id="b">
        <p><code>E</code></p><h2>B</h2><p>b.</p><ul><li>y</li></ul>
      </section>
    `);
    splitPanels.applyToDom(doc.getElementById('scope'));
    assert.ok(doc.querySelector('#a .brief-left'), 'a (inside scope) was transformed');
    assert.equal(doc.querySelector('#b .brief-left'), null, 'b (outside scope) was NOT transformed');
  });
});
