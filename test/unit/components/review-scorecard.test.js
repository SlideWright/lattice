/**
 * Unit: lib/authoring/review-core.js (presentation review heuristics) and
 * lib/authoring/scorecard.js (deterministic deck scorecard). Both are pure,
 * browser-safe modules the Drawing Board's Architect panel runs client-side.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { reviewText, isLabelHeading } = require('../../../lib/authoring/review-core');
const { scoreDeck } = require('../../../lib/authoring/scorecard');

const FM = '---\nmarp: true\ntheme: indaco\n---\n\n';
const bucketOf = (n) => ({ kpi: 'evidence', stats: 'evidence', radar: 'chart', piechart: 'chart', gantt: 'chart' }[n] || 'statement');
const ruleOf = (findings, rule) => findings.find((f) => f.rule === rule);

describe('review-core: isLabelHeading', () => {
  test('flags bare label words + single words; spares takeaways with verbs/numbers', () => {
    assert.equal(isLabelHeading('Results'), true);
    assert.equal(isLabelHeading('Overview'), true);
    assert.equal(isLabelHeading('Roadmap'), true);
    assert.equal(isLabelHeading('Strategy'), true); // single word
    assert.equal(isLabelHeading('Revenue grew 18% last quarter'), false); // number → takeaway
    assert.equal(isLabelHeading('What ships in each phase'), false); // multi-word, not a label phrase
    assert.equal(isLabelHeading('We should ship APAC first'), false);
  });
});

describe('review-core: reviewText', () => {
  test('flags a label title on a content slide', () => {
    const f = reviewText(`${FM}<!-- _class: content -->\n\n## Results\n\nbody\n`, { bucketOf });
    assert.ok(ruleOf(f, 'label-title'));
  });

  test('does NOT flag a declarative takeaway title', () => {
    const f = reviewText(`${FM}<!-- _class: content -->\n\n## Revenue grew 18%, led by APAC\n\nbody\n`, { bucketOf });
    assert.equal(ruleOf(f, 'label-title'), undefined);
  });

  test('flags a data slide with no takeaway headline', () => {
    const f = reviewText(`${FM}<!-- _class: kpi -->\n\n## Metrics\n\n1. 18%\n`, { bucketOf });
    assert.ok(ruleOf(f, 'chart-no-takeaway'));
  });

  test('flags wall-of-text', () => {
    const big = `${FM}<!-- _class: content -->\n\n## A real takeaway here\n\n${'word '.repeat(90)}\n`;
    assert.ok(ruleOf(reviewText(big, { bucketOf }), 'wall-of-text'));
  });

  test('flags no-ask on a non-trivial deck without a decision/recommendation', () => {
    const deck = `${FM}<!-- _class: content -->\n\n## Point one matters\n\nx\n\n---\n\n<!-- _class: content -->\n\n## Point two also\n\nx\n\n---\n\n<!-- _class: content -->\n\n## Point three here\n\nx\n\n---\n\n<!-- _class: content -->\n\n## Point four too\n\nx\n`;
    assert.ok(ruleOf(reviewText(deck, { bucketOf }), 'no-ask'));
  });

  test('no-ask is silent when a decision slide is present', () => {
    const deck = `${FM}<!-- _class: content -->\n\n## A\n\nx\n\n---\n\n<!-- _class: content -->\n\n## B\n\nx\n\n---\n\n<!-- _class: content -->\n\n## C\n\nx\n\n---\n\n<!-- _class: decision -->\n\n## We recommend X\n\nx\n`;
    assert.equal(ruleOf(reviewText(deck, { bucketOf }), 'no-ask'), undefined);
  });

  test('length-vs-time fires only with a talk length set', () => {
    const deck = `${FM}<!-- _class: content -->\n\n## A B C\n\nx\n\n---\n\n<!-- _class: content -->\n\n## D E F\n\nx\n`;
    assert.equal(ruleOf(reviewText(deck, { bucketOf }), 'length-vs-time'), undefined);
    assert.ok(ruleOf(reviewText(deck, { bucketOf, talkMinutes: 1 }), 'length-vs-time'));
  });
});

describe('scorecard: scoreDeck', () => {
  const clean = `${FM}<!-- _class: title silent -->\n\n# Q3 board review\n\nthe ask\n\n---\n\n<!-- _class: kpi -->\n\n## Revenue grew 18%, led by APAC\n\n1. 18%\n   - growth\n\n---\n\n<!-- _class: decision -->\n\n## We recommend funding APAC\n\n- option\n  - body\n\n---\n\n<!-- _class: closing -->\n\n## Fund APAC\n`;

  test('returns overall + band + five categories', () => {
    const card = scoreDeck({ source: clean, lintFindings: [], reviewFindings: reviewText(clean, { bucketOf }) });
    assert.equal(typeof card.overall, 'number');
    assert.ok(['A', 'A−', 'B+', 'B', 'C+', 'C', 'D', 'F'].includes(card.band));
    assert.equal(card.categories.length, 5);
    assert.deepEqual(card.categories.map((c) => c.key), ['structure', 'clarity', 'data', 'pacing', 'contract']);
  });

  test('a clean deck scores high', () => {
    const card = scoreDeck({ source: clean, lintFindings: [], reviewFindings: reviewText(clean, { bucketOf }) });
    assert.ok(card.overall >= 85, `expected >=85, got ${card.overall}`);
  });

  test('authoring errors tank the Contract score', () => {
    const lint = [{ rule: 'card-style-inline-title', severity: 'error' }, { rule: 'split-bodyless-item', severity: 'error' }];
    const card = scoreDeck({ source: clean, lintFindings: lint, reviewFindings: [] });
    assert.ok(card.categories.find((c) => c.key === 'contract').score <= 60);
  });

  test('a missing title drops Structure', () => {
    const noTitle = `${FM}<!-- _class: content -->\n\n## A takeaway\n\nx\n`;
    const card = scoreDeck({ source: noTitle, lintFindings: [], reviewFindings: [] });
    assert.ok(card.categories.find((c) => c.key === 'structure').score < 100);
  });

  test('label titles drop Clarity', () => {
    const labels = `${FM}<!-- _class: title silent -->\n\n# T\n\n---\n\n<!-- _class: content -->\n\n## Overview\n\nx\n`;
    const card = scoreDeck({ source: labels, lintFindings: [], reviewFindings: reviewText(labels, { bucketOf }) });
    assert.ok(card.categories.find((c) => c.key === 'clarity').score < 100);
  });
});
