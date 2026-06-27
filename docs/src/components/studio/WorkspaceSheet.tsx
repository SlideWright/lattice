import { Check, Cloud, Eye, Sparkles, Wallet } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Workspace Settings — "your setup" (plan §4.2), distinct from the deck Inspector's
// "this deck". AI tier, cloud connect, spend/budget. Static visual in the prototype.
function Tier({ on, icon, name, desc }: { on?: boolean; icon: React.ReactNode; name: string; desc: string }) {
	return (
		<div className={`my-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 ${on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border'}`}>
			<span className={`grid size-[30px] place-items-center rounded-lg ${on ? 'bg-primary text-primary-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>{icon}</span>
			<span><div className="text-[13px] font-semibold text-[var(--text-heading)]">{name}</div><div className="text-[11px] text-muted-foreground">{desc}</div></span>
			<span className={`ml-auto size-[18px] rounded-full border-2 ${on ? 'border-[var(--accent)] bg-[var(--accent)] ring-2 ring-inset ring-background' : 'border-border'}`} />
		</div>
	);
}

export function WorkspaceSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
	const tabs = ['AI model', 'Cloud', 'Spend', 'Instructions', 'Storage'];
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 sm:max-w-[440px]">
				<SheetHeader className="border-b border-border">
					<SheetTitle className="flex items-center gap-2 text-[17px]"><Cloud className="size-5 text-[var(--accent)]" />Workspace <span className="font-mono text-[10px] font-normal uppercase tracking-wider text-[var(--accent)]">your setup</span></SheetTitle>
					<SheetDescription className="sr-only">Your workspace setup — generation tier, cloud connection, and session spend.</SheetDescription>
				</SheetHeader>
				<div className="overflow-y-auto p-5">
					<div className="mb-4 flex flex-wrap gap-1.5">
						{tabs.map((t, i) => (
							<button type="button" key={t} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${i === 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>{t}</button>
						))}
					</div>
					<div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Sparkles className="size-3.5" />Generation tier</div>
					<Tier icon={<Check className="size-4" />} name="Floor — deterministic" desc="No model · fully private &amp; offline" />
					<Tier icon={<Eye className="size-4" />} name="On-device · Transformers.js" desc="CPU · cached weights" />
					<Tier on icon={<Cloud className="size-4" />} name="OpenRouter — connected" desc="Cloud · sharmarke@…" />

					<div className="mb-2 mt-5 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><Wallet className="size-3.5" />Spend this session</div>
					<div className="flex gap-2.5">
						{[['$0.42', 'session'], ['$11.80', 'all-time']].map(([v, l]) => (
							<div key={l} className="flex-1 rounded-xl border border-border bg-card p-3"><div className="text-[22px] font-extrabold text-[var(--text-heading)]">{v}</div><div className="font-mono text-[11px] text-muted-foreground">{l}</div></div>
						))}
					</div>
					<div className="mt-3 flex items-center justify-between"><span className="text-[12.5px]">Session budget cap</span><span className="rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--text-heading)]">$1.00</span></div>
					<div className="my-2 h-[7px] overflow-hidden rounded-full bg-border"><span className="block h-full w-[46%] rounded-full bg-primary" /></div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
