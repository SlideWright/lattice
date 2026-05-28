// Rasterize a small CURATED set of committed gallery PDFs into web images
// (WebP, light + dark) for the landing page hero and showcase strip.
//
// Source PDFs are the per-component galleries committed under
// lib/components/<bucket>/<name>/<name>.gallery.{light,dark}.pdf. They are
// vector PDFs and not web-servable as-is, so we rasterize the chosen page
// with `pdftoppm` (poppler) then crop/compress with sharp to WebP.
//
// The outputs are COMMITTED under docs/public/showcase/, so the GitHub Pages
// build never needs poppler — it just serves the static images. Regenerate
// locally (poppler required) only when the curated set or its galleries change:
//
//   node docs/scripts/rasterize-showcase.mjs            # (re)write the WebPs
//   node docs/scripts/rasterize-showcase.mjs --check    # gate: every output exists
//
// --check verifies presence (the real failure mode: a curated entry was added
// but its image never generated), not byte-equality — WebP encoding is not
// guaranteed stable across libvips versions.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const componentsDir = join(repoRoot, 'lib', 'components');
const outDir = join(here, '..', 'public', 'showcase');

// The hero slide plus one representative per Function family (design-system.md).
// `page` is 1-based; page 2 of each component gallery is its manifest `sample`.
const CURATED = [
	{ id: 'hero', comp: 'comparison/verdict-grid', page: 2, fn: 'Comparison' },
	{ id: 'anchor', comp: 'anchor/divider', page: 2, fn: 'Anchor' },
	{ id: 'statement', comp: 'statement/big-number', page: 2, fn: 'Statement' },
	{ id: 'inventory', comp: 'inventory/cards-grid', page: 2, fn: 'Inventory' },
	{ id: 'comparison', comp: 'comparison/before-after', page: 2, fn: 'Comparison' },
	{ id: 'progression', comp: 'progression/roadmap', page: 2, fn: 'Progression' },
	{ id: 'evidence', comp: 'evidence/kpi', page: 2, fn: 'Evidence' },
	{ id: 'imagery', comp: 'imagery/image', page: 2, fn: 'Imagery' },
];

const MODES = ['light', 'dark'];
const TARGET_WIDTH = 1600; // ~2x the on-page display width
const RENDER_DPI = 200; // render high, downscale for crisp edges

function srcPdf(comp, mode) {
	const name = comp.split('/').pop();
	return join(componentsDir, comp, `${name}.gallery.${mode}.pdf`);
}

function outFile(id, mode) {
	return join(outDir, `${id}.${mode}.webp`);
}

function expectedOutputs() {
	const files = [];
	for (const e of CURATED) for (const mode of MODES) files.push(outFile(e.id, mode));
	return files;
}

function check() {
	const missing = expectedOutputs().filter((f) => !existsSync(f));
	if (missing.length) {
		for (const f of missing) {
			process.stderr.write(
				`stale: ${f.replace(repoRoot + '/', '')} — run \`node docs/scripts/rasterize-showcase.mjs\`.\n`,
			);
		}
		process.exit(1);
	}
	process.stdout.write('showcase images up to date.\n');
}

async function build() {
	mkdirSync(outDir, { recursive: true });
	const tmp = join(here, '..', '.showcase-tmp');
	mkdirSync(tmp, { recursive: true });

	let wrote = 0;
	for (const e of CURATED) {
		for (const mode of MODES) {
			const pdf = srcPdf(e.comp, mode);
			if (!existsSync(pdf)) {
				process.stderr.write(`missing source gallery: ${pdf}\n`);
				process.exit(1);
			}
			const prefix = join(tmp, `${e.id}.${mode}`);
			// pdftoppm zero-pads the page onto the prefix; -singlefile drops the suffix.
			execFileSync('pdftoppm', [
				'-png',
				'-r',
				String(RENDER_DPI),
				'-f',
				String(e.page),
				'-l',
				String(e.page),
				'-singlefile',
				pdf,
				prefix,
			]);
			const png = `${prefix}.png`;
			await sharp(png)
				.resize({ width: TARGET_WIDTH, withoutEnlargement: true })
				.webp({ quality: 82 })
				.toFile(outFile(e.id, mode));
			wrote++;
		}
		process.stdout.write(`  ${e.id} ← ${e.comp} p${e.page}\n`);
	}
	rmSync(tmp, { recursive: true, force: true });
	process.stdout.write(`rasterize-showcase: wrote ${wrote} WebP into public/showcase/.\n`);
}

if (process.argv.includes('--check')) {
	check();
} else {
	await build();
}
