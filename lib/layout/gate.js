/**
 * Layout Studio — the deterministic GATES for a CSS-only local component
 * (Faculty 2, the Form-layer sibling of lib/theme). Pure, `fs`-free,
 * dependency-free, so it bundles into the browser core AND unit-tests in Node
 * with no fixtures.
 *
 * The discipline is the Architect's, restated for components: **the model
 * proposes; deterministic gates dispose.** A draft (CSS + manifest + skeleton)
 * can never render until it clears the same invariants the engine already
 * enforces at build time, run here client-side:
 *
 *   1. Tokens only (`var(--…)`) — NO hex literals (CLAUDE.md "No hex literals
 *      in layout rules"). A hex is flagged; the author swaps in a token.
 *   2. `.<name>` selector scoping — every rule must target the component's
 *      own `_class`, so a local component can never leak onto other slides.
 *      This is the runtime analogue of the `section.<name> …` convention every
 *      shipped `styles.css` already follows (build-css.js concatenates them
 *      unwrapped, trusting that scoping).
 *   3. Manifest coherence — required fields, valid enums, and the CSS-only
 *      constraint: substance must be `prose` or `structure` (the two
 *      no-transform substances, design/design-system.md §5). `series`/`graph`
 *      need a transform.js and reach authors only via graduation, never as a
 *      runtime asset (the three-render-paths rule).
 *   4. Skeleton coherence — the skeleton must invoke the component's `_class`.
 *
 * Errors block rendering; warnings inform. `gateComponent` aggregates.
 */

// Mirrors lib/components/manifest.schema.json (kept in sync by the
// manifest-enums test below). Duplicated as plain data here because this module
// must stay fs-free for the browser bundle.
const FUNCTIONS = Object.freeze([
  'anchor', 'statement', 'inventory', 'comparison', 'progression', 'evidence', 'imagery',
]);
const BUCKETS = Object.freeze([...FUNCTIONS, 'chart', 'diagram', 'math', 'code', 'legal']);
const FORMS = Object.freeze([
  'bookend', 'divider', 'canvas', 'grid', 'stack', 'ledger',
  'panel', 'matrix', 'scatter', 'spatial', 'timeline', 'split',
]);
const SUBSTANCES = Object.freeze(['prose', 'structure', 'series', 'graph', 'mixed']);
// A CSS-only local component arranges prose/structure — the substances that
// need no transform. The other three are graduation-only.
const CSS_ONLY_SUBSTANCES = Object.freeze(['prose', 'structure']);

const NAME_RE = /^[a-z][a-z0-9-]*$/;
// A hex colour literal: #rgb / #rgba / #rrggbb / #rrggbbaa.
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

/** Strip `/* … *\/` comments so gates don't flag commentary. */
function stripComments(css) {
  return String(css || '').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
}

/** 1-based line number of a character offset. */
function lineAt(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') n++;
  return n;
}

/** Every hex literal in the CSS (comments excluded). One finding per hit. */
function findHexLiterals(css) {
  const src = stripComments(css);
  const out = [];
  for (const m of src.matchAll(HEX_RE)) {
    out.push({ hex: m[0], line: lineAt(src, m.index), index: m.index });
  }
  return out;
}

/**
 * Walk top-level style rules, descending into `@media`/`@supports` blocks, and
 * yield each rule's selector list with its line. Skips other at-rules
 * (`@keyframes`, `@font-face`, …) — those carry no element selectors to scope.
 * A small hand-rolled tokenizer; the input is one component's worth of CSS.
 */
function eachRule(css, visit) {
  const src = stripComments(css);
  let i = 0;
  const n = src.length;
  function block(end) {
    let chunkStart = i;
    while (i < end) {
      const ch = src[i];
      if (ch === '{') {
        const head = src.slice(chunkStart, i).trim();
        // find matching close brace
        let depth = 1;
        let j = i + 1;
        for (; j < end && depth > 0; j++) {
          if (src[j] === '{') depth++;
          else if (src[j] === '}') depth--;
        }
        const bodyStart = i + 1;
        const bodyEnd = j - 1;
        if (head.startsWith('@')) {
          const at = head.split(/\s/)[0].toLowerCase();
          if (at === '@media' || at === '@supports') block2(bodyStart, bodyEnd);
          // else: opaque at-rule (keyframes/font-face) — no selectors to scope
        } else if (head) {
          visit({ selector: head, line: lineAt(src, chunkStart) });
        }
        i = j;
        chunkStart = i;
      } else {
        i++;
      }
    }
  }
  // descend helper that preserves the outer cursor
  function block2(s, e) {
    const savedI = i;
    i = s;
    block(e);
    i = savedI;
  }
  block(n);
}

/** Does one comma-part of a selector reference `.<name>` as a class token? */
function partScoped(part, name) {
  // class token boundaries: a `.name` not followed by a name char.
  const re = new RegExp(`\\.${name.replace(/[-]/g, '\\$&')}(?![\\w-])`);
  return re.test(part);
}

/**
 * Selectors whose comma-parts don't all target `.<name>`. Each unscoped part is
 * one finding — it would leak onto other slides.
 */
function findUnscopedSelectors(css, name) {
  if (!NAME_RE.test(name || '')) return [];
  const out = [];
  eachRule(css, ({ selector, line }) => {
    for (const part of selector.split(',')) {
      const p = part.trim();
      if (!p) continue;
      if (!partScoped(p, name)) out.push({ selector: p, line });
    }
  });
  return out;
}

/** Structural manifest validation. Returns { ok, errors:[{field,message}] }. */
function validateManifest(m, { cssOnly = true } = {}) {
  const errors = [];
  const man = m && typeof m === 'object' ? m : {};
  const bad = (field, message) => errors.push({ field, message });

  if (!NAME_RE.test(man.name || '')) bad('name', 'name must be a lowercase slug (a–z, 0–9, -).');
  if (!FUNCTIONS.includes(man.function)) bad('function', `function must be one of: ${FUNCTIONS.join(', ')}.`);
  if (!FORMS.includes(man.form)) bad('form', `form must be one of: ${FORMS.join(', ')}.`);
  if (!SUBSTANCES.includes(man.substance)) {
    bad('substance', `substance must be one of: ${SUBSTANCES.join(', ')}.`);
  } else if (cssOnly && !CSS_ONLY_SUBSTANCES.includes(man.substance)) {
    bad('substance', `a CSS-only component must be prose or structure — ${man.substance} needs a transform (graduate it).`);
  }
  if (man.bucket != null && !BUCKETS.includes(man.bucket)) {
    bad('bucket', `bucket must be one of: ${BUCKETS.join(', ')}.`);
  }
  const tags = man.tags;
  if (!Array.isArray(tags) || tags.length < 3 || tags.length > 5) {
    bad('tags', 'tags must be a 3–5 item array.');
  } else if (new Set(tags).size !== tags.length || !tags.every(t => NAME_RE.test(t))) {
    bad('tags', 'tags must be unique lowercase slugs.');
  }
  if (!man.description || !String(man.description).trim()) bad('description', 'description is required.');
  if (!man.skeleton || !String(man.skeleton).trim()) bad('skeleton', 'skeleton is required.');

  return { ok: errors.length === 0, errors };
}

/** Does the skeleton invoke `<!-- _class: <name> … -->`? */
function skeletonInvokes(skeleton, name) {
  if (!skeleton || !NAME_RE.test(name || '')) return false;
  const re = new RegExp(`<!--\\s*_class:\\s*${name.replace(/[-]/g, '\\$&')}(?![\\w-])`);
  return re.test(skeleton);
}

/** CSS-only gates: hex literals + selector scoping + non-empty. */
function gateCss(css, name) {
  const findings = [];
  if (!String(css || '').trim()) {
    findings.push({ rule: 'empty-css', level: 'error', message: 'styles.css is empty.' });
    return { ok: false, findings };
  }
  for (const h of findHexLiterals(css)) {
    findings.push({
      rule: 'no-hex', level: 'error', line: h.line,
      message: `hex literal "${h.hex}" — use a palette token instead (layouts are palette-blind).`,
    });
  }
  for (const u of findUnscopedSelectors(css, name)) {
    findings.push({
      rule: 'scope', level: 'error', line: u.line,
      message: `selector "${u.selector}" is not scoped to .${name} — it would leak onto other slides.`,
    });
  }
  return { ok: findings.every(f => f.level !== 'error'), findings };
}

/**
 * Full draft gate. Returns { ok, errors:[…], warnings:[…] } where each item is
 * a normalized { rule, level, line?, message }. `ok` ⇔ no errors.
 */
function gateComponent({ name, css, manifest, skeleton } = {}, opts = {}) {
  const errors = [];
  const warnings = [];

  const man = validateManifest(manifest, opts);
  for (const e of man.errors) errors.push({ rule: 'manifest', level: 'error', field: e.field, message: e.message });

  const nameForCss = (manifest?.name) || name;
  if (NAME_RE.test(nameForCss || '')) {
    const cg = gateCss(css, nameForCss);
    for (const f of cg.findings) (f.level === 'error' ? errors : warnings).push(f);
  } else if (!man.errors.some(e => e.field === 'name')) {
    errors.push({ rule: 'name', level: 'error', message: 'a valid component name is required to scope the CSS.' });
  }

  const skel = skeleton != null ? skeleton : manifest?.skeleton;
  if (NAME_RE.test(nameForCss || '') && !skeletonInvokes(skel, nameForCss)) {
    errors.push({
      rule: 'skeleton', level: 'error',
      message: `skeleton must invoke <!-- _class: ${nameForCss} -->.`,
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}

module.exports = {
  FUNCTIONS, BUCKETS, FORMS, SUBSTANCES, CSS_ONLY_SUBSTANCES, NAME_RE,
  findHexLiterals, findUnscopedSelectors, validateManifest,
  skeletonInvokes, gateCss, gateComponent,
};
