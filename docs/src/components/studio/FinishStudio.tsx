import { Download, Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { DeckPreview } from '@/components/DeckPreview';
import { Slider } from '@/components/ui/slider';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';
import { downloadText } from './download';
import {
	DEFAULT_PARAMS,
	type FinishBase,
	type FinishParams,
	generateFinishCss,
	generateSwatch,
} from './finish-generate';

const slugify = (s: string) =>
	s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');

// The Finish faculty — the third Fabricate workbench (beside Theme + Component):
// fabricate a custom parametric BACKDROP by tuning sliders, see it live on a
// specimen, then save it to the shared Library or export it as CSS. Parametric-
// first by design (the decision doc defers the AI "describe a finish" door behind
// the threat model); every output is palette-blind, url()-free, export-safe.
//
// Self-contained: it owns its header/controls/preview so it doesn't thread
// through Fabricate's theme/component header branches. A stable preview class
// (`backdrop-preview`) carries the generated CSS via DeckPreview's extraCss.

const BASES: { base: FinishBase; label: string }[] = [
	{ base: 'wash', label: 'Wash' },
	{ base: 'aurora', label: 'Aurora' },
	{ base: 'blueprint', label: 'Blueprint' },
	{ base: 'dots', label: 'Dots' },
	{ base: 'hatch', label: 'Hatch' },
];

const PREVIEW_CLASS = 'backdrop-preview';
const SPECIMEN = `<!-- _class: ${PREVIEW_CLASS} -->\n\n\`Finish · live preview\`\n\n## Your backdrop, behind real content\n\nThe field stays faint so body text keeps its contrast — no scrim needed.\n\n- Palette-blind\n  - Recolors with the theme accent automatically.\n- Export-safe\n  - Pure CSS gradients — survives PDF and PPTX.`;

export function FinishStudio({
	options, notify,
}: {
	options: SingleSlideOptions;
	notify: (msg: string) => void;
}) {
	const [params, setParams] = React.useState<FinishParams>(DEFAULT_PARAMS.blueprint);
	const [name, setName] = React.useState('');
	const [mode, setMode] = React.useState<'light' | 'dark'>('light');

	const set = <K extends keyof FinishParams>(k: K, v: FinishParams[K]) =>
		setParams((p) => ({ ...p, [k]: v }));
	const pickBase = (base: FinishBase) =>
		setParams((p) => ({ ...DEFAULT_PARAMS[base], intensity: p.intensity }));

	const previewCss = React.useMemo(() => generateFinishCss(PREVIEW_CLASS, params), [params]);
	const slug = slugify(name);
	const className = slug ? `backdrop-${slug}` : 'backdrop-custom';
	const hasScale = params.base !== 'wash' && params.base !== 'aurora';
	const hasAngle = params.base === 'hatch';

	const exportCss = () => {
		const css = generateFinishCss(className, params);
		downloadText(`${className}.finish.css`, `/* Lattice finish — apply with <!-- _class: ${className} --> (per slide) or class: ${className} (deck-wide) */\n${css}\n`, 'text/css');
		notify(`Exported ${className}.finish.css — drop it in and apply with _class: ${className}.`);
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{/* Header — name + export + save (self-contained, mirrors the other faculties' shape) */}
			<div className="flex items-center gap-2 border-b border-border px-3 py-2">
				<span className="shrink-0 font-mono text-[13px] text-muted-foreground">backdrop-</span>
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					aria-label="Finish name"
					placeholder="name-your-finish"
					spellCheck={false}
					className="min-w-0 flex-1 bg-transparent font-mono text-[13px] font-semibold text-[var(--text-heading)] outline-none placeholder:font-normal placeholder:text-muted-foreground"
				/>
				<button type="button" onClick={exportCss} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-2.5 py-1 text-[13px] font-semibold text-[var(--bg)]">
					<Download className="size-3.5" /><span className="hidden sm:inline">Export CSS</span>
				</button>
			</div>

			<div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[280px_1fr]">
				{/* Controls */}
				<div className="space-y-5">
					<div>
						<div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Base</div>
						<div className="grid grid-cols-3 gap-1.5">
							{BASES.map((b) => {
								const sw = generateSwatch(DEFAULT_PARAMS[b.base]);
								const active = params.base === b.base;
								return (
									<button
										key={b.base}
										type="button"
										onClick={() => pickBase(b.base)}
										aria-pressed={active}
										className={cn('flex flex-col items-center gap-1 rounded-md border p-1.5 text-[11px] font-semibold', active ? 'border-[var(--accent)] text-[var(--text-heading)]' : 'border-border text-muted-foreground hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]')}
									>
										<span className="h-7 w-full rounded border border-[color-mix(in_srgb,var(--text-heading)_14%,transparent)]" style={{ background: sw.background, backgroundSize: sw.backgroundSize }} />
										{b.label}
									</button>
								);
							})}
						</div>
					</div>

					<Control label="Accent intensity" value={`${params.intensity}%`}>
						<Slider aria-label="Accent intensity" min={4} max={24} value={params.intensity} onValueChange={(v) => set('intensity', v)} />
					</Control>

					{hasScale && (
						<Control label={params.base === 'dots' ? 'Dot spacing' : 'Line spacing'} value={`${params.scale}px`}>
							<Slider aria-label="Scale" min={10} max={48} value={params.scale} onValueChange={(v) => set('scale', v)} />
						</Control>
					)}

					{hasAngle && (
						<Control label="Hatch angle" value={`${params.angle}°`}>
							<Slider aria-label="Hatch angle" min={0} max={90} value={params.angle} onValueChange={(v) => set('angle', v)} />
						</Control>
					)}

					<p className="text-[12px] leading-relaxed text-muted-foreground">
						Tune the field, name it, then Export the CSS — drop it in and apply with{' '}
						<code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">_class: {className}</code>{' '}
						(per slide) or <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">class: {className}</code> (deck-wide).
						Saving to your Library + an AI “describe a finish” door are coming next.
					</p>
				</div>

				{/* Live preview */}
				<div className="min-w-0">
					<div className="mb-2 flex items-center justify-between">
						<div className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview</div>
						<button type="button" onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))} aria-label={mode === 'dark' ? 'Switch to light' : 'Switch to dark'} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] font-semibold text-[var(--text-heading)]">
							{mode === 'dark' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}{mode === 'dark' ? 'Dark' : 'Light'}
						</button>
					</div>
					<DeckPreview
						options={options}
						sample={SPECIMEN}
						mermaid={false}
						modeOverride={mode}
						extraCss={previewCss}
						debounceMs={140}
						className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-background shadow-[0_6px_18px_rgba(10,22,40,.10)]"
						aria-label="Finish specimen"
					/>
				</div>
			</div>
		</div>
	);
}

function Control({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
	return (
		<div>
			<div className="mb-1.5 flex items-center justify-between">
				<span className="text-[12.5px] font-semibold text-[var(--text-heading)]">{label}</span>
				<span className="font-mono text-[11px] text-muted-foreground">{value}</span>
			</div>
			{children}
		</div>
	);
}
