import { Check, Download, LayoutGrid, Palette, Sparkles, X } from 'lucide-react';
import * as React from 'react';
import DeckPreview from '@/components/DeckPreview';
import { Button } from '@/components/ui/button';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';

// Fabricate — the Workbench Theme/Layout Studio (plan §2.3). Reached from the
// launcher, NOT a deck mode. Pick core colours → engine-derived contract → live
// WCAG audit → live specimen. Prototype: you really pick the four core colours
// (they drive the swatches + the accent chrome); the derived contract + audit are
// the engine's job and shown illustratively; the specimen renders through the
// engine (laguna stands in for the crafted "Laguna Pro").
const CORE0: [string, string][] = [
	['Background', '#F8F2E5'],
	['Surface', '#F1E9D4'],
	['Text', '#0E2F33'],
	['Accent', '#006D77'],
];
const DERIVED = ['#0E2F33', '#3D5559', '#6F7C7F', '#006D77', '#D2E8EA', '#DBCFB2', '#2B7E85', '#831A5A', '#7F7523', '#3A417F', '#248442', '#982B2B'];
const AUDIT: [string, string, string][] = [
	['Body on background', '9.4 : 1', 'AAA'],
	['Accent on background', '4.9 : 1', 'AA'],
	['Heading on surface', '11.8 : 1', 'AAA'],
	['On-accent on accent', '5.2 : 1', 'AA'],
];
const DENSITIES = ['Comfortable', 'Compact', 'Spacious'];

const SPECIMEN = '<!-- _class: kpi -->\n## Laguna Pro, derived & audited\n\n- 9.4 : 1\n  - Body contrast\n- 18\n  - Tokens derived';

export function Fabricate({ options, onClose, notify }: { options: SingleSlideOptions; onClose: () => void; notify: (msg: string) => void }) {
	const [tab, setTab] = React.useState<'theme' | 'layout'>('theme');
	const [core, setCore] = React.useState(CORE0);
	const [density, setDensity] = React.useState('Comfortable');
	const accent = core.find(([n]) => n === 'Accent')?.[1] ?? '#006D77';
	const setHex = (i: number, hex: string) => setCore((cs) => cs.map((c, j) => (j === i ? [c[0], hex] : c)));

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex h-[50px] shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
				<button type="button" onClick={onClose} className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Back to Compose"><X className="size-4" /></button>
				<span className="size-2 shrink-0 rounded-full" style={{ background: accent }} />
				<span className="truncate text-sm font-semibold text-[var(--text-heading)]">Laguna Pro</span>
				<span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">draft theme</span>
				<div className="ml-1 inline-flex shrink-0 rounded-[10px] border border-border bg-background p-[3px] sm:ml-3">
					<button type="button" onClick={() => setTab('theme')} aria-pressed={tab === 'theme'} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-semibold sm:px-3', tab === 'theme' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><Palette className="size-3.5" />Theme</button>
					<button type="button" onClick={() => setTab('layout')} aria-pressed={tab === 'layout'} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-semibold sm:px-3', tab === 'layout' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><LayoutGrid className="size-3.5" />Layout</button>
				</div>
				<div className="flex-1" />
				<Button variant="outline" size="sm" className="shrink-0 gap-1.5 px-2 sm:px-3" onClick={() => notify('Exported Laguna Pro as a theme file (.css token set).')}><Download className="size-4" /><span className="hidden sm:inline">Export theme</span></Button>
				<Button size="sm" className="shrink-0 gap-1.5 px-2 sm:px-3" onClick={() => notify('Saved “Laguna Pro” to your theme library.')}><Check className="size-4" /><span className="hidden sm:inline">Save to library</span></Button>
			</div>

			{/* Stacked on mobile (the fixed 340px column would overflow), two columns ≥ md. */}
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:grid md:overflow-hidden md:[grid-template-columns:340px_1fr]">
				<aside className="shrink-0 border-b border-border md:overflow-y-auto md:border-r md:border-b-0">
					<div className="border-b border-border px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tab === 'theme' ? 'Theme Studio' : 'Layout Studio'}</div>
					{tab === 'theme' ? (
						<>
							<Section icon={<Palette className="size-3.5" />} label="Core colours — you pick 4">
								{core.map(([name, hex], i) => (
									<div key={name} className="my-2.5 flex items-center gap-3">
										<label className="relative size-[30px] cursor-pointer rounded-lg border border-border" style={{ background: hex }} aria-label={`${name} colour`}>
											<input type="color" value={hex} onChange={(e) => setHex(i, e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
										</label>
										<span className="flex-1 text-[12.5px] font-semibold text-[var(--text-heading)]">{name}</span>
										<span className="rounded-md border border-border px-2 py-0.5 font-mono text-[12px] uppercase text-muted-foreground">{hex}</span>
									</div>
								))}
							</Section>
							<Section icon={<Sparkles className="size-3.5" />} label="Engine-derived contract — 18 tokens">
								<div className="flex flex-wrap gap-1.5">{DERIVED.map((d) => <span key={d} className="size-[26px] rounded-md border border-border" style={{ background: d }} />)}</div>
							</Section>
							<Section icon={<Check className="size-3.5" />} label="WCAG audit — all pass" last>
								{AUDIT.map(([what, ratio, pill]) => (
									<div key={what} className="my-2 flex items-center gap-2.5 text-[12.5px] text-foreground">
										<span className="grid size-[18px] place-items-center rounded-md bg-[color-mix(in_srgb,var(--chart-3,#2e6f00)_18%,transparent)] text-[var(--chart-3,#2e6f00)]"><Check className="size-3" /></span>
										{what}<span className="ml-auto font-mono text-[11px] text-muted-foreground">{ratio}</span>
										<span className="rounded-full border border-[color-mix(in_srgb,var(--chart-3,#2e6f00)_35%,transparent)] px-1.5 py-px font-mono text-[10px] font-bold text-[var(--chart-3,#2e6f00)]">{pill}</span>
									</div>
								))}
							</Section>
						</>
					) : (
						<Section icon={<LayoutGrid className="size-3.5" />} label="Density — how the layouts breathe" last>
							{DENSITIES.map((d) => (
								<button type="button" key={d} onClick={() => { setDensity(d); notify(`Layout density → ${d}.`); }} aria-pressed={density === d} className={cn('my-1.5 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left', density === d ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]')}>
									<span className="text-[13px] font-semibold text-[var(--text-heading)]">{d}</span>
									<span className={cn('ml-auto size-[16px] rounded-full border-2', density === d ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-border')} />
								</button>
							))}
						</Section>
					)}
				</aside>
				<div className="flex flex-col items-center gap-4 bg-card p-4 md:overflow-y-auto md:p-7">
					<span className="self-start font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Live specimen — your theme, rendered</span>
					<DeckPreview options={options} sample={SPECIMEN} mermaid={false} paletteOverride="laguna" className="relative aspect-video w-full max-w-[620px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_24px_rgba(10,22,40,.10)]" aria-label="Theme specimen" />
				</div>
			</div>
		</div>
	);
}

function Section({ icon, label, last, children }: { icon: React.ReactNode; label: string; last?: boolean; children: React.ReactNode }) {
	return (
		<div className={`px-4 py-3.5 ${!last ? 'border-b border-border' : ''}`}>
			<div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
			{children}
		</div>
	);
}
