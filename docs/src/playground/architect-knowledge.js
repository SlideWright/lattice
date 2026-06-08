// The Drawing Board — the Lattice primer for Converse (the cloud tier).
//
// A generic chat model knows that `decision` exists ("the verdict slide") but not
// HOW to author one — so it infers the structure and guesses wrong (real bug, seen
// on-device). This turns the catalog the Drawing Board already ships into a full
// authoring dossier: for every layout, its name + when-to-use + variants + slot
// contracts + the exact authoring SKELETON. The model copies the skeleton instead
// of guessing. Plus the cross-cutting authoring rules / base modifiers.
//
// Pure + bounded (~30 KB against the live 48-layout catalog). Injected ONLY into
// the rich (Puter/Claude) prompt — the small local model would drown in it, so its
// prompt stays lean (see buildChatMessages).

const BUCKET_ORDER = [
  'anchor', 'statement', 'inventory', 'comparison', 'progression',
  'evidence', 'imagery', 'chart', 'diagram', 'math', 'code', 'legal',
];

// The footguns that bite authors (and a model writing on their behalf) the most.
// Sourced from lib/base/base.docs.md + the card-style contract in lint-core.js.
export const AUTHORING_RULES = [
  'Author every slide as plain Markdown. Choose a layout with `<!-- _class: NAME -->` at the top of the slide; separate slides with a line containing only `---`.',
  'Use each layout’s skeleton below VERBATIM as the structure — match its heading levels and bullet nesting exactly. Do not invent a structure.',
  'Card-style layouts (cards-grid, cards-stack, featured, compare-prose, matrix-2x2, verdict-grid, decision, citation-card) take NESTED bullets — a top-level bullet is the card title, a nested bullet is its body. NEVER write inline `- **Title.** body` on these; the body would inherit the title’s bold.',
  'Title slides: `<!-- _class: title silent -->`, then a backtick-wrapped `eyebrow`, then an `# H1`, then a single plain subtitle paragraph — nothing more.',
  'Compose tokens on the class, space-separated: a layout’s own VARIANTS (listed with each layout, e.g. `list-steps timeline`) plus the cross-cutting BASE MODIFIERS — `dark`, `numbered`, `mirror`, `silent`, the `tint-*` / `mark-*` / `with-*` families, and the `tone-pass` / `tone-fail` / `tone-warn` / `tone-skip` state markers. Colours come from theme tokens — never author raw hex.',
  'Rich blocks are supported: ```chart (native charts), ```mermaid (25 diagram types), and $$…$$ (KaTeX math).',
];

// A generic "Slide heading."-style slot description adds nothing the skeleton
// doesn't already show — skip it so only the real authoring contracts survive.
const isGenericSlot = (d) => /^slide (heading|title)\.?$/i.test(String(d || '').trim());

// One layout's dossier block: name + when, its variants, the non-generic slot
// contracts, and the authoring skeleton (four-backtick fenced so a skeleton that
// itself contains ```chart / ```mermaid doesn't break the fence).
function layoutBlock(c) {
  const lines = [`### ${c.name}${c.summary ? ` — ${c.summary}` : ''}`];
  if (c.variants?.length) {
    lines.push(`Variants: ${c.variants.join(', ')} (append to the class, e.g. \`${c.name} ${c.variants[0]}\`).`);
  }
  for (const s of c.slots || []) {
    if (!s.description || isGenericSlot(s.description)) continue;
    lines.push(`- \`${s.name}\`${s.required ? '' : ' (optional)'}: ${s.description}`);
  }
  if (c.skeleton) lines.push(`\`\`\`\`\n${String(c.skeleton).trim()}\n\`\`\`\``);
  return lines.join('\n');
}

export function buildLatticePrimer(catalog) {
  const items = (catalog || []).filter((c) => c?.name);
  const byBucket = {};
  for (const c of items) (byBucket[c.bucket || 'other'] ||= []).push(c);
  const buckets = [...new Set([...BUCKET_ORDER, ...Object.keys(byBucket)])].filter((b) => byBucket[b]);

  const sections = buckets.map((b) => {
    const blocks = byBucket[b]
      .slice()
      .sort((x, y) => x.name.localeCompare(y.name))
      .map(layoutBlock);
    return `## ${b}\n\n${blocks.join('\n\n')}`;
  });

  return (
    'You know Lattice, the Markdown slide engine this deck is written in. Below is EVERY ' +
    'layout — its name, when to use it, its variants, slot contracts, and a skeleton showing ' +
    'exactly how to author it. Use the exact layout name in `_class`, and match the skeleton’s ' +
    'structure verbatim; never guess.\n\n' +
    sections.join('\n\n') +
    '\n\nAuthoring rules:\n' +
    AUTHORING_RULES.map((r) => `- ${r}`).join('\n')
  );
}
