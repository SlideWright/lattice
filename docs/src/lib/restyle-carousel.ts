// Pure carousel-cycling logic for the landing "restyle" showcase, extracted so
// the index math is unit-tested away from the DOM/engine. The RestyleShowcase
// island owns the timer + the live render; this owns only "what comes next".

export type Palette = { name: string; label: string; accent: string };

/** Wrap an index into [0, len) — handles the +1 advance and manual jumps. */
export function wrapIndex(i: number, len: number): number {
	if (len <= 0) return 0;
	return ((i % len) + len) % len;
}

/** The next palette index when auto-advancing (wraps past the end). */
export function nextIndex(current: number, len: number): number {
	return wrapIndex(current + 1, len);
}
