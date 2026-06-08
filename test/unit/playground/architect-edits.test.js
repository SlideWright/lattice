/**
 * Unit: the Converse editing engine (Slice B). The model proposes edits; this is
 * the pure core that parses the protocol, splices the deck surgically, and diffs
 * it for review. All of it MUST be correct regardless of the model — a bad splice
 * would corrupt the author's deck — so it's exhaustively covered here. The DOM
 * cards (Apply/Discard) are verified headless against these same functions.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../../../docs/src/playground/architect-edits.js');
}

const DECK = ['# One', '', 'body one', '---', '## Two', '', 'body two', '---', '### Three'].join('\n');

describe('parseEdits', () => {
  test('extracts a four-backtick replace block and returns the prose without it', async () => {
    const { parseEdits } = await load();
    const reply = 'Tightened slide 2.\n\n````lattice-edit slide=2\n## Two (tighter)\n\nbody\n````\n\nDone.';
    const { text, edits } = parseEdits(reply);
    assert.equal(edits.length, 1);
    assert.deepEqual(edits[0], { action: 'replace', slide: 2, body: '## Two (tighter)\n\nbody' });
    assert.match(text, /Tightened slide 2\./);
    assert.match(text, /Done\./);
    assert.doesNotMatch(text, /lattice-edit/);
  });

  test('a slide body may itself contain a triple-backtick chart fence', async () => {
    const { parseEdits } = await load();
    const reply = '````lattice-edit slide=1\n<!-- _class: big-number -->\n```chart\nbar\n10\n```\n````';
    const { edits } = parseEdits(reply);
    assert.equal(edits.length, 1);
    assert.match(edits[0].body, /```chart\nbar\n10\n```/); // the inner fence survives
  });

  test('parses insert (after=N, after=end) and delete', async () => {
    const { parseEdits } = await load();
    const ins = parseEdits('````lattice-edit after=2\n## New\n````').edits[0];
    assert.equal(ins.action, 'insert');
    assert.equal(ins.slide, 2);
    const end = parseEdits('````lattice-edit after=end\n## Last\n````').edits[0];
    assert.equal(end.slide, Number.MAX_SAFE_INTEGER);
    const del = parseEdits('````lattice-edit delete=3\n````').edits[0];
    assert.deepEqual(del, { action: 'delete', slide: 3, body: '' });
  });

  test('multiple blocks parse in order; an unrecognised block stays in the prose', async () => {
    const { parseEdits } = await load();
    const reply = '````lattice-edit slide=1\nA\n````\nmid\n````lattice-edit bogus=1\nkeep me\n````';
    const { text, edits } = parseEdits(reply);
    assert.equal(edits.length, 1);
    assert.equal(edits[0].slide, 1);
    assert.match(text, /keep me/); // malformed block left intact, not swallowed
  });

  test('no blocks → all prose, no edits', async () => {
    const { parseEdits } = await load();
    const { text, edits } = parseEdits('Just advice, no edits here.');
    assert.equal(edits.length, 0);
    assert.equal(text, 'Just advice, no edits here.');
  });
});

describe('applyEdit — replace', () => {
  test('replaces only the target slide, preserving the others byte-for-byte', async () => {
    const { applyEdit } = await load();
    const out = applyEdit(DECK, { action: 'replace', slide: 2, body: '## Two!\n\nnew body' });
    assert.match(out, /## Two!/);
    assert.match(out, /new body/);
    assert.doesNotMatch(out, /body two/); // old content gone
    assert.match(out, /# One\n\nbody one/); // slide 1 untouched
    assert.match(out, /### Three/); // slide 3 untouched
    assert.equal(out.split(/^---$/m).length, 3); // still three slides
  });

  test('keeps the slide’s blank-line cushion around the separators', async () => {
    const { applyEdit } = await load();
    const deck = 'A\n\n---\n\nB\n\n---\n\nC';
    const out = applyEdit(deck, { action: 'replace', slide: 2, body: 'BB' });
    assert.equal(out, 'A\n\n---\n\nBB\n\n---\n\nC');
  });

  test('an out-of-range slide leaves the deck unchanged', async () => {
    const { applyEdit } = await load();
    assert.equal(applyEdit(DECK, { action: 'replace', slide: 9, body: 'x' }), DECK);
    assert.equal(applyEdit(DECK, { action: 'replace', slide: 0, body: 'x' }), DECK);
  });
});

describe('applyEdit — insert', () => {
  test('after=N drops a new slide in after slide N', async () => {
    const { applyEdit } = await load();
    const out = applyEdit(DECK, { action: 'insert', slide: 1, body: '## Inserted' });
    const slides = out.split(/^---$/m).map((s) => s.trim());
    assert.equal(slides.length, 4);
    assert.equal(slides[1], '## Inserted');
    assert.match(slides[0], /# One/);
    assert.match(slides[2], /## Two/);
  });

  test('after=0 prepends, after=end (huge N) appends', async () => {
    const { applyEdit } = await load();
    const pre = applyEdit(DECK, { action: 'insert', slide: 0, body: 'TOP' }).split(/^---$/m).map((s) => s.trim());
    assert.equal(pre[0], 'TOP');
    const app = applyEdit(DECK, { action: 'insert', slide: Number.MAX_SAFE_INTEGER, body: 'END' }).split(/^---$/m).map((s) => s.trim());
    assert.equal(app[app.length - 1], 'END');
    assert.equal(app.length, 4);
  });
});

describe('applyEdit — delete', () => {
  test('removes a middle slide and one separator (no dangling ---)', async () => {
    const { applyEdit } = await load();
    const out = applyEdit(DECK, { action: 'delete', slide: 2 });
    const slides = out.split(/^---$/m).map((s) => s.trim());
    assert.equal(slides.length, 2);
    assert.match(slides[0], /# One/);
    assert.match(slides[1], /### Three/);
    assert.doesNotMatch(out, /## Two/);
  });

  test('removes the last slide cleanly', async () => {
    const { applyEdit } = await load();
    const out = applyEdit(DECK, { action: 'delete', slide: 3 });
    assert.equal(out.split(/^---$/m).length, 2);
    assert.doesNotMatch(out, /### Three/);
  });
});

describe('sliceSlide + slideCount', () => {
  test('reads a slide’s trimmed content; counts slides', async () => {
    const { sliceSlide, slideCount } = await load();
    assert.equal(slideCount(DECK), 3);
    assert.equal(sliceSlide(DECK, 1), '# One\n\nbody one');
    assert.equal(sliceSlide(DECK, 3), '### Three');
    assert.equal(sliceSlide(DECK, 9), ''); // out of range
  });
});

describe('numberSlides (prompt view)', () => {
  test('annotates each slide with a [slide N] marker', async () => {
    const { numberSlides } = await load();
    const out = numberSlides(DECK);
    assert.match(out, /\[slide 1\]\n# One/);
    assert.match(out, /\[slide 2\]\n## Two/);
    assert.match(out, /\[slide 3\]\n### Three/);
  });

  test('empty source → empty string', async () => {
    const { numberSlides } = await load();
    assert.equal(numberSlides(''), '');
    assert.equal(numberSlides('   '), '');
  });
});

describe('diffLines', () => {
  test('marks added, removed, and unchanged lines', async () => {
    const { diffLines } = await load();
    const d = diffLines('a\nb\nc', 'a\nB\nc');
    assert.deepEqual(d.map((x) => x.type), ['same', 'del', 'add', 'same']);
    assert.equal(d.find((x) => x.type === 'add').text, 'B');
    assert.equal(d.find((x) => x.type === 'del').text, 'b');
  });

  test('pure additions / deletions', async () => {
    const { diffLines } = await load();
    assert.deepEqual(diffLines('', 'x').map((x) => x.type), ['del', 'add']); // '' splits to one empty line
    assert.ok(diffLines('a\nb', 'a').some((x) => x.type === 'del'));
  });
});

describe('parse → apply round trips (the whole protocol)', () => {
  test('a replace block from a reply applies to the right slide', async () => {
    const { parseEdits, applyEdit } = await load();
    const { edits } = parseEdits('Here:\n````lattice-edit slide=3\n### Three (edited)\n````');
    const out = applyEdit(DECK, edits[0]);
    assert.match(out, /### Three \(edited\)/);
    assert.match(out, /## Two\n\nbody two/); // neighbours intact
  });
});
