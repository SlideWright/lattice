import {
	AlertTriangle, ChevronDown, ChevronLeft, Eye, FileText, Layers, 
	Palette, PanelLeft, PanelRight,PencilRuler, Play, Plus, Search, Settings2, Share2, Sparkles, Volume2, Wand2,
} from 'lucide-react';
import * as React from 'react';
import DeckPreview from '@/components/DeckPreview';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
	DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';
import { CommandPalette } from './CommandPalette';
import { DECKS, deckSource, type StudioDeck } from './decks';
import { Editor, type EditorHandle } from './Editor';
import { Fabricate } from './Fabricate';
import { IntentTag } from './IntentTag';
import { slideClass, splitSlides, unknownComponents } from './lint';
import { PresentOverlay } from './PresentOverlay';
import { ShareSheet } from './ShareSheet';
import { useBreakpoint } from './use-breakpoint';
import { WorkspaceSheet } from './WorkspaceSheet';

// Module-level so the reference is stable — the Editor re-inits CodeMirror when
// its `knownComponents` identity changes, so this must never be an inline literal.
const KNOWN = ['title', 'kpi', 'quote', 'cards-grid', 'agenda', 'big-number', 'stats', 'statement', 'closing', 'q-and-a', 'pricing'];
const PALETTES = ['indaco', 'cuoio', 'burgundy', 'laguna', 'crepuscolo', 'atelier', 'carbone', 'onyx'];
const PALETTE_DOTS: Record<string, string> = {
	indaco: '#006FA8', cuoio: '#7A5A10', burgundy: '#742532', laguna: '#006D77',
	crepuscolo: '#5B3D8C', atelier: '#1A1A18', carbone: '#7DE38A', onyx: '#000000',
};

type Props = { options: SingleSlideOptions };

export default function StudioShell({ options }: Props) {
	const [deck, setDeck] = React.useState<StudioDeck>(DECKS[0]);
	const [source, setSource] = React.useState(() => deckSource(DECKS[0]));
	const [activeSlide, setActiveSlide] = React.useState(0); // 0-based; preview opens on slide 1
	const [architectOpen, setArchitectOpen] = React.useState(true);
	const [inspectorOpen, setInspectorOpen] = React.useState(false); // PM-4: preview is sacred
	const [view, setView] = React.useState<'compose' | 'fabricate'>('compose');
	const [shareOpen, setShareOpen] = React.useState(false);
	const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
	const [presentOpen, setPresentOpen] = React.useState(false);
	const [cmdOpen, setCmdOpen] = React.useState(false);
	const [palette, setPalette] = React.useState('indaco');
	const [mobilePane, setMobilePane] = React.useState<'edit' | 'preview'>('preview');
	const editorRef = React.useRef<EditorHandle>(null);

	const bp = useBreakpoint();
	const compact = bp !== 'desktop'; // tablet + mobile: panels become sheets
	const mobile = bp === 'mobile'; // single swappable pane

	const slides = React.useMemo(() => splitSlides(source), [source]);
	const slide = slides[Math.min(activeSlide, slides.length - 1)] ?? slides[0] ?? '';
	const issues = React.useMemo(() => unknownComponents(source, KNOWN).length, [source]);

	// Panels are persistent columns on desktop, on-demand sheets below it. Reset
	// their open state to the right default whenever the breakpoint flips so a
	// compact load never auto-pops a sheet and a return to desktop re-docks them.
	React.useEffect(() => {
		if (compact) { setArchitectOpen(false); setInspectorOpen(false); }
		else { setArchitectOpen(true); setInspectorOpen(false); }
	}, [compact]);

	function loadDeck(d: StudioDeck) {
		setDeck(d);
		setSource(deckSource(d));
		setActiveSlide(0);
		setView('compose');
	}
	function applyPalette(name: string) {
		setPalette(name);
		document.documentElement.setAttribute('data-palette', name);
	}
	// Navigate to a slide from the preview side (rail / arrows): move the preview
	// AND scroll the editor to that slide, so the two panes stay in lock-step.
	function goToSlide(i: number) {
		const idx = Math.max(0, Math.min(i, slides.length - 1));
		setActiveSlide(idx);
		editorRef.current?.revealSlide(idx);
	}

	// ⌘K
	React.useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setCmdOpen((v) => !v);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const mode = typeof document !== 'undefined' ? (document.documentElement.getAttribute('data-mode') ?? 'light') : 'light';
	const slideNo = Math.min(activeSlide, slides.length - 1) + 1;

	// ── Architect body (cards) — shared by the desktop column and the sheet ──
	const architectBody = (
		<>
			{issues > 0 && (
				<div className="mx-2.5 mt-2.5 flex items-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--chart-2,#9c3f00)_28%,transparent)] bg-[color-mix(in_srgb,var(--chart-2,#9c3f00)_7%,transparent)] px-3 py-2">
					<AlertTriangle className="size-4 text-[var(--chart-2,#9c3f00)]" />
					<span className="text-xs font-semibold text-[var(--text-heading)]">{issues} inline issue{issues > 1 ? 's' : ''}</span>
					<button type="button" onClick={() => editorRef.current?.fixAll()} className="ml-auto rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-[var(--accent)]">Fix all</button>
				</div>
			)}
			<ArchCard tag={<IntentTag intent="pass" />} title="Board-ready">
				<div className="flex items-baseline gap-2"><span className="font-sans text-[28px] font-extrabold leading-none text-[var(--text-heading)]">8.6</span><span className="text-[13px] text-muted-foreground">/ 10 · boardroom</span></div>
				<div className="mt-2 space-y-1.5 text-xs">
					<ScoreRow ok label="Hierarchy" v="pass" />
					<ScoreRow ok label="Contrast (AA)" v="pass" />
					<ScoreRow label="Density" v="slide 5" />
				</div>
			</ArchCard>
			<ArchCard tag={<IntentTag intent="info" label="COACH" />} title="Tighten the story">
				<p className="text-xs leading-relaxed text-muted-foreground">Slide 5 packs four metrics — lead with the one that moved.</p>
				<Chip>Rewrite lead</Chip>
			</ArchCard>
			<ArchCard tag={<IntentTag intent="info" label="RESHAPE" />} title="Reshape for a reader">
				<p className="text-xs leading-relaxed text-muted-foreground">Reorient the deck without losing the source.</p>
				<div className="mt-2 flex flex-wrap gap-1.5"><Chip>Exec summary</Chip><Chip>Technical</Chip><Chip>Narrative</Chip></div>
			</ArchCard>
		</>
	);

	// ── Inspector body (groups) — shared by the desktop column and the sheet ──
	const inspectorBody = (
		<>
			<InspGroup icon={<Palette className="size-3.5" />} label="Look">
				<Field label="Theme">
					<div className="flex flex-wrap gap-1.5">
						{PALETTES.slice(0, 5).map((p) => (
							<button type="button" key={p} onClick={() => applyPalette(p)} className={cn('size-[22px] rounded-[7px] border-2', palette === p ? 'border-[var(--text-heading)] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-background' : 'border-transparent')} style={{ background: PALETTE_DOTS[p] }} aria-label={p} />
						))}
					</div>
				</Field>
				<Field label="Size"><Control>16 : 9 <ChevronDown className="size-3.5" /></Control></Field>
				<Field label="Page numbers"><Toggle on /></Field>
				<Field label="Header / footer"><Toggle /></Field>
			</InspGroup>
			<InspGroup icon={<Wand2 className="size-3.5" />} label="Authoring">
				<Field label="Inline validation"><Toggle on /></Field>
			</InspGroup>
			<InspGroup icon={<Volume2 className="size-3.5" />} label="Read">
				<Field label="Voice"><Control>Aria <ChevronDown className="size-3.5" /></Control></Field>
				<Field label="Pace"><Control>Steady <ChevronDown className="size-3.5" /></Control></Field>
			</InspGroup>
			<InspGroup icon={<Sparkles className="size-3.5" />} label="Lenses" last>
				<Lens on icon={<FileText className="size-3.5" />} name="Full deck" desc="The canonical source" badge="source" />
				<Lens icon={<Sparkles className="size-3.5" />} name="Exec summary" desc="5 slides · regenerated" />
				<Lens icon={<Plus className="size-3.5" />} name="New lens…" desc="Reshape for a reader" />
			</InspGroup>
		</>
	);

	// ── Editor pane — shared by all breakpoints ──────────────────────────────
	const editorPane = (
		<section className="flex min-h-0 flex-1 flex-col overflow-hidden border-border md:border-r">
			<div className="flex items-center gap-2 border-b border-border px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
				Edit
				<span className="flex-1" />
				{issues > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--chart-2,#9c3f00)_35%,transparent)] bg-[color-mix(in_srgb,var(--chart-2,#9c3f00)_8%,transparent)] px-2 py-0.5 font-sans text-[11px] font-semibold normal-case tracking-normal text-[var(--chart-2,#9c3f00)]"><AlertTriangle className="size-3" />{issues} issue{issues > 1 ? 's' : ''}</span>}
				<button type="button" onClick={() => editorRef.current?.fixAll()} className="rounded-md border border-border px-2 py-1 font-sans text-[12px] font-semibold normal-case tracking-normal text-[var(--accent)] disabled:opacity-40" disabled={!issues}>Fix all</button>
				<span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-sans text-[12px] font-semibold normal-case tracking-normal text-foreground"><FileText className="size-3" />Markdown</span>
			</div>
			<Editor ref={editorRef} value={source} onChange={setSource} knownComponents={KNOWN} onCursorSlide={setActiveSlide} className="flex-1" />
		</section>
	);

	// ── Preview pane (live engine render) — shared by all breakpoints ────────
	const previewPane = (
		<section className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="flex items-center gap-2 border-b border-border px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
				Preview<span className="flex-1" />
				<button type="button" onClick={() => goToSlide(slideNo - 2)} className="rounded px-1.5 text-muted-foreground hover:text-[var(--accent)]" aria-label="Previous slide">‹</button>
				<span className="rounded-full border border-border bg-card px-2 py-0.5 font-sans text-[12px] font-semibold normal-case tracking-normal text-[var(--text-heading)]">Slide {slideNo} / {slides.length}</span>
				<button type="button" onClick={() => goToSlide(slideNo)} className="rounded px-1.5 text-muted-foreground hover:text-[var(--accent)]" aria-label="Next slide">›</button>
			</div>
			<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-card p-4 sm:p-5">
				<DeckPreview options={options} sample={slide} mermaid={false} className="relative aspect-video w-full max-w-[760px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_24px_rgba(10,22,40,.10)]" aria-label="Live deck preview" />
			</div>
			{/* Slide navigator — jump to any slide, see its component type */}
			<nav className="flex items-center gap-1.5 overflow-x-auto border-t border-border bg-background px-3 py-2" aria-label="Slide navigator">
				{slides.map((s, i) => {
					const on = i === slideNo - 1;
					return (
						<button
							type="button"
							// biome-ignore lint/suspicious/noArrayIndexKey: the slide rail is positional — slide N's index IS its identity.
							key={i}
							onClick={() => goToSlide(i)}
							aria-current={on}
							aria-label={`Slide ${i + 1} — ${slideClass(s)}`}
							className={cn('flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors', on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]')}
						>
							<span className={cn('grid size-[18px] shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold', on ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}>{i + 1}</span>
							<span className={cn('font-mono text-[11px]', on ? 'text-[var(--accent)]' : 'text-muted-foreground')}>{slideClass(s)}</span>
						</button>
					);
				})}
			</nav>
			<div className="flex items-center gap-3 border-t border-border px-4 py-1.5 font-mono text-[11px] text-muted-foreground">
				<span className="inline-flex items-center gap-1 text-[var(--chart-3,#2e6f00)]">● Live</span>
				<span className="truncate">{palette} · {mode}</span>
				<span className="flex-1" /><span className="hidden sm:inline">16 : 9 · {slides.length} slides</span>
			</div>
		</section>
	);

	return (
		<div className="lx-ui flex h-[100dvh] flex-col bg-background text-foreground">
			{/* ── Top bar (one lean row, v4) ───────────────────────────── */}
			<header className="flex h-[54px] shrink-0 items-center gap-1.5 border-b border-border bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] px-2.5 sm:gap-3 sm:px-3.5">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button type="button" className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-[color-mix(in_srgb,var(--accent)_9%,transparent)] sm:px-1.5" aria-label="Workspace launcher">
							<span className="grid size-7 place-items-center rounded-lg bg-primary text-[15px] font-extrabold text-primary-foreground">L</span>
							<span className="hidden font-display text-[19px] font-extrabold tracking-tight text-[var(--text-heading)] sm:inline" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Lattice</span>
							<ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-60">
						<DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</DropdownMenuLabel>
						<DropdownMenuItem onSelect={() => setView('compose')}><Layers className="size-4" /><div><div className="font-semibold text-[var(--text-heading)]">Decks</div><div className="text-[11px] text-muted-foreground">Your saved decks</div></div></DropdownMenuItem>
						<DropdownMenuItem onSelect={() => setView('fabricate')}><PencilRuler className="size-4" /><div><div className="font-semibold text-[var(--text-heading)]">Fabricate</div><div className="text-[11px] text-muted-foreground">Theme &amp; Layout Studio</div></div></DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => loadDeck({ ...DECKS[0], id: 'new', title: 'Untitled deck', meta: '1 slide', slides: ['<!-- _class: title -->\n# Untitled\n## Start typing…'] })}><Plus className="size-4" />New deck</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<span className="hidden h-5 w-px bg-border sm:block" />

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button type="button" className="flex min-w-0 max-w-[150px] items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] sm:max-w-[260px] sm:px-2.5">
							<span className="size-2 shrink-0 rounded-full bg-primary" />
							<span className="truncate text-sm font-semibold text-[var(--text-heading)]">{deck.title}</span>
							<span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{deck.meta}</span>
							<ChevronDown className="size-4 shrink-0 text-muted-foreground" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-64">
						<DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Switch deck</DropdownMenuLabel>
						{DECKS.map((d) => (
							<DropdownMenuItem key={d.id} onSelect={() => loadDeck(d)}>
								<span className="size-2 rounded-full bg-primary" />
								<span className="font-semibold text-[var(--text-heading)]">{d.title}</span>
								<span className="ml-auto font-mono text-[11px] text-muted-foreground">{d.meta}</span>
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="flex-1" />

				<button type="button" onClick={() => setCmdOpen(true)} className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-[13px] text-muted-foreground hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] lg:flex" aria-label="Search or run a command">
					<Search className="size-4" />Search or run…
					<span className="ml-2 rounded border border-border bg-background px-1.5 font-mono text-[11px]">⌘K</span>
				</button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon-sm" aria-label="Theme"><Palette className="size-[18px]" /></Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-44">
						<DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Studio theme</DropdownMenuLabel>
						{PALETTES.map((p) => (
							<DropdownMenuItem key={p} onSelect={() => applyPalette(p)}>
								<span className="size-3.5 rounded-full" style={{ background: PALETTE_DOTS[p] }} />
								<span className="capitalize">{p}</span>
								{p === palette && <span className="ml-auto text-[var(--accent)]">✓</span>}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>

				<Button variant="outline" size="sm" onClick={() => setPresentOpen(true)} className="gap-1.5 px-2 sm:px-3"><Play className="size-4" /><span className="hidden sm:inline">Present</span></Button>
				<Button size="sm" onClick={() => setShareOpen(true)} className="gap-1.5 px-2 sm:px-3"><Share2 className="size-4" /><span className="hidden sm:inline">Share</span></Button>

				<span className="hidden h-5 w-px bg-border sm:block" />
				<Button variant="ghost" size="icon-sm" aria-pressed={architectOpen} onClick={() => setArchitectOpen((v) => !v)} aria-label="Toggle Architect" className={cn(architectOpen && 'text-[var(--accent)]')}><PanelLeft className="size-[18px]" /></Button>
				<Button variant="ghost" size="icon-sm" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen((v) => !v)} aria-label="Toggle Deck inspector" className={cn(inspectorOpen && 'text-[var(--accent)]')}><PanelRight className="size-[18px]" /></Button>
				<Button variant="ghost" size="icon-sm" onClick={() => setWorkspaceOpen(true)} aria-label="Workspace settings" className="hidden sm:inline-flex"><Settings2 className="size-[18px]" /></Button>
				<span className="hidden size-7 place-items-center rounded-full bg-[var(--surface-inverse)] text-[12px] font-bold text-white sm:grid">SA</span>
			</header>

			{/* ── Body ─────────────────────────────────────────────────── */}
			{view === 'fabricate' ? (
				<Fabricate options={options} onClose={() => setView('compose')} />
			) : mobile ? (
				/* Mobile: one swappable Edit/Preview pane; panels live in sheets. */
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="flex shrink-0 items-center gap-1 border-b border-border bg-card p-1.5">
						<div className="inline-flex rounded-lg border border-border bg-background p-[3px]">
							<PaneBtn active={mobilePane === 'edit'} onClick={() => setMobilePane('edit')} icon={<FileText className="size-3.5" />}>Edit</PaneBtn>
							<PaneBtn active={mobilePane === 'preview'} onClick={() => setMobilePane('preview')} icon={<Eye className="size-3.5" />}>Preview</PaneBtn>
						</div>
						<span className="flex-1" />
						{issues > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--chart-2,#9c3f00)_35%,transparent)] bg-[color-mix(in_srgb,var(--chart-2,#9c3f00)_8%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--chart-2,#9c3f00)]"><AlertTriangle className="size-3" />{issues}</span>}
					</div>
					{mobilePane === 'edit' ? editorPane : previewPane}
				</div>
			) : (
				/* Desktop: 4-column grid · Tablet: editor | preview (panels → sheets) */
				<div
					className="grid min-h-0 flex-1"
					style={{
						gridTemplateColumns: compact
							? 'minmax(0,1fr) minmax(0,1.08fr)'
							: [architectOpen ? '232px' : '0px', 'minmax(0,0.92fr)', 'minmax(0,1.08fr)', inspectorOpen ? '300px' : '46px'].join(' '),
					}}
				>
					{/* Architect — persistent column only on desktop */}
					{!compact && architectOpen && (
						<aside className="flex min-h-0 flex-col overflow-y-auto border-r border-border bg-card">
							<div className="border-b border-border px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Architect</div>
							{architectBody}
						</aside>
					)}

					{editorPane}
					{previewPane}

					{/* Inspector — persistent column/rail only on desktop (PM-4) */}
					{!compact && (inspectorOpen ? (
						<aside className="flex min-h-0 flex-col overflow-y-auto border-l border-border bg-background">
							<div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
								<Settings2 className="size-4 text-[var(--accent)]" />
								<span className="text-sm font-bold text-[var(--text-heading)]">Deck</span>
								<span className="ml-auto rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">this deck</span>
							</div>
							<div className="space-y-0 px-3.5 pb-4">{inspectorBody}</div>
						</aside>
					) : (
						<aside className="flex min-h-0 flex-col items-center gap-2 border-l border-border bg-background py-2.5">
							<button type="button" onClick={() => setInspectorOpen(true)} className="grid size-[30px] place-items-center rounded-lg border border-border text-foreground hover:text-[var(--accent)]" aria-label="Open Deck inspector"><ChevronLeft className="size-4" /></button>
							<Palette className="size-[18px] text-muted-foreground" />
							<Volume2 className="size-[18px] text-muted-foreground" />
							<Sparkles className="size-[18px] text-muted-foreground" />
							<span className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground" style={{ writingMode: 'vertical-rl', rotate: '180deg' }}>Deck</span>
						</aside>
					))}
				</div>
			)}

			{/* ── Compact panels as sheets (tablet + mobile) ───────────── */}
			{compact && view === 'compose' && (
				<>
					<Sheet open={architectOpen} onOpenChange={setArchitectOpen}>
						<SheetContent side="left" className="w-[88vw] gap-0 p-0 sm:max-w-[320px]">
							<SheetHeader className="border-b border-border">
								<SheetTitle className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground"><Sparkles className="size-4 text-[var(--accent)]" />Architect</SheetTitle>
								<SheetDescription className="sr-only">Board-readiness scorecard, coaching, and reshape suggestions for this deck.</SheetDescription>
							</SheetHeader>
							<div className="overflow-y-auto pb-4">{architectBody}</div>
						</SheetContent>
					</Sheet>
					<Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
						<SheetContent side="right" className="w-[88vw] gap-0 p-0 sm:max-w-[340px]">
							<SheetHeader className="border-b border-border">
								<SheetTitle className="flex items-center gap-2 text-[15px]"><Settings2 className="size-4 text-[var(--accent)]" />Deck<span className="ml-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">this deck</span></SheetTitle>
								<SheetDescription className="sr-only">Look, authoring, read-aloud, and reader-lens settings for this deck.</SheetDescription>
							</SheetHeader>
							<div className="space-y-0 overflow-y-auto px-3.5 pb-4">{inspectorBody}</div>
						</SheetContent>
					</Sheet>
				</>
			)}

			{/* ── Overlays ─────────────────────────────────────────────── */}
			<ShareSheet open={shareOpen} onOpenChange={setShareOpen} deckTitle={deck.title} />
			<WorkspaceSheet open={workspaceOpen} onOpenChange={setWorkspaceOpen} />
			<PresentOverlay open={presentOpen} onClose={() => setPresentOpen(false)} options={options} slide={slide} />
			<CommandPalette
				open={cmdOpen}
				onOpenChange={setCmdOpen}
				decks={DECKS}
				palettes={PALETTES}
				onPickDeck={loadDeck}
				onPalette={applyPalette}
				onPresent={() => setPresentOpen(true)}
				onShare={() => setShareOpen(true)}
				onFabricate={() => setView('fabricate')}
				onReshape={() => setInspectorOpen(true)}
			/>
		</div>
	);
}

// ── small local building blocks ─────────────────────────────────────────
function PaneBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
	return (
		<button type="button" onClick={onClick} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-semibold', active ? 'bg-card text-[var(--accent)] shadow-sm' : 'text-muted-foreground')}>{icon}{children}</button>
	);
}
function ArchCard({ tag, title, children }: { tag: React.ReactNode; title: string; children: React.ReactNode }) {
	return (
		<div className="relative m-2.5 rounded-xl border border-border bg-background p-3 shadow-[0_1px_2px_rgba(10,22,40,.06)]">
			<span className="absolute right-2.5 top-2.5">{tag}</span>
			<div className="pr-16 text-[12px] font-bold text-[var(--text-heading)]">{title}</div>
			<div className="mt-1">{children}</div>
		</div>
	);
}
function ScoreRow({ ok, label, v }: { ok?: boolean; label: string; v: string }) {
	return (
		<div className="flex items-center gap-1.5">
			{ok ? <span className="text-[var(--chart-3,#2e6f00)]">✓</span> : <AlertTriangle className="size-3 text-[var(--chart-2,#9c3f00)]" />}
			<span className="text-foreground">{label}</span>
			<span className={cn('ml-auto font-mono text-[11px]', ok ? 'text-[var(--chart-3,#2e6f00)]' : 'text-[var(--chart-2,#9c3f00)]')}>{v}</span>
		</div>
	);
}
function Chip({ children }: { children: React.ReactNode }) {
	return <span className="mt-2 mr-1.5 inline-block cursor-pointer rounded-full border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] text-[var(--accent)]">{children}</span>;
}
function InspGroup({ icon, label, last, children }: { icon: React.ReactNode; label: string; last?: boolean; children: React.ReactNode }) {
	return (
		<div className={cn('py-3', !last && 'border-b border-border')}>
			<div className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
			{children}
		</div>
	);
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return <div className="my-2 flex items-center justify-between gap-2.5"><span className="text-[12.5px] text-foreground">{label}</span>{children}</div>;
}
function Control({ children }: { children: React.ReactNode }) {
	return <span className="inline-flex min-w-[96px] items-center justify-between gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--text-heading)]">{children}</span>;
}
function Toggle({ on }: { on?: boolean }) {
	return <span className={cn('relative h-[22px] w-[38px] rounded-full', on ? 'bg-primary' : 'bg-border')}><span className={cn('absolute top-[2px] size-[18px] rounded-full bg-white shadow', on ? 'left-[18px]' : 'left-[2px]')} /></span>;
}
function Lens({ on, icon, name, desc, badge }: { on?: boolean; icon: React.ReactNode; name: string; desc: string; badge?: string }) {
	return (
		<div className={cn('my-1.5 flex cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2', on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
			<span className={cn('grid size-[26px] place-items-center rounded-[7px]', on ? 'bg-primary text-primary-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]')}>{icon}</span>
			<span><div className="text-[12.5px] font-semibold text-[var(--text-heading)]">{name}</div><div className="text-[11px] text-muted-foreground">{desc}</div></span>
			{badge && <span className="ml-auto rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--accent)]">{badge}</span>}
		</div>
	);
}
