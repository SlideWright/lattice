import * as React from 'react';
import {
	createSingleSlideRenderer,
	type SingleSlideOptions,
	type SingleSlideRenderer,
} from '@/lib/single-slide-render';

// The React single-slide wrapper over single-slide-render.ts — the plain
// single-stage bridge HeroPreview renders through for its Preview face: a figure
// host that live-renders ONE deck on engine-ready and re-renders on the global
// palette/mode flip, deferring while hidden (a tab panel). It NEVER reimplements
// the engine; it owns a stable renderer instance (like the old createLandingEngine
// ref). The font-embed fix rides in single-slide-render.ts, so every consumer
// (landing included) now registers the vendored Caveat/Shantell faces.
//
// RestyleShowcase (carousel) and FieldCardsLive (multi-host, renders null) keep
// their bespoke orchestration and drive createSingleSlideRenderer directly — the
// SAME shared renderer, just not through this declarative figure.

export type DeckPreviewProps = {
	/** Renderer config (themeBase / runtimeUrl / engineUrl) — built from page data. */
	options: SingleSlideOptions;
	/** Slide markdown to render. */
	sample: string;
	/** Whether the deck needs the mermaid runtime injected. */
	mermaid: boolean;
	/** Force a specific palette instead of the global `<html data-palette>`. */
	paletteOverride?: string;
	/** Render against a raw in-memory theme (Fabricate's live derived theme).
	 *  When set, `paletteOverride` should equal `extraTheme.name`. */
	extraTheme?: { name: string; css: string };
	/** Force a specific light/dark mode instead of the global `<html data-mode>`
	 *  — lets a surface audition a theme in both modes (Fabricate's specimen). */
	modeOverride?: 'light' | 'dark';
	/**
	 * Render only while true. Lets a host that may be hidden (a tab panel) defer
	 * the render until it is shown — re-renders on the rising edge.
	 */
	active?: boolean;
	className?: string;
	'aria-label'?: string;
	role?: React.AriaRole;
};

/**
 * A figure host that live-renders ONE deck through the shared renderer. Renders
 * on engine-ready (lazy bundle load) and re-renders on a global palette/mode
 * flip; defers while `active` is false and renders on the rising edge.
 */
export function DeckPreview({
	options,
	sample,
	mermaid,
	paletteOverride,
	extraTheme,
	modeOverride,
	active = true,
	className,
	role,
	...aria
}: DeckPreviewProps) {
	// One renderer instance for this host (holds the theme + font caches).
	// Lazy-init: `options` is rebuilt each render from page data, so construct the
	// renderer exactly once on first render and keep that instance thereafter
	// (avoids re-running createSingleSlideRenderer every render).
	const engineRef = React.useRef<SingleSlideRenderer | null>(null);
	if (engineRef.current === null) engineRef.current = createSingleSlideRenderer(options);
	const stageRef = React.useRef<HTMLElement>(null);
	const activeRef = React.useRef(active);
	activeRef.current = active;

	// Re-render when the theme's NAME or its CSS CONTENT changes. The live-derived
	// specimen has a content-hash name (so name alone would suffice), but a SAVED
	// library theme keeps a stable slug name while its CSS can change (re-save after
	// an edit) — so we must also depend on the css. Deps compare strings by value,
	// and `extraTheme.css` is a stable reference for a given theme, so identical
	// content never thrashes; only a real css change re-renders.
	// biome-ignore lint/correctness/useExhaustiveDependencies: extraTheme is read whole; its identity is captured by (name, css) — depending on the wrapper object would thrash.
	const render = React.useCallback(() => {
		const host = stageRef.current;
		if (host && activeRef.current) engineRef.current?.renderInto(host, sample, mermaid, paletteOverride, extraTheme, modeOverride);
	}, [sample, mermaid, paletteOverride, extraTheme?.name, extraTheme?.css, modeOverride]);

	// First render once the engine bundle has loaded.
	React.useEffect(() => {
		let cancelled = false;
		engineRef.current?.whenReady().then(() => {
			if (!cancelled) render();
		});
		return () => {
			cancelled = true;
		};
	}, [render]);

	// Re-render on palette / mode change (the shared topbar writes <html> attrs).
	React.useEffect(() => {
		const root = document.documentElement;
		let t: ReturnType<typeof setTimeout>;
		const obs = new MutationObserver(() => {
			clearTimeout(t);
			t = setTimeout(render, 80);
		});
		obs.observe(root, { attributes: true, attributeFilter: ['data-palette', 'data-mode'] });
		return () => {
			clearTimeout(t);
			obs.disconnect();
		};
	}, [render]);

	// Render on the rising edge of `active` (e.g. switching back to a tab).
	React.useEffect(() => {
		if (active) requestAnimationFrame(render);
	}, [active, render]);

	return <figure ref={stageRef} className={className} role={role} {...aria} />;
}

export default DeckPreview;
