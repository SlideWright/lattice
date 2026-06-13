// Make hand-written, site-internal Markdown/MDX links work under BOTH deploy
// bases without the author thinking about it:
//   • GitHub Pages serves under  /lattice/   (base = '/lattice')
//   • Cloudflare Pages serves at  /           (base = '')   — *.pages.dev host
//
// Astro does NOT rewrite Markdown link hrefs for `base`, so a literal
// `/lattice/principles/` 404s on Cloudflare and a base-less `/principles/`
// 404s on GitHub Pages. The fix: authors write ROOT-RELATIVE, base-less links
// (`/principles/`, `/guides/authoring/`) and this plugin prefixes the active
// base at build time. Base detection mirrors astro.config.mjs.
//
// Pass-through (untouched): external URLs and protocol-relative (`//…`),
// anchors/`mailto:`/`tel:` (don't start with `/`), and links already under the
// base (idempotent — safe if a link is accidentally written with the prefix).

export function rehypeBaseLinks() {
	const onCloudflare = Boolean(process.env.CF_PAGES);
	const base = onCloudflare ? '' : '/lattice';

	return (tree) => {
		if (!base) return; // root base — nothing to prefix
		const walk = (node) => {
			if (node.type === 'element' && node.tagName === 'a' && node.properties) {
				const href = node.properties.href;
				if (
					typeof href === 'string' &&
					href.startsWith('/') &&
					!href.startsWith('//') &&
					href !== base &&
					!href.startsWith(base + '/')
				) {
					node.properties.href = base + href;
				}
			}
			if (node.children) for (const child of node.children) walk(child);
		};
		walk(tree);
	};
}
