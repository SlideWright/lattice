/**
 * Unit: tools/build-component-gallery.js — combined catalog deck generator.
 *
 * Covers:
 *   1. buildDeck() emits frontmatter, title, function-family dividers,
 *      one slide per component, closing slide
 *   2. Per-component slides carry a `_footer: "<descriptor> · <name>"`
 *      directive matching the gallery.md vocabulary
 *   3. The SHORT descriptor table covers every shipped component (no
 *      anonymous fallbacks — every entry has a curated label)
 *   4. The committed examples/component-gallery.md matches buildDeck()
 *      output (freshness gate, same pattern as snippets + css bundle)
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { buildDeck, SHORT, OUTPUT } = require('../../../tools/build-component-gallery');
const { loadAll } = require('../../../lib/components');

describe('build-component-gallery', () => {
  test('emits frontmatter, title, closing', () => {
    const deck = buildDeck();
    assert.match(deck, /^---\nmarp: true\ntheme: indaco/);
    assert.match(deck, /<!-- _class: title -->/);
    assert.match(deck, /<!-- _class: closing -->/);
  });

  test('per-component slides carry the gallery-style _footer', () => {
    const deck = buildDeck();
    // Every component name appears as both _class and _footer
    for (const m of loadAll()) {
      const re = new RegExp(`_footer: "[^"]+· ${m.name}"`);
      assert.match(deck, re, `missing gallery-style footer for ${m.name}`);
    }
  });

  test('SHORT descriptor table covers every shipped component', () => {
    const manifests = loadAll();
    const missing = manifests
      .map((m) => m.name)
      .filter((n) => !Object.hasOwn(SHORT, n));
    assert.deepEqual(
      missing,
      [],
      `SHORT table is missing entries for: ${missing.join(', ')}`
    );
  });

  test('SHORT descriptors stay short — under 30 chars, ≤4 words', () => {
    for (const [name, label] of Object.entries(SHORT)) {
      assert.ok(label.length <= 30, `${name}: descriptor too long (${label.length} chars)`);
      assert.ok(
        label.split(/\s+/).length <= 4,
        `${name}: descriptor has too many words (${label})`
      );
    }
  });

  test('one slide per component plus title, 7 dividers, closing', () => {
    const deck = buildDeck();
    // Count slides by `<!-- _class:` directives — one per slide.
    const slideCount = (deck.match(/<!-- _class:/g) || []).length;
    // 1 title + 7 dividers + N components + 1 closing
    const expected = 1 + 7 + loadAll().length + 1;
    assert.equal(slideCount, expected);
  });

  test('committed examples/component-gallery.md matches buildDeck (freshness gate)', () => {
    assert.ok(fs.existsSync(OUTPUT), `expected ${OUTPUT} to exist`);
    const current = fs.readFileSync(OUTPUT, 'utf8');
    const fresh = buildDeck();
    assert.equal(
      current,
      fresh,
      `${OUTPUT} is stale. Run \`npm run gallery:components\` to regenerate.`
    );
  });
});
