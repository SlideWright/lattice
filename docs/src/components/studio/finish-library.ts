// The Studio finish library — a thin wrapper over the SHARED Workbench asset store
// (asset-store.js, IndexedDB `lattice-workbench`), the same shelf the theme +
// component libraries use. REUSE, DON'T REINVENT (HARD RULE #15): a finish you
// design + save in the Finish faculty lands beside your saved themes and
// components, survives a reload, and becomes pickable in the Inspector Finish menu
// (where its CSS is injected into the deck preview + its class applied — the
// consumption loop). Degrades gracefully when IndexedDB is unavailable (private
// mode / SSR / jsdom) so a read never throws — it just returns an empty shelf.

import { deleteAsset, listAssets, putAsset } from '@/playground/asset-store.js';
import { coerceRecipe, type FinishRecipe } from './finish-generate';

/** A saved finish as the Studio uses it (render with its CSS via DeckPreview's
 *  extraCss + the `finish finish-<name>` class). */
export type StudioFinish = {
	id: string;
	name: string; // lowercase slug — the `finish-<name>` class fragment
	label: string; // human-facing name
	css: string; // the generated `section.finish.finish-<name> { … }` rule
	recipe: FinishRecipe; // the structured layer recipe (for re-editing)
};

// The asset record asset-store persists. `kind:'finish'` keeps it in its own lane
// (listAssets filters by kind), beside 'theme' and 'component'.
type FinishAssetRecord = { id: string; kind: 'finish'; name: string; label?: string; text?: string; recipe?: unknown; addedAt?: number };

function toStudioFinish(a: FinishAssetRecord): StudioFinish {
	return { id: a.id, name: a.name, label: a.label || a.name, css: a.text || '', recipe: coerceRecipe(a.recipe) };
}

/** Turn arbitrary text into a valid finish slug, or '' when nothing usable remains. */
export function slugify(text: string): string {
	return String(text || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
		.replace(/-+$/, '');
}

/**
 * Save a designed finish to the shared library. Re-saving the same name UPDATES in
 * place (asset-store keys on kind+name) rather than piling up duplicates. The
 * recipe is persisted so a saved finish reloads with its layer stack intact for
 * re-editing. Resolves to the stored Studio finish; rejects if the store is
 * unavailable.
 */
export async function saveStudioFinish(input: { name: string; label?: string; css: string; recipe: FinishRecipe }): Promise<StudioFinish> {
	const name = slugify(input.name) || `finish-${Date.now().toString(36)}`;
	const record: FinishAssetRecord = {
		id: '', // asset-store assigns one (or reuses the existing id for kind+name)
		kind: 'finish',
		name,
		label: input.label || name,
		text: input.css,
		recipe: input.recipe,
		addedAt: Date.now(),
	};
	// asset-store's putAsset replaces the empty id with a generated/looked-up one.
	const { id: _drop, ...rest } = record;
	const stored = (await putAsset(rest as unknown as FinishAssetRecord)) as FinishAssetRecord;
	return toStudioFinish(stored);
}

/** Every saved finish, newest first. Returns [] when the store is unavailable. */
export async function listStudioFinishes(): Promise<StudioFinish[]> {
	try {
		const rows = (await listAssets('finish')) as FinishAssetRecord[];
		return rows.map(toStudioFinish);
	} catch {
		return [];
	}
}

/** Remove a saved finish by id (no-op if the store is unavailable). */
export async function deleteStudioFinish(id: string): Promise<void> {
	try {
		await deleteAsset(id);
	} catch {
		/* unavailable — non-fatal */
	}
}
