import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Eyebrow } from './sections';

// The hero's left panel — static marketing copy + CTAs, rendered server-side
// (NO client: directive → zero JS). CTAs are shadcn Buttons via `asChild` so
// they're real <a> links (cmd/middle-click works) styled as buttons, themed
// through the bridge (bg-primary / border).

export function HeroCopy({ playgroundHref, getStartedHref }: { playgroundHref: string; getStartedHref: string }) {
	return (
		<div className="lx-ui min-w-0">
			<div className="mb-[18px]">
				<Eyebrow>A text file in, a polished PDF out</Eyebrow>
			</div>
			<h1 className="mb-[22px] font-[var(--font-display)] text-[clamp(38px,5.4vw,68px)] leading-[1.08] tracking-[-0.02em] text-[var(--text-heading)]">
				Write the <span className="italic text-primary">words</span>. The deck builds itself.
			</h1>
			<p className="m-0 mb-[30px] max-w-[46ch] text-[clamp(17px,1.5vw,20px)] text-foreground">
				You write the deck as a Markdown file and pick a named layout for each slide. Lattice assembles every page against
				one shared palette — no dragging, no nudging, no formatting drift.
			</p>
			<div className="flex flex-wrap items-center gap-3">
				<Button asChild size="lg">
					<a href={playgroundHref}>
						Try it in your browser <ArrowRight aria-hidden="true" />
					</a>
				</Button>
				<Button asChild variant="outline" size="lg">
					<a href={getStartedHref}>Get started</a>
				</Button>
			</div>
			<p className="m-0 mt-4 text-[13px] text-muted-foreground">
				No install to try it. Runs on your laptop or in CI. Fully offline. MIT-licensed.
			</p>
		</div>
	);
}
