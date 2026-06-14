import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createLandingEngine } from '@/lib/landing-engine';

// The hero's right panel: a Preview / Source flip (shadcn Tabs). Preview shows
// the live-rendered slide (engine-rendered, palette/mode-reactive); Source shows
// the syntax-highlighted Markdown that produced it. WRAPS the engine via
// landing-engine.ts — never reimplements the render. The left copy + CTAs stay
// in the Astro page (zero JS); only this interactive flip + live render hydrate.

export type HeroData = {
	sample: string;
	mermaid: boolean;
	codeHtml: string; // pre-highlighted source (built server-side in the Astro page)
	componentName: string;
	themeBase: string;
	runtimeUrl: string;
	engineUrl: string;
	frameCss: string;
};

export default function HeroPreview({ data }: { data: HeroData }) {
	const [view, setView] = React.useState<'preview' | 'source'>('preview');
	const stageRef = React.useRef<HTMLDivElement>(null);
	const engineRef = React.useRef(createLandingEngine(data.themeBase, data.runtimeUrl, data.frameCss, data.engineUrl));
	const viewRef = React.useRef(view);
	viewRef.current = view;

	const renderHero = React.useCallback(() => {
		const host = stageRef.current;
		if (host && viewRef.current === 'preview') engineRef.current.renderInto(host, data.sample, data.mermaid);
	}, [data.sample, data.mermaid]);

	// First render once the engine bundle has loaded.
	React.useEffect(() => {
		let cancelled = false;
		engineRef.current.whenReady().then(() => {
			if (!cancelled) renderHero();
		});
		return () => {
			cancelled = true;
		};
	}, [renderHero]);

	// Re-render on palette / mode change (the shared topbar writes <html> attrs).
	React.useEffect(() => {
		const root = document.documentElement;
		let t: ReturnType<typeof setTimeout>;
		const obs = new MutationObserver(() => {
			clearTimeout(t);
			t = setTimeout(renderHero, 80);
		});
		obs.observe(root, { attributes: true, attributeFilter: ['data-palette', 'data-mode'] });
		return () => {
			clearTimeout(t);
			obs.disconnect();
		};
	}, [renderHero]);

	// Render when switching back to Preview (the stage may have been hidden).
	const onView = (v: string) => {
		const next = v as 'preview' | 'source';
		setView(next);
		if (next === 'preview') requestAnimationFrame(renderHero);
	};

	return (
		<div className="lx-ui flex min-w-0 flex-col gap-3">
			<Tabs value={view} onValueChange={onView}>
				<TabsList aria-label="Hero view">
					<TabsTrigger value="preview">Preview</TabsTrigger>
					<TabsTrigger value="source">Source</TabsTrigger>
				</TabsList>

				<TabsContent value="preview">
					<figure
						ref={stageRef}
						className="live-host relative m-0 aspect-video w-full overflow-hidden rounded-[14px] border border-border bg-muted shadow-lg"
						aria-label={`A ${data.componentName} slide rendered by Lattice`}
					/>
				</TabsContent>

				<TabsContent value="source">
					<div className="aspect-video overflow-auto rounded-[14px] bg-[var(--bg-dark)] p-5 shadow-lg">
						<pre className="m-0 whitespace-pre font-mono text-[12.5px] leading-[1.65] text-[var(--on-dark)]">
							{/* Pre-highlighted server-side; spans carry .ln-* classes (landing.css keeps them). */}
							<code
								// biome-ignore lint/security/noDangerouslySetInnerHtml: source is escaped + highlighted server-side in the Astro page.
								dangerouslySetInnerHTML={{ __html: data.codeHtml }}
							/>
						</pre>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
