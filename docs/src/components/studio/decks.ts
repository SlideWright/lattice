// Demo decks for the Studio prototype. Plain Markdown using shipped Lattice
// component classes — the Compose preview renders these LIVE through the engine
// (DeckPreview), so they must be valid deck source authored to each component's
// contract (lib/components/<bucket>/<name>/<name>.docs.md). Every slide is a real
// board-grade component — no bare Markdown — so navigating the deck reads like a
// finished boardroom pack, not notes.

export type StudioDeck = {
	id: string;
	title: string;
	meta: string;
	/** Per-slide source; joined with `\n\n---\n\n` for the engine. */
	slides: string[];
};

export const DECKS: StudioDeck[] = [
	{
		id: 'q3-board',
		title: 'Q3 Board Review',
		meta: '6 slides',
		slides: [
			`<!-- _class: title -->\n\n# Q3 Board Review\n\n\`Board · Q3 2026\`\n\nSteady growth, disciplined spend.`,
			`<!-- _class: agenda -->\n\n## What this review covers.\n\n1. The quarter in four numbers\n2. What customers told us\n3. How the funnel converted\n4. Where we invest next`,
			`<!-- _class: kpi -->\n\n\`Financial · Q3 2026\`\n\n## The quarter in four numbers\n\n1. $4.2M\n   - Net revenue\n   - target $4.0M · +18% YoY \`On plan\` \`Board\`\n2. +18%\n   - YoY growth\n   - vs +12% last quarter \`On plan\` \`Investor\`\n3. 142\n   - New logos\n   - target 120 · +18% \`On plan\` \`Sales\`\n4. 1.4%\n   - Net churn\n   - target < 2% \`On plan\` \`Success\``,
			`<!-- _class: quote -->\n\n> Retention did the heavy lifting this quarter — the base expanded faster than we closed new logos.\n\n— Maya Chen, COO`,
			`<!-- _class: stats -->\n\n\`Funnel · Q3 2026\`\n\n## How the funnel converted, stage to stage.\n\n1. 38%\n   - Trial → activation\n2. 61%\n   - Activation → paid\n3. 124%\n   - Net revenue retention\n4. 11 mo\n   - CAC payback`,
			`<!-- _class: closing -->\n\n## Invest behind retention — it is the cheapest growth we have.\n\n\`Q4 plan follows\``,
		],
	},
	{
		id: 'product-strategy',
		title: 'FY26 Product Strategy',
		meta: '5 slides',
		slides: [
			`<!-- _class: title -->\n\n# FY26 Product Strategy\n\n\`Product · FY26\`\n\nThree bets, one platform.`,
			`<!-- _class: agenda -->\n\n## The plan in four moves.\n\n1. Where the leverage is\n2. The three bets\n3. What we stop doing\n4. The one metric that matters`,
			`<!-- _class: kpi -->\n\n\`Leverage · FY26\`\n\n## Where the leverage is\n\n1. 3×\n   - Faster onboarding\n   - target 2× · +50% \`On plan\` \`Product\`\n2. 92%\n   - Gross margin\n   - +4pp YoY \`On plan\` \`Finance\`\n3. 11\n   - Net-new integrations\n   - target 8 · +38% \`On plan\` \`Platform\``,
			`<!-- _class: cards-grid -->\n\n## Three bets, one platform.\n\n- Compose\n  - Author once, present anywhere — Markdown in, boardroom out.\n- Reader\n  - Meet the audience where they are: deck, summary, or one-pager.\n- Studio\n  - One workspace; no tool-switching between edit, present, and theme.`,
			`<!-- _class: closing -->\n\n## One platform, three bets — shipped this year.\n\n\`Roadmap in the appendix\``,
		],
	},
];

/** The full engine source for a deck (slides joined with separators). */
export function deckSource(deck: StudioDeck): string {
	return deck.slides.join('\n\n---\n\n');
}
