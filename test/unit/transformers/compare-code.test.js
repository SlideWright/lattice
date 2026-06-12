/**
 * Unit tests for the compare-code transform (kernel +
 * lib/transformers/compare-code.js adapter). Each `<p><code>label</code></p>` +
 * `<pre>` after the heading becomes a `.code-col` inside `.code-cols`; the
 * eyebrow code-paragraph and the heading are preserved before it.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const kernel = require('../../../lib/components/code/compare-code/compare-code.transform');
const adapter = require('../../../lib/transformers/compare-code');

const EYE = '<p><code>eyebrow</code></p>';
const H2 = '<h2>Heading</h2>';
const colA = '<p><code>Before</code></p><pre>a</pre>';
const colB = '<p><code>After</code></p><pre>b</pre>';
const sec = (cls, inner) => `<section class="${cls}">${inner}</section>`;

describe('compare-code — transformCompareCodeSection', () => {
  test('pairs each p>code+pre into a code-col, keeping eyebrow + heading', () => {
    const out = kernel.transformCompareCodeSection(`${EYE}${H2}${colA}${colB}`, 'compare-code');
    assert.equal(
      out,
      `${EYE}${H2}<div class="code-cols"><div class="code-col">${colA}</div><div class="code-col">${colB}</div></div>`,
    );
  });

  test('preserves a leading header and trailing footer (full-section path)', () => {
    const out = kernel.transformCompareCodeSection(`<header>H</header>${EYE}${H2}${colA}${colB}<footer>F</footer>`, 'compare-code');
    assert.match(out, /^<header>H<\/header>/);
    assert.match(out, /<footer>F<\/footer>$/);
    assert.match(out, /class="code-cols"/);
    assert.equal((out.match(/class="code-col"/g) || []).length, 2);
  });

  test('skips non-compare-code sections and is idempotent', () => {
    const body = `${H2}${colA}${colB}`;
    assert.equal(kernel.transformCompareCodeSection(body, 'code'), body);
    const once = kernel.transformCompareCodeSection(body, 'compare-code');
    assert.equal(kernel.transformCompareCodeSection(once, 'compare-code'), once);
  });
});

describe('compare-code — applyToHtml (marp-cli) walks sections', () => {
  test('only the compare-code section is rewritten', () => {
    const out = kernel.applyToRenderedHtml(sec('compare-code', `${H2}${colA}${colB}`) + sec('content', `${H2}<p>x</p>`));
    assert.equal((out.match(/class="code-cols"/g) || []).length, 1);
  });
});

describe('compare-code — applyToDom (runtime)', () => {
  test('groups the column paragraphs+pres into code-cols after the heading', () => {
    const doc = new JSDOM(
      `<!DOCTYPE html><body>${sec('compare-code', `${EYE}${H2}${colA}${colB}`)}</body>`,
    ).window.document;
    adapter.applyToDom(doc);
    const cols = doc.querySelector('section.compare-code > .code-cols');
    assert.ok(cols);
    assert.equal(cols.querySelectorAll('.code-col').length, 2);
    assert.equal(cols.querySelector('.code-col code').textContent, 'Before');
    // eyebrow + heading stay outside the grid
    assert.ok(doc.querySelector('section.compare-code > h2'));
  });
});
