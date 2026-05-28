// Rasterize the landing page's showcase images from committed gallery PDFs.
//
// The set is MANIFEST-DRIVEN: any component whose manifest carries
// `"showcase": { "featured": true }` (or `{ "hero": true }`) is included.
// Add that flag to a new component's manifest and re-run this script to pull
// it into the landing highlight reel — no edit here required.
//
// Source PDFs are the committed per-component galleries at
// lib/components/<bucket>/<name>/<name>.gallery.{light,dark}.pdf. They are
// vector PDFs and not web-servable, so we rasterize the chosen page with
// `pdftoppm` (poppler) then crop/compress with sharp to WebP, named
// public/showcase/<name>.<mode>.webp.
//
// Outputs are COMMITTED, so the GitHub Pages build never needs poppler — it
// just serves the static images. Regenerate locally (poppler required) only
// when the flagged set or its galleries change:
//
//   node docs/scripts/rasterize-showcase.mjs            # (re)write the WebPs
//   node docs/scripts/rasterize-showcase.mjs --check    # gate: every output exists
//
// --check verifies presence (the real failure mode: a component was flagged
// but its image was never generated), not byte-equality — WebP encoding is
// not guaranteed stable across libvips versions.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const componentsDir = join(repoRoot, 'lib', 'components');
const outDir = join(here, '..', 'public', 'showcase');

const require = createRequire(import.meta.url);
const { loadAll, manifestBucket } = require(join(componentsDir, 'index.js'));

const MODES = ['light', 'dark'];
const TARGET_WIDTH = 1600; // ~2x the on-page display width
const RENDER_DPI = 200; // render high, downscale for crisp edges

// Every component opted into the landing showcase (strip tiles + the hero).
function showcaseComponents() {
	return loadAll()
		.filter((m) => m.showcase && (m.showcase.featured || m.showcase.hero))
		.sort((a, b) => a.name.localeCompare(b.name));
}

function srcPdf(m, mode) {
	return join(componentsDir, manifestBucket(m), m.name, `${m.name}.gallery.${mode}.pdf`);
}
const outFile = (name, mode) => join(outDir, `${name}.${mode}.webp`);

function check() {
	const missing = [];
	for (const m of showcaseComponents()) {
		for (const mode of MODES) if (!existsSync(outFile(m.name, mode))) missing.push(outFile(m.name, mode));
	}
	if (missing.length) {
		for (const f of missing) {
			process.stderr.write(`stale: ${f.replace(`${repoRoot}/`, '')} — run \`node docs/scripts/rasterize-showcase.mjs\`.\n`);
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
	for (const m of showcaseComponents()) {
		const page = m.showcase?.page || 2;
		for (const mode of MODES) {
			const pdf = srcPdf(m, mode);
			if (!existsSync(pdf)) {
				process.stderr.write(`missing source gallery: ${pdf}\n  → run \`npm run build:galleries\` first.\n`);
				process.exit(1);
			}
			const prefix = join(tmp, `${m.name}.${mode}`);
			execFileSync('pdftoppm', ['-png', '-r', String(RENDER_DPI), '-f', String(page), '-l', String(page), '-singlefile', pdf, prefix]);
			await sharp(`${prefix}.png`)
				.resize({ width: TARGET_WIDTH, withoutEnlargement: true })
				.webp({ quality: 82 })
				.toFile(outFile(m.name, mode));
			wrote++;
		}
		process.stdout.write(`  ${m.name} ← ${manifestBucket(m)}/${m.name} p${page}\n`);
	}
	rmSync(tmp, { recursive: true, force: true });
	process.stdout.write(`rasterize-showcase: wrote ${wrote} WebP into public/showcase/.\n`);
}

if (process.argv.includes('--check')) check();
else await build();
