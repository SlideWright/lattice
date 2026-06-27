import { Check, Download, LayoutGrid, Palette, Sparkles, X } from 'lucide-react';
import DeckPreview from '@/components/DeckPreview';
import { Button } from '@/components/ui/button';
import type { SingleSlideOptions } from '@/lib/single-slide-render';

// Fabricate — the Workbench Theme/Layout Studio (plan §2.3). Reached from the
// launcher, NOT a deck mode. Pick core colours → engine-derived contract → live
// WCAG audit → live specimen. Prototype: the specimen renders through the engine
// (laguna stands in for the crafted "Laguna Pro").
const CORE = [
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

const SPECIMEN = '<!-- _class: kpi -->\n## Laguna Pro, derived & audited\n\n- 9.4 : 1\n  - Body contrast\n- 18\n  - Tokens derived';

export function Fabricate({ options, onClose }: { options: SingleSlideOptions; onClose: () => void }) {
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex h-[50px] items-center gap-3 border-b border-border bg-card px-4">
				<button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Back to Compose"><X className="size-4" /></button>
				<span className="size-2 rounded-full bg-[#006D77]" />
				<span className="text-sm font-semibold text-[var(--text-heading)]">Laguna Pro</span>
				<span className="font-mono text-[11px] text-muted-foreground">draft theme</span>
				<div className="ml-3 inline-flex rounded-[10px] border border-border bg-background p-[3px]">
					<button type="button" className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1 text-[13px] font-semibold text-[var(--accent)] shadow-sm"><Palette className="size-3.5" />Theme</button>
					<button type="button" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-semibold text-muted-foreground"><LayoutGrid className="size-3.5" />Layout</button>
				</div>
				<div className="flex-1" />
				<Button variant="outline" size="sm" className="gap-1.5"><Download className="size-4" />Export theme</Button>
				<Button size="sm" className="gap-1.5"><Check className="size-4" />Save to library</Button>
			</div>

			<div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: '340px 1fr' }}>
				<aside className="overflow-y-auto border-r border-border">
					<div className="border-b border-border px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Theme Studio</div>
					<Section icon={<Palette className="size-3.5" />} label="Core colours — you pick 4">
						{CORE.map(([name, hex]) => (
							<div key={name} className="my-2.5 flex items-center gap-3">
								<span className="size-[30px] rounded-lg border border-border" style={{ background: hex }} />
								<span className="flex-1 text-[12.5px] font-semibold text-[var(--text-heading)]">{name}</span>
								<span className="rounded-md border border-border px-2 py-0.5 font-mono text-[12px] text-muted-foreground">{hex}</span>
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
				</aside>
				<div className="flex flex-col items-center gap-4 overflow-y-auto bg-card p-7">
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
