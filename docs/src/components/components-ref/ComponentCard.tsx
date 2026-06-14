import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { CatalogItem } from '@/lib/component-search';

const tc = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * One catalog card for the index grid. A whole-card link to the component page;
 * the Function · Form · Substance triad reads as outline badges, the tags as
 * muted ghost badges. Used by both the SSR pass and the live filtered grid so
 * markup never drifts.
 */
export function ComponentCard({ item, href }: { item: CatalogItem; href: string }) {
	return (
		<Card asChild className="gap-3 py-4 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg">
			<a href={href} className="no-underline">
				<div className="flex items-baseline justify-between gap-2 px-4">
					<h3 className="m-0 font-mono text-base text-[var(--text-heading)]">{item.name}</h3>
					<div className="flex shrink-0 gap-1">
						{([
							['Function', item.function],
							['Form', item.form],
							['Substance', item.substance],
						] as const).map(([label, v]) => (
							<Badge
								key={label}
								variant="outline"
								className="rounded-full px-1.5 py-0 font-mono text-[9px] uppercase tracking-wide text-muted-foreground"
								title={label}
							>
								{tc(v)}
							</Badge>
						))}
					</div>
				</div>
				<p className="m-0 flex-1 px-4 text-sm leading-snug text-foreground">{item.description}</p>
				{item.tags.length > 0 && (
					<div className="flex flex-wrap gap-1.5 px-4">
						{item.tags.map((t) => (
							<Badge key={t} variant="secondary" className="rounded-full px-2 py-0 font-mono text-[10.5px] font-normal text-muted-foreground">
								{t}
							</Badge>
						))}
					</div>
				)}
			</a>
		</Card>
	);
}
