// The tiny inline-Markdown subset the component manifests use in prose
// (`code` and **bold**), rendered to React nodes instead of an HTML string.
// Faithful to ComponentDocs.astro's `inline()` helper, minus the manual escape
// (React escapes text nodes for us).
import type * as React from 'react';

/** Render the manifest's `code`/**bold** inline subset as React nodes. */
export function inlineMd(src: string): React.ReactNode[] {
	const text = String(src ?? '');
	const out: React.ReactNode[] = [];
	// Split on `code` spans and **bold** runs, keeping the delimiters as captures.
	const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
	parts.forEach((tok, i) => {
		if (!tok) return;
		// Index-suffixed key: `parts` order is fixed for a given string (it never
		// reorders), so the position is a stable identity here.
		const key = `${i}:${tok}`;
		if (tok.startsWith('`') && tok.endsWith('`')) {
			out.push(<code key={key}>{tok.slice(1, -1)}</code>);
		} else if (tok.startsWith('**') && tok.endsWith('**')) {
			out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
		} else {
			out.push(tok);
		}
	});
	return out;
}
