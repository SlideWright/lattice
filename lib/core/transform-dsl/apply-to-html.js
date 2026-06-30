/**
 * Transform-DSL string adapter — the HTML-string render path (engine → PDF/PPTX),
 * §6/§11 of `engineering/decisions/2026-06-29-component-transform-dsl.md`.
 *
 * The whole parity strategy: DON'T write a second interpreter, and DON'T hand-roll
 * an HTML scanner. Parse the rendered HTML ONCE with jsdom, find the component's
 * sections with `querySelectorAll('section.<component>')` — the SAME discovery the
 * runtime DOM path uses — run the SAME `applyRulesToDom`, and serialize. Section
 * discovery, op semantics, and the safety envelope are therefore identical on both
 * paths: cross-path parity by construction (the §11 risk), and no string-scanner
 * to desync.
 *
 * WHY A PARSER, NOT A SCANNER (maker-checker, 2026-06-30): an earlier draft scanned
 * for `</section>` with `indexOf`/`startsWith`. That is HTML-unaware — a literal
 * `</section>` inside an attribute value or comment desyncs it, and everything past
 * the false close was appended VERBATIM, walking *around* the interpreter and
 * leaking unsanitized HTML (a `<script>`) into the output (a #616-class XSS). It
 * also diverged from the DOM path on nested and upper-case `<SECTION>`. A parser
 * eliminates all of these by construction.
 *
 * jsdom is LAZY-REQUIRED so this module never pulls jsdom into the browser runtime
 * bundle (which uses the live `document` via `applyRulesToDom` directly).
 *
 * FAIL-CLOSED + DoS guard: unbounded untrusted nesting can blow jsdom's recursive
 * serializer (a cheap authored-deck DoS), so the input is depth/size-capped BEFORE
 * parsing, and the whole parse→transform→serialize is wrapped so any failure
 * returns the ORIGINAL html untouched (the transform simply does not apply; the
 * safe, un-transformed slide still renders).
 */

const { applyRulesToDom } = require('./interpret');

// Generous caps for a single rendered deck's HTML. Real slide HTML is well under
// these; they exist only to deny a deeply-nested / enormous adversarial section
// the chance to exhaust the recursive serializer before any budget can trip.
const MAX_HTML_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_TAG_DEPTH = 256; // legit slides nest ~10–15 deep

// Void elements don't open a nesting level (no end tag) — ignore them in the depth scan.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const TAG_RE = /<(\/?)([a-zA-Z][\w-]*)/g;

/** Cheap O(n) upper bound on tag-nesting depth — a pre-parse DoS guard (HIGH-4). */
function exceedsDepth(html, cap) {
  let depth = 0;
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(html))) {
    if (m[1]) depth = Math.max(0, depth - 1);
    else if (!VOID.has(m[2].toLowerCase())) { depth++; if (depth > cap) return true; }
  }
  return false;
}

/**
 * Run the DSL rules over every `section.<component>` in the rendered HTML, via the
 * shared DOM interpreter. Returns rewritten HTML, or the original unchanged when
 * there is nothing to do or anything goes wrong (fail-closed).
 */
function applyRulesToHtml(html, rules, ctx = {}) {
  const component = ctx.component;
  if (!html || !component || !Array.isArray(rules) || !rules.length) return html;
  // Scope key must be a bare class token (mirrors the selector sub-grammar) — never
  // interpolate an unvalidated value into a `querySelectorAll` selector (MED-5).
  if (!/^[a-z][a-z0-9-]*$/.test(component)) return html;
  // Cheap pre-filter: the component class token must appear at all. (Don't also
  // gate on a literal "section" — tag names are case-insensitive, so `<SECTION>`
  // would slip a case-sensitive check and diverge from the DOM path.)
  if (!html.includes(component)) return html;
  if (html.length > MAX_HTML_BYTES || exceedsDepth(html, MAX_TAG_DEPTH)) return html;

  try {
    // Lazy + engine-only: jsdom is never bundled into the runtime.
    const { JSDOM } = require('jsdom');
    const dom = new JSDOM(html);
    const body = dom.window.document.body;
    if (!body.querySelector(`section.${component}`)) return html;
    applyRulesToDom(body, rules, { ...ctx, component });
    return body.innerHTML;
  } catch {
    return html; // fail-closed: keep the original, safe, un-transformed HTML
  }
}

module.exports = { applyRulesToHtml, exceedsDepth };
