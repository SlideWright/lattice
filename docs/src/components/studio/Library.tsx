import { Check, FileBox, Package, Plus, Search, Share2, Trash2, Upload } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';
import { componentZipName, packBundle, packComponent, packTheme, themeZipName, unpackBundle } from './asset-bundle';
import { deleteStudioComponent, listStudioComponents, type StudioComponent, saveStudioComponent } from './component-library';
import { renderThemeShowcase } from './share-export';
import { deleteStudioTheme, listStudioThemes, type StudioTheme, saveStudioTheme } from './theme-library';

// The unified Library — one shelf for every saved theme + component (the shared
// asset store), with a consistent apply/insert · share · manage flow (#54/#56)
// and zip import/export on the lattice-asset contract (#55). The two deck actions
// (apply a theme, insert a component) delegate to the shell; storage ops (delete,
// import) run here, then `onChanged` refreshes the shell's topbar/insert lists.

type Filter = 'all' | 'theme' | 'component';

function download(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// A few representative swatches for a theme card: the picked essentials, or the
// accent as a fallback when a legacy record has none.
function themeSwatches(t: StudioTheme): string[] {
	const e = t.essentials;
	if (e) return Object.values(e).filter((v) => /^#|^oklch|^rgb|^hsl/i.test(v)).slice(0, 10);
	return ['var(--accent)'];
}

export function Library({ open, onOpenChange, options, activePalette, onApplyTheme, onInsert, onChanged, notify }: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	options: SingleSlideOptions;
	activePalette: string;
	onApplyTheme: (name: string) => void;
	onInsert: (skeleton: string, name: string) => void;
	onChanged: () => void;
	notify: (msg: string) => void;
}) {
	const [themes, setThemes] = React.useState<StudioTheme[]>([]);
	const [components, setComponents] = React.useState<StudioComponent[]>([]);
	const [filter, setFilter] = React.useState<Filter>('all');
	const [query, setQuery] = React.useState('');
	const [sel, setSel] = React.useState<Set<string>>(new Set());
	const [busy, setBusy] = React.useState<string | null>(null);
	const [armed, setArmed] = React.useState<string | null>(null);
	const fileRef = React.useRef<HTMLInputElement>(null);

	const reload = React.useCallback(() => {
		Promise.all([listStudioThemes(), listStudioComponents()]).then(([t, c]) => {
			setThemes(t);
			setComponents(c);
		});
	}, []);
	// Load (and refresh) whenever the drawer opens.
	React.useEffect(() => {
		if (open) reload();
		else {
			setSel(new Set());
			setArmed(null);
		}
	}, [open, reload]);

	const q = query.trim().toLowerCase();
	const showThemes = filter !== 'component';
	const showComponents = filter !== 'theme';
	const vThemes = showThemes ? themes.filter((t) => !q || t.label.toLowerCase().includes(q) || t.name.includes(q)) : [];
	const vComponents = showComponents ? components.filter((c) => !q || c.name.includes(q) || (c.bucket || '').includes(q)) : [];
	const total = themes.length + components.length;

	const tKey = (t: StudioTheme) => `theme:${t.id}`;
	const cKey = (c: StudioComponent) => `comp:${c.id}`;
	const toggle = (k: string) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

	async function shareTheme(t: StudioTheme) {
		setBusy(`Rendering ${t.label} showcase…`);
		try {
			let pdf: Blob | null = null;
			try { pdf = await renderThemeShowcase(options, t); } catch { pdf = null; } // showcase is best-effort
			download(await packTheme(t, pdf), themeZipName(t));
			notify(pdf ? `Shared ${t.label} (with showcase PDF).` : `Shared ${t.label} (showcase skipped — engine busy).`);
		} catch {
			notify('Could not build the theme zip.');
		} finally {
			setBusy(null);
		}
	}
	async function shareComponent(c: StudioComponent) {
		setBusy(`Packing .${c.name}…`);
		try {
			download(await packComponent(c), componentZipName(c));
			notify(`Shared .${c.name}.`);
		} finally {
			setBusy(null);
		}
	}
	async function bulkExport() {
		const selThemes = themes.filter((t) => sel.has(tKey(t)));
		const selComps = components.filter((c) => sel.has(cKey(c)));
		if (selThemes.length + selComps.length === 0) return;
		// A single selected asset shares as its own zip; a mix becomes a bundle.
		if (selThemes.length === 1 && selComps.length === 0) return shareTheme(selThemes[0]);
		if (selComps.length === 1 && selThemes.length === 0) return shareComponent(selComps[0]);
		setBusy(`Packing ${selThemes.length + selComps.length} assets…`);
		try {
			const withPdf = await Promise.all(selThemes.map(async (theme) => ({ theme, showcase: await renderThemeShowcase(options, theme).catch(() => null) })));
			download(await packBundle(withPdf, selComps), 'lattice-assets.zip');
			notify(`Exported ${selThemes.length + selComps.length} assets as lattice-assets.zip.`);
			setSel(new Set());
		} catch {
			notify('Could not build the bundle.');
		} finally {
			setBusy(null);
		}
	}
	async function importFiles(files: FileList | null) {
		if (!files?.length) return;
		setBusy('Importing…');
		let nThemes = 0;
		let nComps = 0;
		try {
			for (const f of Array.from(files)) {
				const { themes: ts, components: cs } = await unpackBundle(f);
				for (const t of ts) { await saveStudioTheme({ name: t.name, label: t.label, essentials: t.essentials ?? {}, css: t.css }); nThemes++; }
				for (const c of cs) { await saveStudioComponent({ name: c.name, css: c.css, skeleton: c.skeleton, bucket: c.bucket || undefined }); nComps++; }
			}
			reload();
			onChanged();
			notify(`Imported ${nThemes} theme(s) + ${nComps} component(s).`);
		} catch (e) {
			notify(`Import failed — ${String((e as Error)?.message || e)}`);
		} finally {
			setBusy(null);
			if (fileRef.current) fileRef.current.value = '';
		}
	}
	function removeTheme(t: StudioTheme) {
		deleteStudioTheme(t.id).then(() => { reload(); onChanged(); notify(`Deleted ${t.label}.`); });
	}
	function removeComponent(c: StudioComponent) {
		deleteStudioComponent(c.id).then(() => { reload(); onChanged(); notify(`Deleted .${c.name}.`); });
	}

	const selCount = sel.size;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[720px]">
				<SheetHeader className="flex-row items-center gap-3 space-y-0 border-b border-border py-3 pl-4 pr-12">
					<SheetTitle className="flex shrink-0 items-center gap-2 text-[15px]"><FileBox className="size-[18px] text-[var(--accent)]" />Library</SheetTitle>
					<div className="ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-muted-foreground">
						<Search className="size-3.5 shrink-0" />
						<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search themes & components…" aria-label="Search library" className="min-w-0 flex-1 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground" />
					</div>
					<Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => fileRef.current?.click()} aria-label="Import .zip" title="Import a .zip"><Upload className="size-3.5" /><span className="hidden sm:inline">Import</span></Button>
					<input ref={fileRef} type="file" accept=".zip" multiple hidden onChange={(e) => importFiles(e.target.files)} />
				</SheetHeader>

				<div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
					<div className="inline-flex rounded-lg border border-border bg-background p-[3px]">
						{(['all', 'theme', 'component'] as Filter[]).map((f) => (
							<button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn('rounded-md px-3 py-1 text-[12px] font-semibold capitalize', filter === f ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}>{f === 'all' ? 'All' : `${f}s`}</button>
						))}
					</div>
					<span className="ml-auto font-mono text-[11px] text-muted-foreground">{selCount > 0 ? `${selCount} selected · ` : ''}{total} total</span>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					{total === 0 ? (
						<div className="grid h-full place-content-center gap-2 text-center text-muted-foreground">
							<FileBox className="mx-auto size-7 opacity-40" />
							<p className="text-[13px]">No saved assets yet.</p>
							<p className="text-[11.5px]">Fabricate a theme or a component, or <button type="button" className="font-semibold text-[var(--accent)]" onClick={() => fileRef.current?.click()}>import a .zip</button>.</p>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{vThemes.map((t) => {
								const k = tKey(t);
								const active = t.name === activePalette;
								return (
									<div key={k} className={cn('relative overflow-hidden rounded-xl border bg-card', sel.has(k) ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-border')}>
										<button type="button" aria-label={`Select ${t.label}`} aria-pressed={sel.has(k)} onClick={() => toggle(k)} className={cn('absolute left-2.5 top-2.5 z-10 grid size-[18px] place-items-center rounded-md border bg-background', sel.has(k) ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-border')}>{sel.has(k) && <Check className="size-3" />}</button>
										{/* biome-ignore lint/suspicious/noArrayIndexKey: a fixed positional color ramp — the index IS the swatch identity */}
										<div className="flex h-[88px] w-full">{themeSwatches(t).map((c, i) => <span key={`${k}-${i}`} className="flex-1" style={{ background: c }} />)}</div>
										<div className="p-2.5">
											<div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--text-heading)]"><span className="truncate">{t.label}</span><span className="rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[var(--accent-soft)] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wide text-[var(--accent)]">Theme</span>{active && <span className="ml-auto font-mono text-[9px] uppercase text-[var(--accent)]">Active</span>}</div>
											<div className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">{t.name} · {t.essentials ? `${Object.keys(t.essentials).length} essentials` : 'theme'} · AA</div>
											<div className="mt-2.5 flex items-center gap-1.5">
												<button type="button" onClick={() => { onApplyTheme(t.name); notify(`Applied ${t.label}.`); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[var(--accent-soft)] py-1.5 text-[11.5px] font-semibold text-[var(--accent)]"><Check className="size-3.5" />Apply</button>
												<button type="button" disabled={!!busy} onClick={() => shareTheme(t)} aria-label={`Share ${t.label}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-foreground disabled:opacity-50"><Share2 className="size-3.5" />Share</button>
												<DeleteBtn armed={armed === k} onArm={() => setArmed(k)} onConfirm={() => { setArmed(null); removeTheme(t); }} label={t.label} />
											</div>
										</div>
									</div>
								);
							})}
							{vComponents.map((c) => {
								const k = cKey(c);
								return (
									<div key={k} className={cn('relative overflow-hidden rounded-xl border bg-card', sel.has(k) ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-border')}>
										<button type="button" aria-label={`Select .${c.name}`} aria-pressed={sel.has(k)} onClick={() => toggle(k)} className={cn('absolute left-2.5 top-2.5 z-10 grid size-[18px] place-items-center rounded-md border bg-background', sel.has(k) ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-border')}>{sel.has(k) && <Check className="size-3" />}</button>
										<div className="grid h-[88px] w-full place-content-center bg-[repeating-linear-gradient(45deg,var(--bg-alt),var(--bg-alt)_8px,var(--bg)_8px,var(--bg)_16px)]"><span className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[12px] font-semibold text-[var(--accent)] shadow-sm">.{c.name}</span></div>
										<div className="p-2.5">
											<div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--text-heading)]"><span className="truncate">.{c.name}</span><span className="rounded-full border border-[color-mix(in_srgb,var(--chart-3,#2e6f00)_30%,transparent)] px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wide text-[var(--chart-3,#2e6f00)]">Component</span></div>
											<div className="mt-1 truncate font-mono text-[10.5px] text-muted-foreground">{c.bucket || 'local'} · scoped · palette-blind</div>
											<div className="mt-2.5 flex items-center gap-1.5">
												<button type="button" onClick={() => { onInsert(c.skeleton, c.name); notify(`Inserted .${c.name}.`); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[var(--accent-soft)] py-1.5 text-[11.5px] font-semibold text-[var(--accent)]"><Plus className="size-3.5" />Insert</button>
												<button type="button" disabled={!!busy} onClick={() => shareComponent(c)} aria-label={`Share .${c.name}`} className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11.5px] font-semibold text-foreground disabled:opacity-50"><Share2 className="size-3.5" />Share</button>
												<DeleteBtn armed={armed === k} onArm={() => setArmed(k)} onConfirm={() => { setArmed(null); removeComponent(c); }} label={`.${c.name}`} />
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{busy && <div className="border-t border-border bg-[var(--accent-soft)] px-4 py-2 text-[12px] font-semibold text-[var(--accent)]">{busy}</div>}
				{selCount > 0 && !busy && (
					<div className="flex items-center gap-2 border-t border-border bg-[color-mix(in_srgb,var(--accent)_7%,var(--card))] px-4 py-2.5">
						<Button size="sm" className="gap-1.5" onClick={bulkExport}><Package className="size-4" />Export {selCount} as .zip</Button>
						<button type="button" className="ml-auto text-[12px] font-semibold text-[var(--accent)]" onClick={() => setSel(new Set())}>Clear selection</button>
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
}

// Two-tap delete (matches the slide-toolbar pattern) — first tap arms, second confirms.
function DeleteBtn({ armed, onArm, onConfirm, label }: { armed: boolean; onArm: () => void; onConfirm: () => void; label: string }) {
	return armed ? (
		<button type="button" onClick={onConfirm} aria-label={`Confirm delete ${label}`} className="flex items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--fail,#c0392b)_40%,transparent)] bg-[color-mix(in_srgb,var(--fail,#c0392b)_12%,transparent)] px-2 py-1.5 text-[11px] font-semibold text-[var(--fail,#c0392b)]"><Trash2 className="size-3.5" />Sure?</button>
	) : (
		<button type="button" onClick={onArm} aria-label={`Delete ${label}`} className="grid place-items-center rounded-lg border border-border bg-card px-2.5 py-1.5 text-muted-foreground hover:text-[var(--fail,#c0392b)]"><Trash2 className="size-3.5" /></button>
	);
}
