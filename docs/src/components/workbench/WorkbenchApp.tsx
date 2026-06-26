import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ensureEngine } from '@/lib/load-engine';
import { FACULTIES, type Faculty, readFaculty, writeFaculty } from '@/lib/workbench-controller';
import { initLayoutStudio } from '@/playground/component-studio.js';
import { initThemeStudio } from '@/playground/theme-studio.js';

export type WorkbenchData = {
	themeBase: string;
	runtimeUrl: string;
	engineUrl: string;
	shippedNames: string[];
	finishes: string[];
};

/**
 * The Workbench chrome — the React + shadcn port of the two-faculty page shell
 * (workbench.astro). React owns the static chrome (faculty Tabs, the action
 * buttons, the text inputs/name field, the CSS/skeleton textareas, the
 * theme-CSS Collapsible) and the faculty switch; the two vanilla studios
 * (theme-studio.js initThemeStudio + component-studio.js initLayoutStudio) are
 * WRAPPED, not reimplemented — they query the host elements + controls this
 * island renders by their exact class names / data-attributes and wire all the
 * behaviour. See engineering/decisions/2026-06-09-shadcn-migration.md §0.
 *
 * The deliberate vanilla boundary (the studios keep wiring these by selector,
 * so the markup carries the EXACT classes/attributes they query):
 *  - the studio-RENDERED widgets (starters, the native color essentials, the
 *    library lists, the contrast meter, the gate findings, the live preview
 *    iframe) — populated into empty host <div>s the studios own;
 *  - the mode buttons (.studio-mode-btn) + preview-setup toggle
 *    ([data-preview-setup]) — coupled to the studios' run()/preview-config;
 *  - the mobile pane tabs (.studio-tab[data-tab]) — wired by both studios AND
 *    clicked by the guided tour (workbench-tour.js) to reveal a hidden pane;
 *  - the identity selects (.lstudio-function/-form/-substance) — the studio
 *    populates their <option>s via innerHTML and reads .value, which a Radix
 *    Select cannot model, so they stay native <select>.
 *
 * CRITICAL — the two studio panels are React.memo + forwardRef so a faculty
 * switch (the ONLY re-render trigger) does NOT reconcile their subtrees. The
 * studios mutate volatile DOM imperatively (`.studio-mode-btn.is-active`, the
 * `.studio-tab.is-active` + `main[data-tab]` mobile pane, the AI `[hidden]`
 * connect/history); if React re-rendered the panels it would revert all of
 * that to the JSX literals on every faculty switch (a real desync — the mode
 * toggle would "lie", the mobile pane would snap back to Design). Memo (the
 * panels take no changing props) keeps React from ever touching them after
 * mount, so the studios' mutations survive. Faculty visibility is toggled
 * imperatively via refs (never remount), so the studio DOM is never destroyed.
 */
export function WorkbenchApp({ data }: { data: WorkbenchData }) {
	const [faculty, setFaculty] = React.useState<Faculty>('theme');
	const themeMainRef = React.useRef<HTMLElement>(null);
	const layoutMainRef = React.useRef<HTMLElement>(null);
	const studiosBooted = React.useRef(false);

	// Boot the two vanilla studios once the island's host elements are in the DOM.
	// The studios query their hosts/controls synchronously at init, so they MUST
	// run after this React tree mounts — not from a separate page script that
	// could fire before hydration. A single-init ref guards React StrictMode's
	// double-invoke (the R-B "wrap, don't reinvent" boundary). The studios attach
	// their own listeners + populate the host <div>s; we never reimplement them.
	React.useEffect(() => {
		if (studiosBooted.current) return;
		studiosBooted.current = true;
		initThemeStudio(data);
		initLayoutStudio(data);
		// Trigger the on-demand engine load after the chrome has mounted/painted
		// (on idle), not eagerly in <head> — so the faculty Tabs + controls paint
		// first. The studios already poll window.LatticePlayground, so the first
		// preview render fires as soon as the bundle resolves.
		const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
		if (data.engineUrl) {
			if (ric) ric(() => ensureEngine(data.engineUrl));
			else setTimeout(() => ensureEngine(data.engineUrl), 0);
		}
	}, [data]);

	// Rehydrate the saved faculty on mount (the studios read no faculty state;
	// this only governs which <main> is visible).
	React.useEffect(() => {
		setFaculty(readFaculty());
	}, []);

	// Mirror faculty → the DOM contract the vanilla studios + workbench.css read:
	// each <main> toggles `hidden`; when the Layout Studio becomes visible we
	// re-fit its preview via the exposed run handle (it may have been hidden when
	// its first render fired). Matches the old inline faculty script exactly.
	// Imperative (refs) — does NOT re-render the memoized panels.
	React.useEffect(() => {
		const isLayout = faculty === 'layout';
		if (themeMainRef.current) themeMainRef.current.hidden = isLayout;
		if (layoutMainRef.current) {
			layoutMainRef.current.hidden = !isLayout;
			if (isLayout) {
				const ls = (layoutMainRef.current as unknown as { __layoutStudio?: { run: () => void } }).__layoutStudio;
				ls?.run();
			}
		}
		writeFaculty(faculty);
	}, [faculty]);

	return (
		<div className="lx-ui contents">
			<nav className="wb-faculty" aria-label="Workbench faculty">
				<Tabs value={faculty} onValueChange={(v) => setFaculty(v as Faculty)}>
					<TabsList>
						{FACULTIES.map((f) => (
							<TabsTrigger key={f.value} value={f.value}>
								{f.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</nav>

			<ThemeStudioPanel ref={themeMainRef} />
			<LayoutStudioPanel ref={layoutMainRef} />
		</div>
	);
}

/**
 * Faculty 1: the Theme Studio. memo + forwardRef — see the WorkbenchApp header:
 * it must never re-render after mount so the vanilla theme studio's imperative
 * DOM mutations (mode is-active, pane data-tab, AI hidden, the injected
 * starters/fields/meter/preview) are never reverted by React reconciliation.
 */
const ThemeStudioPanel = React.memo(
	React.forwardRef<HTMLElement>((_props, ref) => (
		<main className="studio" data-tab="design" ref={ref}>
			<MobilePaneTabs faculty="theme" />

			{/* Controls: AI · starters · name · essentials · library · actions */}
			<section className="studio-panel studio-controls">
				<div className="studio-head">
					<p className="studio-eyebrow">The Workbench</p>
					<h1 className="studio-title">Theme Studio</h1>
					<p className="studio-sub">
						Set a handful of colours. The studio derives the full token contract, holds it to WCAG AA, and renders it
						live.
					</p>
				</div>

				<div className="studio-block studio-ai">
					<h2 className="studio-h2">Design with AI</h2>
					<p className="studio-ai-status">AI: checking…</p>
					<div className="studio-ai-row">
						<Input
							type="text"
							className="studio-ai-prompt"
							spellCheck={false}
							placeholder="Describe a palette, or ask for a change — “warm editorial”, “cooler”, “navy accent”"
						/>
						<Button type="button" className="studio-btn studio-primary studio-ai-ask">
							Ask
						</Button>
					</div>
					<Button type="button" variant="outline" className="studio-btn studio-ai-connect" hidden>
						Connect a model
					</Button>
					<div className="studio-ai-history" hidden />
				</div>

				<div className="studio-block">
					<h2 className="studio-h2">Start from</h2>
					<div className="studio-starters" />
				</div>

				<div className="studio-block">
					<label className="studio-name-row" htmlFor="studio-name">
						<span className="studio-h2">Theme name</span>
						<Input id="studio-name" className="studio-name" type="text" spellCheck={false} autoComplete="off" />
					</label>
				</div>

				<div className="studio-block">
					<h2 className="studio-h2">Essentials</h2>
					<div className="studio-fields" />
				</div>

				<div className="studio-block studio-lib-block">
					<div className="studio-lib-head">
						<h2 className="studio-h2">Library</h2>
						<Button type="button" variant="outline" className="studio-btn studio-lib-save studio-theme-save">
							Save current
						</Button>
					</div>
					<div className="studio-library studio-theme-library" />
				</div>

				<div className="studio-actions">
					<Button type="button" variant="outline" className="studio-btn studio-copy">
						Copy CSS
					</Button>
					<Button type="button" className="studio-btn studio-primary studio-download">
						Download .css
					</Button>
				</div>
			</section>

			{/* Stage: the live specimen (studio-owned iframe host) */}
			<section className="studio-panel studio-stage">
				<StageHead />
				<div className="studio-preview-config deck-config" hidden />
				<div className="studio-preview-host" />
			</section>

			{/* Audit: the contrast meter + the generated CSS */}
			<section className="studio-panel studio-audit">
				<h2 className="studio-h2">Contrast</h2>
				<p className="studio-meter-summary" />
				<div className="studio-meter" />
				{/* forceMount keeps .studio-code in the DOM even while collapsed —
				    the theme studio captures it once at init and writes the CSS into
				    it on every render, so it must always exist (Radix hides it via
				    [hidden] when closed). */}
				<Collapsible className="studio-css">
					<CollapsibleTrigger className="studio-css-summary">Theme CSS</CollapsibleTrigger>
					<CollapsibleContent forceMount>
						<pre className="studio-code" />
					</CollapsibleContent>
				</Collapsible>
			</section>
		</main>
	)),
);
ThemeStudioPanel.displayName = 'ThemeStudioPanel';

/**
 * Faculty 2: the Layout Studio (CSS-only local components). memo + forwardRef
 * for the same reason as ThemeStudioPanel.
 */
const LayoutStudioPanel = React.memo(
	React.forwardRef<HTMLElement>((_props, ref) => (
		<main className="studio studio-layout" data-tab="design" ref={ref} hidden>
			<MobilePaneTabs faculty="layout" />

			{/* Controls: starters · identity · styles · skeleton · actions */}
			<section className="studio-panel studio-controls">
				<div className="studio-head">
					<p className="studio-eyebrow">The Workbench</p>
					<h1 className="studio-title">Layout Studio</h1>
					<p className="studio-sub">
						Author a CSS-only component — palette-blind, scoped to its own class. The studio renders it live and gates
						it like the engine would.
					</p>
				</div>

				<div className="studio-block">
					<h2 className="studio-h2">Start from</h2>
					<div className="studio-starters lstudio-starters" />
				</div>

				<div className="studio-block">
					<h2 className="studio-h2">Identity</h2>
					<div className="lstudio-fields">
						<label className="lstudio-field">
							<span>Name (_class)</span>
							<input className="lstudio-name" type="text" spellCheck={false} autoComplete="off" />
						</label>
						<label className="lstudio-field">
							<span>Function</span>
							{/* Native select — the studio populates options via innerHTML + reads .value. */}
							<select className="lstudio-function" />
						</label>
						<label className="lstudio-field">
							<span>Form</span>
							<select className="lstudio-form" />
						</label>
						<label className="lstudio-field">
							<span>Substance</span>
							<select className="lstudio-substance" />
						</label>
						<label className="lstudio-field">
							<span>Tags</span>
							<input className="lstudio-tags" type="text" spellCheck={false} placeholder="comma, separated" />
						</label>
						<label className="lstudio-field">
							<span>Description</span>
							<input className="lstudio-description" type="text" />
						</label>
					</div>
				</div>

				<div className="studio-block">
					<h2 className="studio-h2">Styles — palette-blind, scoped to .name</h2>
					<Textarea className="lstudio-css-editor" rows={10} spellCheck={false} />
				</div>

				<div className="studio-block">
					<h2 className="studio-h2">Skeleton</h2>
					<Textarea className="lstudio-skeleton-editor" rows={6} spellCheck={false} />
				</div>

				<div className="studio-block studio-lib-block">
					<div className="studio-lib-head">
						<h2 className="studio-h2">Library</h2>
						<Button type="button" variant="outline" className="studio-btn studio-lib-save lstudio-save">
							Save current
						</Button>
					</div>
					<div className="studio-library lstudio-library" />
				</div>

				<div className="studio-actions">
					<Button type="button" variant="outline" className="studio-btn lstudio-copy-css">
						Copy CSS
					</Button>
					<Button type="button" variant="outline" className="studio-btn lstudio-copy-manifest">
						Copy manifest
					</Button>
					<Button type="button" className="studio-btn studio-primary lstudio-download">
						Download scaffold
					</Button>
				</div>
			</section>

			{/* Stage: the live skeleton render */}
			<section className="studio-panel studio-stage">
				<StageHead />
				<div className="studio-preview-config deck-config" hidden />
				<div className="studio-preview-host" />
			</section>

			{/* Audit: the deterministic gate findings */}
			<section className="studio-panel studio-audit">
				<h2 className="studio-h2">Gate</h2>
				<p className="lstudio-findings-summary" />
				<div className="lstudio-findings" />
			</section>
		</main>
	)),
);
LayoutStudioPanel.displayName = 'LayoutStudioPanel';

/**
 * The mobile pane bar (Design · Preview · Contrast/Gate). KEPT as vanilla
 * `.studio-tab[data-tab]` markup: both studios wire these (toggling `is-active`,
 * writing `main.studio[data-tab]`, re-fitting the preview via run()), and the
 * guided tour clicks them by selector to reveal a hidden pane on mobile.
 * Migrating to a Radix Tabs would orphan that wiring, so this stays driven.
 */
function MobilePaneTabs({ faculty }: { faculty: Faculty }) {
	const third = faculty === 'layout' ? 'Gate' : 'Contrast';
	return (
		<div className="studio-tabs" role="tablist">
			<button type="button" className="studio-tab is-active" data-tab="design">
				Design
			</button>
			<button type="button" className="studio-tab" data-tab="preview">
				Preview
			</button>
			<button type="button" className="studio-tab" data-tab="contrast">
				{third}
			</button>
		</div>
	);
}

/**
 * The stage head: title + the studio-wired Light/Dark mode group + the
 * preview-setup toggle. The mode buttons + the [data-preview-setup] trigger are
 * left vanilla (the studios own their click → run() / mountStudioPreviewConfig);
 * React renders the markup with the exact classes/attributes they query.
 */
function StageHead() {
	return (
		<div className="studio-stage-head">
			<span className="studio-stage-title">Live preview</span>
			<div className="studio-mode">
				<button type="button" className="studio-mode-btn is-active" data-mode="light">
					Light
				</button>
				<button type="button" className="studio-mode-btn" data-mode="dark">
					Dark
				</button>
			</div>
			<button
				type="button"
				className="studio-mode-btn studio-preview-setup-btn"
				data-preview-setup
				aria-expanded="false"
				title="Preview setup — render this preview under a finish, size, or form"
			>
				Preview setup
			</button>
			<span className="studio-status" />
		</div>
	);
}

export default WorkbenchApp;
