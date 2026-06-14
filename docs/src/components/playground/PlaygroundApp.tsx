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
import { readFrontMatter } from '@/playground/deck-config.js';
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
	palettes: string[];
	finishes: string[];
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
	const { catalog, components, lenses, gallerySources, galleryGroups, themeBase, runtimeUrl, palettes, finishes, starter } = data;

	const [currentName, setCurrentName] = React.useState('');
	const [variant, setVariant] = React.useState('default');
	const [status, setStatus] = React.useState('Ready.');
	const [isError, setIsError] = React.useState(false);
	const [pane, setPane] = React.useState<'edit' | 'preview'>('edit');
	const [sourceVersion, setSourceVersion] = React.useState(0); // drives DeckSetup cue

	const frameRef = React.useRef<HTMLIFrameElement>(null);
	const editorRef = React.useRef<EditorAdapter | null>(null);
	const engineRef = React.useRef(createEngineBridge(themeBase, runtimeUrl));
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
		previewStateRef.current = { ...previewStateRef.current, frameSig: '' };
		render(true);
	}, [render]);

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

	const onPickComponent = React.useCallback(
		(name: string) => {
			if (!catalog[name]) return;
			setCurrentName(name);
			setVariant('default');
			applyDeck(catalog[name].sample);
		},
		[catalog, applyDeck],
	);

	const onVariantChange = React.useCallback(
		(key: string) => {
			setVariant(key);
			if (currentName) applyDeck(variantSource(catalog, currentName, key));
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

	// Cleanup any pending timer on unmount.
	React.useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, []);

	const onTab = (which: 'edit' | 'preview') => {
		setPane(which);
		document.body.setAttribute('data-pane', which);
		if (which === 'preview') render(false);
	};
	// Seed the body data-pane (mobile pane layout keys off it — playground.css).
	React.useEffect(() => {
		document.body.setAttribute('data-pane', 'edit');
		return () => document.body.removeAttribute('data-pane');
	}, []);

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
					<EditorHost initialDoc={starter} onChange={onEdit} onReady={onEditorReady} />
				</section>
				<section className="pg-pane preview">
					<div className="pg-pane-label">Rendered slides</div>
					<div className="pg-preview-wrap">
						<iframe id="preview" ref={frameRef} title="Rendered slides preview" />
					</div>
				</section>
			</main>
		</div>
	);
}

export default PlaygroundApp;
