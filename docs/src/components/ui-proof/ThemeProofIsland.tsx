import * as React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Phase 0 spike island — proves the whole pipeline end-to-end:
 *   • React hydrates inside an Astro page (the counter is live),
 *   • shadcn components compile + style through Tailwind v4 (Preflight off),
 *   • every color comes from the shadcn ↔ Lattice token bridge, so this
 *     re-themes automatically when <html> data-palette / data-mode change.
 * Not shipped on any real surface — mounted only on /_ui-proof. Deleted once
 * Phase 1 lands the first real island.
 */
export default function ThemeProofIsland() {
	const [count, setCount] = React.useState(0);
	return (
		<div className="flex flex-col gap-6">
			<section className="rounded-lg border bg-card p-5 text-card-foreground">
				<h2 className="text-lg font-semibold text-[color:var(--text-heading)]">Bridged surface</h2>
				<p className="mt-1 text-sm text-foreground">
					Body text on <code>bg-card</code> — should read as the current palette.
				</p>
				<p className="mt-1 text-sm text-muted-foreground">Muted caption (text-muted-foreground).</p>
			</section>

			<section className="flex flex-wrap items-center gap-3">
				<Button onClick={() => setCount((c) => c + 1)}>Primary · clicked {count}×</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="destructive">Destructive</Button>
				<Button variant="link">Link</Button>
			</section>

			<section className="flex flex-wrap gap-2">
				{/* Literal classes so Tailwind's scanner emits them; each resolves
				    to the palette's own categorical hue via the bridge. */}
				<span className="inline-flex h-8 items-center rounded-md bg-chart-1 px-3 text-xs font-medium text-white">chart-1</span>
				<span className="inline-flex h-8 items-center rounded-md bg-chart-2 px-3 text-xs font-medium text-white">chart-2</span>
				<span className="inline-flex h-8 items-center rounded-md bg-chart-3 px-3 text-xs font-medium text-white">chart-3</span>
				<span className="inline-flex h-8 items-center rounded-md bg-chart-4 px-3 text-xs font-medium text-white">chart-4</span>
				<span className="inline-flex h-8 items-center rounded-md bg-chart-5 px-3 text-xs font-medium text-white">chart-5</span>
			</section>
		</div>
	);
}
