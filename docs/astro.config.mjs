// @ts-check

import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { rehypeBaseLinks } from './plugins/rehype-base-links.mjs';

// Project Pages site: https://slidewright.github.io/lattice/
// `site` + `base` must match the GitHub Pages URL so generated links and
// assets resolve under the /lattice/ path.
//
// Cloudflare Pages preview deployments serve at the ROOT of a *.pages.dev host,
// not under /lattice/, so the base must differ per environment. Cloudflare sets
// CF_PAGES=1 (and CF_PAGES_URL) in its build environment, so we auto-detect:
// root base for Cloudflare previews, /lattice for the GitHub Pages production
// build. The GitHub Pages workflow runs WITHOUT CF_PAGES, so its base is
// unchanged — this is backward-compatible with the existing production deploy.
//
// `site` is the canonical origin used for sitemap / og:url / absolute links.
// Precedence: an explicit SITE_URL wins (set this in the Cloudflare project's
// env vars once a CUSTOM DOMAIN is attached, so canonical URLs point at the
// domain and not the *.pages.dev deployment host); otherwise fall back to the
// per-deployment CF_PAGES_URL on Cloudflare, or the GitHub Pages origin.
const onCloudflare = Boolean(process.env.CF_PAGES);
export default defineConfig({
	site: process.env.SITE_URL || (onCloudflare ? process.env.CF_PAGES_URL : 'https://slidewright.github.io'),
	base: onCloudflare ? '/' : '/lattice',
	// HTML navigation is cheap, so warm it everywhere: every internal <a>
	// prefetches its destination on hover/focus (the `hover` strategy). The one
	// expensive asset — the ~554KB-gz engine bundle — is NOT covered here; it
	// has its own connection-first policy (src/lib/prefetch-engine.ts, wired via
	// <EngineWarm>) so we never speculatively spend it on a constrained link.
	prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
	// `server.fs.allow: ['..']` lets the dev server resolve repo files above the
	// docs root (e.g. map-complete.js's lib/components basemap JSON). The pure
	// authoring engines (lint-core/review-core/scorecard) and the Theme/Layout
	// Studio cores are CommonJS that Vite's dev server can't transform when a
	// source file is fetched over /@fs — its module.exports reads as no `default`
	// export and the importing <script> block dies. So the browser consumes them
	// through committed esbuild bundles (authoring-core / theme-core /
	// layout-core .generated.js) that load in dev AND ship in the build; no
	// CJS→ESM build nudge is needed. See tools/build-authoring-core.js.
	vite: {
		server: { fs: { allow: ['..'] } },
		// Tailwind v4 via its first-party Vite plugin. The entry stylesheet
		// (src/styles/tailwind.css) imports only the theme + utilities layers —
		// Preflight is OFF on purpose (see that file's header + the migration
		// decision doc §0). It carries the shadcn ↔ Lattice token bridge.
		plugins: [tailwindcss()],
	},
	// Base-prefix hand-written, root-relative content links so they resolve
	// under both deploy bases (/lattice on GitHub Pages, / on Cloudflare).
	// Applies to Starlight's Markdown/MDX content too. See plugins/.
	markdown: {
		rehypePlugins: [rehypeBaseLinks],
	},
	integrations: [
		starlight({
			title: 'Lattice',
			favicon: '/lattice-logo.png',
			// Open the TLS handshake to the Google Fonts hosts up front, so the
			// webfont round-trip doesn't wait on the render-blocking @import in
			// lattice.css. gstatic serves the .woff2 over CORS → crossorigin.
			// Standalone (non-Starlight) routes carry the same pair via
			// <ResourceHints> (src/components/site/).
			head: [
				{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
				{ tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' } },
			],
			components: {
				// Re-skin the docs zone as part of the one website (not a bolted-on
				// subsite). Header becomes the site topbar (brand · global nav ·
				// search · palette · light/dark); ThemeProvider sets palette+mode
				// pre-paint from the shared localStorage keys; Sidebar prepends a
				// mobile-only "Site" nav group so the hamburger never dead-ends at
				// the logo; MobileMenuFooter is emptied to leave one control surface.
				Header: './src/components/Header.astro',
				ThemeProvider: './src/components/ThemeProvider.astro',
				Sidebar: './src/components/Sidebar.astro',
				MobileMenuFooter: './src/components/MobileMenuFooter.astro',
			},
			logo: { src: './public/lattice-logo.png', alt: 'Lattice' },
			description:
				'A Marp-based slide-deck engine that renders boardroom-quality PDFs from Markdown. Themed layouts, Mermaid diagrams, WCAG AA throughout.',
			customCss: ['./src/styles/lattice.css'],
			// Code blocks (Expressive Code). The frame/chrome already tracks the
			// palette because `useStarlightUiThemeColors` binds it to --sl-color-*
			// (which we remap to the site tokens). The default syntax theme
			// (night-owl) is a saturated cool blue that fights the warmer palettes,
			// so swap in the restrained, low-saturation Vitesse pair: it sits
			// calmly inside ANY of the 14 palettes. We keep the UI-theme-colour
			// binding ON (it defaults off once `themes` is set) so the frame stays
			// palette-bound; only the token hues come from Vitesse. The accent-
			// driven bits (focus ring, copy button, active-tab indicator, selection,
			// scrollbar) are bound to var(--accent) in lattice.css (.expressive-code).
			expressiveCode: {
				themes: ['vitesse-light', 'vitesse-dark'],
				useStarlightUiThemeColors: true,
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/slidewright/lattice' },
			],
			// The docs sidebar is now docs-only: one coherent learning track,
			// Introduction → Get started → Guides. The apps (Playground, Drawing
			// Board, Workbench) and the Components reference live in the primary
			// nav (src/lib/nav.mjs) — they were previously duplicated here as a
			// "Tools" group, which (together with the old "Get started"/"Guides"
			// top links) is what made the mobile menu stack two overlapping navs.
			// Principles now sits up front under Introduction, and the "Docs"
			// nav entry lands on the Overview hub that also cards into it.
			sidebar: [
				{
					label: 'Introduction',
					items: [
						{ label: 'Overview', slug: 'overview' },
						{ label: 'What is Lattice?', slug: 'introduction' },
						{ label: 'Principles', slug: 'principles' },
						{ label: 'The story', slug: 'story' },
					],
				},
				{
					label: 'Get started',
					items: [{ label: 'Getting started', slug: 'getting-started' }],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Authoring decks', slug: 'guides/authoring' },
						{ label: 'Themes & palettes', slug: 'guides/themes' },
					],
				},
				{
					// The owned LFM standard, published as its own group so it reads as
					// a standard, not internal docs. Two registers: the plain-words
					// front door first (authored prose), then the normative specs
					// (generated from spec/*.md by tools/build-spec-docs.js — never
					// hand-edited here, so the site can't drift from the canonical spec).
					label: 'Specification',
					items: [
						{ label: 'Understanding LFM', slug: 'spec/understanding-lfm' },
						{ label: 'LFM 1.0 (spec)', slug: 'spec/lfm' },
						{ label: 'Diagnostic Protocol', slug: 'spec/diagnostics' },
					],
				},
			],
		}),
		// React renderer for the shadcn/ui islands. Astro stays the page-shell
		// owner; React hydrates only where a `client:*` directive marks an
		// interactive island (see the migration decision doc §0/§4.3).
		react(),
	],
});
