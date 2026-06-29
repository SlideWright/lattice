// The Studio component library — a thin wrapper over the SHARED Workbench asset
// store (asset-store.js, IndexedDB `lattice-workbench`) and the canonical
// `componentAsset` record shape (layout-core). REUSE, DON'T REINVENT (HARD RULE
// #15): a local component authored + saved in the Studio's Fabricate Layout tab
// lands in the SAME library the Workbench's Layout Studio saves into. The
// persistence + record shapes are the trusted cores; this module only maps to
// the Studio's view model and degrades gracefully when IndexedDB is unavailable.

import { deleteAsset, listAssets, putAsset } from '@/playground/asset-store.js';
import { componentAsset } from '@/playground/layout-core.generated.js';

/** A saved local component as the Studio uses it. */
export type StudioComponent = {
	id: string;
	name: string; // lowercase slug — the `<!-- _class: name -->` invoked
	bucket: string | null;
	css: string;
	skeleton: string;
};

type ComponentAssetRecord = { id: string; name: string; bucket?: string | null; text?: string; skeleton?: string };

function toStudioComponent(a: ComponentAssetRecord): StudioComponent {
	return { id: a.id, name: a.name, bucket: a.bucket ?? null, css: a.text || '', skeleton: a.skeleton || '' };
}

/**
 * Save a local component to the shared library. Re-saving the same name UPDATES
 * in place (asset-store keys on kind+name). Throws if the name isn't a valid slug
 * (componentAsset enforces it) or the store is unavailable.
 */
export async function saveStudioComponent(input: { name: string; css: string; skeleton: string; bucket?: string; description?: string }): Promise<StudioComponent> {
	const manifest: { name: string; bucket?: string; description?: string } = { name: input.name };
	if (input.bucket) manifest.bucket = input.bucket;
	if (input.description?.trim()) manifest.description = input.description.trim();
	const asset = componentAsset({ name: input.name, css: input.css, skeleton: input.skeleton, manifest });
	const stored = (await putAsset(asset)) as ComponentAssetRecord;
	return toStudioComponent(stored);
}

/** Every saved local component, newest first. Returns [] when the store is unavailable. */
export async function listStudioComponents(): Promise<StudioComponent[]> {
	try {
		const rows = (await listAssets('component')) as ComponentAssetRecord[];
		return rows.map(toStudioComponent);
	} catch {
		return [];
	}
}

/** Remove a saved component by id (no-op if the store is unavailable). */
export async function deleteStudioComponent(id: string): Promise<void> {
	try {
		await deleteAsset(id);
	} catch {
		/* unavailable — non-fatal */
	}
}
