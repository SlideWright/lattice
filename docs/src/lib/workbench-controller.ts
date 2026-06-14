// Pure chrome-state logic for the Workbench, lifted out of the inline page
// scripts (workbench.astro) so it is unit-testable and free of DOM coupling.
// The React island (WorkbenchApp) owns the wiring; this module owns the small
// decisions: which faculty/pane is active, and how a faculty maps to the DOM
// contract the vanilla studios + workbench.css still read.
//
// The studios themselves (theme-studio.js / component-studio.js) are NOT
// reimplemented here — they stay vanilla and are DRIVEN. This file only models
// the page chrome the studios sit inside.

export type Faculty = 'theme' | 'layout';
export type Pane = 'design' | 'preview' | 'contrast';

export const FACULTY_KEY = 'lattice-wb-faculty';

export const FACULTIES: { value: Faculty; label: string }[] = [
	{ value: 'theme', label: 'Theme Studio' },
	{ value: 'layout', label: 'Layout Studio' },
];

// The mobile pane tabs. The third tab is labelled per faculty (Contrast vs
// Gate) but drives the same `data-tab="contrast"` layout key, so the CSS that
// reveals one pane at a time on mobile is shared across both studios.
export const PANES: { value: Pane; theme: string; layout: string }[] = [
	{ value: 'design', theme: 'Design', layout: 'Design' },
	{ value: 'preview', theme: 'Preview', layout: 'Preview' },
	{ value: 'contrast', theme: 'Contrast', layout: 'Gate' },
];

/** Read the saved faculty from localStorage; default to the Theme Studio. */
export function readFaculty(): Faculty {
	try {
		const saved = localStorage.getItem(FACULTY_KEY);
		if (saved === 'layout' || saved === 'theme') return saved;
	} catch {
		/* private mode */
	}
	return 'theme';
}

/** Persist the active faculty (best-effort; private mode is non-fatal). */
export function writeFaculty(f: Faculty): void {
	try {
		localStorage.setItem(FACULTY_KEY, f);
	} catch {
		/* private mode */
	}
}

/** The label shown for a pane within a given faculty. */
export function paneLabel(pane: Pane, faculty: Faculty): string {
	const p = PANES.find((x) => x.value === pane);
	if (!p) return pane;
	return faculty === 'layout' ? p.layout : p.theme;
}

/** Whether the given faculty's <main> should be visible (the `hidden` contract). */
export function isFacultyVisible(main: Faculty, active: Faculty): boolean {
	return main === active;
}
