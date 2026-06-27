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
