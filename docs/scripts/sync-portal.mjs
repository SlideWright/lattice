// Copy the generated component-reference portal into the site's public/
// dir so it ships as a static asset at /lattice/components.{html,md}.
// The portal is generated from the manifests by tools/build-docs-portal.js
// and committed under reference/; this just stages it for the Astro build.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoReference = join(here, '..', '..', 'reference');
const publicDir = join(here, '..', 'public');

mkdirSync(publicDir, { recursive: true });

let copied = 0;
for (const name of ['components.html', 'components.md']) {
	const src = join(repoReference, name);
	if (!existsSync(src)) {
		console.error(`sync-portal: missing ${src} — run \`npm run docs:portal\` in the repo root.`);
		process.exit(1);
	}
	copyFileSync(src, join(publicDir, name));
	copied++;
}
console.log(`sync-portal: staged ${copied} file(s) into public/.`);
