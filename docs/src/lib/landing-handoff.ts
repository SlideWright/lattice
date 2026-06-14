// The "Edit this deck" handoff: seed a field card's sample into the playground's
// source key (the SAME key specimen.js / the playground reads) before the <a>
// navigates, so the playground opens on that deck. Pure-ish (touches
// localStorage only); wired by FieldCardsLive via event delegation, mirroring
// the old inline click handler in index.astro.

const SOURCE_KEY = 'lattice-docs-pg-source';

/** Persist `source` as the playground's next deck. Swallows private-mode errors. */
export function seedPlaygroundSource(source: string) {
	try {
		localStorage.setItem(SOURCE_KEY, source);
	} catch {
		/* private mode */
	}
}
