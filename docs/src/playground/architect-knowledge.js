// The Drawing Board — the Lattice primer for Converse (the cloud tier).
//
// A generic chat model knows nothing about Lattice, so its advice is generic and
// it suggests layouts that don't exist. This turns the catalog the Drawing Board
// already ships (name + bucket + one-line description, same data the onboarding
// uses) into a compact reference the model can ground itself in — the available
// `_class` layouts plus the authoring rules that are the usual footguns.
//
// Pure + bounded. Injected ONLY into the rich (Puter/Claude) prompt — the small
// local model would drown in it, so its prompt stays lean (see buildChatMessages).

const BUCKET_ORDER = [
  'anchor', 'statement', 'inventory', 'comparison', 'progression',
  'evidence', 'imagery', 'chart', 'diagram', 'math', 'code', 'legal',
];

// The footguns that bite authors (and a model writing on their behalf) the most.
// Sourced from lib/base/base.docs.md + the card-style contract in lint-core.js.
export const AUTHORING_RULES = [
  'Author every slide as plain Markdown. Choose a layout with `<!-- _class: NAME -->` at the top of the slide; separate slides with a line containing only `---`.',
  'Card-style layouts (cards-grid, cards-stack, featured, compare-prose, matrix-2x2, verdict-grid, decision, citation-card) take NESTED bullets — a top-level bullet is the card title, a nested bullet is its body. NEVER write inline `- **Title.** body` on these; the body would inherit the title’s bold.',
  'Title slides: `<!-- _class: title silent -->`, then a backtick-wrapped `eyebrow`, then an `# H1`, then a single plain subtitle paragraph — nothing more.',
  'Modifiers compose on the class (space-separated): dark, numbered, mirror, tint-*, mark-*, with-*. Colours come from theme tokens — never author raw hex.',
  'Rich blocks are supported: ```chart (native charts), ```mermaid (25 diagram types), and $$…$$ (KaTeX math).',
];

// A compact, bucket-grouped catalog: "[bucket] name — one-line when; …".
export function buildLatticePrimer(catalog, { maxComponents = 80 } = {}) {
  const items = (catalog || []).filter((c) => c?.name);
  const byBucket = {};
  for (const c of items) (byBucket[c.bucket || 'other'] ||= []).push(c);
  const buckets = [...new Set([...BUCKET_ORDER, ...Object.keys(byBucket)])].filter((b) => byBucket[b]);

  const lines = [];
  let count = 0;
  for (const b of buckets) {
    if (count >= maxComponents) break;
    const names = byBucket[b]
      .slice()
      .sort((x, y) => x.name.localeCompare(y.name))
      .map((c) => (c.summary ? `${c.name} — ${c.summary}` : c.name));
    count += names.length;
    lines.push(`[${b}] ${names.join('; ')}`);
  }

  return (
    'You know Lattice, the Markdown slide engine this deck is written in.\n\n' +
    'Layouts available — use the exact name in `_class` (grouped by bucket):\n' +
    lines.join('\n') +
    '\n\nAuthoring rules:\n' +
    AUTHORING_RULES.map((r) => `- ${r}`).join('\n')
  );
}
