/**
 * Unit: lib/layout/ai.js — the Component Studio AI tier's pure pieces.
 *
 * The model only PROPOSES; this layer shapes the reply into a gate-ready draft
 * (slugged name, enum-snapped axes, the one safe text fix) and detects a decline.
 * The deterministic gate (gateComponent) disposes — so the make-or-break test is
 * that the WORKED EXAMPLES we teach the model are themselves gate-clean (teaching
 * the model from gate-failing CSS would be self-defeating).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { ASK_SYSTEM, askComponentMessages, coerceComponent, rankSimilar, auditComponentDesign, addScopePrefix, MAX_CSS_BYTES } = require('../../../lib/layout/ai.js');
const { gateComponent, findUnscopedSelectors } = require('../../../lib/layout/gate.js');

describe('component-ai — prompt', () => {
  test('askComponentMessages carries the canon, the output contract, and a worked example', () => {
    const sys = askComponentMessages('a grid of capability cards').at(0).content;
    assert.match(sys, /cell-stage/, 'teaches the root');
    assert.match(sys, /margin/i, 'teaches the no-margin rule');
    assert.match(sys, /--fs-/, 'teaches the type tokens');
    assert.match(sys, /WORKED EXAMPLE/, 'includes a worked example');
    assert.match(sys, /"decline"/, 'documents the decline contract');
    assert.equal(askComponentMessages('x').at(-1).content, 'x');
  });

  test('askComponentMessages threads dedup near-neighbors when present', () => {
    const msgs = askComponentMessages('a roster', { similar: [{ name: 'actors', bucket: 'inventory', description: 'Roster of responsibilities.' }] });
    assert.ok(msgs.some(m => m.role === 'assistant' && /actors/.test(m.content)), 'near-neighbors are threaded for reuse');
  });
});

describe('component-ai — coerce', () => {
  const GOOD = {
    name: 'Verdict Grid!',
    description: 'A grid of verdict cards.',
    function: 'inventory', form: 'grid', substance: 'structure', bucket: 'inventory',
    tags: ['cards', 'verdict', 'grid'],
    css: 'section.verdict-grid > .cell-stage { display:flex; gap:var(--sp-md); }\nsection.verdict-grid li { color:var(--text-body); font-size:var(--fs-body); }',
    skeleton: '<!-- _class: verdict-grid -->\n\n## Verdicts\n\n- Ship it\n  - All gates green.',
  };

  test('shapes a clean reply: slugged name, enum-snapped axes, adapt/capacity, ok', () => {
    const r = coerceComponent({ ...GOOD, adapt: { mode: 'native' }, capacity: { sweet: 4, soft: 6, hard: 8 } });
    assert.equal(r.ok, true);
    assert.equal(r.decline, null);
    assert.equal(r.manifest.name, 'verdict-grid', 'name is a valid slug');
    assert.equal(r.manifest.bucket, 'inventory');
    assert.deepEqual(r.manifest.tags, ['cards', 'verdict', 'grid']);
    assert.equal(r.manifest.adapt.mode, 'native', 'adapt captured');
    assert.deepEqual(r.manifest.capacity, { sweet: 4, soft: 6, hard: 8 }, 'capacity captured');
  });

  test('defaults adapt to native and capacity to null when the model omits them', () => {
    const r = coerceComponent(GOOD);
    assert.equal(r.manifest.adapt.mode, 'native');
    assert.equal(r.manifest.capacity, null);
  });

  test('clamps tags to the gate ceiling (≤ 5) so a 6-tag reply can still pass', () => {
    const r = coerceComponent({ ...GOOD, tags: ['a', 'b', 'c', 'd', 'e', 'f'] });
    assert.equal(r.manifest.tags.length, 5);
  });

  test('snaps an unknown axis to a safe default rather than failing', () => {
    const r = coerceComponent({ ...GOOD, form: 'nonsense', substance: 'series' });
    assert.equal(r.manifest.form, 'panel'); // unknown form → default
    assert.equal(r.manifest.substance, 'structure'); // transform-bearing substance → CSS-only default
  });

  test('parses a JSON string (incl. prose-wrapped) and an empty reply is not ok', () => {
    assert.equal(coerceComponent(JSON.stringify(GOOD)).ok, true);
    assert.equal(coerceComponent('Here you go:\n```json\n' + JSON.stringify(GOOD) + '\n```').ok, true);
    assert.equal(coerceComponent('{}').ok, false);
    assert.equal(coerceComponent('not json').ok, false);
  });

  test('detects a decline and routes it (never a fake component)', () => {
    const r = coerceComponent({ decline: true, reason: 'A bar chart needs a transform.', route: 'chart', suggestion: 'use the chart bucket' });
    assert.equal(r.ok, false);
    assert.equal(r.manifest, null);
    assert.equal(r.decline.route, 'chart');
    assert.match(r.decline.reason, /transform/);
  });

  test('applies the ONE safe fix: inline `- **Title.** body` → nested card form (#5)', () => {
    const r = coerceComponent({ ...GOOD, skeleton: '<!-- _class: verdict-grid -->\n\n## T\n\n- **Ship it.** All gates green.' });
    assert.ok(r.fixes.includes('card-nesting'));
    assert.match(r.skeleton, /- Ship it\n {2}- All gates green\./);
    assert.doesNotMatch(r.skeleton, /\*\*/);
  });
});

describe('component-ai — the worked examples are gate-clean (make-or-break)', () => {
  // The exact card-grid example the system prompt teaches. If this ever fails the
  // gate, the model is being taught from non-native CSS — a self-defeating bug.
  const CARDS = {
    css: [
      'section.capability-cards > .cell-stage { display:flex; flex-direction:column; }',
      'section.capability-cards > .cell-stage > ul {',
      '  display:flex; flex-wrap:wrap; gap:var(--sp-md); flex:1; min-height:0;',
      '  list-style:none; padding:0; margin:0;',
      '}',
      'section.capability-cards > .cell-stage > ul > li {',
      '  box-sizing:border-box; width:calc(50% - var(--sp-md) / 2);',
      '  background:var(--bg-alt); border:1px solid var(--border); border-radius:var(--radius-md);',
      '  padding:var(--sp-sm) var(--sp-md);',
      '  font-size:var(--fs-body); font-weight:700; color:var(--text-heading); line-height:var(--lh-snug);',
      '}',
      '@container lattice (aspect-ratio <= 1.05) {',
      '  section.capability-cards.capability-cards > .cell-stage > ul > li { width:100%; }',
      '}',
    ].join('\n'),
    manifest: {
      name: 'capability-cards', function: 'inventory', form: 'grid', substance: 'structure', bucket: 'inventory',
      tags: ['cards', 'grid', 'capabilities'], description: 'A 2-up grid of capability cards.',
      skeleton: '<!-- _class: capability-cards -->\n\n## What the platform does\n\n- Ingests any source\n  - CSV, API, or stream.',
    },
  };

  test('worked example A (card grid) passes gateComponent — no hex, scoped, no margin, fs-token', () => {
    const r = gateComponent(CARDS);
    assert.equal(r.ok, true, JSON.stringify(r.errors));
  });

  // Example B (ledger) and C (reuse) — the canon's other two worked examples. Each
  // must be gate-clean for the same reason as A: the model learns from them.
  const LEDGER = {
    css: [
      'section.owner-ledger > .cell-stage { display:flex; flex-direction:column; }',
      'section.owner-ledger > .cell-stage > ul { display:flex; flex-direction:column; gap:var(--sp-xs); flex:1; min-height:0; list-style:none; padding:0; margin:0; }',
      'section.owner-ledger > .cell-stage > ul > li { display:flex; flex-wrap:wrap; align-items:center; column-gap:var(--sp-md); flex:1; min-height:0; background:var(--bg-alt); border:1px solid var(--border); border-left:3px solid var(--accent); border-radius:var(--radius-md); padding:var(--sp-sm) var(--sp-lg); }',
      'section.owner-ledger > .cell-stage > ul > li > strong { flex:1 1 auto; font-size:var(--fs-body); font-weight:700; color:var(--text-heading); }',
      'section.owner-ledger > .cell-stage > ul > li > code { flex:0 0 auto; font-size:var(--fs-meta); color:var(--text-body); }',
      'section.owner-ledger > .cell-stage > ul > li > ul { flex:0 0 100%; list-style:none; padding:0; margin:0; font-size:var(--fs-body-compact); color:var(--text-body); }',
    ].join('\n'),
    manifest: { name: 'owner-ledger', function: 'inventory', form: 'ledger', substance: 'structure', bucket: 'inventory', tags: ['ownership', 'roster', 'ledger'], description: 'A roster of responsibilities.', skeleton: '<!-- _class: owner-ledger -->\n\n## Who owns what\n\n- Signal custody `Data lead`\n  - Owns intake quality.' },
  };
  const REUSE = {
    css: [
      'section.status-cards > .cell-stage { display:flex; flex-direction:column; }',
      'section.status-cards > .cell-stage > ul { display:flex; flex-wrap:wrap; gap:var(--sp-md); flex:1; min-height:0; list-style:none; padding:0; margin:0; }',
      'section.status-cards > .cell-stage > ul > li { box-sizing:border-box; width:calc(50% - var(--sp-md) / 2); background:var(--bg-alt); border:1px solid var(--border); border-left:3px solid var(--text-muted); border-radius:var(--radius-md); padding:var(--sp-sm) var(--sp-md); font-size:var(--fs-body); font-weight:700; color:var(--text-heading); }',
      'section.status-cards > .cell-stage > ul > li.pass { border-left-color:var(--pass); }',
      'section.status-cards > .cell-stage > ul > li.warn { border-left-color:var(--warn); }',
      'section.status-cards > .cell-stage > ul > li.fail { border-left-color:var(--fail); }',
      '@container lattice (aspect-ratio <= 1.05) { section.status-cards.status-cards > .cell-stage > ul > li { width:100%; } }',
    ].join('\n'),
    manifest: { name: 'status-cards', function: 'inventory', form: 'grid', substance: 'structure', bucket: 'inventory', tags: ['cards', 'status', 'grid'], description: 'Status-tagged capability cards.', skeleton: '<!-- _class: status-cards -->\n\n## Capability status\n\n- Ingest pipeline\n- Scoring engine\n- Audit trail' },
  };
  test('worked example B (ledger) passes gateComponent', () => {
    assert.equal(gateComponent(LEDGER).ok, true, JSON.stringify(gateComponent(LEDGER).errors));
  });
  test('worked example C (reuse) passes gateComponent', () => {
    assert.equal(gateComponent(REUSE).ok, true, JSON.stringify(gateComponent(REUSE).errors));
  });
});

describe('component-ai — scope-prefix safe fix (§6, self-verifying)', () => {
  test('prefixes a bare selector so it stops leaking, and reports the fix', () => {
    const r = coerceComponent({
      name: 'leaky', function: 'inventory', form: 'grid', substance: 'structure', bucket: 'inventory', tags: ['a', 'b', 'c'],
      description: 'd',
      css: 'section.leaky > .cell-stage { display:flex; }\nul { color:var(--text-body); }',
      skeleton: '<!-- _class: leaky -->\n\n## T\n\n- a',
    });
    assert.ok(r.fixes.includes('scope-prefix'));
    assert.equal(findUnscopedSelectors(r.css, 'leaky').length, 0, 'the leak is scoped away');
    assert.match(r.css, /section\.leaky ul/);
  });
  test('addScopePrefix leaves an already-scoped sheet untouched', () => {
    const css = 'section.ok > .cell-stage { display:flex; }';
    const r = addScopePrefix(css, 'ok');
    assert.equal(r.fixed, false);
    assert.equal(r.css, css);
  });
  test('addScopePrefix descends into @container but never rewrites @keyframes stops', () => {
    const r = addScopePrefix('@keyframes spin { from { opacity:0 } } ul { color:var(--text-body) }', 'x');
    // the keyframe `from` is left alone; the bare ul gets scoped
    assert.match(r.css, /@keyframes spin \{ from \{ opacity:0 \} \}/);
    assert.match(r.css, /section\.x ul/);
  });
  test('a brace inside a content string can NOT corrupt the rewrite (string-aware)', () => {
    // `content:"}"` must not be mistaken for a rule close; the bare li still scopes.
    const r = addScopePrefix('section.x li::after { content:"}" } ul { color:var(--text-body) }', 'x');
    assert.match(r.css, /content:"\}"/, 'the content string is preserved verbatim');
    assert.equal(findUnscopedSelectors(r.css, 'x').length, 0);
  });
  test('a quoted attribute selector makes it BAIL (never corrupt) — gate still flags the leak', () => {
    const css = 'ul[data-state="{}"] { color:var(--text-body) }';
    const r = addScopePrefix(css, 'x');
    assert.equal(r.fixed, false, 'declines to auto-fix a quoted selector');
    assert.equal(r.css, css, 'returns the original untouched — no corruption');
  });
});

describe('component-ai — design audit (§6 adapt/capacity + §7 size cap)', () => {
  test('flags a missing adapt block and a missing capacity', () => {
    const f = auditComponentDesign({ name: 'x' }, 'section.x{}');
    assert.ok(f.some(x => x.rule === 'adapt'));
    assert.ok(f.some(x => x.rule === 'capacity'));
  });
  test('flags an incoherent capacity that does not climb (soft ≥ hard, or sweet > hard)', () => {
    assert.ok(auditComponentDesign({ adapt: { mode: 'native' }, capacity: { soft: 8, hard: 6 } }, 'section.x{}').some(x => x.rule === 'capacity' && /climb/.test(x.message)));
    assert.ok(auditComponentDesign({ adapt: { mode: 'native' }, capacity: { sweet: 9, hard: 8 } }, 'section.x{}').some(x => x.rule === 'capacity'));
  });
  test('a coherent manifest with a small sheet audits clean', () => {
    const f = auditComponentDesign({ adapt: { mode: 'native' }, capacity: { sweet: 4, soft: 6, hard: 8 } }, 'section.x{ color:var(--text-body) }');
    assert.equal(f.length, 0);
  });
  test('flags an oversized stylesheet (a smuggled data: payload)', () => {
    const big = 'section.x{ background:url("data:image/png;base64,' + 'A'.repeat(MAX_CSS_BYTES) + '") }';
    const f = auditComponentDesign({ adapt: { mode: 'native' }, capacity: { sweet: 4, soft: 6, hard: 8 } }, big);
    assert.ok(f.some(x => x.rule === 'css-size' && x.level === 'error'));
  });
});

describe('component-ai — dedup ranking', () => {
  const CATALOG = [
    { name: 'actors', bucket: 'inventory', description: 'Roster of responsibilities owned by named actors.', tags: ['ownership', 'roster'] },
    { name: 'kpi', bucket: 'inventory', description: 'Key metrics as big numbers.', tags: ['metrics', 'numbers'] },
    { name: 'quote', bucket: 'statement', description: 'A pull quote.', tags: ['quote'] },
  ];

  test('ranks a roster request toward `actors`, ignores unrelated components', () => {
    const hits = rankSimilar('a roster of who owns which responsibilities', CATALOG, { limit: 3 });
    assert.equal(hits[0].name, 'actors', 'the roster component ranks first');
    assert.ok(hits.every(h => h.score > 0), 'only positive-overlap matches surface');
    assert.ok(!hits.some(h => h.name === 'quote'), 'an unrelated component does not surface');
  });

  test('an empty or no-overlap query yields no suggestions (never a false nudge)', () => {
    assert.deepEqual(rankSimilar('', CATALOG), []);
    assert.deepEqual(rankSimilar('xyzzy plugh', CATALOG), []);
  });
});
