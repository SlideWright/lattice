// Studio findings — the REAL deterministic lint findings (the same ones the editor
// underlines), surfaced as a deck-wide list the Architect Coach panel can act on.
// REUSE, DON'T REINVENT (HARD RULE #15): the findings come from the shared lint-core
// (`authoring-core.generated.js` `lintTextWith`) over the build-time vocabulary
// (`buildVocabSets`), exactly as the editor's inline linter computes them — so the
// panel list and the editor underlines never disagree. The heavy bundle loads
// lazily (first call) and degrades to [] when it's unavailable.

import { buildVocabSets } from '@/playground/editor-diagnostics.js';
import type { Finding } from './architect';

// biome-ignore lint/suspicious/noExplicitAny: lint-core is an untyped generated bundle.
let coreMod: any = null;

/**
 * Every deterministic finding in `source`, newest-deck-order. `lintVocab` is the
 * build-time grammar vocabulary (from the page); `extraNames` are saved local
 * component names folded in so an authored `.<name>` isn't flagged unknown — the
 * same union the editor applies. Returns [] with no vocabulary or if the bundle
 * can't load (never throws into render).
 */
export async function listFindings(lintVocab: unknown, source: string, extraNames: string[] = []): Promise<Finding[]> {
	const v = lintVocab as { names?: unknown } | null;
	if (!v?.names) return [];
	try {
		if (!coreMod) {
			const m = await import('@/playground/authoring-core.generated.js');
			coreMod = m.lintCore;
		}
		if (!coreMod?.lintTextWith) return [];
		const vocab = buildVocabSets(lintVocab);
		for (const n of extraNames) vocab.names.add(n);
		return coreMod.lintTextWith(source, vocab) as Finding[];
	} catch {
		return [];
	}
}
