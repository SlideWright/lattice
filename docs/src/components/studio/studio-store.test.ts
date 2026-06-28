import { afterEach, describe, expect, it } from 'vitest';
import { DECKS } from './decks';
import { createDeck, deleteDeck, loadDeckList, loadSettings, loadSource, metaFor, renameDeck, saveSettings, saveSource } from './studio-store';

afterEach(() => localStorage.clear());

describe('studio-store — deck index', () => {
	it('seeds the list from the built-in decks on first run', () => {
		const list = loadDeckList();
		expect(list.map((d) => d.id)).toEqual(DECKS.map((d) => d.id));
		expect(list[0].meta).toMatch(/\d+ slides?/);
	});

	it('createDeck appends a persisted, editable deck', () => {
		const before = loadDeckList().length;
		const d = createDeck('My deck');
		expect(d.title).toBe('My deck');
		const list = loadDeckList();
		expect(list.length).toBe(before + 1);
		expect(list.find((x) => x.id === d.id)).toBeTruthy();
	});

	it('renameDeck and deleteDeck persist', () => {
		const d = createDeck('Temp');
		renameDeck(d.id, 'Renamed');
		expect(loadDeckList().find((x) => x.id === d.id)?.title).toBe('Renamed');
		deleteDeck(d.id);
		expect(loadDeckList().find((x) => x.id === d.id)).toBeUndefined();
	});
});

describe('studio-store — per-deck source', () => {
	it('round-trips edited source and overrides the canonical', () => {
		const id = DECKS[0].id;
		expect(loadSource(id)).toBeNull();
		saveSource(id, '<!-- _class: title -->\n\n# Edited');
		expect(loadSource(id)).toContain('# Edited');
		// The list reflects the edit (slide count from the edited source).
		expect(loadDeckList().find((d) => d.id === id)?.slides[0]).toContain('# Edited');
	});

	it('metaFor counts slides — agreeing with the rail splitter on tight separators', () => {
		expect(metaFor('a\n\n---\n\nb\n\n---\n\nc')).toBe('3 slides');
		expect(metaFor('only one')).toBe('1 slide');
		// Tight + trailing separators count the same as the live rail (splitSlides),
		// not the old per-variant regex (which over/under-counted these).
		expect(metaFor('# A\n---\n# B')).toBe('2 slides');
		expect(metaFor('# A\n\n---\n\n# B\n\n---\n')).toBe('2 slides');
	});
});

describe('studio-store — settings', () => {
	it('defaults then round-trips', () => {
		expect(loadSettings()).toEqual({ validation: true, pageNumbers: true, headerFooter: false });
		saveSettings({ pageNumbers: false });
		expect(loadSettings().pageNumbers).toBe(false);
		expect(loadSettings().validation).toBe(true); // untouched keys keep defaults
	});
});
