/**
 * Unit tests for the featured transform (kernel +
 * lib/transformers/featured.js adapter). The `featured` layout's top-level list
 * becomes the feat-layout grid: first item → .feat-card, rest → .sub-row > .sub-card.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const kernel = require('../../../lib/components/imagery/featured/featured.transform');
const adapter = require('../../../lib/transformers/featured');

const sec = (cls, inner) => `<section class="${cls}">${inner}</section>`;
const li = (title, body) => `<li><strong>${title}</strong><ul><li>${body}</li></ul></li>`;

describe('featured — transformFeaturedSection', () => {
  test('first item is the feat-card, the rest are sub-cards in a sub-row', () => {
    const out = kernel.transformFeaturedSection(
      `<h2>H</h2><ul>${li('Hero', 'hero body')}${li('Two', 'two body')}${li('Three', 'three body')}</ul>`,
      'featured',
    );
    assert.match(out, /<div class="feat-layout"><div class="feat-card"><strong>Hero<\/strong><p>hero body<\/p><\/div><div class="sub-row"><div class="sub-card"><strong>Two<\/strong><p>two body<\/p><\/div><div class="sub-card"><strong>Three<\/strong><p>three body<\/p><\/div><\/div><\/div>/);
    assert.match(out, /^<h2>H<\/h2>/); // heading preserved before the grid
  });

  test('extractCard handles a bold title with no nested body', () => {
    assert.deepEqual(kernel.extractCard('<strong>Title</strong> trailing'), { title: 'Title', body: 'trailing' });
  });

  test('skips non-featured sections and is idempotent', () => {
    const plain = `<ul>${li('A', 'b')}</ul>`;
    assert.equal(kernel.transformFeaturedSection(plain, 'cards-grid'), plain);
    const once = kernel.transformFeaturedSection(plain, 'featured');
    assert.equal(kernel.transformFeaturedSection(once, 'featured'), once);
  });

  test('no-op when there is no list', () => {
    assert.equal(kernel.transformFeaturedSection('<h2>H</h2><p>x</p>', 'featured'), '<h2>H</h2><p>x</p>');
  });
});

describe('featured — applyToHtml (marp-cli) preserves chrome', () => {
  test('rewrites the list inside a full section, header/footer untouched', () => {
    const out = kernel.applyToRenderedHtml(
      sec('featured', `<header>H</header><h2>T</h2><ul>${li('A', 'a')}${li('B', 'b')}</ul><footer>F</footer>`),
    );
    assert.match(out, /<header>H<\/header>/);
    assert.match(out, /<footer>F<\/footer>/);
    assert.match(out, /class="feat-layout"/);
    assert.match(out, /class="sub-card"/);
  });
});

describe('featured — applyToDom (runtime)', () => {
  test('replaces the ul with the feat-layout grid', () => {
    const doc = new JSDOM(
      `<!DOCTYPE html><body>${sec('featured', `<h2>T</h2><ul>${li('A', 'a')}${li('B', 'b')}</ul>`)}</body>`,
    ).window.document;
    adapter.applyToDom(doc);
    const layout = doc.querySelector('section.featured > .feat-layout');
    assert.ok(layout);
    assert.equal(layout.querySelector('.feat-card strong').textContent, 'A');
    assert.equal(layout.querySelectorAll('.sub-row .sub-card').length, 1);
    assert.equal(doc.querySelector('section.featured > ul'), null); // list consumed
  });
});
