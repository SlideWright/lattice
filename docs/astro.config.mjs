// @ts-check

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// Project Pages site: https://slidewright.github.io/lattice/
// `site` + `base` must match the GitHub Pages URL so generated links and
// assets resolve under the /lattice/ path.
export default defineConfig({
	site: 'https://slidewright.github.io',
	base: '/lattice',
	integrations: [
		starlight({
			title: 'Lattice',
			favicon: '/lattice-logo.png',
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
					label: 'Reference',
					items: [
						{ label: 'Component reference', slug: 'reference/components' },
					],
				},
				{
					// Standalone routes that live outside Starlight's page tree (the
					// landing-styled playground and the generated component portal).
					// Surfacing them here keeps the docs zone from dead-ending — a
					// reader in the guides can reach the interactive tools in one click.
					label: 'Tools',
					items: [
						{ label: 'Playground', link: '/playground/' },
						{ label: 'Component portal', link: '/components.html' },
					],
				},
			],
		}),
	],
});
