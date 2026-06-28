// Deck front-matter — the leading `---` YAML-ish block that carries deck-level
// directives the engine honors (`size`, `paginate`, `header`, `footer`, `theme`).
// The Inspector writes these into the source so they are REAL: visible in the
// editor, carried into every export, and (for `size`) reflected in the preview.
//
// Deliberately tiny + line-based (not a YAML lib): the directives we set are
// flat `key: value` scalars. Pure — no DOM, no engine.

// Match a leading `---` block AND any blank lines that follow it, so stripping
// the block leaves the body flush (no stray leading newline).
const FM_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n[ \t]*)*/;

/** The raw leading front-matter block (incl. delimiters + trailing newline), or ''. */
export function frontMatterBlock(source: string): string {
	const m = FM_RE.exec(String(source ?? ''));
	return m ? m[0] : '';
}

/** The source with its leading front-matter block removed. */
export function stripFrontMatter(source: string): string {
	const src = String(source ?? '');
	const m = FM_RE.exec(src);
	return m ? src.slice(m[0].length) : src;
}

/** Parse the leading block into an ordered list of [key, value] pairs. */
function parsePairs(source: string): [string, string][] {
	const m = FM_RE.exec(String(source ?? ''));
	if (!m) return [];
	const pairs: [string, string][] = [];
	for (const line of m[1].split(/\r?\n/)) {
		const kv = /^([A-Za-z][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
		if (kv) pairs.push([kv[1], unquote(kv[2])]);
	}
	return pairs;
}

function unquote(v: string): string {
	const t = v.trim();
	if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
	return t;
}
function quoteIfNeeded(v: string): string {
	return /^[\w:.\-/]+$/.test(v) ? v : `"${v.replace(/"/g, '\\"')}"`;
}

/** Read a single directive's value, or undefined if absent. */
export function getFrontMatter(source: string, key: string): string | undefined {
	const hit = parsePairs(source).find(([k]) => k === key);
	return hit?.[1];
}

/**
 * Set (or, with `value === null`, remove) a single front-matter directive,
 * preserving the rest of the block and the body. Creating the first directive
 * adds the block at the very top; removing the last one drops the block entirely.
 */
export function setFrontMatter(source: string, key: string, value: string | null): string {
	const body = stripFrontMatter(source);
	const pairs = parsePairs(source).filter(([k]) => k !== key);
	if (value !== null) pairs.push([key, value]);
	if (!pairs.length) return body;
	const block = pairs.map(([k, v]) => `${k}: ${quoteIfNeeded(v)}`).join('\n');
	// Single blank line between the block and the body (collapse any the body led with).
	return `---\n${block}\n---\n\n${body.replace(/^\s+/, '')}`;
}
