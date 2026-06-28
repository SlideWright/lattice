// Speaker notes — read/write a slide's presenter note in its source.
//
// In LFM (Marp-faithful) a NON-directive HTML comment on a slide IS that slide's
// speaker note; the engine surfaces it in the presenter view / PDF notes / PPTX.
// The Studio authors notes as `<!-- note: … -->` (still a plain note to the
// engine) and, when reading, accepts any non-directive comment so a hand-authored
// note round-trips. Pure string transforms over a single slide chunk; tested.

// Comment bodies that are DIRECTIVES (or per-slide directives), not notes.
const DIRECTIVE = /^_?(class|paginate|header|footer|theme|color|backgroundcolor|background|size|split|autosplit|finish|lang|present)\b/i;
const COMMENT = /<!--([\s\S]*?)-->/g;
const isDirective = (body: string) => DIRECTIVE.test(body.trim());

/** The slide's speaker note (the first non-directive comment), or '' . */
export function getNote(chunk: string): string {
	const text = String(chunk || '');
	COMMENT.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = COMMENT.exec(text))) {
		const body = m[1].trim();
		if (isDirective(body)) continue;
		return body.replace(/^note:\s*/i, '').trim();
	}
	return '';
}

/**
 * Set (or clear, with an empty note) the slide's speaker note: strip any existing
 * non-directive note comment(s), then append the new one. Directive comments
 * (`_class`, `paginate`, …) are left untouched.
 */
export function setNote(chunk: string, note: string): string {
	const text = String(chunk || '');
	// Collect the ranges of existing note comments (non-directive).
	const ranges: [number, number][] = [];
	COMMENT.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = COMMENT.exec(text))) {
		if (!isDirective(m[1].trim())) ranges.push([m.index, m.index + m[0].length]);
	}
	let out = text;
	for (let i = ranges.length - 1; i >= 0; i--) out = out.slice(0, ranges[i][0]) + out.slice(ranges[i][1]);
	out = out.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
	const t = note.trim().replace(/--+>/g, '->'); // never let the body close the comment early
	return t ? `${out}\n\n<!-- note: ${t} -->` : out;
}
