import { Check, Cpu, Download, Loader2 } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { type ArchitectStatus, loadUniversalModel, setStudioTier, summonWebLLM, type TierProgress } from './architect';

// The on-device generation ladder — restored to the Workspace UI. The adapter
// (architect-model.js) has always carried these rungs; the Studio dropped their
// controls. Three tiers, each free and private (the deck never leaves the device):
//   • built-in   — the browser's Prompt API (Chrome/Edge), instant, no download
//   • WebLLM     — a stronger model on a desktop GPU (~1GB, WebGPU)
//   • universal  — Transformers.js on WASM (~350MB), runs everywhere
// Availability comes from the live status; a rung that can't run says why.

type RungState = { phase: 'idle' | 'loading' | 'ready' | 'error'; pct: number; note?: string };

function Rung({
	icon,
	title,
	detail,
	state,
	actionLabel,
	disabled,
	disabledNote,
	onAction,
}: {
	icon: React.ReactNode;
	title: string;
	detail: string;
	state: RungState;
	actionLabel: string;
	disabled?: boolean;
	disabledNote?: string;
	onAction?: () => void;
}) {
	return (
		<div className={cn('rounded-xl border px-3 py-2.5', state.phase === 'ready' ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
			<div className="flex items-center gap-3">
				<span className={cn('grid size-[30px] shrink-0 place-items-center rounded-lg', state.phase === 'ready' ? 'bg-primary text-primary-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]')}>
					{state.phase === 'ready' ? <Check className="size-4" /> : icon}
				</span>
				<span className="min-w-0 flex-1">
					<span className="block text-[13px] font-semibold text-[var(--text-heading)]">{title}</span>
					<span className="block text-[11px] text-muted-foreground">{disabled ? (disabledNote ?? detail) : state.phase === 'ready' ? 'Loaded — ready to use' : detail}</span>
				</span>
				{state.phase === 'ready' ? (
					<span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">active</span>
				) : (
					<button
						type="button"
						onClick={onAction}
						disabled={disabled || state.phase === 'loading'}
						className="shrink-0 rounded-md border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)] disabled:opacity-50"
					>
						{state.phase === 'loading' ? (
							<span className="flex items-center gap-1"><Loader2 className="size-3 animate-spin" />{state.pct > 0 ? `${state.pct}%` : '…'}</span>
						) : (
							actionLabel
						)}
					</button>
				)}
			</div>
			{state.phase === 'loading' && (
				<div className="mt-2 h-[5px] overflow-hidden rounded-full bg-border">
					<span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(4, state.pct)}%` }} />
				</div>
			)}
			{state.phase === 'error' && <p className="mt-1.5 text-[11px] text-[var(--fail,#b3261e)]">{state.note ?? 'Could not load — try again.'}</p>}
		</div>
	);
}

export function OnDeviceTier({ status, notify }: { status: ArchitectStatus; notify: (msg: string) => void }) {
	const [webllm, setWebllm] = React.useState<RungState>({ phase: 'idle', pct: 0 });
	const [universal, setUniversal] = React.useState<RungState>({ phase: 'idle', pct: 0 });

	const promptReady = status.promptApi === 'available' || status.generation === 'prompt-api';
	const promptUnavailable = status.promptApi === 'unavailable' || status.promptApi === 'unknown';

	const run = async (
		set: React.Dispatch<React.SetStateAction<RungState>>,
		loader: (onProgress: (p: TierProgress) => void) => Promise<boolean>,
		label: string,
	) => {
		set({ phase: 'loading', pct: 0 });
		const ok = await loader((p) => set({ phase: 'loading', pct: Math.round((p.progress || 0) * 100) }));
		if (ok) {
			set({ phase: 'ready', pct: 100 });
			notify(`${label} ready — on-device, private, free.`);
		} else {
			set({ phase: 'error', pct: 0, note: `${label} could not load in this browser.` });
		}
	};

	return (
		<div className="space-y-2.5">
			<Rung
				icon={<Cpu className="size-4" />}
				title="Browser built-in"
				detail="The browser's own model (Chrome/Edge) — instant, no download."
				state={status.generation === 'prompt-api' ? { phase: 'ready', pct: 100 } : { phase: 'idle', pct: 0 }}
				actionLabel="Use"
				disabled={promptUnavailable && !promptReady}
				disabledNote="Not available in this browser — try Chrome or Edge, or the universal tier below."
				onAction={async () => {
					await setStudioTier('prompt-api');
					notify('Using the browser built-in model.');
				}}
			/>
			<Rung
				icon={<Download className="size-4" />}
				title="WebLLM"
				detail="A stronger model on your GPU — a one-time ~1GB download."
				state={status.webllmReady && webllm.phase !== 'loading' ? { phase: 'ready', pct: 100 } : webllm}
				actionLabel="Summon ~1GB"
				disabled={!status.webgpu}
				disabledNote="Needs WebGPU (a desktop browser with a GPU)."
				onAction={() => run(setWebllm, (op) => summonWebLLM(op), 'WebLLM')}
			/>
			<Rung
				icon={<Download className="size-4" />}
				title="Universal (Transformers.js)"
				detail="Runs everywhere on WASM — a one-time ~350MB download."
				state={status.universalReady && universal.phase !== 'loading' ? { phase: 'ready', pct: 100 } : universal}
				actionLabel="Load ~350MB"
				onAction={() => run(setUniversal, (op) => loadUniversalModel(op), 'Universal model')}
			/>
			<p className="text-[11px] leading-relaxed text-muted-foreground">On-device tiers are free and private — your deck never leaves the browser. They're ideal for cheap iteration; the cloud tier is stronger for board-grade edits.</p>
		</div>
	);
}
