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
  FAMILY_MODIFIER_TOKENS,
} = require('../components');
const core = require('./lint-core');
const { FINISH_NAMES } = require('../core/resolve-finish');
const { layoutClasses } = require('../contracts');

// Recognized root modifiers that are neither universals nor declared layout
// variants — documented base aliases / structural tokens. (`heat` and `canvas`
// moved to FAMILY_MODIFIERS — family-scoped, accepted via FAMILY_MODIFIER_TOKENS
// below but suggested only on their in-scope components.)
const BASE_MODIFIERS = ['mirror', 'left', 'numbered', 'overflow', 'briefing', 'horizontal'];

// Map basemaps — the region/group vocabulary that feeds the `map` "did you
// mean" lint rule. Required directly (they're JSON); the geometry rides along
// but only the names are used here.
const MAP_BASEMAPS = {
  us: require('../components/chart/map/map.basemap.json'),
  world: require('../components/chart/map/map.basemap.world.json'),
};
const normMapName = (s) => String(s).toLowerCase().replace(/[.’']/g, '').replace(/\s+/g, ' ').trim();

/**
 * Build the `{ us, world }` map vocabulary lint-core's region rule consumes:
 * `valid` is every normalized name/code/alias/group the basemap resolves;
 * `names` is the canonical display labels (countries/states + group labels) the
 * "did you mean" suggests from. Pure data from the baked basemaps.
 */
function buildMapVocab() {
  const out = {};
  for (const [which, bm] of Object.entries(MAP_BASEMAPS)) {
    const valid = new Set();
    const names = [];
    for (const [id, r] of Object.entries(bm.regions)) {
      valid.add(normMapName(id));
      valid.add(normMapName(r.name));
      names.push(r.name);
    }
    for (const a of Object.keys(bm.aliases || {})) valid.add(normMapName(a));
    for (const [slug, g] of Object.entries(bm.groups || {})) {
      valid.add(normMapName(slug));
      valid.add(normMapName(g.label));
      for (const a of g.aliases || []) valid.add(normMapName(a));
      names.push(g.label);
    }
    out[which] = { valid, names };
  }
  return out;
}

/**
 * Build the recognized-token vocabulary from the live manifests: every component
 * name, and the union of every component's effective variants plus the
 * universal / semi-universal / base modifier vocabularies. Pass an explicit
 * `manifests` array to lint against a fixed catalog (tests). Returns
 * `{ names: Set, modifiers: Set, universalModifiers: Set, mapRegions,
 * finishNames }` — a superset of the `{ names, modifiers }` shape lintTextWith
 * consumes.
 */
function buildVocab(manifests) {
  const ms = manifests || loadAll();
  const names = new Set(ms.map((m) => m.name));
  // Contract-tier Layout classes (lib/contracts/) are recognized layout names
  // alongside components — a sibling tier, so `_class: layout-ledger` is known.
  for (const cls of layoutClasses()) names.add(cls);
  // The universals: modifiers any component accepts (base aliases + semi-
  // universals + the universal-variant decorations). Tracked on their own so the
  // editor's autocomplete can offer a component's own variants first and
  // universals after; `modifiers` stays the full union the linter validates.
  // Universals include multi-token decoration strings ('tint-corner at-tl');
  // split so each fragment registers.
  const universalModifiers = new Set([...BASE_MODIFIERS, ...SEMI_UNIVERSAL_VARIANTS]);
  for (const u of UNIVERSAL_VARIANTS) for (const t of u.split(/\s+/)) universalModifiers.add(t);
  const modifiers = new Set(universalModifiers);
  for (const m of ms) for (const v of effectiveVariants(m)) for (const t of v.split(/\s+/)) modifiers.add(t);
  // Family (scoped) modifiers — accepted by the linter everywhere; the
  // autocomplete scopes them per component via the catalog's `familyModifiers`.
  for (const t of FAMILY_MODIFIER_TOKENS) modifiers.add(t);
  return { names, modifiers, universalModifiers, mapRegions: buildMapVocab(), finishNames: [...FINISH_NAMES] };
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
  buildMapVocab,
  isKnownModifier: core.isKnownModifier,
  CLASS_DIRECTIVE: core.CLASS_DIRECTIVE,
  MODIFIER_PREFIXES: core.MODIFIER_PREFIXES,
  BASE_MODIFIERS,
};
