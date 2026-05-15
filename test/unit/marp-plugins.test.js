/**
 * Unit: Marp engine plugins from marp.config.js.
 *
 * Each plugin is a markdown-it core-ruler hook that transforms the
 * token stream of slides whose `<section>` carries a specific layout
 * class. Tests load the plugins programmatically via @marp-team/marp-core
 * (which is the engine marp-cli runs internally), apply one plugin in
 * isolation, render fixture markdown, and assert on the HTML output.
 *
 * Why one plugin per test instance: the plugins use named ruler hooks
 * (`split_panel_counter`, `verdict_grid_badges`, etc.); applying the
 * same plugin twice to the same Marp instance would throw, and applying
 * unrelated plugins together can hide a regression in one plugin under
 * the side effects of another. Fresh Marp per test is cheap (~5 ms).
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const { Marp } = require('@marp-team/marp-core');
const { plugins } = require('../../marp.config');

function makeMarp(plugin) {
  const m = new Marp();
  if (plugin) m.use(plugin);
  return m;
}

// ── deckClassPropagate ─────────────────────────────────────────────────

test('deckClassPropagate: deck-wide `class:` is appended to every section, even those with `_class:`', () => {
  const m = makeMarp(plugins.deckClassPropagate);
  const md = [
    '---',
    'class: dark',
    '---',
    '',
    '# Slide 1',
    '',
    '---',
    '',
    '<!-- _class: title -->',
    '',
    '# Slide 2',
    '',
    '---',
    '',
    '<!-- _class: cards-grid compact -->',
    '',
    '# Slide 3',
  ].join('\n');
  const { html } = m.render(md);
  const sections = [...html.matchAll(/<section[^>]*class="([^"]*)"/g)].map(m => m[1].split(/\s+/).filter(Boolean));
  assert.equal(sections.length, 3);
  for (const cls of sections) {
    assert.ok(cls.includes('dark'), `missing 'dark' on a section; got [${cls.join(', ')}]`);
  }
  // Per-slide layout tokens must survive — append, not replace.
  assert.ok(sections[1].includes('title'),       `slide 2 lost 'title'; got [${sections[1].join(', ')}]`);
  assert.ok(sections[2].includes('cards-grid'),  `slide 3 lost 'cards-grid'; got [${sections[2].join(', ')}]`);
  assert.ok(sections[2].includes('compact'),     `slide 3 lost 'compact'; got [${sections[2].join(', ')}]`);
});

test('deckClassPropagate: idempotent — a slide that already declares the deck token gets it once, not twice', () => {
  const m = makeMarp(plugins.deckClassPropagate);
  const md = [
    '---', 'class: dark', '---', '',
    '<!-- _class: list dark -->',
    '# Already-dark slide',
  ].join('\n');
  const { html } = m.render(md);
  const cls = html.match(/<section[^>]*class="([^"]*)"/)[1].split(/\s+/).filter(Boolean);
  const darkCount = cls.filter(c => c === 'dark').length;
  assert.equal(darkCount, 1, `'dark' should appear exactly once; got [${cls.join(', ')}]`);
});

test('deckClassPropagate: no-op when front matter has no `class:` directive', () => {
  const m = makeMarp(plugins.deckClassPropagate);
  const md = [
    '---', 'theme: indaco', '---', '',
    '<!-- _class: title -->',
    '# Title',
  ].join('\n');
  const { html } = m.render(md);
  const cls = html.match(/<section[^>]*class="([^"]*)"/)[1].split(/\s+/).filter(Boolean);
  assert.deepEqual(cls, ['title'], `expected only 'title'; got [${cls.join(', ')}]`);
});

test('deckClassPropagate: handles space-separated multi-token deck class', () => {
  const m = makeMarp(plugins.deckClassPropagate);
  const md = [
    '---', 'class: dark numbered', '---', '',
    '<!-- _class: cards-grid -->',
    '# Card slide',
  ].join('\n');
  const { html } = m.render(md);
  const cls = html.match(/<section[^>]*class="([^"]*)"/)[1].split(/\s+/).filter(Boolean);
  assert.ok(cls.includes('dark'));
  assert.ok(cls.includes('numbered'));
  assert.ok(cls.includes('cards-grid'));
});

// ── verdictGridBadges ──────────────────────────────────────────────────

test('verdictGridBadges: [x] / [-] / [ ] / [/] markers become badge spans with shape classes', () => {
  const m = makeMarp(plugins.verdictGridBadges);
  const md = [
    '<!-- _class: verdict-grid -->',
    '## Title',
    '',
    '- Card',
    '  - [x] Pass item',
    '  - [-] Warn item',
    '  - [ ] Fail item',
    '  - [/] Skip item',
    '  - body line passes through untouched',
  ].join('\n');
  const { html } = m.render(md);
  assert.match(html, /<span class="badge pass state-full">Pass item<\/span>/);
  assert.match(html, /<span class="badge warn state-half">Warn item<\/span>/);
  assert.match(html, /<span class="badge fail state-empty">Fail item<\/span>/);
  assert.match(html, /<span class="badge skip state-slashed">Skip item<\/span>/);
  // The body line (no marker) should NOT be wrapped in a badge.
  assert.match(html, /body line passes through untouched/);
  assert.doesNotMatch(html, /<span class="badge[^"]*">body line/);
});

test('verdictGridBadges: does NOT fire on slides without the verdict-grid class', () => {
  const m = makeMarp(plugins.verdictGridBadges);
  const md = '## Title\n\n- Card\n  - [x] would-be-pass';
  const { html } = m.render(md);
  assert.doesNotMatch(html, /badge pass/);
  // The literal `[x]` text is preserved when the plugin does not fire.
  assert.match(html, /\[x\]/);
});

test('verdictGridBadges: top-level body items (depth 1) are not transformed', () => {
  // The plugin only fires at listDepth >= 2 (nested badge items).
  const m = makeMarp(plugins.verdictGridBadges);
  const md = [
    '<!-- _class: verdict-grid -->',
    '- [x] this is a depth-1 item — should NOT be a badge',
  ].join('\n');
  const { html } = m.render(md);
  assert.doesNotMatch(html, /badge pass/);
});

// ── obligationMatrixBadges ─────────────────────────────────────────────

test('obligationMatrixBadges: [x] / [-] / [ ] / [/] markers in <td> become state spans with shape classes', () => {
  const m = makeMarp(plugins.obligationMatrixBadges);
  const md = [
    '<!-- _class: obligation-matrix -->',
    '## Title',
    '',
    '| Reg | A | B | C | D |',
    '| --- | :-: | :-: | :-: | :-: |',
    '| X   | [x] | [-] | [ ] | [/] |',
  ].join('\n');
  const { html } = m.render(md);
  assert.match(html, /<span class="state pass state-full">/);
  assert.match(html, /<span class="state warn state-half">/);
  assert.match(html, /<span class="state fail state-empty">/);
  assert.match(html, /<span class="state skip state-slashed">/);
});

// ── checklistItemStates ──────────────────────────────────────────────

test('checklistItemStates: top-level [x]/[-]/[ ]/[/] items get state + shape classes on <li>', () => {
  const m = makeMarp(plugins.checklistItemStates);
  const md = [
    '<!-- _class: checklist -->',
    '- [x] Done',
    '- [-] Partial',
    '- [ ] Todo',
    '- [/] Skipped',
  ].join('\n');
  const { html } = m.render(md);
  assert.match(html, /<li class="state pass state-full">\s*Done/);
  assert.match(html, /<li class="state warn state-half">\s*Partial/);
  assert.match(html, /<li class="state fail state-empty">\s*Todo/);
  assert.match(html, /<li class="state skip state-slashed">\s*Skipped/);
  // The marker (`[x]` etc.) is stripped from the rendered text.
  assert.doesNotMatch(html, /\[x\]/);
  assert.doesNotMatch(html, /\[ \]/);
  assert.doesNotMatch(html, /\[\/\]/);
});

test('checklistItemStates: items without a marker pass through unchanged', () => {
  const m = makeMarp(plugins.checklistItemStates);
  const md = [
    '<!-- _class: checklist -->',
    '- [x] Marked',
    '- Unmarked item should not get a class',
  ].join('\n');
  const { html } = m.render(md);
  assert.match(html, /<li class="state pass state-full">/);
  // The unmarked item should NOT carry a state class.
  assert.match(html, /<li>Unmarked item should not get a class<\/li>/);
});

test('checklistItemStates: does NOT fire outside the checklist class', () => {
  const m = makeMarp(plugins.checklistItemStates);
  const md = '- [x] would-be-state\n';
  const { html } = m.render(md);
  assert.doesNotMatch(html, /state pass/);
  assert.match(html, /\[x\]/, 'literal marker preserved when plugin does not fire');
});

// ── slotLabelLift ───────────────────────────────────────────────────

test('slotLabelLift: wraps lead inline content in <strong> on decision slides', () => {
  const m = makeMarp(plugins.slotLabelLift);
  const md = [
    '<!-- _class: decision -->',
    '- Build',
    '  - body about building',
    '- Why not buy',
    '  - body about not buying',
  ].join('\n');
  const { html } = m.render(md);
  assert.match(html, /<li><strong>Build<\/strong>/);
  assert.match(html, /<li><strong>Why not buy<\/strong>/);
});

test('slotLabelLift: idempotent — pre-bolded `**Label**` is left alone', () => {
  const m = makeMarp(plugins.slotLabelLift);
  const md = [
    '<!-- _class: before-after -->',
    '- **Before**',
    '  - body',
  ].join('\n');
  const { html } = m.render(md);
  // Should have exactly ONE pair of <strong> tags around "Before",
  // not nested doubles like <strong><strong>Before</strong></strong>.
  const matches = html.match(/<strong>Before<\/strong>/g) || [];
  assert.equal(matches.length, 1, `expected single <strong> wrap, got: ${html}`);
  assert.doesNotMatch(html, /<strong><strong>/);
});

test('slotLabelLift: fires on compare-prose, before-after, and decision', () => {
  for (const cls of ['compare-prose', 'before-after', 'decision']) {
    const m = makeMarp(plugins.slotLabelLift);
    const md = `<!-- _class: ${cls} -->\n- Lead\n  - body`;
    const { html } = m.render(md);
    assert.match(html, /<strong>Lead<\/strong>/, `expected lift on ${cls} but got: ${html}`);
  }
});

test('slotLabelLift: does NOT fire on unrelated layouts', () => {
  for (const cls of ['cards-grid', 'list', 'content', 'closing']) {
    const m = makeMarp(plugins.slotLabelLift);
    const md = `<!-- _class: ${cls} -->\n- Lead\n  - body`;
    const { html } = m.render(md);
    assert.doesNotMatch(html, /<strong>Lead<\/strong>/, `should not lift on ${cls}`);
  }
});

test('slotLabelLift: only the top-level li lead is lifted, not nested li leads', () => {
  const m = makeMarp(plugins.slotLabelLift);
  const md = [
    '<!-- _class: decision -->',
    '- Build',
    '  - nested lead text',
  ].join('\n');
  const { html } = m.render(md);
  assert.match(html, /<strong>Build<\/strong>/);
  // The nested li's lead text should NOT be wrapped in <strong>.
  assert.doesNotMatch(html, /<strong>nested lead text<\/strong>/);
});

// ── splitPanelCounter ───────────────────────────────────────────────

test('splitPanelCounter: zero-pads sequential numbers across split-panel slides', () => {
  const m = makeMarp(plugins.splitPanelCounter);
  const md = [
    '<!-- _class: split-panel -->',
    '## A',
    '',
    '---',
    '',
    '<!-- _class: split-panel -->',
    '## B',
    '',
    '---',
    '',
    '<!-- _class: content -->',
    '## C — should NOT carry the split-panel attr',
  ].join('\n');
  const { html } = m.render(md);
  assert.match(html, /data-split-panel-n="01"/);
  assert.match(html, /data-split-panel-n="02"/);
  // Slide C is not split-panel and must not get the attribute.
  const matches = html.match(/data-split-panel-n=/g) || [];
  assert.equal(matches.length, 2);
});

test('splitPanelCounter: counter resets for a new render call (no global state leak)', () => {
  // Render twice in fresh instances; both should start at 01.
  for (const _ of [1, 2]) {
    const m = makeMarp(plugins.splitPanelCounter);
    const { html } = m.render('<!-- _class: split-panel -->\n## A');
    assert.match(html, /data-split-panel-n="01"/);
  }
});

// ── stripHeadingPeriods ─────────────────────────────────────────────

test('stripHeadingPeriods: removes trailing period from headings on no-period slides', () => {
  const m = makeMarp(plugins.stripHeadingPeriods);
  const { html } = m.render('<!-- _class: no-period -->\n## Signal to noise.');
  assert.match(html, /<h2[^>]*>Signal to noise<\/h2>/);
});

test('stripHeadingPeriods: strips trailing period from h1, h2, h3', () => {
  const m = makeMarp(plugins.stripHeadingPeriods);
  const { html } = m.render([
    '<!-- _class: no-period -->',
    '# Title.',
    '## Section.',
    '### Sub.',
  ].join('\n'));
  assert.match(html, /<h1[^>]*>Title<\/h1>/);
  assert.match(html, /<h2[^>]*>Section<\/h2>/);
  assert.match(html, /<h3[^>]*>Sub<\/h3>/);
});

test('stripHeadingPeriods: leaves headings without a trailing period unchanged', () => {
  const m = makeMarp(plugins.stripHeadingPeriods);
  const { html } = m.render('<!-- _class: no-period -->\n## No period here');
  assert.match(html, /<h2[^>]*>No period here<\/h2>/);
});

test('stripHeadingPeriods: does NOT fire on slides without the no-period class', () => {
  const m = makeMarp(plugins.stripHeadingPeriods);
  const { html } = m.render('## Has a period.');
  assert.match(html, /<h2[^>]*>Has a period\.<\/h2>/);
});

// ── addHeadingPeriods ───────────────────────────────────────────────

test('addHeadingPeriods: appends a period to headings that lack one on with-period slides', () => {
  const m = makeMarp(plugins.addHeadingPeriods);
  const { html } = m.render('<!-- _class: with-period -->\n## Signal to noise');
  assert.match(html, /<h2[^>]*>Signal to noise\.<\/h2>/);
});

test('addHeadingPeriods: appends period to h1, h2, h3', () => {
  const m = makeMarp(plugins.addHeadingPeriods);
  const { html } = m.render([
    '<!-- _class: with-period -->',
    '# Title',
    '## Section',
    '### Sub',
  ].join('\n'));
  assert.match(html, /<h1[^>]*>Title\.<\/h1>/);
  assert.match(html, /<h2[^>]*>Section\.<\/h2>/);
  assert.match(html, /<h3[^>]*>Sub\.<\/h3>/);
});

test('addHeadingPeriods: does not double-append when heading already ends with a period', () => {
  const m = makeMarp(plugins.addHeadingPeriods);
  const { html } = m.render('<!-- _class: with-period -->\n## Already done.');
  assert.match(html, /<h2[^>]*>Already done\.<\/h2>/);
  assert.doesNotMatch(html, /<h2[^>]*>Already done\.\.<\/h2>/);
});

test('addHeadingPeriods: does not append when heading ends with !, ?, :, or …', () => {
  const m = makeMarp(plugins.addHeadingPeriods);
  for (const [src, pattern] of [
    ['## Urgent!',    /<h2[^>]*>Urgent!<\/h2>/],
    ['## Question?',  /<h2[^>]*>Question\?<\/h2>/],
    ['## Note:',      /<h2[^>]*>Note:<\/h2>/],
    ['## Continued…', /<h2[^>]*>Continued…<\/h2>/],
  ]) {
    const { html } = m.render(`<!-- _class: with-period -->\n${src}`);
    assert.match(html, pattern);
  }
});

test('addHeadingPeriods: does NOT fire on slides without the with-period class', () => {
  const m = makeMarp(plugins.addHeadingPeriods);
  const { html } = m.render('## No period added');
  assert.match(html, /<h2[^>]*>No period added<\/h2>/);
});
