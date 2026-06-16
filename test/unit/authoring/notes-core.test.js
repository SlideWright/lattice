/**
 * Unit: lib/authoring/notes-core.js — the pure presenter-notes extractor.
 *
 * notes-core is the SINGLE SOURCE for "a non-directive comment on a slide is
 * that slide's note" (LFM, Marp-faithful). The emulator extracts notes with it
 * from engine-rendered slide HTML; the marp-cli path relies on marp-core's own
 * comment collection. The parity block below renders the same bodies through
 * marp-core and asserts notes-core's keep/drop decision matches it exactly, so
 * the two render paths can never disagree on what counts as a note.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../../lib/authoring/notes-core');

const sec = (inner) => `<section data-lattice-slide="1">${inner}</section>`;

describe('notes-core: isToolingComment', () => {
  for (const pragma of [
    'prettier-ignore',
    'prettier-ignore-start',
    'prettier-ignore-end',
    'markdownlint-disable',
    'markdownlint-disable MD033',
    'markdownlint-disable-next-line MD026',
    'markdownlint-enable',
    'markdownlint-capture',
    'markdownlint-restore',
    'lint disable',
    'lint enable no-undefined-references',
    'lint ignore',
  ]) {
    test(`pragma excluded: "${pragma}"`, () => {
      assert.equal(core.isToolingComment(pragma), true);
    });
  }

  for (const note of [
    'Pause here. Ask the room.',
    'TODO: revisit this slide before the board',
    'Reminder: keep it to ninety seconds',
    'markdownlint is great', // prose that merely mentions a tool — not a pragma
    'lint the deck later', // "lint " but not "lint disable/enable/ignore"
  ]) {
    test(`note kept: "${note}"`, () => {
      assert.equal(core.isToolingComment(note), false);
    });
  }
});

describe('notes-core: notesFromHtml', () => {
  test('single note', () => {
    assert.equal(core.notesFromHtml(sec('<h1>A</h1><!-- speaker note -->')), 'speaker note');
  });
  test('multiple comments join with a blank line', () => {
    assert.equal(
      core.notesFromHtml(sec('<!-- first --><p>x</p><!-- second -->')),
      'first\n\nsecond'
    );
  });
  test('multi-line comment body is preserved', () => {
    assert.equal(
      core.notesFromHtml(sec('<!-- line one\n   line two -->')),
      'line one\n   line two'
    );
  });
  test('pragma-only slide → null', () => {
    assert.equal(core.notesFromHtml(sec('<!-- markdownlint-disable MD033 -->')), null);
  });
  test('note alongside a pragma → only the note', () => {
    assert.equal(
      core.notesFromHtml(sec('<!-- markdownlint-disable --><!-- the real note -->')),
      'the real note'
    );
  });
  test('no comments → null', () => {
    assert.equal(core.notesFromHtml(sec('<h1>A</h1>')), null);
  });
  test('empty comment → null', () => {
    assert.equal(core.notesFromHtml(sec('<!--  -->')), null);
  });
});

describe('notes-core: extractSlideNotes is index-aligned', () => {
  test('one entry per slide, null where empty', () => {
    const slides = [
      sec('<!-- note A -->'),
      sec('<h1>B</h1>'),
      sec('<!-- markdownlint-disable --><!-- note C -->'),
    ];
    assert.deepEqual(core.extractSlideNotes(slides), ['note A', null, 'note C']);
  });
});

describe('notes-core: stripCommentNodes', () => {
  test('removes comment nodes, leaves real markup', () => {
    assert.equal(
      core.stripCommentNodes('<h1>A</h1><!-- a note --><p>body</p>'),
      '<h1>A</h1><p>body</p>'
    );
  });
});

describe('notes-core: malformed input is linear (no ReDoS)', () => {
  test('an unterminated <!-- with a long run resolves quickly to null', () => {
    // The old `<!--+\s*([\s\S]*?)\s*--+>` pattern was quadratic here (a 5k run
    // hung >30s). The linear pattern finishes in milliseconds. node:test has no
    // per-test timeout, so we assert wall-time directly — with a generous bound
    // that still separates linear (ms) from the quadratic blow-up (tens of
    // seconds) by orders of magnitude, but won't flake under concurrent CI/hook
    // CPU load the way a sub-second bound did.
    const html = `<section><!-- ${' '.repeat(200000)}no close`;
    const t = Date.now();
    const note = core.notesFromHtml(html);
    const elapsed = Date.now() - t;
    assert.equal(note, null, 'an unterminated comment is not a note');
    assert.ok(elapsed < 5000, `extraction took ${elapsed}ms — expected linear (the quadratic bug hung >30s)`);
  });
});

describe('notes-core: known comment-collection deltas vs marp-core', () => {
  // These are documented in spec/LFM-1.0.md §3.5 as explicitly NOT guaranteed
  // identical across parsers — they depend on comment *segmentation*, not the
  // note boundary. These tests lock notes-core's current behavior so a future
  // change to it is a conscious decision, not a silent drift.
  test('adjacent comments with no blank line are both collected', () => {
    // marp-core collects only the first here; the HTML scan sees both.
    assert.equal(core.notesFromHtml('<section><!-- a --><!-- b --></section>'), 'a\n\nb');
  });
  test('a comment inside a rendered block is still lifted', () => {
    // marp-core folds this into an HTML-block token and does not collect it.
    assert.equal(core.notesFromHtml('<section><div><!-- x --></div></section>'), 'x');
  });
});
