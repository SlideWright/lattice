/**
 * Unit: the Lattice primer fed to Converse (the cloud tier). The model's edits
 * are only as good as what it knows about Lattice, so this proves the primer
 * lists real layouts grouped by bucket, carries the authoring footgun-rules, and
 * stays bounded. Pure string assembly — fully verifiable here.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../../../docs/src/playground/architect-knowledge.js');
}

const SAMPLE = [
  { name: 'title', bucket: 'anchor', summary: 'Opening slide.' },
  { name: 'cards-grid', bucket: 'inventory', summary: '2–4 parallel items.' },
  { name: 'agenda', bucket: 'inventory', summary: 'Auto-numbered TOC.' },
  { name: 'quote', bucket: 'statement', summary: 'A pulled quotation.' },
];

describe('buildLatticePrimer', () => {
  test('lists layouts grouped by bucket, with their one-line summaries', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /\[anchor\] title — Opening slide\./);
    assert.match(p, /\[inventory\].*cards-grid — 2–4 parallel items\./);
    // alphabetical within a bucket: agenda before cards-grid.
    assert.ok(p.indexOf('agenda') < p.indexOf('cards-grid'), 'sorted within bucket');
    // canonical bucket order: anchor before statement before inventory? No —
    // BUCKET_ORDER puts statement before inventory; anchor is first regardless.
    assert.ok(p.indexOf('[anchor]') < p.indexOf('[statement]'));
    assert.ok(p.indexOf('[statement]') < p.indexOf('[inventory]'));
  });

  test('carries the authoring footgun-rules (card-style nesting, title slide)', async () => {
    const { buildLatticePrimer, AUTHORING_RULES } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /NESTED bullets/);
    assert.match(p, /NEVER write inline `- \*\*Title\.\*\* body`/);
    assert.match(p, /title silent/);
    assert.match(p, /_class/);
    assert.ok(AUTHORING_RULES.length >= 4, 'the rules are exported for reuse');
  });

  test('uses the exact `_class` names and instructs the model to do the same', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /use the exact name in `_class`/);
  });

  test('a name without a summary still appears (no dangling dash)', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer([{ name: 'mystery', bucket: 'anchor' }]);
    assert.match(p, /\[anchor\] mystery(?!\s—)/);
  });

  test('empty / missing catalog degrades to just the rules (no throw)', async () => {
    const { buildLatticePrimer } = await load();
    assert.match(buildLatticePrimer([]), /Authoring rules:/);
    assert.match(buildLatticePrimer(null), /Authoring rules:/);
  });

  test('is bounded — maxComponents stops adding further buckets', async () => {
    const { buildLatticePrimer } = await load();
    // Three buckets of 5; a cap of 4 emits the first bucket then stops (the cap
    // is checked at bucket boundaries, so it never balloons past one extra group).
    const mk = (bucket) => Array.from({ length: 5 }, (_, i) => ({ name: `${bucket}${i}`, bucket, summary: 's' }));
    const many = [...mk('inventory'), ...mk('comparison'), ...mk('evidence')];
    const p = buildLatticePrimer(many, { maxComponents: 4 });
    assert.match(p, /\[inventory\]/);
    assert.doesNotMatch(p, /\[comparison\]/, 'capped before the second bucket');
    assert.match(p, /Authoring rules:/, 'rules always present');
  });
});
