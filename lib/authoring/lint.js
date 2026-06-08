/**
 * Deck authoring linter — Node surface. The machine-checkable form of the
 * markdown footgun rules CLAUDE.md and the component docs warn about in prose.
 *
 * The actual checks live in the pure, browser-safe ./lint-core.js (the single
 * source, also re-exported by lib/components/index.js and run by the Drawing
 * Board's Architect panel). This module is the NODE binding: it builds the
 * name/modifier VOCABULARY from the live manifests, then delegates to
 * lintTextWith. tools/lint-deck.js is the CLI wrapper.
 *
 * Rules (severity): see lint-core.js. `lintText(source)` returns findings:
 *   { slide, rule, severity, classToken, line, message, fix }
 */

const {
  loadAll,
  effectiveVariants,
  UNIVERSAL_VARIANTS,
  SEMI_UNIVERSAL_VARIANTS,
} = require('../components');
const core = require('./lint-core');

// Recognized root modifiers that are neither universals nor declared layout
// variants — documented base aliases / structural tokens.
const BASE_MODIFIERS = ['mirror', 'left', 'numbered', 'heat', 'overflow', 'briefing', 'horizontal', 'canvas'];

/**
 * Build the recognized-token vocabulary from the live manifests: every component
 * name, and the union of every component's effective variants plus the
 * universal / semi-universal / base modifier vocabularies. Pass an explicit
 * `manifests` array to lint against a fixed catalog (tests). Returns
 * `{ names: Set, modifiers: Set }` — the shape lintTextWith consumes.
 */
function buildVocab(manifests) {
  const ms = manifests || loadAll();
  const names = new Set(ms.map((m) => m.name));
  const modifiers = new Set([...BASE_MODIFIERS, ...SEMI_UNIVERSAL_VARIANTS]);
  // Universals include multi-token decoration strings ('tint-corner at-tl');
  // split so each fragment registers.
  for (const u of UNIVERSAL_VARIANTS) for (const t of u.split(/\s+/)) modifiers.add(t);
  for (const m of ms) for (const v of effectiveVariants(m)) for (const t of v.split(/\s+/)) modifiers.add(t);
  return { names, modifiers };
}

/**
 * Lint deck source. `opts.vocab` (a `{ names, modifiers }` built by buildVocab)
 * or `opts.manifests` (a fixed catalog) override the default live-manifest vocab.
 */
function lintText(source, opts = {}) {
  const vocab = opts.vocab || buildVocab(opts.manifests);
  return core.lintTextWith(source, vocab);
}

module.exports = {
  lintText,
  buildVocab,
  isKnownModifier: core.isKnownModifier,
  CLASS_DIRECTIVE: core.CLASS_DIRECTIVE,
  MODIFIER_PREFIXES: core.MODIFIER_PREFIXES,
  BASE_MODIFIERS,
};
