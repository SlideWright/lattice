/**
 * Unit: lib/authoring/lint.js — the deck authoring linter.
 *
 * Covers the three rules (unknown-class, card-style-inline-title,
 * statement-ol-bold), modifier recognition, and clean-deck behaviour.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { lintText, buildVocab, isKnownModifier } = require('../../../lib/authoring/lint');

const FM = '---\nmarp: true\ntheme: indaco\n---\n\n';

describe('deck linter', () => {
  const vocab = buildVocab();

  test('flags inline "- **Title.** body" on a card-style slide (error)', () => {
    const src = `${FM}<!-- _class: cards-grid -->\n\n## H.\n\n- **First.** body on same line.\n`;
    const findings = lintText(src, { vocab });
    const f = findings.find((x) => x.rule === 'card-style-inline-title');
    assert.ok(f, JSON.stringify(findings));
    assert.equal(f.severity, 'error');
    assert.equal(f.classToken, 'cards-grid');
  });

  test('accepts the nested-list shape on a card-style slide', () => {
    const src = `${FM}<!-- _class: cards-grid -->\n\n## H.\n\n- First\n  - body text.\n`;
    assert.equal(lintText(src, { vocab }).length, 0);
  });

  test('flags **bold** inside an ordered-list statement (error)', () => {
    const src = `${FM}<!-- _class: principles -->\n\n## P.\n\n1. **Bold.** breaks the grid.\n`;
    const f = lintText(src, { vocab }).find((x) => x.rule === 'statement-ol-bold');
    assert.ok(f);
    assert.equal(f.severity, 'error');
  });

  test('flags an unknown class token (warning)', () => {
    const src = `${FM}<!-- _class: card-grid -->\n\n## Typo.\n`;
    const f = lintText(src, { vocab }).find((x) => x.rule === 'unknown-class');
    assert.ok(f);
    assert.equal(f.severity, 'warning');
    assert.equal(f.classToken, 'card-grid');
  });

  test('does not flag known components or modifiers', () => {
    const src = `${FM}<!-- _class: cards-grid dark compact -->\n\n## H.\n\n- A\n  - b\n`;
    assert.equal(lintText(src, { vocab }).length, 0);
  });

  test('does not flag decoration/position modifier fragments', () => {
    // 'tint-corner' + 'at-tl' are a multi-token universal; 'mark-orbit' a
    // decoration. None should read as an unknown class.
    const src = `${FM}<!-- _class: content tint-corner at-tl mark-orbit no-footer -->\n\n## H.\n`;
    assert.deepEqual(lintText(src, { vocab }).filter((f) => f.rule === 'unknown-class'), []);
  });

  test('front matter is not treated as a slide', () => {
    const src = `${FM}<!-- _class: content -->\n\n## H.\n`;
    assert.equal(lintText(src, { vocab }).length, 0);
  });

  test('isKnownModifier recognizes prefix families', () => {
    assert.ok(isKnownModifier('tint-spotlight', vocab));
    assert.ok(isKnownModifier('with-period', vocab));
    assert.ok(isKnownModifier('at-right', vocab));
    assert.ok(!isKnownModifier('totally-made-up', vocab));
  });

  test('reports findings across multiple slides (slide index counts the front-matter chunk)', () => {
    const src = `${FM}<!-- _class: content -->\n\n## ok.\n\n---\n\n<!-- _class: cards-grid -->\n\n- **X.** y.\n`;
    const f = lintText(src, { vocab }).find((x) => x.rule === 'card-style-inline-title');
    // chunk 0 = pre-front-matter, 1 = front matter, 2 = first slide, 3 = second.
    assert.equal(f.slide, 3);
  });
});
