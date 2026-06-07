/**
 * Deck authoring linter — the machine-checkable form of the markdown
 * footgun rules that CLAUDE.md and the component docs warn about in prose.
 *
 * The same knowledge exists in three places today: as prose in
 * lib/components/<bucket>/<name>/<name>.docs.md, as a commit-time gate in
 * test/unit/components/deck-authoring.test.js, and as the validator helpers
 * in lib/components/index.js. This module is the author-facing surface: a
 * pure `lintText(source)` an agent (or a human) runs on a *draft* deck to
 * get structured, fix-oriented diagnostics WITHOUT a full Chromium render —
 * the fast edit→check loop. tools/lint-deck.js is the CLI wrapper.
 *
 * Rules (severity in parens):
 *   1. unknown-class (warning) — a `_class` token that is neither a known
 *      component name nor a recognized modifier. Catches typos
 *      (`card-grid` → `cards-grid`, `cards_grid`).
 *   2. card-style-inline-title (error) — `- **Title.** body` on a card-style
 *      slide; the body inherits the parent li's bold. Reuses
 *      findInlineTitleBodyLine + CARD_STYLE_LAYOUTS.
 *   3. statement-ol-bold (error) — `**bold**` inside an ordered-list
 *      statement on a STATEMENT_OL_LAYOUTS slide; the counter grid splits
 *      the <strong> out of the row. Reuses findBoldOrderedStatement.
 *   4. split-bodyless-item (error) — a right-panel list item with no nested
 *      body on a SPLIT_SLOT_LAYOUTS slide; slotLabelLift only bolds the title
 *      when a nested body delimits it, so the item renders as flat text.
 *      Reuses findSplitBodylessItem.
 *   5. split-missing-headline (warning) — an h2-anchored split slide
 *      (split-panel / split-compare) with no `## ` line; the transform
 *      extracts the <h2> into the left panel, so the headline / hero number
 *      silently goes missing.
 *   6. split-statement-missing-quote (warning) — a split-panel `pullquote` slide with
 *      no `> ` blockquote; the left panel's pull-quote (its whole point) is
 *      empty.
 *   7. split-compare-option-count (warning) — a split-compare slide whose
 *      options list is not exactly two items; the transform always marks the
 *      2nd option `preferred` and assumes a two-up.
 *   8. number-slot-bodyless-item (warning) — a kpi/stats list item with no
 *      nested label/detail; the lift needs a nested body to fire, so the
 *      number won't render in display type. Reuses findSplitBodylessItem.
 *
 * Sibling implementations: the per-manifest equivalents of rules 2 & 3 run
 * in lib/components/index.js validate() against manifest.sample; this module
 * runs the same checks against arbitrary deck source.
 */

const {
  loadAll,
  effectiveVariants,
  UNIVERSAL_VARIANTS,
  SEMI_UNIVERSAL_VARIANTS,
  CARD_STYLE_LAYOUTS,
  STATEMENT_OL_LAYOUTS,
  SPLIT_SLOT_LAYOUTS,
  NUMBER_SLOT_LAYOUTS,
  findInlineTitleBodyLine,
  findBoldOrderedStatement,
  findSplitBodylessItem,
} = require('../components');

const CLASS_DIRECTIVE = /<!--\s*_class:\s*([^>]+?)\s*-->/;

// Modifier token families recognized by prefix — the decoration / position
// / state vocabularies whose fragments (`at-tl`, `tint-corner`, `mark-orbit`,
// `with-period`, `no-footer`, `tone-pass`, `treatment-none`, `checks-tonal`)
// are too many to enumerate and are not author-misspellable in a way worth
// flagging.
const MODIFIER_PREFIXES = ['tint-', 'mark-', 'with-', 'at-', 'no-', 'tone-', 'treatment-', 'checks-'];

// Recognized root modifiers that are neither universals nor declared
// layout variants — documented base aliases / structural tokens.
const BASE_MODIFIERS = ['mirror', 'left', 'numbered', 'heat', 'overflow', 'briefing', 'horizontal', 'canvas'];

/**
 * Build the recognized-token vocabulary from the live manifests: every
 * component name, and the union of every component's effective variants
 * plus the universal/semi-universal/base modifier vocabularies. Pass an
 * explicit `manifests` array to lint against a fixed catalog (tests).
 */
function buildVocab(manifests) {
  const ms = manifests || loadAll();
  const names = new Set(ms.map((m) => m.name));
  const modifiers = new Set([
    ...BASE_MODIFIERS,
    ...SEMI_UNIVERSAL_VARIANTS,
  ]);
  // Universals include multi-token decoration strings ('tint-corner at-tl');
  // split so each fragment registers.
  for (const u of UNIVERSAL_VARIANTS) for (const t of u.split(/\s+/)) modifiers.add(t);
  for (const m of ms) for (const v of effectiveVariants(m)) for (const t of v.split(/\s+/)) modifiers.add(t);
  return { names, modifiers };
}

/** True if `token` is a recognized modifier (set membership or prefix family). */
function isKnownModifier(token, vocab) {
  if (vocab.modifiers.has(token)) return true;
  return MODIFIER_PREFIXES.some((p) => token.startsWith(p));
}

/**
 * Lint deck source. Returns an array of findings:
 *   { slide, rule, severity, classToken, line, message, fix }
 * `slide` is the 1-based slide index (front matter is slide 0 and skipped).
 */
function lintText(source, opts = {}) {
  const vocab = opts.vocab || buildVocab(opts.manifests);
  const findings = [];
  const cardStyle = new Set(CARD_STYLE_LAYOUTS);
  const statementOl = new Set(STATEMENT_OL_LAYOUTS);
  const splitSlot = new Set(SPLIT_SLOT_LAYOUTS);
  const numberSlot = new Set(NUMBER_SLOT_LAYOUTS);
  // Split layouts whose left-panel anchor is an <h2> the transform extracts
  // (headline, or the split-panel `metric` hero number). The split-panel
  // `quote` variant is excluded — its anchor is a blockquote, so it
  // legitimately carries no `## `.
  const isH2AnchoredSplit = (tokens) =>
    (tokens.includes('split-panel') && !tokens.includes('pullquote')) ||
    tokens.includes('split-compare');
  // Split on slide separators (a line that is exactly `---`). The first
  // chunk is the YAML front matter; it carries no `_class` and is skipped.
  const slides = source.split(/^---$/m);

  slides.forEach((slide, idx) => {
    const m = slide.match(CLASS_DIRECTIVE);
    if (!m) return;
    const tokens = m[1].split(/\s+/).filter(Boolean);

    // Rule 1 — unknown class/modifier tokens.
    for (const t of tokens) {
      if (vocab.names.has(t)) continue;
      if (isKnownModifier(t, vocab)) continue;
      findings.push({
        slide: idx,
        rule: 'unknown-class',
        severity: 'warning',
        classToken: t,
        line: m[0],
        message: `'${t}' is not a known component or modifier`,
        fix: 'Check the spelling against dist/docs/components.json (component names) or design/design-system.md §6.5 (modifiers).',
      });
    }

    // Rule 2 — card-style inline title+body.
    if (tokens.some((t) => cardStyle.has(t))) {
      const offending = findInlineTitleBodyLine(slide);
      if (offending) {
        findings.push({
          slide: idx,
          rule: 'card-style-inline-title',
          severity: 'error',
          classToken: tokens.find((t) => cardStyle.has(t)),
          line: offending.trim(),
          message: 'inline "- **Title.** body" on a card-style slide — the body inherits the parent li bold',
          fix: 'Use the nested-list shape:\n    - Title\n      - body text',
        });
      }
    }

    // Rule 3 — bold inside an ordered-list statement.
    if (tokens.some((t) => statementOl.has(t))) {
      const offending = findBoldOrderedStatement(slide);
      if (offending) {
        findings.push({
          slide: idx,
          rule: 'statement-ol-bold',
          severity: 'error',
          classToken: tokens.find((t) => statementOl.has(t)),
          line: offending.trim(),
          message: 'a **bold** span inside an ordered-list statement splits the counter grid row',
          fix: 'Use a plain declarative statement (the layout already sets display weight).',
        });
      }
    }

    // Rule 4 — split right-panel item with no nested body.
    if (tokens.some((t) => splitSlot.has(t))) {
      const offending = findSplitBodylessItem(slide);
      if (offending) {
        findings.push({
          slide: idx,
          rule: 'split-bodyless-item',
          severity: 'error',
          classToken: tokens.find((t) => splitSlot.has(t)),
          line: offending.trim(),
          message: 'a right-panel item with no nested body on a split slide — the title won\'t render bold (slotLabelLift needs a nested body to lift)',
          fix: 'Use the nested-list shape:\n    - Title\n      - body text',
        });
      }
    }

    // Rule 5 — h2-anchored split slide with no `## ` headline.
    if (isH2AnchoredSplit(tokens) && !/^##\s/m.test(slide)) {
      const isMetric = tokens.includes('metric');
      const cls = tokens.find((t) => t === 'split-panel' || t === 'split-compare');
      findings.push({
        slide: idx,
        rule: 'split-missing-headline',
        severity: 'warning',
        classToken: cls,
        line: m[0],
        message: `'${cls}' has no '## ' headline — the transform lifts the <h2> into the left panel, so the headline${isMetric ? ' / hero number' : ''} renders empty`,
        fix: isMetric
          ? 'Add the hero number as an h2: `## 114*%*` (the `*…*` styles the unit).'
          : 'Add a `## Headline` line for the left panel.',
      });
    }

    // Rule 6 — split-panel `quote` variant with no blockquote pull-quote.
    if (tokens.includes('split-panel') && tokens.includes('pullquote') && !/^>\s/m.test(slide)) {
      findings.push({
        slide: idx,
        rule: 'split-statement-missing-quote',
        severity: 'warning',
        classToken: 'split-panel',
        line: m[0],
        message: 'split-panel `pullquote` has no `> ` blockquote — the left panel\'s pull-quote (the variant\'s whole point) renders empty',
        fix: 'Add the quotation as a blockquote: `> The quote worth half the slide.`',
      });
    }

    // Rule 7 — split-compare option count must be exactly two.
    if (tokens.includes('split-compare')) {
      const opts = slide.split('\n').filter((l) => /^([-*]|\d+\.)\s+\S/.test(l)).length;
      if (opts !== 2) {
        findings.push({
          slide: idx,
          rule: 'split-compare-option-count',
          severity: 'warning',
          classToken: 'split-compare',
          line: m[0],
          message: `split-compare expects exactly two options; found ${opts}. The layout always highlights the 2nd option as 'preferred' and assumes a two-up`,
          fix: 'Use exactly two top-level list items; the 2nd renders as the preferred/chosen option.',
        });
      }
    }

    // Rule 8 — kpi/stats number item with no nested label/detail.
    if (tokens.some((t) => numberSlot.has(t))) {
      const offending = findSplitBodylessItem(slide);
      if (offending) {
        findings.push({
          slide: idx,
          rule: 'number-slot-bodyless-item',
          severity: 'warning',
          classToken: tokens.find((t) => numberSlot.has(t)),
          line: offending.trim(),
          message: 'a kpi/stats item with no nested label — the number won\'t render in display type (the lift needs a nested body to fire)',
          fix: 'Use the nested shape:\n    1. 73%\n       - faster close',
        });
      }
    }
  });

  return findings;
}

module.exports = {
  lintText,
  buildVocab,
  isKnownModifier,
  CLASS_DIRECTIVE,
  MODIFIER_PREFIXES,
  BASE_MODIFIERS,
};
