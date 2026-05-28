// Stage the runtime assets the playground fetches/loads at runtime:
//   - dist/lattice-runtime.js  → public/playground/lattice-runtime.js
//       (the DOM-transform + Mermaid bundle, loaded inside the preview iframe;
//        renders charts/split-panels and orchestrates Mermaid — the same
//        bundle marp-vscode preview uses)
//   - dist/lattice.css          → public/playground/themes/lattice.css
//   - themes/<name>.css         → public/playground/themes/<name>.css
//       (the @theme lattice engine + every palette, fetched + registered by
//        the playground engine to render in the chosen palette)
//
// Staged at docs-build time (like sync-portal). NOT committed — regenerated
// each build from repo source so they can't drift.
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const themesDir = join(repoRoot, 'themes');
const latticeCss = join(repoRoot, 'dist', 'lattice.css');
const runtimeJs = join(repoRoot, 'dist', 'lattice-runtime.js');
const pgDir = join(here, '..', 'public', 'playground');
const themesOut = join(pgDir, 'themes');

mkdirSync(themesOut, { recursive: true });

for (const [, src] of [['dist/lattice.css', latticeCss], ['dist/lattice-runtime.js', runtimeJs]]) {
	if (!existsSync(src)) {
		console.error(`sync-playground-assets: missing ${src} — run \`npm run build\` in the repo root.`);
		process.exit(1);
	}
}

let copied = 0;
copyFileSync(runtimeJs, join(pgDir, 'lattice-runtime.js'));
copied++;
copyFileSync(latticeCss, join(themesOut, 'lattice.css'));
copied++;
for (const file of readdirSync(themesDir)) {
	if (!file.endsWith('.css')) continue;
	copyFileSync(join(themesDir, file), join(themesOut, file));
	copied++;
}
console.log(`sync-playground-assets: staged ${copied} asset(s) into public/playground/.`);
