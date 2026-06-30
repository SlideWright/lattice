// Output language for Studio AI — the locale the Architect writes DECK CONTENT in
// (slides, prose refine, chat, findings-fix). It governs natural-language prose
// ONLY: theme and component generation stay canonical English, because their
// output is a structural contract — slugs, CSS, manifest keys, `_class` invokes —
// that must stay ASCII/English to pass the gates and resolve at render time. See
// engineering/decisions/2026-06-30-studio-output-language.md.
//
// Latin-script languages only for now (the engine's fonts + layout are tuned for
// them); the list is data-driven so widening it later is one row, not a refactor.

export type StudioLanguage = {
	/** BCP-47 tag — also the value persisted in Studio settings. */
	code: string;
	/** Menu label, written in English so the picker stays legible in any locale. */
	label: string;
	/** The language's own name, shown as a secondary hint in the picker. */
	endonym: string;
	/** Optional extra clause folded into the directive (e.g. a spelling note). */
	note?: string;
};

// The region-canonical entry comes FIRST per base language, so a region-less
// browser tag ('en', 'pt') resolves to the house default for that language
// (en → en-US, pt → pt-BR). Order is load-bearing — see detectLanguage.
export const STUDIO_LANGUAGES: StudioLanguage[] = [
	{ code: 'en-US', label: 'English (United States)', endonym: 'English', note: 'Use American spelling, idiom, and punctuation (color, organize, -ize endings).' },
	{ code: 'en-GB', label: 'English (United Kingdom)', endonym: 'English', note: 'Use British spelling, idiom, and punctuation (-our and -ise endings, single quotes).' },
	{ code: 'es-ES', label: 'Spanish (Spain)', endonym: 'Español' },
	{ code: 'es-419', label: 'Spanish (Latin America)', endonym: 'Español' },
	{ code: 'fr-FR', label: 'French', endonym: 'Français' },
	{ code: 'de-DE', label: 'German', endonym: 'Deutsch' },
	{ code: 'it-IT', label: 'Italian', endonym: 'Italiano' },
	{ code: 'pt-BR', label: 'Portuguese (Brazil)', endonym: 'Português' },
	{ code: 'pt-PT', label: 'Portuguese (Portugal)', endonym: 'Português' },
	{ code: 'nl-NL', label: 'Dutch', endonym: 'Nederlands' },
	{ code: 'sv-SE', label: 'Swedish', endonym: 'Svenska' },
	{ code: 'da-DK', label: 'Danish', endonym: 'Dansk' },
	{ code: 'nb-NO', label: 'Norwegian (Bokmål)', endonym: 'Norsk' },
	{ code: 'fi-FI', label: 'Finnish', endonym: 'Suomi' },
	{ code: 'pl-PL', label: 'Polish', endonym: 'Polski' },
	{ code: 'ca-ES', label: 'Catalan', endonym: 'Català' },
];

/** The house default when nothing is saved and the browser can't be matched. */
export const DEFAULT_LANGUAGE = 'en-US';

const byCode = new Map(STUDIO_LANGUAGES.map((l) => [l.code.toLowerCase(), l]));

/** The descriptor for a code, falling back to the default's descriptor. */
export function languageFor(code: string | null | undefined): StudioLanguage {
	return byCode.get(String(code ?? '').toLowerCase()) ?? (byCode.get(DEFAULT_LANGUAGE.toLowerCase()) as StudioLanguage);
}

/** The menu label for a code (default's label when unknown). */
export function languageLabel(code: string | null | undefined): string {
	return languageFor(code).label;
}

type NavLike = { language?: string; languages?: readonly string[] };

/**
 * Resolve a browser locale to a supported language code. An exact tag match wins;
 * else the first supported entry sharing the base language (list order encodes the
 * house default per language, so 'en' → en-US, 'pt' → pt-BR); else
 * DEFAULT_LANGUAGE. Safe with no navigator (tests / SSR).
 */
export function detectLanguage(nav: NavLike | undefined = typeof navigator === 'undefined' ? undefined : (navigator as NavLike)): string {
	const tags = [...(nav?.languages ?? []), nav?.language].filter((t): t is string => !!t);
	for (const raw of tags) {
		const exact = byCode.get(raw.toLowerCase());
		if (exact) return exact.code;
	}
	for (const raw of tags) {
		const base = raw.toLowerCase().split('-')[0];
		const hit = STUDIO_LANGUAGES.find((l) => l.code.toLowerCase().split('-')[0] === base);
		if (hit) return hit.code;
	}
	return DEFAULT_LANGUAGE;
}

/**
 * The system-prompt clause that pins the AI's prose to `code`. Scoped to
 * natural-language content (and explicit about leaving code / component names /
 * `_class` directives alone) so it never fights the deck's structural markup.
 * Always returns a non-empty directive — languageFor always resolves.
 */
export function languageDirective(code: string | null | undefined): string {
	const lang = languageFor(code);
	const note = lang.note ? ` ${lang.note}` : '';
	return (
		`Write all natural-language prose — slide titles, body copy, speaker notes, and your chat replies — in ${lang.label}.${note} ` +
		"Match that language's grammar, idiom, punctuation, and number/date conventions. Do not switch languages unless the author explicitly asks. " +
		'Leave code, Lattice component names, and `_class` directives exactly as given — do not translate them.'
	);
}
