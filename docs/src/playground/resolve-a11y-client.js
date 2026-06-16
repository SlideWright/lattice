// Client mirror of the accessibility (CVD) precedence in
// lib/core/resolve-accessibility.js — the ONE shared resolver the three Drawing
// Board controllers (render · present · practice) call so they can't drift on
// "which palette is actually in effect". Kept tiny and dependency-free; the
// server module stays the source of truth for the type vocabulary (this mirrors
// it, and resolve-a11y-client.test.js asserts the two agree on the key cases).
//
// Precedence (highest first), per the ADR ("accessibility takes precedence,
// always"; "workspace wins" at live render):
//   1. workspace  — the live viewer's declared need (data-a11y / the Settings
//      control's `lattice-docs-a11y`); an explicit `off` here wins too.
//   2. front matter — the deck's `accessibility:` key (travels with the deck).
//   3. neither     — off; the theme stands.

const CVD = ['protanopia', 'deuteranopia', 'tritanopia'];
const ALIASES = {
	protan: 'protanopia',
	protanope: 'protanopia',
	deutan: 'deuteranopia',
	deuteranope: 'deuteranopia',
	tritan: 'tritanopia',
	tritanope: 'tritanopia',
	// Achromatopsia (total colour-blindness) ships as a luminance palette + the
	// redundant encoding — recognized here by name like the server resolver.
	achromatopsia: 'achromatopsia',
	achromat: 'achromatopsia',
	monochromacy: 'achromatopsia',
	monochrome: 'achromatopsia',
};
// Includes 'normal' so this stays an exact mirror of the server resolver, where
// canonicalType('normal') resolves to an explicit off (not just an unset).
const OFF_WORDS = new Set(['', 'off', 'none', 'false', 'no', 'normal']);

/** → { state: 'unset' | 'off' | 'on', type? }. Unknown tokens are 'unset' so a
 *  typo never silently disables a setting the OTHER tier may legitimately set. */
function classify(raw) {
	if (raw == null) return { state: 'unset' };
	const t = String(raw).trim().toLowerCase();
	if (t === '') return { state: 'unset' };
	if (OFF_WORDS.has(t)) return { state: 'off' };
	if (CVD.includes(t)) return { state: 'on', type: t };
	if (ALIASES[t]) return { state: 'on', type: ALIASES[t] };
	return { state: 'unset' };
}

/** Parse `accessibility: <type>` (quoted or bare) from a deck's front matter. */
export function readA11yFrontMatter(src) {
	if (!src) return null;
	const m = String(src).match(/^---\n([\s\S]*?)\n---\n/);
	if (!m) return null;
	const a = m[1].match(/^\s*accessibility:\s*["']?([A-Za-z-]+)["']?\s*$/m);
	return a ? a[1] : null;
}

/**
 * Resolve the effective CVD type from the two tiers.
 * @param {string|null} workspace  data-a11y / `lattice-docs-a11y`
 * @param {string|null} frontMatter the deck's `accessibility:` value
 * @returns {string|null} canonical type (e.g. 'deuteranopia'), or null when off
 */
export function resolveA11yType(workspace, frontMatter) {
	const ws = classify(workspace);
	if (ws.state !== 'unset') return ws.state === 'on' ? ws.type : null;
	const fm = classify(frontMatter);
	return fm.state === 'on' ? fm.type : null;
}

/**
 * The effective render inputs for a controller: reads the live `<html>`
 * attributes + the deck source, applies precedence, and returns the palette the
 * engine should render with (an `a11y-<type>` wins over the deck theme) and the
 * mode. `a11y` is the resolved type or null.
 */
export function resolveRenderInputs(root, source) {
	const mode = root.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
	const a11y = resolveA11yType(root.getAttribute('data-a11y'), readA11yFrontMatter(source));
	const palette = a11y ? 'a11y-' + a11y : root.getAttribute('data-palette') || 'indaco';
	return { palette, mode, a11y };
}
