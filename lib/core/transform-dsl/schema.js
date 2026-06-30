/**
 * Transform-DSL schema + safety validator — the §6 envelope of
 * `engineering/decisions/2026-06-29-component-transform-dsl.md`.
 *
 * The `transform` block in a component manifest is UNTRUSTED input (a component
 * is shareable + AI-generable), so the interpreter is the attack surface. This
 * module is the gate that turns a raw `transform` array into a list of safe,
 * null-prototype rule objects — or rejects it. Safety here is SPECIFIED, not
 * asserted:
 *
 *   • a CLOSED element allowlist for any tag the DSL may emit (§6.1);
 *   • an attribute allowlist — NO `style`, no `on*`, no URL-bearing attr (§6.2,
 *     which is what closes the CSS-`url()` beacon, gate #616 / T-CSS);
 *   • a CLOSED selector sub-grammar (allowlisted tag + a declared-slot class
 *     only — no attribute selectors, `:has()`, or combinators) (§6.4);
 *   • prototype-pollution defense — every rule object is rebuilt onto a
 *     null-prototype, and `__proto__`/`constructor`/`prototype` keys are
 *     rejected outright (§6.6);
 *   • only the known `do` ops and the known capability names are accepted;
 *     anything else rejects the whole manifest.
 *
 * This is the PROTOTYPE surface (§11): `extract`, `wrap`, and `capability` —
 * the grammar grows on demand, not up front. The interpreter
 * (`interpret.js`) re-checks the same allowlists when it actually creates a
 * node, so a bug here is defense-in-depth, not the only line.
 */

const { CAPABILITY_NAMES } = require('./capabilities');

// §6.1 — the closed element allowlist. The DSL may only ever emit structural /
// text elements. BARRED (never emittable): script, style, link, base, meta,
// iframe, object, embed, form, input, svg/use, img (images arrive only through a
// URL-validating capability, never a raw DSL element).
const ALLOWED_ELEMENTS = new Set([
  'div', 'span', 'p', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'nav', 'cite', 'blockquote',
  'figure', 'figcaption', 'code', 'b', 'i', 'em', 'strong', 'small',
]);

// §6.2 — the attribute allowlist. Note what is ABSENT: `style`, every `on*`
// handler, and every URL-bearing attribute (`href`, `src`, `srcset`, `poster`,
// `xlink:href`, `srcdoc`, `formaction`). A literal allowlist + the `data-*` /
// `aria-*` prefixes; nothing else may be written.
const ALLOWED_ATTRS = new Set(['class', 'id', 'role', 'colspan', 'rowspan']);
const ALLOWED_ATTR_PREFIXES = ['data-', 'aria-'];

// The known `do` operations for the prototype surface. Unknown op → reject.
const KNOWN_OPS = new Set(['extract', 'wrap', 'capability']);

// §6.4 — a selector is exactly an (optional) allowlisted tag + an (optional)
// single declared-slot class: `h2`, `p`, `.panel-left`, `span.panel-eyebrow`.
// No attribute selectors, `:has()`, descendant/child/sibling combinators, ids,
// or commas — those could cross the section boundary or smuggle a predicate.
const SELECTOR_RE = /^([a-z][a-z0-9]*)?(?:\.([a-z][a-z0-9-]*))?$/;

// Keys that must never appear in attacker-controlled JSON (prototype pollution).
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function attrAllowed(name) {
  const n = String(name).toLowerCase();
  return ALLOWED_ATTRS.has(n) || ALLOWED_ATTR_PREFIXES.some(p => n.startsWith(p) && n.length > p.length);
}

function selectorAllowed(sel) {
  if (typeof sel !== 'string') return false;
  const m = SELECTOR_RE.exec(sel);
  if (!m) return false;
  if (m[1] && !ALLOWED_ELEMENTS.has(m[1])) return false; // tag, if present, must be allowlisted
  return Boolean(m[1] || m[2]); // at least a tag OR a class
}

/**
 * Recursively rebuild a JSON value onto null-prototype objects, rejecting any
 * forbidden key. Returns { value, error }. Arrays stay arrays; primitives pass
 * through. This is the prototype-pollution firewall (§6.6): the interpreter only
 * ever sees objects with no inherited `Object.prototype`, and a payload carrying
 * `__proto__`/`constructor`/`prototype` is refused rather than sanitized.
 */
function sanitize(value) {
  if (Array.isArray(value)) {
    const out = [];
    for (const v of value) {
      const r = sanitize(v);
      if (r.error) return r;
      out.push(r.value);
    }
    return { value: out };
  }
  if (value && typeof value === 'object') {
    const out = Object.create(null);
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) return { error: `forbidden key "${key}" (prototype pollution)` };
      const r = sanitize(value[key]);
      if (r.error) return r;
      out[key] = r.value;
    }
    return { value: out };
  }
  return { value };
}

/** Validate an `into` container spec: an allowlisted element + opaque class/attrs. */
function validateInto(into, where, errors) {
  if (!into || typeof into !== 'object') { errors.push(`${where}: missing container spec`); return; }
  if (!ALLOWED_ELEMENTS.has(into.element)) { errors.push(`${where}: element "${into.element}" is not in the allowlist`); return; }
  if ('class' in into && typeof into.class !== 'string') errors.push(`${where}: class must be a string`);
  if (into.attrs) {
    for (const name of Object.keys(into.attrs)) {
      if (!attrAllowed(name)) errors.push(`${where}: attribute "${name}" is barred (no style/on*/URL attrs)`);
      if (typeof into.attrs[name] !== 'string') errors.push(`${where}: attribute "${name}" value must be a string`);
    }
  }
}

/** Validate one `do` op. Exactly one known op key; its shape checked per op. */
function validateOp(op, where, errors) {
  if (!op || typeof op !== 'object') { errors.push(`${where}: op must be an object`); return; }
  const keys = Object.keys(op);
  if (keys.length !== 1) { errors.push(`${where}: an op must have exactly one operation key, got [${keys.join(', ')}]`); return; }
  const key = keys[0];
  if (!KNOWN_OPS.has(key)) { errors.push(`${where}: unknown op "${key}"`); return; }

  if (key === 'extract') {
    const e = op.extract;
    validateInto(e?.into, `${where}.extract.into`, errors);
    if (!Array.isArray(e?.slots) || !e.slots.length) errors.push(`${where}.extract: "slots" must be a non-empty array`);
    else for (const s of e.slots) if (!selectorAllowed(s)) errors.push(`${where}.extract: selector "${s}" is outside the closed sub-grammar`);
  } else if (key === 'wrap') {
    const w = op.wrap;
    validateInto(w?.into, `${where}.wrap.into`, errors);
    if (w?.target !== 'rest') errors.push(`${where}.wrap: only target "rest" is supported in the prototype`);
  } else if (key === 'capability') {
    if (!CAPABILITY_NAMES.has(op.capability)) errors.push(`${where}: capability "${op.capability}" is not in the closed registry`);
  }
}

/** Validate a `match` predicate (the safe subset: `section`, `not.section`). */
function validateMatch(match, where, errors) {
  if (match == null) return; // an absent match means "the section itself" (the interpreter scopes it)
  if (typeof match !== 'object') { errors.push(`${where}: match must be an object`); return; }
  const okKeys = new Set(['section', 'not']);
  for (const k of Object.keys(match)) if (!okKeys.has(k)) errors.push(`${where}: unknown match predicate "${k}"`);
  const classOk = v => typeof v === 'string' || (Array.isArray(v) && v.every(x => typeof x === 'string'));
  if ('section' in match && !classOk(match.section)) errors.push(`${where}.match.section must be a class string or string[]`);
  if ('not' in match) {
    if (!match.not || typeof match.not !== 'object' || !('section' in match.not)) errors.push(`${where}.match.not must carry a "section"`);
    else if (!classOk(match.not.section)) errors.push(`${where}.match.not.section must be a class string or string[]`);
  }
}

/**
 * Validate + sanitize a raw `transform` array. Returns
 * `{ ok, rules, errors }` — `rules` are null-prototype objects safe to hand to
 * the interpreter; `ok` ⇔ no errors. A single error rejects the WHOLE block
 * (fail-closed): a partially-valid transform never runs.
 */
function validateTransform(rawTransform) {
  const errors = [];
  if (!Array.isArray(rawTransform)) return { ok: false, rules: [], errors: ['transform must be an array of rules'] };

  const san = sanitize(rawTransform);
  if (san.error) return { ok: false, rules: [], errors: [san.error] };
  const rules = san.value;

  rules.forEach((rule, i) => {
    const where = `rule[${i}]${rule?.name ? ` "${rule.name}"` : ''}`;
    if (!rule || typeof rule !== 'object') { errors.push(`${where}: must be an object`); return; }
    if (rule.name != null && typeof rule.name !== 'string') errors.push(`${where}: name must be a string`);
    validateMatch(rule.match, where, errors);
    if (!Array.isArray(rule.do) || !rule.do.length) { errors.push(`${where}: "do" must be a non-empty array`); return; }
    rule.do.forEach((op, j) => { validateOp(op, `${where}.do[${j}]`, errors); });
  });

  return { ok: errors.length === 0, rules: errors.length === 0 ? rules : [], errors };
}

module.exports = {
  validateTransform,
  // Exported so the interpreter enforces the same allowlists at node-creation
  // time (defense in depth), and so tests can assert the closed sets.
  ALLOWED_ELEMENTS, ALLOWED_ATTRS, ALLOWED_ATTR_PREFIXES, KNOWN_OPS,
  attrAllowed, selectorAllowed, sanitize,
};
