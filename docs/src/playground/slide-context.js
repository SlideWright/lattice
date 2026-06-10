// Slide-context detection + completion logic for the editor's autocomplete.
//
// Pure and import-free (no CodeMirror) so the Node unit suite can exercise it
// directly — the same split focus-block.js uses against drawing-board-focus.js.
// The CodeMirror wiring lives in complete.js; this module is just the grammar.
//
// "Slide context" = the `<!-- _class: name modifier* -->` directive that
// governs the cursor's slide. Marp splits slides on a standalone `---`, so we
// walk back from the cursor to the nearest directive without crossing that
// boundary. This is the single place that knows "what component am I in",
// replacing the per-feature backward-walkers that used to drift from the
// grammar (see the map default-basemap bug, fixed in map-complete.js).

// The class directive, matched anywhere on a line. Mirrors the class-token
// notion in lib/authoring/lint-core.js so completion and lint agree by
// construction.
export const CLASS_RE = /<!--\s*_class:\s*([^>]+?)\s*-->/;

const SLIDE_BREAK = /^---\s*$/;

// Walk back from 1-based `lineNo` to the active `_class` directive. `getLine(n)`
// returns the text of 1-based line n (the caller adapts CodeMirror's doc, or a
// test passes a plain array accessor). Returns
// `{ name, modifiers, tokens, directiveLine }` or `null` when the cursor is not
// inside a classed slide (between slides, in front matter, or no directive
// above it on this slide).
export function slideClassAt(getLine, lineNo) {
	for (let n = lineNo; n >= 1; n--) {
		const text = getLine(n) ?? '';
		if (n !== lineNo && SLIDE_BREAK.test(text)) return null; // crossed a boundary
		const m = text.match(CLASS_RE);
		if (m) {
			const tokens = m[1].split(/\s+/).filter(Boolean);
			if (!tokens.length) return null;
			return { name: tokens[0], modifiers: tokens.slice(1), tokens, directiveLine: n };
		}
	}
	return null;
}

// What to complete given the current line's text BEFORE the cursor, when that
// cursor sits inside an as-yet-unclosed `_class:` directive (the `-->` is typed
// last, or not yet). Returns one of:
//   { kind: 'class',    from, typed }                 — the first token (component name)
//   { kind: 'modifier', from, typed, name, present }  — a modifier on `name`
//   null                                              — not in a class directive
// `from` is the COLUMN (offset within `before`) where the partial token starts;
// callers add the line's start offset to map it into the document.
export function classDirectiveCompletion(before) {
	// Everything after `_class:` up to the cursor, containing no `>` — so once
	// `-->` is typed before the cursor this stops matching (we're past the
	// directive and back in slide body / prose, where these sources stay quiet).
	const m = before.match(/<!--\s*_class:\s*([^>]*)$/);
	if (!m) return null;
	const tail = m[1];
	const partial = (tail.match(/(\S*)$/) || ['', ''])[1];
	const from = before.length - partial.length;
	const prior = tail.slice(0, tail.length - partial.length).split(/\s+/).filter(Boolean);
	if (prior.length === 0) return { kind: 'class', from, typed: partial };
	return { kind: 'modifier', from, typed: partial, name: prior[0], present: prior.slice(1) };
}

// Component-name completion options from the compact catalog (name + bucket).
// `type` drives CodeMirror's icon class; `detail` is the bucket chip.
export function classOptions(catalog) {
	return (catalog || []).map((c) => ({
		label: c.name,
		type: 'class',
		detail: c.bucket || '',
		info: c.summary || undefined,
	}));
}

// Modifier completion options for component `name`: its own declared variants
// first (most relevant), then the universal modifiers, minus any already
// present on the directive. Variants/universals may be multi-token decoration
// strings ('tint-corner at-tl'), so each fragment registers as its own option.
export function modifierOptions(name, catalog, universalModifiers, present = []) {
	const seen = new Set(present);
	const out = [];
	const push = (label, kind) => {
		if (!label || seen.has(label)) return;
		seen.add(label);
		out.push({ label, type: 'modifier', detail: kind });
	};
	const comp = (catalog || []).find((c) => c.name === name);
	if (comp) for (const v of comp.variants || []) for (const tok of String(v).split(/\s+/)) push(tok, 'variant');
	for (const u of universalModifiers || []) for (const tok of String(u).split(/\s+/)) push(tok, 'universal');
	return out;
}

// Which basemap a `map` slide uses. The world map is the DEFAULT; `us` (alias
// `usa`) switches to US states — matching map.docs.md. Earlier code inverted
// this and defaulted to `us`, hiding every country + group (Global South,
// blocs, continents) behind a redundant `world` token. Returns 'us' | 'world',
// or null when `info` is not a map slide. Pure (no basemap JSON) so it's unit
// testable; map-complete.js feeds the result into the baked option lists.
export function mapBasemapFor(info) {
	if (!info || info.name !== 'map') return null;
	const mods = info.modifiers || [];
	return mods.includes('us') || mods.includes('usa') ? 'us' : 'world';
}

// ── Surface C: skeleton drop-in ──────────────────────────────────────────────

// True when the slide owning `directiveLine` has an EMPTY body: every line from
// the directive down to the next slide break (`---`) or EOF is blank or itself
// an HTML-comment directive line. Gates skeleton insertion so it never clobbers
// a slide that already has content. `getLine(n)` is 1-based; `total` is the
// document's line count. `skipLine` (the cursor's line) is excluded so the
// partial word an author types to TRIGGER the skeleton doesn't count as content.
export function slideBodyEmpty(getLine, total, directiveLine, skipLine = 0) {
	for (let n = directiveLine + 1; n <= total; n++) {
		if (n === skipLine) continue; // the line being typed to trigger insertion
		const text = getLine(n) ?? '';
		if (SLIDE_BREAK.test(text)) break; // reached the next slide
		if (text.trim() === '') continue; // blank
		if (/^\s*<!--.*-->\s*$/.test(text)) continue; // another directive line
		return false; // real content present
	}
	return true;
}

// The body of a component skeleton — its slot scaffold with the leading
// directive comment line(s) and surrounding blank lines stripped, since the
// `_class:` directive already exists when we drop a skeleton in. Returns a
// trimmed multi-line string (no trailing whitespace).
export function skeletonBody(skeleton) {
	const lines = String(skeleton || '').split('\n');
	let i = 0;
	while (i < lines.length && (lines[i].trim() === '' || /^\s*<!--.*-->\s*$/.test(lines[i]))) i++;
	return lines.slice(i).join('\n').replace(/\s+$/, '');
}

// The cursor's position on a blank slide-body line, for skeleton insertion: the
// text before the cursor must be only leading whitespace + an optional partial
// word (no other content). Returns `{ from, typed }` (from = the column where
// the word starts) or null when the line already holds content.
export function blankBodyPartial(before) {
	const m = before.match(/^(\s*)([\w-]*)$/);
	if (!m) return null;
	return { from: m[1].length, typed: m[2] };
}

// ── Surface D: per-component data-source registry ────────────────────────────

// Wrap a body-data completer with the shared slide detection. `fn(context,
// info, line)` runs only when the cursor's slide is one of `components`. CM-free
// (operates on the duck-typed completion context), so it's unit testable and
// lets a data component register declaratively (see data-sources.js).
export function makeDataSource(components, fn) {
	const set = new Set(components);
	return (context) => {
		const doc = context.state.doc;
		const line = doc.lineAt(context.pos);
		const info = slideClassAt((n) => doc.line(n).text, line.number);
		if (!info || !set.has(info.name)) return null;
		return fn(context, info, line);
	};
}
