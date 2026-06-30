import { DECKS, deckSource, type StudioDeck } from './decks';
import { stripFrontMatter } from './front-matter';
import { splitSlides } from './lint';
import { DEFAULT_LANGUAGE, detectLanguage } from './studio-language';

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
const SETTINGS_LS = 'lattice-studio-settings'; // { validation, pageNumbers, headerFooter, language }
const INSTRUCTIONS_LS = 'lattice-studio-instructions'; // standing instructions (free text)

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

/** Derive a deck title from its source — the first heading, else a fallback. */
export function titleFromSource(source: string, fallback = 'Imported deck'): string {
	const m = stripFrontMatter(source).match(/^#{1,3}\s+(.+?)\s*$/m);
	return (m?.[1] ?? '').replace(/[`*_]/g, '').trim().slice(0, 60) || fallback;
}

/** `N slides` for the deck-switcher meta line — the SAME splitter the live rail
 *  uses (splitSlides), front-matter excluded, so the count never disagrees with
 *  the rendered rail. */
export function metaFor(source: string): string {
	const n = splitSlides(stripFrontMatter(source)).length || 1;
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
		return { id: e.id, title: e.title, meta: metaFor(source), slides: splitSlides(stripFrontMatter(source)) };
	});
}

/**
 * Create + persist a new deck. With `source` given (a deck import) the deck is
 * seeded with that content; otherwise the blank starter. Returns the new deck.
 */
export function createDeck(title = 'Untitled deck', source?: string): StudioDeck {
	// Date.now is fine in app code (unlike workflow scripts). Add a short random
	// suffix so two creates in the same millisecond (double-click) can't collide.
	const id = `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	const body = source?.trim() ? source : NEW_DECK_TEMPLATE;
	const index = loadIndex();
	index.push({ id, title, builtin: false });
	saveIndex(index);
	saveSource(id, body);
	return { id, title, meta: metaFor(body), slides: splitSlides(stripFrontMatter(body)) };
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

// ── Version history (checkpoints) ──────────────────────────────────────────
const SNAP_PREFIX = 'lattice-studio-snap-'; // + deckId → Checkpoint[]
const SNAP_CAP = 25; // keep the most recent N per deck

export type Checkpoint = { id: string; ts: number; label: string; source: string };

/** Checkpoints for a deck, newest first. */
export function loadCheckpoints(deckId: string): Checkpoint[] {
	return read<Checkpoint[]>(SNAP_PREFIX + deckId) ?? [];
}
/**
 * Save a checkpoint of `source` (skipping a no-op if it matches the latest), cap
 * the list, and return the updated list. `ts` is passed in so the store stays
 * free of Date.now (callers stamp it).
 */
export function saveCheckpoint(deckId: string, source: string, label: string, ts: number): Checkpoint[] {
	const list = loadCheckpoints(deckId);
	if (list[0]?.source === source) return list; // nothing changed since the last one
	const cp: Checkpoint = { id: `cp-${ts.toString(36)}-${Math.random().toString(36).slice(2, 6)}`, ts, label, source };
	const next = [cp, ...list].slice(0, SNAP_CAP);
	write(SNAP_PREFIX + deckId, next);
	return next;
}

// ── Architect chat history (per deck) ──────────────────────────────────────
const CHAT_PREFIX = 'lattice-studio-chat-'; // + deckId → ChatMessage[]
const CHAT_CAP = 60;

export type ChatMessage = {
	role: 'user' | 'assistant';
	content: string;
	/** Assistant turn only: the full source it proposes (for review/apply). */
	proposed?: string;
	/** Whether that proposal has been applied. */
	applied?: boolean;
};

export function loadChat(deckId: string): ChatMessage[] {
	return read<ChatMessage[]>(CHAT_PREFIX + deckId) ?? [];
}
export function saveChat(deckId: string, messages: ChatMessage[]): void {
	write(CHAT_PREFIX + deckId, messages.slice(-CHAT_CAP));
}

// `language` is the BCP-47 output locale for AI deck content (see studio-language).
export type StudioSettings = { validation: boolean; pageNumbers: boolean; headerFooter: boolean; language: string };
const DEFAULT_SETTINGS: StudioSettings = { validation: true, pageNumbers: true, headerFooter: false, language: DEFAULT_LANGUAGE };

export function loadSettings(): StudioSettings {
	const saved = read<Partial<StudioSettings>>(SETTINGS_LS) ?? {};
	// Seed the language from the browser the FIRST time only (no saved value); the
	// user's explicit pick wins forever after. detectLanguage falls back to en-US.
	const language = saved.language ?? detectLanguage();
	return { ...DEFAULT_SETTINGS, ...saved, language };
}
export function saveSettings(partial: Partial<StudioSettings>): void {
	write(SETTINGS_LS, { ...loadSettings(), ...partial });
}

// Standing instructions — a free-text voice prefix the AI honors on every
// DECK-CONTENT call (kept beside language; both ride through architect's
// withStudioVoice). Empty by default, so an untouched field injects nothing.
// Stored as a RAW string (not JSON) — the format the Workspace drawer has always
// written, so existing values keep working.
export function loadInstructions(): string {
	try {
		return localStorage.getItem(INSTRUCTIONS_LS) ?? '';
	} catch {
		return '';
	}
}
export function saveInstructions(text: string): void {
	try {
		localStorage.setItem(INSTRUCTIONS_LS, text);
	} catch {
		/* storage full / unavailable — non-fatal */
	}
}
