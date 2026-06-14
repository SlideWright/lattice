import { ArrowRight } from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';

// Static marketing sections — rendered to HTML server-side (NO client:
// directive → zero JS). They use the bridged shadcn token utilities (bg-card,
// text-foreground, text-muted-foreground, border, text-primary…), so a palette
// or light/dark switch on <html> re-themes them for free. The interactive bits
// (hero Preview/Source tabs, the restyle carousel, the live card previews) are
// separate React islands that DO hydrate.

/** Mono eyebrow line above each section heading. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
	return (
		<p className="m-0 font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-primary">{children}</p>
	);
}

/** Section header block (eyebrow + h2 + optional lead). */
export function SectionHead({
	eyebrow,
	title,
	children,
}: {
	eyebrow: string;
	title: React.ReactNode;
	children?: React.ReactNode;
}) {
	return (
		<div className="mb-10 max-w-[62ch]">
			<div className="mb-3">
				<Eyebrow>{eyebrow}</Eyebrow>
			</div>
			<h2 className="mb-3.5 font-[var(--font-display)] text-[clamp(28px,3.4vw,42px)] leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)]">
				{title}
			</h2>
			{children && <p className="m-0 text-[17px] text-foreground">{children}</p>}
		</div>
	);
}

// ── "Speaks your field" cards ───────────────────────────────────────────────
// Each card carries a live-preview HOST (`data-live-card`) that the
// FieldCardsLive island fills with a real slide, plus a real "Edit this deck"
// link (its data-open-deck handoff seeds the playground via landing-handoff.ts).
type FieldCard = { live: string; title: string; body: React.ReactNode };

const FIELD_CARDS: FieldCard[] = [
	{
		live: 'math',
		title: 'Mathematicians, quants & ML',
		body: 'Real KaTeX equations — Definition / Theorem / Proof cards, derivation chains with a justification column, matrix decompositions, an equation beside its plot.',
	},
	{
		live: 'gantt',
		title: 'Project leads',
		body: 'Gantt charts, kanban boards, roadmaps, journeys, and step ladders — native SVG rendered straight from a list, not pasted in from Visio.',
	},
	{
		live: 'diagram',
		title: 'Engineers & architects',
		body: 'All 25 Mermaid diagram types, auto-themed to the deck. State charts. Side-by-side code diffs, syntax-highlighted, from two fenced blocks.',
	},
	{
		live: 'obligation-matrix',
		title: 'Lawyers & compliance',
		body: 'Statute stacks, authority chains, obligation matrices, citation cards, and regulatory-update layouts — an actual legal vocabulary.',
	},
	{
		live: 'radar',
		title: 'Analysts',
		body: 'Radar, quadrant, KPI, stats, progress, pie, and word-cloud — the evidence layouts that turn numbers into an argument.',
	},
	{
		live: 'cards-grid',
		title: 'And the basics, for everyone',
		body: 'A bullet list becomes a card grid; a table becomes a comparison matrix. Fifty-eight layouts, one Markdown syntax.',
	},
];

export function FieldCards({ playgroundHref }: { playgroundHref: string }) {
	return (
		<div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
			{FIELD_CARDS.map((c) => (
				<Card key={c.live} className="gap-0 overflow-hidden py-6">
					<CardContent className="flex flex-col">
						{/* Live-preview host — filled by FieldCardsLive (data-live-card). */}
						<div
							className="live-host relative mb-[18px] aspect-video overflow-hidden rounded-md border border-border bg-muted"
							data-live-card={c.live}
						/>
						<h3 className="mb-2 font-[var(--font-body)] text-[18px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--text-heading)]">
							{c.title}
						</h3>
						<p className="m-0 text-[15px] text-foreground">{c.body}</p>
						<a
							className="mt-3.5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary hover:underline focus-visible:underline"
							href={playgroundHref}
							data-open-deck={c.live}
						>
							Edit this deck <ArrowRight aria-hidden="true" className="size-3.5" />
						</a>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// ── "Why" cards (no live preview) ───────────────────────────────────────────
type WhyCard = { id: string; title: React.ReactNode; body: React.ReactNode };

const WHY_CARDS: WhyCard[] = [
	{
		id: 'one-file',
		title: 'Brand colors live in one file.',
		body: (
			<>
				Change a palette once; every deck picks it up on the next build. Layouts never name a colour — they read{' '}
				<code className="font-mono text-[0.88em] text-primary">var(--token)</code>.
			</>
		),
	},
	{
		id: 'git-diff',
		title: (
			<>
				A <code className="font-mono text-[0.88em] text-primary">git diff</code> shows what changed.
			</>
		),
		body: 'A deck is text. Revisions read like code review — line by line — instead of hunting for the box that moved three pixels.',
	},
	{
		id: 'mermaid',
		title: 'Mermaid diagrams render in the palette.',
		body: 'Flowcharts and sequence diagrams pick up the deck’s tokens automatically. No per-diagram styling, no recolouring by hand.',
	},
	{
		id: 'contrast',
		title: 'Contrast is WCAG AA across every layout.',
		body: 'Accessibility is built into the token contract, not bolted on. Light and dark both clear the bar.',
	},
	{
		id: 'vocabulary',
		title: 'Fifty-eight layouts, one vocabulary.',
		body: (
			<>
				Function · Form · Substance · Finish organizes the catalog, so &ldquo;which layout do I want?&rdquo; has an answer
				that isn&rsquo;t <em>scroll the gallery</em>.
			</>
		),
	},
	{
		id: 'no-service',
		title: 'No service, no account, no telemetry.',
		body: 'The engine is a build step. It runs where your code runs and sends nothing anywhere.',
	},
];

export function WhyCards() {
	return (
		<div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
			{WHY_CARDS.map((c) => (
				<Card
					key={c.id}
					className="gap-0 py-0"
				>
					<CardContent className="px-6 py-[26px]">
						<h3 className="mb-2 font-[var(--font-body)] text-[18px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--text-heading)]">
							{c.title}
						</h3>
						<p className="m-0 text-[15px] text-foreground">{c.body}</p>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// ── Next-step cards (whole card is a link) ──────────────────────────────────
export function NextSteps({ links }: { links: { href: string; title: string; body: string; cta: string }[] }) {
	return (
		<div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
			{links.map((l) => (
				<a
					key={l.href}
					href={l.href}
					className="group block rounded-xl border border-border bg-card p-[26px] text-card-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
				>
					<h3 className="mb-2 font-[var(--font-body)] text-[19px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
						{l.title}
					</h3>
					<p className="m-0 mb-3.5 text-[15px] text-foreground">{l.body}</p>
					<span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary">
						{l.cta} <ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
					</span>
				</a>
			))}
		</div>
	);
}
