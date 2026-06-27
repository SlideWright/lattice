import { ChevronRight, Download, FileText, Link2, Monitor, Package, Printer } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Share belongs to the deck (plan §5): two clearly separated intents — hand off
// the rendered ARTIFACT vs hand off the SOURCE — and Print offers BOTH targets.
function Row({ icon, title, desc, dev }: { icon: React.ReactNode; title: string; desc: string; dev?: boolean }) {
	return (
		<button type="button" className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:bg-[var(--accent-soft)]">
			<span className={`grid size-9 place-items-center rounded-lg ${dev ? 'bg-card text-muted-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>{icon}</span>
			<span className="min-w-0"><span className="block text-[13.5px] font-semibold text-[var(--text-heading)]">{title}</span><span className="block text-[11.5px] text-muted-foreground">{desc}</span></span>
			<ChevronRight className="ml-auto size-4 text-muted-foreground" />
		</button>
	);
}

export function ShareSheet({ open, onOpenChange, deckTitle }: { open: boolean; onOpenChange: (v: boolean) => void; deckTitle: string }) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 sm:max-w-[440px]">
				<SheetHeader className="border-b border-border">
					<SheetTitle className="flex items-center gap-2 text-[17px]"><Link2 className="size-5 text-[var(--accent)]" />Share “{deckTitle}”</SheetTitle>
					<SheetDescription className="sr-only">Hand off the rendered deck or the Markdown source.</SheetDescription>
				</SheetHeader>
				<div className="space-y-6 overflow-y-auto p-5">
					<section className="space-y-2">
						<h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hand off the deck</h3>
						<p className="text-xs text-muted-foreground">The rendered, paginated deck — for your audience.</p>
						<Row icon={<Link2 className="size-4" />} title="Present link" desc="A live, themed link that opens in Present" />
						<Row icon={<Download className="size-4" />} title="PDF" desc="Vector, selectable text" />
						<Row icon={<Monitor className="size-4" />} title="PowerPoint" desc="PPTX, one slide per page" />
						<Row icon={<Printer className="size-4" />} title="Print deck" desc="The rendered slides, vector — default print" />
					</section>
					<section className="space-y-2">
						<h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hand off the source</h3>
						<p className="text-xs text-muted-foreground">The Markdown — for editing, review, or portability.</p>
						<Row dev icon={<FileText className="size-4" />} title="Markdown" desc="Source with theme + components embedded" />
						<Row dev icon={<Package className="size-4" />} title="Marp bundle" desc="Self-contained ZIP — renders anywhere" />
						<Row dev icon={<Printer className="size-4" />} title="Print source" desc="The Markdown, monospace — for markup &amp; review" />
					</section>
				</div>
			</SheetContent>
		</Sheet>
	);
}
