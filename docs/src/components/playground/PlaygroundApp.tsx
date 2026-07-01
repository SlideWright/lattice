import * as React from 'react';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CatalogItem, Lens } from '@/lib/component-search';
import {
	type Catalog,
	detectComponent,
	SOURCE_KEY,
	variantOptions,
	variantSource,
} from '@/lib/playground-controller';
import { createEngineBridge, type PreviewState } from '@/lib/playground-engine';
import { applyBbox } from '@/playground/bbox-overlay.js';
import { bboxEnabled, onBboxEnabledChange } from '@/playground/bbox-prefs.js';
import { readFrontMatter } from '@/playground/deck-config.js';
import { createChartInteract } from '@/playground/drawing-board-chart-interact.js';
import { BoundingBoxToggle } from './BoundingBoxToggle';
import { ComponentPicker } from './ComponentPicker';
import { DeckSetupSheet } from './DeckSetupSheet';
import { type EditorAdapter, EditorHost } from './EditorHost';
import { GalleriesSheet, type GalleryGroup } from './GalleriesSheet';

const DEBOUNCE_MS = 220;

export type PlaygroundData = {
	catalog: Catalog;
	components: CatalogItem[];
	lenses: Lens[];
	gallerySources: Record<string, string>;
	galleryGroups: GalleryGroup[];
	themeBase: string;
	runtimeUrl: string;
	engineUrl: string;
	palettes: string[];
	finishes: string[];
	// Deck-grammar lint vocabulary for the editor's inline validation (optional so
	// the test harness can omit it). Passed straight to EditorHost → createEditor.
	lintVocab?: unknown;
	starter: string;
};

/**
 * The playground controller — the React port of the old inline IIFE
 * (playground.astro:407-714). React owns the chrome (pickers, tabs, sheets,
 * status) and the orchestration (debounced render, fresh-vs-patch, variant
 * population, component detection, source persistence, palette/mode reaction).
 * The irreducible engine pieces are WRAPPED: the CodeMirror editor (EditorHost),
 * the marp render + filmstrip iframe (playground-engine → window globals), and
 * the config panel (DeckSetupSheet). None are reimplemented.
 */
export function PlaygroundApp({ data }: { data: PlaygroundData }) {
	const { catalog, components, lenses, gallerySources, galleryGroups, themeBase, runtimeUrl, engineUrl, palettes, finishes, lintVocab, starter } = data;

	const [currentName, setCurrentName] = React.useState('');
	const [variant, setVariant] = React.useState('default');
	const [status, setStatus] = React.useState('Ready.');
	const [isError, setIsError] = React.useState(false);
	const [pane, setPane] = React.useState<'edit' | 'preview'>('edit');
	const [sourceVersion, setSourceVersion] = React.useState(0); // drives DeckSetup cue

	const frameRef = React.useRef<HTMLIFrameElement>(null);
	// Live in-preview chart interaction: hover/tap a pie wedge in the rendered
	// preview to reveal its authored detail, as you edit — same parent-hosted
	// module + behaviour as the Drawing Board. Created on mount, re-bound after
	// each render (a srcdoc rewrite replaces the iframe doc). Export untouched.
	const chartInteractRef = React.useRef<{ rebind: () => void; destroy: () => void } | null>(null);
	const editorRef = React.useRef<EditorAdapter | null>(null);
	const engineRef = React.useRef(createEngineBridge(themeBase, runtimeUrl, engineUrl));
	const previewStateRef = React.useRef<PreviewState>({ frameSig: '', lastSections: null });
	const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const variants = React.useMemo(() => variantOptions(catalog, currentName), [catalog, currentName]);

	// ── Source accessors (prefer the live editor; safe before it mounts) ────────
	const getSource = React.useCallback(() => editorRef.current?.getValue() ?? starter, [starter]);
	const setSource = React.useCallback((text: string) => editorRef.current?.setValue(text), []);
	const saveSource = React.useCallback(() => {
		try {
			localStorage.setItem(SOURCE_KEY, getSource());
		} catch {
			/* private mode */
		}
	}, [getSource]);

	const setStatusLine = React.useCallback((msg: string, err = false) => {
		setStatus(msg);
		setIsError(err);
	}, []);

	// Whether the deck carries non-theme managed front matter — the Deck-setup
	// trigger cue. Recomputed each time the source changes (sourceVersion bumps).
	const [configured, setConfigured] = React.useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: sourceVersion is the explicit re-eval trigger; getSource reads the live editor.
	React.useEffect(() => {
		try {
			setConfigured(readFrontMatter(getSource()).configured);
		} catch {
			setConfigured(false);
		}
	}, [sourceVersion]);

	// Debug bounding boxes — colour-coded element outlines in the preview. `bboxOn`
	// is the live (session) state: the toolbar button flips it temporarily, the
	// deck-setup drawer's switch flips the PERSISTED default (bbox-prefs), and we
	// seed from / follow that default here. A ref mirrors the live value so the
	// iframe's onLoad re-applies after each full srcdoc rewrite without a stale
	// closure. applyBbox no-ops until the iframe has a document.
	const [bboxOn, setBboxOn] = React.useState(false);
	const bboxOnRef = React.useRef(bboxOn);
	bboxOnRef.current = bboxOn;
	React.useEffect(() => {
		setBboxOn(bboxEnabled());
		const unsubscribe = onBboxEnabledChange(setBboxOn);
		return () => {
			unsubscribe();
		};
	}, []);
	React.useEffect(() => {
		applyBbox(frameRef.current, bboxOn);
	}, [bboxOn]);
	// Re-inject after every full srcdoc rewrite (deck swap / theme / mode / size).
	// Section patches keep the document — and the injected <style> — alive.
	const onFrameLoad = React.useCallback(() => {
		applyBbox(frameRef.current, bboxOnRef.current);
	}, []);

	// ── The render loop (wraps the engine; never reimplements it) ───────────────
	const render = React.useCallback(
		async (fresh: boolean) => {
			const frame = frameRef.current;
			if (!frame) return;
			const engine = engineRef.current;
			if (!engine.ready()) {
				setStatusLine('Loading engine…');
				timerRef.current = setTimeout(() => render(fresh), 60);
				return;
			}
			const root = document.documentElement;
			const palette = root.getAttribute('data-palette') || 'indaco';
			const mode = root.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
			setStatusLine('Rendering…');
			const r = await engine.renderInto(frame, getSource(), palette, mode, previewStateRef.current, fresh);
			if (r.status === 'pending') {
				timerRef.current = setTimeout(() => render(fresh), 60);
			} else if (r.status === 'error') {
				setStatusLine(r.message, true);
			} else {
				previewStateRef.current = r.state;
				setStatusLine(`Rendered ${r.count} slide(s).`);
				// Drop the loading skeleton once real slides have painted (the iframe
				// is opaque and covers the host; this removes the placeholder behind it).
				frame.parentElement?.classList.add('is-live');
				// Re-bind the hover layer to the (possibly new) iframe document.
				chartInteractRef.current?.rebind();
			}
		},
		[getSource, setStatusLine],
	);

	const scheduleRender = React.useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => render(false), DEBOUNCE_MS);
	}, [render]);

	// freshRender resets the iframe (explicit deck swaps); render(false) patches.
	const freshRender = React.useCallback(() => {
		// A deck swap sets the editor source programmatically, and CodeMirror's
		// setValue dispatches synchronously — firing onChange → onEdit →
		// scheduleRender, which queues a DEBOUNCED patch render. That pending render
		// races THIS authoritative fresh render: on a slow connection (or a large
		// deck) the fresh srcdoc has not finished loading when the debounced render
		// fires ~220ms later, so it re-writes the iframe — a second full srcdoc write
		// that reloads the preview and flashes. Cancel it; the fresh render supersedes
		// any queued patch. (Cheap insurance: with fast loads it would merely patch.)
		if (timerRef.current) clearTimeout(timerRef.current);
		previewStateRef.current = { ...previewStateRef.current, frameSig: '' };
		render(true);
	}, [render]);

	// Mount the parent-hosted chart-interact layer over the preview iframe once,
	// for the component's lifetime (render() calls rebind() after each paint).
	React.useEffect(() => {
		const frame = frameRef.current;
		const stage = frame?.parentElement;
		if (!frame || !stage) return;
		const ci = createChartInteract({ stage, getFrame: () => frameRef.current ?? frame, hoverAny: true });
		chartInteractRef.current = ci;
		return () => {
			ci.destroy();
			chartInteractRef.current = null;
		};
	}, []);

	// ── Picker sync (reflect what the editor holds) ─────────────────────────────
	const syncPickers = React.useCallback(() => {
		const det = detectComponent(catalog, getSource());
		if (!det) return;
		setCurrentName((prev) => (prev !== det.name ? det.name : prev));
		setVariant(det.variant);
	}, [catalog, getSource]);

	// ── Edit handler: persist, sync pickers, debounced patch render ─────────────
	const onEdit = React.useCallback(() => {
		saveSource();
		setSourceVersion((v) => v + 1);
		syncPickers();
		scheduleRender();
	}, [saveSource, syncPickers, scheduleRender]);

	// ── Editor ready: restore persisted source, then first render ───────────────
	const onEditorReady = React.useCallback(
		(adapter: EditorAdapter) => {
			editorRef.current = adapter;
			try {
				const saved = localStorage.getItem(SOURCE_KEY);
				if (saved != null) adapter.setValue(saved);
			} catch {
				/* private mode */
			}
			syncPickers();
			setSourceVersion((v) => v + 1);
			render(false);
		},
		[syncPickers, render],
	);

	// ── Deck swaps (pick / variant / gallery / scaffold) ────────────────────────
	const applyDeck = React.useCallback(
		(md: string, opts?: { toPreview?: boolean }) => {
			setSource(md);
			saveSource();
			setSourceVersion((v) => v + 1);
			syncPickers();
			if (opts?.toPreview) setPane('preview');
			freshRender();
		},
		[setSource, saveSource, syncPickers, freshRender],
	);

	// Picking a component / variant swaps the deck AND switches to Preview, the same
	// as a gallery load (applyDeck's `toPreview`). Without it, on the mobile single-
	// pane layout the pick renders into the still-hidden (display:none, zero-width)
	// Edit pane, so the deck scales against a 0-width iframe and the FIT gate leaves
	// it blank until you manually toggle to Preview — and even then the reveal races
	// a browser-dependent ResizeObserver (blank on iOS Safari). Auto-switching routes
	// the pick through the same proven reveal path galleries already use.
	const onPickComponent = React.useCallback(
		(name: string) => {
			if (!catalog[name]) return;
			setCurrentName(name);
			setVariant('default');
			applyDeck(catalog[name].sample, { toPreview: true });
		},
		[catalog, applyDeck],
	);

	const onVariantChange = React.useCallback(
		(key: string) => {
			setVariant(key);
			if (currentName) applyDeck(variantSource(catalog, currentName, key), { toPreview: true });
		},
		[catalog, currentName, applyDeck],
	);

	const onLoadGallery = React.useCallback(
		(id: string) => {
			const src = gallerySources[id];
			if (src == null) {
				setStatusLine('Gallery unavailable.', true);
				return;
			}
			applyDeck(src, { toPreview: true });
		},
		[gallerySources, applyDeck, setStatusLine],
	);

	const onResetExample = React.useCallback(() => {
		if (currentName && catalog[currentName]) applyDeck(catalog[currentName].sample);
		else setStatusLine('Pick a component first.', true);
	}, [currentName, catalog, applyDeck, setStatusLine]);

	const onInsertSkeleton = React.useCallback(() => {
		if (currentName && catalog[currentName]) applyDeck(catalog[currentName].skeleton);
		else setStatusLine('Pick a component first.', true);
	}, [currentName, catalog, applyDeck, setStatusLine]);

	// ── Re-render when <html> data-palette / data-mode change ───────────────────
	React.useEffect(() => {
		const root = document.documentElement;
		const obs = new MutationObserver(() => render(false));
		obs.observe(root, { attributes: true, attributeFilter: ['data-palette', 'data-mode'] });
		return () => obs.disconnect();
	}, [render]);

	// Trigger the on-demand engine load once the chrome has mounted/painted. The
	// preview is core to the playground, so load it promptly (on idle / next
	// tick) — but NOT eagerly in <head>, so the toolbar + editor host paint
	// first. The render loop already polls window.LatticePlayground, so the first
	// render fires as soon as the bundle resolves.
	React.useEffect(() => {
		const engine = engineRef.current;
		const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
		if (ric) {
			ric(() => engine.ensure());
		} else {
			const t = setTimeout(() => engine.ensure(), 0);
			return () => clearTimeout(t);
		}
	}, []);

	// Cleanup any pending timer on unmount.
	React.useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	const onTab = (which: 'edit' | 'preview') => {
		setPane(which);
		if (which === 'preview') render(false);
	};
	// `pane` is the SINGLE source of truth for which pane is active; the body
	// data-pane attribute (the mobile single-pane layout keys off it —
	// playground.css `body[data-pane='…']`) mirrors it from one effect. Driving it
	// here — not inside onTab — keeps it in sync no matter HOW the pane changed: a
	// tab click (onTab) OR a programmatic switch (applyDeck's `toPreview`, fired by
	// a gallery load). Setting data-pane only in onTab was the bug that left the
	// body stuck on 'edit' — preview hidden — while the React tab read 'preview'
	// after loading a gallery (the "flips to preview but the deck isn't shown,
	// click Edit then Preview to fix it" report).
	React.useEffect(() => {
		document.body.setAttribute('data-pane', pane);
		// Reveal a deck that was rendered while this pane was display:none (0-width):
		// on mobile the inactive pane is hidden, so a component/variant pick renders
		// the deck into a zero-width iframe and the FIT gate keeps `.lattice` hidden
		// (it can't scale a 0-width box). This effect runs AFTER the attribute above
		// makes the pane visible, so re-running the in-iframe FIT agent now measures
		// the real width and flips the deck visible. Direct (not a re-render) so it
		// can't race the fresh srcdoc write on a gallery/pick load. Mirrors the
		// Drawing Board, whose setPane sets data-pane THEN renders (drawing-board-pane.js).
		if (pane === 'preview') frameRef.current?.contentWindow?.__latticeFit?.();
	}, [pane]);
	React.useEffect(() => () => document.body.removeAttribute('data-pane'), []);

	return (
		<div className="lx-ui contents">
			{/* Toolbar */}
			<div className="pg-bar">
				<div className="pg-bar-pickers">
					<div className="pg-picker pg-template-picker">
						<label className="pg-picker-label" htmlFor="pg-template-trigger">
							Component
						</label>
						<ComponentPicker components={components} lenses={lenses} current={currentName} onPick={onPickComponent} />
					</div>
					<div className="pg-picker pg-variant-picker">
						<label className="pg-picker-label" htmlFor="pg-variant">
							Variant
						</label>
						<Select value={variants.length ? variant : ''} onValueChange={onVariantChange} disabled={!variants.length}>
							<SelectTrigger id="pg-variant" size="sm" aria-label="Component variant" className="w-full">
								<SelectValue placeholder="—" />
							</SelectTrigger>
							<SelectContent>
								{variants.map((v) => (
									<SelectItem key={v.value} value={v.value} title={v.title}>
										{v.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="pg-bar-actions">
					<Tabs value={pane} onValueChange={(v) => onTab(v as 'edit' | 'preview')} className="pg-mobile-tabs">
						<TabsList>
							<TabsTrigger value="edit">Edit</TabsTrigger>
							<TabsTrigger value="preview">Preview</TabsTrigger>
						</TabsList>
					</Tabs>
					<span
						className={`pg-status${isError ? ' err' : ''}`}
						role="status"
						aria-live="polite"
					>
						{status}
					</span>
					<BoundingBoxToggle on={bboxOn} onToggle={() => setBboxOn((v) => !v)} />
					<DeckSetupSheet
						getSource={getSource}
						setSource={setSource}
						palettes={palettes}
						finishes={finishes}
						configured={configured}
					/>
					<GalleriesSheet
						groups={galleryGroups}
						hasComponent={Boolean(currentName)}
						onLoadGallery={onLoadGallery}
						onResetExample={onResetExample}
						onInsertSkeleton={onInsertSkeleton}
					/>
				</div>
			</div>

			{/* Split: editor | preview */}
			<main className="pg-split">
				<section className="pg-pane editor">
					<div className="pg-pane-label">Markdown</div>
					<EditorHost initialDoc={starter} vocab={lintVocab} onChange={onEdit} onReady={onEditorReady} />
				</section>
				<section className="pg-pane preview">
					<div className="pg-pane-label">Rendered slides</div>
					<div className="pg-preview-wrap">
						<iframe id="preview" ref={frameRef} title="Rendered slides preview" onLoad={onFrameLoad} />
					</div>
				</section>
			</main>
		</div>
	);
}

export default PlaygroundApp;
