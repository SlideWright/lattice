import {
	AlertTriangle, ChevronDown, ChevronLeft, 
	ChevronRight, Copy, Eye, FileText, History, Layers, LayoutGrid, Palette, PanelLeft, PanelRight, PencilLine, PencilRuler, Play, Plus, Save, Search, Settings2, Share2, Sparkles, Trash2, Upload, Volume2, Wand2, X,
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
import { ArchitectChat } from './ArchitectChat';
import { resumePendingAuth, runArchitect, useArchitectStatus } from './architect';
import { CommandPalette } from './CommandPalette';
import { addSlideAfter, deleteSlide, duplicateSlide, moveSlide, replaceSlide } from './deck-ops';
import { DECKS, deckSource, type StudioDeck } from './decks';
import { Editor, type EditorHandle } from './Editor';
import { Fabricate } from './Fabricate';
import { frontMatterBlock, getFrontMatter, setFrontMatter, stripFrontMatter } from './front-matter';
import { type ComponentEntry, InsertComponent } from './InsertComponent';
import { IntentTag } from './IntentTag';
import { type PresentLens, presentationSet, scoreDeck, slideClass, splitSlides, unknownComponents, usedComponents } from './lint';
import { PresentOverlay } from './PresentOverlay';
import { ShareSheet } from './ShareSheet';
import { getNote, setNote } from './slide-notes';
import { type Checkpoint, createDeck, deleteDeck as deleteDeckStore, loadCheckpoints, loadDeckList, loadSettings, loadSource, metaFor, renameDeck as renameDeckStore, saveCheckpoint, saveSettings, saveSource, titleFromSource } from './studio-store';
import { deleteStudioTheme, listStudioThemes, type StudioTheme } from './theme-library';
import { useBreakpoint } from './use-breakpoint';
import { WorkspaceSheet } from './WorkspaceSheet';

// Module-level so the reference is stable — the Editor re-inits CodeMirror when
// its `knownComponents` identity changes, so this must never be an inline literal.
const KNOWN = ['title', 'kpi', 'quote', 'cards-grid', 'agenda', 'big-number', 'stats', 'statement', 'closing', 'q-and-a', 'pricing'];
// Stable empty reference — passed to the editor when inline validation is OFF so
// its linter stands down (an empty known-set flags nothing) without re-creating
// the array each render (which would needlessly rebuild CodeMirror).
const NO_KNOWN: string[] = [];
const LENS_LABEL: Record<string, string> = { exec: 'Exec summary', onepager: 'One-pager' };
// Slide sizes the engine themes define (@size tokens). `size:` front-matter picks one.
const SIZES = [
	{ value: '16:9', label: 'Widescreen 16 : 9' },
	{ value: 'standard', label: 'Standard 4 : 3' },
	{ value: 'square', label: 'Square 1 : 1' },
	{ value: '4k', label: '4K (16 : 9)' },
];
const SIZE_LABELS: Record<string, string> = Object.fromEntries(SIZES.map((s) => [s.value, s.label.replace(/ \(.*\)/, '')]));
// Relative time for the version-history list (just now / Nm / Nh / Nd).
function timeAgo(ts: number): string {
	const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
	if (s < 45) return 'just now';
	const m = Math.round(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.round(h / 24)}d ago`;
}
const PALETTES = ['indaco', 'cuoio', 'burgundy', 'laguna', 'crepuscolo', 'atelier', 'carbone', 'onyx'];
const PALETTE_DOTS: Record<string, string> = {
	indaco: '#006FA8', cuoio: '#7A5A10', burgundy: '#742532', laguna: '#006D77',
	crepuscolo: '#5B3D8C', atelier: '#1A1A18', carbone: '#7DE38A', onyx: '#000000',
};

// biome-ignore lint/suspicious/noExplicitAny: serialized lint vocabulary from the page.
type Props = { options: SingleSlideOptions; components?: ComponentEntry[]; lintVocab?: any };

export default function StudioShell({ options, components = [], lintVocab }: Props) {
	// Persisted deck list (seeded from the built-ins), the active deck, and its
	// source — restored from localStorage so edits survive a switch AND a reload.
	const [decks, setDecks] = React.useState<StudioDeck[]>(() => loadDeckList());
	const [deck, setDeck] = React.useState<StudioDeck>(() => loadDeckList()[0] ?? DECKS[0]);
	const [source, setSource] = React.useState(() => {
		const first = loadDeckList()[0] ?? DECKS[0];
		return loadSource(first.id) ?? deckSource(first);
	});
	const [activeSlide, setActiveSlide] = React.useState(0); // 0-based; index into the VIEWED set
	const [composeLens, setComposeLens] = React.useState<PresentLens>('full'); // reader lens for the preview
	const [architectOpen, setArchitectOpen] = React.useState(true);
	const [inspectorOpen, setInspectorOpen] = React.useState(false); // PM-4: preview is sacred
	const [view, setView] = React.useState<'compose' | 'fabricate'>('compose');
	const [shareOpen, setShareOpen] = React.useState(false);
	const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
	const [presentOpen, setPresentOpen] = React.useState(false);
	const [cmdOpen, setCmdOpen] = React.useState(false);
	const [insertOpen, setInsertOpen] = React.useState(false);
	const [architectTab, setArchitectTab] = React.useState<'coach' | 'chat'>('coach');
	const [checkpoints, setCheckpoints] = React.useState<Checkpoint[]>(() => loadCheckpoints((loadDeckList()[0] ?? DECKS[0]).id));
	const [toast, setToast] = React.useState<string | null>(null);
	const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const [palette, setPalette] = React.useState(() => {
		try {
			return localStorage.getItem('lattice-studio-palette') || 'indaco';
		} catch {
			return 'indaco';
		}
	});
	const [mobilePane, setMobilePane] = React.useState<'edit' | 'preview'>('preview');
	// Saved themes from the SHARED Workbench library (asset-store, IndexedDB) — a
	// theme derived + saved in Fabricate lands here and becomes selectable. Loaded
	// async (the store is IndexedDB); refreshed after a save/delete.
	const [savedThemes, setSavedThemes] = React.useState<StudioTheme[]>([]);
	const refreshThemes = React.useCallback(() => {
		listStudioThemes().then(setSavedThemes).catch(() => setSavedThemes([]));
	}, []);
	React.useEffect(() => { refreshThemes(); }, [refreshThemes]);
	// `validation` is an editor preference (persisted in settings). The deck-level
	// Look controls (size / page numbers / header+footer) are NOT separate state —
	// they READ from and WRITE to the deck's front-matter, so the toggle always
	// reflects the source and every export carries the directive.
	const [validation, setValidation] = React.useState(() => loadSettings().validation);
	const editorRef = React.useRef<EditorHandle>(null);

	const bp = useBreakpoint();
	const compact = bp !== 'desktop'; // tablet + mobile: panels become sheets
	const mobile = bp === 'mobile'; // single swappable pane

	// Deck-level front-matter (size / paginate / header / footer) is split off the
	// body so it never reads as a phantom slide, but is prepended back to whatever
	// single slide the preview renders so its directives (e.g. `size`) take effect.
	const fm = React.useMemo(() => frontMatterBlock(source), [source]);
	const body = React.useMemo(() => stripFrontMatter(source), [source]);
	const slides = React.useMemo(() => splitSlides(body), [body]);
	// The canonical deck is `slides`; the preview/rail render the VIEWED set — the
	// full deck, or a reader-lens reshape of it (the editor always holds the source).
	const viewSlides = React.useMemo(() => (composeLens === 'full' ? slides : presentationSet(slides, composeLens)), [slides, composeLens]);
	const slide = viewSlides[Math.min(activeSlide, viewSlides.length - 1)] ?? viewSlides[0] ?? '';
	// When inline validation is off, nothing is "unknown" — the editor, the issue
	// count, and the Architect's component check all stand down together.
	const lintKnown = React.useMemo(() => (validation ? KNOWN : usedComponents(source)), [validation, source]);
	const issues = React.useMemo(() => unknownComponents(source, lintKnown).length, [source, lintKnown]);
	const deckScore = React.useMemo(() => scoreDeck(source, lintKnown), [source, lintKnown]);

	// Panels are persistent columns on desktop, on-demand sheets below it. Reset
	// their open state to the right default whenever the breakpoint flips so a
	// compact load never auto-pops a sheet and a return to desktop re-docks them.
	React.useEffect(() => {
		if (compact) { setArchitectOpen(false); setInspectorOpen(false); }
		else { setArchitectOpen(true); setInspectorOpen(false); }
	}, [compact]);

	// Persist the active deck's source (debounced) so edits survive a switch AND a
	// reload. Skipped on the very first render (nothing changed yet).
	const firstSave = React.useRef(true);
	React.useEffect(() => {
		if (firstSave.current) {
			firstSave.current = false;
			return;
		}
		const id = setTimeout(() => saveSource(deck.id, source), 400);
		return () => clearTimeout(id);
	}, [source, deck.id]);

	// Persist the editor preference as it changes.
	React.useEffect(() => {
		saveSettings({ validation });
	}, [validation]);

	// Deck-level Look directives, READ from the deck's front-matter.
	const deckSize = getFrontMatter(source, 'size') || '16:9';
	const pageNumbers = getFrontMatter(source, 'paginate') === 'true';
	const headerFooter = getFrontMatter(source, 'header') != null;
	// …and WRITE to it (the editor + every export update in lock-step).
	const setDeckSize = (value: string) => setSource((s) => setFrontMatter(s, 'size', value));
	const togglePageNumbers = () => setSource((s) => setFrontMatter(s, 'paginate', pageNumbers ? null : 'true'));
	const toggleHeaderFooter = () => setSource((s) => setFrontMatter(s, 'header', getFrontMatter(s, 'header') != null ? null : deck.title));

	function loadDeck(d: StudioDeck) {
		// Flush the current deck's edits before leaving it (the debounce may not
		// have fired), then restore the target deck's saved source.
		saveSource(deck.id, source);
		setDeck(d);
		setSource(loadSource(d.id) ?? deckSource(d));
		setActiveSlide(0);
		setView('compose');
	}
	// New / rename / delete — all persisted via the store, then reflected in the
	// live deck list and switcher.
	function newDeck() {
		saveSource(deck.id, source);
		const d = createDeck();
		setDecks(loadDeckList());
		setDeck(d);
		setSource(deckSource(d));
		setActiveSlide(0);
		setView('compose');
		notify('New deck created.');
	}
	// Import a deck from an external `.md` file — seed a new persisted deck with its
	// content (title from the first heading) and load it.
	const importInputRef = React.useRef<HTMLInputElement>(null);
	function importDeckFromText(text: string) {
		if (!text.trim()) { notify('That file was empty — nothing to import.'); return; }
		saveSource(deck.id, source);
		const d = createDeck(titleFromSource(text), text);
		setDecks(loadDeckList());
		setDeck(d);
		setSource(text);
		setActiveSlide(0);
		setView('compose');
		notify(`Imported “${d.title}”.`);
	}
	function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = ''; // allow re-importing the same file
		if (!file) return;
		file.text().then(importDeckFromText).catch(() => notify('Could not read that file.'));
	}
	function renameActiveDeck(title: string) {
		const t = title.trim();
		if (!t || t === deck.title) return;
		renameDeckStore(deck.id, t);
		setDeck((cur) => ({ ...cur, title: t }));
		setDecks(loadDeckList());
		notify(`Renamed to “${t}”.`);
	}
	function removeDeck(id: string) {
		deleteDeckStore(id);
		const list = loadDeckList();
		setDecks(list);
		if (id === deck.id) {
			const next = list[0] ?? DECKS[0];
			setDeck(next);
			setSource(loadSource(next.id) ?? deckSource(next));
			setActiveSlide(0);
		}
		notify('Deck deleted.');
	}
	function applyPalette(name: string) {
		setPalette(name);
		// Persist to a Studio-scoped key (not the shared docs key) so the choice
		// survives a reload without bleeding into the rest of the docs site.
		try {
			localStorage.setItem('lattice-studio-palette', name);
		} catch {}
		// A built-in palette drives the page through `data-palette` (other previews
		// fetch it by name). A saved library theme has no on-disk CSS, so it renders
		// through `extraTheme` instead — we leave `data-palette` on a real palette to
		// avoid a 404 theme fetch, and pass the saved CSS where it's consumed.
		if (PALETTES.includes(name)) document.documentElement.setAttribute('data-palette', name);
	}
	// The active theme as a saved library entry (when the active palette names one),
	// else undefined → a built-in palette. Drives the `extraTheme` everywhere a deck
	// is rendered/exported so a saved theme is honored, not just previewed.
	const activeTheme = React.useMemo(() => savedThemes.find((t) => t.name === palette), [savedThemes, palette]);
	const extraTheme = activeTheme ? { name: activeTheme.name, css: activeTheme.css } : undefined;
	function removeTheme(t: StudioTheme) {
		deleteStudioTheme(t.id).then(() => {
			refreshThemes();
			if (palette === t.name) applyPalette('indaco');
			notify(`Removed “${t.label}” from your library.`);
		});
	}
	// Navigate to a slide from the preview side (rail / arrows): move the preview
	// AND scroll the editor to that slide (mapping the viewed index back to its
	// position in the full source), so the two panes stay in lock-step.
	function goToSlide(i: number) {
		const idx = Math.max(0, Math.min(i, viewSlides.length - 1));
		setActiveSlide(idx);
		const fullIdx = composeLens === 'full' ? idx : slides.indexOf(viewSlides[idx]);
		if (fullIdx >= 0) editorRef.current?.revealSlide(fullIdx);
	}
	// Switch the reader lens for the preview; restart at the top of the reshaped set.
	function setLens(next: PresentLens) {
		setComposeLens(next);
		setActiveSlide(0);
	}
	// The editor reports a FULL-deck slide index; translate it to the viewed set
	// (no-op in full view; in a lens, ignore a cursor in a filtered-out slide).
	function onEditorCursorSlide(fullIdx: number) {
		if (composeLens === 'full') { setActiveSlide(fullIdx); return; }
		const vi = viewSlides.indexOf(slides[fullIdx]);
		if (vi >= 0) setActiveSlide(vi);
	}
	// Transient bottom-center confirmation, so no action in the prototype is a
	// dead click (real ones confirm; not-yet-wired ones say so honestly).
	const notify = React.useCallback((msg: string) => {
		setToast(msg);
		if (toastTimer.current) clearTimeout(toastTimer.current);
		toastTimer.current = setTimeout(() => setToast(null), 2600);
	}, []);
	React.useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

	// ── Architect (AI) ───────────────────────────────────────────────────────
	const ai = useArchitectStatus();
	const [aiBusy, setAiBusy] = React.useState<string | null>(null);
	// On return from the OpenRouter OAuth redirect (?code=), finish the exchange.
	React.useEffect(() => {
		resumePendingAuth().then((ok) => {
			if (ok) notify('OpenRouter connected — the Architect can now edit your deck.');
		});
	}, [notify]);
	// Run one architect instruction. Applies real edits when a model is connected;
	// degrades honestly (points at Workspace) when it is not.
	const runArchitectAction = React.useCallback(
		async (key: string, label: string, instruction: string) => {
			if (aiBusy) return;
			setAiBusy(key);
			notify(`${label}…`);
			try {
				const out = await runArchitect(source, instruction);
				if (out.status === 'offline') {
					notify('Connect a model in Workspace → AI model, then this applies automatically.');
					setWorkspaceOpen(true);
				} else if (out.status === 'blocked') {
					notify(out.note);
					setWorkspaceOpen(true);
				} else if (out.status === 'advice') {
					notify(out.note);
				} else {
					// Checkpoint the pre-edit deck so an AI change is reversible from
					// history, not just ⌘Z.
					setCheckpoints(saveCheckpoint(deck.id, source, `Before ${label}`, Date.now()));
					setSource(out.source);
					notify(`${out.note} — ⌘Z or restore from History to undo.`);
				}
			} catch {
				notify(`${label} failed — try again.`);
			} finally {
				setAiBusy(null);
			}
		},
		[aiBusy, source, notify, deck.id],
	);

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

	// Track the document's light/dark mode reactively so exports + the preview
	// follow a mode flip while Studio is open (the topbar writes <html data-mode>).
	const [mode, setMode] = React.useState<string>(() => (typeof document !== 'undefined' ? (document.documentElement.getAttribute('data-mode') ?? 'light') : 'light'));
	React.useEffect(() => {
		const root = document.documentElement;
		const sync = () => setMode(root.getAttribute('data-mode') ?? 'light');
		sync();
		const obs = new MutationObserver(sync);
		obs.observe(root, { attributes: true, attributeFilter: ['data-mode'] });
		return () => obs.disconnect();
	}, []);
	const slideNo = Math.min(activeSlide, viewSlides.length - 1) + 1;
	// The full-deck index of the slide currently in view (for handing off to Present).
	const activeFullIndex = composeLens === 'full' ? slideNo - 1 : Math.max(0, slides.indexOf(viewSlides[slideNo - 1]));

	// Structural slide ops (full lens only). Each rewrites the source, moves the
	// active slide to follow the edit, and reveals it in the editor next frame
	// (after the value-sync effect has pushed the new doc into CodeMirror).
	const curIndex = slideNo - 1;
	function applyDeckOp(r: { source: string; active: number }) {
		setSource(r.source);
		setActiveSlide(r.active);
		requestAnimationFrame(() => editorRef.current?.revealSlide(r.active));
	}
	const opAddSlide = () => { applyDeckOp(addSlideAfter(source, curIndex)); notify('Slide added.'); };
	const opDuplicate = () => { applyDeckOp(duplicateSlide(source, curIndex)); notify('Slide duplicated.'); };
	const opDelete = () => { if (slides.length <= 1) { notify('A deck needs at least one slide.'); return; } applyDeckOp(deleteSlide(source, curIndex)); notify('Slide deleted.'); };
	const opMove = (dir: -1 | 1) => applyDeckOp(moveSlide(source, curIndex, curIndex + dir));
	// Insert a library component as a new slide after the current one (its authored
	// skeleton), via the same deck-op the toolbar uses.
	const onInsertComponent = (c: ComponentEntry) => { applyDeckOp(addSlideAfter(source, curIndex, c.skeleton)); notify(`Inserted “${c.name}”.`); };

	// ── Version history (checkpoints) ────────────────────────────────────────
	// Load the active deck's checkpoints when it changes.
	React.useEffect(() => setCheckpoints(loadCheckpoints(deck.id)), [deck.id]);
	const checkpoint = React.useCallback((label: string) => setCheckpoints(saveCheckpoint(deck.id, source, label, Date.now())), [deck.id, source]);
	const saveVersion = () => { checkpoint('Saved version'); notify('Version saved to history.'); };
	function restoreCheckpoint(cp: Checkpoint) {
		// Snapshot the current state first so a restore is itself reversible.
		saveCheckpoint(deck.id, source, 'Before restore', Date.now());
		setSource(cp.source);
		setActiveSlide(0);
		setCheckpoints(loadCheckpoints(deck.id));
		requestAnimationFrame(() => editorRef.current?.revealSlide(0));
		notify('Version restored.');
	}

	// ── Architect body (cards) — shared by the desktop column and the sheet ──
	// Speaker note for the slide in view — authored in the Inspector, written into
	// the slide's source as a `<!-- note: … -->` comment (the engine surfaces it in
	// the presenter view / PDF notes). Local draft so typing doesn't rewrite the
	// source per keystroke; committed on blur.
	const curNote = React.useMemo(() => getNote(slides[activeFullIndex] ?? ''), [slides, activeFullIndex]);
	const [noteDraft, setNoteDraft] = React.useState(curNote);
	// biome-ignore lint/correctness/useExhaustiveDependencies: reseed the draft when the active slide's note changes.
	React.useEffect(() => setNoteDraft(curNote), [curNote, activeFullIndex]);
	const commitNote = () => {
		const chunk = slides[activeFullIndex];
		if (chunk == null || noteDraft === curNote) return;
		setSource(replaceSlide(source, activeFullIndex, setNote(chunk, noteDraft)).source);
	};

	// Apply an AI chat edit — checkpoint the pre-edit deck first (reversible from
	// History), then swap in the proposed source.
	const applyChatEdit = (next: string) => {
		setCheckpoints(saveCheckpoint(deck.id, source, 'Before AI chat edit', Date.now()));
		setSource(next);
		setActiveSlide(0);
		requestAnimationFrame(() => editorRef.current?.revealSlide(0));
	};

	const architectCards = (
		<>
			{issues > 0 && (
				<div className="mx-2.5 mt-2.5 flex items-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--chart-2,#9c3f00)_28%,transparent)] bg-[color-mix(in_srgb,var(--chart-2,#9c3f00)_7%,transparent)] px-3 py-2">
					<AlertTriangle className="size-4 text-[var(--chart-2,#9c3f00)]" />
					<span className="text-xs font-semibold text-[var(--text-heading)]">{issues} inline issue{issues > 1 ? 's' : ''}</span>
					<button type="button" onClick={() => editorRef.current?.fixAll()} className="ml-auto rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-[var(--accent)]">Fix all</button>
				</div>
			)}
			<ArchCard tag={<IntentTag intent={deckScore.intent} />} title="Board-ready">
				<div className="flex items-baseline gap-2"><span className="font-sans text-[28px] font-extrabold leading-none text-[var(--text-heading)]">{deckScore.score.toFixed(1)}</span><span className="text-[13px] text-muted-foreground">/ 10 · boardroom</span></div>
				<div className="mt-2 space-y-1.5 text-xs">
					{deckScore.rows.map((r) => <ScoreRow key={r.label} ok={r.ok} label={r.label} v={r.note} />)}
				</div>
			</ArchCard>
			<ArchCard tag={<IntentTag intent="info" label="COACH" />} title="Tighten the story">
				<p className="text-xs leading-relaxed text-muted-foreground">Lead every slide with its takeaway, not its detail — the number, then the supporting rows.{!ai.ready && <span className="text-[var(--text-muted)]"> Connect a model in Workspace for one-click rewrites.</span>}</p>
				<Chip busy={aiBusy === 'lead'} onClick={() => runArchitectAction('lead', 'Rewrite lead', `Rewrite slide ${activeFullIndex + 1} so it opens with its single headline takeaway or number, then the supporting rows. Return the whole slide, same component.`)}>Rewrite lead</Chip>
			</ArchCard>
			<ArchCard tag={<IntentTag intent="info" label="RESHAPE" />} title="Reshape for a reader">
				<p className="text-xs leading-relaxed text-muted-foreground">Reorient the deck without losing the source.</p>
				<div className="mt-2 flex flex-wrap gap-1.5"><Chip onClick={() => { setLens('exec'); notify('Preview reshaped to the Exec summary — headline slides only.'); }}>Exec summary</Chip><Chip busy={aiBusy === 'technical'} onClick={() => runArchitectAction('technical', 'Reshape: Technical', 'Rewrite the deck in a more technical, detail-forward voice — concrete metrics, methods, and specifics over narrative. Edit each slide that needs it; keep the component types.')}>Technical</Chip><Chip busy={aiBusy === 'narrative'} onClick={() => runArchitectAction('narrative', 'Reshape: Narrative', 'Rewrite the deck in a more narrative, story-forward voice — a throughline from problem to payoff, plain language. Edit each slide that needs it; keep the component types.')}>Narrative</Chip></div>
			</ArchCard>
		</>
	);

	// The Architect panel: a Coach/Chat toggle over the static cards or the real
	// conversational thread (with reviewable apply/discard diff cards).
	const architectBody = (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex shrink-0 gap-1 px-2.5 pt-2.5">
				<button type="button" onClick={() => setArchitectTab('coach')} aria-pressed={architectTab === 'coach'} className={cn('flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-semibold', architectTab === 'coach' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-border text-muted-foreground')}>Coach</button>
				<button type="button" onClick={() => setArchitectTab('chat')} aria-pressed={architectTab === 'chat'} className={cn('flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-semibold', architectTab === 'chat' ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-border text-muted-foreground')}>Chat</button>
			</div>
			{architectTab === 'coach' ? <div className="min-h-0 flex-1 overflow-y-auto">{architectCards}</div> : <ArchitectChat deckId={deck.id} source={source} aiReady={ai.ready} onApply={applyChatEdit} onConnect={() => setWorkspaceOpen(true)} notify={notify} />}
		</div>
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
					{savedThemes.length > 0 && (
						<div className="mt-2.5 space-y-0.5">
							<div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">Saved themes</div>
							{savedThemes.map((t) => (
								<div key={t.id} className="group flex items-center gap-1.5 rounded-md px-1 py-1 hover:bg-[var(--accent-soft)]">
									<button type="button" onClick={() => applyPalette(t.name)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
										<span className="size-3.5 shrink-0 rounded-full border border-border" style={{ background: t.essentials?.accent ?? 'var(--accent)' }} />
										<span className="truncate text-[12.5px] font-semibold text-[var(--text-heading)]">{t.label}</span>
										{palette === t.name && <span className="ml-auto text-[12px] text-[var(--accent)]">✓</span>}
									</button>
									<button type="button" onClick={() => removeTheme(t)} aria-label={`Delete ${t.label}`} className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-[var(--text-heading)] group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
								</div>
							))}
						</div>
					)}
				</Field>
				<Field label="Size">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Control>{SIZE_LABELS[deckSize] ?? deckSize} <ChevronDown className="size-3.5" /></Control>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-40">
							{SIZES.map((s) => (
								<DropdownMenuItem key={s.value} onSelect={() => setDeckSize(s.value)}>{s.label}{deckSize === s.value && <span className="ml-auto text-[var(--accent)]">✓</span>}</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</Field>
				<Field label="Page numbers"><Toggle label="Page numbers" on={pageNumbers} onClick={togglePageNumbers} /></Field>
				<Field label="Running header"><Toggle label="Running header" on={headerFooter} onClick={toggleHeaderFooter} /></Field>
			</InspGroup>
			<InspGroup icon={<Wand2 className="size-3.5" />} label="Authoring">
				<Field label="Inline validation"><Toggle label="Inline validation" on={validation} onClick={() => { setValidation((v) => { notify(v ? 'Inline validation off — the editor stops flagging components.' : 'Inline validation on — unknown components are flagged again.'); return !v; }); }} /></Field>
			</InspGroup>
			<InspGroup icon={<FileText className="size-3.5" />} label={`Speaker notes — slide ${activeFullIndex + 1}`}>
				<textarea
					value={noteDraft}
					onChange={(e) => setNoteDraft(e.target.value)}
					onBlur={commitNote}
					rows={3}
					aria-label="Speaker note for this slide"
					placeholder="What you'll say on this slide — read aloud in Present, exported as PDF/PPTX notes."
					className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-[12.5px] leading-relaxed text-foreground outline-none focus:border-[var(--accent)]"
				/>
			</InspGroup>
			<InspGroup icon={<History className="size-3.5" />} label="History">
				<button type="button" onClick={saveVersion} className="mb-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[12.5px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"><Save className="size-3.5" />Save a version</button>
				{checkpoints.length === 0 ? (
					<p className="px-0.5 py-1 text-[11.5px] leading-relaxed text-muted-foreground">No saved versions yet. Versions are also captured automatically before each AI edit.</p>
				) : (
					<ul className="max-h-[180px] space-y-0.5 overflow-y-auto">
						{checkpoints.map((cp) => (
							<li key={cp.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-[var(--accent-soft)]">
								<span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[var(--text-heading)]">{cp.label}</span><span className="block font-mono text-[10.5px] text-muted-foreground">{timeAgo(cp.ts)} · {metaFor(cp.source)}</span></span>
								<button type="button" onClick={() => restoreCheckpoint(cp)} className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)] opacity-0 hover:bg-background group-hover:opacity-100">Restore</button>
							</li>
						))}
					</ul>
				)}
			</InspGroup>
			<InspGroup icon={<Volume2 className="size-3.5" />} label="Read">
				<Field label="Voice"><Control onClick={() => notify('Read-aloud voice — Aria, Cedar, and more in the full app.')}>Aria <ChevronDown className="size-3.5" /></Control></Field>
				<Field label="Pace"><Control onClick={() => notify('Read-aloud pace — slower for boardrooms, faster for review.')}>Steady <ChevronDown className="size-3.5" /></Control></Field>
			</InspGroup>
			<InspGroup icon={<Sparkles className="size-3.5" />} label="Lenses" last>
				<Lens on={composeLens === 'full'} icon={<FileText className="size-3.5" />} name="Full deck" desc="The canonical source" badge="source" onClick={() => setLens('full')} />
				<Lens on={composeLens === 'exec'} icon={<Sparkles className="size-3.5" />} name="Exec summary" desc="Headline slides only" onClick={() => setLens('exec')} />
				<Lens on={composeLens === 'onepager'} icon={<LayoutGrid className="size-3.5" />} name="One-pager" desc="The single key slide" onClick={() => setLens('onepager')} />
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
				{components.length > 0 && <button type="button" onClick={() => setInsertOpen(true)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-sans text-[12px] font-semibold normal-case tracking-normal text-[var(--accent)] hover:bg-[var(--accent-soft)]"><Plus className="size-3" />Insert</button>}
				<button type="button" onClick={() => editorRef.current?.fixAll()} className="rounded-md border border-border px-2 py-1 font-sans text-[12px] font-semibold normal-case tracking-normal text-[var(--accent)] disabled:opacity-40" disabled={!issues}>Fix all</button>
				<span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 font-sans text-[12px] font-semibold normal-case tracking-normal text-foreground"><FileText className="size-3" />Markdown</span>
			</div>
			<Editor ref={editorRef} value={source} onChange={setSource} knownComponents={validation ? KNOWN : NO_KNOWN} completionComponents={components} lintVocab={lintVocab} onCursorSlide={onEditorCursorSlide} className="flex-1" />
		</section>
	);

	// ── Preview pane (live engine render) — shared by all breakpoints ────────
	const previewPane = (
		<section className="flex min-h-0 flex-1 flex-col overflow-hidden">
			<div className="flex items-center gap-2 border-b border-border px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
				Preview
				{composeLens !== 'full' && (
					<button type="button" onClick={() => setLens('full')} className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 font-sans text-[11px] font-semibold normal-case tracking-normal text-[var(--accent)]" aria-label="Clear reader lens">
						<Sparkles className="size-3" />{LENS_LABEL[composeLens]} · {viewSlides.length} of {slides.length}<X className="size-3" />
					</button>
				)}
				<span className="flex-1" />
				<button type="button" onClick={() => goToSlide(slideNo - 2)} className="rounded px-1.5 text-muted-foreground hover:text-[var(--accent)]" aria-label="Previous slide">‹</button>
				<span className="rounded-full border border-border bg-card px-2 py-0.5 font-sans text-[12px] font-semibold normal-case tracking-normal text-[var(--text-heading)]">Slide {slideNo} / {viewSlides.length}</span>
				<button type="button" onClick={() => goToSlide(slideNo)} className="rounded px-1.5 text-muted-foreground hover:text-[var(--accent)]" aria-label="Next slide">›</button>
			</div>
			<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-card p-4 sm:p-5">
				<DeckPreview options={options} sample={fm ? fm + slide : slide} mermaid={false} paletteOverride={activeTheme?.name} extraTheme={extraTheme} className="relative aspect-video w-full max-w-[760px] overflow-hidden rounded-xl border border-border bg-background shadow-[0_8px_24px_rgba(10,22,40,.10)]" aria-label="Live deck preview" />
			</div>
			{/* Slide navigator — jump to any slide, see its component type */}
			<div className="flex items-center gap-1.5 border-t border-border bg-background px-3 py-2">
				{composeLens === 'full' && (
					<div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
						<RailOp label="Add slide" onClick={opAddSlide}><Plus className="size-3.5" /></RailOp>
						<RailOp label="Duplicate slide" onClick={opDuplicate}><Copy className="size-3.5" /></RailOp>
						<RailOp label="Move slide left" onClick={() => opMove(-1)} disabled={curIndex <= 0}><ChevronLeft className="size-3.5" /></RailOp>
						<RailOp label="Move slide right" onClick={() => opMove(1)} disabled={curIndex >= slides.length - 1}><ChevronRight className="size-3.5" /></RailOp>
						<RailOp label="Delete slide" onClick={opDelete} disabled={slides.length <= 1} danger><Trash2 className="size-3.5" /></RailOp>
					</div>
				)}
			<nav className="flex items-center gap-1.5 overflow-x-auto" aria-label="Slide navigator">
				{viewSlides.map((s, i) => {
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
			</div>
			<div className="flex items-center gap-3 border-t border-border px-4 py-1.5 font-mono text-[11px] text-muted-foreground">
				<span className="inline-flex items-center gap-1 text-[var(--chart-3,#2e6f00)]">● Live</span>
				<span className="truncate">{palette} · {mode}</span>
				<span className="flex-1" /><span className="hidden sm:inline">16 : 9 · {viewSlides.length} slide{viewSlides.length === 1 ? '' : 's'}</span>
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
						<DropdownMenuItem onSelect={() => newDeck()}><Plus className="size-4" />New deck</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => importInputRef.current?.click()}><Upload className="size-4" />Import deck…</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<span className="hidden h-5 w-px bg-border sm:block" />

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button type="button" className="flex min-w-0 max-w-[150px] items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))] sm:max-w-[260px] sm:px-2.5">
							<span className="size-2 shrink-0 rounded-full bg-primary" />
							<span className="truncate text-sm font-semibold text-[var(--text-heading)]">{deck.title}</span>
							<span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{metaFor(source)}</span>
							<ChevronDown className="size-4 shrink-0 text-muted-foreground" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-72">
						<DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Switch deck</DropdownMenuLabel>
						{decks.map((d) => (
							<DropdownMenuItem key={d.id} onSelect={() => loadDeck(d)} className="group">
								<span className={cn('size-2 rounded-full', d.id === deck.id ? 'bg-[var(--accent)]' : 'bg-primary')} />
								<span className="truncate font-semibold text-[var(--text-heading)]">{d.title}</span>
								<span className="ml-auto flex items-center gap-1.5">
									<span className="font-mono text-[11px] text-muted-foreground group-hover:hidden">{d.meta}</span>
									{decks.length > 1 && (
										<button type="button" aria-label={`Delete ${d.title}`} className="hidden rounded p-0.5 text-muted-foreground hover:text-[var(--fail,#b3261e)] group-hover:block" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeDeck(d.id); }}><Trash2 className="size-3.5" /></button>
									)}
								</span>
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => { const t = window.prompt('Rename deck', deck.title); if (t != null) renameActiveDeck(t); }}><PencilLine className="size-4" />Rename “{deck.title}”</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => newDeck()}><Plus className="size-4" />New deck</DropdownMenuItem>
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
						{savedThemes.length > 0 && <DropdownMenuSeparator />}
						{savedThemes.map((t) => (
							<DropdownMenuItem key={t.id} onSelect={() => applyPalette(t.name)}>
								<span className="size-3.5 rounded-full border border-border" style={{ background: t.essentials?.accent ?? 'var(--accent)' }} />
								<span className="truncate">{t.label}</span>
								{t.name === palette && <span className="ml-auto text-[var(--accent)]">✓</span>}
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
				<Fabricate options={options} onClose={() => setView('compose')} notify={notify} onSaved={refreshThemes} />
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
						<aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-card">
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
							<div className="flex min-h-0 flex-1 flex-col overflow-hidden">{architectBody}</div>
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
			<ShareSheet open={shareOpen} onOpenChange={setShareOpen} deckTitle={deck.title} source={source} options={options} palette={palette} mode={mode === 'dark' ? 'dark' : 'light'} extraTheme={extraTheme} onPresent={() => setPresentOpen(true)} notify={notify} />
			<WorkspaceSheet open={workspaceOpen} onOpenChange={setWorkspaceOpen} notify={notify} />
			<PresentOverlay open={presentOpen} onClose={() => setPresentOpen(false)} options={options} slides={slides} frontMatter={fm} startIndex={activeFullIndex} paletteOverride={activeTheme?.name} extraTheme={extraTheme} notify={notify} />
			<CommandPalette
				open={cmdOpen}
				onOpenChange={setCmdOpen}
				decks={decks}
				palettes={PALETTES}
				onPickDeck={loadDeck}
				onPalette={applyPalette}
				onPresent={() => setPresentOpen(true)}
				onShare={() => setShareOpen(true)}
				onFabricate={() => setView('fabricate')}
				onReshape={() => setInspectorOpen(true)}
				onInsert={components.length > 0 ? () => setInsertOpen(true) : undefined}
			/>
			<InsertComponent open={insertOpen} onOpenChange={setInsertOpen} components={components} onInsert={onInsertComponent} />
			{/* Hidden file input for "Import deck…" (.md upload). */}
			<input ref={importInputRef} type="file" accept=".md,.markdown,.mdx,text/markdown,text/plain" onChange={onImportFile} className="hidden" aria-hidden="true" tabIndex={-1} />

			{/* Transient toast — no dead clicks in the prototype */}
			{toast && (
				<div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center px-4">
					<div className="max-w-[min(92vw,440px)] rounded-full border border-border bg-[var(--surface-inverse)] px-4 py-2 text-center text-[13px] font-medium text-white shadow-[0_8px_24px_rgba(10,22,40,.22)]">{toast}</div>
				</div>
			)}
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
function RailOp({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
	return (
		<button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={cn('grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:opacity-30 disabled:hover:bg-transparent', danger && 'hover:bg-[color-mix(in_srgb,var(--fail,#b3261e)_12%,transparent)] hover:text-[var(--fail,#b3261e)]')}>{children}</button>
	);
}
function Chip({ children, onClick, busy }: { children: React.ReactNode; onClick?: () => void; busy?: boolean }) {
	return <button type="button" onClick={onClick} disabled={busy} className="mt-2 mr-1.5 inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] text-[var(--accent)] disabled:opacity-60">{busy && <Sparkles className="size-3 animate-pulse" />}{children}</button>;
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
// Forwards ref + props so it can be a Radix `asChild` trigger (the Size menu).
const Control = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ children, ...props }, ref) => (
	<button ref={ref} type="button" {...props} className="inline-flex min-w-[96px] items-center justify-between gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--text-heading)] hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]">{children}</button>
));
Control.displayName = 'Control';
function Toggle({ on, onClick, label }: { on?: boolean; onClick?: () => void; label?: string }) {
	return (
		<button type="button" role="switch" aria-checked={!!on} aria-label={label} onClick={onClick} className={cn('relative h-[22px] w-[38px] rounded-full transition-colors', on ? 'bg-primary' : 'bg-border')}>
			<span className={cn('absolute top-[2px] size-[18px] rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-[2px]')} />
		</button>
	);
}
function Lens({ on, icon, name, desc, badge, onClick }: { on?: boolean; icon: React.ReactNode; name: string; desc: string; badge?: string; onClick?: () => void }) {
	return (
		<button type="button" onClick={onClick} className={cn('my-1.5 flex w-full cursor-pointer items-center gap-2.5 rounded-md border px-2.5 py-2 text-left', on ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-border')}>
			<span className={cn('grid size-[26px] place-items-center rounded-[7px]', on ? 'bg-primary text-primary-foreground' : 'bg-[var(--accent-soft)] text-[var(--accent)]')}>{icon}</span>
			<span><div className="text-[12.5px] font-semibold text-[var(--text-heading)]">{name}</div><div className="text-[11px] text-muted-foreground">{desc}</div></span>
			{badge && <span className="ml-auto rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--accent)]">{badge}</span>}
		</button>
	);
}
