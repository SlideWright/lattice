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
const { loadAll, manifestBucket, BUCKETS } = require('../lib/components');
const { TRANSFORMERS } = require('../lib/transformers/registry');

const ROOT = path.join(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'lib', 'components');
const THEMES_DIR = path.join(ROOT, 'themes');

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

// Core token contract every base palette must define directly. These are
// the surface tokens the portal and base layout consume without an engine
// fallback; everything else a theme may inherit from lattice.css `:root`.
const REQUIRED_THEME_TOKENS = Object.freeze([
  '--bg', '--bg-alt', '--border',
  '--text-heading', '--text-body', '--text-muted',
  '--accent', '--accent-soft', '--bg-dark',
]);

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
 * True if `selector` is scoped to component `name`: it references a class
 * token that is either exactly `<name>` or in the component's BEM
 * namespace `<name>-*` (e.g. `gantt` owns `.gantt`, `.gantt-chart`,
 * `.gantt-lane`). Token-exact so `image` does not match `imagery`.
 */
function isScopedTo(selector, name) {
  return classTokens(selector).some((c) => c === name || c.startsWith(`${name}-`));
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

// ── Runner ────────────────────────────────────────────────────────────────

function run() {
  const manifests = loadAll();
  const errors = [];
  checkTransformerNames(errors);
  checkLayoutOwnership(errors);
  checkComponentNames(manifests, errors);
  checkComponentCss(manifests, errors);
  checkThemeTokenParity(errors);
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
  isScopedTo,
  classTokens,
  parseThemeTokens,
  listBasePalettes,
  CO_OWNED_LAYOUTS,
  SHARED_SELECTORS,
  REQUIRED_THEME_TOKENS,
};
