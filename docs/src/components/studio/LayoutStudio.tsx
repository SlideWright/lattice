import { Check, FileCode2, ShieldCheck, SquareDashedBottomCode, TriangleAlert } from 'lucide-react';
import * as React from 'react';
import DeckPreview from '@/components/DeckPreview';
import { Button } from '@/components/ui/button';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';
// The REAL layout gate — the deterministic core the Node tooling + the Workbench
// Layout Studio use (lib/layout/*, bundled browser-safe). gateCss enforces the
// two invariants that make a layout safe: palette-blind (no hex, only var(--…)
// tokens) and scoped (every selector under `.name`, so it can't leak onto other
// slides). skeletonInvokes checks the sample actually uses the component.
import { gateCss, NAME_RE, skeletonInvokes } from '@/playground/layout-core.generated.js';
import { saveStudioComponent } from './component-library';

// A starter that PASSES the gate out of the box — palette-blind (every colour a
// token), scoped to `.callout`, and invoked by its skeleton. Edit from here.
const STARTER_NAME = 'callout';
const STARTER_CSS = `section.callout {
  display: grid;
  place-content: center;
  gap: 1.25rem;
  padding: 4rem;
  text-align: center;
  background: var(--bg-alt);
}
section.callout h2 {
  margin: 0;
  color: var(--accent);
  font-size: var(--fs-display);
}
section.callout p {
  margin: 0;
  color: var(--text-body);
  font-size: var(--fs-lead);
}`;
const STARTER_SKELETON = `<!-- _class: callout -->

## A callout that pops

A local component you styled here — palette-blind, scope-checked, live.`;

type Finding = { level: string; rule: string; line?: number; message: string };

export function LayoutStudio({ options, notify, onSaved }: { options: SingleSlideOptions; notify: (msg: string) => void; onSaved?: () => void }) {
	const [name, setName] = React.useState(STARTER_NAME);
	const [css, setCss] = React.useState(STARTER_CSS);
	const [skeleton, setSkeleton] = React.useState(STARTER_SKELETON);
	const [saving, setSaving] = React.useState(false);

	const nameOk = NAME_RE.test(name);
	// Live findings — the real gate, every keystroke. Name → CSS (no-hex + scope) →
	// skeleton-invokes. A clean run is what "Save to library" requires.
	const findings = React.useMemo<Finding[]>(() => {
		const out: Finding[] = [];
		if (!nameOk) {
			out.push({ level: 'error', rule: 'name', message: 'Component name must be a lowercase slug — a–z, 0–9, hyphen, starting with a letter.' });
			return out;
		}
		for (const f of gateCss(css, name).findings as Finding[]) out.push(f);
		if (!skeletonInvokes(skeleton, name)) out.push({ level: 'error', rule: 'skeleton', message: `Skeleton must invoke <!-- _class: ${name} --> so the preview applies your styles.` });
		return out;
	}, [name, css, skeleton, nameOk]);
	const errors = findings.filter((f) => f.level === 'error');
	const warnings = findings.filter((f) => f.level !== 'error');
	const ok = errors.length === 0;

	async function save() {
		if (saving || !ok) return;
		setSaving(true);
		try {
			const c = await saveStudioComponent({ name, css, skeleton });
			notify(`Saved “.${c.name}” to your component library.`);
			onSaved?.();
		} catch {
			notify('Could not save — check the component name, or your browser may block storage.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:grid md:overflow-hidden md:[grid-template-columns:360px_1fr]">
			<aside className="flex shrink-0 flex-col border-b border-border md:overflow-y-auto md:border-r md:border-b-0">
				<div className="flex items-center gap-2 border-b border-border px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
					<SquareDashedBottomCode className="size-3.5" />Layout Studio
				</div>
				<div className="border-b border-border px-4 py-3.5">
					<label htmlFor="ls-name" className="mb-1.5 block font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Component name</label>
					<div className="flex items-center gap-2">
						<span className="font-mono text-[13px] text-muted-foreground">.</span>
						<input id="ls-name" value={name} onChange={(e) => setName(e.target.value)} spellCheck={false} aria-label="Component name" className={cn('min-w-0 flex-1 rounded-md border bg-background px-2 py-1 font-mono text-[13px] text-[var(--text-heading)] outline-none focus:border-[var(--accent)]', nameOk ? 'border-border' : 'border-[color-mix(in_srgb,var(--chart-2,#9c3f00)_55%,transparent)]')} />
					</div>
				</div>
				<div className="flex min-h-[120px] flex-col border-b border-border px-4 py-3.5">
					<label htmlFor="ls-css" className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground"><FileCode2 className="size-3.5" />Styles — <span className="normal-case text-muted-foreground/80">.{name || '…'}-scoped, palette-blind</span></label>
					<textarea id="ls-css" value={css} onChange={(e) => setCss(e.target.value)} spellCheck={false} aria-label="Component CSS" rows={10} className="w-full flex-1 resize-none rounded-lg border border-border bg-background p-2.5 font-mono text-[12px] leading-relaxed text-foreground outline-none focus:border-[var(--accent)]" />
				</div>
				<div className="flex min-h-[100px] flex-col border-b border-border px-4 py-3.5">
					<label htmlFor="ls-skel" className="mb-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Skeleton — the slide that uses it</label>
					<textarea id="ls-skel" value={skeleton} onChange={(e) => setSkeleton(e.target.value)} spellCheck={false} aria-label="Component skeleton" rows={5} className="w-full flex-1 resize-none rounded-lg border border-border bg-background p-2.5 font-mono text-[12px] leading-relaxed text-foreground outline-none focus:border-[var(--accent)]" />
				</div>
				<div className="px-4 py-3.5">
					<div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
						{ok ? <ShieldCheck className="size-3.5 text-[var(--chart-3,#2e6f00)]" /> : <TriangleAlert className="size-3.5 text-[var(--chart-2,#9c3f00)]" />}
						{ok ? (warnings.length ? `Gate — ${warnings.length} note${warnings.length === 1 ? '' : 's'}` : 'Gate — all clear') : `Gate — ${errors.length} to fix`}
					</div>
					{findings.length === 0 ? (
						<p className="text-[12px] text-muted-foreground">Palette-blind and scoped — ready to save.</p>
					) : (
						<ul className="space-y-1.5">
							{findings.map((f) => {
								const isErr = f.level === 'error';
								const color = isErr ? 'var(--chart-2,#9c3f00)' : 'var(--chart-4,#9a6a00)';
								return (
									<li key={`${f.rule}:${f.line ?? ''}:${f.message}`} className="flex items-start gap-2 text-[12px] leading-snug text-foreground">
										<span className="mt-px shrink-0" style={{ color }}>{isErr ? <TriangleAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />}</span>
										<span><span className="font-mono text-[11px] text-muted-foreground">{f.rule}{f.line ? `:${f.line}` : ''}</span> — {f.message}</span>
									</li>
								);
							})}
						</ul>
					)}
					<Button size="sm" disabled={!ok || saving} onClick={save} className="mt-3 w-full gap-1.5"><Check className="size-4" />{saving ? 'Saving…' : 'Save to component library'}</Button>
				</div>
			</aside>
			<div className="flex flex-col items-center gap-4 bg-card p-4 md:overflow-y-auto md:p-7">
				<span className="self-start font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Live preview — your component, rendered</span>
				{nameOk ? (
					<DeckPreview options={options} sample={skeleton} mermaid={false} extraCss={css} className="relative aspect-video w-full max-w-[620px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_24px_rgba(10,22,40,.10)]" aria-label="Component preview" />
				) : (
					<div className="grid aspect-video w-full max-w-[620px] place-content-center rounded-xl border border-dashed border-border bg-background text-center text-[13px] text-muted-foreground">Name your component to preview it.</div>
				)}
			</div>
		</div>
	);
}
