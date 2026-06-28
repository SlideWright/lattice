import { Check, Cloud, Eye, FolderTree, MessageSquareText, Sparkles, Wallet } from 'lucide-react';
import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Workspace Settings — "your setup" (plan §4.2), distinct from the deck Inspector's
// "this deck". A real tabbed surface: pick a generation tier, edit standing
// instructions, watch spend. Local-state prototype (no real backend).
const TABS = ['AI model', 'Cloud', 'Spend', 'Instructions', 'Storage'] as const;
type Tab = (typeof TABS)[number];

const TIERS = [
	{ key: 'floor', icon: <Check className="size-4" />, name: 'Floor — deterministic', desc: 'No model · fully private & offline' },
	{ key: 'ondevice', icon: <Eye className="size-4" />, name: 'On-device · Transformers.js', desc: 'CPU · cached weights' },
	{ key: 'openrouter', icon: <Cloud className="size-4" />, name: 'OpenRouter — connected', desc: 'Cloud · sharmarke@…' },
] as const;

function Tier({ on, icon, name, desc, onClick }: { on: boolean; icon: React.ReactNode; name: string; desc: string; onClick: () => void }) {
	return (
		<button type="button" aria-pressed={on} onClick={onClick} className={cn('my-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left', on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]')}>
			<span className={cn('grid size-[30px] place-items-center rounded-lg', on ? 'bg-primary text-primary-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]')}>{icon}</span>
			<span><div className="text-[13px] font-semibold text-[var(--text-heading)]">{name}</div><div className="text-[11px] text-muted-foreground">{desc}</div></span>
			<span className={cn('ml-auto size-[18px] rounded-full border-2', on ? 'border-[var(--accent)] bg-[var(--accent)] ring-2 ring-inset ring-background' : 'border-border')} />
		</button>
	);
}

function GroupLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
	return <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{children}</div>;
}

export function WorkspaceSheet({ open, onOpenChange, notify }: { open: boolean; onOpenChange: (v: boolean) => void; notify: (msg: string) => void }) {
	const [tab, setTab] = React.useState<Tab>('AI model');
	const [tier, setTier] = React.useState<(typeof TIERS)[number]['key']>('openrouter');
	const [instructions, setInstructions] = React.useState('Default to a confident, board-ready voice. Lead each slide with the number. Avoid hedging.');
	const [storeInCloud, setStoreInCloud] = React.useState(true);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full gap-0 sm:max-w-[440px]">
				<SheetHeader className="border-b border-border">
					<SheetTitle className="flex items-center gap-2 text-[17px]"><Cloud className="size-5 text-[var(--accent)]" />Workspace <span className="font-mono text-[10px] font-normal uppercase tracking-wider text-[var(--accent)]">your setup</span></SheetTitle>
					<SheetDescription className="sr-only">Your workspace setup — generation tier, cloud, spend, standing instructions, and storage.</SheetDescription>
				</SheetHeader>
				<div className="overflow-y-auto p-5">
					<div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Workspace settings">
						{TABS.map((t) => (
							<button type="button" key={t} role="tab" aria-selected={t === tab} onClick={() => setTab(t)} className={cn('rounded-full border px-3 py-1.5 text-[12.5px] font-semibold', t === tab ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]')}>{t}</button>
						))}
					</div>

					{tab === 'AI model' && (
						<div>
							<GroupLabel icon={<Sparkles className="size-3.5" />}>Generation tier</GroupLabel>
							{TIERS.map((t) => (
								<Tier key={t.key} on={tier === t.key} icon={t.icon} name={t.name} desc={t.desc} onClick={() => { setTier(t.key); notify(`Generation tier → ${t.name.split(' — ')[0].split(' · ')[0]}.`); }} />
							))}
						</div>
					)}

					{tab === 'Cloud' && (
						<div>
							<GroupLabel icon={<Cloud className="size-3.5" />}>Connection</GroupLabel>
							<div className="flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5">
								<span className="grid size-[30px] place-items-center rounded-lg bg-primary text-primary-foreground"><Cloud className="size-4" /></span>
								<span><div className="text-[13px] font-semibold text-[var(--text-heading)]">OpenRouter</div><div className="text-[11px] text-muted-foreground">Connected · sharmarke@…</div></span>
								<button type="button" onClick={() => notify('Disconnect OpenRouter — re-auth needed to reconnect.')} className="ml-auto rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]">Disconnect</button>
							</div>
						</div>
					)}

					{tab === 'Spend' && (
						<div>
							<GroupLabel icon={<Wallet className="size-3.5" />}>Spend this session</GroupLabel>
							<div className="flex gap-2.5">
								{[['$0.42', 'session'], ['$11.80', 'all-time']].map(([v, l]) => (
									<div key={l} className="flex-1 rounded-xl border border-border bg-card p-3"><div className="text-[22px] font-extrabold text-[var(--text-heading)]">{v}</div><div className="font-mono text-[11px] text-muted-foreground">{l}</div></div>
								))}
							</div>
							<div className="mt-3 flex items-center justify-between"><span className="text-[12.5px]">Session budget cap</span><button type="button" onClick={() => notify('Budget cap — set the ceiling per session in the full app.')} className="rounded-md border border-border px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--text-heading)]">$1.00</button></div>
							<div className="my-2 h-[7px] overflow-hidden rounded-full bg-border"><span className="block h-full w-[46%] rounded-full bg-primary" /></div>
						</div>
					)}

					{tab === 'Instructions' && (
						<div>
							<GroupLabel icon={<MessageSquareText className="size-3.5" />}>Standing instructions</GroupLabel>
							<p className="mb-2 text-xs text-muted-foreground">Applied to every generation in this workspace.</p>
							<textarea
								value={instructions}
								onChange={(e) => setInstructions(e.target.value)}
								rows={5}
								aria-label="Standing instructions"
								className="w-full resize-none rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed text-foreground outline-none focus:border-[var(--accent)]"
							/>
							<div className="mt-1 text-right font-mono text-[11px] text-muted-foreground">{instructions.length} chars</div>
						</div>
					)}

					{tab === 'Storage' && (
						<div>
							<GroupLabel icon={<FolderTree className="size-3.5" />}>Where decks live</GroupLabel>
							<button type="button" onClick={() => setStoreInCloud(true)} className={cn('my-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left', storeInCloud ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
								<span className="text-[13px] font-semibold text-[var(--text-heading)]">Cloud workspace</span><span className="ml-auto text-[11px] text-muted-foreground">synced across devices</span>
							</button>
							<button type="button" onClick={() => setStoreInCloud(false)} className={cn('my-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left', !storeInCloud ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
								<span className="text-[13px] font-semibold text-[var(--text-heading)]">This device only</span><span className="ml-auto text-[11px] text-muted-foreground">local, never uploaded</span>
							</button>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
