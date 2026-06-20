#!/usr/bin/env node
/**
 * lattice-emulator.js — Marp-faithful HTML renderer + PDF exporter
 *
 * Emulates the HTML structure that Marp CLI produces so that
 * lattice.css (written for Marp) renders correctly without
 * modification. Produces section elements with the same
 * attributes, pagination span, and header/footer structure
 * that Marp CLI v4 outputs.
 *
 * Mermaid diagrams (```mermaid blocks) are rendered to SVG via mmdc
 * with theme variables mapped to the Lattice palette.
 *
 * Usage:
 *   node lattice-emulator.js <source.md> <output.pdf> [palette]
 *   node lattice-emulator.js <source.md> <custom-layouts.css> <output.pdf> [palette]
 *
 * The bundled `lattice.css` is auto-resolved when no `.css` arg is given;
 * pass an explicit `.css` path only to override the layout engine (rare —
 * for layout-engine development, not deck authoring).
 *
 * NOTE: This script exists only because Marp CLI cannot be installed
 * in this build environment. End users should use Marp CLI directly:
 *   marp deck.md --pdf --allow-local-files   # picks up marp.config.js
 */

const fs            = require('fs');
const path          = require('path');
const { pathToFileURL } = require('node:url');
const os            = require('os');
const { execSync }  = require('child_process');

// Package root for sibling-asset lookups (themes/, dist/lattice.css,
// node_modules/.bin/mmdc). This file runs from two locations: as repo-root
// source (tests, `node lattice-emulator.js`) where __dirname IS the root,
// and as the bundled dist/lattice-emulator.js (the published `bin`) where
// __dirname is <root>/dist. esbuild collapses every bundled module onto the
// output file's __dirname, so a fixed `..` is wrong for the source case —
// walk up to the nearest package.json instead, which lands on the root in
// both layouts (and on the installed package dir for npm consumers).
const PKG_ROOT = (() => {
  let dir = __dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return __dirname;
})();

// ── KaTeX CSS ────────────────────────────────────────────────────────────────
// The engine (lib/engine, created with `mathOutput:'html'`) renders `$…$` /
// `$$…$$` to KaTeX markup itself; the emulator only links KaTeX's stylesheet so
// the glyph fonts resolve in the PDF. Resolved lazily — absent the optional dep,
// no link is emitted and math degrades to plain text.
let katexCssAbsPath = '';
try { katexCssAbsPath = require.resolve('katex/dist/katex.min.css'); } catch (_e) { /* no css link emitted */ }

// ── function-plot (math function plotting in math.canvas) ─────────────────
// ```functionplot fences (alias: the deprecated ```latticeplot) carry a JSON
// function-plot config; the build emits a `<div class="functionplot"
// data-fp-config="…">` placeholder that the vendored function-plot UMD bundle
// inflates to an SVG on page load — same
// pre-render-then-PDF flow puppeteer uses for the rest of the deck. The
// library is purpose-built for y=f(x), parametric, polar, implicit, and
// vector-field plots; it parses math.js expressions and skips asymptotes
// cleanly. Marp CLI (marp.config.js) and the VS Code preview
// (lattice-runtime.js) load the same bundle for path parity.
let functionPlotJsAbsPath = '';
try { functionPlotJsAbsPath = require.resolve('function-plot/dist/function-plot.js'); } catch (_e) { /* no script emitted */ }

// ── Help / version (handled before positional parsing) ─────────────────────
function listAvailablePalettes() {
  try {
    return fs.readdirSync(path.join(PKG_ROOT, 'themes'))
      .filter(f => f.endsWith('.css'))
      .map(f => f.replace('.css', ''))
      .join(', ');
  } catch (_e) { return '(themes/ not readable)'; }
}

function showHelp() {
  console.log(`lattice-emulator — PDF / PPTX / PNG / HTML renderer for Lattice decks

USAGE
  node lattice-emulator.js <source.md> <output.pdf|.pptx|.png> [palette]
  node lattice-emulator.js <source.md> <custom.css> <output> [palette]

ARGUMENTS
  source.md          Markdown source (required)
  output             Output path (required); the extension picks the format:
                       .pdf   vector PDF, selectable text (default; + HTML sidecar)
                       .pptx  PowerPoint, one full-bleed slide image per slide
                       .png   one PNG per slide, written as <output>.NNN.png
                     An HTML sidecar is always written alongside.
  custom.css         Optional layout CSS override; if omitted, the bundled
                     lattice.css from the install dir is used
  palette            Palette name (e.g. 'indaco', 'cuoio')

OPTIONS
  -h, --help              Show this help and exit
  -v, --version           Show version and exit
  -o, --output PATH       Output path (alternative to positional output)
  -p, --palette NAME      Palette name (alternative to positional palette)
  -c, --css PATH          Layout CSS override (alternative to positional custom.css)
  -q, --quiet             Suppress non-error progress output
      --notes             Also write a plaintext speaker-notes sidecar
                          (<output>.notes.txt), one block per slide
      --notes-icon        Show a clickable sticky-note icon on each slide with
                          a note (default: notes are embedded but hidden)

  Both --flag value and --flag=value syntax accepted. Positional args still
  work; named flags take precedence when both are supplied.

SPEAKER NOTES
  A non-directive HTML comment on a slide is that slide's speaker note
  (Marp-faithful; see spec/LFM-1.0.md). Each note is embedded as a per-page PDF
  text annotation and a hidden HTML presenter-notes channel. By default the PDF
  annotation is hidden — the note is embedded and tool-extractable, but no icon
  marks the slide; --notes-icon exposes a clickable sticky note instead. --notes
  additionally writes a plaintext sidecar. Tooling pragmas (markdownlint /
  prettier) are not notes.

PALETTE RESOLUTION (highest precedence first)
  1. CLI palette positional argument
  2. LATTICE_PALETTE environment variable
  3. Deck front-matter \`theme:\` directive
  4. Default 'indaco'

  Available palettes: ${listAvailablePalettes()}

EXIT CODES
  0  Success
  1  Usage error, missing file, palette not found, or render failure

EXAMPLES
  node lattice-emulator.js deck.md out.pdf
  node lattice-emulator.js deck.md out.pptx          # PowerPoint (image slides)
  node lattice-emulator.js deck.md out.png           # → out.001.png, out.002.png, …
  node lattice-emulator.js deck.md out.pdf cuoio
  node lattice-emulator.js deck.md custom-layouts.css out.pdf cuoio
  LATTICE_PALETTE=cuoio node lattice-emulator.js deck.md out.pdf
`);
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkg = require('./package.json');
  console.log(`lattice-emulator ${pkg.version}`);
  process.exit(0);
}

// Argv parsing — supports both named flags and positional args. The layout
// CSS positional is optional; the bundled `lattice.css` is auto-resolved
// when no .css positional is given.
//
//   node lattice-emulator.js source.md output.pdf [palette]                 # bundled
//   node lattice-emulator.js source.md custom.css output.pdf [palette]      # override
//   node lattice-emulator.js -o out.pdf -p cuoio source.md                  # named flags
//
// Named flags take precedence over positional args when both are given.
function parseArgs(argv) {
  const flags = { quiet: false };
  const positional = [];
  const opts = {
    '-o': 'output', '--output': 'output',
    '-p': 'palette', '--palette': 'palette',
    '-c': 'css', '--css': 'css',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-q' || a === '--quiet') { flags.quiet = true; continue; }
    if (a === '--notes') { flags.notes = true; continue; }
    if (a === '--notes-icon') { flags['notes-icon'] = true; continue; }
    // --flag=value form
    const eq = a.match(/^(--?[A-Za-z][\w-]*)=(.*)$/);
    if (eq && opts[eq[1]]) { flags[opts[eq[1]]] = eq[2]; continue; }
    // --flag value form
    if (opts[a]) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('-')) {
        console.error(`error: ${a} requires a value`);
        process.exit(1);
      }
      flags[opts[a]] = v;
      i++;
      continue;
    }
    if (a.startsWith('-')) {
      console.error(`error: unknown option: ${a}`);
      console.error('Run with --help to see available options.');
      process.exit(1);
    }
    positional.push(a);
  }
  return { flags, positional };
}

const { flags, positional } = parseArgs(process.argv.slice(2));

// Resolve mdFile + outFile + cssFile + paletteArg from positionals, with
// named flags overriding. Positional shape:
//   [source.md] [output.pdf | custom.css] [output.pdf | palette] [palette]
const mdFile = positional[0];
let cssFile, outFile, paletteArg;
if (positional[1]?.endsWith('.css')) {
  cssFile    = positional[1];
  outFile    = positional[2];
  paletteArg = positional[3];
} else {
  cssFile    = path.join(PKG_ROOT, 'dist', 'lattice.css');
  outFile    = positional[1];
  paletteArg = positional[2];
}
// Named flags override positional resolution.
if (flags.css)     cssFile    = flags.css;
if (flags.output)  outFile    = flags.output;
if (flags.palette) paletteArg = flags.palette;
const QUIET = flags.quiet;
const NOTES_SIDECAR = !!flags.notes;
const NOTES_ICON = !!flags['notes-icon'];

if (!mdFile || !outFile) {
  console.error('Usage:');
  console.error('  node lattice-emulator.js source.md output.pdf [palette]               # bundled lattice.css');
  console.error('  node lattice-emulator.js source.md custom.css output.pdf [palette]    # explicit layout CSS');
  console.error('  node lattice-emulator.js [-o out.pdf] [-p palette] [-c css] source.md # named flags');
  console.error('');
  console.error('Run with --help for full options. Default palette: indaco.');
  process.exit(1);
}

// Output format is driven by the output extension: `.pptx` → image-per-slide
// PowerPoint (owned, via pptxgenjs), `.png` → one PNG per slide (`<base>.NNN.png`),
// anything else → the vector PDF (the original, selectable-text path). PPTX/PNG
// are rasterized from the same headless-Chromium render the PDF uses, so all
// three formats are byte-for-byte the same pixels.
const OUT_EXT = path.extname(outFile).toLowerCase();
const OUT_FORMAT = OUT_EXT === '.pptx' ? 'pptx' : (OUT_EXT === '.png' ? 'png' : 'pdf');

// Friendly error wrapper for file reads. Bare ENOENT throws produce
// stack traces that look like crashes; this surfaces them as one-line
// errors with exit code 1.
function readFileOrDie(p, label) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') console.error(`error: ${label} not found: ${p}`);
    else if (e.code === 'EACCES') console.error(`error: ${label} not readable (permission denied): ${p}`);
    else console.error(`error: failed to read ${label} (${p}): ${e.message}`);
    process.exit(1);
  }
}

const md = readFileOrDie(mdFile, 'source markdown');

// Resolve palette name from the precedence chain (CLI > env > front
// matter > default). Logic lives in lib/resolve-palette.js so it can
// be unit-tested in isolation; see test/unit/palette-resolution.test.js.
const { resolvePalette } = require('./lib/core/resolve-palette');
const paletteName = resolvePalette({ md, cliArg: paletteArg }).name;
// The a11y-* palettes are first-class themes (pick `theme: a11y-deuteranopia`
// like any theme). Their categorical fills reference texture <pattern> <defs>
// — SVG markup CSS can't hold — so emit them on every render. They're inert
// unless an a11y theme's CSS references them, so there's no palette-name gate;
// this matches the Drawing Board's always-on injection (drawing-board.astro).
const a11yTextureDefs = require('./lib/core/accessibility-textures').texturePatternDefs();
const palettePath = path.join(PKG_ROOT, 'themes', `${paletteName}.css`);
if (!fs.existsSync(palettePath)) {
  console.error(`error: palette not found: ${paletteName}`);
  console.error(`       (looked in ${palettePath})`);
  console.error(`available palettes: ${listAvailablePalettes()}`);
  process.exit(1);
}
// Load the palette and any sibling palette imports it declares (e.g.
// cuoio-dark.css imports cuoio.css). The palette parser scans `:root`
// blocks of this combined string, so the dark variants inherit every
// token defined in the parent without duplicating declarations.
function loadPaletteWithImports(filePath, seen = new Set(), label = null) {
  if (seen.has(filePath)) return '';
  seen.add(filePath);
  const content = readFileOrDie(filePath, label ?? `palette '${path.basename(filePath, '.css')}'`);
  // Match `@import 'name';` and `@import "name";` and `@import name;`.
  // The lattice palette convention is single-token names (cuoio, indaco)
  // resolved relative to the themes/ directory.
  const importRe = /@import\s+["']?([A-Za-z0-9_-]+)["']?\s*;/g;
  let imported = '';
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const name = m[1];
    if (name === 'lattice') continue; // layout CSS, loaded separately
    const importPath = path.join(path.dirname(filePath), `${name}.css`);
    if (fs.existsSync(importPath)) {
      imported += loadPaletteWithImports(importPath, seen) + '\n';
    }
  }
  // Parent first so child :root blocks override on identical token names
  // (matches CSS cascade order).
  return imported + content;
}

const paletteCSS = loadPaletteWithImports(palettePath);
const layoutCSS  = loadPaletteWithImports(cssFile, new Set(), 'layout CSS');
const css = paletteCSS + '\n' + layoutCSS;

// ── Mermaid renderer ─────────────────────────────────────────────────────────
// Two surfaces wire the rendered SVG to the active palette:
//
//   1. themeVariables.  Mermaid inlines a handful of values into the SVG
//      as attributes (gradient stops, gantt grid lines, marker fills).
//      CSS can't reach those — they must come from this map. The map below
//      is structural metadata; values come from the active palette's
//      --diagram-* / --cat-* / --text-* tokens.
//
//   2. lattice.css "DIAGRAM OVERRIDES" section.  Per-diagram CSS
//      (`section .section-N rect { fill: var(--cat-3-fill) }` and so
//      on) that target classes Mermaid emits but doesn't theme. Loaded as
//      a normal page stylesheet via lattice.css; the mmdc-produced SVG is
//      embedded inline in the host HTML, so the host stylesheet cascades
//      onto it at PDF-rasterize time — same mechanism the runtime preview
//      already uses. No Mermaid `themeCSS` init parameter is used.
//
// See engineering/decisions/2026-05-12-diagram-tokens.md for the architecture.

// ── Mermaid theme variables — structural map only ───────────────────────
// The mapping below names which Mermaid theme variable corresponds to which
// CSS custom property in the active palette. The CSS variables hold the
// actual hex values; this map is structural and unchanging across palettes.
//
// Adding a new palette doesn't require editing this file — define the same
// CSS custom properties in themes/<n>.css and the same mapping resolves
// against the new values.
//
// Reference for the variable inventory: https://mermaid.js.org/config/theming.html
const MERMAID_VAR_MAP = {
  // Typography (literal — fonts are structural, not palette-specific)
  fontFamily: { literal: '"JetBrains Mono", monospace' },
  fontSize:   { literal: '14px' },

  // Canvas
  background:               { var: 'bg' },

  // Primary/secondary/tertiary fills (pale band)
  primaryColor:             { var: 'cat-1-fill' },
  secondaryColor:           { var: 'cat-2-fill' },
  tertiaryColor:            { var: 'bg-alt' },
  primaryBorderColor:       { var: 'diagram-stroke' },
  secondaryBorderColor:     { var: 'diagram-stroke' },
  tertiaryBorderColor:      { var: 'diagram-stroke' },

  // Text — ONE token, --cat-on-fill, for every text element. It flips
  // with the canvas (dark ink on a light canvas, light ink on a dark
  // canvas). No "shape text vs canvas text" split: the fills flip with
  // the canvas too, so ink and fill always stay matched. Text on a
  // categorical fill, text on a pale surface, titles, edge labels —
  // all the same token, all flip together.
  primaryTextColor:         { var: 'cat-on-fill' },
  secondaryTextColor:       { var: 'cat-on-fill' },
  tertiaryTextColor:        { var: 'cat-on-fill' },
  textColor:                { var: 'cat-on-fill' },
  titleColor:               { var: 'cat-on-fill' },
  labelTextColor:           { var: 'cat-on-fill' },
  loopTextColor:            { var: 'cat-on-fill' },
  classText:                { var: 'cat-on-fill' },
  labelColor:               { var: 'cat-on-fill' },

  // Lines (near-black on white canvas)
  lineColor:                { var: 'diagram-line' },
  defaultLinkColor:         { var: 'diagram-line' },
  edgeLabelBackground:      { var: 'bg' },
  labelBackground:          { var: 'bg' },

  // Main background paths
  mainBkg:                  { var: 'cat-1-fill' },
  nodeBorder:               { var: 'diagram-stroke' },
  nodeTextColor:            { var: 'cat-on-fill' },   // flowchart node text, on fill
  clusterBkg:               { var: 'bg-alt' },
  clusterBorder:            { var: 'diagram-stroke' },

  // cScale (mid-tone band) — kanban lighten brings to L≈70
  cScale0:                  { var: 'cat-1-mark' },
  cScale1:                  { var: 'cat-2-mark' },
  cScale2:                  { var: 'cat-3-mark' },
  cScale3:                  { var: 'cat-4-mark' },
  cScale4:                  { var: 'cat-5-mark' },
  cScale5:                  { var: 'cat-6-mark' },
  cScale6:                  { var: 'cat-1-mark' },
  cScale7:                  { var: 'cat-2-mark' },
  cScale8:                  { var: 'cat-3-mark' },
  cScale9:                  { var: 'cat-4-mark' },
  cScale10:                 { var: 'cat-5-mark' },
  cScale11:                 { var: 'cat-6-mark' },

  // cScaleLabel — text fill in Mermaid's auto-generated
  // `.section-${r-1} text { fill: cScaleLabel${r} }` rule. Mermaid's own
  // contrast-aware derivation lands on white when fed mid-tone cScale,
  // which fails against our pale band fills. Setting each slot to the
  // paired band-text token (all map to --text-heading in shipped palettes)
  // ensures the auto rule renders dark ink, regardless of whether our
  // explicit CSS overrides match the diagram in question.
  cScaleLabel0:  { var: 'cat-on-fill' },
  cScaleLabel1:  { var: 'cat-on-fill' },
  cScaleLabel2:  { var: 'cat-on-fill' },
  cScaleLabel3:  { var: 'cat-on-fill' },
  cScaleLabel4:  { var: 'cat-on-fill' },
  cScaleLabel5:  { var: 'cat-on-fill' },
  cScaleLabel6:  { var: 'cat-on-fill' },
  cScaleLabel7:  { var: 'cat-on-fill' },
  cScaleLabel8:  { var: 'cat-on-fill' },
  cScaleLabel9:  { var: 'cat-on-fill' },
  cScaleLabel10: { var: 'cat-on-fill' },
  cScaleLabel11: { var: 'cat-on-fill' },

  // fillType (subgraph / mindmap-level fills, pale band)
  fillType0: { var: 'cat-1-fill' },
  fillType1: { var: 'cat-2-fill' },
  fillType2: { var: 'cat-3-fill' },
  fillType3: { var: 'cat-4-fill' },
  fillType4: { var: 'cat-5-fill' },
  fillType5: { var: 'cat-6-fill' },
  fillType6: { var: 'cat-1-fill' },
  fillType7: { var: 'cat-2-fill' },

  // Sequence diagram
  actorBkg:                 { var: 'cat-1-fill' },
  actorBorder:              { var: 'diagram-stroke' },
  actorTextColor:           { var: 'cat-on-fill' },   // sequence actor text, on fill
  actorLineColor:           { var: 'diagram-line' },
  signalColor:              { var: 'diagram-line' },
  signalTextColor:          { var: 'cat-on-fill' },
  labelBoxBkgColor:         { var: 'bg-alt' },
  labelBoxBorderColor:      { var: 'diagram-stroke' },
  activationBorderColor:    { var: 'diagram-stroke' },
  activationBkgColor:       { var: 'cat-1-fill' },
  sequenceNumberColor:      { var: 'cat-on-fill' },

  // Notes (yellow accent — category-distinct)
  noteBkgColor:             { var: 'diagram-note' },
  noteTextColor:            { var: 'cat-on-fill' },
  noteBorderColor:          { var: 'diagram-today' },

  // Error (alarm — saturated red)
  errorBkgColor:            { var: 'diagram-critical' },
  errorTextColor:           { var: 'cat-on-fill' },

  // Pie chart (pale band cycle — unified contract)
  pie1:  { var: 'cat-1-fill' },
  pie2:  { var: 'cat-2-fill' },
  pie3:  { var: 'cat-3-fill' },
  pie4:  { var: 'cat-4-fill' },
  pie5:  { var: 'cat-5-fill' },
  pie6:  { var: 'cat-6-fill' },
  pie7:  { var: 'cat-7-fill' },
  pie8:  { var: 'cat-8-fill' },
  pie9:  { var: 'cat-9-fill' },
  pie10: { var: 'cat-10-fill' },
  pie11: { var: 'cat-11-fill' },
  pie12: { var: 'cat-12-fill' },
  pieTitleTextSize:    { literal: '18px' },
  pieTitleTextColor:   { var: 'cat-on-fill' },
  pieSectionTextSize:  { literal: '14px' },
  pieSectionTextColor: { var: 'cat-on-fill' },   // text on pie slices, on fill
  pieLegendTextSize:   { literal: '13px' },
  pieLegendTextColor:  { var: 'cat-on-fill' },
  pieStrokeColor:      { var: 'bg' },
  pieStrokeWidth:      { literal: '2px' },
  pieOuterStrokeWidth: { literal: '2px' },
  pieOuterStrokeColor: { var: 'diagram-stroke' },
  pieOpacity:          { literal: '1' },

  // Gantt (pale bars, dark text, alarm-only saturation)
  sectionBkgColor:        { var: 'bg-alt' },
  altSectionBkgColor:     { var: 'bg' },
  sectionBkgColor2:       { var: 'cat-1-fill' },
  taskBkgColor:           { var: 'cat-1-fill' },
  taskTextColor:          { var: 'cat-on-fill' },   // text on task bar, on fill
  taskTextLightColor:     { var: 'cat-on-fill' },   // ditto, Mermaid's "dark bar" variant
  taskTextOutsideColor:   { var: 'cat-on-fill' },  // text in the margin, on canvas
  taskTextClickableColor: { var: 'cat-on-fill' },   // text on task bar, on fill
  taskBorderColor:        { var: 'diagram-stroke' },
  activeTaskBkgColor:     { var: 'diagram-active' },
  activeTaskBorderColor:  { var: 'diagram-active-mark' },
  gridColor:              { var: 'diagram-done' },
  doneTaskBkgColor:       { var: 'diagram-done' },
  doneTaskBorderColor:    { var: 'diagram-done-mark' },
  critBkgColor:           { var: 'diagram-critical' },
  critBorderColor:        { var: 'diagram-critical-mark' },
  todayLineColor:         { var: 'diagram-today' },

  // Git graph
  git0: { var: 'cat-1-mark' },
  git1: { var: 'cat-2-mark' },
  git2: { var: 'cat-3-mark' },
  git3: { var: 'cat-4-mark' },
  git4: { var: 'cat-5-mark' },
  git5: { var: 'cat-6-mark' },
  git6: { var: 'cat-8-mark' },
  git7: { var: 'cat-7-mark' },
  gitBranchLabel0: { var: 'cat-on-fill' },
  gitBranchLabel1: { var: 'cat-on-fill' },
  gitBranchLabel2: { var: 'cat-on-fill' },
  gitBranchLabel3: { var: 'cat-on-fill' },
  gitBranchLabel4: { var: 'cat-on-fill' },
  gitBranchLabel5: { var: 'cat-on-fill' },
  gitBranchLabel6: { var: 'cat-on-fill' },
  gitBranchLabel7: { var: 'cat-on-fill' },
  commitLabelColor:      { var: 'cat-on-fill' },
  commitLabelBackground: { var: 'bg-alt' },
  tagLabelColor:         { var: 'cat-on-fill' },  // flips with canvas
  tagLabelBackground:    { var: 'bg-alt' },        // neutral label chip — distinct
  tagLabelBorder:        { var: 'diagram-stroke' },       // from the colour-coded branch chips

  // Quadrant chart
  quadrant1Fill:                    { var: 'cat-1-fill' },
  quadrant2Fill:                    { var: 'cat-2-fill' },
  quadrant3Fill:                    { var: 'cat-3-fill' },
  quadrant4Fill:                    { var: 'cat-4-fill' },
  quadrant1TextFill:                { var: 'cat-1-mark' },
  quadrant2TextFill:                { var: 'cat-2-mark' },
  quadrant3TextFill:                { var: 'cat-3-mark' },
  quadrant4TextFill:                { var: 'cat-4-mark' },
  quadrantPointFill:                { var: 'diagram-stroke' },
  quadrantPointTextFill:            { var: 'cat-on-fill' },
  quadrantXAxisTextFill:            { var: 'cat-on-fill' },
  quadrantYAxisTextFill:            { var: 'cat-on-fill' },
  quadrantInternalBorderStrokeFill: { var: 'cat-8-mark' },
  quadrantExternalBorderStrokeFill: { var: 'diagram-stroke' },
  quadrantTitleFill:                { var: 'cat-on-fill' },

  // State / class
  altBackground: { var: 'bg-alt' },

  // XY chart — nested object, expanded below. plotColorPalette joins
  // multiple palette vars into a comma-separated string (Mermaid's required
  // format for this key) so each palette's --cat-* hues drive the bars and
  // lines, not a hardcoded indaco-flavoured literal.
  xyChart: { nested: {
    backgroundColor:  { var: 'bg' },
    titleColor:       { var: 'text-heading' },
    xAxisLabelColor:  { var: 'text-heading' },
    xAxisTitleColor:  { var: 'text-heading' },
    yAxisLabelColor:  { var: 'text-heading' },
    yAxisTitleColor:  { var: 'text-heading' },
    plotColorPalette: { joinVars: ['cat-1-mark', 'cat-2-mark', 'cat-3-mark', 'cat-4-mark', 'cat-5-mark', 'cat-6-mark'] },
  }},
};

// Offline value evaluator shared with the unit tests — var()/light-dark()/
// color-mix() → literal, the offline twin of getComputedStyle. See
// lib/core/resolve-token-expr.js.
const { resolveTokenExpr } = require('./lib/core/resolve-token-expr');

// ── Resolver: parses CSS custom properties from the palette file ─────────
// Walks every :root { ... } block and extracts --variable-name: <value>,
// then resolves each value with resolveTokenExpr() (var()+fallback,
// light-dark(), color-mix()). Returns a flat map suitable for feeding
// Mermaid themeVariables (which expects literal colors, not CSS expressions).
function parsePaletteVars(paletteCSSContent, forceDark) {
  // Strip CSS comments first so doc blocks containing example strings
  // like `":root{color-scheme:dark}"` don't break the :root brace matcher.
  const stripped = paletteCSSContent.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  const rootBlocks = stripped.match(/:root\s*\{[^}]*\}/g) || [];
  for (const block of rootBlocks) {
    const decls = block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || [];
    for (const d of decls) {
      const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  // Determine the palette's effective color-scheme. Mermaid renders in an
  // isolated SVG context, so `light-dark()` cannot resolve dynamically per
  // viewer; we collapse it now to whichever side matches what the deck is
  // declared as. Dark variants (e.g. cuoio-dark.css) declare
  // `color-scheme: dark` at :root; everything else is treated as light.
  // `forceDark` collapses to the dark branch regardless — used by the
  // dual-render path to bake a second, dark-scheme SVG for section.dark slides.
  const isDark = forceDark || /:root\s*\{[^}]*color-scheme\s*:\s*dark\b/.test(stripped);
  // Resolve every declaration against the RAW map with the recursive
  // evaluator. Order-independent, unlike the former "collapse light-dark,
  // then chase one-level var()" passes — those could not follow a chained
  // token (var(--cat-1-fill) → light-dark() → hex, or one token pointing at
  // another) nor evaluate color-mix(). resolveTokenExpr reads from the raw map
  // so chained var()s resolve regardless of declaration order.
  const resolved = {};
  for (const k of Object.keys(vars)) resolved[k] = resolveTokenExpr(vars[k], vars, isDark);
  return resolved;
}

// ── Build the Mermaid themeVariables object from the map + CSS vars ──────
function resolveMermaidThemeVars(paletteVars) {
  const result = {};
  const resolve = (entry) => {
    if (entry.literal !== undefined) return entry.literal;
    if (entry.var !== undefined) {
      const val = paletteVars[entry.var];
      if (!val) {
        console.warn(`  ⚠ Palette missing CSS variable: --${entry.var}`);
        return '#000000';
      }
      return val;
    }
    if (entry.joinVars !== undefined) {
      // Mermaid keys like xyChart.plotColorPalette want a comma-separated
      // string of hex values, not an array — pull each var, fall back to a
      // black sentinel on miss so a palette gap is loud, then join.
      return entry.joinVars.map(name => {
        const val = paletteVars[name];
        if (!val) {
          console.warn(`  ⚠ Palette missing CSS variable: --${name}`);
          return '#000000';
        }
        return val;
      }).join(',');
    }
    return undefined;
  };
  for (const [key, entry] of Object.entries(MERMAID_VAR_MAP)) {
    if (entry.nested) {
      result[key] = {};
      for (const [nKey, nEntry] of Object.entries(entry.nested)) {
        result[key][nKey] = resolve(nEntry);
      }
    } else {
      result[key] = resolve(entry);
    }
  }
  return result;
}

// Parse the combined cascade (layoutCSS first, then paletteCSS) so the
// universal semantic palette defaults declared in lattice.css are visible
// to the Mermaid var resolver. Theme declarations parsed last override
// defaults — matches the real browser cascade where `@import 'lattice'`
// at the top of every theme loads lattice.css first.
const PALETTE_VARS = parsePaletteVars(layoutCSS + '\n' + paletteCSS);
const MERMAID_THEME_VARS = resolveMermaidThemeVars(PALETTE_VARS);
// Dual-render dark set: the SAME palette resolved to its DARK branch. Mermaid
// bakes themeVariables to literal hex at render time (in the light scheme), so
// a single bake can't flip on a `section.dark` slide — the documented dark-mode
// gap. We bake a second SVG with dark-resolved vars and toggle the two by
// color-scheme in CSS (see mermaid.css `.mmd-light/.mmd-dark`). This makes dark
// diagrams correct natively, including Mermaid's own colour-math derivations.
// Toggle off with LATTICE_MERMAID_SINGLE=1 to fall back to the single (light)
// bake + the per-diagram CSS overrides.
const DUAL_RENDER = process.env.LATTICE_MERMAID_SINGLE !== '1';
const PALETTE_VARS_DARK = parsePaletteVars(layoutCSS + '\n' + paletteCSS, true);
const MERMAID_THEME_VARS_DARK = resolveMermaidThemeVars(PALETTE_VARS_DARK);

// ── Puppeteer config — chrome auto-detection ─────────────────────────────
// The renderer shells out to mmdc (mermaid-cli) which uses puppeteer to
// rasterize diagrams. Puppeteer needs a Chrome binary; resolution order:
//   1. PUPPETEER_EXECUTABLE_PATH env var (explicit override)
//   2. puppeteer's bundled copy under <user>/.cache/puppeteer/chrome/
//   3. system Chrome / Chromium (looked up via `which`)
// If none of these resolve, we omit executablePath and let puppeteer use
// its default (which may download a Chrome on first run).
function detectChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  // Look in known puppeteer cache locations across users.
  const possibleHomes = [];
  if (process.env.HOME) possibleHomes.push(process.env.HOME);
  // Many systems store puppeteer cache under /home/<user>/.cache/puppeteer
  // even when the script runs as a different user. Check common locations.
  try {
    if (fs.existsSync('/home')) {
      for (const u of fs.readdirSync('/home')) {
        const h = path.join('/home', u);
        if (!possibleHomes.includes(h)) possibleHomes.push(h);
      }
    }
  } catch (_e) { /* ignore */ }
  const candidates = [];
  for (const h of possibleHomes) {
    const cacheRoot = path.join(h, '.cache', 'puppeteer', 'chrome');
    if (!fs.existsSync(cacheRoot)) continue;
    try {
      for (const dir of fs.readdirSync(cacheRoot)) {
        const linuxBin = path.join(cacheRoot, dir, 'chrome-linux64', 'chrome');
        if (fs.existsSync(linuxBin)) candidates.push(linuxBin);
        const macArm = path.join(cacheRoot, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
        if (fs.existsSync(macArm)) candidates.push(macArm);
        const macX64 = path.join(cacheRoot, dir, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
        if (fs.existsSync(macX64)) candidates.push(macX64);
      }
    } catch (_e) { /* skip unreadable */ }
  }
  if (candidates.length > 0) {
    return candidates.sort().reverse()[0];
  }
  // Fall back to system chrome/chromium via PATH lookup.
  const systemBins = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  for (const bin of systemBins) {
    try {
      const which = require('child_process')
        .execSync(`which ${bin}`, { stdio: ['pipe', 'pipe', 'ignore'] })
        .toString().trim();
      if (which) return which;
    } catch (_e) { /* not found, try next */ }
  }
  return null;
}

const CHROME_EXEC = detectChromeExecutable();
const PUPPETEER_CONFIG = JSON.stringify(
  CHROME_EXEC
    ? { executablePath: CHROME_EXEC, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
    : { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
);
if (!CHROME_EXEC) {
  console.warn('  ⚠ No Chrome binary detected. Set PUPPETEER_EXECUTABLE_PATH or install puppeteer to download one.');
}

function renderMermaidOne(definition, themeVars, extraClass) {
  // Prepend the Mermaid init block if not already present.
  // JetBrains Mono is bundled by the lattice.css font import and is the
  // safe default for diagrams: predictable character widths, no measurement
  // drift between the layout pass and render pass.
  //
  // No `themeCSS` field is set: per-diagram CSS overrides live in
  // lattice-diagram.css and reach the SVG via the host page's stylesheet
  // cascade (the mmdc-produced SVG is embedded inline in the host HTML at
  // PDF-rasterize time). themeVariables is enough here because it covers
  // the values Mermaid inlines as SVG attributes — gradient stops, marker
  // fills, gantt grid lines — which no external CSS can reach.
  const hasInit = definition.includes('%%{init');
  const initObj = {
    theme: 'base',
    themeVariables: themeVars,
    // C4 ships with shape widths tuned for very short Person()/System()
    // labels and never wraps. Limit shapes-per-row to 3 (default 4) so a
    // 5-shape diagram fans across two rows rather than cramming a single
    // tight strip. Width/height keys exist in the schema but Mermaid 11's
    // c4 renderer ignores them — fix authoring-side by keeping labels short.
    c4: {
      c4ShapeInRow: 3,
      c4BoundaryInRow: 1,
    },
  };
  // Mermaid requires YAML frontmatter (--- ... ---) to be the FIRST thing in
  // the source. If the diagram opens with frontmatter, inject %%{init}%%
  // AFTER the closing fence; otherwise prepend it normally.
  const initDirective = `%%{init: ${JSON.stringify(initObj)}}%%`;
  let themed;
  if (hasInit) {
    themed = definition;
  } else {
    const fmMatch = definition.match(/^---\n[\s\S]*?\n---\n/);
    themed = fmMatch
      ? `${fmMatch[0]}${initDirective}\n${definition.slice(fmMatch[0].length)}`
      : `${initDirective}\n${definition}`;
  }

  const tmpDir    = fs.mkdtempSync(path.join(os.tmpdir(), 'mmd-'));
  const inFile    = path.join(tmpDir, 'diagram.mmd');
  const outSvg    = path.join(tmpDir, 'diagram.svg');
  const cfgFile   = path.join(tmpDir, 'puppeteer.json');

  fs.writeFileSync(inFile,  themed);
  fs.writeFileSync(cfgFile, PUPPETEER_CONFIG);

  // mmdc / Puppeteer has known transient failures (browser startup races,
  // network hiccups when fetching CDN-hosted icon sets for architecture/c4).
  // Retry up to 3 times before falling back. Each attempt is fully isolated:
  // we delete any stale output between tries.
  const MAX_ATTEMPTS = 3;
  let lastError = null;
  // Resolve mmdc binary explicitly — falls back to bare 'mmdc' on PATH if the
  // local install is missing. Direct `node lattice-emulator.js` doesn't include
  // node_modules/.bin in PATH the way `npm run` does.
  const localMmdc = path.join(PKG_ROOT, 'node_modules', '.bin', 'mmdc');
  const mmdcBin   = fs.existsSync(localMmdc) ? localMmdc : 'mmdc';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (fs.existsSync(outSvg)) fs.unlinkSync(outSvg);
      execSync(
        `"${mmdcBin}" -i "${inFile}" -o "${outSvg}" --backgroundColor transparent --puppeteerConfigFile "${cfgFile}"`,
        { stdio: 'pipe' }
      );
      if (!fs.existsSync(outSvg) || fs.statSync(outSvg).size === 0) {
        throw new Error('mmdc exited cleanly but produced no SVG');
      }
      let svg = fs.readFileSync(outSvg, 'utf8');
      // mmdc hardcodes the SVG root id to "my-svg" and prefixes every internal
      // id (markers, gradients, filters) and every emitted CSS rule with that
      // same string. When a slide deck embeds many Mermaid SVGs in one HTML,
      // their `<style>` blocks all use `#my-svg .node …` selectors that step
      // on each other — the last diagram's theme variables (e.g. a treeview
      // with primaryColor="#FFFFFF") silently override every prior diagram's
      // node fills. Rewrite to a per-diagram suffix so the SVGs are isolated.
      // The replacement is a single global substitution: it catches the root
      // id, every internal id (e.g. my-svg-flowchart-A-0), every url(#my-svg…)
      // reference, and every #my-svg selector inside the embedded <style>.
      const uniqueId = `lattice-mmd-${renderMermaidOne.counter = (renderMermaidOne.counter || 0) + 1}`;
      svg = svg.replace(/my-svg/g, uniqueId);
      // Mermaid sankey (11.14) has a label-rendering bug: it appends the
      // outbound-link value to the source node's <text> as raw HTML <p>…</p>,
      // breaking SVG text positioning and concatenating labels visually.
      // Strip any <p>…</p> from inside <text>…</text>: the link-value labels
      // are unrecoverable here (they'd need a separate <text> with proper
      // positioning), so the deck-friendly fallback is "keep just the node
      // name" — same trade Mermaid's own docs recommend when sankey labels
      // overlap. Sankey-only by virtue of <p> never appearing inside <text>
      // in any other diagram type's emitted SVG.
      // Mermaid sankey (11.14) emits each node's <text> with the node name on
      // line 1 and the outbound-link value on line 2, separated by a literal
      // newline:   <text>Wages\n750</text>
      // SVG ignores newlines inside <text> (no <tspan>, no line break), but
      // the post-mmdc pipeline runs the HTML through marp/markdown-it, which
      // parses `\n\n` inside the inlined SVG as a paragraph break and wraps
      // the value in <p>…</p>. The resulting <text>Wages<p>750</text> is
      // invalid SVG and breaks text positioning, producing the visible
      // "750Disposable income750Savings…" run-together labels. Sankey is the
      // only diagram type that puts newlines inside <text>; gate on the
      // sankey-specific <g class="links"> marker so the substitution doesn't
      // touch <text> elements in any other diagram type.
      if (svg.includes('<g class="links"')) {
        svg = svg.replace(/(<text\b[^>]*>)([\s\S]*?)(<\/text>)/g, (_m, open, inner, close) => {
          const collapsed = inner.replace(/\s*\n\s*/g, ' ').trim();
          return `${open}${collapsed}${close}`;
        });
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
      const cls = extraClass ? `mermaid-svg ${extraClass}` : 'mermaid-svg';
      return `<div class="${cls}">${svg}</div>`;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS) {
        // Brief backoff before retry — gives Puppeteer time to release
        // any zombie chrome processes from the failed attempt.
        execSync('sleep 1');
      }
    }
  }
  console.warn(`  ⚠ Mermaid render failed after ${MAX_ATTEMPTS} attempts:`, lastError.message.split('\n')[0]);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return `<pre class="mermaid-fallback">${definition}</pre>`;
}

// Scheme-aware render: a diagram is baked with the dark-resolved themeVars when
// its slide is dark, else the light-resolved set. Mermaid bakes themeVariables
// to literal hex at render time, so a light bake can't flip on a section.dark
// slide — the documented dark-mode gap. Baking the correct scheme per slide
// closes it natively (including Mermaid's own colour-math derivations), with no
// per-element CSS overrides and no wasted second SVG on single-scheme decks.
// Author-supplied %%{init}%% diagrams keep their own theming.
// LATTICE_MERMAID_SINGLE=1 forces the light bake everywhere (fallback to the
// CSS-override path).
function renderMermaid(definition, dark) {
  const themeVars = dark && DUAL_RENDER ? MERMAID_THEME_VARS_DARK : MERMAID_THEME_VARS;
  return renderMermaidOne(definition, themeVars, null);
}

// ── Pre-process markdown: render mermaid blocks before slide splitting ────────
// Each fence is rendered for the colour-scheme of ITS slide: the nearest
// preceding `<!-- _class: … -->` decides (a `dark` token => dark bake), falling
// back to a deck-wide `class:`/`color-scheme:dark` signal in the front matter.
// (geometry/orientation helpers — used here AND in the page-geometry block below;
// required up here because preprocessMermaid runs before that block.)
const { resolveSize, orientationFor, orientationCss } = require('./lib/engine/css');
const { reorientMermaidForPortrait } = require('./lib/integrations/mermaid/reorient');
function preprocessMermaid(source) {
  const fmMatch = source.match(/^---\n[\s\S]*?\n---/);
  const fm = fmMatch ? fmMatch[0] : '';
  const globalDark =
    /^\s*class:\s*["']?[^"'\n]*\bdark\b/m.test(fm) ||
    /color-scheme\s*:\s*dark/.test(fm);
  // Deck-wide orientation, resolved from the `size:` directive the same way the
  // page geometry below does. A portrait deck reorients LR/RL flowcharts to
  // TB/BT (lib/integrations/mermaid/reorient.js) so a wide graph flows down the
  // tall frame instead of shrinking to a thin strip; landscape is untouched.
  const sizeName = (fm.match(/^\s*size:\s*["']?([\w:/-]+)["']?\s*$/m) || [])[1] || 'hd';
  const orientation = orientationFor(resolveSize(sizeName, [paletteCSS, layoutCSS])).name;
  return source.replace(/```mermaid\n([\s\S]*?)```/g, (_match, def, offset) => {
    const before = source.slice(0, offset);
    const classDirectives = [...before.matchAll(/<!--\s*_class:\s*([^>]*?)\s*-->/g)];
    const slideDark = classDirectives.length
      ? /\bdark\b/.test(classDirectives[classDirectives.length - 1][1])
      : globalDark;
    if (!QUIET) process.stdout.write(`  Rendering mermaid diagram (${slideDark ? 'dark' : 'light'})...`);
    const svg = renderMermaid(reorientMermaidForPortrait(def.trim(), orientation), slideDark);
    if (!QUIET) console.log(' done');
    return svg;
  });
}


const rawMd = preprocessMermaid(md);
const fmMatch = rawMd.match(/^---([\s\S]*?)---\n/);
const fm      = fmMatch ? fmMatch[1] : '';
// Slide geometry — ONE registry (HARD RULE #1). The page template needs pixel
// dimensions for the puppeteer PDF; rather than duplicate a size table (which
// drifted — it used to omit 16:9 and silently rendered it as hd), resolve the
// `@size` directive through the engine's own `resolveSize`, the same lookup the
// scaffold bakes into `@page`. `paletteCSS`/`layoutCSS` carry every theme +
// base `@size` declaration (theme first, then base — composeCss's source order).
// (resolveSize / orientationCss required above, before preprocessMermaid.)
const deckSizeName   = (fm.match(/^\s*size:\s*["']?([\w:/-]+)["']?\s*$/m) || [])[1] || 'hd';
const _geom          = resolveSize(deckSizeName, [paletteCSS, layoutCSS]);
const slideW         = parseFloat(_geom.width);
const slideH         = parseFloat(_geom.height);
// Orientation scaling/fill (social/mobile portrait + square @sizes). Empty for
// landscape, so the HD/4K PDF is byte-identical. Same helper the engine
// scaffold + runtime use, so every render path agrees.
const orientationStyle = orientationCss(_geom);
// Deck-wide `style:` directive — Marp injects this CSS verbatim into the
// rendered output. Authors use it for ad-hoc overrides like
// `style: ":root{color-scheme:dark}"` without needing a custom theme.
// Two forms are supported: an inline string (`style: "..."`) and a YAML
// block scalar (`style: |` followed by indented lines).
function readGlobalStyle(fmText) {
  const inline = fmText.match(/^\s*style:\s*(["'])([\s\S]*?)\1\s*$/m);
  if (inline) return inline[2];
  // `(?=^\S|$(?![\s\S]))` — stop at the next top-level YAML key or at the
  // absolute end of the frontmatter string. JS regex has no `\Z` anchor,
  // so we spell end-of-input as `$` with a negative lookahead for any
  // remaining characters.
  const block = fmText.match(/^\s*style:\s*\|\s*\r?\n([\s\S]*?)(?=^\S|$(?![\s\S]))/m);
  if (block) {
    return block[1]
      .split(/\r?\n/)
      .map((l) => l.replace(/^ {2}/, '')) // strip the YAML indent (≥2 spaces)
      .join('\n')
      .trimEnd();
  }
  return '';
}
const globalStyle = readGlobalStyle(fm);

// `![bg …]` half-canvas image handling — the engine path uses liftBgImages
// (markdown pre-pass) + wrapImageText (HTML post-pass) to reproduce the
// lattice-bg/image-text panel, since lib/engine matches marp WEB mode (which
// collapses bg left/right to a full-bleed background). See engineSlides().
const bgImage            = require('./lib/core/bg-image');
const imageDimensions    = require('./lib/core/image-dimensions');

// ── P2: the markdown→slide engine (lib/engine) is the emulator's parser ─────
// Lattice converges on ONE markdown implementation: the owned lib/engine, the
// same engine that powers marp.config.js. parseSlide — the bespoke regex parser
// the emulator shipped with — is retired (P2 step d). The corpus flip-A/B
// (tools/emulator-flip-ab.mjs) gated this swap to zero regressions; see
// engineering/decisions/2026-06-11-emulator-on-engine-p2.md.
//
// The engine runs the SAME plugins + registry + highlight.js + KaTeX + deck-logo
// + island injectors, so the emulator only has to:
//   - feed the mermaid-preprocessed source WITH front matter (rawMd), so the
//     engine's directive layer resolves paginate/header/footer/class/size;
//   - re-tag each section with `data-lattice-slide` (the engine omits it; the
//     page template's sizing / overflow watcher / PDF pagination key off it).

// Depth-counted scan over <section>…</section> so nested split-panel sections
// stay inside their parent. Produces the "one <section> string per slide" array
// shape the emulator's downstream (highlight, deck-logo, page template) expects,
// from the engine's assembled <div class="marpit"> document.
function splitTopLevelSections(marpitHtml) {
  const out = [];
  const re = /<section\b[^>]*>|<\/section>/gi;
  let depth = 0;
  let start = -1;
  let m;
  while ((m = re.exec(marpitHtml)) !== null) {
    if (m[0][1] === '/') {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(marpitHtml.slice(start, re.lastIndex));
        start = -1;
      }
    } else {
      if (depth === 0) start = m.index;
      depth++;
    }
  }
  return out;
}

function engineSlides() {
  const latticeEngine = require('./lib/engine');
  // mathOutput:'html' drops KaTeX's hidden MathML annotation — it can't be read
  // in a PDF and its unclipped layout trips the slide overflow watcher (a stale
  // ring), matching the emulator's own `output:'html'` KaTeX call.
  const engine = latticeEngine.createEngine({ mathOutput: 'html' });
  engine.addThemes([readFileOrDie(cssFile, 'layout CSS'), fs.readFileSync(palettePath, 'utf8')]);
  // Rewrite `![bg side](url)` to the lattice-bg div (CSS background) BEFORE render
  // so the engine's basic-mode background ruler never collapses the split (lib/engine
  // matches marp WEB mode; the emulator's PDF path wants the half-canvas panel).
  // The deck's directory (as a file:// URL with a trailing slash) resolves
  // deck-relative asset URLs to absolute file:// URLs so they render regardless of
  // the output directory (the path-bug fix —
  // engineering/decisions/2026-06-17-image-rearchitecture.md).
  const deckBaseUrl = pathToFileURL(path.dirname(path.resolve(mdFile)) + path.sep).href;
  const { html } = engine.render(bgImage.liftBgImages(rawMd, deckBaseUrl), paletteName);
  const imageScrim = require('./lib/transformers/image-scrim');
  return splitTopLevelSections(html).map((sec, i) => {
    // Re-tag the slide index, then apply the per-section image fixups the
    // engine's basic-mode render doesn't: wrap half-canvas prose in
    // `.image-text`, and inject the contrast scrim for full/contain image
    // layouts (after the lattice-bg so it darkens the image, not the text).
    let s = bgImage.wrapImageText(sec.replace(/^<section\b/i, `<section data-lattice-slide="${i + 1}"`));
    // Adaptive image: stamp the photo's intrinsic aspect bucket, then resolve the
    // composition (bucket × data-orientation, or an explicit author class) so CSS
    // keys the whole layout off a single `[data-img-composition]` attribute.
    s = imageDimensions.stampImageBucket(s);
    s = imageDimensions.stampImageComposition(s);
    // The `statement` composition (text on a scrim over a full-bleed photo) is the
    // only one that needs a contrast scrim node; every other composition carries
    // its own contrast (solid card / matte / panel). statement is opt-in, so it's
    // always the author's `statement` class — needsScrim keys off that.
    const cls = (s.match(/^<section\b[^>]*\bclass="([^"]*)"/i) || ['', ''])[1];
    if (imageScrim.needsScrim(cls) && s.indexOf('class="image-scrim') === -1) {
      s = s.replace(/(<div class="lattice-bg[\s\S]*?<\/div>)/, `$1${imageScrim.SCRIM_HTML}`);
    }
    return s;
  });
}

const slides = engineSlides();

// ── Speaker notes ──────────────────────────────────────────────────────────
// A non-directive HTML comment on a slide is that slide's speaker note
// (Marp-faithful; LFM §3.5). notes-core is the single source shared with the
// marp-cli path (HARD RULE #1); extracting from the already-rendered `slides`
// keeps the note index aligned with the slide split (incl. `split: headings`).
// Each note is lifted into a hidden presenter-notes channel and the raw comment
// nodes are stripped — exactly what Marp does, so the rendered HTML/PDF carry
// the note once, structurally, rather than as an invisible comment.
const notesCore = require('./lib/authoring/notes-core');
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slideNotes = notesCore.extractSlideNotes(slides);
const slidesWithNotes = slides.map((sec, i) => {
  const stripped = notesCore.stripCommentNodes(sec);
  const note = slideNotes[i];
  if (!note) return stripped;
  const aside = `<aside class="lattice-notes" hidden data-slide="${i + 1}">${escapeHtml(note)}</aside>`;
  // Inject just inside the opening <section> so the channel travels with its
  // slide. `hidden` keeps it out of layout/print and the overflow watcher.
  return stripped.replace(/^(\s*<section\b[^>]*>)/i, `$1${aside}`);
});

// ── Marp-equivalent CSS for pagination and header/footer ────────────────────
// Marp injects these styles itself; we reproduce them here since we're
// not running through marp-core.
//
// Pagination uses the native Marp mechanism: the section carries a
// `data-lattice-pagination="N"` attribute, and `section::after` consumes it
// as the pseudo-element content. All visual styling (font, color, position)
// lives in lattice.css on `section::after` — see the !important block there.
// We only need the `content` rule here so the page number actually renders.
const marpSystemCss = `
/* Marp system styles — pagination content binding.
   Header/footer positioning + section::after typography live in lattice.css
   so both the CLI and the Marp VS Code preview share identical coordinates. */

section { position: relative; }

section[data-lattice-pagination]::after {
  content: attr(data-lattice-pagination);
}

/* Speaker-notes channel: a hidden, non-printing per-slide aside. Pinned off
   explicitly so a theme styling bare <aside> can never leak it into the PDF. */
aside.lattice-notes { display: none !important; }
`;

// ── Google Fonts ─────────────────────────────────────────────────────────────
const googleFonts = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Color+Emoji&display=swap" rel="stylesheet">`;

// ── Self-hosted fonts (offline PDF embedding) ────────────────────────────────
// The Google <link>/@import above needs the network. In a network-less render
// (the cloud sandbox, the pre-commit PDF rebuild) the faces never load, so the
// printed PDF embeds a serif/sans FALLBACK — committed deck PDFs then ship
// looking nothing like the design. Fix it at the render layer: base64 the
// woff2 files we self-host (assets/fonts/) into an inline @font-face block.
// These local faces win over the @import (declared later in the cascade), so
// the PDF embeds the real type with no network. Absent (e.g. the shipped npm
// bin, where assets/ isn't in the tarball) it returns '' and the @import path
// is used unchanged. Covers the full engine type stack: the display serif
// (Playfair, incl. italics), the body sans (Outfit), the mono (JetBrains), and
// the `sketch` hand pair (Caveat, Shantell Sans). See assets/fonts/README.md.
const SELF_HOSTED_FACES = [
  ['Caveat', 400, 'normal', 'caveat-400'],
  ['Caveat', 700, 'normal', 'caveat-700'],
  ['Shantell Sans', 400, 'normal', 'shantell-400'],
  ['Shantell Sans', 500, 'normal', 'shantell-500'],
  ['Shantell Sans', 700, 'normal', 'shantell-700'],
  ['Outfit', 300, 'normal', 'outfit-300'],
  ['Outfit', 400, 'normal', 'outfit-400'],
  ['Outfit', 500, 'normal', 'outfit-500'],
  ['Outfit', 600, 'normal', 'outfit-600'],
  ['Outfit', 700, 'normal', 'outfit-700'],
  ['Playfair Display', 400, 'normal', 'playfair-400'],
  ['Playfair Display', 700, 'normal', 'playfair-700'],
  ['Playfair Display', 400, 'italic', 'playfair-italic-400'],
  ['Playfair Display', 700, 'italic', 'playfair-italic-700'],
  ['JetBrains Mono', 400, 'normal', 'jetbrains-400'],
  ['JetBrains Mono', 500, 'normal', 'jetbrains-500'],
  ['JetBrains Mono', 600, 'normal', 'jetbrains-600'],
];
function embeddedFontsStyle() {
  const dir = path.join(PKG_ROOT, 'assets', 'fonts');
  if (!fs.existsSync(dir)) return '';
  const faces = [];
  for (const [family, weight, style, file] of SELF_HOSTED_FACES) {
    const fp = path.join(dir, `${file}.woff2`);
    if (!fs.existsSync(fp)) continue;
    const b64 = fs.readFileSync(fp).toString('base64');
    faces.push(
      `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};` +
      `font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2');}`,
    );
  }
  return faces.length ? `<style id="lattice-embedded-fonts">${faces.join('')}</style>` : '';
}
const embeddedFonts = embeddedFontsStyle();

// ── Build-time syntax highlighter ─────────────────────────────────────────────
// Tokenizes code at build time into <span class="token X"> elements.
// Covers: javascript, typescript, python, bash, css, yaml, json.
// Token classes match what our Lattice CSS already targets.

const TOKEN_PATTERNS = {
  comment:    { js:  /\/\/.*$/m,                           py: /#.*$/m,            sh: /#.*$/m,   css: /\/\*[\s\S]*?\*\//,       yaml: /#.*$/m  },
  string:     { js:  /(['"`])(?:\\.|(?!\1)[^\\])*\1/,      py: /(['"`]{3})[\s\S]*?\1|(['"`])(?:\\.|(?!\2)[^\\])*\2/, sh: /(['"])(?:\\.|(?!\1)[^\\])*\1/, css: /(['"])(?:\\.|(?!\1)[^\\])*\1/, yaml: /(['"])(?:\\.|(?!\1)[^\\])*\1/ },
  keyword:    { js:  /\b(const|let|var|function|return|import|export|from|default|class|extends|new|this|if|else|for|while|async|await|try|catch|throw|typeof|instanceof|of|in)\b/, py: /\b(def|class|return|import|from|as|if|elif|else|for|while|with|try|except|finally|raise|pass|in|not|and|or|is|lambda|yield|global|nonlocal|async|await)\b/, sh: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|echo|cd|ls|grep|awk|sed|cat|mkdir|cp|mv|rm)\b/, css: /\b(import|media|keyframes|root|from|to)\b/, yaml: /\b(true|false|null|yes|no)\b/ },
  builtin:    { js:  /\b(console|process|require|module|exports|Promise|Array|Object|String|Number|Boolean|JSON|Math|Error|Map|Set|Symbol|undefined|null|true|false)\b/, py: /\b(print|len|range|type|str|int|float|list|dict|set|tuple|bool|None|True|False|open|super|self|cls)\b/, sh: '', css: '', yaml: '' },
  classname:  { js:  /\b([A-Z][A-Za-z0-9_]*)\b(?=\s*[({])/, py: /\b([A-Z][A-Za-z0-9_]*)\b/, sh: '', css: /\b([a-z-]+)(?=\s*:)/, yaml: '' },
  number:     { js:  /\b\d+(\.\d+)?\b/, py: /\b\d+(\.\d+)?\b/, sh: /\b\d+\b/, css: /-?\d+(\.\d+)?(%|px|em|rem|vh|vw|s|ms|deg)?/, yaml: /\b\d+(\.\d+)?\b/ },
  punctuation:{ js:  /[{}[\]();,.]/, py: /[{}[\]():,.]/, sh: /[|;&]/, css: /[{}();:,]/, yaml: /[-:{}[\],|>]/ },
  operator:   { js:  /[+\-*/%=!<>&|^~?]+/, py: /[+\-*/%=!<>&|^~@]+/, sh: /[=+\-*/%]/, css: /[:,]/, yaml: '' },
};

function highlightCode(raw, lang) {
  const l = (lang || '').toLowerCase();
  const map = { javascript: 'js', typescript: 'js', js: 'js', ts: 'js',
                python: 'py', py: 'py',
                bash: 'sh', sh: 'sh', shell: 'sh',
                css: 'css', scss: 'css',
                yaml: 'yaml', yml: 'yaml',
                json: 'json' };
  const k = map[l];
  if (!k && l !== 'json') return raw; // no pattern set — return as-is

  // For JSON, reuse js patterns with a json-specific override
  const langKey = k || 'js';

  // Build ordered list of (tokenClass, regex) for this language
  const patterns = [];
  for (const [cls, langs] of Object.entries(TOKEN_PATTERNS)) {
    const rx = langs[langKey];
    if (rx) patterns.push([cls, rx]);
  }

  // Walk through the code character by character, finding earliest match
  let out = '';
  let remaining = raw;
  while (remaining.length > 0) {
    let earliest = null, earliestIdx = Infinity, earliestCls = '';
    for (const [cls, rx] of patterns) {
      const m = remaining.match(rx);
      if (m && m.index < earliestIdx) {
        earliestIdx = m.index;
        earliest = m;
        earliestCls = cls;
      }
    }
    if (!earliest) {
      out += remaining;
      break;
    }
    // Emit everything before the match as plain text
    if (earliestIdx > 0) out += remaining.slice(0, earliestIdx);
    // Emit the matched token wrapped in a span
    out += `<span class="token ${earliestCls}">${earliest[0]}</span>`;
    remaining = remaining.slice(earliestIdx + earliest[0].length);
  }
  return out;
}

// Apply highlighting to all <pre><code class="language-X"> blocks in slides
function applyHighlighting(html) {
  return html.replace(
    /<pre class="language-(\w+)"><code[^>]*>([\s\S]*?)<\/code><\/pre>/g,
    (_, lang, code) => {
      const highlighted = highlightCode(code, lang);
      return `<pre class="language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>`;
    }
  );
}

const highlightedSlides = slidesWithNotes.map(s => applyHighlighting(s));

// Deck-logo (`logo:`). The Form toggle + the masthead-meta / progress-rail /
// watermark injectors already ran inside engine.render (they match on section
// class). deck-logo is the ONE injector that keys off `data-lattice-slide` — which
// engineSlides() stamps AFTER engine.render — so the engine's own logo pass
// no-ops and the emulator runs it here, post-stamp. Same fn the owned engine's
// render hook uses. Called on the joined HTML (not slide-by-slide) so the "first
// slide" check in the logo rewriter (`logo-on: title`) sees source order.
const { applyDeckLogoToHtml } = require('./lib/integrations/markdown-it/plugins');
const slidesWithMeta2 = applyDeckLogoToHtml(highlightedSlides.join('\n'), rawMd);

// ── KaTeX CSS link ────────────────────────────────────────────────────────
// KaTeX's CSS references font files via relative `url(fonts/…woff2)` paths,
// so we link to the actual file in node_modules; the browser resolves the
// font URLs against that origin. file:// works under puppeteer because
// allowLocalFiles is the default for `page.goto('file://...')`.
const katexCssLink = katexCssAbsPath
  ? `<link rel="stylesheet" href="file://${katexCssAbsPath}">`
  : '';

// ── function-plot script + bootstrap ──────────────────────────────────────
// Only emitted if at least one slide actually contains a functionplot block,
// so decks that don't use it pay nothing. The bootstrap runs synchronously
// on DOMContentLoaded; puppeteer's `waitUntil: networkidle0` covers it.
const hasFunctionPlot = highlightedSlides.some(s => s.includes('class="functionplot"'));
const functionPlotScript = (hasFunctionPlot && functionPlotJsAbsPath)
  ? `<script src="file://${functionPlotJsAbsPath}"></script>
<script>
(function(){
  function inflate() {
    if (typeof window.functionPlot !== 'function') return;
    document.querySelectorAll('div.functionplot[data-fp-config]').forEach(function(div){
      if (div.dataset.fpInflated === '1') return;
      try {
        var cfg = JSON.parse(atob(div.getAttribute('data-fp-config')));
        var rect = div.getBoundingClientRect();
        cfg.target = div;
        cfg.width  = cfg.width  || Math.round(rect.width)  || 480;
        cfg.height = cfg.height || Math.round(rect.height) || 320;
        // Disable hover tip in static PDF — it only adds DOM mass.
        if (!cfg.tip) cfg.tip = { renderer: function(){} };
        window.functionPlot(cfg);
        div.dataset.fpInflated = '1';
      } catch (e) {
        div.textContent = 'functionplot error: ' + e.message;
        div.classList.add('functionplot-error');
      }
    });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', inflate);
  else inflate();
})();
</script>`
  : '';

// ── state-chart browser-measured layout bootstrap ─────────────────────────
// state-chart emits HTML nodes + a transitions JSON attr + an empty SVG
// overlay; the browser measures the laid-out nodes and draws the edges.
// Only emitted if a slide actually contains a state-chart figure, and it
// runs on DOMContentLoaded which puppeteer's networkidle0 wait covers —
// the same pre-render-then-PDF flow function-plot uses. The function body
// is the canonical installStateChartLayout from the kernel, serialised so
// the emulator and lattice-runtime share one implementation.
const hasStateChart = highlightedSlides.some(s => s.includes('state-chart-figure'));
let stateChartScript = '';
if (hasStateChart) {
  try {
    const { STATE_CHART_BROWSER_JS } = require('./lib/components/chart/state-chart/state-chart.transform');
    stateChartScript = `<script>\n${STATE_CHART_BROWSER_JS}\n</script>`;
  } catch (_e) { /* kernel unavailable; figures degrade to an empty overlay */ }
}

// ── HTML document ─────────────────────────────────────────────────────────────
const htmlDoc = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
${googleFonts}
${embeddedFonts}
${katexCssLink}
<style>
@page { size: ${slideW}px ${slideH}px; margin: 0; }
body  { margin: 0; padding: 0; }
${css}
section[data-lattice-slide] { width: ${slideW}px !important; height: ${slideH}px !important; }
${orientationStyle}
${marpSystemCss}
${globalStyle ? `\n/* Front-matter style: directive */\n${globalStyle}\n` : ''}
</style></head><body>
${a11yTextureDefs}
${slidesWithMeta2}
${functionPlotScript}
${stateChartScript}
<script>
/* Overflow watcher — tags any section whose content exceeds the slide
   frame with class "overflow" so lattice.css can draw the red warning ring.
   Mirrors the watcher in lattice-runtime.js (used by the VS Code preview). */
(function(){
  var TOL = 12;
  function check(){
    document.querySelectorAll('section[data-lattice-slide]').forEach(function(s){
      var over = s.scrollHeight > s.clientHeight + TOL
              || s.scrollWidth  > s.clientWidth  + TOL;
      s.classList.toggle('overflow', over);
    });
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', check);
  else check();
  if (typeof window !== 'undefined') window.addEventListener('resize', check);
})();
</script>
</body></html>`;

const outHtml = outFile.replace(/\.(pdf|pptx|png)$/i, '') + '.html';
// Strip the live-preview runtime (lattice-runtime.js) from the export HTML.
// A deck may embed `<script src="…/lattice-runtime.js">` for the VS Code / web
// preview; that runtime runs the overflow watcher, which CREATES the red
// ".overflow-tab" and re-marks sections on a MutationObserver/ResizeObserver/rAF
// loop — re-painting the authoring badge during print and defeating the
// export-stays-clean contract. Mermaid is pre-rendered to SVG at build time and
// styling is the embedded lattice.css, so the runtime is a documented no-op for
// the deliverable. We drop the tag rather than intercept the request per render:
// request interception adds latency to every page load (it slows the 53-component
// invariants suite enough to time out in CI). The class-strip below still clears
// the emulator's own inline-watcher ring.
const RUNTIME_SCRIPT = /[ \t]*<script\b[^>]*\blattice-runtime(?:\.min)?\.js[^>]*><\/script>\s*/gi;
fs.writeFileSync(outHtml, htmlDoc.replace(RUNTIME_SCRIPT, ''));
if (!QUIET) console.log(`HTML: ${slides.length} slides → ${outHtml}`);

// ── PDF via Puppeteer ─────────────────────────────────────────────────────────
// Locate puppeteer in either: a local node_modules (preferred), the project
// node_modules, or the mermaid-cli installation (which bundles its own copy).
function loadPuppeteer() {
  const tryPaths = [];
  // Standard resolution (project deps, current user node_modules)
  tryPaths.push('puppeteer');
  tryPaths.push('puppeteer-core');
  // mermaid-cli's bundled puppeteer — try both global install locations
  // and any local install. Use `npm root -g` to find the actual global path.
  try {
    const globalRoot = require('child_process')
      .execSync('npm root -g', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim();
    if (globalRoot) {
      tryPaths.push(path.join(globalRoot, '@mermaid-js', 'mermaid-cli', 'node_modules', 'puppeteer'));
    }
  } catch (_e) { /* npm not on path; try other fallbacks */ }
  // Local mmdc install (npm install @mermaid-js/mermaid-cli)
  tryPaths.push(path.join('node_modules', '@mermaid-js', 'mermaid-cli', 'node_modules', 'puppeteer'));
  for (const p of tryPaths) {
    try { return require(p); } catch (_e) { /* try next */ }
  }
  console.error('Puppeteer not found. Install with: npm install puppeteer');
  console.error('Or use the bundled copy: npm install -g @mermaid-js/mermaid-cli');
  process.exit(1);
}
const puppeteer = loadPuppeteer();
(async () => {
  const launchOpts = {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: 'new',
  };
  if (CHROME_EXEC) launchOpts.executablePath = CHROME_EXEC;
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  // Set viewport to slide dimensions so section's own cqi properties (padding,
  // border-top) resolve against the correct ICB in screen mode.  Without this,
  // Puppeteer's default 800×600 viewport causes section's cqi fallback to
  // resolve to 6.875% × 800 = 55 px instead of the intended 88 px (HD) or
  // 264 px (4K), which makes the overflow-detection pass see a different
  // content area than the printed PDF.
  // PDF prints at 1× (the vector page is resolution-independent). PNG/PPTX
  // rasterize, so scale up for crisp images while keeping the long edge near
  // 3840px — a 4K (3840×2160) @size at 2× would paint a 7680px canvas and risk
  // an OOM (same trade-off the browser exporter makes). The largest integer
  // factor whose long edge stays ≤ 3840: HD (1280) → 2×, 4K (3840) → 1×, and any
  // custom @size is capped rather than left to blow up.
  const RASTER = OUT_FORMAT === 'pptx' || OUT_FORMAT === 'png';
  const rasterScale = RASTER
    ? Math.max(1, Math.min(2, Math.floor(3840 / Math.max(slideW, slideH))))
    : 1;
  await page.setViewport({ width: slideW, height: slideH, deviceScaleFactor: rasterScale });
  await page.goto('file://' + path.resolve(outHtml), {
    waitUntil: 'networkidle0',
    timeout: 60000
  });
  // Force every declared @font-face to load (incl. the base64 self-hosted
  // faces) and settle before measuring/printing. Marp's template lazy-loads
  // fonts per active slide, so document.fonts.ready alone resolves without
  // faces used only on later slides; explicitly load() them all. Without this
  // the overflow pass and the PDF can be laid out in the fallback metrics.
  await page.evaluate(async () => {
    try {
      await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
      await document.fonts.ready;
    } catch (_e) { /* fonts API unavailable — proceed with whatever loaded */ }
  });
  // Detect sections whose content exceeds the 1280×720 frame, to WARN the
  // author (with exact pages) — but keep the EXPORT itself clean: the red ring
  // + "OVERFLOWS" tab are NOT burned into the deliverable PDF. A loud red box in
  // front of a board is worse than the subtle clipping the section's
  // overflow:hidden already does, so the export clips and the author is warned
  // below to fix it. The loud ring+tab signal lives in the live preview
  // (lib/runtime), where the author is actively authoring and can act on it.
  const overflowing = await page.evaluate(() => {
    const TOL = 12; // filter sub-pixel rounding; see lattice-runtime.js
    // Slide-level detection — content exceeds the 1280×720 frame. (Per-box "which
    // cell" pinpointing was prototyped and dropped: in a grow-to-fit grid an
    // oversized card grows and pushes its NEIGHBOURS off-frame, so a geometric
    // per-box test flags the pushed cards, not the culprit. See lib/runtime.)
    const flagged = [];
    // Scope to Marp's real slide sections only — `<section>` literals
    // authors write inside code blocks parse as nested DOM elements
    // (HTML doesn't treat <code> as raw text), which would otherwise
    // pollute both the count and the flagged indices.
    document.querySelectorAll('section[data-lattice-slide]').forEach((s, i) => {
      const over = s.scrollHeight > s.clientHeight + TOL
                || s.scrollWidth  > s.clientWidth  + TOL;
      if (over) flagged.push(i + 1); // collect to warn; do NOT mark the export
    });
    return flagged;
  });
  if (overflowing.length) {
    const n = overflowing.length;
    console.warn(`  ⚠ OVERFLOW — ${n} slide${n > 1 ? 's' : ''} exceed the frame and ${n > 1 ? 'are' : 'is'} CLIPPED in this export: page${n > 1 ? 's' : ''} ${overflowing.join(', ')}.`);
    console.warn(`    Fix ${n > 1 ? 'them' : 'it'} before delivering (trim content, or use a layout/fill that fits). The export stays clean — no overflow marker is printed.`);
  }
  // Strip the authoring-only overflow signal before exporting. The injected
  // watcher (and base.modifiers.css) draw a loud red ring + "OVERFLOWS" tab on
  // any `.overflow` section — invaluable while authoring in the live preview,
  // but a red box in front of a board is worse than the silent clip that
  // overflow:hidden already applies. The author was warned on stderr above; the
  // PDF / PNG / PPTX deliverable stays clean, matching the contract documented
  // at the detection pass. (Removing the class also hides the .overflow-tab via
  // `section:not(.overflow) > .overflow-tab { display:none }`.)
  await page.evaluate(() => {
    for (const s of document.querySelectorAll('section.overflow')) s.classList.remove('overflow');
  });
  if (OUT_FORMAT === 'pdf') {
    // Render to a buffer (no `path`) so we can post-process before writing: the
    // speaker notes are attached as per-page PDF text annotations.
    const pdfBytes = await page.pdf({
      width: `${slideW}px`, height: `${slideH}px`,
      printBackground: true,
      preferCSSPageSize: true
    });
    await browser.close();
    const finalBytes = await embedNotesInPdf(pdfBytes, slideNotes);
    fs.writeFileSync(outFile, finalBytes);
    const noteCount = slideNotes.filter(Boolean).length;
    if (!QUIET) {
      console.log(`PDF: ${outFile}${noteCount ? ` (${noteCount} slide${noteCount > 1 ? 's' : ''} with speaker notes)` : ''}`);
    }
    if (NOTES_SIDECAR) writeNotesSidecar(outFile, slideNotes);
  } else {
    // PNG / PPTX: rasterize one image per slide from the SAME rendered page.
    // Each `section[data-lattice-slide]` is exactly slideW×slideH (fixed-page),
    // so an element screenshot yields a clean full-bleed slide image.
    const handles = await page.$$('section[data-lattice-slide]');
    const pngBuffers = [];
    for (const h of handles) {
      pngBuffers.push(await h.screenshot({ type: 'png' }));
    }
    await browser.close();

    if (OUT_FORMAT === 'png') {
      // `deck.png` → `deck.001.png`, `deck.002.png`, … (a per-slide set, the
      // same convention marp's `--images png` used).
      const base = outFile.replace(/\.png$/i, '');
      const pad = Math.max(3, String(pngBuffers.length).length);
      pngBuffers.forEach((buf, i) => {
        fs.writeFileSync(`${base}.${String(i + 1).padStart(pad, '0')}.png`, buf);
      });
      if (!QUIET) console.log(`PNG: ${pngBuffers.length} slides → ${base}.NNN.png`);
    } else {
      // PPTX — image-per-slide via the shared writer (lib/export/pptx-export.js).
      const { writePptx } = require('./lib/export/pptx-export');
      const count = await writePptx(outFile, pngBuffers, {
        title: path.basename(outFile).replace(/\.pptx$/i, ''),
        company: `Lattice · ${paletteName}`,
        width: slideW,
        height: slideH,
      });
      if (!QUIET) console.log(`PPTX: ${count} slides → ${outFile}`);
    }
  }
})().catch((e) => {
  // Surface render/export failures as a one-line error (matching readFileOrDie),
  // not a raw unhandled-rejection stack trace that reads like a crash.
  console.error(`error: ${e && e.message ? e.message : e}`);
  process.exit(1);
});

// Attach each slide's speaker note as a PDF "Text" annotation (a sticky note)
// in the top-left corner of its page, so any PDF viewer surfaces it on click.
// Slides without a note get no annotation. Returns the modified PDF bytes; on
// any pdf-lib failure it falls back to the un-annotated bytes (the visible deck
// must never be lost to a notes problem).
async function embedNotesInPdf(pdfBytes, notes) {
  if (!notes.some(Boolean)) return pdfBytes;
  try {
    const { PDFDocument, PDFName, PDFString } = require('pdf-lib');
    const doc = await PDFDocument.load(pdfBytes);
    const pages = doc.getPages();
    // notes[i] is keyed to PDF page i (both derive from the slide array). Guard
    // the invariant: if a future transform ever made puppeteer emit a different
    // page count, annotating by index would silently land notes on wrong pages.
    if (pages.length !== notes.length) {
      console.warn(`  ⚠ Speaker notes: ${notes.length} slide notes but ${pages.length} PDF pages — skipping note annotations to avoid misplacement.`);
      return pdfBytes;
    }
    pages.forEach((pg, i) => {
      const note = notes[i];
      if (!note) return;
      const { height } = pg.getSize();
      const annot = doc.context.obj({
        Type: 'Annot',
        Subtype: 'Text',
        Name: 'Note',
        Open: false,
        // 24×24 icon tucked into the top-left (PDF origin is bottom-left).
        Rect: [12, height - 36, 36, height - 12],
        Contents: PDFString.of(note),
        T: PDFString.of('Speaker notes'),
        // Hidden (flag bit 2) by default: the note is embedded and
        // tool-extractable, but no icon mars the boardroom slide and it never
        // prints. --notes-icon omits the flag, exposing a clickable sticky note.
        ...(NOTES_ICON ? {} : { F: 2 }),
      });
      const ref = doc.context.register(annot);
      let annots = pg.node.get(PDFName.of('Annots'));
      if (!annots) {
        annots = doc.context.obj([]);
        pg.node.set(PDFName.of('Annots'), annots);
      }
      annots.push(ref);
    });
    return await doc.save();
  } catch (e) {
    console.warn(`  ⚠ Could not embed speaker notes into the PDF (${e.message}); writing deck without note annotations.`);
    return pdfBytes;
  }
}

// Plaintext speaker-notes sidecar: one block per slide that has a note.
function writeNotesSidecar(pdfPath, notes) {
  const blocks = [];
  notes.forEach((note, i) => {
    if (note) blocks.push(`# Slide ${i + 1}\n\n${note}\n`);
  });
  const sidecar = pdfPath.replace(/\.pdf$/i, '') + '.notes.txt';
  fs.writeFileSync(sidecar, blocks.length ? blocks.join('\n') : '(no speaker notes in this deck)\n');
  if (!QUIET) console.log(`Notes: ${blocks.length} slide${blocks.length === 1 ? '' : 's'} → ${sidecar}`);
}
