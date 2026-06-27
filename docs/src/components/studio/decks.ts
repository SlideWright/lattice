// Demo decks for the Studio prototype. Plain Markdown using shipped Lattice
// component classes — the Compose preview renders these LIVE through the engine
// (DeckPreview), so they must be valid deck source. Kept deliberately small and
// boardroom-flavoured so the prototype reads like a real session.

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
		meta: '4 slides',
		slides: [
			`<!-- _class: title -->\n# Q3 Board Review\n## Steady growth, disciplined spend`,
			`<!-- _class: kpi -->\n\n\`Financial · Q3 2026\`\n\n## The quarter in four numbers\n\n1. $4.2M\n   - Net revenue\n   - target $4.0M · +18% YoY \`On plan\` \`Board\`\n2. +18%\n   - YoY growth\n   - vs +12% last quarter \`On plan\` \`Investor\`\n3. 142\n   - New logos\n   - target 120 · +18% \`On plan\` \`Sales\`\n4. 1.4%\n   - Net churn\n   - target < 2% \`On plan\` \`Success\``,
			`<!-- _class: quote -->\n## "Retention did the heavy lifting."\n\n— Maya Chen, COO`,
			`## How the funnel converts\n\n1. Awareness\n2. Trial\n3. Activation\n4. Expansion`,
		],
	},
	{
		id: 'product-strategy',
		title: 'FY26 Product Strategy',
		meta: '3 slides',
		slides: [
			`<!-- _class: title -->\n# FY26 Product Strategy\n## Three bets, one platform`,
			`<!-- _class: kpi -->\n\n\`Leverage · FY26\`\n\n## Where the leverage is\n\n1. 3×\n   - Faster onboarding\n   - target 2× · +50% \`On plan\` \`Product\`\n2. 92%\n   - Gross margin\n   - +4pp YoY \`On plan\` \`Finance\`\n3. 11\n   - Net-new integrations\n   - target 8 · +38% \`On plan\` \`Platform\``,
			`## The three bets\n\n- **Compose** — author once, present anywhere\n- **Reader** — meet the audience where they are\n- **Studio** — one workspace, no tool-switching`,
		],
	},
];

/** The full engine source for a deck (slides joined with separators). */
export function deckSource(deck: StudioDeck): string {
	return deck.slides.join('\n\n---\n\n');
}
