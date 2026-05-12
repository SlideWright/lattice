/**
 * Unit: lib/journey.js — user-journey diagram transforms.
 *
 * Parser:    nested <ul> with inline `@actor`/`:mood`/`+volume` <code> tokens
 *            → { sections: [{ name, tasks: [{ label, actors, mood, volume }] }] }
 * Emitter:   data model → .journey-board DOM (one shape; CSS varies per variant)
 * Dispatch:  applyToRenderedHtml walks <section class="journey ..."> blocks only
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const {
  parseJourney,
  parseTask,
  parseSection,
  emitJourneyBoard,
  moodFaceSvg,
  assignActorColors,
  clampMood,
  findOuterUL,
  splitTopLevelLI,
  transformJourneySection,
  applyToRenderedHtml,
  JOURNEY_ACTOR_PALETTE,
} = require('../../lib/journey');

// ── clampMood ─────────────────────────────────────────────────────────

test('clampMood: clamps to 1..5 and rounds non-integers', () => {
  assert.equal(clampMood(5), 5);
  assert.equal(clampMood(1), 1);
  assert.equal(clampMood(0), 1);
  assert.equal(clampMood(9), 5);
  assert.equal(clampMood(3.4), 3);
  assert.equal(clampMood(NaN), 3);
  assert.equal(clampMood(undefined), 3);
});

// ── findOuterUL / splitTopLevelLI ─────────────────────────────────────

test('findOuterUL: returns inner content of first <ul> with balanced nesting', () => {
  const html = '<p>x</p><ul><li>A<ul><li>a</li></ul></li><li>B</li></ul><p>y</p>';
  const ul = findOuterUL(html);
  assert.ok(ul);
  assert.match(ul.inner, /<li>A<ul><li>a<\/li><\/ul><\/li><li>B<\/li>/);
  assert.equal(html.slice(0, ul.start), '<p>x</p>');
  assert.equal(html.slice(ul.end), '<p>y</p>');
});

test('findOuterUL: returns null when no <ul> present', () => {
  assert.equal(findOuterUL('<p>nothing here</p>'), null);
});

test('splitTopLevelLI: ignores nested <li>s inside an inner <ul>', () => {
  const inner = '<li>A<ul><li>a</li><li>b</li></ul></li><li>B<ul><li>c</li></ul></li>';
  const lis = splitTopLevelLI(inner);
  assert.equal(lis.length, 2);
  assert.match(lis[0], /^A<ul>/);
  assert.match(lis[1], /^B<ul>/);
});

// ── parseTask ─────────────────────────────────────────────────────────

test('parseTask: extracts label, actors, mood from inline-code tokens', () => {
  const t = parseTask('Make tea <code>@me</code> <code>:5</code>');
  assert.equal(t.label, 'Make tea');
  assert.deepEqual(t.actors, ['me']);
  assert.equal(t.mood, 5);
  assert.equal(t.volume, null);
});

test('parseTask: handles multiple actors in appearance order', () => {
  const t = parseTask('Do work <code>@me</code> <code>@cat</code> <code>:1</code>');
  assert.deepEqual(t.actors, ['me', 'cat']);
  assert.equal(t.mood, 1);
});

test('parseTask: default mood is 3 (neutral) when no `:N` token is present', () => {
  const t = parseTask('Stand up <code>@me</code>');
  assert.equal(t.mood, 3);
});

test('parseTask: clamps out-of-range mood to 1..5', () => {
  assert.equal(parseTask('x <code>:9</code>').mood, 5);
  assert.equal(parseTask('x <code>:0</code>').mood, 1);
});

test('parseTask: captures `+N` volume token for the weighted variant', () => {
  const t = parseTask('Big task <code>@me</code> <code>:3</code> <code>+30</code>');
  assert.equal(t.volume, 30);
});

test('parseTask: tolerates stray inline markup inside the label', () => {
  const t = parseTask('<strong>Bold</strong> task <code>@me</code> <code>:4</code>');
  assert.equal(t.label, 'Bold task');
  assert.equal(t.mood, 4);
});

// ── parseSection / parseJourney ──────────────────────────────────────

const SAMPLE_UL_INNER = (
  '<li>Go to work' +
    '<ul>' +
      '<li>Make tea <code>@me</code> <code>:5</code></li>' +
      '<li>Go upstairs <code>@me</code> <code>:3</code></li>' +
      '<li>Do work <code>@me</code> <code>@cat</code> <code>:1</code></li>' +
    '</ul>' +
  '</li>' +
  '<li>Go home' +
    '<ul>' +
      '<li>Go downstairs <code>@me</code> <code>:5</code></li>' +
      '<li>Sit down <code>@me</code> <code>:5</code></li>' +
    '</ul>' +
  '</li>'
);

test('parseSection: section name is the text before the nested <ul>', () => {
  const li = 'Go to work<ul><li>x <code>:3</code></li></ul>';
  const s = parseSection(li);
  assert.equal(s.name, 'Go to work');
  assert.equal(s.tasks.length, 1);
});

test('parseJourney: builds the expected section+task tree from sample HTML', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  assert.equal(m.sections.length, 2);
  assert.equal(m.sections[0].name, 'Go to work');
  assert.equal(m.sections[0].tasks.length, 3);
  assert.deepEqual(m.sections[0].tasks[2].actors, ['me', 'cat']);
  assert.equal(m.sections[0].tasks[2].mood, 1);
  assert.equal(m.sections[1].tasks.length, 2);
});

test('parseJourney: drops sections with no tasks', () => {
  const ul = '<li>Empty</li><li>Real<ul><li>t <code>:3</code></li></ul></li>';
  const m = parseJourney(ul);
  assert.equal(m.sections.length, 1);
  assert.equal(m.sections[0].name, 'Real');
});

// ── assignActorColors ────────────────────────────────────────────────

test('assignActorColors: assigns palette in order of first appearance, deduped', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  const colors = assignActorColors(m);
  const entries = [...colors.entries()];
  assert.equal(entries.length, 2);
  assert.equal(entries[0][0], 'me');
  assert.equal(entries[0][1], JOURNEY_ACTOR_PALETTE[0]);
  assert.equal(entries[1][0], 'cat');
  assert.equal(entries[1][1], JOURNEY_ACTOR_PALETTE[1]);
});

// ── moodFaceSvg ──────────────────────────────────────────────────────

test('moodFaceSvg: emits an svg with data-mood reflecting the clamped mood', () => {
  for (let i = 1; i <= 5; i++) {
    const svg = moodFaceSvg(i);
    assert.match(svg, /<svg class="journey-face"/);
    assert.match(svg, new RegExp(`data-mood="${i}"`));
  }
});

// ── emitJourneyBoard ──────────────────────────────────────────────────

test('emit: renders the single shared DOM shape with all variant layers', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  const html = emitJourneyBoard(m);
  assert.match(html, /<div class="journey-board"/);
  assert.match(html, /--task-count:5/);
  assert.match(html, /--actor-count:2/);
  assert.match(html, /<ol class="journey-legend">/);
  assert.match(html, /<ol class="journey-mood-legend"/);
  assert.match(html, /<ol class="journey-sections">/);
  assert.match(html, /<ol class="journey-tasks">/);
  assert.match(html, /<div class="journey-timeline"/);
  assert.match(html, /<ol class="journey-moods">/);
  assert.match(html, /<svg class="journey-curve"/);
  assert.match(html, /<ol class="journey-lanes">/);
});

test('emit: mood legend has 5 ramp swatches plus Pain/Delight endpoint labels', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  const html = emitJourneyBoard(m);
  const legend = html.match(/<ol class="journey-mood-legend"[\s\S]*?<\/ol>/)[0];
  for (let i = 1; i <= 5; i++) {
    assert.match(legend, new RegExp(`journey-mood-key" data-mood="${i}"`));
  }
  assert.match(legend, /journey-mood-key-low">Pain<\/li>/);
  assert.match(legend, /journey-mood-key-high">Delight<\/li>/);
});

test('emit: each section carries --section-volume aggregated from its tasks', () => {
  const ul = (
    '<li>A<ul>' +
      '<li>a <code>:3</code> <code>+10</code></li>' +
      '<li>b <code>:4</code> <code>+5</code></li>' +
    '</ul></li>' +
    '<li>B<ul>' +
      '<li>c <code>:2</code> <code>+30</code></li>' +
    '</ul></li>'
  );
  const m = parseJourney(ul);
  const html = emitJourneyBoard(m);
  assert.match(html, /data-section="0"[^"]*"[^"]*--section-volume:15/);
  assert.match(html, /data-section="1"[^"]*"[^"]*--section-volume:30/);
});

test('emit: section --section-volume defaults to task count when volumes absent', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  const html = emitJourneyBoard(m);
  assert.match(html, /data-section="0"[^"]*"[^"]*--section-volume:3/);
  assert.match(html, /data-section="1"[^"]*"[^"]*--section-volume:2/);
});

test('emit: section spans match task counts (3 + 2)', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  const html = emitJourneyBoard(m);
  assert.match(html, /--span:3/);
  assert.match(html, /--span:2/);
});

test('emit: task elements carry data-mood and sequential --col', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  const html = emitJourneyBoard(m);
  assert.match(html, /journey-task[^"]*"\s+data-mood="5"\s+data-section="0"\s+style="--col:1/);
  assert.match(html, /journey-task[^"]*"\s+data-mood="1"\s+data-section="0"\s+style="--col:3/);
  assert.match(html, /journey-task[^"]*"\s+data-mood="5"\s+data-section="1"\s+style="--col:5/);
});

test('emit: weighted variant volume → --volume and --volume-pct on each task', () => {
  const ul = (
    '<li>S<ul>' +
      '<li>a <code>:3</code> <code>+1</code></li>' +
      '<li>b <code>:4</code> <code>+3</code></li>' +
    '</ul></li>'
  );
  const m = parseJourney(ul);
  const html = emitJourneyBoard(m);
  assert.match(html, /--volume:1; --volume-pct:25/);
  assert.match(html, /--volume:3; --volume-pct:75/);
});

test('emit: swimlane lane has a dot only at tasks where the actor participates', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  const html = emitJourneyBoard(m);
  // me participates in all 5 tasks → 5 lane-dots in me's lane
  const meBlock = html.match(/journey-lane"\s+data-actor="me"[\s\S]*?<\/li>/)[0];
  const meDots  = (meBlock.match(/journey-lane-dot/g) || []).length;
  assert.equal(meDots, 5);
  // cat participates in only task 3 → 1 lane-dot in cat's lane
  const catBlock = html.match(/journey-lane"\s+data-actor="cat"[\s\S]*?<\/li>/)[0];
  const catDots  = (catBlock.match(/journey-lane-dot/g) || []).length;
  assert.equal(catDots, 1);
});

test('emit: curve polyline has one point per task with y = 5 - mood', () => {
  const m = parseJourney(SAMPLE_UL_INNER);
  const html = emitJourneyBoard(m);
  const pts = html.match(/points="([^"]+)"/)[1].split(/\s+/);
  assert.equal(pts.length, 5);
  // First task mood=5 → y=0; third task mood=1 → y=4
  assert.equal(pts[0], '0.50,0.00');
  assert.equal(pts[2], '2.50,4.00');
});

// ── transformJourneySection ──────────────────────────────────────────

const SAMPLE_SECTION_INNER = '<h1>My day</h1><ul>' + SAMPLE_UL_INNER + '</ul>';

test('transform: replaces the inner <ul> with .journey-board and preserves siblings', () => {
  const out = transformJourneySection(SAMPLE_SECTION_INNER, 'journey');
  assert.match(out, /<h1>My day<\/h1>/);
  assert.match(out, /<div class="journey-board"/);
  assert.ok(!/^<h1>My day<\/h1><ul>/.test(out), 'inner <ul> should be replaced');
});

test('transform: idempotent on repeated application', () => {
  const once = transformJourneySection(SAMPLE_SECTION_INNER, 'journey');
  const twice = transformJourneySection(once, 'journey');
  assert.equal(once, twice);
});

test('transform: leaves sections without the journey class untouched', () => {
  const out = transformJourneySection(SAMPLE_SECTION_INNER, 'kpi');
  assert.equal(out, SAMPLE_SECTION_INNER);
});

// ── applyToRenderedHtml — section dispatch ───────────────────────────

const JOURNEY_SECTION = (
  '<section id="1" class="journey" data-marpit-slide="1">' + SAMPLE_SECTION_INNER + '</section>'
);
const HEATMAP_SECTION = (
  '<section id="2" class="journey heatmap" data-marpit-slide="2">' + SAMPLE_SECTION_INNER + '</section>'
);
const NON_JOURNEY_SECTION = (
  '<section id="3" class="kpi" data-marpit-slide="3">' + SAMPLE_SECTION_INNER + '</section>'
);

test('dispatch: rewrites every journey-classed section', () => {
  const out = applyToRenderedHtml(JOURNEY_SECTION + HEATMAP_SECTION);
  const boards = (out.match(/journey-board/g) || []).length;
  assert.equal(boards, 2);
});

test('dispatch: leaves non-journey sections untouched', () => {
  const out = applyToRenderedHtml(NON_JOURNEY_SECTION);
  assert.equal(out, NON_JOURNEY_SECTION);
});

test('dispatch: idempotent across the whole document', () => {
  const once  = applyToRenderedHtml(JOURNEY_SECTION + HEATMAP_SECTION + NON_JOURNEY_SECTION);
  const twice = applyToRenderedHtml(once);
  assert.equal(once, twice);
});
