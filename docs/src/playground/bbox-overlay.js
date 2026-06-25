// bbox-overlay.js — debug "bounding boxes": colour-coded outlines around every
// element in the live preview, for eyeballing layout, nesting, and spacing while
// you edit. A parent-injected overlay (like the chart-interact layer), NOT a
// render-pipeline change: it injects ONE <style> into the same-origin `srcdoc`
// document and removes it on toggle-off, so it never touches deck-preview.js,
// the export bytes, or any of the four surfaces' render paths.
//
// "Don't take up space": every rule uses `outline` (painted, zero layout box),
// never `border` — so toggling boxes can't reflow a slide. `outline-offset:-1px`
// draws each line just inside its box, so a child's outline never bleeds past its
// parent and the deck never grows a stray scrollbar. Each element ROLE gets its
// own hue so structure reads at a glance.

export const BBOX_STYLE_ID = 'lattice-bbox-style';

// Role → colour. Distinct hues, legible over both the light and dark preview
// backgrounds. Kept here (not a .css file) because the rules are injected into
// the iframe document, which has no link to the docs stylesheet.
const ROLES = [
	['section', '#e6194b'], //                              slide frame — red
	['h1,h2,h3,h4,h5,h6', '#f58231'], //                    headings — orange
	['p', '#4363d8'], //                                    paragraphs — blue
	['ul,ol,dl', '#3cb44b'], //                             lists — green
	['li,dt,dd', '#42d4f4'], //                             list items — cyan
	['a', '#911eb4'], //                                    links — purple
	['img,svg,picture,video,figure', '#f032e6'], //         media — magenta
	['table,thead,tbody,tr,th,td', '#9a6324'], //           tables — brown
	['pre,code,kbd,samp', '#469990'], //                    code — teal
	['blockquote', '#808000'], //                           quotes — olive
	['hr', '#bfbf3f'], //                                   rules — yellow
];

// Catch-all for any structural container the role list didn't name (div,
// header/footer/aside, span, custom elements): a faint neutral outline so
// wrapper/grid boxes are visible without drowning the coloured roles. No
// `!important`, so the role rules below always win on the elements they match.
const CONTAINER = 'rgba(128,128,128,0.45)';

/**
 * The CSS injected into the preview iframe. Scoped under `.marpit` so only
 * rendered slide content is outlined, never the iframe chrome.
 */
export function bboxCss() {
	const rule = (sel, color) =>
		`${sel
			.split(',')
			.map((s) => `.marpit ${s.trim()}`)
			.join(',')}{outline:1px solid ${color}!important;outline-offset:-1px!important;}`;
	return [
		'/* lattice debug bounding boxes */',
		`.marpit *{outline:1px solid ${CONTAINER};outline-offset:-1px;}`,
		...ROLES.map(([sel, color]) => rule(sel, color)),
	].join('\n');
}

/**
 * Inject (on=true) or remove (on=false) the bounding-box style in `frame`'s
 * document. Safe to call repeatedly and before the iframe has a document (both
 * no-op). Idempotent: never stacks duplicate <style> nodes.
 */
export function applyBbox(frame, on) {
	let doc;
	try {
		doc = frame?.contentDocument;
	} catch {
		doc = null; // cross-origin (shouldn't happen for srcdoc) — bail quietly
	}
	if (!doc) return;
	const existing = doc.getElementById(BBOX_STYLE_ID);
	if (!on) {
		if (existing) existing.remove();
		return;
	}
	if (existing) return;
	const style = doc.createElement('style');
	style.id = BBOX_STYLE_ID;
	style.textContent = bboxCss();
	(doc.head || doc.documentElement).appendChild(style);
}
