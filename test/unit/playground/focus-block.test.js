/**
 * Unit: findFocusBlock — the pure block-detection at the heart of focus modes.
 *
 * Proves the caret→block resolution + the rebuild (write-back) reconstruction
 * for every focusable kind, so focus mode never replaces the wrong range. The
 * DOM overlay is verified headless; this nails the boundaries.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  // Import the pure, import-free module — NOT drawing-board-focus.js, which pulls
  // in editor.js → CodeMirror (a docs-only dep not present in CI's root install).
  return import('../../../docs/src/playground/focus-block.js');
}

const L = (s) => s.split('\n');

describe('findFocusBlock', () => {
  test('detects a ```mermaid fence and rebuilds it with fences preserved', async () => {
    const { findFocusBlock } = await load();
    const src = L('# Title\n\n```mermaid\ngraph TD\nA-->B\n```\n\nafter');
    const b = findFocusBlock(src, 4); // cursor on "graph TD"
    assert.equal(b.kind, 'mermaid');
    assert.equal(b.fromLine, 3); // the ```mermaid line
    assert.equal(b.toLine, 6); // the closing ```
    assert.equal(b.body, 'graph TD\nA-->B');
    assert.equal(b.rebuild('graph LR\nX-->Y'), '```mermaid\ngraph LR\nX-->Y\n```');
  });

  test('detects from the fence line itself and the closing line', async () => {
    const { findFocusBlock } = await load();
    const src = L('```chart\nbar\n10\n```');
    assert.equal(findFocusBlock(src, 1).kind, 'chart'); // on ```chart
    assert.equal(findFocusBlock(src, 4).kind, 'chart'); // on closing ```
  });

  test('non-focusable fences (js, sql) return null', async () => {
    const { findFocusBlock } = await load();
    const src = L('```js\nconst a = 1;\n```');
    assert.equal(findFocusBlock(src, 2), null);
  });

  test('cursor outside any block returns null', async () => {
    const { findFocusBlock } = await load();
    const src = L('# Title\n\n```mermaid\nA-->B\n```\n\nplain text here');
    assert.equal(findFocusBlock(src, 7), null);
  });

  test('single-line $$…$$ math is focusable and rebuilds inline', async () => {
    const { findFocusBlock } = await load();
    const src = L('text\n$$ E = mc^2 $$\nmore');
    const b = findFocusBlock(src, 2);
    assert.equal(b.kind, 'math');
    assert.equal(b.fromLine, 2);
    assert.equal(b.toLine, 2);
    assert.equal(b.body, 'E = mc^2');
    assert.equal(b.rebuild('a+b'), '$$a+b$$');
  });

  test('block $$ … $$ across lines is focusable and rebuilds as a block', async () => {
    const { findFocusBlock } = await load();
    const src = L('intro\n$$\n\\int_0^1 x\\,dx\n$$\noutro');
    const b = findFocusBlock(src, 3);
    assert.equal(b.kind, 'math');
    assert.equal(b.fromLine, 2);
    assert.equal(b.toLine, 4);
    assert.equal(b.body, '\\int_0^1 x\\,dx');
    assert.equal(b.rebuild('y^2'), '$$\ny^2\n$$');
  });

  test('an unterminated mermaid fence still resolves to EOF', async () => {
    const { findFocusBlock } = await load();
    const src = L('```mermaid\ngraph TD\nA-->B');
    const b = findFocusBlock(src, 2);
    assert.equal(b.kind, 'mermaid');
    assert.equal(b.toLine, 3);
  });

  test('picks the fence the cursor is in when several exist', async () => {
    const { findFocusBlock } = await load();
    const src = L('```mermaid\nA-->B\n```\n\ntext\n\n```chart\nbar\n5\n```');
    assert.equal(findFocusBlock(src, 2).kind, 'mermaid');
    assert.equal(findFocusBlock(src, 8).kind, 'chart');
    assert.equal(findFocusBlock(src, 5), null); // the prose between them
  });
});
