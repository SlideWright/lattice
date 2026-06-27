#!/usr/bin/env node
/**
 * Ownership / collision guard for the Lattice build.
 *
 * Several Lattice layers intentionally "share shape": every theme defines
 * the same token names, several transformers compose on the same slide
 * class, and every component CSS file scopes its rules under a class. That
 * shared shape is a feature — until two things claim the same name *by
 * accident*, at which point the loser is silently clobbered (last theme
 * wins, last transformer wins, last `<name>.styles.css` of a duplicated
 * name wins). The single-canonical-file build makes those clobbers
 * invisible, so this guard makes them loud instead: it hard-fails the
 * build on any unexpected collision, and forces intentional co-ownership
 * to be declared in an explicit allow-list below.
 *
 * Checks (all hard-fail):
 *   1. Transformer names are unique across the registry.
 *   2. A layout token owned by >1 transformer must be allow-listed in
 *      CO_OWNED_LAYOUTS (the image scrim/asset/text-panel trio is the
 *      one legitimate case today).
 *   3. Component names are unique across buckets (the CSS bundler and the
 *      docs generator both key by name; a duplicate silently drops one).
 *   4. No top-level selector is defined by more than one component's
 *      `<name>.styles.css`. Two files defining the same selector is the
 *      literal clobber: once concatenated into dist/lattice.css, the
 *      later one wins silently. Intentional duplicates go in
 *      SHARED_SELECTORS. (Self-scoping under `.<name>` is encouraged but
 *      not enforced — chart components legitimately restyle generated
 *      mermaid / function-plot SVG classes under `section`.)
 *   5. Every base palette (a theme that `@import 'lattice'`) defines the
 *      core token contract REQUIRED_THEME_TOKENS. Themes deliberately
 *      inherit most engine defaults from lattice.css `:root` and override
 *      selectively; only the core surface tokens are mandatory. A missing
 *      core token means the palette silently renders on engine defaults.
 *   6. Every layout variant a component actually implements — a modifier
 *      class chained onto its root element, or a name in its transform's
 *      dispatch array — is declared in the manifest `variants[]`. An
 *      undeclared variant is invisible: the docs/gallery generator only
 *      surfaces variants[] ∩ variantDocs, so the variant ships with no
 *      docs entry, no gallery slide, and no regression PDF (the drift
 *      that stranded radar/quadrant/word-cloud's variant catalogs).
 *      Structural root classes and documented aliases are escape-hatched
 *      via STRUCTURAL_ROOT_CLASSES / VARIANT_DECL_IGNORE.
 *
 * Usage:
 *   node tools/check-ownership.js            # report; exit 1 on any collision
 *   node tools/check-ownership.js --json     # machine-readable report
 *
 * Pure-ish: reads the manifests, the transformer registry, the component
 * CSS files, and themes/. No writes. Wired into `npm run build` and the
 * pre-commit hook.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
  loadAll, manifestBucket, BUCKETS,
  UNIVERSAL_VARIANTS, SEMI_UNIVERSAL_VARIANTS, TAGS,
} = require('../lib/components');
const { TRANSFORMERS } = require('../lib/transformers/registry');
const { PAIRS: TOKEN_CROSSWALK } = require('../lib/tokens/crosswalk');

const ROOT = path.join(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'lib', 'components');
const THEMES_DIR = path.join(ROOT, 'themes');
const LIB_DIR = path.join(ROOT, 'lib');
// Layout-specific variants are styled in two places: a component's own
// <name>.styles.css, AND the shared base.modifiers.css (where the cross-
// cutting modifier block lives — e.g. obligation-matrix .pills/.lanes,
// split-panel/cards-stack .mirror). checkVariantDeclaration scans both so a
// variant defined only in base.modifiers can't go undeclared.
const BASE_MODIFIERS_CSS = path.join(ROOT, 'lib', 'base', 'base.modifiers.css');

// ── Allow-lists: declared, intentional shared shape ──────────────────────

// Layout class tokens legitimately owned by more than one transformer.
// The three image transformers compose on the same `image` slide: the
// asset places the <img>, the scrim overlays a gradient, the text-panel
// wraps the prose. They are designed to co-fire — see
// lib/transformers/registry.js and the image component docs.
const CO_OWNED_LAYOUTS = new Set(['image']);

// Top-level selectors that more than one component is allowed to define
// (normalized: whitespace collapsed to single spaces). Each entry is a
// documented, intentional shared rule — without it the duplicate-selector
// check hard-fails. Empty today: no two component files define the same
// selector. Populate only for a deliberate shared treatment.
const SHARED_SELECTORS = new Set([]);

// Class tokens that sit on a component's root element but are NOT
// author-facing layout variants — so checkVariantDeclaration must not
// demand a `variants[]` entry for them. Two legitimate kinds:
//   - the bare-default modifier a layout documents as "this IS the
//     default appearance" (kpi `briefing`),
//   - a preserved legacy spelling that aliases a declared variant
//     (image `left` → `mirror`).
// Keyed by component name → set of ignored root-class tokens. Add an
// entry only with a one-line justification; the default expectation is
// that every root modifier is a declared variant.
const VARIANT_DECL_IGNORE = new Map([
  ['kpi', new Set(['briefing'])],            // bare default appearance, documented as such
  ['image', new Set(['left'])],              // legacy alias of `mirror` (base.modifiers.css)
  ['state-chart', new Set(['horizontal'])],  // documented back-compat alias of `lr inline`
  ['word-cloud', new Set(['canvas'])],        // chart-family-wide surface modifier, not a word-cloud-specific variant
]);

// Class tokens that may appear chained onto a component's root element
// but are shared structural scaffolding, not author-selectable variants.
// `chart-frame` is the wrapper the chart family applies to every chart
// section (section.<chart>.chart-frame); it is engine chrome, present on
// every chart regardless of variant.
// `lat-split-cards` is the cover-cards body marker the auto-split kernel stamps on a
// reshaped (transposed-to-cards) split page — engine chrome, not an author variant, exactly
// parallel to the `lat-split-native` cover-paginate body marker.
const STRUCTURAL_ROOT_CLASSES = new Set(['chart-frame', 'lat-split-cards', 'lat-split-native']);

// Search tags that legitimately apply to exactly ONE component — a
// genuinely-unique idiom or material with no sibling that shares it
// (`spider` is radar's alone; `formula` is math's alone). Every OTHER tag
// must be used by ≥2 components so the search facets cluster; a new
// singleton is almost always a typo or a tag that should be reused. Add an
// entry here only with that justification. The default expectation is reuse.
const SINGLETON_TAGS = new Set([
  'formula',    // math — typeset equations
  'donut',      // piechart — the donut idiom
  'spider',     // radar — the spider/radar idiom
  'tag-cloud',  // word-cloud — the tag-cloud idiom
  'org-chart',  // diagram — org-chart idiom
  'themes',     // word-cloud — recurring themes/terms
  'definition', // glossary — term definitions
  'states',     // state-chart — state machine states
  'section-break', // divider — section-boundary idiom (was shared with subtopic, merged into divider.light 2026-06-07)
]);

// Core token contract every base palette must define directly. These are
// the surface tokens the portal and base layout consume without an engine
// fallback; everything else a theme may inherit from lattice.css `:root`.
const REQUIRED_THEME_TOKENS = Object.freeze([
  '--bg', '--bg-alt', '--border',
  '--text-heading', '--text-body', '--text-secondary', '--text-muted',
  '--accent', '--accent-soft', '--surface-inverse',
]);

// HARD RULE #4: typography is a CLOSED 12-token, role-named `--fs-*` system
// (engineering/typography.md §1) — never t-shirt sizes (`--fs-md`/`--fs-lg`) or
// any ad-hoc name. `--fs-scale` is the cqi scale base the 12 derive from. A new
// `--fs-*` DECLARATION outside this set is the regression this gate blocks;
// adding a 13th role token is a deliberate act that updates this list + the doc.
const CANONICAL_FS_TOKENS = Object.freeze(new Set([
  '--fs-meta', '--fs-body-compact', '--fs-body', '--fs-message', '--fs-emphasis',
  '--fs-h1', '--fs-h2', '--fs-h3', '--fs-h4', '--fs-h5', '--fs-h6',
  '--fs-hero',
  '--fs-scale',
]));

// ── Selector parsing (paren-aware) ────────────────────────────────────────

/** Strip /* *​/ comments. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Extract the top-level style-rule selector preludes from a stylesheet.
 * Walks character by character tracking brace depth and paren depth so
 * commas and braces inside :is(...) / :where(...) / [attr] don't confuse
 * the scan. Selectors inside @media / @supports blocks are included (they
 * still need to be scoped); the bodies of @keyframes / @font-face are not
 * style rules and are skipped.
 *
 * Returns an array of selector-list strings (one per `{`), each still
 * comma-joined; split with splitTopLevel() for individual selectors.
 */
function topLevelSelectors(css) {
  const clean = stripComments(css);
  const selectors = [];
  let buf = '';
  let paren = 0;
  // Stack of block kinds: 'atSkip' (keyframes/font-face — ignore inner
  // rule preludes) or 'rule'/'atNest' (media/supports — collect inner).
  const stack = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '(') paren++;
    else if (ch === ')') paren--;

    if (paren > 0) {
      buf += ch;
      continue;
    }

    if (ch === '{') {
      const prelude = buf.trim();
      buf = '';
      const insideSkip = stack.includes('atSkip');
      if (prelude.startsWith('@')) {
        const name = prelude.slice(1).split(/[\s({]/)[0].toLowerCase();
        stack.push(name === 'keyframes' || name === 'font-face' ? 'atSkip' : 'atNest');
      } else {
        if (prelude && !insideSkip) selectors.push(prelude);
        stack.push('rule');
      }
    } else if (ch === '}') {
      buf = '';
      stack.pop();
    } else if (ch === ';' && stack[stack.length - 1] !== 'rule') {
      // A declaration terminator outside a rule body (e.g. an @import
      // prelude) — reset the prelude buffer.
      buf = '';
    } else {
      buf += ch;
    }
  }
  return selectors;
}

/** Split a selector list on top-level commas (paren-aware). */
function splitTopLevel(s) {
  const parts = [];
  let depth = 0;
  let bracket = 0;
  let buf = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    if (ch === ',' && depth === 0 && bracket === 0) {
      parts.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/** Every `.class` token in a selector. */
function classTokens(selector) {
  return [...selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
}

/**
 * `.class` tokens at the top level of a compound selector — i.e. chained
 * directly onto the element, ignoring anything inside a functional
 * pseudo-class like `:not(...)`, `:has(...)`, `:is(...)`. Used to find
 * modifier classes without mistaking a `:not(:has(.foo))` presence check
 * for a modifier.
 */
function topLevelClassTokens(compound) {
  let depth = 0;
  let outside = '';
  for (const ch of compound) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0) outside += ch;
  }
  return classTokens(outside);
}

/**
 * True if `selector` is scoped to component `name`: it references a class
 * token that is either exactly `<name>` or in the component's BEM
 * namespace `<name>-*` (e.g. `gantt` owns `.gantt`, `.gantt-chart`,
 * `.gantt-lane`). Token-exact so `image` does not match `imagery`.
 */
function isScopedTo(selector, name) {
  return classTokens(selector).some((c) => c === name || c.startsWith(`${name}-`));
}

/**
 * Split a complex selector into its compound selectors on the top-level
 * combinators (descendant whitespace, `>`, `+`, `~`), paren- and
 * bracket-aware so `:is(a > b)` / `[attr~="x y"]` stay intact. Each
 * returned string is the run of simple selectors targeting one element.
 */
function splitCompounds(selector) {
  const compounds = [];
  let depth = 0;
  let bracket = 0;
  let buf = '';
  const flush = () => {
    if (buf.trim()) compounds.push(buf.trim());
    buf = '';
  };
  for (const ch of selector) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    if (depth === 0 && bracket === 0 && (ch === '>' || ch === '+' || ch === '~' || /\s/.test(ch))) {
      flush();
      continue;
    }
    buf += ch;
  }
  flush();
  return compounds;
}

/**
 * Layout-specific modifier class tokens a component's CSS applies to its
 * own root element — i.e. classes chained directly onto `.<name>`
 * (`section.<name>.<modifier>`), excluding the name, its `<name>-*` BEM
 * namespace, and the universal / semi-universal modifier vocabularies.
 * Descendant/structural classes (`.<name> .cell`) and attribute-driven
 * variants (`[data-variant="x"]`) are intentionally not returned here —
 * structural classes are not author modifiers, and attribute variants
 * come from the transform array instead (see transformModifierTokens).
 */
function cssRootModifierTokens(css, name) {
  const universal = new Set([...UNIVERSAL_VARIANTS, ...SEMI_UNIVERSAL_VARIANTS]);
  const mods = new Set();
  for (const list of topLevelSelectors(css)) {
    for (const sel of splitTopLevel(list)) {
      for (const compound of splitCompounds(sel)) {
        // Only classes at the top level of the compound are chained
        // modifiers; classes nested inside `:not(:has(.x))` / `:is(...)`
        // reference descendants or presence conditions, not modifiers.
        const tokens = topLevelClassTokens(compound);
        if (!tokens.includes(name)) continue; // not the component's root element
        for (const t of tokens) {
          if (t === name || t.startsWith(`${name}-`)) continue;
          if (universal.has(t)) continue;
          if (STRUCTURAL_ROOT_CLASSES.has(t)) continue;
          mods.add(t);
        }
      }
    }
  }
  return mods;
}

/** Locate a component's <name>.transform.js across the bucket-nested tree. */
function componentTransformPath(m) {
  const bucket = manifestBucket(m);
  const candidates = [
    path.join(COMPONENTS_DIR, bucket, m.name, `${m.name}.transform.js`),
    path.join(COMPONENTS_DIR, m.name, `${m.name}.transform.js`),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/**
 * Variant names a transform branches on, read from its
 * `const *_MODIFIERS = [...]` / `*_VARIANTS = [...]` array literals.
 * Source-text scan (no eval) — these arrays are the canonical list a
 * transform dispatches over (e.g. RADAR_MODIFIERS, QUADRANT_MODIFIERS).
 */
function transformModifierTokens(src) {
  const universal = new Set([...UNIVERSAL_VARIANTS, ...SEMI_UNIVERSAL_VARIANTS]);
  const mods = new Set();
  const arrays = src.matchAll(/\b(?:const|let|var)\s+\w*(?:MODIFIERS|VARIANTS)\s*=\s*\[([^\]]*)\]/g);
  for (const arr of arrays) {
    for (const lit of arr[1].matchAll(/['"]([\w-]+)['"]/g)) {
      if (!universal.has(lit[1])) mods.add(lit[1]);
    }
  }
  return mods;
}

/**
 * Cross-check: every layout variant a component actually implements —
 * in its CSS (root-element modifier classes) or its transform (the
 * dispatch array) — must be declared in the manifest `variants[]`, or
 * the docs/gallery generator silently omits it (the radar/quadrant/
 * word-cloud drift class). The inverse (declared-but-unimplemented) is
 * left to manual review; this guard only catches the invisible-variant
 * case. False positives are escape-hatched via VARIANT_DECL_IGNORE.
 */
function checkVariantDeclaration(manifests, errors) {
  const baseModifiersCss = fs.existsSync(BASE_MODIFIERS_CSS)
    ? fs.readFileSync(BASE_MODIFIERS_CSS, 'utf8')
    : '';
  for (const m of manifests) {
    const declared = new Set(Array.isArray(m.variants) ? m.variants : []);
    const ignore = VARIANT_DECL_IGNORE.get(m.name) || new Set();
    const implemented = new Set();

    const cssPath = componentStylesPath(m);
    if (cssPath) {
      for (const t of cssRootModifierTokens(fs.readFileSync(cssPath, 'utf8'), m.name)) {
        implemented.add(t);
      }
    }
    // Also scan the shared modifier stylesheet — many layout variants
    // (e.g. obligation-matrix .pills/.lanes) are defined there, not in the
    // component's own CSS, and would otherwise escape the check.
    for (const t of cssRootModifierTokens(baseModifiersCss, m.name)) {
      implemented.add(t);
    }
    const txPath = componentTransformPath(m);
    if (txPath) {
      for (const t of transformModifierTokens(fs.readFileSync(txPath, 'utf8'))) {
        implemented.add(t);
      }
    }

    const missing = [...implemented]
      .filter((v) => !declared.has(v) && !ignore.has(v))
      .sort();
    if (missing.length) {
      errors.push(
        `component "${m.name}" implements variant(s) absent from its manifest "variants": ${missing.join(', ')}. ` +
        `Declare each in "variants" with a matching "variantDocs" entry so the docs/gallery generator surfaces it; ` +
        `if a token is internal structure rather than an author modifier, add it to VARIANT_DECL_IGNORE in tools/check-ownership.js.`,
      );
    }
  }
}

/**
 * Cross-check the search-tag vocabulary CLUSTERS. Per-manifest validity
 * (membership in the controlled vocabulary, the complementary rule, the
 * 3-5 count) is already enforced by validate() at load time; this guard
 * adds the cross-component property that vocabulary alone can't express:
 *
 *   - Every tag used by exactly one component must be allow-listed in
 *     SINGLETON_TAGS. An un-allow-listed singleton is the tag-equivalent
 *     of the invisible-variant drift — a one-off term that fragments
 *     search instead of clustering it (the author searches `roadmap` and
 *     finds nothing because the lone tag was `roadmapping`).
 *   - No vocabulary term may be DEAD (used by zero components). Dead
 *     vocabulary is noise the next author has to wade through; prune it
 *     from TAG_GROUPS or assign it.
 */
function checkTagClustering(manifests, errors) {
  const usage = new Map();
  for (const t of TAGS) usage.set(t, 0);
  for (const m of manifests) {
    if (!Array.isArray(m.tags)) continue;
    for (const t of m.tags) usage.set(t, (usage.get(t) || 0) + 1);
  }
  const singletons = [];
  const dead = [];
  for (const [t, n] of usage) {
    if (n === 0) dead.push(t);
    else if (n === 1 && !SINGLETON_TAGS.has(t)) singletons.push(t);
  }
  if (singletons.length) {
    errors.push(
      `search tag(s) used by exactly one component: ${singletons.sort().join(', ')}. ` +
      `A tag must cluster (≥2 components) so the docs-portal filter groups, not fragments. ` +
      `Reuse the tag on a sibling component, or — if it is genuinely unique to one layout — ` +
      `add it to SINGLETON_TAGS in tools/check-ownership.js with a one-line justification.`,
    );
  }
  if (dead.length) {
    errors.push(
      `tag vocabulary term(s) used by no component: ${dead.sort().join(', ')}. ` +
      `Dead vocabulary is search noise — assign each term to a component or remove it from TAG_GROUPS in lib/components/index.js.`,
    );
  }
}

// ── Theme token parsing ────────────────────────────────────────────────────

function parseThemeTokens(css) {
  const clean = stripComments(css);
  const names = new Set();
  for (const m of clean.matchAll(/(--[\w-]+)\s*:/g)) names.add(m[1]);
  return names;
}

/** Base palettes: theme files that `@import 'lattice'`. */
function listBasePalettes() {
  const out = [];
  for (const file of fs.readdirSync(THEMES_DIR).sort()) {
    if (!file.endsWith('.css')) continue;
    const css = fs.readFileSync(path.join(THEMES_DIR, file), 'utf8');
    if (!/@import\s+['"]lattice['"]/.test(css)) continue;
    out.push({ name: file.replace(/\.css$/, ''), tokens: parseThemeTokens(css) });
  }
  return out;
}

// ── Checks ──────────────────────────────────────────────────────────────────

function checkTransformerNames(errors) {
  const seen = new Map();
  for (const t of TRANSFORMERS) {
    if (!t.name) {
      errors.push(`transformer with no name: ${JSON.stringify(t.selector || t)}`);
      continue;
    }
    if (seen.has(t.name)) {
      errors.push(`duplicate transformer name "${t.name}" — names must be unique across the registry.`);
    }
    seen.set(t.name, t);
  }
}

function checkLayoutOwnership(errors) {
  const owners = new Map(); // layout token → [transformer names]
  for (const t of TRANSFORMERS) {
    const layouts = Array.isArray(t.layouts) ? t.layouts : [];
    for (const raw of layouts) {
      // Normalize 'image.full' → base token 'image' for co-ownership.
      const token = String(raw).split('.')[0];
      if (!owners.has(token)) owners.set(token, []);
      owners.get(token).push(t.name);
    }
  }
  for (const [token, names] of owners) {
    const distinct = [...new Set(names)];
    if (distinct.length > 1 && !CO_OWNED_LAYOUTS.has(token)) {
      errors.push(
        `layout "${token}" is claimed by multiple transformers (${distinct.join(', ')}). ` +
        `If this co-ownership is intentional, add "${token}" to CO_OWNED_LAYOUTS in tools/check-ownership.js; ` +
        `otherwise one transformer's transform silently clobbers the other.`,
      );
    }
  }
}

function checkComponentNames(manifests, errors) {
  const seen = new Map(); // name → bucket
  for (const m of manifests) {
    const bucket = manifestBucket(m);
    if (seen.has(m.name)) {
      errors.push(
        `duplicate component name "${m.name}" in buckets "${seen.get(m.name)}" and "${bucket}". ` +
        `The CSS bundler and docs generator key by name; a duplicate silently drops one.`,
      );
    }
    seen.set(m.name, bucket);
  }
}

/** Locate a component's <name>.styles.css across the bucket-nested tree. */
function componentStylesPath(m) {
  const bucket = manifestBucket(m);
  const candidates = [
    path.join(COMPONENTS_DIR, bucket, m.name, `${m.name}.styles.css`),
    path.join(COMPONENTS_DIR, m.name, `${m.name}.styles.css`),
    path.join(COMPONENTS_DIR, m.name, 'styles.css'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function checkComponentCss(manifests, errors) {
  const owners = new Map(); // normalized selector → Set<component name>
  for (const m of manifests) {
    const cssPath = componentStylesPath(m);
    if (!cssPath) continue;
    const css = fs.readFileSync(cssPath, 'utf8');
    const local = new Set();
    for (const list of topLevelSelectors(css)) {
      for (const sel of splitTopLevel(list)) {
        if (!sel) continue;
        local.add(sel.replace(/\s+/g, ' '));
      }
    }
    for (const sel of local) {
      if (!owners.has(sel)) owners.set(sel, new Set());
      owners.get(sel).add(m.name);
    }
  }
  for (const [sel, comps] of owners) {
    if (comps.size > 1 && !SHARED_SELECTORS.has(sel)) {
      errors.push(
        `selector "${sel}" is defined by multiple components (${[...comps].join(', ')}). ` +
        `Concatenated into dist/lattice.css, the later component's rule silently clobbers the earlier. ` +
        `If the shared rule is intentional, add the selector to SHARED_SELECTORS in tools/check-ownership.js.`,
      );
    }
  }
}

// Recursively list every .css file under a directory.
function listCssFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listCssFiles(p, out);
    else if (e.name.endsWith('.css')) out.push(p);
  }
  return out;
}

// Post-flip token-tier lint (universal-token canonical flip, ADR §11.5).
// The legacy per-theme vocabulary is retired; this keeps it retired and bans
// the naming anti-pattern that motivated the flip:
//   1. No DECLARATION may reuse a retired name (the crosswalk `old` side) —
//      a regression reintroducing `--c1-light` / `--c-stroke` / `--bg-dark` /
//      `--scale-500` / `--dark-*` fails the build.
//   2. No token NAME may end in a color-scheme word `-light` / `-dark` — that
//      tier-suffix overload (a TIER named like the color-scheme + light-dark())
//      is exactly what the flip eliminated. Color-scheme lives only inside the
//      light-dark() VALUE; `--scheme-dark-*` / `--on-dark-*` carry "dark" as a
//      role PREFIX (they don't end in it), so they pass.
// Comments are stripped first, so historical "(was --bg-dark)" notes don't trip.
const RETIRED_TOKEN_NAMES = new Set(TOKEN_CROSSWALK.map((p) => `--${p.old}`));

function checkRetiredTokenNames(errors) {
  const files = [...listCssFiles(LIB_DIR), ...listCssFiles(THEMES_DIR)];
  for (const file of files) {
    const css = stripComments(fs.readFileSync(file, 'utf8'));
    const rel = path.relative(ROOT, file);
    const seen = new Set();
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
      const name = m[1];
      if (seen.has(name)) continue;
      seen.add(name);
      if (RETIRED_TOKEN_NAMES.has(name)) {
        errors.push(
          `retired token "${name}" is declared in ${rel} — the canonical flip retired it ` +
          `(lib/tokens/crosswalk.js). Use its universal name (see the crosswalk / ADR §7).`,
        );
      } else if (/-(light|dark)$/.test(name)) {
        errors.push(
          `token "${name}" in ${rel} ends in a color-scheme word (-light/-dark) — the retired ` +
          `tier-suffix anti-pattern. Name it for its ROLE; color-scheme lives in the light-dark() value.`,
        );
      }
    }
  }
}

// Pure core for HARD RULE #4: the non-canonical `--fs-*` names DECLARED in a CSS
// string (declarations only — `--fs-x:` — so `var(--fs-h${n})` usages and prose
// never trip it). Comments must already be stripped by the caller.
function nonCanonicalFsTokens(css) {
  const out = [];
  const seen = new Set();
  for (const m of css.matchAll(/(--fs-[a-z0-9-]+)\s*:/g)) {
    const name = m[1];
    if (seen.has(name)) continue;
    seen.add(name);
    if (!CANONICAL_FS_TOKENS.has(name)) out.push(name);
  }
  return out;
}

// Pure core for HARD RULE #12: does this CSS use `:not(…:has(…))` / `:is(…:has(…))`?
// Matches `:not(`/`:is(` whose argument (up to the next rule boundary) contains
// `:has(` — `:not(:has(`, `:is(:has(`, `:not(.foo:has(`. A bare `:has()` does not
// match (the breakage is specifically the :not/:is-wrapped form). Strip comments first.
function hasNotHasSelector(css) {
  return /:(?:not|is)\([^{}]*?:has\(/.test(css);
}

// Pure core for HARD RULE #20: the NONZERO `margin` declarations in a stylesheet.
// `margin` lives outside the box, so it is invisible to getBoundingClientRect() /
// offsetHeight AND it margin-collapses — both corrupt the height math a measuring
// layout (virtual lists, the Fit Spine) depends on. Space with `padding` (inside the
// box) and `gap` (between flex/grid children), which measure cleanly. An all-zero
// reset (`margin: 0`, `margin: 0 0`) adds no space and so can't distort measurement —
// it is exempt; everything else (lengths, `auto`, negatives) is an offending margin.
// The `(?<![\w.-])` guard keeps `scroll-margin*` from matching (the `-`) AND the `.margin`
// VARIANT-CLASS selector `section.x.margin:is(…)` from reading as a `margin:` property (the
// `.`); the longhand-suffix whitelist keeps `margin-trim` (and any other `margin-*`) out.
// Strip comments first. See engineering/gotchas.md.
const MARGIN_PROP =
  /(?<![\w.-])margin(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?\s*:\s*([^;}{]+)/g;

function offendingMargins(css) {
  const out = [];
  for (const m of css.matchAll(MARGIN_PROP)) {
    const value = m[1].replace(/!important/g, '').trim();
    if (!value) continue;
    const allZero = value.split(/\s+/).every((t) => /^0[a-z%]*$/.test(t));
    if (!allZero) out.push(value);
  }
  return out;
}

// HARD RULE #4 gate — no non-canonical `--fs-*` token may be DECLARED anywhere
// in the engine CSS (engineering/typography.md §1).
function checkTypographyTokens(errors) {
  for (const file of [...listCssFiles(LIB_DIR), ...listCssFiles(THEMES_DIR)]) {
    const css = stripComments(fs.readFileSync(file, 'utf8'));
    const rel = path.relative(ROOT, file);
    for (const name of nonCanonicalFsTokens(css)) {
      errors.push(
        `non-canonical typography token "${name}" declared in ${rel} — HARD RULE #4: ` +
        `the 12-token role-named --fs-* system is closed (engineering/typography.md §1). ` +
        `Map it to a role token (e.g. --fs-message / --fs-body-compact), not a t-shirt size.`,
      );
    }
  }
}

// HARD RULE #20 ratchet — the frozen ceiling of nonzero `margin` declarations in the
// engine layout CSS (lib/). EXCEED-only: new margins above this number fail the build;
// removing margins always passes, so an in-flight margin→gap/padding migration never
// fights this gate — just lower MARGIN_BUDGET to follow the floor as it drops. Target
// is zero. A margin that is provably the only answer is admitted by RAISING this number
// with that justification in the PR (HARD RULE #20), never by a silent edit.
//
// 271 → 39: the no-margins component sweep (phase 2) retired every spacing margin from
// lib/components/**/*.styles.css — zero remain there. The 39 that remain all live in
// base/contract/forms/chart-family/integration CSS, out of that sweep's scope.
// 39 → 12: the independent-slices pass (#556) converted the chart-family frame (7),
// the inventory contract Layouts (11), the stage/progress Form chrome (2), the
// independent base.modifiers spacings (6), and the mermaid-error block (1) to
// padding/gap. The 12 that remain are the KEYSTONE base typography rhythm (base.elements
// h2–h6 + p + hr = 7; base.modifiers eyebrow / KEY-INSIGHT panel / footnote prose /
// display-math = 4) — deferred to a stage-flow design-doc PR because they collapse and
// interact with the masthead lift — plus ONE sanctioned, irreducible flex auto-margin
// (the trailing list pill, base.modifiers `margin-left:auto`; horizontal, never touches
// height math). Target after the keystone PR: 1 (the sanctioned pill).
const MARGIN_BUDGET = 12;

// HARD RULE #20 gate — keep `margin` out of the engine's layout CSS; space with
// `gap`/`padding`, which measure cleanly (engineering/gotchas.md).
function checkMarginDiscipline(errors) {
  let total = 0;
  const byFile = [];
  for (const file of listCssFiles(LIB_DIR)) {
    const css = stripComments(fs.readFileSync(file, 'utf8'));
    const n = offendingMargins(css).length;
    if (n) {
      total += n;
      byFile.push([path.relative(ROOT, file), n]);
    }
  }
  if (total > MARGIN_BUDGET) {
    byFile.sort((a, b) => b[1] - a[1]);
    const top = byFile.slice(0, 5).map(([f, n]) => `${f} (${n})`).join(', ');
    errors.push(
      `nonzero margin declarations in engine CSS rose to ${total}, above the budget of ${MARGIN_BUDGET} ` +
      `(HARD RULE #20). margin is invisible to measurement and margin-collapses — space with \`gap\`/\`padding\` ` +
      `instead (engineering/gotchas.md). If a margin is provably the only answer, raise MARGIN_BUDGET in ` +
      `tools/check-ownership.js and justify it in the PR. Heaviest files: ${top}.`,
    );
  }
}

// HARD RULE #12 gate — theme CSS (themes/*.css) must not use `:not(:has(…))` /
// `:is(:has(…))`: silently broken in the Marp-preview Chromium. Component/base
// CSS uses these deliberately with fallbacks, so the ban is scoped to themes/.
function checkThemeHasSelectors(errors) {
  for (const file of listCssFiles(THEMES_DIR)) {
    const css = stripComments(fs.readFileSync(file, 'utf8'));
    if (hasNotHasSelector(css)) {
      errors.push(
        `theme "${path.relative(ROOT, file)}" uses :not(:has(…)) / :is(:has(…)) — HARD RULE #12: ` +
        `that form is silently broken in the Marp-preview Chromium. Drive the variant from an ` +
        `explicit class/attribute on the element instead (see engineering/gotchas.md).`,
      );
    }
  }
}

function checkThemeTokenParity(errors) {
  const palettes = listBasePalettes();
  if (!palettes.length) {
    errors.push('no base palettes found (no theme `@import \'lattice\'`) — cannot verify theme token contract.');
    return;
  }
  for (const p of palettes) {
    const missing = REQUIRED_THEME_TOKENS.filter((t) => !p.tokens.has(t));
    if (missing.length) {
      errors.push(
        `theme "${p.name}" is missing ${missing.length} core token(s): ${missing.join(', ')}. ` +
        `Every base palette must define the core surface tokens directly — define them in themes/${p.name}.css.`,
      );
    }
  }
}

const ADAPT_MODES = new Set(['reflow', 'native', 'single-orientation']);

/**
 * Cross-check the adaptivity DECLARATION (manifest `adapt.mode`) against reality,
 * so the manifest can never silently drift from the code (the jank this replaces —
 * 7 charts that reflowed but declared nothing, with no gate to catch it). See
 * engineering/decisions/2026-06-20-adaptive-manifest-contract.md. Deterministic —
 * no rendering. Four rules:
 *
 *   1. COMPLETE   — every component declares a valid `adapt.mode`.
 *   2. ANTI-DRIFT — a component whose own CSS carries `@container … aspect-ratio`
 *      (the canonical box-local reflow signal) MUST be `reflow`. This is the
 *      enforceable core: CSS reflow can't masquerade as native. (JS/transform/
 *      mermaid reflowers have no such marker; they are author-declared `reflow`
 *      and render-backed by their transforms — out of this static gate's reach by
 *      design, documented in the decision doc.)
 *   3. CONSISTENT — `single-orientation` ⟺ the `orientation` field lists exactly
 *      one orientation; `native` must support BOTH (it adapts by scaling, so it
 *      can't be orientation-restricted).
 *   4. SANE       — `native` must NOT carry `@container … aspect-ratio` (the
 *      contrapositive of rule 2, stated for a clear message).
 */
function checkAdaptDeclarations(manifests, errors) {
  const CONTAINER_ASPECT = /@container[^{]*aspect-ratio/;
  // The shared chart-frame CSS carries a box-local `@container … aspect-ratio`
  // rule that restructures `.chart-body` on tall boxes for EVERY chart-frame
  // member — so a chart's reflow can live there, not in its own styles.css. The
  // anti-drift rule must see it, or a chart could declare `native` while inheriting
  // box-local reflow (the false-negative the maker-checker caught). Union it in for
  // chart-bucket components, the way checkVariantDeclaration unions base.modifiers.
  const chartFamilyCss = (() => {
    const p = path.join(COMPONENTS_DIR, 'chart', '_chart-family', 'chart-family.css');
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  })();
  for (const m of manifests) {
    const mode = m.adapt?.mode;
    if (!mode || !ADAPT_MODES.has(mode)) {
      errors.push(
        `${m.name}: missing/invalid adapt.mode (got ${JSON.stringify(mode)}). ` +
        `Declare one of: ${[...ADAPT_MODES].join(', ')}. See engineering/decisions/2026-06-20-adaptive-manifest-contract.md.`,
      );
      continue;
    }
    const cssPath = componentStylesPath(m);
    let css = cssPath ? fs.readFileSync(cssPath, 'utf8') : '';
    if (manifestBucket(m) === 'chart') css += `\n${chartFamilyCss}`;
    const hasContainerReflow = CONTAINER_ASPECT.test(css);
    // orientation defaults to BOTH when omitted (the manifest's documented default).
    const orientation = Array.isArray(m.orientation) ? m.orientation : ['landscape', 'portrait'];

    if (hasContainerReflow && mode !== 'reflow') {
      errors.push(
        `${m.name}: declares adapt.mode "${mode}" but its CSS uses \`@container … aspect-ratio\` ` +
        `(box-local reflow) — must be "reflow". Fix the manifest or remove the @container rule.`,
      );
    }
    if (mode === 'single-orientation' && orientation.length !== 1) {
      errors.push(
        `${m.name}: adapt.mode "single-orientation" requires the \`orientation\` field to list ` +
        `exactly one orientation (got [${orientation.join(', ')}]).`,
      );
    }
    if (mode === 'native' && orientation.length !== 2) {
      errors.push(
        `${m.name}: adapt.mode "native" must support BOTH orientations (it adapts by scaling), ` +
        `but \`orientation\` is [${orientation.join(', ')}]. Use "single-orientation" if it is deliberately one.`,
      );
    }
  }
}

// Every component must declare its layout-solver intent — `adapt.priority`, the
// slots/roles in importance order (what leads, what sheds first). The Fit Spine's
// solver chooses collapse / shed / split by READING this, never by inferring from
// content, so undeclared intent is a build error, not a silent default (the §4
// Munger inversion: a solver that guesses is worse than the overflow ring). The §6
// backfill brought all 52 components to coverage; this gate keeps it from
// regressing. `keepTogether` / `droppable` stay advisory (declared-or-justified-
// empty) — only `priority` is universally required. See
// engineering/decisions/2026-06-22-solver-intent-backfill.md.
function checkSolverIntentDeclared(manifests, errors) {
  for (const m of manifests) {
    const p = m.adapt?.priority;
    const ok = Array.isArray(p) && p.length > 0 && p.every((s) => typeof s === 'string' && s.length > 0);
    if (!ok) {
      errors.push(
        `${m.name}: missing adapt.priority — the layout solver refuses to act on undeclared ` +
        `intent (Fit Spine §4/§6). Declare slots/roles in importance order, highest first. ` +
        `See engineering/decisions/2026-06-22-solver-intent-backfill.md.`,
      );
    }
  }
}

// ── Runner ────────────────────────────────────────────────────────────────

function run() {
  const manifests = loadAll();
  const errors = [];
  checkTransformerNames(errors);
  checkLayoutOwnership(errors);
  checkComponentNames(manifests, errors);
  checkComponentCss(manifests, errors);
  checkVariantDeclaration(manifests, errors);
  checkTagClustering(manifests, errors);
  checkThemeTokenParity(errors);
  checkRetiredTokenNames(errors);
  checkTypographyTokens(errors);
  checkMarginDiscipline(errors);
  checkThemeHasSelectors(errors);
  checkAdaptDeclarations(manifests, errors);
  checkSolverIntentDeclared(manifests, errors);
  return {
    errors,
    counts: {
      transformers: TRANSFORMERS.length,
      components: manifests.length,
      buckets: BUCKETS.length,
      palettes: listBasePalettes().length,
    },
  };
}

function main(argv) {
  const { errors, counts } = run();
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ ok: errors.length === 0, errors, counts }, null, 2)}\n`);
    return errors.length === 0 ? 0 : 1;
  }
  if (errors.length) {
    process.stderr.write(`ownership check FAILED — ${errors.length} collision(s):\n\n`);
    for (const e of errors) process.stderr.write(`  ✗ ${e}\n\n`);
    return 1;
  }
  process.stdout.write(
    `ownership check OK — ${counts.transformers} transformers, ${counts.components} components ` +
    `across ${counts.buckets} buckets, ${counts.palettes} palettes. No accidental collisions.\n`,
  );
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = {
  run,
  topLevelSelectors,
  splitTopLevel,
  splitCompounds,
  isScopedTo,
  classTokens,
  cssRootModifierTokens,
  transformModifierTokens,
  checkVariantDeclaration,
  checkAdaptDeclarations,
  checkSolverIntentDeclared,
  checkTagClustering,
  checkRetiredTokenNames,
  RETIRED_TOKEN_NAMES,
  checkTypographyTokens,
  checkThemeHasSelectors,
  nonCanonicalFsTokens,
  hasNotHasSelector,
  offendingMargins,
  checkMarginDiscipline,
  MARGIN_BUDGET,
  CANONICAL_FS_TOKENS,
  parseThemeTokens,
  listBasePalettes,
  CO_OWNED_LAYOUTS,
  SHARED_SELECTORS,
  REQUIRED_THEME_TOKENS,
  SINGLETON_TAGS,
};
