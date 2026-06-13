// The site's primary navigation — ONE source of truth.
//
// Every surface (the landing/playground/drawing-board/workbench topbars, the
// component-reference topbar, and the Starlight docs header + mobile sidebar)
// renders these same items, so the nav can't drift or fragment across pages.
//
// Taxonomy: three families besides Home (the logo) and GitHub —
//   • Docs       — the whole learning track (overview, what-is, principles,
//                  the story, getting-started, guides) behind one entry that
//                  lands on the docs hub (/overview/) and opens the doc sidebar.
//   • the apps   — Playground, Drawing Board, Workbench (kept as distinct
//                  top-level links; a future dashboard may regroup them).
//   • Components — the reference.
//
// `match` lists the path segments that mark an item "current" (aria-current).
// Docs is a SECTION: any of its pages light up the single Docs entry. Callers
// pass their `url()` helper (base-aware) and compute current from the request
// pathname via `isCurrent` below.

export const GITHUB_URL = 'https://github.com/slidewright/lattice';

export function primaryNav(url) {
	return [
		{
			label: 'Docs',
			href: url('overview/'),
			match: ['overview', 'introduction', 'principles', 'story', 'getting-started', 'guides'],
		},
		{ label: 'Playground', href: url('playground/'), match: ['playground'] },
		{ label: 'Drawing Board', href: url('drawing-board/'), match: ['drawing-board'] },
		{ label: 'Workbench', href: url('workbench/'), match: ['workbench'] },
		{ label: 'Components', href: url('components/'), match: ['components'] },
	];
}

// True when the current request path falls inside an item's section, so the
// same logic drives "you are here" on every surface (docs pages light up Docs).
export function isCurrent(item, pathname) {
	return item.match.some((seg) => pathname.includes('/' + seg));
}
