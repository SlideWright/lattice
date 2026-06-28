import { Check, Download, LayoutGrid, Palette, Sparkles, TriangleAlert, X } from 'lucide-react';
import * as React from 'react';
import DeckPreview from '@/components/DeckPreview';
import { Button } from '@/components/ui/button';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';
// The REAL theme engine — same maths as the Node tooling + the WCAG gate
// (lib/theme/*, bundled browser-safe). deriveTheme → ~100 tokens (contrast-
// repaired), auditBoth → live WCAG report, serializeTheme → a real themes/*.css.
import { auditBoth, deriveTheme, STARTERS, serializeTheme, validateEssentials } from '@/playground/theme-core.generated.js';
import { downloadText } from './download';

// The four colours the author picks → essentials keys; the rest seed from a
// neutral starter and the derivation contrast-repairs everything.
const CORE: { label: string; key: 'bg' | 'bgAlt' | 'textHeading' | 'accent'; init: string }[] = [
	{ label: 'Background', key: 'bg', init: '#F8F2E5' },
	{ label: 'Surface', key: 'bgAlt', init: '#F1E9D4' },
	{ label: 'Text', key: 'textHeading', init: '#0E2F33' },
	{ label: 'Accent', key: 'accent', init: '#006D77' },
];
const DENSITIES = ['Comfortable', 'Compact', 'Spacious'];
const SPECIMEN = '<!-- _class: kpi -->\n\n`Theme · live specimen`\n\n## Your theme, derived & audited\n\n1. 100\n   - Tokens derived\n2. AA\n   - Contrast floor\n3. 4\n   - Colours you picked';

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const isColour = (v: unknown): v is string => typeof v === 'string' && /^(#|oklch|rgb|hsl)/i.test(v.trim());

export function Fabricate({ options, onClose, notify }: { options: SingleSlideOptions; onClose: () => void; notify: (msg: string) => void }) {
	const [tab, setTab] = React.useState<'theme' | 'layout'>('theme');
	const [core, setCore] = React.useState<Record<string, string>>(() => Object.fromEntries(CORE.map((c) => [c.key, c.init])));
	const [density, setDensity] = React.useState('Comfortable');
	const accent = core.accent;
	const setHex = (key: string, hex: string) => setCore((c) => ({ ...c, [key]: hex }));

	// Derive the full token map from the picked essentials — REAL, every render.
	const derived = React.useMemo(() => {
		const essentials = { ...STARTERS[0].essentials, bg: core.bg, bgAlt: core.bgAlt, textHeading: core.textHeading, textBody: core.textHeading, accent: core.accent };
		try {
			validateEssentials(essentials);
			const map = deriveTheme(essentials);
			const audit = auditBoth(map, { level: 'full' });
			const name = `fab-${hash(JSON.stringify(essentials))}`;
			const css = serializeTheme(map, { name, label: 'Laguna Pro' });
			return { map, audit, name, css, error: null as string | null };
		} catch (e) {
			return { map: {} as Record<string, unknown>, audit: { light: { results: [] }, dark: { results: [] }, ok: false }, name: 'indaco', css: '', error: String((e as Error)?.message || e) };
		}
	}, [core]);

	// 18 representative derived colour tokens for the contract strip (keep the
	// token name so the swatch key is stable across re-derivations).
	const tokens = React.useMemo(() => Object.entries(derived.map).filter(([, v]) => isColour(v)).slice(0, 18).map(([k, v]) => ({ name: k, value: v as string })), [derived.map]);
	// Curated WCAG rows: one per role, worst ratio across modes.
	const auditRows = React.useMemo(() => {
		const byRole = new Map<string, { role: string; ratio: number | null; status: string }>();
		for (const mode of ['light', 'dark'] as const) {
			for (const r of derived.audit[mode]?.results ?? []) {
				const prev = byRole.get(r.role);
				if (!prev || (r.ratio ?? 99) < (prev.ratio ?? 99)) byRole.set(r.role, { role: r.role, ratio: r.ratio, status: r.status });
			}
		}
		return [...byRole.values()].filter((r) => r.status === 'pass' || r.status === 'fail').slice(0, 5);
	}, [derived.audit]);

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
				<Button variant="outline" size="sm" className="shrink-0 gap-1.5 px-2 sm:px-3" onClick={() => { downloadText('laguna-pro.css', derived.css || '/* theme */', 'text/css'); notify('Exported laguna-pro.css — a real theme token set.'); }}><Download className="size-4" /><span className="hidden sm:inline">Export theme</span></Button>
				<Button size="sm" className="shrink-0 gap-1.5 px-2 sm:px-3" onClick={() => { try { localStorage.setItem('lattice-studio-theme-saved', derived.css); } catch {} notify('Saved “Laguna Pro” to your theme library.'); }}><Check className="size-4" /><span className="hidden sm:inline">Save to library</span></Button>
			</div>

			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:grid md:overflow-hidden md:[grid-template-columns:340px_1fr]">
				<aside className="shrink-0 border-b border-border md:overflow-y-auto md:border-r md:border-b-0">
					<div className="border-b border-border px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tab === 'theme' ? 'Theme Studio' : 'Layout Studio'}</div>
					{tab === 'theme' ? (
						<>
							<Section icon={<Palette className="size-3.5" />} label="Core colours — you pick 4">
								{CORE.map((c) => (
									<div key={c.key} className="my-2.5 flex items-center gap-3">
										<label className="relative size-[30px] cursor-pointer rounded-lg border border-border" style={{ background: core[c.key] }} aria-label={`${c.label} colour`}>
											<input type="color" value={core[c.key]} onChange={(e) => setHex(c.key, e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
										</label>
										<span className="flex-1 text-[12.5px] font-semibold text-[var(--text-heading)]">{c.label}</span>
										<span className="rounded-md border border-border px-2 py-0.5 font-mono text-[12px] uppercase text-muted-foreground">{core[c.key]}</span>
									</div>
								))}
							</Section>
							<Section icon={<Sparkles className="size-3.5" />} label={`Engine-derived contract — ${tokens.length} tokens`}>
								<div className="flex flex-wrap gap-1.5">{tokens.map((t) => <span key={t.name} className="size-[26px] rounded-md border border-border" style={{ background: t.value }} title={`--${t.name}: ${t.value}`} />)}</div>
							</Section>
							<Section icon={derived.audit.ok ? <Check className="size-3.5" /> : <TriangleAlert className="size-3.5" />} label={derived.audit.ok ? 'WCAG audit — all pass' : 'WCAG audit — review'} last>
								{auditRows.map((r) => {
									const ok = r.status === 'pass';
									const tier = (r.ratio ?? 0) >= 7 ? 'AAA' : ok ? 'AA' : 'FAIL';
									const colour = ok ? 'var(--chart-3,#2e6f00)' : 'var(--chart-2,#9c3f00)';
									return (
										<div key={r.role} className="my-2 flex items-center gap-2.5 text-[12.5px] text-foreground">
											<span className="grid size-[18px] place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${colour} 18%, transparent)`, color: colour }}>{ok ? <Check className="size-3" /> : <TriangleAlert className="size-3" />}</span>
											<span className="capitalize">{r.role}</span><span className="ml-auto font-mono text-[11px] text-muted-foreground">{r.ratio ? `${r.ratio.toFixed(1)} : 1` : '—'}</span>
											<span className="rounded-full border px-1.5 py-px font-mono text-[10px] font-bold" style={{ borderColor: `color-mix(in srgb, ${colour} 35%, transparent)`, color: colour }}>{tier}</span>
										</div>
									);
								})}
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
					<DeckPreview options={options} sample={SPECIMEN} mermaid={false} paletteOverride={derived.name} extraTheme={derived.css ? { name: derived.name, css: derived.css } : undefined} className="relative aspect-video w-full max-w-[620px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_24px_rgba(10,22,40,.10)]" aria-label="Theme specimen" />
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
