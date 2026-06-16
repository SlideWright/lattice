/**
 * Unit tests for the masthead-lift transform (Phase 1 of the Form model).
 * Covers the HTML-string kernel (lib/forms/cell/masthead/masthead.transform.js —
 * the marp-cli + emulator paths) and the DOM mirror (lib/transformers/
 * masthead-lift.js — the runtime path), and asserts the two agree.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const kernel = require('../../../lib/forms/cell/masthead/masthead.transform');
const adapter = require('../../../lib/transformers/masthead-lift');

function dom(html) {
  return new JSDOM(`<!DOCTYPE html><body>${html}</body>`).window.document;
}

describe('masthead-lift — HTML-string kernel', () => {
  test('lifts eyebrow + h2 into .cell-masthead; body stays a section child', () => {
    const inner = '<p><code>Kicker</code></p><h2>Title</h2><ul><li>body</li></ul>';
    const out = kernel.transformMastheadSection(inner, 'content form');
    assert.match(out, /<div class="cell-masthead"><div class="masthead-lede"><p><code>Kicker<\/code><\/p><h2>Title<\/h2><\/div><div class="masthead-bay"><\/div><\/div>/);
    // the list is NOT wrapped — it remains after the band, a direct child
    assert.match(out, /<\/div><ul><li>body<\/li><\/ul>$/);
  });

  test('works without an eyebrow (title only)', () => {
    const out = kernel.transformMastheadSection('<h2>Just a title</h2><p>Body.</p>', 'form');
    assert.match(out, /<div class="masthead-lede"><h2>Just a title<\/h2><\/div>/);
    assert.match(out, /<p>Body\.<\/p>$/);
  });

  test('no-op when the section does not opt in', () => {
    const inner = '<p><code>K</code></p><h2>T</h2>';
    assert.equal(kernel.transformMastheadSection(inner, 'content'), inner);
  });

  test('no-op when there is no title to anchor the band', () => {
    const inner = '<p>Just prose, no heading.</p>';
    assert.equal(kernel.transformMastheadSection(inner, 'form'), inner);
  });

  test('idempotent — a second pass does not double-wrap', () => {
    const inner = '<p><code>K</code></p><h2>T</h2><p>Body.</p>';
    const once = kernel.transformMastheadSection(inner, 'form');
    const twice = kernel.transformMastheadSection(once, 'form');
    assert.equal(twice, once);
  });

  test('a leading Marp <header> is preserved before the band', () => {
    const inner = '<header>RUNNING</header><p><code>K</code></p><h2>T</h2>';
    const out = kernel.transformMastheadSection(inner, 'form');
    assert.match(out, /^<header>RUNNING<\/header><div class="cell-masthead">/);
  });

  test('applyToRenderedHtml only touches opted-in sections', () => {
    const html =
      '<section class="content"><h2>Plain</h2></section>' +
      '<section class="content form"><p><code>K</code></p><h2>Lifted</h2></section>';
    const out = kernel.applyToRenderedHtml(html);
    assert.match(out, /<section class="content"><h2>Plain<\/h2><\/section>/);
    assert.match(out, /<section class="content form"><div class="cell-masthead">/);
  });
});

describe('masthead-lift — DOM mirror agrees with the kernel', () => {
  test('DOM path builds the same band structure', () => {
    const doc = dom('<section class="content form"><p><code>Kicker</code></p><h2>Title</h2><ul><li>body</li></ul></section>');
    adapter.applyToDom(doc);
    const sec = doc.querySelector('section.form');
    const band = sec.querySelector(':scope > .cell-masthead');
    assert.ok(band, 'masthead band present');
    assert.ok(band.querySelector('.masthead-lede > p > code'), 'eyebrow in masthead-lede');
    assert.ok(band.querySelector('.masthead-lede > h2'), 'title in masthead-lede');
    assert.ok(band.querySelector('.masthead-bay'), 'bay reserved');
    // body list stayed a direct child of section, after the band
    assert.ok(sec.querySelector(':scope > ul > li'), 'list still a section child');
    assert.equal(sec.children[0], band, 'band is first');
  });

  test('DOM path is idempotent', () => {
    const doc = dom('<section class="form"><p><code>K</code></p><h2>T</h2></section>');
    adapter.applyToDom(doc);
    adapter.applyToDom(doc);
    assert.equal(doc.querySelectorAll('.cell-masthead').length, 1);
  });

  test('DOM path skips non-opted sections', () => {
    const doc = dom('<section class="content"><h2>T</h2></section>');
    adapter.applyToDom(doc);
    assert.equal(doc.querySelector('.cell-masthead'), null);
  });
});
