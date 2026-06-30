import { ArrowUp, Check, Cloud, Download, FileDown, Loader2, Moon, Sparkles, Sun } from 'lucide-react';
import * as React from 'react';
import { DeckPreview } from '@/components/DeckPreview';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';
import { connectOpenRouter, generateFinish, useArchitectStatus } from './architect';
import { downloadText } from './download';
import {
	coerceRecipe,
	EDGE_TYPES,
	type FinishRecipe,
	generateFinishCss,
	MARK_TYPES,
	PLACEMENTS,
	type Placement,
	PRESET_RECIPES,
	safeFinishSlug,
	TEXTURE_TYPES,
	WASH_TYPES,
} from './finish-generate';
import { saveStudioFinish } from './finish-library';

// The Finish faculty — the third Fabricate workbench (beside Theme + Component),
// now a real RIGHT-PANEL DESIGNER that mirrors them: a live preview specimen in
// the center, the four-layer stack (Wash · Texture · Mark · Edge) as Inspector
// groups on the right, a "Start from preset" row, an AI "describe a finish"
// command bar at the top, and a name + Save + Export header. Every output is
// palette-blind, url()-free, export-safe — the deterministic generator
// (finish-generate.ts) makes the CSS from a structured recipe, so the AI proposes
// a recipe (never CSS) and no model text reaches the preview frame (HARD RULE #22).

// Friendly labels for the closed vocabulary.
const WASH_LABEL: Record<string, string> = { none: 'None', 'corner-glow': 'Corner glow', duotone: 'Duotone', spotlight: 'Spotlight', bands: 'Bands', mesh: 'Gradient mesh' };
const TEXTURE_LABEL: Record<string, string> = { none: 'None', grid: 'Grid', dots: 'Dots', hatch: 'Hatch', contour: 'Contour', rings: 'Rings', ruled: 'Ruled', pinstripe: 'Pinstripe', lattice: 'Lattice weave' };
const MARK_LABEL: Record<string, string> = { none: 'None', monogram: 'Monogram', tick: 'Registration tick', bar: 'Margin bar', numeral: 'Ghost numeral' };
const EDGE_LABEL: Record<string, string> = { none: 'None', vignette: 'Vignette', 'margin-rule': 'Margin rule', fold: 'Corner fold', frame: 'Inset frame' };
const PLACEMENT_LABEL: Record<Placement, string> = { 'top-left': 'Top left', 'top-right': 'Top right', 'bottom-left': 'Bottom left', 'bottom-right': 'Bottom right', center: 'Center', left: 'Left edge' };
const PRESETS = ['atrium', 'meridian', 'strata', 'halo', 'ledger', 'nimbus', 'loom', 'savile', 'gallery'] as const;
const PRESET_LABEL: Record<string, string> = { atrium: 'Atrium', meridian: 'Meridian', strata: 'Strata', halo: 'Halo', ledger: 'Ledger', nimbus: 'Nimbus', loom: 'Loom', savile: 'Savile', gallery: 'Gallery' };

// A stable preview class so the generated rule (section.finish.finish-<slug>) lands
// on the specimen section. The specimen carries `finish finish-preview` via _class.
const PREVIEW_SLUG = 'preview';
// The specimen, with the RICH (screen) face by default. With `exporting` on, the
// section ALSO carries `.lattice-exporting` — the same class the Studio raster export
// stamps — so the generated rule's opaque export face shows live (the flatter PDF/PPTX
// look the designer would otherwise never see until after export).
const specimen = (exporting: boolean) =>
	`<!-- _class: finish finish-${PREVIEW_SLUG}${exporting ? ' lattice-exporting' : ''} -->\n\n\`Finish · live preview\`\n\n## Your finish, behind real content\n\nThe layers stay faint so body text keeps its contrast — no scrim needed.\n\n- Palette-blind\n  - Recolors with the theme accent automatically.\n- Export-safe\n  - Pure CSS gradients — survives PDF and PPTX.`;

export function FinishStudio({
	options,
	notify,
	onSaved,
	onOpenWorkspace,
}: {
	options: SingleSlideOptions;
	notify: (msg: string) => void;
	onSaved?: () => void;
	onOpenWorkspace?: () => void;
}) {
	const [recipe, setRecipe] = React.useState<FinishRecipe>(() => coerceRecipe(PRESET_RECIPES.atrium));
	const [name, setName] = React.useState('');
	const [mode, setMode] = React.useState<'light' | 'dark'>('light');
	// "Export preview" — show the OPAQUE export face the PDF/PPTX bakes, not just the
	// rich on-screen face, so the designer sees the flatter look before they ship it.
	const [exporting, setExporting] = React.useState(false);
	const [prompt, setPrompt] = React.useState('');
	const [gen, setGen] = React.useState<'idle' | 'working'>('idle');
	const [saving, setSaving] = React.useState(false);
	const modelReady = useArchitectStatus().ready;

	// The generated CSS drives BOTH the live preview (targets finish-preview) and the
	// export/save (targets the named slug). Recompute as the recipe changes.
	const slug = safeFinishSlug(name) === 'custom' && !name.trim() ? 'custom' : safeFinishSlug(name);
	const previewCss = React.useMemo(() => generateFinishCss(PREVIEW_SLUG, recipe), [recipe]);
	const nameOk = !!name.trim() && /^[a-z][a-z0-9-]*$/.test(slug);

	// Mutators — each layer's controls write back through coerceRecipe so state can
	// never drift out of the closed vocabulary.
	const patch = (next: Partial<FinishRecipe>) => setRecipe((r) => coerceRecipe({ ...r, ...next }));
	const startFromPreset = (p: string) => { setRecipe(coerceRecipe(PRESET_RECIPES[p])); notify(`Started from ${PRESET_LABEL[p]} — tweak any layer.`); };

	const exportCss = () => {
		const cls = `finish finish-${slug}`;
		const css = generateFinishCss(slug, recipe);
		downloadText(
			`${slug}.finish.css`,
			`/* Lattice finish "${slug}" — apply per slide with <!-- _class: ${cls} --> or deck-wide with class: ${cls} */\n${css}\n`,
			'text/css',
		);
		notify(`Exported ${slug}.finish.css — apply with _class: ${cls}.`);
	};

	const save = async () => {
		if (!nameOk || saving) return;
		setSaving(true);
		try {
			const css = generateFinishCss(slug, recipe);
			const f = await saveStudioFinish({ name: slug, label: name.trim(), css, recipe });
			notify(`Saved "${f.label}" to your library — pick it from the Finish menu in the Inspector.`);
			onSaved?.();
		} catch {
			notify('Could not save — your browser may block storage (private mode?).');
		} finally {
			setSaving(false);
		}
	};

	async function runDescribe(text: string) {
		const p = text.trim();
		if (!p || gen === 'working') return;
		setGen('working');
		try {
			const out = await generateFinish(p);
			if (out.status === 'ok') {
				// Coerce to the closed vocab — the deterministic generator makes the CSS.
				setRecipe(coerceRecipe(out.recipe));
				if (out.name && !name.trim()) setName(safeFinishSlug(out.name));
				setPrompt('');
				notify('Generated a finish recipe — tune any layer, then Save or Export.');
			} else if (out.status === 'offline') {
				notify('No model connected — open Workspace to connect OpenRouter or load an on-device model.');
			} else if (out.status === 'blocked') {
				notify(out.note);
			} else {
				notify(out.note || 'No finish proposed.');
			}
		} catch {
			notify('Finish generation failed — please try again.');
		} finally {
			setGen('idle');
		}
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{/* Header — name + Export + Save (mirrors Fabricate's shared header shape). */}
			<div className="flex h-[50px] shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-4">
				<span className="size-2 shrink-0 rounded-full bg-[var(--accent)]" />
				<div className={cn('flex min-w-0 max-w-[220px] flex-shrink items-center rounded-md border bg-transparent px-1.5 py-0.5 focus-within:border-[var(--accent)]', name && !nameOk ? 'border-[color-mix(in_srgb,var(--fail,#b3261e)_55%,var(--border))]' : 'border-transparent hover:border-border')}>
					<span className="shrink-0 font-mono text-[13px] text-muted-foreground">finish-</span>
					<input
						value={name}
						onChange={(e) => setName(e.target.value)}
						aria-label="Finish name"
						placeholder="name-your-finish"
						spellCheck={false}
						className="min-w-0 flex-1 bg-transparent font-mono text-[13px] font-semibold text-[var(--text-heading)] outline-none placeholder:font-normal placeholder:text-muted-foreground"
					/>
				</div>
				<div className="flex-1" />
				<Button variant="outline" size="sm" className="shrink-0 gap-1.5 px-2 sm:px-3" onClick={exportCss}><Download className="size-4" /><span className="hidden sm:inline">Export</span></Button>
				<Button size="sm" disabled={!nameOk || saving} className="shrink-0 gap-1.5 px-2 sm:px-3" onClick={save}><Check className="size-4" /><span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span></Button>
			</div>

			{/* AI front door — "Describe a finish" (mirrors the Theme tab's command bar). */}
			<div className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-4 py-2.5">
				<div className={cn('flex items-center gap-2.5 rounded-[10px] border bg-background px-3 py-2', modelReady ? 'border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]' : 'border-dashed border-border')}>
					<Sparkles className={cn('size-4 shrink-0', modelReady ? 'text-[var(--accent)]' : 'text-muted-foreground')} />
					<input
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') runDescribe(prompt); }}
						disabled={gen === 'working' || !modelReady}
						placeholder="Describe a finish — e.g. “a calm blueprint grid with a soft corner glow”"
						aria-label="Describe a finish"
						className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-heading)] outline-none placeholder:text-muted-foreground disabled:opacity-60"
					/>
					{modelReady ? (
						<button type="button" onClick={() => runDescribe(prompt)} disabled={gen === 'working' || !prompt.trim()} aria-label="Generate finish" className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--accent)] text-[var(--on-accent,#fff)] disabled:opacity-40">
							{gen === 'working' ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
						</button>
					) : (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button type="button" aria-label="Connect a model" className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1 text-[12px] font-semibold text-[var(--on-accent,#fff)]"><Cloud className="size-3.5" />Connect</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-60">
								<DropdownMenuItem onSelect={() => { connectOpenRouter().catch(() => notify('Could not start the OpenRouter connect flow — try Workspace.')); }}><Cloud className="size-4" /><div><div className="font-semibold text-[var(--text-heading)]">Connect cloud</div><div className="text-[11px] text-muted-foreground">OpenRouter — best quality</div></div></DropdownMenuItem>
								<DropdownMenuItem onSelect={() => onOpenWorkspace?.()}><Sparkles className="size-4" /><div><div className="font-semibold text-[var(--text-heading)]">Use on-device</div><div className="text-[11px] text-muted-foreground">Runs locally, free — via Workspace</div></div></DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={() => onOpenWorkspace?.()}>Open Workspace…</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
				{!modelReady && <p className="text-[11px] leading-snug text-muted-foreground">Connect a model to describe a finish in words — or build the layer stack by hand on the right.</p>}
			</div>

			{/* Center preview · right layer-stack panel (stacks below desktop). */}
			<div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:overflow-hidden lg:[grid-template-columns:1fr_330px]">
				{/* CENTER — live specimen */}
				<div className="flex min-w-0 flex-col gap-3 bg-[color-mix(in_srgb,var(--bg)_55%,var(--bg-alt))] p-4 lg:overflow-y-auto lg:p-6">
					<div className="flex items-center justify-between gap-3">
						<span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Live preview</span>
						<div className="flex shrink-0 items-center gap-2">
							{/* Export preview — adds .lattice-exporting to the specimen so the OPAQUE
							    export face shows (otherwise the designer never sees the flatter baked look). */}
							<button type="button" onClick={() => setExporting((v) => !v)} aria-pressed={exporting} aria-label="Export preview" className={cn('inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11.5px] font-semibold', exporting ? 'border-[var(--accent)] text-[var(--accent)]' : 'text-muted-foreground')}><FileDown className="size-3.5" />Export preview</button>
							<div className="inline-flex shrink-0 rounded-lg border border-border bg-background p-[3px]">
								<button type="button" onClick={() => setMode('light')} aria-pressed={mode === 'light'} aria-label="Light specimen" className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold', mode === 'light' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><Sun className="size-3.5" />Light</button>
								<button type="button" onClick={() => setMode('dark')} aria-pressed={mode === 'dark'} aria-label="Dark specimen" className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold', mode === 'dark' ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}><Moon className="size-3.5" />Dark</button>
							</div>
						</div>
					</div>
					<DeckPreview
						options={options}
						sample={specimen(exporting)}
						mermaid={false}
						modeOverride={mode}
						extraCss={previewCss}
						debounceMs={140}
						className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-background shadow-[0_6px_18px_rgba(10,22,40,.10)]"
						aria-label="Finish specimen"
					/>
					{exporting && (
						<p className="text-[11.5px] leading-relaxed text-[var(--accent)]">Showing the export face — finishes render slightly flatter in baked PDF/PPTX exports.</p>
					)}
					<p className="text-[12px] leading-relaxed text-muted-foreground">
						A finish is a stack of four palette-blind layers. Start from a preset, tune the layers, then <strong className="text-[var(--text-heading)]">Save</strong> it to your library or <strong className="text-[var(--text-heading)]">Export</strong> the CSS.
					</p>
				</div>

				{/* RIGHT — the layer stack as Inspector groups */}
				<aside className="shrink-0 border-t border-border bg-card px-3 lg:overflow-y-auto lg:border-l lg:border-t-0">
					{/* Start from preset */}
					<LayerGroup label="Start from preset">
						<div className="grid grid-cols-3 gap-1.5">
							{PRESETS.map((p) => (
								<button key={p} type="button" onClick={() => startFromPreset(p)} className="rounded-md border border-border px-1.5 py-1.5 text-[11.5px] font-semibold text-muted-foreground hover:border-[var(--accent)] hover:text-[var(--text-heading)]">
									{PRESET_LABEL[p]}
								</button>
							))}
						</div>
					</LayerGroup>

					{/* Wash */}
					<LayerGroup label="Wash" hint="z1 · ambient color field">
						<LayerSelect aria-label="Wash type" value={recipe.wash.type} options={WASH_TYPES} labels={WASH_LABEL} onChange={(v) => patch({ wash: { ...recipe.wash, type: v as FinishRecipe['wash']['type'] } })} />
						{recipe.wash.type !== 'none' && (
							<Tuned label="Intensity" value={`${recipe.wash.intensity}%`}>
								<Slider aria-label="Wash intensity" min={3} max={20} value={recipe.wash.intensity} onValueChange={(v) => patch({ wash: { ...recipe.wash, intensity: v } })} />
							</Tuned>
						)}
					</LayerGroup>

					{/* Texture */}
					<LayerGroup label="Texture" hint="z2 · pattern">
						<LayerSelect aria-label="Texture type" value={recipe.texture.type} options={TEXTURE_TYPES} labels={TEXTURE_LABEL} onChange={(v) => patch({ texture: { ...recipe.texture, type: v as FinishRecipe['texture']['type'] } })} />
						{recipe.texture.type !== 'none' && (
							<>
								<Tuned label="Intensity" value={`${recipe.texture.intensity}%`}>
									<Slider aria-label="Texture intensity" min={3} max={18} value={recipe.texture.intensity} onValueChange={(v) => patch({ texture: { ...recipe.texture, intensity: v } })} />
								</Tuned>
								<Tuned label="Scale" value={`${recipe.texture.scale}px`}>
									<Slider aria-label="Texture scale" min={12} max={64} value={recipe.texture.scale} onValueChange={(v) => patch({ texture: { ...recipe.texture, scale: v } })} />
								</Tuned>
							</>
						)}
					</LayerGroup>

					{/* Mark */}
					<LayerGroup label="Mark" hint="z3 · placed emblem">
						<LayerSelect aria-label="Mark type" value={recipe.mark.type} options={MARK_TYPES} labels={MARK_LABEL} onChange={(v) => patch({ mark: { ...recipe.mark, type: v as FinishRecipe['mark']['type'] } })} />
						{/* The author's own glyph — initials for a monogram, a number for a numeral.
						    Sanitized to ~3 chars in the generator (CSS content:), so a brand mark can
						    carry their letters/number instead of the hardcoded "L"/"03". */}
						{(recipe.mark.type === 'monogram' || recipe.mark.type === 'numeral') && (
							<Tuned label={recipe.mark.type === 'numeral' ? 'Number' : 'Initials'}>
								<input
									value={recipe.mark.glyph ?? ''}
									onChange={(e) => patch({ mark: { ...recipe.mark, glyph: e.target.value } })}
									maxLength={3}
									spellCheck={false}
									aria-label="Mark glyph"
									placeholder={recipe.mark.type === 'numeral' ? '03' : 'L'}
									className="h-8 w-full rounded-md border border-border bg-background px-2 font-mono text-[12.5px] text-foreground outline-none focus:border-[var(--accent)] placeholder:text-muted-foreground"
								/>
							</Tuned>
						)}
						{recipe.mark.type !== 'none' && recipe.mark.type !== 'bar' && (
							<Tuned label="Placement">
								<LayerSelect aria-label="Mark placement" value={recipe.mark.placement} options={PLACEMENTS} labels={PLACEMENT_LABEL} onChange={(v) => patch({ mark: { ...recipe.mark, placement: v as Placement } })} />
							</Tuned>
						)}
					</LayerGroup>

					{/* Edge */}
					<LayerGroup label="Edge" hint="z4 · frame" last>
						<LayerSelect aria-label="Edge type" value={recipe.edge.type} options={EDGE_TYPES} labels={EDGE_LABEL} onChange={(v) => patch({ edge: { ...recipe.edge, type: v as FinishRecipe['edge']['type'] } })} />
						{recipe.edge.type !== 'none' && recipe.edge.type !== 'margin-rule' && (
							<Tuned label="Intensity" value={`${recipe.edge.intensity}%`}>
								<Slider aria-label="Edge intensity" min={3} max={20} value={recipe.edge.intensity} onValueChange={(v) => patch({ edge: { ...recipe.edge, intensity: v } })} />
							</Tuned>
						)}
					</LayerGroup>
				</aside>
			</div>
		</div>
	);
}

// An Inspector group — mirrors StudioShell's InspGroup grammar (mono uppercase
// label, bottom rule between groups).
function LayerGroup({ label, hint, last, children }: { label: string; hint?: string; last?: boolean; children: React.ReactNode }) {
	return (
		<div className={cn('py-3', !last && 'border-b border-border')}>
			<div className="mb-2.5 flex items-baseline gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
				<span>{label}</span>
				{hint && <span className="font-sans text-[10px] font-normal normal-case tracking-normal text-muted-foreground/70">{hint}</span>}
			</div>
			<div className="space-y-2.5">{children}</div>
		</div>
	);
}

// A labeled control row (mirrors FinishStudio's earlier Control + Fabricate's
// inspector rows).
function Tuned({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
	return (
		<div>
			<div className="mb-1.5 flex items-center justify-between">
				<span className="text-[12px] text-foreground">{label}</span>
				{value && <span className="font-mono text-[11px] text-muted-foreground">{value}</span>}
			</div>
			{children}
		</div>
	);
}

// A type Select built on the shared shadcn Select primitive (REUSE — HARD RULE #15).
function LayerSelect({
	value,
	options,
	labels,
	onChange,
	'aria-label': ariaLabel,
}: {
	value: string;
	options: readonly string[];
	labels: Record<string, string>;
	onChange: (v: string) => void;
	'aria-label': string;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger aria-label={ariaLabel} className="h-8 text-[12.5px]">
				<SelectValue>{labels[value] ?? value}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{options.map((o) => (
					<SelectItem key={o} value={o} className="text-[12.5px]">{labels[o] ?? o}</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
