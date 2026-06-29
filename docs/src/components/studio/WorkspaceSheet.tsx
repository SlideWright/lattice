import { Cloud, Cpu, FolderTree, MessageSquareText, Plug, Sparkles, Wallet, Zap } from 'lucide-react';
import * as React from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { fmtTokens, fmtUSD } from '@/playground/or-catalog.js';
import { architectSpend, connectOpenRouter, disconnectOpenRouter, setBudget, setStudioTier, useArchitectStatus } from './architect';
import { ModelPicker } from './ModelPicker';
import { OnDeviceTier } from './OnDeviceTier';

// Workspace Settings — "your setup", distinct from the deck Inspector's "this deck".
// The AI-model tab is a single GENERATION switch (Cloud / On-device) that picks the
// ACTIVE tier — connection ≠ active (Studio Policy B): the cloud stays connected but
// dormant while you run on-device, and one tap resumes it. The Spend tab shows the
// authoritative OpenRouter account balance beside the live session tally.
const TABS = ['AI model', 'Spend', 'Instructions', 'Storage'] as const;
type Tab = (typeof TABS)[number];
type GenView = 'cloud' | 'ondevice';

const ON_DEVICE_TIERS = new Set(['prompt-api', 'webllm', 'universal']);

function GroupLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
	return <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{children}</div>;
}

export function WorkspaceSheet({ open, onOpenChange, notify }: { open: boolean; onOpenChange: (v: boolean) => void; notify: (msg: string) => void }) {
	const [tab, setTab] = React.useState<Tab>('AI model');
	// Bump on open so the live status (incl. the authoritative account spend) re-fetches.
	const [pulse, setPulse] = React.useState(0);
	const ai = useArchitectStatus(pulse);
	const [genView, setGenView] = React.useState<GenView>('cloud');
	const userPickedView = React.useRef(false);
	const [instructions, setInstructions] = React.useState(() => {
		try {
			return localStorage.getItem('lattice-studio-instructions') ?? 'Default to a confident, board-ready voice. Lead each slide with the number. Avoid hedging.';
		} catch {
			return '';
		}
	});
	const [storeInCloud, setStoreInCloud] = React.useState(false);
	const [connecting, setConnecting] = React.useState(false);
	const [spend, setSpend] = React.useState(() => architectSpend());
	React.useEffect(() => {
		if (open) {
			setSpend(architectSpend());
			setPulse((p) => p + 1);
		}
	}, [open]);

	const cloudActive = ai.generation === 'openrouter';
	const onDeviceActive = ON_DEVICE_TIERS.has(ai.generation);
	// Seed the visible pane from the ACTIVE tier — but only until the user picks a
	// pane themselves, so a later status refresh can't yank them off their selection.
	React.useEffect(() => {
		if (userPickedView.current) return;
		if (onDeviceActive) setGenView('ondevice');
		else if (cloudActive) setGenView('cloud');
	}, [cloudActive, onDeviceActive]);

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
	const pickCloud = async () => {
		userPickedView.current = true;
		setGenView('cloud');
		if (ai.openRouterReady) {
			await setStudioTier('auto'); // resume the connected cloud as the active tier
			setPulse((p) => p + 1);
			notify('Cloud is your active tier.');
		}
	};
	const pickOnDevice = () => {
		userPickedView.current = true;
		setGenView('ondevice');
	};

	// The authoritative account line (used/left), only when connected + reported.
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
					<SheetDescription className="sr-only">Your workspace setup — generation tier, spend, standing instructions, and storage.</SheetDescription>
				</SheetHeader>
				<div className="overflow-y-auto p-5">
					<div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Workspace settings">
						{TABS.map((t) => (
							<button type="button" key={t} role="tab" aria-selected={t === tab} onClick={() => setTab(t)} className={cn('rounded-full border px-3 py-1.5 text-[12.5px] font-semibold', t === tab ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]')}>{t}</button>
						))}
					</div>

					{tab === 'AI model' && (
						<div>
							<GroupLabel icon={<Sparkles className="size-3.5" />}>Generation</GroupLabel>
							{/* The active-tier SWITCH — picking a side sets which tier generates. */}
							<div className="flex gap-1 rounded-lg border border-border p-0.5" role="tablist" aria-label="Active generation tier">
								{([['cloud', 'Cloud', <Cloud key="c" className="size-3.5" />, pickCloud], ['ondevice', 'On-device', <Cpu key="d" className="size-3.5" />, pickOnDevice]] as const).map(([key, label, icon, onPick]) => (
									<button type="button" key={key} role="tab" aria-selected={genView === key} onClick={onPick} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-semibold', genView === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-[var(--text-heading)]')}>{icon}{label}</button>
								))}
							</div>
							<p className="mb-3 mt-1.5 px-0.5 text-[11px] text-muted-foreground">
								<span className="font-semibold text-[var(--text-heading)]">{cloudActive ? 'Cloud is active' : onDeviceActive ? 'On-device is active' : 'No tier active yet'}</span>
								{cloudActive ? ' — edits run on OpenRouter.' : onDeviceActive ? ' — free & private on this device.' : ' — connect a cloud model or load one on-device.'}
							</p>

							{genView === 'cloud' ? (
								ai.openRouterReady ? (
									<div>
										<div className={cn('flex items-center gap-3 rounded-xl border px-3 py-2.5', cloudActive ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
											<span className={cn('grid size-[30px] place-items-center rounded-lg', cloudActive ? 'bg-primary text-primary-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]')}><Zap className="size-4" /></span>
											<span><div className="text-[13px] font-semibold text-[var(--text-heading)]">OpenRouter — {cloudActive ? 'active' : 'connected, dormant'}</div><div className="text-[11px] text-muted-foreground">{ai.remaining != null ? `${fmtUSD(ai.remaining)} left` : 'Connected'}</div></span>
											<button type="button" onClick={disconnect} className="ml-auto rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]">Disconnect</button>
										</div>
										<div className="mt-3"><ModelPicker status={ai} notify={notify} /></div>
										<p className="mt-2 text-[11px] leading-relaxed text-muted-foreground"><span className="text-[var(--accent)]">●</span> Metered per request · the deck text leaves your device.</p>
									</div>
								) : (
									<div>
										<button type="button" onClick={connect} disabled={connecting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-[13px] font-semibold text-primary-foreground disabled:opacity-60"><Plug className="size-4" />{connecting ? 'Opening OpenRouter…' : 'Connect OpenRouter (one click)'}</button>
										<p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Connecting uses your own OpenRouter account (one-click OAuth — no key to paste). You then pick from 500+ models, defaulting to Claude Sonnet 4. Or switch to On-device to run free &amp; private with no account.</p>
									</div>
								)
							) : (
								<div>
									<OnDeviceTier status={ai} notify={notify} />
									{ai.openRouterReady && (
										<div className="mt-2.5 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
											<span className="grid size-[30px] place-items-center rounded-lg bg-[color-mix(in_srgb,var(--muted-foreground)_12%,transparent)] text-muted-foreground"><Cloud className="size-4" /></span>
											<span><div className="text-[13px] font-semibold text-muted-foreground">OpenRouter — connected, dormant</div><div className="text-[11px] text-muted-foreground">{ai.remaining != null ? `${fmtUSD(ai.remaining)} left · ` : ''}stays linked while you run on-device</div></span>
											<button type="button" onClick={pickCloud} className="ml-auto rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]">Use Cloud</button>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{tab === 'Spend' && (
						<div>
							<GroupLabel icon={<Wallet className="size-3.5" />}>Spend</GroupLabel>
							{/* The OpenRouter account total is AUTHORITATIVE (fetched with your key).
							    The session figure is an honest live tally from each reply's usage.cost.
							    No local "all-time" — it would start at $0 here and contradict the account. */}
							<div className="rounded-xl border border-border bg-card p-3">
								{accountLine && <p className={cn('text-[15px] font-extrabold', lowBalance ? 'text-[var(--fail,#b3261e)]' : 'text-[var(--text-heading)]')}>{accountLine}</p>}
								<p className={cn('font-mono text-[12px] text-muted-foreground', accountLine && 'mt-1')}>This session: {fmtUSD(spend.session)}{spend.sessionTokens ? ` (${fmtTokens(spend.sessionTokens)} tokens)` : ''}</p>
								{!accountLine && <p className="mt-1 text-[11px] text-muted-foreground">{ai.openRouterReady ? 'Account balance unavailable for this key.' : 'Connect OpenRouter to see your authoritative account balance.'}</p>}
							</div>
							{spend.cap > 0 && (
								<div className="my-2 h-[7px] overflow-hidden rounded-full bg-border"><span className={cn('block h-full rounded-full', spend.status.level === 'over' ? 'bg-[var(--fail,#b3261e)]' : 'bg-primary')} style={{ width: `${Math.min(100, (spend.session / spend.cap) * 100)}%` }} /></div>
							)}
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
							<p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{spend.cap > 0 ? `Cap ${fmtUSD(spend.cap)} · ${spend.mode === 'stop' ? 'AI edits blocked once reached' : 'warns past 80%'}.` : 'No cap — spend is metered per real OpenRouter request. On-device tiers are always free.'}{spend.status.message ? ` ${spend.status.message}.` : ''}</p>
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
