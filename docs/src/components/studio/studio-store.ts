import { DECKS, deckSource, type StudioDeck } from './decks';

// Studio persistence — localStorage-backed, Studio-scoped (lattice-studio-*).
// Three concerns, kept independent so a corrupt value in one never breaks the
// others (every read is try/caught and falls back):
//   1. The deck INDEX — which decks exist, their titles + order (seeded from the
//      built-in DECKS, then user-mutable: new / rename / delete).
//   2. Per-deck edited SOURCE — your edits, so switching decks and coming back
//      restores what you wrote (the gap this closes).
//   3. SETTINGS — the Workspace/Inspector toggles that should survive a reload.

const INDEX_LS = 'lattice-studio-deck-index'; // [{id,title,builtin}]
const SRC_PREFIX = 'lattice-studio-src-'; // + deckId → edited source
const SETTINGS_LS = 'lattice-studio-settings'; // { validation, pageNumbers, headerFooter }

function read<T>(key: string): T | null {
	try {
		const v = localStorage.getItem(key);
		return v ? (JSON.parse(v) as T) : null;
	} catch {
		return null;
	}
}
function write(key: string, value: unknown): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		/* storage full / unavailable — non-fatal */
	}
}

/** `N slides` for the deck-switcher meta line. */
export function metaFor(source: string): string {
	const n = source.split(/^\s*---\s*$/m).filter((s) => s.trim()).length || 1;
	return `${n} slide${n === 1 ? '' : 's'}`;
}

type IndexEntry = { id: string; title: string; builtin: boolean };

/** The persisted deck index, seeded from the built-ins on first run. */
function loadIndex(): IndexEntry[] {
	const saved = read<IndexEntry[]>(INDEX_LS);
	if (saved?.length) return saved;
	return DECKS.map((d) => ({ id: d.id, title: d.title, builtin: true }));
}
function saveIndex(index: IndexEntry[]): void {
	write(INDEX_LS, index);
}

/** Edited source for a deck, or null if it has never been edited. */
export function loadSource(id: string): string | null {
	return read<string>(SRC_PREFIX + id);
}
/** Persist a deck's edited source. */
export function saveSource(id: string, source: string): void {
	write(SRC_PREFIX + id, source);
}
function dropSource(id: string): void {
	try {
		localStorage.removeItem(SRC_PREFIX + id);
	} catch {
		/* non-fatal */
	}
}

// The canonical (unedited) source for a deck. Built-ins come from DECKS; a
// user-created deck stores its starter slides in the index-paired template.
const NEW_DECK_TEMPLATE = '<!-- _class: title -->\n\n# Untitled deck\n\n`Draft`\n\nStart typing to build your deck.';
function canonicalSource(entry: IndexEntry): string {
	const builtin = DECKS.find((d) => d.id === entry.id);
	return builtin ? deckSource(builtin) : NEW_DECK_TEMPLATE;
}

/**
 * Resolve the full deck list with each deck's CURRENT source (edited override,
 * else canonical). This is what the shell renders + switches between.
 */
export function loadDeckList(): StudioDeck[] {
	return loadIndex().map((e) => {
		const source = loadSource(e.id) ?? canonicalSource(e);
		return { id: e.id, title: e.title, meta: metaFor(source), slides: source.split(/\n\n---\n\n/) };
	});
}

/** Create + persist a new deck; returns it (with its starter source saved). */
export function createDeck(title = 'Untitled deck'): StudioDeck {
	// Date.now is fine in app code (unlike workflow scripts) — a stable unique id.
	const id = `deck-${Date.now().toString(36)}`;
	const index = loadIndex();
	index.push({ id, title, builtin: false });
	saveIndex(index);
	saveSource(id, NEW_DECK_TEMPLATE);
	return { id, title, meta: metaFor(NEW_DECK_TEMPLATE), slides: NEW_DECK_TEMPLATE.split(/\n\n---\n\n/) };
}

/** Rename a deck in the index. */
export function renameDeck(id: string, title: string): void {
	const t = title.trim();
	if (!t) return;
	saveIndex(loadIndex().map((e) => (e.id === id ? { ...e, title: t } : e)));
}

/** Remove a deck (index entry + its edited source). */
export function deleteDeck(id: string): void {
	saveIndex(loadIndex().filter((e) => e.id !== id));
	dropSource(id);
}

export type StudioSettings = { validation: boolean; pageNumbers: boolean; headerFooter: boolean };
const DEFAULT_SETTINGS: StudioSettings = { validation: true, pageNumbers: true, headerFooter: false };

export function loadSettings(): StudioSettings {
	return { ...DEFAULT_SETTINGS, ...(read<Partial<StudioSettings>>(SETTINGS_LS) ?? {}) };
}
export function saveSettings(partial: Partial<StudioSettings>): void {
	write(SETTINGS_LS, { ...loadSettings(), ...partial });
}
