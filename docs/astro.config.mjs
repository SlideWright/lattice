// @ts-check

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

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
	},
	integrations: [
		starlight({
			title: 'Lattice',
			favicon: '/lattice-logo.png',
			components: {
				// Inject the global nav links into the header (next to the social
				// icons) so the docs zone shares the landing/playground topbar.
				SocialIcons: './src/components/SocialIcons.astro',
			},
			logo: { src: './public/lattice-logo.png', alt: 'Lattice' },
			description:
				'A Marp-based slide-deck engine that renders boardroom-quality PDFs from Markdown. Themed layouts, Mermaid diagrams, WCAG AA throughout.',
			customCss: ['./src/styles/lattice.css'],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/slidewright/lattice' },
			],
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'Overview', slug: 'overview' },
						{ label: 'What is Lattice?', slug: 'introduction' },
						{ label: 'Principles', slug: 'principles' },
						{ label: 'Getting started', slug: 'getting-started' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Authoring decks', slug: 'guides/authoring' },
						{ label: 'Themes & palettes', slug: 'guides/themes' },
					],
				},
				{
					// Standalone routes that live outside Starlight's page tree (the
					// landing-styled playground and the component pages). Surfacing
					// them here keeps the docs zone from dead-ending — a reader in
					// the guides can reach the interactive tools in one click.
					// "Components" is the single canonical pointer to the reference
					// (the component pages); the topbar/header use the same label
					// and destination, so there's one "Components" everywhere.
					label: 'Tools',
					items: [
						{ label: 'Playground', link: '/playground/' },
						{ label: 'Drawing Board', link: '/drawing-board/' },
						{ label: 'Components', link: '/components/' },
					],
				},
			],
		}),
	],
});
