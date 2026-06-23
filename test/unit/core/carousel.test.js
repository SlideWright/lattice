/**
 * Unit: lib/core/carousel.js — the read-across SPLIT move (the editorial carousel).
 *
 * Parses a rendered compare-prose section (Form chrome + masthead h2 + two-subject
 * <ul> + .below-note synthesis) and re-emits it as an editorial sequence: a cover, one
 * article page per subject, and an optional pull-quote verdict. Returns null when the
 * section doesn't parse as the expected shape (→ the caller leaves it for the ring).
 * Driven against the REAL rendered fixture so the parser can't drift from the engine.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { carouselize, readSubjects, readFeature, readRows } = require('../../../lib/core/carousel');
const { splitSections } = require('../../../lib/core/split-sections');

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/compare-prose.rendered.html'), 'utf8');
const [section] = splitSections(fixture).filter((p) => p.type === 'section');
const recipe = { strategy: 'editorial' };

const spFixture = fs.readFileSync(path.join(__dirname, 'fixtures/split-panel.rendered.html'), 'utf8');
const [spSection] = splitSections(spFixture).filter((p) => p.type === 'section');
const clsOf = (sec) => (sec.match(/\sclass="([^"]*)"/) || ['', ''])[1];

const ltFixture = fs.readFileSync(path.join(__dirname, 'fixtures/list-tabular.rendered.html'), 'utf8');
const [ltSection] = splitSections(ltFixture).filter((p) => p.type === 'section');

describe('core: carousel — readSubjects', () => {
  test('extracts exactly two label/body subjects from the real compare-prose DOM', () => {
    const subjects = readSubjects(section.inner);
    assert.equal(subjects.length, 2);
    assert.equal(subjects[0].label, 'Before Calibration');
    assert.equal(subjects[1].label, 'After Calibration');
    assert.match(subjects[0].body, /Equal weights/);
    assert.match(subjects[1].body, /historical accuracy/);
  });

  test('returns null when the slide is not a two-subject list', () => {
    assert.equal(readSubjects('<h2>x</h2><ul><li><strong>only one</strong><ul><li>b</li></ul></li></ul>'), null);
  });
});

describe('core: carousel — carouselize (editorial)', () => {
  const parts = carouselize(section.openTag, section.inner, recipe);

  test('emits lead → read → read → verdict for a slide with a synthesis line', () => {
    assert.equal(parts.length, 4);
    assert.match(clsOf(parts[0]), /compare-split-lead/);
    assert.match(clsOf(parts[1]), /compare-split-read/);
    assert.match(clsOf(parts[2]), /compare-split-read/);
    assert.match(clsOf(parts[3]), /compare-split-verdict/);
  });

  test('every frame carries the Form chrome (header + footer)', () => {
    for (const p of parts) {
      assert.match(p, /<header\b/);
      assert.match(p, /<footer\b/);
    }
  });

  test('the cover promises two readings and carries the comparison title', () => {
    assert.match(parts[0], /split-cover-q">Scoring model: before and after the calibration loop</);
    assert.match(parts[0], /Two readings/);
  });

  test('each reading is one subject: ordinal + label + drop-cap prose', () => {
    assert.match(parts[1], /Reading one<\/span>Before Calibration/);
    assert.match(parts[1], /split-art">Equal weights/);
    assert.match(parts[2], /Reading two<\/span>After Calibration/);
  });

  test('the verdict pull-quote is the slide synthesis line', () => {
    assert.match(parts[3], /split-pullq">The shift from equal to calibrated weights/);
  });

  test('only the lead keeps the engine id; continuations drop it (no duplicate ids)', () => {
    assert.match(parts[0], /\sid="/);
    for (const p of parts.slice(1)) assert.doesNotMatch(p, /\sid="/);
  });

  test('no synthesis → no verdict frame (lead + two readings only)', () => {
    const noNote = section.inner.replace(/<div class="below-note">[\s\S]*?<\/div>/, '');
    const out = carouselize(section.openTag, noNote, recipe);
    assert.equal(out.length, 3);
    assert.equal(out.filter((p) => /compare-split-verdict/.test(p)).length, 0);
  });

  test('a non-editorial / absent recipe is a no-op (null → caller leaves it alone)', () => {
    assert.equal(carouselize(section.openTag, section.inner, null), null);
    assert.equal(carouselize(section.openTag, section.inner, { strategy: 'paginate-rows' }), null);
  });

  test('an unparseable section returns null (→ the ring, never a broken sequence)', () => {
    assert.equal(carouselize('<section class="compare-prose">', '<h2>no subjects here</h2>', recipe), null);
  });

  test('a multi-bullet subject body is joined as prose — no leaked <li> markup', () => {
    const inner = '<h2>T</h2><ul><li><strong>One</strong><ul><li>First.</li><li>Second.</li></ul></li><li><strong>Two</strong><ul><li>Only.</li></ul></li></ul>';
    const subjects = readSubjects(inner);
    assert.equal(subjects[0].body, 'First. Second.');
    assert.doesNotMatch(subjects[0].body, /<\/?li/);
  });

  test('a 3-option comparison carousels (one reading per subject; cover promises three)', () => {
    const open = '<section data-lattice-slide="1" id="1" class="compare-prose form">';
    const inner = '<h2>Q</h2><ul><li><strong>A</strong><ul><li>aa</li></ul></li><li><strong>B</strong><ul><li>bb</li></ul></li><li><strong>C</strong><ul><li>cc</li></ul></li></ul>';
    const out = carouselize(open, inner, recipe);
    assert.equal(out.length, 4); // lead + 3 reads
    assert.equal(out.filter((p) => /compare-split-read/.test(p)).length, 3);
    assert.match(out[0], /Three readings/);
    assert.match(out[3], /Reading three<\/span>C/);
  });

  test('no bespoke folio — the page mark is the deck pagination, not a private scheme', () => {
    for (const p of carouselize(section.openTag, section.inner, recipe)) {
      assert.doesNotMatch(p, /split-folio/);
    }
  });
});

describe('core: carousel — feature-cover (split-panel)', () => {
  const cvRecipe = { strategy: 'feature-cover', perPage: 2 };
  const clsOfSp = (sec) => (sec.match(/\sclass="([^"]*)"/) || ['', ''])[1];

  test('readFeature extracts watermark, eyebrow, heading, lede, and points from the real DOM', () => {
    const f = readFeature(spSection.inner);
    assert.equal(f.watermark, 'S');
    assert.equal(f.heading, 'Scoring Model Deep Dive');
    assert.match(f.eyebrow, /Section 01/);
    assert.match(f.lede, /most configurable component/);
    assert.equal(f.points.length, 3);
    assert.equal(f.points[0].title, 'Confidence');
    assert.doesNotMatch(f.points[0].body, /<\/?li/); // multi-bullet join is clean
  });

  test('emits a feature cover then the points paginated perPage at a time', () => {
    const parts = carouselize(spSection.openTag, spSection.inner, cvRecipe); // 3 points, perPage 2 → 1+1 pages? 2+1
    assert.equal(parts.length, 3); // cover + ceil(3/2)=2 point pages
    assert.match(clsOfSp(parts[0]), /split-panel-cover/);
    assert.match(clsOfSp(parts[1]), /split-panel-points/);
    assert.match(clsOfSp(parts[2]), /split-panel-points/);
  });

  test('the cover carries the feature; the watermark sits in a bleed container', () => {
    const [cover] = carouselize(spSection.openTag, spSection.inner, cvRecipe);
    assert.match(cover, /split-feat-h">Scoring Model Deep Dive</);
    assert.match(cover, /split-feat-bleed"[^>]*><div class="split-feat-wm">S</);
  });

  test('every point page repeats the feature heading as a running header', () => {
    const parts = carouselize(spSection.openTag, spSection.inner, cvRecipe);
    for (const p of parts.slice(1)) assert.match(p, /split-runhead">Scoring Model Deep Dive</);
  });

  test('only the cover keeps the engine id; point pages drop it', () => {
    const parts = carouselize(spSection.openTag, spSection.inner, cvRecipe);
    assert.match(parts[0], /\sid="/);
    for (const p of parts.slice(1)) assert.doesNotMatch(p, /\sid="/);
  });

  test('default variant: eyebrow (span.panel-eyebrow) + lede (panel-LEFT <p>) survive on the cover', () => {
    // The default/metric/steps variants render the eyebrow as <span class="panel-eyebrow">
    // and move the lede <p> into panel-left — not the <code>/right-panel shape of watermark.
    const inner =
      '<div class="panel-left"><span class="panel-eyebrow">Q2 board review</span><h2>Renewals held.</h2><p>The quarter closed on plan.</p></div>' +
      '<div class="panel-right"><ul><li><strong>One</strong><ul><li>Body one.</li></ul></li><li><strong>Two</strong><ul><li>Body two.</li></ul></li></ul></div>';
    const f = readFeature(inner);
    assert.equal(f.eyebrow, 'Q2 board review');
    assert.equal(f.lede, 'The quarter closed on plan.');
    assert.equal(f.heading, 'Renewals held.');
    const [cover] = carouselize('<section data-lattice-slide="1" class="split-panel form">', inner, cvRecipe);
    assert.match(cover, /split-feat-eye">Q2 board review</);
    assert.match(cover, /split-feat-lede">The quarter closed on plan.</);
  });

  test('no points (or no panel-right) → null, left for the ring', () => {
    assert.equal(carouselize('<section class="split-panel">', '<div class="panel-left"><h2>x</h2></div>', cvRecipe), null);
  });

  test('the editorial recipe does not match a split-panel section (strategy-gated)', () => {
    assert.equal(carouselize(spSection.openTag, spSection.inner, { strategy: 'editorial' }), null);
  });
});

describe('core: carousel — cover-rows (list-tabular)', () => {
  const cvRecipe = { strategy: 'cover-rows', perPage: 1 };
  const clsOfLt = (sec) => (sec.match(/\sclass="([^"]*)"/) || ['', ''])[1];

  test('readRows reads the leading-text label and the nested body of each row', () => {
    const rows = readRows(ltSection.inner);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].title, 'Confidence');
    assert.match(rows[0].body, /Independent corroborating sources/);
    assert.match(rows[0].body, /enterprise counts as one/); // both nested bullets joined
    assert.doesNotMatch(rows[0].body, /<\/?li/);
  });

  test('emits a title cover then the rows windowed perPage at a time', () => {
    const parts = carouselize(ltSection.openTag, ltSection.inner, cvRecipe); // 2 rows, perPage 1 → 2 pages
    assert.equal(parts.length, 3); // cover + 2 row pages
    assert.match(clsOfLt(parts[0]), /list-tabular-cover/);
    assert.match(clsOfLt(parts[1]), /list-tabular-points/);
    assert.match(clsOfLt(parts[2]), /list-tabular-points/);
  });

  test('the cover carries the table title (no watermark — a table has none)', () => {
    const [cover] = carouselize(ltSection.openTag, ltSection.inner, cvRecipe);
    assert.match(cover, /split-feat-h">The six signal dimensions/);
    assert.doesNotMatch(cover, /split-feat-wm/);
  });

  test('shares the split-panel row finish (running header + split-pt classes)', () => {
    const parts = carouselize(ltSection.openTag, ltSection.inner, cvRecipe);
    assert.match(parts[1], /split-runhead">The six signal dimensions/);
    assert.match(parts[1], /split-pt-t">Confidence/);
  });

  test('only the cover keeps the engine id; row pages drop it', () => {
    const parts = carouselize(ltSection.openTag, ltSection.inner, cvRecipe);
    assert.match(parts[0], /\sid="/);
    for (const p of parts.slice(1)) assert.doesNotMatch(p, /\sid="/);
  });

  test('no rows or no heading → null, left for the ring', () => {
    assert.equal(carouselize('<section class="list-tabular">', '<h2>only a title</h2>', cvRecipe), null);
  });
});
