/**
 * Unit: lib/exemplars/tier-filter.js — the DRY length-variant filter that turns
 * one authored exemplar deck into short / standard / full. Verifies the tier
 * containment (short ⊂ standard ⊂ full), frontmatter preservation, marker
 * stripping, and the count metadata the island ships.
 *
 * Design: engineering/decisions/2026-06-14-worked-exemplar-decks.md.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  filterToTier,
  tierCounts,
  splitDeck,
  slideTier,
  TIERS,
  DEFAULT_TIER,
} = require('../../../lib/exemplars/tier-filter.js');

const DECK = [
  '---',
  'marp: true',
  'theme: indaco',
  '---',
  '',
  '<!-- _class: title silent -->',
  '<!-- tier: short -->',
  '',
  '# A deck',
  '',
  '---',
  '',
  '<!-- _class: kpi -->',
  '<!-- tier: short -->',
  '',
  '## The headline number.',
  '',
  '---',
  '',
  '<!-- _class: stats -->',
  '<!-- tier: standard -->',
  '',
  '## Some supporting evidence.',
  '',
  '---',
  '',
  '<!-- _class: matrix-2x2 -->',
  '<!-- tier: full -->',
  '',
  '## The deep-dive backup slide.',
  '',
  '---',
  '',
  '<!-- _class: closing -->',
  '<!-- tier: short -->',
  '',
  '## Thank you.',
].join('\n');

describe('exemplar tier-filter', () => {
  test('splitDeck separates frontmatter from slides', () => {
    const { frontmatter, slides } = splitDeck(DECK);
    assert.match(frontmatter, /^---\nmarp: true/);
    assert.match(frontmatter, /---$/);
    assert.equal(slides.length, 5);
  });

  test('splitDeck handles a deck with no frontmatter', () => {
    const { frontmatter, slides } = splitDeck('<!-- _class: a -->\n\n---\n\n<!-- _class: b -->');
    assert.equal(frontmatter, '');
    assert.equal(slides.length, 2);
  });

  test('slideTier reads the marker, defaults to standard', () => {
    assert.equal(slideTier('<!-- tier: full -->\n## x'), 'full');
    assert.equal(slideTier('## no marker'), DEFAULT_TIER);
  });

  test('short keeps only short-tier slides', () => {
    const out = filterToTier(DECK, 'short');
    const { slides } = splitDeck(out);
    assert.equal(slides.length, 3); // title, kpi, closing
    assert.doesNotMatch(out, /matrix-2x2/);
    assert.doesNotMatch(out, /supporting evidence/);
  });

  test('standard adds standard slides, drops full-only', () => {
    const out = filterToTier(DECK, 'standard');
    const { slides } = splitDeck(out);
    assert.equal(slides.length, 4);
    assert.match(out, /supporting evidence/);
    assert.doesNotMatch(out, /deep-dive backup/);
  });

  test('full keeps every slide', () => {
    const { slides } = splitDeck(filterToTier(DECK, 'full'));
    assert.equal(slides.length, 5);
  });

  test('tiers are nested: short ⊂ standard ⊂ full', () => {
    const counts = TIERS.map((t) => splitDeck(filterToTier(DECK, t)).slides.length);
    assert.deepEqual(counts, [3, 4, 5]);
    assert.ok(counts[0] <= counts[1] && counts[1] <= counts[2]);
  });

  test('the tier marker is stripped from emitted slides', () => {
    const out = filterToTier(DECK, 'full');
    assert.doesNotMatch(out, /tier:/);
  });

  test('frontmatter is preserved verbatim', () => {
    const out = filterToTier(DECK, 'standard');
    assert.match(out, /^---\nmarp: true\ntheme: indaco\n---/);
  });

  test('an unknown tier falls back to standard', () => {
    assert.equal(filterToTier(DECK, 'bogus'), filterToTier(DECK, 'standard'));
  });

  test('an untagged slide defaults into standard (not short)', () => {
    const deck = '<!-- _class: a -->\n\n## no tag here';
    assert.equal(splitDeck(filterToTier(deck, 'short')).slides.length, 0);
    assert.equal(splitDeck(filterToTier(deck, 'standard')).slides.length, 1);
  });

  test('tierCounts reports cumulative slide counts', () => {
    assert.deepEqual(tierCounts(DECK), { short: 3, standard: 4, full: 5 });
  });
});
