/**
 * Unit: lib/roadmap.js — roadmap modifier transforms.
 *
 * Two transforms keyed off the roadmap layout class:
 *   - roadmap status   : tag <td> cells with state marker → state class
 *   - roadmap horizons : transpose workstream × phase table into 3 cards
 *
 * Both transforms operate on rendered HTML strings (post-markdown-it)
 * and skip sections that don't carry the matching modifier.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const {
  applyStatusMarkers,
  applyHorizons,
  applyToRenderedHtml,
  markerToState,
} = require('../../lib/roadmap');

// ── markerToState ──────────────────────────────────────────────────────

test('markerToState: maps [x]/[-]/[ ]/[/] to the four state classes', () => {
  assert.equal(markerToState('x'), 'state-shipped');
  assert.equal(markerToState('-'), 'state-wip');
  assert.equal(markerToState(' '), 'state-planned');
  assert.equal(markerToState('/'), 'state-skipped');
  assert.equal(markerToState('?'), '');
});

// ── applyStatusMarkers ────────────────────────────────────────────────

const STATUS_TABLE = (
  '<table>' +
    '<thead><tr><th>Workstream</th><th>Phase 01</th><th>Phase 02</th></tr></thead>' +
    '<tbody>' +
      '<tr><td>Platform</td><td>[x] Codebook signing</td><td>[-] Multi-tenant DEKs</td></tr>' +
      '<tr><td>SDK</td><td>[ ] Java</td><td>[/] .NET</td></tr>' +
    '</tbody>' +
  '</table>'
);

test('status: tags every marker-prefixed body cell with the state class', () => {
  const out = applyStatusMarkers(STATUS_TABLE);
  // All four markers found
  assert.match(out, /cell-state state-shipped/);
  assert.match(out, /cell-state state-wip/);
  assert.match(out, /cell-state state-planned/);
  assert.match(out, /cell-state state-skipped/);
  // Marker text stripped from the cell content
  assert.ok(!out.includes('[x]'), 'shipped marker should be stripped');
  assert.ok(!out.includes('[-]'), 'wip marker should be stripped');
  assert.ok(!out.includes('[ ]'), 'planned marker should be stripped');
  assert.ok(!out.includes('[/]'), 'skipped marker should be stripped');
});

test('status: emits a state-label eyebrow with the human-readable state name', () => {
  const out = applyStatusMarkers(STATUS_TABLE);
  assert.match(out, /<span class="cell-state-label">Shipped<\/span>/);
  assert.match(out, /<span class="cell-state-label">In flight<\/span>/);
  assert.match(out, /<span class="cell-state-label">Planned<\/span>/);
  assert.match(out, /<span class="cell-state-label">Out of scope<\/span>/);
});

test('status: leaves the workstream cell (first td) unchanged', () => {
  const out = applyStatusMarkers(STATUS_TABLE);
  // First-cell workstream labels survive untouched
  assert.match(out, /<td>Platform<\/td>/);
  assert.match(out, /<td>SDK<\/td>/);
});

test('status: leaves header cells unchanged', () => {
  const out = applyStatusMarkers(STATUS_TABLE);
  assert.match(out, /<th>Phase 01<\/th>/);
  assert.match(out, /<th>Phase 02<\/th>/);
});

test('status: ignores cells without a marker prefix', () => {
  const noMarker = (
    '<table><thead><tr><th>WS</th><th>P1</th></tr></thead>' +
    '<tbody><tr><td>Foo</td><td>plain text</td></tr></tbody></table>'
  );
  const out = applyStatusMarkers(noMarker);
  assert.ok(!out.includes('cell-state'));
  assert.match(out, /<td>plain text<\/td>/);
});

// ── applyHorizons ─────────────────────────────────────────────────────

const HORIZONS_TABLE = (
  '<table>' +
    '<thead><tr><th>Workstream</th><th>Now · Q2</th><th>Next · Q3</th></tr></thead>' +
    '<tbody>' +
      '<tr><td>Platform</td><td>Codebook signing</td><td>Multi-tenant DEKs</td></tr>' +
      '<tr><td>SDK</td><td>Java</td><td></td></tr>' +
    '</tbody>' +
  '</table>'
);

test('horizons: builds one horizon-card per phase column (workstream column dropped)', () => {
  const out = applyHorizons(HORIZONS_TABLE);
  const cards = out.match(/horizon-card/g) || [];
  assert.equal(cards.length, 2, 'two phase columns → two cards');
  // Original table replaced with horizons wrapper
  assert.ok(!out.includes('<table>'));
  assert.match(out, /class="horizons"/);
});

test('horizons: phase header text becomes the card title', () => {
  const out = applyHorizons(HORIZONS_TABLE);
  assert.match(out, /<span class="horizon-title">Now · Q2<\/span>/);
  assert.match(out, /<span class="horizon-title">Next · Q3<\/span>/);
});

test('horizons: phase number eyebrow auto-derives from column order', () => {
  const out = applyHorizons(HORIZONS_TABLE);
  assert.match(out, /<span class="horizon-eyebrow">Phase 01<\/span>/);
  assert.match(out, /<span class="horizon-eyebrow">Phase 02<\/span>/);
});

test('horizons: each card carries workstream rows with label + commitment', () => {
  const out = applyHorizons(HORIZONS_TABLE);
  // Workstream labels reused across both cards
  const platformLabels = out.match(/<span class="row-label">Platform<\/span>/g) || [];
  assert.equal(platformLabels.length, 2);
  // Commitments routed to the right card
  assert.match(out, /<span class="row-text">Codebook signing<\/span>/);
  assert.match(out, /<span class="row-text">Multi-tenant DEKs<\/span>/);
  assert.match(out, /<span class="row-text">Java<\/span>/);
});

test('horizons: empty cells render as a muted dash row', () => {
  const out = applyHorizons(HORIZONS_TABLE);
  assert.match(out, /<span class="row-text row-empty">—<\/span>/);
});

test('horizons: cycles the categorical accent across cards', () => {
  const out = applyHorizons(HORIZONS_TABLE);
  assert.match(out, /--phase-accent:var\(--cat-blue\)/);
  assert.match(out, /--phase-accent:var\(--cat-green\)/);
});

// ── applyToRenderedHtml — section dispatch ─────────────────────────────

const STATUS_SECTION = (
  '<section id="1" class="roadmap status" data-marpit-slide="1">' + STATUS_TABLE + '</section>'
);
const HORIZONS_SECTION = (
  '<section id="2" class="roadmap horizons" data-marpit-slide="2">' + HORIZONS_TABLE + '</section>'
);
const PLAIN_ROADMAP_SECTION = (
  '<section id="3" class="roadmap" data-marpit-slide="3">' + STATUS_TABLE + '</section>'
);
const NON_ROADMAP_SECTION = (
  '<section id="4" class="kpi" data-marpit-slide="4">' + STATUS_TABLE + '</section>'
);

test('dispatch: applies status transform only when the modifier is present', () => {
  const out = applyToRenderedHtml(STATUS_SECTION);
  assert.match(out, /cell-state state-shipped/);
});

test('dispatch: applies horizons transform only when the modifier is present', () => {
  const out = applyToRenderedHtml(HORIZONS_SECTION);
  assert.match(out, /class="horizons"/);
  assert.ok(!out.includes('<table>'));
});

test('dispatch: leaves the default roadmap section untouched', () => {
  const out = applyToRenderedHtml(PLAIN_ROADMAP_SECTION);
  // No state classes, no horizons wrapper
  assert.ok(!out.includes('cell-state'));
  assert.ok(!out.includes('class="horizons"'));
  // Markers in the input survive (they weren't intended as state markers
  // on a plain roadmap section).
  assert.match(out, /\[x\] Codebook signing/);
});

test('dispatch: leaves non-roadmap sections untouched', () => {
  const out = applyToRenderedHtml(NON_ROADMAP_SECTION);
  assert.equal(out, NON_ROADMAP_SECTION);
});

test('dispatch: idempotent on re-application', () => {
  const once  = applyToRenderedHtml(STATUS_SECTION);
  const twice = applyToRenderedHtml(once);
  assert.equal(once, twice);
  const h1 = applyToRenderedHtml(HORIZONS_SECTION);
  const h2 = applyToRenderedHtml(h1);
  assert.equal(h1, h2);
});

test('dispatch: handles multiple sections in the same document', () => {
  const doc = STATUS_SECTION + HORIZONS_SECTION + NON_ROADMAP_SECTION;
  const out = applyToRenderedHtml(doc);
  assert.match(out, /cell-state state-shipped/);
  assert.match(out, /class="horizons"/);
  // Non-roadmap section's [x] markers still survive (not in scope)
  assert.match(out, /\[x\] Codebook signing/);
});
