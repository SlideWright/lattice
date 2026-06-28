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

export type PresentLens = 'full' | 'exec' | 'onepager';

/** The slides to present under a reader lens (plan §17: "meet the reader where
 *  they are"). `full` = the whole deck; `exec` = the headline slides only;
 *  `onepager` = the single most load-bearing slide. Pure; always non-empty when
 *  given a non-empty deck (falls back to the full deck rather than nothing). */
export function presentationSet(slides: string[], lens: PresentLens): string[] {
	const all = Array.isArray(slides) ? slides.filter((s) => typeof s === 'string') : [];
	if (lens === 'full' || all.length === 0) return all;
	if (lens === 'exec') {
		const keep = new Set(['title', 'kpi', 'stats', 'big-number', 'closing']);
		const sub = all.filter((s) => keep.has(slideClass(s)));
		return sub.length ? sub : all;
	}
	// onepager — the single most "headline" slide, else the opener.
	const hero = all.find((s) => ['kpi', 'stats', 'big-number'].includes(slideClass(s)));
	return [hero ?? all[0]];
}

export type DeckScore = {
	/** 0–10 board-readiness, one decimal. */
	score: number;
	/** Overall posture for the status tag. */
	intent: 'pass' | 'review' | 'fix';
	rows: { label: string; ok: boolean; note: string }[];
};

/** A deterministic, deck-reactive readiness score for the Architect. NOT an AI
 *  judgement — a transparent heuristic over what's measurable in the source
 *  (valid components, an opening title, component variety, enough slides) so the
 *  scorecard moves as you edit. Pure + fuzz-tested; never throws. */
export function scoreDeck(source: string, known: Iterable<string>): DeckScore {
	const slides = splitSlides(source);
	const used = usedComponents(source);
	const unknown = unknownComponents(source, known);
	const variety = new Set(used).size;
	const n = slides.length;

	const validOk = unknown.length === 0;
	const titleOk = used.includes('title');
	const varietyOk = variety >= Math.min(3, Math.max(1, n));

	let score = 10;
	score -= Math.min(6, unknown.length * 1.5); // unknown components are the big hit
	if (!titleOk) score -= 1;
	if (!varietyOk) score -= 1;
	if (n < 3) score -= 1;
	score = Math.max(0, Math.min(10, score));

	const intent: DeckScore['intent'] = !validOk ? 'fix' : score >= 8 ? 'pass' : 'review';

	return {
		score: Math.round(score * 10) / 10,
		intent,
		rows: [
			{ label: 'Components valid', ok: validOk, note: validOk ? 'pass' : `${unknown.length} to fix` },
			{ label: 'Opens with a title', ok: titleOk, note: titleOk ? 'pass' : 'add title' },
			{ label: 'Variety', ok: varietyOk, note: `${variety} type${variety === 1 ? '' : 's'}` },
		],
	};
}
