// Pure, DOM-free helpers shared by the shell and its tests — so the splitting and
// the "unknown component" detection (the engine of the inline-validation badge)
// are property-testable without rendering anything.

/** Split deck source into trimmed, non-empty slide chunks on `---` fences. */
export function splitSlides(src: string): string[] {
	return String(src ?? '')
		.split(/\n-{3,}\n/)
		.map((s) => s.trim())
		.filter(Boolean);
}

const CLASS_RE = /<!--\s*_class:\s*([A-Za-z0-9-]+)\s*-->/g;

/** The `_class` component names used in the source, in document order. */
export function usedComponents(src: string): string[] {
	const out: string[] = [];
	let m: RegExpExecArray | null;
	CLASS_RE.lastIndex = 0;
	while ((m = CLASS_RE.exec(String(src ?? '')))) out.push(m[1]);
	return out;
}

/** Component names used in the source that are NOT in the known set. */
export function unknownComponents(src: string, known: Iterable<string>): string[] {
	const set = new Set(known);
	return usedComponents(src).filter((n) => !set.has(n));
}

/** The component label for a single slide — its first `_class`, or `text` for a
 *  bare-Markdown slide. Drives the slide-navigator chips. */
export function slideClass(slideSrc: string): string {
	CLASS_RE.lastIndex = 0;
	return CLASS_RE.exec(String(slideSrc ?? ''))?.[1] ?? 'text';
}

/** Zero-based index of the slide containing character offset `pos` — the count of
 *  `---` fences before it. Pairs with splitSlides() to sync editor cursor ↔ preview. */
export function slideIndexAt(src: string, pos: number): number {
	const before = String(src ?? '').slice(0, Math.max(0, pos));
	return before.match(/\n-{3,}\n/g)?.length ?? 0;
}

/** Character offset where slide `index` begins — just past its preceding fence.
 *  The inverse of slideIndexAt, for scrolling the editor to a slide. */
export function slideStartOffset(src: string, index: number): number {
	if (index <= 0) return 0;
	const text = String(src ?? '');
	const re = /\n-{3,}\n/g;
	let m: RegExpExecArray | null;
	let pos = 0;
	let count = 0;
	while ((m = re.exec(text)) && count < index) {
		pos = m.index + m[0].length;
		count++;
	}
	return pos;
}
