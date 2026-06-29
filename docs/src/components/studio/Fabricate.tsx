import { ArrowUp, Check, ChevronRight, Download, LayoutGrid, Loader2, Moon, Palette, RotateCcw, Search, Sparkles, Sun, TriangleAlert, X } from 'lucide-react';
import * as React from 'react';
import DeckPreview from '@/components/DeckPreview';
import { Button } from '@/components/ui/button';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';
// The REAL theme engine — same maths as the Node tooling + the WCAG gate
// (lib/theme/*, bundled browser-safe). deriveTheme → ~80 tokens (contrast-
// repaired), auditBoth → live WCAG report, serializeTheme → a real themes/*.css.
import { auditBoth, contrastRatio, deriveTheme, STARTERS, serializeTheme, validateEssentials } from '@/playground/theme-core.generated.js';
import { generateTheme } from './architect';
import { downloadText } from './download';
import { LayoutStudio } from './LayoutStudio';
import { saveStudioTheme, slugify } from './theme-library';

// You pick ALL TEN essentials — the same set the engine derivation + the
// Workbench Theme Studio take (theme-core ESSENTIAL_KEYS). The derivation
// contrast-repairs everything else (~80 tokens) from these. Grouped for the
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
const SPECIMEN = '<!-- _class: kpi -->\n\n`Theme · live specimen`\n\n## Your theme, derived & audited\n\n1. 100\n   - Tokens derived\n2. AA\n   - Contrast floor\n3. 10\n   - Colors you picked';

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

// The human-facing contract: the derived roles a theme author actually curates,
// each a light-dark() pair. Editing a side PINS an override on top of the engine
// derivation (the audit re-runs against the override, so a contrast-breaking edit
// surfaces immediately). This is where light vs dark is curated. (#48 / #49.)
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
// hue-rotated off the accent and AA-repaired. Surfaced as click-to-select strips
// in the token tree; edited in the inspector. (#G3b)
const SERIES_TOKENS = Array.from({ length: 8 }, (_, i) => `chart-cat${i + 1}`);
const CAT_TOKENS = Array.from({ length: 12 }, (_, i) => i + 1); // → cat-N-fill / cat-N-mark
const DIAGRAM_TOKENS: { token: string; label: string }[] = [
	{ token: 'diagram-stroke', label: 'Diagram fill' },
	{ token: 'diagram-line', label: 'Diagram line' },
	{ token: 'diagram-critical', label: 'Critical edge' },
	{ token: 'chart-state-info', label: 'Chart · info' },
	{ token: 'chart-state-mute', label: 'Chart · muted' },
];
// Friendly label for any band token (the inspector's caption).
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

// Pro Inspector selection — ONE selected token drives the right-hand inspector.
// An ESSENTIAL edits the picked input (core); a DERIVED token edits an override.
type Selected = { scope: 'essential'; id: EssKey } | { scope: 'derived'; id: string };
// Each essential feeds one derived contract token — the inspector reports that
// token's live contrast, so selecting an essential still shows its WCAG.
const ESS_TOKEN: Record<EssKey, string> = { bg: 'bg', bgAlt: 'bg-alt', textHeading: 'text-heading', textBody: 'text-body', textMuted: 'text-muted', accent: 'accent', accentSoft: 'accent-soft', pass: 'pass', warn: 'warn', fail: 'fail' };
const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);
// Only FOREGROUND roles (ink / brand / signals) have an on-background AA target;
// surfaces (bg, bg-alt, border, accent wash) and the decorative muted ink are
// WCAG-exempt — so we never stamp them pass/FAIL against the canvas (it would be
// a meaningless, alarming "fail" for a colour that is itself a background).
const INK_TOKENS = new Set(['text-heading', 'text-body', 'text-secondary', 'accent', 'pass', 'warn', 'fail']);
const readsOnBg = (tokenId: string) => INK_TOKENS.has(tokenId);
// Contrast of a token's resolved side vs the page background, per mode — null when
// either resolves to a non-hex (a var()/color-mix reference we don't expand here).
function ratioVsBg(map: Record<string, unknown>, tokenId: string, mode: 'light' | 'dark'): number | null {
	const tv = sides(map[tokenId])[mode];
	const bv = sides(map.bg)[mode];
	return isHex(tv) && isHex(bv) ? contrastRatio(tv, bv) : null;
}
const contractLabelOf = (id: string) => CONTRACT.find((c) => c.token === id)?.label;
// Friendly label for any token id (contract role → band token → raw).
const tokenLabel = (id: string) => contractLabelOf(id) ?? bandLabel(id);
const tierOf = (ratio: number | null, ok: boolean) => ((ratio ?? 0) >= 7 ? 'AAA' : ok ? 'AA' : 'FAIL');

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
	// Pro Inspector: the one selected token (left tree → right inspector), a tree
	// search filter, and which tree groups are collapsed.
	const [selected, setSelected] = React.useState<Selected>({ scope: 'essential', id: 'accent' });
	const [query, setQuery] = React.useState('');
	const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
	const toggleGroup = (g: string) => setCollapsed((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; });
	// AI "Describe a look": the model proposes essentials + a ramp strategy; the
	// engine derives the full AA-clean palette. The strategy steers the
	// categorical/chart hue layout (theme-core RAMP_STRATEGIES).
	const [rampStrategy, setRampStrategy] = React.useState('spectrum');
	const [prompt, setPrompt] = React.useState('');
	const [gen, setGen] = React.useState<'idle' | 'working'>('idle');
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
			const map = applyOverrides(deriveTheme(essentials, { rampStrategy }), overrides);
			const audit = auditBoth(map, { level: 'full' });
			const name = `fab-${hash(JSON.stringify({ essentials, overrides, rampStrategy }))}`;
			const css = serializeTheme(map, { name, label });
			return { map, audit, name, css, error: null as string | null };
		} catch (e) {
			return { map: {} as Record<string, unknown>, audit: { light: { results: [] }, dark: { results: [] }, ok: false }, name: 'indaco', css: '', error: String((e as Error)?.message || e) };
		}
	}, [core, overrides, label, rampStrategy]);

	// Curated WCAG rows: one per role, worst ratio across modes.
	const auditRows = React.useMemo(() => {
		const byRole = new Map<string, { role: string; ratio: number | null; status: string }>();
		for (const mode of ['light', 'dark'] as const) {
			for (const r of derived.audit[mode]?.results ?? []) {
				const prev = byRole.get(r.role);
				if (!prev || (r.ratio ?? 99) < (prev.ratio ?? 99)) byRole.set(r.role, { role: r.role, ratio: r.ratio, status: r.status });
			}
		}
		return [...byRole.values()].filter((r) => r.status === 'pass' || r.status === 'fail').slice(0, 6);
	}, [derived.audit]);

	// "Describe a look" → the model proposes essentials + a ramp strategy, the
	// engine derives the full AA-clean palette, and the studio adopts it (clearing
	// manual overrides so the AI's set shows cleanly). Honest degradation: a clear
	// note for no-model / budget-blocked / no-usable-reply — never a faked palette.
	async function runDescribe(text: string) {
		const p = text.trim();
		if (!p || gen === 'working') return;
		setGen('working');
		try {
			const out = await generateTheme(core, p);
			if (out.status === 'ok') {
				setCore(out.essentials as Record<EssKey, string>);
				setRampStrategy(out.rampStrategy);
				setOverrides({});
				setPrompt('');
				notify(out.audit.ok ? 'Generated a full palette — every pair passes AA. Tweaking is optional.' : 'Generated a palette — a couple of pairs need review (flagged in the audit).');
			} else if (out.status === 'offline') {
				notify('No model connected — open Workspace to connect OpenRouter or load an on-device model.');
			} else if (out.status === 'blocked') {
				notify(out.note);
			} else {
				notify(out.note || 'No change proposed.');
			}
		} catch {
			notify('Theme generation failed — please try again.');
		} finally {
			setGen('idle');
		}
	}

	const fileSlug = slugify(label) || derived.name;
	async function saveToLibrary() {
		if (saving || !derived.css) return;
		setSaving(true);
		try {
			// Re-serialize under the FINAL library slug so the CSS's `@theme <name>`
			// matches the stored record name (the live specimen uses a stable content-
			// hash name to avoid churn while you type).
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

	const q = query.trim().toLowerCase();
	const startTheme = (e: Record<string, string>) => { setCore({ ...(e as Record<EssKey, string>) }); setOverrides({}); setRampStrategy('spectrum'); };

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
			<div className="flex min-h-0 flex-1 flex-col">
				{/* AI front door — "Describe a look". The model proposes the 10 essentials
				    + a ramp strategy; the engine derives the full, AA-verified palette
				    shown live below. You never have to tweak a color — the wells are optional. */}
				<div className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-4 py-2.5">
					<div className="flex items-center gap-2.5 rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] bg-background px-3 py-2">
						<Sparkles className="size-4 shrink-0 text-[var(--accent)]" />
						<input
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') runDescribe(prompt); }}
							disabled={gen === 'working'}
							placeholder="Describe a look — e.g. “warm editorial, deep navy accent, confident”"
							aria-label="Describe a look"
							className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-heading)] outline-none placeholder:text-muted-foreground disabled:opacity-60"
						/>
						<button type="button" onClick={() => runDescribe(prompt)} disabled={gen === 'working' || !prompt.trim()} aria-label="Generate theme" className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--accent)] text-[var(--on-accent,#fff)] disabled:opacity-40">
							{gen === 'working' ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
						</button>
					</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Refine</span>
						{['Warmer', 'More corporate', 'Higher contrast', 'Calmer accent'].map((c) => (
							<button key={c} type="button" onClick={() => runDescribe(c)} disabled={gen === 'working'} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground hover:border-[var(--accent)] hover:text-[var(--text-heading)] disabled:opacity-40">{c}</button>
						))}
						<span className="ml-auto font-mono text-[10px] text-muted-foreground/70" title="Categorical hue layout the AI chose">ramp: {rampStrategy}</span>
					</div>
				</div>

				{/* The Pro Inspector — left token tree · center live canvas · right per-token
				    inspector. Stacks below lg; a real 3-column workbench at desktop. */}
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:overflow-hidden lg:[grid-template-columns:296px_1fr_330px]">

					{/* LEFT — searchable token tree */}
					<aside className="shrink-0 border-b border-border bg-card lg:overflow-y-auto lg:border-r lg:border-b-0">
						<div className="sticky top-0 z-[1] border-b border-border bg-card px-3 py-2.5">
							<div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
								<Search className="size-3.5 shrink-0 text-muted-foreground" />
								<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tokens…" aria-label="Search tokens" className="min-w-0 flex-1 bg-transparent text-[12.5px] text-[var(--text-heading)] outline-none placeholder:text-muted-foreground" />
							</div>
						</div>
						<div className="px-2 py-2">
							{/* Essentials */}
							<TreeGroup name="Essentials" count={10} collapsed={collapsed.has('Essentials')} onToggle={() => toggleGroup('Essentials')}>
								{ESSENTIALS.filter((c) => !q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)).map((c) => {
									const t = ESS_TOKEN[c.key];
									const ratio = readsOnBg(t) ? ratioVsBg(derived.map, t, specimenMode) : null;
									const tag = ratio == null ? undefined : tierOf(ratio, ratio >= 4.5);
									return <TreeRow key={c.key} label={c.label} swatch={core[c.key]} tag={tag} selected={selected.scope === 'essential' && selected.id === c.key} onClick={() => setSelected({ scope: 'essential', id: c.key })} />;
								})}
							</TreeGroup>
							{/* Contract */}
							<TreeGroup name="Contract · 12 roles" count={12} collapsed={collapsed.has('Contract')} onToggle={() => toggleGroup('Contract')}>
								{CONTRACT.filter((c) => !q || c.label.toLowerCase().includes(q) || c.token.toLowerCase().includes(q)).map((c) => {
									const s = sides(derived.map[c.token]);
									const ratio = readsOnBg(c.token) ? ratioVsBg(derived.map, c.token, specimenMode) : null;
									const tag = ratio == null ? undefined : tierOf(ratio, ratio >= 4.5);
									return <TreeRow key={c.token} label={c.label} dual={s} tag={tag} overridden={overrides[c.token] != null} selected={selected.scope === 'derived' && selected.id === c.token} onClick={() => setSelected({ scope: 'derived', id: c.token })} />;
								})}
							</TreeGroup>
							{/* Data-viz band — click-to-select strips */}
							<TreeGroup name="Data-viz band" count={37} collapsed={collapsed.has('Band')} onToggle={() => toggleGroup('Band')}>
								<BandStrips map={derived.map} overrides={overrides} mode={specimenMode} selId={selected.scope === 'derived' ? selected.id : ''} onPick={(t) => setSelected({ scope: 'derived', id: t })} />
							</TreeGroup>
							{/* Starters */}
							<TreeGroup name="Starter palettes" count={STARTERS.length} collapsed={collapsed.has('Starters')} onToggle={() => toggleGroup('Starters')}>
								<div className="flex flex-col gap-1 px-1 pb-1">
									{STARTERS.map((s) => {
										const e = s.essentials as Record<string, string>;
										const active = core.bg === e.bg && core.accent === e.accent;
										return (
											<button type="button" key={s.name} onClick={() => startTheme(e)} title={s.description} aria-label={`Start from ${s.label}`} className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left', active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]')}>
												<span className="flex overflow-hidden rounded border border-border">
													<span className="size-3.5" style={{ background: e.accent }} />
													<span className="size-3.5" style={{ background: e.textHeading }} />
													<span className="size-3.5" style={{ background: e.bg }} />
												</span>
												<span className="text-[12px] font-semibold text-[var(--text-heading)]">{s.label}</span>
											</button>
										);
									})}
								</div>
							</TreeGroup>
						</div>
					</aside>

					{/* CENTER — live canvas */}
					<div className="flex min-w-0 flex-col gap-4 bg-[color-mix(in_srgb,var(--bg)_55%,var(--bg-alt))] p-4 lg:overflow-y-auto lg:p-6">
						<div className="flex items-center justify-between gap-3">
							<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Live canvas — slide · chart · diagram</span>
							{/* Audition the SAME derived theme in light or dark — the derivation
							    emits light-dark() pairs, so flipping modeOverride resolves the side. */}
							<div className="inline-flex shrink-0 rounded-lg border border-border bg-background p-[3px]">
								<button type="button" onClick={() => setSpecimenMode('light')} aria-pressed={specimenMode === 'light'} aria-label="Light specimen" className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold', specimenMode === 'light' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><Sun className="size-3.5" />Light</button>
								<button type="button" onClick={() => setSpecimenMode('dark')} aria-pressed={specimenMode === 'dark'} aria-label="Dark specimen" className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold', specimenMode === 'dark' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><Moon className="size-3.5" />Dark</button>
							</div>
						</div>
						{/* The three live previews — every edit re-renders all three. */}
						<div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
							<div className="flex min-w-0 flex-col gap-1.5 xl:col-span-2">
								<span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">Slide</span>
								<DeckPreview options={options} sample={SPECIMEN} mermaid={false} paletteOverride={derived.name} extraTheme={derived.css ? { name: derived.name, css: derived.css } : undefined} modeOverride={specimenMode} debounceMs={140} className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-background shadow-[0_6px_18px_rgba(10,22,40,.10)]" aria-label="Theme specimen" />
							</div>
							{[
								{ label: 'Chart', sample: CHART_SPECIMEN, mermaid: false, aria: 'Chart specimen' },
								{ label: 'Diagram', sample: DIAGRAM_SPECIMEN, mermaid: true, aria: 'Diagram specimen' },
							].map((p) => (
								<div key={p.label} className="flex min-w-0 flex-col gap-1.5">
									<span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">{p.label}</span>
									<DeckPreview options={options} sample={p.sample} mermaid={p.mermaid} paletteOverride={derived.name} extraTheme={derived.css ? { name: derived.name, css: derived.css } : undefined} modeOverride={specimenMode} debounceMs={140} className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-background shadow-[0_6px_18px_rgba(10,22,40,.10)]" aria-label={p.aria} />
								</div>
							))}
						</div>
					</div>

					{/* RIGHT — per-token inspector + the WCAG audit */}
					<aside className="shrink-0 border-t border-border bg-card lg:overflow-y-auto lg:border-l lg:border-t-0">
						<Inspector selected={selected} core={core} map={derived.map} overrides={overrides} mode={specimenMode} onHex={setHex} onOverride={setOverride} onReset={clearOverride} />
						<AuditPanel rows={auditRows} ok={derived.audit.ok} />
					</aside>
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

// A split light/dark swatch for a contract row in the tree.
function DualSwatch({ light, dark }: { light: string; dark: string }) {
	return (
		<span className="flex size-[18px] shrink-0 overflow-hidden rounded border border-border">
			<span className="h-full w-1/2" style={{ background: light }} />
			<span className="h-full w-1/2" style={{ background: dark }} />
		</span>
	);
}

// A collapsible group in the token tree.
function TreeGroup({ name, count, collapsed, onToggle, children }: { name: string; count: number; collapsed: boolean; onToggle: () => void; children: React.ReactNode }) {
	return (
		<div className="mb-1">
			<button type="button" onClick={onToggle} aria-expanded={!collapsed} className="flex w-full items-center gap-2 rounded-md px-2 py-2 hover:bg-[color-mix(in_srgb,var(--accent)_7%,transparent)]">
				<ChevronRight className={cn('size-3 text-muted-foreground transition-transform', !collapsed && 'rotate-90')} />
				<span className="flex-1 text-left font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{name}</span>
				<span className="rounded-full bg-[color-mix(in_srgb,var(--text-heading)_8%,transparent)] px-1.5 py-px font-mono text-[10px] text-muted-foreground">{count}</span>
			</button>
			{!collapsed && <div className="pb-1">{children}</div>}
		</div>
	);
}

// One selectable row in the token tree — a single swatch (essential) or a split
// light/dark swatch (contract), with an optional contrast tag.
function TreeRow({ label, swatch, dual, tag, overridden, selected, onClick }: { label: string; swatch?: string; dual?: { light: string; dark: string }; tag?: string; overridden?: boolean; selected: boolean; onClick: () => void }) {
	const fail = tag === 'FAIL';
	return (
		<button type="button" onClick={onClick} aria-pressed={selected} className={cn('flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left', selected ? 'bg-[var(--accent-soft)] shadow-[inset_2px_0_0_var(--accent)]' : 'hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]')}>
			{dual ? <DualSwatch light={dual.light} dark={dual.dark} /> : <span className="size-[18px] shrink-0 rounded border border-border" style={{ background: swatch }} />}
			<span className="flex-1 truncate text-[12.5px] font-semibold text-[var(--text-heading)]">{label}</span>
			{overridden && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]" title="overridden" />}
			{tag && <span aria-hidden className={cn('rounded border px-1 py-px font-mono text-[9px] font-bold', fail ? 'border-[color-mix(in_srgb,var(--fail)_40%,transparent)] text-[var(--fail)]' : 'border-[color-mix(in_srgb,var(--pass)_35%,transparent)] text-[var(--pass)]')}>{tag}</span>}
		</button>
	);
}

// The data-viz band as click-to-select strips (Series / Cat fill / Cat mark /
// Diagram). The chip colour tracks the live specimen mode so it mirrors the canvas.
function BandStrips({ map, overrides, mode, selId, onPick }: { map: Record<string, unknown>; overrides: Record<string, Override>; mode: 'light' | 'dark'; selId: string; onPick: (t: string) => void }) {
	const repr = (token: string) => sides(map[token])[mode];
	return (
		<div className="space-y-1.5 px-1.5 pb-1.5">
			<StripRow label="Series">
				{SERIES_TOKENS.map((t) => <BandChip key={t} token={t} color={repr(t)} selected={selId === t} overridden={overrides[t] != null} onPick={onPick} />)}
			</StripRow>
			<StripRow label="Cat · fill">
				{CAT_TOKENS.map((i) => { const t = `cat-${i}-fill`; return <BandChip key={t} token={t} color={repr(t)} selected={selId === t} overridden={overrides[t] != null} onPick={onPick} />; })}
			</StripRow>
			<StripRow label="Cat · mark">
				{CAT_TOKENS.map((i) => { const t = `cat-${i}-mark`; return <BandChip key={t} token={t} color={repr(t)} selected={selId === t} overridden={overrides[t] != null} onPick={onPick} />; })}
			</StripRow>
			<StripRow label="Diagram">
				{DIAGRAM_TOKENS.map((d) => <BandChip key={d.token} token={d.token} color={repr(d.token)} selected={selId === d.token} overridden={overrides[d.token] != null} onPick={onPick} />)}
			</StripRow>
		</div>
	);
}

// One jump-target chip in a band strip — its colour is the live-mode value.
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
			<span className="w-[64px] shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">{label}</span>
			<div className="flex min-w-0 flex-1 gap-1">{children}</div>
		</div>
	);
}

// The per-token inspector (right column): the selected token's editable wells,
// the engine-derived note, and that token's live contrast vs the background in
// both canvas modes. An essential edits the picked input; a derived token pins an
// override (and shows a Reset). This is the V4 leap — per-token light/dark + WCAG.
function Inspector({ selected, core, map, overrides, mode, onHex, onOverride, onReset }: {
	selected: Selected;
	core: Record<EssKey, string>;
	map: Record<string, unknown>;
	overrides: Record<string, Override>;
	mode: 'light' | 'dark';
	onHex: (key: EssKey, hex: string) => void;
	onOverride: (token: string, side: 'light' | 'dark', hex: string) => void;
	onReset: (token: string) => void;
}) {
	const isEss = selected.scope === 'essential';
	// The token whose contrast we report (an essential maps to its contract token).
	const tokenId = isEss ? ESS_TOKEN[selected.id as EssKey] : selected.id;
	const name = isEss ? (ESSENTIALS.find((e) => e.key === selected.id)?.label ?? selected.id) : tokenLabel(selected.id);
	const single = isEss ? true : isSingle(map[selected.id]);
	const s = isEss ? { light: core[selected.id as EssKey], dark: core[selected.id as EssKey] } : sides(map[selected.id]);
	const ov = isEss ? undefined : overrides[selected.id];
	const overridden = !isEss && (ov?.light != null || ov?.dark != null);
	const rl = ratioVsBg(map, tokenId, 'light');
	const rd = ratioVsBg(map, tokenId, 'dark');
	const headSw = isEss ? core[selected.id as EssKey] : s[mode];
	return (
		<div className="border-b border-border">
			<div className="flex items-start gap-3 px-4 py-4">
				<span className="mt-0.5 size-7 shrink-0 rounded-lg border border-border" style={{ background: headSw }} />
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate text-[14px] font-bold text-[var(--text-heading)]">{name}</span>
						<span className="rounded border border-border px-1.5 py-px font-mono text-[9px] uppercase text-muted-foreground">{isEss ? 'essential' : single ? 'band' : 'contract'}</span>
					</div>
					<code className="font-mono text-[11px] text-muted-foreground">--{tokenId}</code>
				</div>
			</div>

			<div className="border-t border-border px-4 py-3.5">
				<div className="mb-2.5 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					<span>{isEss ? 'Picked color' : single ? 'Value' : 'Light & dark'}</span>
					{overridden && <button type="button" onClick={() => onReset(selected.id)} className="flex items-center gap-1 text-[10px] normal-case tracking-normal text-[var(--accent)]"><RotateCcw className="size-3" />Reset role</button>}
				</div>
				{isEss ? (
					<div className="flex items-center gap-2.5">
						<Well label={`${name}`} value={core[selected.id as EssKey]} overridden={false} live onChange={(hex) => onHex(selected.id as EssKey, hex)} />
						<code className="font-mono text-[12px] uppercase text-[var(--text-heading)]">{core[selected.id as EssKey]}</code>
						<span className="ml-auto font-mono text-[10px] text-muted-foreground">feeds --{tokenId}</span>
					</div>
				) : single ? (
					<div className="flex items-center gap-2.5">
						<Well label={`${name} value`} value={s.light} overridden={ov?.light != null} live onChange={(hex) => onOverride(selected.id, 'light', hex)} />
						<code className="font-mono text-[12px] uppercase text-[var(--text-heading)]">{s.light}</code>
						<span className="ml-auto font-mono text-[10px] text-muted-foreground">both modes</span>
					</div>
				) : (
					<div className="flex gap-5">
						<div className="flex flex-col items-center gap-1.5">
							<Well label={`${name} light`} value={s.light} overridden={ov?.light != null} live={mode === 'light'} onChange={(hex) => onOverride(selected.id, 'light', hex)} />
							<span className="flex items-center gap-1 font-mono text-[9px] uppercase text-muted-foreground"><Sun className="size-2.5" />Light</span>
						</div>
						<div className="flex flex-col items-center gap-1.5">
							<Well label={`${name} dark`} value={s.dark} overridden={ov?.dark != null} live={mode === 'dark'} onChange={(hex) => onOverride(selected.id, 'dark', hex)} />
							<span className="flex items-center gap-1 font-mono text-[9px] uppercase text-muted-foreground"><Moon className="size-2.5" />Dark</span>
						</div>
					</div>
				)}
			</div>

			{/* This token's live contrast vs the background, both modes — only for
			    foreground roles; surfaces/decorative tokens have no AA target. */}
			<div className="border-t border-border px-4 py-3.5">
				<div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contrast vs background</div>
				{readsOnBg(tokenId) ? (
					<>
						<PairRow icon={<Sun className="size-3" />} label="Light mode" ratio={rl} />
						<PairRow icon={<Moon className="size-3" />} label="Dark mode" ratio={rd} />
					</>
				) : (
					<p className="text-[11.5px] leading-snug text-muted-foreground">A surface / decorative token — it isn’t text on the canvas, so it has no AA contrast target. The audit checks the foreground roles that sit on it.</p>
				)}
			</div>
		</div>
	);
}

function PairRow({ icon, label, ratio }: { icon: React.ReactNode; label: string; ratio: number | null }) {
	const ok = (ratio ?? 0) >= 4.5;
	const tier = ratio == null ? '—' : tierOf(ratio, ok);
	const colour = ratio == null ? 'var(--text-muted)' : ok ? 'var(--pass)' : 'var(--fail)';
	return (
		<div className="my-1.5 flex items-center gap-2.5 text-[12px]">
			<span className="text-muted-foreground">{icon}</span>
			<span className="text-[var(--text-body)]">{label}</span>
			<span className="ml-auto font-mono text-[11px] text-muted-foreground">{ratio == null ? '—' : `${ratio.toFixed(1)} : 1`}</span>
			<span className="rounded-full border px-1.5 py-px font-mono text-[10px] font-bold" style={{ borderColor: `color-mix(in srgb, ${colour} 35%, transparent)`, color: colour }}>{tier}</span>
		</div>
	);
}

// The overall WCAG audit (right column, under the inspector) — the AI's delivered
// palette reads all-pass; a manual override that breaks a pair turns it red here.
function AuditPanel({ rows, ok }: { rows: { role: string; ratio: number | null; status: string }[]; ok: boolean }) {
	return (
		<div className="px-4 py-4">
			<div className="mb-2.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
				{ok ? <Check className="size-3.5 text-[var(--pass)]" /> : <TriangleAlert className="size-3.5 text-[var(--fail)]" />}
				<span>WCAG audit</span>
				<span className={cn('ml-auto normal-case tracking-normal', ok ? 'text-[var(--pass)]' : 'text-[var(--fail)]')}>{ok ? 'AA verified' : 'review'}</span>
			</div>
			{rows.map((r) => {
				const good = r.status === 'pass';
				const tier = tierOf(r.ratio, good);
				const colour = good ? 'var(--pass)' : 'var(--fail)';
				return (
					<div key={r.role} className="my-1.5 flex items-center gap-2.5 text-[12px] text-foreground">
						<span className="grid size-[18px] place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${colour} 16%, transparent)`, color: colour }}>{good ? <Check className="size-3" /> : <TriangleAlert className="size-3" />}</span>
						<span className="capitalize text-[var(--text-body)]">{r.role}</span>
						<span className="ml-auto font-mono text-[11px] text-muted-foreground">{r.ratio ? `${r.ratio.toFixed(1)} : 1` : '—'}</span>
						<span className="rounded-full border px-1.5 py-px font-mono text-[10px] font-bold" style={{ borderColor: `color-mix(in srgb, ${colour} 35%, transparent)`, color: colour }}>{tier}</span>
					</div>
				);
			})}
		</div>
	);
}
