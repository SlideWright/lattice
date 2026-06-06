// Copy the generated plain-Markdown component reference into the site's
// public/ dir so it ships as a static download at /lattice/components.md.
// (The browsable, themable edition is the Astro component pages under
// /lattice/components/ — built from the manifests at site-build time, not
// staged here.) The .md is generated from the manifests by
// tools/build-docs-portal.js and committed under dist/docs/; this just
// stages it for the Astro build.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoReference = join(here, '..', '..', 'dist', 'docs');
const publicDir = join(here, '..', 'public');

mkdirSync(publicDir, { recursive: true });

let copied = 0;
for (const name of ['components.md']) {
	const src = join(repoReference, name);
	if (!existsSync(src)) {
		console.error(`sync-portal: missing ${src} — run \`npm run docs:portal\` in the repo root.`);
		process.exit(1);
	}
	copyFileSync(src, join(publicDir, name));
	copied++;
}
console.log(`sync-portal: staged ${copied} file(s) into public/.`);
