// The site's primary navigation — ONE source of truth.
//
// Every surface renders from this model through the single shared
// <SiteHeader> (src/components/site/SiteHeader.astro) + its <NavActions>
// island, plus the Starlight mobile sidebar (Sidebar.astro). Nothing
// re-declares the nav inline anymore, so it can't drift across pages.
//
// Taxonomy: two families besides Home (the logo) and GitHub —
//   • content  — Docs (the whole learning track), Components (the reference),
//                Features, Comparison. Always inline on desktop.
//   • tools    — the interactive apps (Playground, Drawing Board, Workbench),
//                grouped under one "Tools" disclosure so the bar stays calm
//                and has room for the search trigger.
//
// `match` lists the path segments that mark an item "current" (aria-current).
// Docs is a SECTION: any of its pages light up the single Docs entry. Callers
// pass their base-aware `url()` helper and compute current from the request
// pathname via `isCurrent` below.

export const GITHUB_URL = 'https://github.com/slidewright/lattice';

// The inline content destinations — visible directly in the desktop bar.
export function contentNav(url) {
	return [
		{
			label: 'Docs',
			href: url('overview/'),
			match: ['overview', 'introduction', 'principles', 'story', 'getting-started', 'guides', 'model', 'spec'],
			desc: 'Guides, the model, the LFM spec',
		},
		{ label: 'Components', href: url('components/'), match: ['components'], desc: 'Every layout, live' },
		{ label: 'Features', href: url('features/'), match: ['features'], desc: 'What the engine does' },
		{ label: 'Comparison', href: url('comparison/'), match: ['comparison'], desc: 'Lattice vs the field' },
	];
}

// The interactive apps — grouped under the "Tools" disclosure on desktop,
// listed flat inside the mobile menu and the command palette.
export function toolsNav(url) {
	return [
		{ label: 'Playground', href: url('playground/'), match: ['playground'], desc: 'Write Markdown, render live' },
		{ label: 'Drawing Board', href: url('drawing-board/'), match: ['drawing-board'], desc: 'Compose a deck visually' },
		{ label: 'Workbench', href: url('workbench/'), match: ['workbench'], desc: 'Build themes & layouts' },
	];
}

// The flat ordered list (Docs · the tools · Components · Features · Comparison),
// kept for surfaces that present one undivided menu — the Starlight mobile
// sidebar and the command palette's "Go to" group.
export function primaryNav(url) {
	const content = contentNav(url);
	return [content[0], ...toolsNav(url), ...content.slice(1)];
}

// True when the current request path falls inside an item's section, so the
// same logic drives "you are here" on every surface (docs pages light up Docs).
export function isCurrent(item, pathname) {
	return item.match.some((seg) => pathname.includes('/' + seg));
}

// True when any Tools-group route is current — lights the "Tools" disclosure.
export function toolsActive(pathname, url) {
	return toolsNav(url).some((item) => isCurrent(item, pathname));
}
