#!/usr/bin/env node
/**
 * export-marp — produce a portable, self-contained bundle of a Lattice deck for
 * use outside Lattice ("Marp is an export target, not a live render path").
 *
 * See engineering/decisions/2026-06-13-export-to-marp.md. The bundle:
 *   <name>/
 *     <name>.md            — splits BAKED into literal `---` (lib/core/bake-splits.js),
 *                            local image paths localized into assets/
 *     themes/              — lattice.css + the deck's palette (+ -dark)
 *     assets/              — every local image the deck references
 *     engine/              — dist/lattice-emulator.js + mermaid bundle (zero-install renderer)
 *     marp.config.cjs      — the Lattice engine config for `marp-cli` (full fidelity)
 *     package.json         — pins @marp-team/marp-cli + @slidewright/lattice
 *     README.md            — quick start (two fidelity tiers) + caveats
 *
 * Usage:
 *   node tools/export-marp.js <deck.md> <out-dir-or-zip> [palette]
 *
 * Fidelity: the baked `.md` + themes split + style correctly in ANY Marp tool
 * (incl. the marp-vscode preview); the bundled engine / the marp-cli config
 * reproduce the deck in FULL (charts, islands, structural components). The
 * structural components cannot run in stock marp-core — that's inherent and
 * documented in the generated README. Exit 0 on success, 1 on usage/IO error.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { bakeSplits } = require('../lib/core/bake-splits');

const ROOT = path.join(__dirname, '..');
const LATTICE_VERSION = require('../package.json').version;
const MARP_CLI_RANGE = '^4.3.1';

function die(msg) { console.error(`export-marp: ${msg}`); process.exit(1); }

/** Read the deck's `theme:` front-matter palette, or null. */
function readTheme(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const t = m[1].match(/^\s*theme:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m);
  return t ? t[1].trim() : null;
}

/**
 * Localize local image references into assets/ and rewrite their paths. Handles
 * Markdown images `![alt](path)` / `![bg ...](path)`; leaves remote URLs
 * (http/https/data:) untouched. Copies each unique local file into <dest>/assets.
 */
function localizeAssets(body, deckDir, destDir) {
  const assetsDir = path.join(destDir, 'assets');
  const copied = new Map(); // original resolved path -> assets/<base>
  const isRemote = (u) => /^(https?:|data:|\/\/)/i.test(u);
  const out = body.replace(/(!\[[^\]]*\]\()([^)\s]+)(\s*(?:"[^"]*")?\))/g, (full, pre, url, post) => {
    if (isRemote(url)) return full;
    const abs = path.resolve(deckDir, decodeURI(url));
    if (!fs.existsSync(abs)) return full; // leave dangling refs as-is (warned below)
    let rel = copied.get(abs);
    if (!rel) {
      fs.mkdirSync(assetsDir, { recursive: true });
      let base = path.basename(abs);
      while (fs.existsSync(path.join(assetsDir, base)) && [...copied.values()].indexOf(`assets/${base}`) < 0) {
        base = `_${base}`; // avoid clobbering a same-named different file
      }
      fs.copyFileSync(abs, path.join(assetsDir, base));
      rel = `assets/${base}`;
      copied.set(abs, rel);
    }
    return `${pre}${rel}${post}`;
  });
  return { body: out, count: copied.size };
}

function copyInto(srcAbs, destAbs) {
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(srcAbs, destAbs);
}

function main(argv) {
  const [deckPath, outArg, paletteArg] = argv;
  if (!deckPath || !outArg) {
    die('usage: node tools/export-marp.js <deck.md> <out-dir-or-zip> [palette]');
  }
  if (!fs.existsSync(deckPath)) die(`deck not found: ${deckPath}`);

  const src = fs.readFileSync(deckPath, 'utf8');
  const palette = (paletteArg || readTheme(src) || 'indaco').toLowerCase();
  const name = path.basename(deckPath).replace(/\.md$/i, '');
  const wantZip = /\.zip$/i.test(outArg);
  const workRoot = wantZip ? fs.mkdtempSync(path.join(require('os').tmpdir(), 'export-marp-')) : path.resolve(outArg);
  const dest = path.join(workRoot, name);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  // 1) bake splits → literal `---`, then 2) localize local images.
  const baked = bakeSplits(src);
  const fmMatch = baked.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  const fm = fmMatch ? fmMatch[0] : '';
  const body = fmMatch ? baked.slice(fm.length) : baked;
  const localized = localizeAssets(body, path.dirname(path.resolve(deckPath)), dest);
  fs.writeFileSync(path.join(dest, `${name}.md`), fm + localized.body);

  // 3) the engine stylesheet at dist/lattice.css + the deck's palette under
  // themes/ — the exact layout the bundled emulator expects (it resolves
  // dist/lattice.css and themes/<palette>.css relative to its package root).
  copyInto(path.join(ROOT, 'dist', 'lattice.css'), path.join(dest, 'dist', 'lattice.css'));
  const themeFiles = [`${palette}.css`, `${palette}-dark.css`];
  const bundledThemes = [];
  for (const f of themeFiles) {
    const abs = path.join(ROOT, 'themes', f);
    if (fs.existsSync(abs)) { copyInto(abs, path.join(dest, 'themes', f)); bundledThemes.push(`themes/${f}`); }
  }
  if (!bundledThemes.length) die(`unknown palette '${palette}' — no themes/${palette}.css`);

  // 4) zero-install engine — the bundled Lattice renderer + mermaid runtime, at
  // the same dist/ location the emulator ships from so its sibling lookups work.
  copyInto(path.join(ROOT, 'dist', 'lattice-emulator.js'), path.join(dest, 'dist', 'lattice-emulator.js'));
  if (fs.existsSync(path.join(ROOT, 'mermaid-v11.min.js'))) {
    copyInto(path.join(ROOT, 'mermaid-v11.min.js'), path.join(dest, 'mermaid-v11.min.js'));
  }

  // 5) marp-cli config + manifest + README.
  fs.writeFileSync(path.join(dest, 'marp.config.cjs'), MARP_CONFIG);
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify(packageJson(name), null, 2) + '\n');
  fs.writeFileSync(path.join(dest, 'README.md'), readme({ name, palette, themes: ['dist/lattice.css', ...bundledThemes] }));

  let result = dest;
  if (wantZip) {
    const zipAbs = path.resolve(outArg);
    fs.rmSync(zipAbs, { force: true });
    fs.mkdirSync(path.dirname(zipAbs), { recursive: true });
    execFileSync('zip', ['-rq', zipAbs, name], { cwd: workRoot });
    fs.rmSync(workRoot, { recursive: true, force: true });
    result = zipAbs;
  }
  console.log(`export-marp: wrote ${result}`);
  console.log(`  deck: ${name}.md (splits baked) · palette: ${palette} · assets: ${localized.count}`);
  return 0;
}

function packageJson(name) {
  return {
    name: `${name}-marp-export`,
    private: true,
    description: `Portable Marp bundle of the "${name}" Lattice deck`,
    scripts: {
      pdf: `marp ${name}.md --config-file marp.config.cjs --allow-local-files -o ${name}.pdf`,
      html: `marp ${name}.md --config-file marp.config.cjs --allow-local-files -o ${name}.html`,
    },
    dependencies: {
      '@marp-team/marp-cli': MARP_CLI_RANGE,
      '@slidewright/lattice': `^${LATTICE_VERSION}`,
    },
  };
}

// The marp-cli config: load the Lattice engine (full fidelity) and register the
// bundled theme CSS. Falls back to a bare config if the engine isn't installed,
// so `marp` still splits + styles via the baked `---` and the theme files.
const MARP_CONFIG = `// Auto-generated by Lattice "Export to Marp".
const fs = require('fs');
const path = require('path');
const themeSet = [
  path.join(__dirname, 'dist', 'lattice.css'),
  ...fs.readdirSync(path.join(__dirname, 'themes')).map((f) => path.join(__dirname, 'themes', f)),
];
let engine;
try { engine = require('@slidewright/lattice/config').engine; } catch { /* engine not installed — degrade to plain Marp */ }
module.exports = { themeSet, allowLocalFiles: true, ...(engine ? { engine } : {}) };
`;

function readme({ name, palette, themes }) {
  return `# ${name} — portable Marp bundle

Exported from Lattice. The deck's slide splits are **baked into literal \`---\`**,
so it divides correctly in any Marp tool — no Lattice plugin required.

## Render it (full fidelity)

**Zero install** — the Lattice engine is bundled:

\`\`\`sh
node dist/lattice-emulator.js ${name}.md ${name}.pdf ${palette}
\`\`\`

(PDF export needs a local Chrome/Chromium, exactly as Marp itself does. Decks
with Mermaid/chart diagrams render fully via the Marp CLI path below, which
installs the renderers; the zero-install path covers everything else.)

**With the standard Marp CLI:**

\`\`\`sh
npm install
npm run pdf      # → ${name}.pdf   (or: npm run html)
\`\`\`

## Quick preview (VS Code)

Open \`${name}.md\` with the Marp for VS Code extension after pointing
\`markdown.marp.themes\` at the files in \`themes/\` (${themes.join(', ')}).
Slides split and style correctly. Note: rich structural layouts
(card grids, split panels, islands, badge tables) are rendered by the Lattice
engine — in the stock VS Code preview they appear simplified. Use the
full-fidelity commands above for the real output.

## What's in here

| Path | What |
|---|---|
| \`${name}.md\` | the deck — splits baked to \`---\`, image paths localized |
| \`dist/lattice.css\` | the palette-blind engine stylesheet |
| \`dist/lattice-emulator.js\` | the bundled Lattice renderer (zero-install) |
| \`themes/\` | the \`${palette}\` palette (+ dark) |
| \`assets/\` | local images the deck references |
| \`marp.config.cjs\` | Marp CLI config (loads the engine + themes) |
`;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { localizeAssets, readTheme };
