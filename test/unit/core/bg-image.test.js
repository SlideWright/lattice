/**
 * Unit tests for the `![bg …]` half-canvas image kernel (lib/core/bg-image.js)
 * that the emulator's engine-backed path uses to build the lattice-bg /
 * image-text panel. The image rides as a CSS `background-image` on the
 * `.lattice-bg` div (no <img>), with deck-relative URLs resolved to absolute
 * file:// URLs against the deck directory.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const bg = require('../../../lib/core/bg-image');

describe('bg-image — liftBgImages (markdown pre-pass)', () => {
  test('rewrites ![bg right] to the lattice-bg background div', () => {
    const out = bg.liftBgImages('## Heading\n\n![bg right](pic.svg)\n');
    assert.match(out, /<div class="lattice-bg lattice-bg-right" style="background-image:url\('pic\.svg'\)"><\/div>/);
    assert.doesNotMatch(out, /!\[bg/);
  });

  test('resolves deck-relative URLs against a file:// base', () => {
    const out = bg.liftBgImages('![bg right](pic.svg)', 'file:///decks/q/');
    assert.match(out, /background-image:url\('file:\/\/\/decks\/q\/pic\.svg'\)/);
  });

  test('maps left / (none) to the right side keyword', () => {
    assert.match(bg.liftBgImages('![bg left](a.svg)'), /lattice-bg-left/);
    assert.match(bg.liftBgImages('![bg](a.svg)'), /lattice-bg-full/);
    assert.match(bg.liftBgImages('![bg fit](a.svg)'), /lattice-bg-full/);
  });

  test('only matches at line start (inline `![bg…]` in code is left alone)', () => {
    const src = 'Write `![bg right](x)` to anchor the image.';
    assert.equal(bg.liftBgImages(src), src);
  });

  test('is a no-op when there is no bg directive', () => {
    assert.equal(bg.liftBgImages('## Just a heading\n\nbody'), '## Just a heading\n\nbody');
  });
});

describe('bg-image — wrapImageText (HTML post-pass)', () => {
  const sec = (cls, inner) => `<section class="${cls}">${inner}</section>`;
  const bgDiv = '<div class="lattice-bg lattice-bg-right" style="background-image:url(\'p.svg\')"></div>';

  test('wraps half-canvas image prose, keeping header/footer/lattice-bg siblings', () => {
    const html = sec('image', `<header>H</header>${bgDiv}<h2>Title</h2><p>Body</p><footer>F</footer>`);
    const out = bg.wrapImageText(html);
    assert.match(out, /<header>H<\/header><div class="lattice-bg[\s\S]*?<\/div><div class="image-text"><h2>Title<\/h2><p>Body<\/p><\/div><footer>F<\/footer>/);
  });

  test('skips full-bleed variants (full / contain / museum have no text panel)', () => {
    for (const cls of ['image full', 'image contain', 'image museum']) {
      const html = sec(cls, `${bgDiv}<h2>T</h2><p>B</p>`);
      assert.equal(bg.wrapImageText(html), html, `should skip ${cls}`);
    }
  });

  test('skips non-image sections', () => {
    const html = sec('content', '<h2>T</h2><p>B</p>');
    assert.equal(bg.wrapImageText(html), html);
  });

  test('is idempotent', () => {
    const html = sec('image', `${bgDiv}<h2>T</h2><p>B</p>`);
    const once = bg.wrapImageText(html);
    assert.equal(bg.wrapImageText(once), once);
  });
});

describe('bg-image — primitives', () => {
  test('isHalfCanvasImage', () => {
    assert.equal(bg.isHalfCanvasImage('image'), true);
    assert.equal(bg.isHalfCanvasImage('image dark'), true);
    assert.equal(bg.isHalfCanvasImage('image full'), false);
    assert.equal(bg.isHalfCanvasImage('content'), false);
  });

  test('bgDiv produces the canonical lattice-bg background div', () => {
    assert.equal(
      bg.bgDiv(' right', 'x.svg'),
      '<div class="lattice-bg lattice-bg-right" style="background-image:url(\'x.svg\')"></div>',
    );
  });

  test('resolveAssetUrl rebases deck-relative URLs, passes remote/data through', () => {
    assert.match(bg.resolveAssetUrl('pic.svg', 'file:///decks/q/'), /^file:\/\/\/decks\/q\/pic\.svg$/);
    // an http(s) base (the web playground) resolves the same way
    assert.equal(bg.resolveAssetUrl('pic.svg', 'https://o/assets/'), 'https://o/assets/pic.svg');
    assert.equal(bg.resolveAssetUrl('https://x/y.png', 'file:///decks/q/'), 'https://x/y.png');
    assert.equal(bg.resolveAssetUrl('data:image/svg+xml,abc', 'file:///decks/q/'), 'data:image/svg+xml,abc');
    assert.equal(bg.resolveAssetUrl('pic.svg'), 'pic.svg'); // no base → verbatim
  });

  test('resolveAssetUrl does not throw on a literal % in a filename', () => {
    // WHATWG URL must not throw on `100%.svg` (decodeURI would) — keep the render alive.
    assert.doesNotThrow(() => bg.resolveAssetUrl('100%.svg', 'file:///decks/q/'));
    assert.match(bg.resolveAssetUrl('100%.svg', 'file:///decks/q/'), /\/decks\/q\/100/);
  });
});
