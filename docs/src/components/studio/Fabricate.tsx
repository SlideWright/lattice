import { Check, Download, LayoutGrid, Moon, Palette, RotateCcw, Sparkles, Sun, TriangleAlert, X } from 'lucide-react';
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
import { LayoutStudio } from './LayoutStudio';
import { saveStudioTheme, slugify } from './theme-library';

// You pick ALL TEN essentials — the same set the engine derivation + the
// Workbench Theme Studio take (theme-core ESSENTIAL_KEYS). The derivation
// contrast-repairs everything else (~100 tokens) from these. Grouped for the
// eye: light surfaces, the ink trio, brand, then the semantic signals.
type EssKey = 'bg' | 'bgAlt' | 'textHeading' | 'textBody' | 'textMuted' | 'accent' | 'accentSoft' | 'pass' | 'warn' | 'fail';
const ESSENTIALS: { key: EssKey; label: string; group: string }[] = [
	{ key: 'bg', label: 'Background', group: 'Surfaces' },
	{ key: 'bgAlt', label: 'Surface', group: 'Surfaces' },
	{ key: 'textHeading', label: 'Heading ink', group: 'Ink' },
	{ key: 'textBody', label: 'Body ink', group: 'Ink' },
	{ key: 'textMuted', label: 'Muted ink', group: 'Ink' },
	{ key: 'accent', label: 'Accent', group: 'Brand' },
	{ key: 'accentSoft', label: 'Accent wash', group: 'Brand' },
	{ key: 'pass', label: 'Success', group: 'Signals' },
	{ key: 'warn', label: 'Warning', group: 'Signals' },
	{ key: 'fail', label: 'Error', group: 'Signals' },
];
const GROUPS = ['Surfaces', 'Ink', 'Brand', 'Signals'];
const SPECIMEN = '<!-- _class: kpi -->\n\n`Theme · live specimen`\n\n## Your theme, derived & audited\n\n1. 100\n   - Tokens derived\n2. AA\n   - Contrast floor\n3. 10\n   - Colors you picked';

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

// The human-facing contract: the derived roles a theme author actually curates,
// each a light-dark() pair. Editing a side PINS an override on top of the engine
// derivation (the audit re-runs against the override, so a contrast-breaking edit
// surfaces immediately). This is where light vs dark is curated — two columns,
// both editable. (#48 editable contract / #49 light-dark curation.)
const CONTRACT: { token: string; label: string }[] = [
	{ token: 'bg', label: 'Background' },
	{ token: 'bg-alt', label: 'Surface' },
	{ token: 'border', label: 'Border' },
	{ token: 'text-heading', label: 'Heading' },
	{ token: 'text-body', label: 'Body' },
	{ token: 'text-secondary', label: 'Secondary' },
	{ token: 'text-muted', label: 'Muted' },
	{ token: 'accent', label: 'Accent' },
	{ token: 'accent-soft', label: 'Accent wash' },
	{ token: 'pass', label: 'Success' },
	{ token: 'warn', label: 'Warning' },
	{ token: 'fail', label: 'Error' },
];
type Override = { light?: string; dark?: string };
const LD_RE = /^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i;
// Split a derived token into its light & dark sides (a plain value is both).
function sides(v: unknown): { light: string; dark: string } {
	const m = String(v ?? '').match(LD_RE);
	if (m) return { light: m[1].trim(), dark: m[2].trim() };
	const s = String(v ?? '');
	return { light: s, dark: s };
}
// Layer the per-side overrides back onto a freshly-derived map, PRESERVING each
// token's shape: a light-dark() pair stays a pair (per-side override); a single
// value stays single (the viz band has mode-independent tokens like cat-N-fill,
// which must not silently become light-dark()).
function applyOverrides(map: Record<string, unknown>, overrides: Record<string, Override>): Record<string, unknown> {
	const out = { ...map };
	for (const [token, ov] of Object.entries(overrides)) {
		if (ov.light == null && ov.dark == null) continue;
		const raw = String(out[token] ?? '');
		if (LD_RE.test(raw)) {
			const cur = sides(raw);
			out[token] = `light-dark(${ov.light ?? cur.light}, ${ov.dark ?? cur.dark})`;
		} else {
			// Single-value token — only the light override is meaningful.
			out[token] = ov.light ?? raw;
		}
	}
	return out;
}

// Is a token mode-independent (single value, edited with one well)? The viz band
// mixes light-dark() pairs (chart series, diagram line, chart states) with single
// values (categorical fills/marks, diagram stroke/critical).
function isSingle(v: unknown): boolean {
	return !LD_RE.test(String(v ?? ''));
}

// THE DATA-VIZ BAND — the categorical colours charts + Mermaid cycle through,
// hue-rotated off the accent and AA-repaired. Surfaced + editable via the live
// canvas (Iteration 2): three previews + a docked tray. (#G3b)
const SERIES_TOKENS = Array.from({ length: 8 }, (_, i) => `chart-cat${i + 1}`);
const CAT_TOKENS = Array.from({ length: 12 }, (_, i) => i + 1); // → cat-N-fill / cat-N-mark
const DIAGRAM_TOKENS: { token: string; label: string }[] = [
	{ token: 'diagram-stroke', label: 'Diagram fill' },
	{ token: 'diagram-line', label: 'Diagram line' },
	{ token: 'diagram-critical', label: 'Critical edge' },
	{ token: 'chart-state-info', label: 'Chart · info' },
	{ token: 'chart-state-mute', label: 'Chart · muted' },
];
// Friendly label for any band token (the tray's selection caption).
function bandLabel(token: string): string {
	const s = token.match(/^chart-cat(\d+)$/);
	if (s) return `Series ${s[1]}`;
	const cf = token.match(/^cat-(\d+)-fill$/);
	if (cf) return `Categorical ${cf[1]} · fill`;
	const cm = token.match(/^cat-(\d+)-mark$/);
	if (cm) return `Categorical ${cm[1]} · mark`;
	return DIAGRAM_TOKENS.find((d) => d.token === token)?.label ?? token;
}

// Live specimens for the canvas — a slide (contract roles), a pie chart (the
// chart series band) and a Mermaid flow (categorical + diagram band).
const CHART_SPECIMEN = '<!-- _class: piechart -->\n\n`Charts · live band`\n\n## Revenue by segment\n\n- Segment A `20%`\n- Segment B `16%`\n- Segment C `14%`\n- Segment D `12%`\n- Segment E `11%`\n- Segment F `10%`\n- Segment G `9%`\n- Segment H `8%`';
const DIAGRAM_SPECIMEN = '<!-- _class: diagram -->\n\n`Diagrams · live band`\n\n## Flow\n\n```mermaid\nflowchart LR\n  A[Plan] --> B[Build] --> C[Review] --> D[Ship]\n  D -.risk.-> B\n```';
// The native color input needs a #rrggbb seed; the swatch background shows the
// real value (which is always 6-digit hex for a CONTRACT token).
const normalizeHex = (v: string) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : '#000000');

export function Fabricate({ options, onClose, notify, onSaved }: { options: SingleSlideOptions; onClose: () => void; notify: (msg: string) => void; onSaved?: () => void }) {
	const [tab, setTab] = React.useState<'theme' | 'layout'>('theme');
	// All ten essentials in state, seeded from the first curated starter.
	const [core, setCore] = React.useState<Record<EssKey, string>>(() => ({ ...(STARTERS[0].essentials as Record<EssKey, string>) }));
	// No magic name up front — you name the theme, like the Component studio (#57).
	const [label, setLabel] = React.useState('');
	const [specimenMode, setSpecimenMode] = React.useState<'light' | 'dark'>('light');
	const [saving, setSaving] = React.useState(false);
	// Per-side overrides pinned on top of the derivation (#48/#49).
	const [overrides, setOverrides] = React.useState<Record<string, Override>>({});
	// The band token the live-canvas tray is editing (#G3b).
	const [selToken, setSelToken] = React.useState('chart-cat1');
	const accent = core.accent;
	const setHex = (key: EssKey, hex: string) => setCore((c) => ({ ...c, [key]: hex }));
	const setOverride = (token: string, side: 'light' | 'dark', hex: string) => setOverrides((o) => ({ ...o, [token]: { ...o[token], [side]: hex } }));
	const clearOverride = (token: string) => setOverrides((o) => { const n = { ...o }; delete n[token]; return n; });

	// Derive the full token map from the ten picked essentials, then layer any
	// per-side contract overrides — REAL, every render.
	const derived = React.useMemo(() => {
		const essentials = { ...core };
		try {
			validateEssentials(essentials);
			const map = applyOverrides(deriveTheme(essentials), overrides);
			const audit = auditBoth(map, { level: 'full' });
			const name = `fab-${hash(JSON.stringify({ essentials, overrides }))}`;
			const css = serializeTheme(map, { name, label });
			return { map, audit, name, css, error: null as string | null };
		} catch (e) {
			return { map: {} as Record<string, unknown>, audit: { light: { results: [] }, dark: { results: [] }, ok: false }, name: 'indaco', css: '', error: String((e as Error)?.message || e) };
		}
	}, [core, overrides, label]);

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

	const fileSlug = slugify(label) || derived.name;
	async function saveToLibrary() {
		if (saving || !derived.css) return;
		setSaving(true);
		try {
			// Re-serialize under the FINAL library slug so the CSS's `@theme <name>`
			// matches the stored record name. The live specimen uses a stable content-
			// hash name (no churn while you type); the SAVED theme must instead carry
			// the slug the library keys on, or the engine registers it under the css's
			// name and `render(md, <recordName>)` finds no theme (a blank render).
			const finalLabel = label.trim() || 'Untitled theme';
			const name = slugify(finalLabel) || derived.name;
			const css = serializeTheme(derived.map, { name, label: finalLabel });
			const t = await saveStudioTheme({ name, label: finalLabel, essentials: core, css });
			notify(`Saved “${t.label}” to your theme library — pick it from Look.`);
			onSaved?.();
		} catch {
			notify('Could not save — your browser may block storage (private mode?).');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex h-[50px] shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
				<button type="button" onClick={onClose} className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Back to Compose"><X className="size-4" /></button>
				<span className="size-2 shrink-0 rounded-full" style={{ background: accent }} />
				{tab === 'theme' ? (
					<>
						<input value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Theme name" placeholder="Name your theme" spellCheck={false} className="min-w-0 max-w-[180px] flex-shrink rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-[var(--text-heading)] outline-none placeholder:font-normal placeholder:text-muted-foreground hover:border-border focus:border-[var(--accent)]" />
						<span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">draft theme</span>
					</>
				) : (
					<span className="truncate text-sm font-semibold text-[var(--text-heading)]">Component Studio</span>
				)}
				<div className="ml-1 inline-flex shrink-0 rounded-[10px] border border-border bg-background p-[3px] sm:ml-3">
					<button type="button" onClick={() => setTab('theme')} aria-pressed={tab === 'theme'} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-semibold sm:px-3', tab === 'theme' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><Palette className="size-3.5" />Theme</button>
					<button type="button" onClick={() => setTab('layout')} aria-pressed={tab === 'layout'} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-semibold sm:px-3', tab === 'layout' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><LayoutGrid className="size-3.5" />Component</button>
				</div>
				<div className="flex-1" />
				{tab === 'theme' && (
					<>
						<Button variant="outline" size="sm" className="shrink-0 gap-1.5 px-2 sm:px-3" onClick={() => { downloadText(`${fileSlug}.css`, derived.css || '/* theme */', 'text/css'); notify(`Exported ${fileSlug}.css — a real theme token set.`); }}><Download className="size-4" /><span className="hidden sm:inline">Export theme</span></Button>
						<Button size="sm" disabled={saving || !derived.css || !label.trim()} className="shrink-0 gap-1.5 px-2 sm:px-3" onClick={saveToLibrary}><Check className="size-4" /><span className="hidden sm:inline">{saving ? 'Saving…' : 'Save to library'}</span></Button>
					</>
				)}
			</div>

			{tab === 'theme' ? (
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:grid md:overflow-hidden md:[grid-template-columns:340px_1fr]">
				<aside className="shrink-0 border-b border-border md:overflow-y-auto md:border-r md:border-b-0">
					<div className="border-b border-border px-4 py-3.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Theme Studio</div>
							<Section icon={<Sparkles className="size-3.5" />} label="Start from a curated palette">
								<div className="flex flex-wrap gap-2">
									{STARTERS.map((s) => {
										const e = s.essentials as Record<string, string>;
										const active = core.bg === e.bg && core.accent === e.accent;
										return (
											<button type="button" key={s.name} onClick={() => { setCore({ ...(e as Record<EssKey, string>) }); setOverrides({}); }} title={s.description} aria-label={`Start from ${s.label}`} className={cn('flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left', active ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]')}>
												<span className="flex -space-x-1">
													<span className="size-4 rounded-full border border-border" style={{ background: e.bg }} />
													<span className="size-4 rounded-full border border-border" style={{ background: e.accent }} />
													<span className="size-4 rounded-full border border-border" style={{ background: e.textHeading }} />
												</span>
												<span className="text-[12px] font-semibold text-[var(--text-heading)]">{s.label}</span>
											</button>
										);
									})}
								</div>
							</Section>
							<Section icon={<Palette className="size-3.5" />} label="Core colors — you pick all 10">
								{GROUPS.map((g) => (
									<div key={g} className="mb-2.5 last:mb-0">
										<div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{g}</div>
										{ESSENTIALS.filter((c) => c.group === g).map((c) => (
											<div key={c.key} className="my-1.5 flex items-center gap-3">
												<label className="relative size-[28px] cursor-pointer rounded-lg border border-border" style={{ background: core[c.key] }} aria-label={`${c.label} color`}>
													<input type="color" value={core[c.key]} onChange={(e) => setHex(c.key, e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
												</label>
												<span className="flex-1 text-[12.5px] font-semibold text-[var(--text-heading)]">{c.label}</span>
												<span className="rounded-md border border-border px-2 py-0.5 font-mono text-[12px] uppercase text-muted-foreground">{core[c.key]}</span>
											</div>
										))}
									</div>
								))}
							</Section>
							<Section icon={<Sparkles className="size-3.5" />} label="Engine contract — light & dark">
								<p className="mb-2.5 text-[11.5px] leading-snug text-muted-foreground">You curate the light side; the engine derives an AA-safe dark variant. Click any well to override either side — the audit re-checks your edit.</p>
									<div className="mb-1.5 grid grid-cols-[1fr_auto_auto] items-center gap-x-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
										<span>Role</span>
										<span className="flex items-center gap-1 justify-self-center"><Sun className="size-3" />Light</span>
										<span className="flex items-center gap-1 justify-self-center"><Moon className="size-3" />Dark</span>
									</div>
									{CONTRACT.map((c) => {
										const s = sides(derived.map[c.token]);
										const ov = overrides[c.token];
										const overridden = ov?.light != null || ov?.dark != null;
										return (
											<div key={c.token} className="my-1 grid grid-cols-[1fr_auto_auto] items-center gap-x-2.5">
												<span className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-[var(--text-heading)]">
													<span className="truncate">{c.label}</span>
													{overridden && <button type="button" onClick={() => clearOverride(c.token)} aria-label={`Reset ${c.label}`} title="Reset to engine-derived" className="shrink-0 text-muted-foreground hover:text-[var(--accent)]"><RotateCcw className="size-3" /></button>}
												</span>
												<Well label={`${c.label} light`} value={s.light} overridden={ov?.light != null} live={specimenMode === 'light'} onChange={(hex) => setOverride(c.token, 'light', hex)} />
												<Well label={`${c.label} dark`} value={s.dark} overridden={ov?.dark != null} live={specimenMode === 'dark'} onChange={(hex) => setOverride(c.token, 'dark', hex)} />
											</div>
										);
									})}
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
				</aside>
				<div className="flex min-w-0 flex-col gap-4 bg-card p-4 md:overflow-y-auto md:p-6">
					<div className="flex items-center justify-between gap-3">
						<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Live specimen — slide · chart · diagram</span>
						{/* Audition the SAME derived theme in light or dark — the derivation
						    emits light-dark() pairs, so flipping the canvas color-scheme
						    (modeOverride) resolves the chosen side. */}
						<div className="inline-flex shrink-0 rounded-lg border border-border bg-background p-[3px]">
							<button type="button" onClick={() => setSpecimenMode('light')} aria-pressed={specimenMode === 'light'} aria-label="Light specimen" className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold', specimenMode === 'light' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><Sun className="size-3.5" />Light</button>
							<button type="button" onClick={() => setSpecimenMode('dark')} aria-pressed={specimenMode === 'dark'} aria-label="Dark specimen" className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold', specimenMode === 'dark' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><Moon className="size-3.5" />Dark</button>
						</div>
					</div>
					{/* The three live previews — every override re-renders all three so you
					    see a band colour take effect on the slide, the chart and Mermaid. */}
					<div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
						{[
							{ label: 'Slide', sample: SPECIMEN, mermaid: false, aria: 'Theme specimen' },
							{ label: 'Chart', sample: CHART_SPECIMEN, mermaid: false, aria: 'Chart specimen' },
							{ label: 'Diagram', sample: DIAGRAM_SPECIMEN, mermaid: true, aria: 'Diagram specimen' },
						].map((p) => (
							<div key={p.label} className="flex min-w-0 flex-col gap-1.5">
								<span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">{p.label}</span>
								<DeckPreview options={options} sample={p.sample} mermaid={p.mermaid} paletteOverride={derived.name} extraTheme={derived.css ? { name: derived.name, css: derived.css } : undefined} modeOverride={specimenMode} debounceMs={140} className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-background shadow-[0_6px_18px_rgba(10,22,40,.10)]" aria-label={p.aria} />
							</div>
						))}
					</div>
					{/* The docked band tray — select a token from the strip, edit its
					    light/dark here; the audit re-checks and the previews re-render. */}
					<BandTray map={derived.map} overrides={overrides} mode={specimenMode} selToken={selToken} onSelect={setSelToken} onOverride={setOverride} onReset={clearOverride} />
				</div>
			</div>
			) : (
				<LayoutStudio options={options} notify={notify} onSaved={onSaved} />
			)}
		</div>
	);
}

// One editable color well — clicking opens the native picker; an override is
// ringed in accent, and the side that matches the live specimen mode is haloed.
function Well({ label, value, overridden, live, onChange }: { label: string; value: string; overridden: boolean; live: boolean; onChange: (hex: string) => void }) {
	return (
		<label className={cn('relative block size-[26px] cursor-pointer justify-self-center rounded-md border', overridden ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : live ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border))]' : 'border-border')} style={{ background: value }} title={`${label}: ${value}`}>
			<input type="color" value={normalizeHex(value)} onChange={(e) => onChange(e.target.value)} aria-label={label} className="absolute inset-0 size-full cursor-pointer opacity-0" />
		</label>
	);
}

// One jump-target chip in the band strip — its colour is the live-mode value;
// selecting it loads the token into the tray editor.
function BandChip({ token, color, selected, overridden, onPick }: { token: string; color: string; selected: boolean; overridden: boolean; onPick: (t: string) => void }) {
	return (
		<button
			type="button"
			onClick={() => onPick(token)}
			aria-label={bandLabel(token)}
			aria-pressed={selected}
			title={`${bandLabel(token)} — --${token}`}
			className={cn('h-5 min-w-0 flex-1 rounded border', selected ? 'border-transparent ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg)]' : overridden ? 'border-[var(--accent)]' : 'border-[color-mix(in_srgb,var(--text-heading)_12%,transparent)]')}
			style={{ background: color }}
		/>
	);
}

function StripRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-2">
			<span className="w-[68px] shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</span>
			<div className="flex min-w-0 flex-1 gap-1">{children}</div>
		</div>
	);
}

// The docked editor for the data-viz band (Iteration 2): the selected token's
// light/dark wells up top, then the whole band as click-to-select strips. The
// chip colours track the live specimen mode so the strip mirrors the canvas.
function BandTray({ map, overrides, mode, selToken, onSelect, onOverride, onReset }: {
	map: Record<string, unknown>;
	overrides: Record<string, Override>;
	mode: 'light' | 'dark';
	selToken: string;
	onSelect: (t: string) => void;
	onOverride: (token: string, side: 'light' | 'dark', hex: string) => void;
	onReset: (token: string) => void;
}) {
	const selSides = sides(map[selToken]);
	const single = isSingle(map[selToken]);
	const ov = overrides[selToken];
	const overridden = ov?.light != null || ov?.dark != null;
	const repr = (token: string) => sides(map[token])[mode];
	return (
		<div className="rounded-xl border border-border bg-background p-3">
			{/* selected token + its editable sides */}
			<div className="flex items-center gap-3">
				<span className="size-10 shrink-0 rounded-lg border border-border" style={{ background: single ? selSides.light : selSides[mode] }} />
				<div className="min-w-0 flex-1">
					<div className="truncate text-[13px] font-semibold text-[var(--text-heading)]">{bandLabel(selToken)}</div>
					<div className="font-mono text-[10px] text-muted-foreground">--{selToken}{single ? ' · both modes' : ''}</div>
				</div>
				<div className="flex items-center gap-2.5">
					{single ? (
						<div className="flex flex-col items-center gap-1"><Well label={`${bandLabel(selToken)} value`} value={selSides.light} overridden={ov?.light != null} live onChange={(hex) => onOverride(selToken, 'light', hex)} /><span className="font-mono text-[9px] uppercase text-muted-foreground/80">Value</span></div>
					) : (
						<>
							<div className="flex flex-col items-center gap-1"><Well label={`${bandLabel(selToken)} light`} value={selSides.light} overridden={ov?.light != null} live={mode === 'light'} onChange={(hex) => onOverride(selToken, 'light', hex)} /><span className="font-mono text-[9px] uppercase text-muted-foreground/80">Light</span></div>
							<div className="flex flex-col items-center gap-1"><Well label={`${bandLabel(selToken)} dark`} value={selSides.dark} overridden={ov?.dark != null} live={mode === 'dark'} onChange={(hex) => onOverride(selToken, 'dark', hex)} /><span className="font-mono text-[9px] uppercase text-muted-foreground/80">Dark</span></div>
						</>
					)}
					<button type="button" onClick={() => onReset(selToken)} disabled={!overridden} aria-label={`Reset ${bandLabel(selToken)}`} title="Reset to engine-derived" className={cn('shrink-0 self-start p-1', overridden ? 'text-muted-foreground hover:text-[var(--accent)]' : 'cursor-not-allowed text-muted-foreground/30')}><RotateCcw className="size-3.5" /></button>
				</div>
			</div>
			{/* the whole band as click-to-select strips */}
			<div className="mt-3 space-y-1.5 border-t border-border pt-3">
				<StripRow label="Series">
					{SERIES_TOKENS.map((t) => <BandChip key={t} token={t} color={repr(t)} selected={selToken === t} overridden={overrides[t] != null} onPick={onSelect} />)}
				</StripRow>
				<StripRow label="Cat · fill">
					{CAT_TOKENS.map((i) => { const t = `cat-${i}-fill`; return <BandChip key={t} token={t} color={repr(t)} selected={selToken === t} overridden={overrides[t] != null} onPick={onSelect} />; })}
				</StripRow>
				<StripRow label="Cat · mark">
					{CAT_TOKENS.map((i) => { const t = `cat-${i}-mark`; return <BandChip key={t} token={t} color={repr(t)} selected={selToken === t} overridden={overrides[t] != null} onPick={onSelect} />; })}
				</StripRow>
				<StripRow label="Diagram">
					{DIAGRAM_TOKENS.map((d) => <BandChip key={d.token} token={d.token} color={repr(d.token)} selected={selToken === d.token} overridden={overrides[d.token] != null} onPick={onSelect} />)}
				</StripRow>
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
