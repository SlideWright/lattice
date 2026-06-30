// The Studio finish library — a thin wrapper over the SHARED Workbench asset
// store (asset-store.js, IndexedDB `lattice-workbench`), mirroring theme-library
// and component-library. REUSE, DON'T REINVENT (HARD RULE #15): a finish you
// fabricate + save in the Finish faculty lands on the SAME shelf as themes and
// components, so the unified Library lists all three.
//
// A finish record is `kind:'finish'`: a generated parametric backdrop, stored as
// its CSS (a `section.<name> { … }` rule) plus light view metadata. Degrades
// gracefully when IndexedDB is unavailable (private mode / SSR / jsdom): reads
// return an empty shelf rather than throwing.

import { deleteAsset, listAssets, putAsset } from '@/playground/asset-store.js';

/** A saved finish as the Studio uses it (apply with `_class: <name>` / preview via css). */
export type StudioFinish = {
	id: string;
	name: string; // the backdrop class slug, e.g. `backdrop-aurora-7c3`
	label: string; // human-facing name
	css: string; // the `section.<name> { … }` rule(s)
	nature: 'parametric';
	zone: 'field';
	swatch?: string; // a CSS background for the library card / picker chip
};

type FinishAssetRecord = {
	id: string; name: string; label?: string; text?: string;
	nature?: 'parametric'; zone?: 'field'; swatch?: string;
};

/** Slugify to a valid backdrop class fragment (`^[a-z][a-z0-9-]*$`). */
export function slugifyFinish(text: string): string {
	const s = String(text || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/^[^a-z]+/, '');
	return s.slice(0, 40).replace(/-+$/, '');
}

function toStudioFinish(a: FinishAssetRecord): StudioFinish {
	return {
		id: a.id, name: a.name, label: a.label || a.name, css: a.text || '',
		nature: a.nature ?? 'parametric', zone: a.zone ?? 'field', swatch: a.swatch,
	};
}

/**
 * Save a fabricated finish to the shared library. Re-saving the same name UPDATES
 * in place (asset-store keys on kind+name). Resolves to the stored finish;
 * rejects only if the store is genuinely unavailable.
 */
export async function saveStudioFinish(input: {
	name: string; label: string; css: string; swatch?: string;
}): Promise<StudioFinish> {
	const name = /^[a-z][a-z0-9-]*$/.test(input.name)
		? input.name
		: slugifyFinish(input.label) || `backdrop-${slugifyFinish(input.name) || 'custom'}`;
	const record = {
		kind: 'finish' as const,
		name,
		label: input.label,
		text: input.css,
		nature: 'parametric' as const,
		zone: 'field' as const,
		swatch: input.swatch,
	};
	const stored = (await putAsset(record)) as FinishAssetRecord;
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
