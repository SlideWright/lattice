import { Check, Cloud, FolderTree, MessageSquareText, Plug, Sparkles, Wallet, Zap } from 'lucide-react';
import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { architectSpend, connectOpenRouter, disconnectOpenRouter, useArchitectStatus } from './architect';

// Workspace Settings — "your setup" (plan §4.2), distinct from the deck Inspector's
// "this deck". Honest now: the AI-model + Cloud + Spend tabs read the REAL architect
// model (architect.ts) — the active generation tier, the live OpenRouter connection
// (one-click OAuth), and the real session/all-time spend.
const TABS = ['AI model', 'Cloud', 'Spend', 'Instructions', 'Storage'] as const;
type Tab = (typeof TABS)[number];

const TIER_LABEL: Record<string, string> = {
	floor: 'Floor — deterministic (no model)',
	'prompt-api': "On-device — the browser's built-in model",
	webllm: 'On-device — WebLLM (WebGPU)',
	universal: 'On-device — Transformers.js (WASM)',
	openrouter: 'OpenRouter — your connected cloud',
};

function GroupLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
	return <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{children}</div>;
}

export function WorkspaceSheet({ open, onOpenChange, notify }: { open: boolean; onOpenChange: (v: boolean) => void; notify: (msg: string) => void }) {
	const [tab, setTab] = React.useState<Tab>('AI model');
	const ai = useArchitectStatus();
	const [instructions, setInstructions] = React.useState(() => {
		try {
			return localStorage.getItem('lattice-studio-instructions') ?? 'Default to a confident, board-ready voice. Lead each slide with the number. Avoid hedging.';
		} catch {
			return '';
		}
	});
	const [storeInCloud, setStoreInCloud] = React.useState(false);
	const [connecting, setConnecting] = React.useState(false);
	// Read real spend whenever the sheet opens (and after a connect).
	const [spend, setSpend] = React.useState(() => architectSpend());
	React.useEffect(() => {
		if (open) setSpend(architectSpend());
	}, [open]);

	const connect = async () => {
		setConnecting(true);
		try {
			await connectOpenRouter(); // navigates away to the OAuth page
		} catch (e) {
			notify(`Connect failed: ${(e as Error)?.message || 'unavailable here'}`);
			setConnecting(false);
		}
	};
	const disconnect = async () => {
		await disconnectOpenRouter();
		notify('OpenRouter disconnected.');
	};

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
							<GroupLabel icon={<Sparkles className="size-3.5" />}>Active generation tier</GroupLabel>
							<div className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5', ai.ready ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
								<span className={cn('grid size-[30px] place-items-center rounded-lg', ai.ready ? 'bg-primary text-primary-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]')}>{ai.ready ? <Zap className="size-4" /> : <Check className="size-4" />}</span>
								<span><div className="text-[13px] font-semibold text-[var(--text-heading)]">{TIER_LABEL[ai.generation] ?? ai.generation}</div><div className="text-[11px] text-muted-foreground">{ai.ready ? (ai.modelName ? ai.modelName : 'Connected — edits run in the cloud') : 'No model — the Architect advises but cannot auto-edit'}</div></span>
							</div>
							{!ai.ready && (
								<button type="button" onClick={connect} disabled={connecting} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"><Plug className="size-4" />{connecting ? 'Opening OpenRouter…' : 'Connect OpenRouter (one click)'}</button>
							)}
							<p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Connecting uses your own OpenRouter account (one-click OAuth — no key to paste). Until then the Architect runs on the deterministic floor: it advises, but cannot auto-edit your deck.</p>
						</div>
					)}

					{tab === 'Cloud' && (
						<div>
							<GroupLabel icon={<Cloud className="size-3.5" />}>OpenRouter connection</GroupLabel>
							{ai.ready ? (
								<div className="flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5">
									<span className="grid size-[30px] place-items-center rounded-lg bg-primary text-primary-foreground"><Cloud className="size-4" /></span>
									<span><div className="text-[13px] font-semibold text-[var(--text-heading)]">Connected</div><div className="text-[11px] text-muted-foreground">{ai.modelName ?? 'OpenRouter cloud'}{ai.remaining != null ? ` · $${ai.remaining.toFixed(2)} credit left` : ''}</div></span>
									<button type="button" onClick={disconnect} className="ml-auto rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]">Disconnect</button>
								</div>
							) : (
								<button type="button" onClick={connect} disabled={connecting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"><Plug className="size-4" />{connecting ? 'Opening OpenRouter…' : 'Connect OpenRouter'}</button>
							)}
						</div>
					)}

					{tab === 'Spend' && (
						<div>
							<GroupLabel icon={<Wallet className="size-3.5" />}>Spend (real, from your sessions)</GroupLabel>
							<div className="flex gap-2.5">
								{[[`$${spend.session.toFixed(2)}`, 'this session'], [`$${spend.total.toFixed(2)}`, 'all-time']].map(([v, l]) => (
									<div key={l} className="flex-1 rounded-xl border border-border bg-card p-3"><div className="text-[22px] font-extrabold text-[var(--text-heading)]">{v}</div><div className="font-mono text-[11px] text-muted-foreground">{l}</div></div>
								))}
							</div>
							<div className="mt-2 font-mono text-[11px] text-muted-foreground">{spend.sessionTokens.toLocaleString()} tokens this session · {spend.totalTokens.toLocaleString()} all-time</div>
							{spend.cap > 0 ? (
								<>
									<div className="mt-3 flex items-center justify-between text-[12.5px]"><span>Session budget cap</span><span className="font-semibold text-[var(--text-heading)]">${spend.cap.toFixed(2)}</span></div>
									<div className="my-2 h-[7px] overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (spend.session / spend.cap) * 100)}%` }} /></div>
								</>
							) : (
								<p className="mt-3 text-[11px] text-muted-foreground">No session cap set. {spend.status.message ?? 'Spend is metered per real OpenRouter request.'}</p>
							)}
						</div>
					)}

					{tab === 'Instructions' && (
						<div>
							<GroupLabel icon={<MessageSquareText className="size-3.5" />}>Standing instructions</GroupLabel>
							<p className="mb-2 text-xs text-muted-foreground">Saved with your workspace; sent with every generation.</p>
							<textarea
								value={instructions}
								onChange={(e) => {
									setInstructions(e.target.value);
									try {
										localStorage.setItem('lattice-studio-instructions', e.target.value);
									} catch {
										/* non-fatal */
									}
								}}
								rows={5}
								aria-label="Standing instructions"
								className="w-full resize-none rounded-xl border border-border bg-background p-3 text-[13px] leading-relaxed text-foreground outline-none focus:border-[var(--accent)]"
							/>
							<div className="mt-1 text-right font-mono text-[11px] text-muted-foreground">{instructions.length} chars · saved</div>
						</div>
					)}

					{tab === 'Storage' && (
						<div>
							<GroupLabel icon={<FolderTree className="size-3.5" />}>Where decks live</GroupLabel>
							<button type="button" onClick={() => { setStoreInCloud(false); notify('Decks are stored on this device (localStorage).'); }} className={cn('my-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left', !storeInCloud ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
								<span className="text-[13px] font-semibold text-[var(--text-heading)]">This device only</span><span className="ml-auto text-[11px] text-muted-foreground">local · how Studio stores today</span>
							</button>
							<button type="button" onClick={() => { setStoreInCloud(true); notify('Cloud sync is not enabled in this build — decks stay on this device.'); }} className={cn('my-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left', storeInCloud ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
								<span className="text-[13px] font-semibold text-[var(--text-heading)]">Cloud workspace</span><span className="ml-auto text-[11px] text-muted-foreground">synced — coming soon</span>
							</button>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
