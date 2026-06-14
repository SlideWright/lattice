import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { joinBase } from '@/lib/base-url.mjs';

const tc = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

type Triad = { function: string; form: string; substance: string };

/**
 * Per-component page header — breadcrumb (Components / Bucket), the name as h1,
 * the Function · Form · Substance triad, and the lead. Static (no client:).
 */
export function ComponentPageHeader({
	name,
	bucket,
	description,
	triad,
	base,
}: {
	name: string;
	bucket: string;
	description: string;
	triad: Triad;
	base: string;
}) {
	return (
		<header className="lx-ui mb-5">
			<Breadcrumb>
				<BreadcrumbList className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
					<BreadcrumbItem>
						<BreadcrumbLink href={joinBase(base, 'components/')} className="text-muted-foreground hover:text-primary">
							Components
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage className="text-muted-foreground">{tc(bucket)}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<div className="mt-2 flex flex-wrap items-baseline gap-x-3.5 gap-y-3">
				<h1 className="m-0 font-mono text-[clamp(28px,4vw,40px)] font-semibold tracking-tight text-[var(--text-heading)]">
					{name}
				</h1>
				<div className="flex gap-1.5">
					{[
						['Function', triad.function],
						['Form', triad.form],
						['Substance', triad.substance],
					].map(([label, v]) => (
						<Badge
							key={label}
							variant="outline"
							className="rounded-full px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wide text-muted-foreground"
							title={label}
						>
							{tc(v)}
						</Badge>
					))}
				</div>
			</div>
			<p className="m-0 mt-3 text-lg leading-relaxed text-foreground">{description}</p>
		</header>
	);
}

type PagerLink = { name: string; bucket: string } | null;

/** Prev / next pager. Static (no client:). */
export function ComponentPager({ prev, next, base }: { prev: PagerLink; next: PagerLink; base: string }) {
	return (
		<nav className="lx-ui mt-11 flex justify-between gap-3 border-t border-border pt-5" aria-label="Previous and next component">
			{prev ? (
				<a
					href={joinBase(base, `components/${prev.bucket}/${prev.name}/`)}
					className="flex max-w-[48%] flex-col gap-0.5 rounded-md border border-border px-3.5 py-2.5 no-underline hover:border-primary"
				>
					<span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
						<ArrowLeft className="size-3" aria-hidden="true" /> Previous
					</span>
					<span className="font-mono text-sm font-semibold text-primary">{prev.name}</span>
				</a>
			) : (
				<span />
			)}
			{next ? (
				<a
					href={joinBase(base, `components/${next.bucket}/${next.name}/`)}
					className="ml-auto flex max-w-[48%] flex-col gap-0.5 rounded-md border border-border px-3.5 py-2.5 text-right no-underline hover:border-primary"
				>
					<span className="flex items-center justify-end gap-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
						Next <ArrowRight className="size-3" aria-hidden="true" />
					</span>
					<span className="font-mono text-sm font-semibold text-primary">{next.name}</span>
				</a>
			) : (
				<span />
			)}
		</nav>
	);
}
