/**
 * Unit: the Lattice authoring dossier fed to Converse (the cloud tier). The model
 * was guessing layout structure (e.g. authoring `decision` as flat Markdown) because
 * it only had one-line descriptions. This proves the primer now carries, per layout,
 * the skeleton + variants + slot contracts — so the model copies, not guesses — plus
 * the cross-cutting authoring rules. Pure string assembly → fully verifiable here.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../../../docs/src/playground/architect-knowledge.js');
}

const SAMPLE = [
  { name: 'title', bucket: 'anchor', summary: 'Opening slide.', skeleton: '<!-- _class: title silent -->\n\n`eyebrow`\n\n# Heading',
    slots: [{ name: 'title', required: true, description: 'Slide heading.' }] }, // generic → skipped
  { name: 'quote', bucket: 'statement', summary: 'A pulled quotation.' },
  { name: 'agenda', bucket: 'inventory', summary: 'Auto-numbered TOC.' },
  { name: 'decision', bucket: 'comparison', summary: 'The verdict slide.',
    skeleton: '<!-- _class: decision -->\n\n## Heading\n\n- Chosen path\n  - rationale',
    variants: ['banner-tag'],
    slots: [
      { name: 'title', required: true, description: 'Slide heading.' }, // generic → skipped
      { name: 'options', required: true, description: 'Top-level bullet is the option name; an indented bullet carries the rationale.' },
    ] },
];

describe('buildLatticePrimer — the authoring dossier', () => {
  test('emits a per-layout block: ## bucket then ### name — summary', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /## anchor\n/);
    assert.match(p, /### title — Opening slide\./);
    assert.match(p, /### decision — The verdict slide\./);
    // canonical bucket order: anchor < statement < inventory < comparison.
    assert.ok(p.indexOf('## anchor') < p.indexOf('## statement'));
    assert.ok(p.indexOf('## statement') < p.indexOf('## inventory'));
    assert.ok(p.indexOf('## inventory') < p.indexOf('## comparison'));
  });

  test('includes the authoring SKELETON (four-backtick fenced) so the model copies it', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /````\n<!-- _class: decision -->/);
    assert.match(p, /- Chosen path\n {2}- rationale/); // the nested structure is shown verbatim
  });

  test('lists a layout’s variants with a compose example', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /Variants: banner-tag \(append to the class, e\.g\. `decision banner-tag`\)\./);
  });

  test('carries real slot contracts but skips generic "Slide heading." slots', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /`options`: Top-level bullet is the option name; an indented bullet carries the rationale\./);
    assert.doesNotMatch(p, /`title`: Slide heading\./); // generic, the skeleton already shows it
  });

  test('intro instructs exact `_class` names + skeleton-verbatim, never guess', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /You know Lattice/);
    assert.match(p, /exact layout name in `_class`/);
    assert.match(p, /never guess/);
  });

  test('carries the footgun rules (card-style nesting, title slide, base modifiers)', async () => {
    const { buildLatticePrimer, AUTHORING_RULES } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /NESTED bullets/);
    assert.match(p, /NEVER write inline `- \*\*Title\.\*\* body`/);
    assert.match(p, /title silent/);
    assert.match(p, /BASE MODIFIERS/);
    assert.match(p, /tone-pass/); // state markers enumerated
    assert.ok(AUTHORING_RULES.length >= 5, 'rules exported for reuse');
  });

  test('a layout with no skeleton/variants/slots still appears (name + summary)', async () => {
    const { buildLatticePrimer } = await load();
    const p = buildLatticePrimer(SAMPLE);
    assert.match(p, /### quote — A pulled quotation\./);
  });

  test('empty / missing catalog degrades to just the rules (no throw)', async () => {
    const { buildLatticePrimer } = await load();
    assert.match(buildLatticePrimer([]), /Authoring rules:/);
    assert.match(buildLatticePrimer(null), /Authoring rules:/);
  });
});
