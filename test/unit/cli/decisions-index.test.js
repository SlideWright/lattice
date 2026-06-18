// Unit coverage for tools/build-decisions-index.js — the decision-doc index
// generator (engineering/decisions/README.md is rendered from front-matter).

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { frontMatter, render, splice, collect, STATUS } = require('../../../tools/build-decisions-index');

describe('decisions-index', () => {
  describe('frontMatter', () => {
    test('parses a flat leading --- block', () => {
      const fm = frontMatter('---\nstatus: shipped\nsummary: did a thing\n---\n\n# Title\n');
      assert.equal(fm.status, 'shipped');
      assert.equal(fm.summary, 'did a thing');
    });
    test('returns null when there is no front-matter', () => {
      assert.equal(frontMatter('# Just a heading\n'), null);
    });
    test('strips wrapping quotes and ignores a body --- rule', () => {
      const fm = frontMatter('---\nstatus: "proposed"\nsummary: x\n---\n\n## H\n\n---\n');
      assert.equal(fm.status, 'proposed');
    });
  });

  describe('render', () => {
    const notes = [
      { file: '2026-06-17-b.md', created: '2026-06-17', status: 'proposed', summary: 'newer active' },
      { file: '2026-06-10-a.md', created: '2026-06-10', status: 'in-progress', summary: 'older active' },
      { file: '2026-05-01-s.md', created: '2026-05-01', status: 'shipped', summary: 'a shipped one' },
      { file: '2026-04-01-h.md', created: '2026-04-01', status: 'superseded', summary: 'gone', supersededBy: '2026-06-17-b.md' },
    ];
    const out = render(notes);

    test('groups by status into Active / Shipped / Historical', () => {
      assert.match(out, /### Active/);
      assert.match(out, /### Shipped/);
      assert.match(out, /### Historical/);
    });
    test('sorts newest-first within a group', () => {
      assert.ok(out.indexOf('2026-06-17-b.md') < out.indexOf('2026-06-10-a.md'));
    });
    test('uses the status glyph and links superseded-by', () => {
      assert.match(out, new RegExp(`${STATUS.proposed.glyph} \\[2026-06-17-b\\.md\\]`));
      assert.match(out, /gone → \[2026-06-17-b\.md\]\(2026-06-17-b\.md\)/);
    });
    test('footer tallies each group', () => {
      assert.match(out, /4 notes — 2 active, 1 shipped \(pending teardown\), 1 historical/);
    });
  });

  describe('splice', () => {
    test('replaces only the marked region', () => {
      const readme = 'pre\n<!-- decisions-index:begin -->\nOLD\n<!-- decisions-index:end -->\npost\n';
      const next = splice(readme, '<!-- decisions-index:begin -->\nNEW\n<!-- decisions-index:end -->');
      assert.equal(next, 'pre\n<!-- decisions-index:begin -->\nNEW\n<!-- decisions-index:end -->\npost\n');
    });
    test('throws when markers are missing', () => {
      assert.throws(() => splice('no markers here', 'x'), /markers/);
    });
  });

  describe('the live decisions/ folder', () => {
    test('every note has valid closed-vocab front-matter (collect() is clean)', () => {
      const { notes, errors } = collect();
      assert.deepEqual(errors, [], `malformed notes:\n${errors.join('\n')}`);
      assert.ok(notes.length >= 100, `expected the full corpus, got ${notes.length}`);
      for (const n of notes) assert.ok(STATUS[n.status], `${n.file}: bad status ${n.status}`);
    });
  });
});
