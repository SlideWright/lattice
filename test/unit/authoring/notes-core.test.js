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
const { Marp } = require('@marp-team/marp-core');

const sec = (inner) => `<section data-marpit-slide="1">${inner}</section>`;

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

describe('notes-core: parity with marp-core comment collection', () => {
  // Each body, on its own slide, must be KEPT/DROPPED identically by
  // notes-core (isToolingComment) and by marp-core (which omits dropped
  // comments from result.comments). This is the guard against the two render
  // paths drifting on the note/pragma boundary.
  const bodies = [
    'a plain speaker note',
    'TODO: tighten this',
    'Reminder: pause',
    'prettier-ignore',
    'markdownlint-disable',
    'markdownlint-disable-next-line MD033',
    'markdownlint-enable',
    'markdownlint-capture',
    'markdownlint-restore',
    'lint disable no-html',
    'foo: 1', // unknown YAML-ish key — marp keeps it as a note
  ];
  for (const body of bodies) {
    test(`"${body}" classified the same by both`, () => {
      const { comments } = new Marp({ html: true }).render(`# Slide\n\n<!-- ${body} -->`);
      const marpKept = (comments[0] || []).length > 0;
      const coreKept = !core.isToolingComment(body);
      assert.equal(
        coreKept,
        marpKept,
        `notes-core kept=${coreKept} but marp-core kept=${marpKept} for "${body}"`
      );
    });
  }
});
