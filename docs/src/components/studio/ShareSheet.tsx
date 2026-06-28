import { ChevronRight, Download, FileText, Link2, Monitor, Package, Printer } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { deckFilename } from './decks';
import { downloadText } from './download';

// Share belongs to the deck (plan §5): two clearly separated intents — hand off
// the rendered ARTIFACT vs hand off the SOURCE. The source path is real (Markdown
// downloads); the rendered-artifact paths need the engine export pipeline, so they
// are honestly flagged "soon" rather than faking a click.
function Row({ icon, title, desc, dev, soon, onClick }: { icon: React.ReactNode; title: string; desc: string; dev?: boolean; soon?: boolean; onClick?: () => void }) {
	return (
		<button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] hover:bg-[var(--accent-soft)]">
			<span className={`grid size-9 place-items-center rounded-lg ${dev ? 'bg-card text-muted-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>{icon}</span>
			<span className="min-w-0"><span className="block text-[13.5px] font-semibold text-[var(--text-heading)]">{title}</span><span className="block text-[11.5px] text-muted-foreground">{desc}</span></span>
			{soon ? <span className="ml-auto rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">soon</span> : <ChevronRight className="ml-auto size-4 text-muted-foreground" />}
		</button>
	);
}

export function ShareSheet({ open, onOpenChange, deckTitle, source, onPresent, notify }: { open: boolean; onOpenChange: (v: boolean) => void; deckTitle: string; source: string; onPresent: () => void; notify: (msg: string) => void }) {
	const close = () => onOpenChange(false);
	const soon = (what: string) => notify(`${what} needs the engine export pipeline — coming to the prototype.`);
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
						<Row icon={<Link2 className="size-4" />} title="Present link" desc="A live, themed link that opens in Present" onClick={() => { close(); onPresent(); }} />
						<Row icon={<Download className="size-4" />} title="PDF" desc="Vector, selectable text" soon onClick={() => soon('PDF export')} />
						<Row icon={<Monitor className="size-4" />} title="PowerPoint" desc="PPTX, one slide per page" soon onClick={() => soon('PowerPoint export')} />
						<Row icon={<Printer className="size-4" />} title="Print deck" desc="The rendered slides, vector — default print" soon onClick={() => soon('Print deck')} />
					</section>
					<section className="space-y-2">
						<h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hand off the source</h3>
						<p className="text-xs text-muted-foreground">The Markdown — for editing, review, or portability.</p>
						<Row dev icon={<FileText className="size-4" />} title="Markdown" desc="Source with theme + components embedded" onClick={() => { downloadText(deckFilename(deckTitle), source); notify(`Downloaded ${deckFilename(deckTitle)}`); }} />
						<Row dev icon={<Package className="size-4" />} title="Marp bundle" desc="Self-contained ZIP — renders anywhere" soon onClick={() => soon('Marp bundle')} />
						<Row dev icon={<Printer className="size-4" />} title="Print source" desc="The Markdown, monospace — for markup &amp; review" soon onClick={() => soon('Print source')} />
					</section>
				</div>
			</SheetContent>
		</Sheet>
	);
}
