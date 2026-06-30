// §11 — THE prototype risk: the string render path (engine → PDF/PPTX) and the
// DOM render path (runtime) MUST agree on the hard re-parenting op (extract +
// wrap + a capability). Because `applyRulesToHtml` parses the matched section
// into a jsdom fragment and calls the SAME `applyRulesToDom` the runtime uses,
// parity should hold by construction — this test is the evidence.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const { applyRulesToDom } = require('../../../lib/core/transform-dsl/interpret');
const { applyRulesToHtml } = require('../../../lib/core/transform-dsl/apply-to-html');
const { validateTransform } = require('../../../lib/core/transform-dsl/schema');
const { SPLIT_PANEL_RULES, SAMPLE_HTML, COMPONENT } = require('./split-panel-rules');

const RULES = validateTransform(SPLIT_PANEL_RULES).rules;

// Canonical structural signature of a section: tag + classes + leaf text, depth-
// first. Two DOMs with the same signature are structurally identical regardless
// of attribute order / whitespace, which is the right notion of "parity".
function signature(node) {
  if (node.nodeType === 3) { const t = node.textContent.trim(); return t ? `#${t}` : ''; }
  if (node.nodeType !== 1) return '';
  const cls = node.className ? `.${[...node.classList].sort().join('.')}` : '';
  const kids = [...node.childNodes].map(signature).filter(Boolean).join(',');
  return `${node.tagName}${cls}(${kids})`;
}
function sigOf(html) {
  return signature(new JSDOM(html).window.document.querySelector('section'));
}

describe('transform-dsl — cross-path parity (§11)', () => {
  test('string path and DOM path produce the structurally identical section', () => {
    const stringOut = applyRulesToHtml(SAMPLE_HTML, RULES, { component: COMPONENT });

    const section = new JSDOM(SAMPLE_HTML).window.document.querySelector('section');
    applyRulesToDom(section, RULES, { component: COMPONENT });
    const domOut = section.outerHTML;

    assert.equal(sigOf(stringOut), sigOf(domOut), `\nstring: ${sigOf(stringOut)}\ndom:    ${sigOf(domOut)}`);
  });

  test('the agreed structure is the expected panel-left / panel-right shape', () => {
    const sig = sigOf(applyRulesToHtml(SAMPLE_HTML, RULES, { component: COMPONENT }));
    assert.match(sig, /SECTION\.split-panel\(DIV\.panel-left\(SPAN\.panel-eyebrow\(#Q2 board review\),H2\(.*\),P\(.*\)\),DIV\.panel-right\(UL\(/);
  });

  test('parity holds with a <header> and with multiple sections in one document', () => {
    const html =
      '<section class="split-panel"><header>h</header>' + SAMPLE_HTML.slice('<section class="split-panel">'.length) +
      '<section class="cards"><p>untouched</p></section>';
    const stringOut = applyRulesToHtml(html, RULES, { component: COMPONENT });

    const doc = new JSDOM(html).window.document;
    applyRulesToDom(doc.body, RULES, { component: COMPONENT });

    const strSplit = sigOf(stringOut.match(/<section class="split-panel"[\s\S]*?<\/section>/)[0]);
    const domSplit = signature(doc.querySelector('section.split-panel'));
    assert.equal(strSplit, domSplit);
    // the non-component section is byte-for-byte untouched on the string path.
    assert.match(stringOut, /<section class="cards"><p>untouched<\/p><\/section>/);
  });

  test('a deck with no component section is returned unchanged (fast path)', () => {
    const html = '<section class="cards"><p>x</p></section>';
    assert.equal(applyRulesToHtml(html, RULES, { component: COMPONENT }), html);
  });
});

// Regression cases from the maker-checker pass (2026-06-30): the original string
// path hand-scanned for `</section>`; a parser-based path fixes the desync/parity.
describe('transform-dsl — string-path is HTML-aware (maker-checker regressions)', () => {
  const domSig = (html) => { const s = new JSDOM(html).window.document.querySelector(`section.${COMPONENT}`); applyRulesToDom(s, RULES, { component: COMPONENT }); return signature(s); };
  const strSig = (html) => signature(new JSDOM(applyRulesToHtml(html, RULES, { component: COMPONENT })).window.document.querySelector(`section.${COMPONENT}`));

  test('CRITICAL-1: a `</section>` inside an attribute value cannot leak unsanitized HTML', () => {
    const html = '<section class="split-panel"><h2 data-x="</section><script>steal()</script>">H</h2><p>p</p><ul><li>a</li></ul></section>';
    const out = applyRulesToHtml(html, RULES, { component: COMPONENT });
    assert.equal(new JSDOM(out).window.document.querySelectorAll('script').length, 0, 'no live <script> leaked');
    assert.ok(/panel-left/.test(out) && /panel-right/.test(out), 'section was transformed via the parser');
  });

  test('HIGH-2: a component section NESTED in another section transforms identically on both paths', () => {
    const html = '<section class="outer"><section class="split-panel"><p><code>e</code></p><h2>inner</h2><p>l</p><ul><li>a</li></ul></section></section>';
    assert.equal(strSig(html), domSig(html));
    assert.ok(/panel-left/.test(applyRulesToHtml(html, RULES, { component: COMPONENT })), 'nested section transformed on the string path');
  });

  test('HIGH-3: an upper-case <SECTION> transforms identically on both paths', () => {
    const html = '<SECTION class="split-panel"><p><code>e</code></p><h2>H</h2><p>l</p><ul><li>a</li></ul></SECTION>';
    assert.equal(strSig(html), domSig(html));
  });

  test('HIGH-4: a pathologically deep section is rejected (fail-closed), not a DoS', () => {
    const deep = '<div>'.repeat(5000) + '</div>'.repeat(5000);
    const html = `<section class="split-panel">${deep}<h2>H</h2></section>`;
    assert.equal(applyRulesToHtml(html, RULES, { component: COMPONENT }), html);
  });

  test('non-component sections survive structurally; the component section transforms', () => {
    const out = applyRulesToHtml(SAMPLE_HTML + '<section class="cards"><p>untouched</p></section>', RULES, { component: COMPONENT });
    assert.equal(signature(new JSDOM(out).window.document.querySelector('section.cards')), 'SECTION.cards(P(#untouched))');
    assert.ok(/panel-left/.test(out));
  });
});
