import { describe, expect, it } from 'vitest';
import { listStudioComponents, saveStudioComponent } from './component-library';

describe('component-library', () => {
	it('lists an empty shelf when the asset store is unavailable (no IndexedDB)', async () => {
		// jsdom ships no IndexedDB; the wrapper must resolve [] rather than throw.
		await expect(listStudioComponents()).resolves.toEqual([]);
	});

	it('rejects an invalid component name (the record shape enforces a slug)', async () => {
		// componentAsset throws on a non-slug name before any storage call.
		await expect(saveStudioComponent({ name: 'Bad Name', css: 'section.x{}', skeleton: '' })).rejects.toBeTruthy();
	});
});
