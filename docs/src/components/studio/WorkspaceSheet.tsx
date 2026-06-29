import { Check, Cloud, Cpu, FolderTree, MessageSquareText, Plug, Sparkles, Wallet, Zap } from 'lucide-react';
import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fmtTokens, fmtUSD } from '@/playground/or-catalog.js';
import { architectSpend, connectOpenRouter, disconnectOpenRouter, setBudget, useArchitectStatus } from './architect';
import { ModelPicker } from './ModelPicker';
import { OnDeviceTier } from './OnDeviceTier';

// Workspace Settings — "your setup" (plan §4.2), distinct from the deck Inspector's
// "this deck". Honest now: the AI-model + Cloud + Spend tabs read the REAL architect
// model (architect.ts) — the active generation tier, the live OpenRouter connection
// (one-click OAuth) + model picker + on-device ladder, and the real session spend
// alongside the authoritative OpenRouter account total.
const TABS = ['AI model', 'Cloud', 'Spend', 'Instructions', 'Storage'] as const;
type Tab = (typeof TABS)[number];
type TierMode = 'cloud' | 'ondevice';

const TIER_LABEL: Record<string, string> = {
	floor: 'Floor — deterministic (no model)',
	'prompt-api': "On-device — the browser's built-in model",
	webllm: 'On-device — WebLLM (WebGPU)',
	universal: 'On-device — Transformers.js (WASM)',
	openrouter: 'OpenRouter — your connected cloud',
};
const ON_DEVICE_TIERS = new Set(['prompt-api', 'webllm', 'universal']);

function GroupLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
	return <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{children}</div>;
}

export function WorkspaceSheet({ open, onOpenChange, notify }: { open: boolean; onOpenChange: (v: boolean) => void; notify: (msg: string) => void }) {
	const [tab, setTab] = React.useState<Tab>('AI model');
	// Bump on open so the live model status (incl. the authoritative account spend)
	// re-fetches each time the sheet is shown — that's the "real-time" gauge.
	const [pulse, setPulse] = React.useState(0);
	const ai = useArchitectStatus(pulse);
	const [tierMode, setTierMode] = React.useState<TierMode>('cloud');
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
		if (open) {
			setSpend(architectSpend());
			setPulse((p) => p + 1);
		}
	}, [open]);
	// Follow the active tier into the right configuration pane (on-device if a local
	// rung is live), but leave the user free to switch back to cloud to connect.
	React.useEffect(() => {
		if (ON_DEVICE_TIERS.has(ai.generation)) setTierMode('ondevice');
	}, [ai.generation]);

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

	// The authoritative account line (used/left), only when OpenRouter is connected
	// and the key reports figures. Low-balance flag at ≤20% of a known limit.
	const accountParts = [
		ai.remaining != null ? `${fmtUSD(ai.remaining)} left` : null,
		ai.usage != null ? `${fmtUSD(ai.usage)} used` : null,
	].filter(Boolean);
	const accountLine = ai.openRouterReady && accountParts.length ? `OpenRouter: ${accountParts.join(' · ')}` : null;
	const lowBalance = ai.remaining != null && ai.limit != null && ai.limit > 0 && ai.remaining <= 0.2 * ai.limit;

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

							{/* Cloud vs on-device — pick which tier to configure. */}
							<div className="mt-3 flex gap-1 rounded-lg border border-border p-0.5" role="tablist" aria-label="Generation tier">
								{([['cloud', 'Cloud', <Cloud key="c" className="size-3.5" />], ['ondevice', 'On-device', <Cpu key="d" className="size-3.5" />]] as const).map(([key, label, icon]) => (
									<button type="button" key={key} role="tab" aria-selected={tierMode === key} onClick={() => setTierMode(key)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-semibold', tierMode === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-[var(--text-heading)]')}>{icon}{label}</button>
								))}
							</div>

							<div className="mt-3">
								{tierMode === 'cloud' ? (
									ai.openRouterReady ? (
										<div>
											<ModelPicker status={ai} notify={notify} />
											<button type="button" onClick={disconnect} className="mt-3 text-[12px] font-semibold text-[var(--accent)] underline-offset-2 hover:underline">Disconnect OpenRouter</button>
										</div>
									) : (
										<div>
											<button type="button" onClick={connect} disabled={connecting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"><Plug className="size-4" />{connecting ? 'Opening OpenRouter…' : 'Connect OpenRouter (one click)'}</button>
											<p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Connecting uses your own OpenRouter account (one-click OAuth — no key to paste). You then pick from 500+ models, defaulting to Claude Sonnet 4. Until then the Architect runs on the deterministic floor: it advises, but cannot auto-edit your deck.</p>
										</div>
									)
								) : (
									<OnDeviceTier status={ai} notify={notify} />
								)}
							</div>
						</div>
					)}

					{tab === 'Cloud' && (
						<div>
							<GroupLabel icon={<Cloud className="size-3.5" />}>OpenRouter connection</GroupLabel>
							{ai.openRouterReady ? (
								<div className="flex items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5">
									<span className="grid size-[30px] place-items-center rounded-lg bg-primary text-primary-foreground"><Cloud className="size-4" /></span>
									<span><div className="text-[13px] font-semibold text-[var(--text-heading)]">Connected</div><div className="text-[11px] text-muted-foreground">{ai.modelName ?? 'OpenRouter cloud'}{ai.remaining != null ? ` · ${fmtUSD(ai.remaining)} credit left` : ''}</div></span>
									<button type="button" onClick={disconnect} className="ml-auto rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]">Disconnect</button>
								</div>
							) : (
								<button type="button" onClick={connect} disabled={connecting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"><Plug className="size-4" />{connecting ? 'Opening OpenRouter…' : 'Connect OpenRouter'}</button>
							)}
						</div>
					)}

					{tab === 'Spend' && (
						<div>
							<GroupLabel icon={<Wallet className="size-3.5" />}>Spend</GroupLabel>
							{/* The OpenRouter account total is AUTHORITATIVE (fetched with your key).
							    The session figure is an honest live tally from each reply's usage.cost.
							    We deliberately don't show a local "all-time" — it would start at $0 on
							    this device and contradict the real account total. */}
							<div className="rounded-xl border border-border bg-card p-3">
								{accountLine && <p className={cn('text-[15px] font-extrabold', lowBalance ? 'text-[var(--fail,#b3261e)]' : 'text-[var(--text-heading)]')}>{accountLine}</p>}
								<p className={cn('font-mono text-[12px] text-muted-foreground', accountLine && 'mt-1')}>This session: {fmtUSD(spend.session)}{spend.sessionTokens ? ` (${fmtTokens(spend.sessionTokens)} tokens)` : ''}</p>
								{!accountLine && <p className="mt-1 text-[11px] text-muted-foreground">{ai.openRouterReady ? 'Account balance unavailable for this key.' : 'Connect OpenRouter to see your authoritative account balance.'}</p>}
							</div>
							{spend.cap > 0 && (
								<div className="my-2 h-[7px] overflow-hidden rounded-full bg-border"><span className={cn('block h-full rounded-full', spend.status.level === 'over' ? 'bg-[var(--fail,#b3261e)]' : 'bg-primary')} style={{ width: `${Math.min(100, (spend.session / spend.cap) * 100)}%` }} /></div>
							)}
							{/* Editable session cap + enforcement — the architect honors this. */}
							<div className="mt-3 flex items-center gap-2">
								<label htmlFor="ws-cap" className="text-[12.5px] text-[var(--text-heading)]">Session cap</label>
								<span className="text-[12.5px] text-muted-foreground">$</span>
								<input
									id="ws-cap"
									type="number"
									min={0}
									step={0.5}
									defaultValue={spend.cap || ''}
									placeholder="none"
									onBlur={(e) => { setBudget(Number(e.target.value) || null, spend.mode as 'alert' | 'stop'); setSpend(architectSpend()); }}
									className="w-[72px] rounded-md border border-border bg-background px-2 py-1 text-[12.5px] text-foreground outline-none focus:border-[var(--accent)]"
								/>
								<select
									aria-label="Budget enforcement mode"
									value={spend.mode}
									onChange={(e) => { setBudget(spend.cap || null, e.target.value as 'alert' | 'stop'); setSpend(architectSpend()); }}
									className="ml-auto rounded-md border border-border bg-background px-2 py-1 text-[12.5px] font-semibold text-[var(--text-heading)] outline-none focus:border-[var(--accent)]"
								>
									<option value="alert">Warn at 80%</option>
									<option value="stop">Hard stop</option>
								</select>
							</div>
							<p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{spend.cap > 0 ? `Cap ${fmtUSD(spend.cap)} · ${spend.mode === 'stop' ? 'AI edits blocked once reached' : 'warns past 80%'}.` : 'No cap — spend is metered per real OpenRouter request.'}{spend.status.message ? ` ${spend.status.message}.` : ''}</p>
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
