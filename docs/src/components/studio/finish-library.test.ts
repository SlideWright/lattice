import { describe, expect, it } from 'vitest';
import { DEFAULT_RECIPE } from './finish-generate';
import { listStudioFinishes, saveStudioFinish, slugify } from './finish-library';

describe('finish-library — slugify', () => {
	it('lowercases, hyphenates, and trims to a valid finish slug', () => {
		expect(slugify('Calm Blueprint')).toBe('calm-blueprint');
		expect(slugify('My Finish!!')).toBe('my-finish');
		expect(slugify('  spaced  out  ')).toBe('spaced-out');
	});
	it('returns empty when nothing usable remains (caller falls back)', () => {
		expect(slugify('   ')).toBe('');
		expect(slugify('!!!')).toBe('');
	});
});

describe('finish-library — graceful degradation', () => {
	it('lists an empty shelf when the asset store is unavailable (no IndexedDB in jsdom)', async () => {
		await expect(listStudioFinishes()).resolves.toEqual([]);
	});
	it('save rejects (does not silently succeed) when the store is unavailable', async () => {
		// jsdom ships no IndexedDB; putAsset throws → save rejects, so the UI can show
		// an honest "could not save" note rather than a false success.
		await expect(saveStudioFinish({ name: 'demo', label: 'Demo', css: 'section.finish.finish-demo {}', recipe: DEFAULT_RECIPE })).rejects.toBeDefined();
	});
});
