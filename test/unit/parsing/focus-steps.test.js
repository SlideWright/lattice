/**
 * Unit: `_focusSteps` progressive expansion (lib/integrations/markdown-it/
 * plugins.js `focusSteps`). One authored slide carrying
 * `<!-- _focusSteps: A | B | C -->` expands into N rendered slides, each with
 * `<!-- _focus: <step> -->`. Asserted through lib/engine — the canonical render
 * path (emulator CLI + playground). Design:
 * engineering/decisions/2026-06-16-focus-highlighting.md §4.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const latticeEngine = require('../../../lib/engine');

const engine = latticeEngine.createEngine();
const html = (md) => engine.render(md).html;
const sections = (h) => h.split(/(?=<section[\s>])/).filter((s) => /^<section[\s>]/.test(s));

const DECK = `---\ntheme: indaco\npaginate: true\n---\n\n<!-- _class: cards-grid -->\n<!-- _focusSteps: item 1 | item 2 | item 3 -->\n<!-- _footer: "Walk" -->\n\n## Four components.\n\n- A\n  - a\n- B\n  - b\n- C\n  - c\n`;

describe('_focusSteps expansion', () => {
  test('expands one slide into one slide per step', () => {
    const secs = sections(html(DECK));
    assert.equal(secs.length, 3);
  });

  test('each rendered slide carries the step focus, in order', () => {
    const secs = sections(html(DECK));
    const focuses = secs.map((s) => (s.match(/data-focus="([^"]*)"/) || [])[1]);
    assert.deepEqual(focuses, ['item 1', 'item 2', 'item 3']);
  });

  test('every copy keeps the slide\'s other directives (class + footer)', () => {
    for (const s of sections(html(DECK))) {
      assert.match(s, /class="[^"]*cards-grid/);
      assert.match(s, /<footer>Walk<\/footer>/);
    }
  });

  test('pagination numbers the expanded slides sequentially', () => {
    const pages = sections(html(DECK)).map((s) => (s.match(/data-lattice-pagination="(\d+)"/) || [])[1]);
    assert.deepEqual(pages, ['1', '2', '3']);
  });

  test('a deck without _focusSteps is untouched', () => {
    const plain = '---\ntheme: indaco\n---\n\n## One\n\n- a\n\n---\n\n## Two\n\n- b\n';
    assert.equal(sections(html(plain)).length, 2);
  });

  test('the focus resolver then tags the target on each expanded slide', () => {
    // item 2 → the 2nd top-level <li> on slide 2 is .lat-focus
    const slide2 = sections(html(DECK))[1];
    assert.match(slide2, /<li class="lat-focus"/);
    assert.match(slide2, /data-focus-axis="item"/);
  });
});
