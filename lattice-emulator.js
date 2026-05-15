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
const os            = require('os');
const { execSync }  = require('child_process');

// highlight.js — available as transitive dep of mermaid-cli, or as a
// project dep. Try standard resolution first, then mermaid-cli's bundled copy.
let hljs;
{
  const tryPaths = ['highlight.js'];
  try {
    const globalRoot = require('child_process')
      .execSync('npm root -g', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString().trim();
    if (globalRoot) {
      tryPaths.push(path.join(globalRoot, '@mermaid-js', 'mermaid-cli', 'node_modules', 'highlight.js'));
    }
  } catch (_e) { /* npm not on path */ }
  tryPaths.push(path.join('node_modules', '@mermaid-js', 'mermaid-cli', 'node_modules', 'highlight.js'));
  for (const p of tryPaths) {
    try { hljs = require(p); break; } catch (_e) { /* try next */ }
  }
}

// ── Help / version (handled before positional parsing) ─────────────────────
function listAvailablePalettes() {
  try {
    return fs.readdirSync(path.join(__dirname, 'themes'))
      .filter(f => f.endsWith('.css'))
      .map(f => f.replace('.css', ''))
      .join(', ');
  } catch (_e) { return '(themes/ not readable)'; }
}

function showHelp() {
  console.log(`lattice-emulator — Marp-faithful PDF/HTML renderer for Lattice decks

USAGE
  node lattice-emulator.js <source.md> <output.pdf> [palette]
  node lattice-emulator.js <source.md> <custom.css> <output.pdf> [palette]

ARGUMENTS
  source.md          Markdown source (required)
  output.pdf         Output PDF path (required); HTML sidecar written alongside
  custom.css         Optional layout CSS override; if omitted, the bundled
                     lattice.css from the install dir is used
  palette            Palette name (e.g. 'indaco', 'cuoio')

OPTIONS
  -h, --help              Show this help and exit
  -v, --version           Show version and exit
  -o, --output PATH       Output PDF path (alternative to positional output.pdf)
  -p, --palette NAME      Palette name (alternative to positional palette)
  -c, --css PATH          Layout CSS override (alternative to positional custom.css)
  -q, --quiet             Suppress non-error progress output

  Both --flag value and --flag=value syntax accepted. Positional args still
  work; named flags take precedence when both are supplied.

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
if (positional[1] && positional[1].endsWith('.css')) {
  cssFile    = positional[1];
  outFile    = positional[2];
  paletteArg = positional[3];
} else {
  cssFile    = path.join(__dirname, 'lattice.css');
  outFile    = positional[1];
  paletteArg = positional[2];
}
// Named flags override positional resolution.
if (flags.css)     cssFile    = flags.css;
if (flags.output)  outFile    = flags.output;
if (flags.palette) paletteArg = flags.palette;
const QUIET = flags.quiet;

if (!mdFile || !outFile) {
  console.error('Usage:');
  console.error('  node lattice-emulator.js source.md output.pdf [palette]               # bundled lattice.css');
  console.error('  node lattice-emulator.js source.md custom.css output.pdf [palette]    # explicit layout CSS');
  console.error('  node lattice-emulator.js [-o out.pdf] [-p palette] [-c css] source.md # named flags');
  console.error('');
  console.error('Run with --help for full options. Default palette: indaco.');
  process.exit(1);
}

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
const { resolvePalette } = require('./lib/resolve-palette');
const paletteName = resolvePalette({ md, cliArg: paletteArg }).name;
const palettePath = path.join(__dirname, 'themes', `${paletteName}.css`);
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
const themeCSS   = loadPaletteWithImports(cssFile, new Set(), 'layout CSS');
const css = paletteCSS + '\n' + themeCSS;

// ── Mermaid renderer ─────────────────────────────────────────────────────────
// Theme CSS — accessibility overrides injected into every rendered SVG.
//
// themeVariables alone can't reach all of Mermaid's text-on-color combinations.
// Several diagrams (especially the experimental ones) hard-code default colors
// that fail WCAG AA against our brand palette. This CSS uses targeted class
// selectors with !important to force AA-compliant pairs everywhere.
//
// Audited from rendered SVG output, slide-by-slide, on Mermaid 11.14.0.
// Each rule below addresses a real failure observed in the gallery PDF;
// none of these are speculative.
// ═══════════════════════════════════════════════════════════════════════════
// MERMAID THEME — Path A
// ═══════════════════════════════════════════════════════════════════════════
//
// Single design contract: dark text (#0A1628) on light fills.
// This contract requires picking input lightness so that *after* Mermaid's
// per-diagram math (some darken, some lighten, some clamp), every fill lands
// at L≥80 against which dark text clears WCAG AA.
//
// Two lightness bands are chosen deliberately:
//
//   Pale band (L≈90)   — for primary/secondary/tertiary, where the value is
//                         used directly or only mildly transformed. This is
//                         the band that flowchart, sequence, class, state,
//                         ER, and quadrant consume.
//
//   Mid-tone band (L≈60) — for cScale0..11, where Mermaid's per-diagram
//                         lighten step in kanban (and similar) brings the
//                         emitted fill back up to L≈68-73 — pale enough for
//                         dark text to read cleanly. cScale fed at L=90
//                         would clamp toward white in kanban; fed at L=60
//                         it lands well.
//
// All semantic and per-diagram saturated colors (gantt taskBkg, git0..7,
// pie1..12, pass/fail/warn) are set on dedicated leaf variables that
// Mermaid does not put through HSL math. They render verbatim.
//
// Brand axis: Lattice navy / blue / green. Saturated brand colors are
// reserved for borders, lines, accents, and saturated leaf-level diagram
// elements (gantt bars, gitgraph branches, pie slices).
//
// Verified: kanban, mindmap, quadrant, sequence, flowchart probes all
// render with this contract. Three diagrams override the contract via
// targeted themeCSS rules (journey, c4, mindmap) because they ignore
// cScale or have hardcoded internal palettes.

// ── Mermaid theme CSS, loaded from active palette ────────────────────────
// The palette file (themes/<palette>.css) is split by a sentinel comment
// "/* ===== MERMAID THEME CSS ===== */". Everything before the sentinel is
// the slide stylesheet (loaded by the renderer above as paletteCSS, then
// prepended to lattice.css). Everything after the sentinel is per-diagram
// Mermaid CSS — extracted here and used as Mermaid's themeCSS parameter.
//
// This single-file architecture means a palette author edits one CSS file
// and gets both slide colors and per-diagram Mermaid overrides at once.
// See docs/theming.md for the per-diagram override surface and parser limits.
const MERMAID_CSS_SENTINEL = '/* ===== MERMAID THEME CSS ===== */';
let MERMAID_THEME_CSS = '';
{
  const sentinelIndex = paletteCSS.indexOf(MERMAID_CSS_SENTINEL);
  if (sentinelIndex >= 0) {
    MERMAID_THEME_CSS = paletteCSS.slice(sentinelIndex + MERMAID_CSS_SENTINEL.length);
  } else {
    console.warn(`  ⚠ Palette ${paletteName}.css has no Mermaid sentinel; diagrams will use only themeVariables (no CSS overrides).`);
  }
}


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
  primaryColor:             { var: 'mermaid-primary-color' },
  secondaryColor:           { var: 'mermaid-secondary-color' },
  tertiaryColor:            { var: 'bg-alt' },
  primaryBorderColor:       { var: 'mermaid-border' },
  secondaryBorderColor:     { var: 'mermaid-border' },
  tertiaryBorderColor:      { var: 'mermaid-border' },

  // Text — single dark slate everywhere
  primaryTextColor:         { var: 'text-heading' },
  secondaryTextColor:       { var: 'text-heading' },
  tertiaryTextColor:        { var: 'text-heading' },
  textColor:                { var: 'text-heading' },
  titleColor:               { var: 'text-heading' },
  labelTextColor:           { var: 'text-heading' },
  loopTextColor:            { var: 'text-heading' },
  classText:                { var: 'text-heading' },
  labelColor:               { var: 'text-heading' },

  // Lines (near-black on white canvas)
  lineColor:                { var: 'mermaid-line' },
  defaultLinkColor:         { var: 'mermaid-line' },
  edgeLabelBackground:      { var: 'bg' },
  labelBackground:          { var: 'bg' },

  // Main background paths
  mainBkg:                  { var: 'mermaid-primary-color' },
  nodeBorder:               { var: 'mermaid-border' },
  nodeTextColor:            { var: 'text-heading' },
  clusterBkg:               { var: 'bg-alt' },
  clusterBorder:            { var: 'mermaid-border' },

  // cScale (mid-tone band) — kanban lighten brings to L≈70
  cScale0:                  { var: 'cat-blue' },
  cScale1:                  { var: 'cat-green' },
  cScale2:                  { var: 'cat-purple' },
  cScale3:                  { var: 'cat-orange' },
  cScale4:                  { var: 'cat-teal' },
  cScale5:                  { var: 'cat-rose' },
  cScale6:                  { var: 'cat-blue' },
  cScale7:                  { var: 'cat-green' },
  cScale8:                  { var: 'cat-purple' },
  cScale9:                  { var: 'cat-orange' },
  cScale10:                 { var: 'cat-teal' },
  cScale11:                 { var: 'cat-rose' },

  // fillType (subgraph / mindmap-level fills, pale band)
  fillType0: { var: 'mermaid-primary-color' },
  fillType1: { var: 'mermaid-secondary-color' },
  fillType2: { var: 'mermaid-pie-purple' },
  fillType3: { var: 'mermaid-pie-orange' },
  fillType4: { var: 'mermaid-pie-teal' },
  fillType5: { var: 'mermaid-pie-rose' },
  fillType6: { var: 'mermaid-primary-color' },
  fillType7: { var: 'mermaid-secondary-color' },

  // Sequence diagram
  actorBkg:                 { var: 'mermaid-primary-color' },
  actorBorder:              { var: 'mermaid-border' },
  actorTextColor:           { var: 'text-heading' },
  actorLineColor:           { var: 'mermaid-line' },
  signalColor:              { var: 'mermaid-line' },
  signalTextColor:          { var: 'text-heading' },
  labelBoxBkgColor:         { var: 'bg-alt' },
  labelBoxBorderColor:      { var: 'mermaid-border' },
  activationBorderColor:    { var: 'mermaid-border' },
  activationBkgColor:       { var: 'mermaid-primary-color' },
  sequenceNumberColor:      { var: 'text-heading' },

  // Notes (yellow accent — category-distinct)
  noteBkgColor:             { var: 'mermaid-note-bg' },
  noteTextColor:            { var: 'text-heading' },
  noteBorderColor:          { var: 'mermaid-note-border' },

  // Error (alarm — saturated red)
  errorBkgColor:            { var: 'mermaid-error-bg' },
  errorTextColor:           { var: 'mermaid-error-text' },

  // Pie chart (pale palette — unified contract)
  pie1:  { var: 'mermaid-primary-color' },
  pie2:  { var: 'mermaid-secondary-color' },
  pie3:  { var: 'mermaid-pie-purple' },
  pie4:  { var: 'mermaid-pie-orange' },
  pie5:  { var: 'mermaid-pie-teal' },
  pie6:  { var: 'mermaid-pie-rose' },
  pie7:  { var: 'mermaid-pie-yellow' },
  pie8:  { var: 'mermaid-pie-red' },
  pie9:  { var: 'mermaid-pie-slate' },
  pie10: { var: 'mermaid-pie-sage' },
  pie11: { var: 'mermaid-pie-violet' },
  pie12: { var: 'mermaid-primary-color' },
  pieTitleTextSize:    { literal: '18px' },
  pieTitleTextColor:   { var: 'text-heading' },
  pieSectionTextSize:  { literal: '14px' },
  pieSectionTextColor: { var: 'text-heading' },
  pieLegendTextSize:   { literal: '13px' },
  pieLegendTextColor:  { var: 'text-heading' },
  pieStrokeColor:      { var: 'bg' },
  pieStrokeWidth:      { literal: '2px' },
  pieOuterStrokeWidth: { literal: '2px' },
  pieOuterStrokeColor: { var: 'mermaid-border' },
  pieOpacity:          { literal: '1' },

  // Gantt (pale bars, dark text, alarm-only saturation)
  sectionBkgColor:        { var: 'bg-alt' },
  altSectionBkgColor:     { var: 'bg' },
  sectionBkgColor2:       { var: 'mermaid-primary-color' },
  taskBkgColor:           { var: 'mermaid-primary-color' },
  taskTextColor:          { var: 'text-heading' },
  taskTextLightColor:     { var: 'text-heading' },
  taskTextOutsideColor:   { var: 'text-heading' },
  taskTextClickableColor: { var: 'text-heading' },
  taskBorderColor:        { var: 'mermaid-border' },
  activeTaskBkgColor:     { var: 'mermaid-gantt-active' },
  activeTaskBorderColor:  { var: 'mermaid-gantt-active-border' },
  gridColor:              { var: 'mermaid-gantt-grid' },
  doneTaskBkgColor:       { var: 'mermaid-gantt-done' },
  doneTaskBorderColor:    { var: 'mermaid-gantt-done-border' },
  critBkgColor:           { var: 'mermaid-gantt-critical' },
  critBorderColor:        { var: 'mermaid-gantt-critical-border' },
  todayLineColor:         { var: 'mermaid-gantt-today' },

  // Git graph
  git0: { var: 'cat-blue' },
  git1: { var: 'cat-green' },
  git2: { var: 'cat-purple' },
  git3: { var: 'cat-orange' },
  git4: { var: 'cat-teal' },
  git5: { var: 'cat-rose' },
  git6: { var: 'cat-slate' },
  git7: { var: 'cat-mauve' },
  gitBranchLabel0: { var: 'text-heading' },
  gitBranchLabel1: { var: 'text-heading' },
  gitBranchLabel2: { var: 'text-heading' },
  gitBranchLabel3: { var: 'text-heading' },
  gitBranchLabel4: { var: 'text-heading' },
  gitBranchLabel5: { var: 'text-heading' },
  gitBranchLabel6: { var: 'text-heading' },
  gitBranchLabel7: { var: 'text-heading' },
  commitLabelColor:      { var: 'text-heading' },
  commitLabelBackground: { var: 'bg-alt' },
  tagLabelColor:         { var: 'bg' },
  tagLabelBackground:    { var: 'mermaid-border' },
  tagLabelBorder:        { var: 'text-heading' },

  // Quadrant chart
  quadrant1Fill:                    { var: 'mermaid-quadrant-1-fill' },
  quadrant2Fill:                    { var: 'mermaid-quadrant-2-fill' },
  quadrant3Fill:                    { var: 'mermaid-quadrant-3-fill' },
  quadrant4Fill:                    { var: 'mermaid-quadrant-4-fill' },
  quadrant1TextFill:                { var: 'mermaid-quadrant-1-text' },
  quadrant2TextFill:                { var: 'mermaid-quadrant-2-text' },
  quadrant3TextFill:                { var: 'mermaid-quadrant-3-text' },
  quadrant4TextFill:                { var: 'mermaid-quadrant-4-text' },
  quadrantPointFill:                { var: 'mermaid-border' },
  quadrantPointTextFill:            { var: 'text-heading' },
  quadrantXAxisTextFill:            { var: 'text-heading' },
  quadrantYAxisTextFill:            { var: 'text-heading' },
  quadrantInternalBorderStrokeFill: { var: 'cat-slate' },
  quadrantExternalBorderStrokeFill: { var: 'mermaid-border' },
  quadrantTitleFill:                { var: 'text-heading' },

  // State / class
  altBackground: { var: 'bg-alt' },

  // XY chart — nested object, expanded below
  xyChart: { nested: {
    backgroundColor:  { var: 'bg' },
    titleColor:       { var: 'text-heading' },
    xAxisLabelColor:  { var: 'text-heading' },
    xAxisTitleColor:  { var: 'text-heading' },
    yAxisLabelColor:  { var: 'text-heading' },
    yAxisTitleColor:  { var: 'text-heading' },
    plotColorPalette: { literal: '#5C9DD3,#6FB89A,#8E7BAF,#D4A271,#6BBDB8,#C57E8B' },
  }},
};

// ── Resolver: parses CSS custom properties from the palette file ─────────
// Walks every :root { ... } block and extracts --variable-name: <value>,
// then resolves light-dark() and one level of var() references. Returns
// a flat map suitable for feeding Mermaid themeVariables (which expects
// literal colors, not CSS expressions).
function parsePaletteVars(paletteCSSContent) {
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
  const isDark = /:root\s*\{[^}]*color-scheme\s*:\s*dark\b/.test(stripped);
  for (const k of Object.keys(vars)) {
    const ld = vars[k].match(/^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i);
    if (ld) vars[k] = isDark ? ld[2] : ld[1];
  }
  // Resolve var() references one level deep (e.g. --bg-dark: var(--brand-blue-deep))
  for (const k of Object.keys(vars)) {
    const v = vars[k];
    const ref = v.match(/^var\(--([a-z0-9-]+)\)$/i);
    if (ref && vars[ref[1]]) vars[k] = vars[ref[1]];
  }
  return vars;
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

const PALETTE_VARS = parsePaletteVars(paletteCSS);
const MERMAID_THEME_VARS = resolveMermaidThemeVars(PALETTE_VARS);

// ── Post-process themeCSS: resolve var() and strip section scope prefix ──────
// The theme file writes themeCSS selectors prefixed with 'section ' (for
// preview path isolation — each slide section scopes its own diagram styles
// so rules from one theme cannot bleed into slides rendered by another theme).
// The mmdc path injects themeCSS inside the SVG's own <style> tag where there
// is no wrapping <section> element; strip the prefix so bare class selectors
// reach the SVG DOM. Also expand var(--name) to literal hex values because
// Mermaid's %%{init}%% parser requires resolved literals in themeCSS.
function resolveVarsInThemeCSS(css, paletteVars) {
  return css.replace(/var\(--([a-z0-9-]+)\)/gi, (_, name) => {
    const val = paletteVars[name];
    if (!val) console.warn(`  ⚠ themeCSS references undefined CSS variable: --${name}`);
    return val ?? `var(--${name})`;
  });
}
if (MERMAID_THEME_CSS) {
  MERMAID_THEME_CSS = resolveVarsInThemeCSS(MERMAID_THEME_CSS, PALETTE_VARS)
    .replace(/\bsection (?=[.#\[a-zA-Z*])/g, '');
}

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

function renderMermaid(definition) {
  // Prepend theme init block if not already present.
  // JetBrains Mono is bundled by the lattice.css font import and is the
  // safe default for diagrams: predictable character widths, no measurement
  // drift between the layout pass and render pass. (See font note above.)
  const hasInit = definition.includes('%%{init');
  // themeCSS must be on one line — Mermaid's %%{init}%% directive parser
  // does not tolerate newlines inside the JSON. We also strip CSS comments
  // before injection because they break Mermaid's init parser when combined
  // with certain content (the parser appears to misinterpret content inside
  // /* */ blocks). Comments are useful for humans reading the source, but
  // useless inside the rendered SVG <style> tag — so we strip them entirely
  // before injecting. This was identified by section-bisect: a single CSS
  // comment in the FLOWCHART section caused all themeCSS to be silently
  // rejected (the SVG rendered without any of our overrides applied).
  const css = MERMAID_THEME_CSS
    .replace(/\/\*[\s\S]*?\*\//g, '')   // strip /* ... */ comments
    .replace(/\s+/g, ' ')
    .trim();
  const initObj = {
    theme: 'base',
    themeVariables: MERMAID_THEME_VARS,
    themeCSS: css,
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
  const localMmdc = path.join(__dirname, 'node_modules', '.bin', 'mmdc');
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
      const svg = fs.readFileSync(outSvg, 'utf8');
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return `<div class="mermaid-svg">${svg}</div>`;
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

// ── Pre-process markdown: render mermaid blocks before slide splitting ────────
function preprocessMermaid(source) {
  return source.replace(/```mermaid\n([\s\S]*?)```/g, (_, def) => {
    if (!QUIET) process.stdout.write('  Rendering mermaid diagram...');
    const svg = renderMermaid(def.trim());
    if (!QUIET) console.log(' done');
    return svg;
  });
}


const rawMd = preprocessMermaid(md);
const fmMatch = rawMd.match(/^---([\s\S]*?)---\n/);
const fm      = fmMatch ? fmMatch[1] : '';
const paginateGlobal = /^\s*paginate:\s*true/m.test(fm);
const globalHeader   = (fm.match(/^\s*header:\s*["']?(.*?)["']?\s*$/m) || [])[1] || '';
const globalFooter   = (fm.match(/^\s*footer:\s*["']?(.*?)["']?\s*$/m) || [])[1] || '';
// Deck-wide class (Marp `class:` directive, applied to every section).
// Marp distinguishes the deck-wide form (no leading underscore) from the
// per-slide `_class:` directive. Multiple classes are space-separated.
const globalClass    = (fm.match(/^\s*class:\s*["']?(.*?)["']?\s*$/m) || [])[1] || '';
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
const headingDivider = (() => {
  const m = fm.match(/^\s*headingDivider:\s*(\d+)/m);
  return m ? Math.max(1, Math.min(6, parseInt(m[1], 10))) : null;
})();

const content   = rawMd.replace(/^---[\s\S]*?---\n/, '');

// Slide splitter — extracted to lib/split-slides.js so it can be unit-tested
// directly. See that file for the fence-and-headingDivider rationale.
const { splitSlides }    = require('./lib/split-slides');
// Named-slot lift helper used by decision / before-after / compare-prose.
const { liftSlotLabel }  = require('./lib/slot-label-lift');
// Roadmap modifier transforms — `roadmap status` (cell state markers) and
// `roadmap horizons` (table → three-card transpose). Shared with the
// Marp Core engine wrapper in marp.config.js (parity contract).
const { transformRoadmapSection } = require('./lib/roadmap');
// Journey transform — nested list → .journey-board DOM. Shared with
// marp.config.js (engine wrapper) and mirrored in lattice-runtime.js.
const { transformJourneySection } = require('./lib/journey');
// Word-cloud layout transform — list-to-canvas rewrite for the
// word-cloud layout (default + 4 modifier variants). Shared with
// marp.config.js and mirrored by lattice-runtime.js.
const { transformWordCloudSection } = require('./lib/word-cloud');
// Radar transform — nested list → native SVG radar/spider chart (default +
// five modifier variants). Shared with marp.config.js and mirrored in
// lattice-runtime.js.
const { transformRadarSection } = require('./lib/radar');

const rawSlides = splitSlides(content, headingDivider);
const total     = rawSlides.length;

// ── Inline parser ────────────────────────────────────────────────────────────
function parseInline(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/(?<!\w)_([^_]+?)_(?!\w)/g, '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>');
}

// ── Slide parser ─────────────────────────────────────────────────────────────
function parseSlide(raw, index) {
  // Read per-slide directives. Deck-wide `class:` from front matter is
  // APPENDED to the per-slide `_class:` (Lattice extension to Marpit's
  // native "spot replaces global" rule). Mirrors the deckClassPropagate
  // Marpit plugin in marp.config.js so both render paths produce
  // identical class lists. See plugin docstring for rationale.
  let classAttr = '';
  let paginate  = paginateGlobal;
  let header    = globalHeader;
  let footer    = globalFooter;
  let bgColor   = '';

  const cm = raw.match(/<!--\s*_class:\s*(.*?)\s*-->/);
  if (cm) classAttr = cm[1].trim();
  if (globalClass) {
    const cur = classAttr.split(/\s+/).filter(Boolean);
    for (const t of globalClass.split(/\s+/).filter(Boolean)) {
      if (!cur.includes(t)) cur.push(t);
    }
    classAttr = cur.join(' ');
  }

  if (raw.includes('_paginate: false')) paginate = false;
  if (raw.includes('_paginate: true'))  paginate = true;

  const hm = raw.match(/<!--\s*_header:\s*["']?(.*?)["']?\s*-->/);
  if (hm) header = hm[1].trim();

  const fm2 = raw.match(/<!--\s*_footer:\s*["']?(.*?)["']?\s*-->/);
  if (fm2) footer = fm2[1].trim();

  const bg = raw.match(/<!--\s*_backgroundColor:\s*(.*?)\s*-->/);
  if (bg) bgColor = bg[1].trim();

  // Strip all directives before parsing content
  raw = raw.replace(/<!--.*?-->/gs, '').trim();

  // ── Marp background image syntax ─────────────────────────────────────────
  // Handles: ![bg right](url), ![bg left](url), ![bg](url) and the same with
  // a `fit` keyword in any position (![bg right fit], ![bg fit right], etc.).
  // The `fit` keyword is Marp-native and switches the preview's
  // background-size from cover→contain; we accept it here so the same source
  // renders identically in VS Code Marp preview and in our build pipeline.
  // Capture the entire keyword blob then parse inside the callback —
  // capturing inside a quantified group resets on each iteration in JS.
  // Anchored to line start (^) so inline backtick code containing ![bg...] is not consumed.
  let bgImageHtml = '';
  raw = raw.replace(/^!\[bg((?:\s+\w+)*)\]\(([^)]+)\)/gm, (_, kw, url) => {
    const side = /\bright\b/.test(kw) ? 'right'
               : /\bleft\b/.test(kw)  ? 'left'
               : 'full';
    // CSS (.lattice-bg, .lattice-bg-right/left/full) owns all positioning,
    // fit, and the hairline divider. The img has no inline styles — the
    // cover/contain rule on section.image controls object-fit.
    bgImageHtml = `<div class="lattice-bg lattice-bg-${side}"><img src="${url}" alt=""/></div>`;
    return '';
  });

  // ── Markdown → HTML ────────────────────────────────────────────────────────
  // Pre-process: convert fenced code blocks to highlighted <pre><code>
  // Uses highlight.js server-side — no CDN dependency
  raw = raw.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const trimmed = code.replace(/\n$/, ''); // strip trailing newline
    let highlighted;
    if (hljs && lang && hljs.getLanguage(lang)) {
      try {
        highlighted = hljs.highlight(trimmed, { language: lang }).value;
      } catch(e) {
        highlighted = trimmed.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }
    } else {
      highlighted = trimmed.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    const langClass = lang ? ` class="language-${lang} hljs"` : ' class="hljs"';
    return `<pre class="hljs language-${lang || 'none'}"><code${langClass}>${highlighted}</code></pre>`;
  });

  // Pre-process: convert markdown tables to HTML before line-by-line parsing
  raw = raw.replace(/((?:\|.+\|\n?)+)/g, (tableBlock) => {
    const tableLines = tableBlock.trim().split('\n').filter(l => l.trim());
    if (tableLines.length < 2) return tableBlock;
    // Check second line is a separator row
    if (!/^\|[-:\s|]+\|$/.test(tableLines[1].trim())) return tableBlock;

    const parseRow = (line) => line.trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map(cell => cell.trim());

    const headers = parseRow(tableLines[0]);
    const bodyRows = tableLines.slice(2);

    const thead = '<thead><tr>' +
      headers.map(h => `<th>${parseInline(h)}</th>`).join('') +
      '</tr></thead>';
    const tbody = '<tbody>' +
      bodyRows.map(row => {
        const cells = parseRow(row);
        return '<tr>' + cells.map((c, i) =>
          i === 0
            ? `<td><strong>${parseInline(c)}</strong></td>`
            : `<td>${parseInline(c)}</td>`
        ).join('') + '</tr>';
      }).join('') +
      '</tbody>';

    return `<table>${thead}${tbody}</table>\n`;
  });

  let html = '';
  const lines = raw.split('\n');
  let inList = false, inOrderedList = false, inSubList = false, inSubSubList = false, inBlockquote = false, inPre = false;
  const sp = classAttr.includes('no-period') ? s => s.replace(/\.\s*$/, '') : s => s;
  const ap = classAttr.includes('with-period')   ? s => /[.!?:…]$/.test(s.trimEnd()) ? s : s.trimEnd() + '.' : s => s;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t    = line.trim();

    // Track <pre> blocks — pass content through verbatim, no markdown parsing
    if (t.startsWith('<pre ') || t === '<pre>') {
      // Check if this is a self-contained single-line pre (open and close on same line)
      if (t.includes('</pre>')) {
        html += line + '\n';
        continue; // single-line pre — don't set inPre flag
      }
      inPre = true;  html += line + '\n'; continue;
    }
    if (t.startsWith('</pre>') || t.startsWith('</code></pre>') || t.endsWith('</code></pre>') || t.endsWith('</pre>')) { inPre = false; html += line + '\n'; continue; }
    if (inPre) { html += line + '\n'; continue; }

    if (!t) {
      if (inSubSubList)   { html += '</ul></li>';  inSubSubList   = false; }
      if (inSubList)      { html += '</ul></li>';  inSubList      = false; }
      if (inList)         { html += '</ul>';        inList         = false; }
      if (inOrderedList)  { html += '</ol>';        inOrderedList  = false; }
      if (inBlockquote)   { html += '</blockquote>'; inBlockquote  = false; }
      continue;
    }
    if      (t.startsWith('######')) { html += `<h6>${parseInline(ap(sp(t.slice(6).trim())))}</h6>`; }
    else if (t.startsWith('#####'))  { html += `<h5>${parseInline(ap(sp(t.slice(5).trim())))}</h5>`; }
    else if (t.startsWith('####'))   { html += `<h4>${parseInline(ap(sp(t.slice(4).trim())))}</h4>`; }
    else if (t.startsWith('### '))   { html += `<h3>${parseInline(ap(sp(t.slice(4))))}</h3>`; }
    else if (t.startsWith('## '))    { html += `<h2>${parseInline(ap(sp(t.slice(3))))}</h2>`; }
    else if (t.startsWith('# '))     { html += `<h1>${parseInline(ap(sp(t.slice(2))))}</h1>`; }
    else if (/^(\*{3,}|_{3,})$/.test(t)) { html += '<hr>'; }
    else if (t.startsWith('> ')) {
      if (!inBlockquote) { html += '<blockquote>'; inBlockquote = true; }
      html += `<p>${parseInline(t.slice(2))}</p>`;
    }
    else if (/^ {4,}- /.test(line)) {
      if (!inSubSubList) { html += '<ul>'; inSubSubList = true; }
      html += `<li>${parseInline(t.slice(2))}</li>`;
    }
    else if (/^ {2,}- /.test(line)) {
      if (inSubSubList)   { html += '</ul></li>'; inSubSubList = false; }
      if (!inSubList)     { html += '<ul>'; inSubList = true; }
      html += `<li>${parseInline(t.slice(2))}`;
      const nextL2 = i + 1 < lines.length ? lines[i + 1] : '';
      if (!/^ {4,}- /.test(nextL2)) html += '</li>';
    }
    else if (t.startsWith('- ')) {
      if (inSubSubList)   { html += '</ul></li>'; inSubSubList  = false; }
      if (inSubList)      { html += '</ul></li>'; inSubList     = false; }
      if (inOrderedList)  { html += '</ol>';       inOrderedList = false; }
      if (!inList)        { html += '<ul>';        inList        = true;  }
      html += `<li>${parseInline(t.slice(2))}`;
      const next = i + 1 < lines.length ? lines[i + 1] : '';
      if (!/^ {2,}- /.test(next)) html += '</li>';
    }
    else if (/^\d+\. /.test(t)) {
      // Ordered list item — e.g. "1. item text"
      if (inList)        { html += '</ul>'; inList = false; }
      if (inSubSubList)  { html += '</ul></li>'; inSubSubList = false; }
      if (inSubList)     { html += '</ul></li>'; inSubList = false; }
      if (!inOrderedList) { html += '<ol>'; inOrderedList = true; }
      html += `<li>${parseInline(t.replace(/^\d+\. /, ''))}`;
      // Check if next line is a sub-list — if not, close immediately
      const nextOl = i + 1 < lines.length ? lines[i + 1] : '';
      if (!/^ {2,}- /.test(nextOl) && !/^   /.test(nextOl)) html += '</li>';
    }
    else if (t.startsWith('<')) { html += t + '\n'; }
    else {
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
      if (inSubSubList) { html += '</ul></li>';    inSubSubList = false; }
      if (inSubList)    { html += '</ul></li>';    inSubList    = false; }
      if (inList)       { html += '</ul>';         inList       = false; }
      html += `<p>${parseInline(t)}</p>`;
    }
  }
  if (inSubSubList) html += '</ul></li>';
  if (inSubList)    html += '</ul></li>';
  if (inList)       html += '</ul>';
  if (inOrderedList) html += '</ol>';
  if (inBlockquote) html += '</blockquote>';

  // ── Layout-specific post-processing ──────────────────────────────────────
  // Wraps native markdown elements into the containers CSS needs for layout.
  // This is the only place structural HTML is generated — never in the .md source.

  const cls = classAttr;
  // Slot-label lift — extracted to lib/slot-label-lift.js for unit testing.
  // See that file for behavior; same closure binding (used by cards-stack
  // and decision/before-after handlers below).

  // cards-grid: wrap ul/ol into .cards-grid-inner, each top-level li becomes a .card.
  // Uses depth tracking to handle nested lists (li > ul/ol for body text).
  // handles 2 cards (1 row), 3 cards (2+1 via CSS :last-child:nth-child(odd)), 4 cards (2×2)
  // cards-grid-2plus1 and cards-side both consolidate here
  if (cls.includes('cards-grid') || cls.includes('cards-side')) {
    const listMatch = html.match(/<(ul|ol)>/);
    if (listMatch) {
      const listTag = listMatch[1];
      const openList = `<${listTag}>`, closeList = `</${listTag}>`;
      const listStart = html.indexOf(openList);
      // Walk forward tracking nesting depth to find the matching close tag
      let depth = 0, pos = listStart, listEnd = -1;
      while (pos < html.length) {
        if (html.startsWith(openList, pos)) { depth++; pos += openList.length; }
        else if (html.startsWith(closeList, pos)) { depth--; if (depth === 0) { listEnd = pos; break; } pos += closeList.length; }
        else pos++;
      }
      if (listEnd !== -1) {
        const inner = html.slice(listStart + openList.length, listEnd);
        // Extract top-level <li> items by tracking nesting depth
        const items = [];
        let liDepth = 0, liStart = -1, i = 0;
        while (i < inner.length) {
          if (inner.startsWith('<li>', i)) { if (liDepth === 0) liStart = i + 4; liDepth++; i += 4; }
          else if (inner.startsWith('</li>', i)) { liDepth--; if (liDepth === 0 && liStart !== -1) { items.push(inner.slice(liStart, i)); liStart = -1; } i += 5; }
          else i++;
        }
        const cards = items.map(c => `<div class="card">${c}</div>`).join('');
        const innerClass = listTag === 'ol' ? 'cards-grid-inner cards-grid-inner--ordered' : 'cards-grid-inner';
        html = html.slice(0, listStart) + `<div class="${innerClass}">${cards}</div>` + html.slice(listEnd + closeList.length);
      }
    }
  }

  // cards-stack: flat ul/ol → .cards-stack-inner; each li becomes a .card.
  // Distinct from cards-grid: titles are inlined inside the card (no nested list for body),
  // so a typical li reads like: **Title.** body prose continues here.
  if (cls.includes('cards-stack')) {
    const listMatch = html.match(/<(ul|ol)>/);
    if (listMatch) {
      const listTag = listMatch[1];
      const openList = `<${listTag}>`, closeList = `</${listTag}>`;
      const listStart = html.indexOf(openList);
      let depth = 0, pos = listStart, listEnd = -1;
      while (pos < html.length) {
        if (html.startsWith(openList, pos)) { depth++; pos += openList.length; }
        else if (html.startsWith(closeList, pos)) { depth--; if (depth === 0) { listEnd = pos; break; } pos += closeList.length; }
        else pos++;
      }
      if (listEnd !== -1) {
        const inner = html.slice(listStart + openList.length, listEnd);
        const items = [];
        let liDepth = 0, liStart = -1, i = 0;
        while (i < inner.length) {
          if (inner.startsWith('<li>', i)) { if (liDepth === 0) liStart = i + 4; liDepth++; i += 4; }
          else if (inner.startsWith('</li>', i)) { liDepth--; if (liDepth === 0 && liStart !== -1) { items.push(inner.slice(liStart, i)); liStart = -1; } i += 5; }
          else i++;
        }
        const cards = items.map(c => `<div class="card">${c}</div>`).join('');
        const innerCls = listTag === 'ol' ? 'cards-stack-inner cards-stack-inner--ordered' : 'cards-stack-inner';
        html = html.slice(0, listStart) + `<div class="${innerCls}">${cards}</div>` + html.slice(listEnd + closeList.length);
      }
    }
  }

  // compare-prose: wrap ul/ol, 2 li as cards with → connector between, optional trailing p
  if (cls.includes('compare-prose')) {
    const listMatch = html.match(/<(ul|ol)>/);
    if (listMatch) {
      const listTag = listMatch[1];
      const openList = `<${listTag}>`, closeList = `</${listTag}>`;
      const listStart = html.indexOf(openList);
      let depth = 0, pos = listStart, listEnd = -1;
      while (pos < html.length) {
        if (html.startsWith(openList, pos)) { depth++; pos += openList.length; }
        else if (html.startsWith(closeList, pos)) { depth--; if (depth === 0) { listEnd = pos; break; } pos += closeList.length; }
        else pos++;
      }
      if (listEnd !== -1) {
        const inner = html.slice(listStart + openList.length, listEnd);
        const items = [];
        let liDepth = 0, liStart = -1, i = 0;
        while (i < inner.length) {
          if (inner.startsWith('<li>', i)) { if (liDepth === 0) liStart = i + 4; liDepth++; i += 4; }
          else if (inner.startsWith('</li>', i)) { liDepth--; if (liDepth === 0 && liStart !== -1) { items.push(inner.slice(liStart, i)); liStart = -1; } i += 5; }
          else i++;
        }
        const cards = items.map(c => `<div class="card">${liftSlotLabel(c)}</div>`);
        const inner_html = `<div class="compare-prose-inner">${cards[0]}<div class="connector">❯</div>${cards[1] || ''}</div>`;
        html = html.slice(0, listStart) + inner_html + html.slice(listEnd + closeList.length);
      }
    }
  }

  // decision / before-after: named-slot layouts where each top-level li is
  // a card with a slot label (Build / Why-not / Before / After). The CSS
  // keeps these as native ul/ol > li (no card div wrapper); the only post-
  // process needed is lifting the leading text into <strong> so the
  // labeled-corner-tag CSS triggers without authors typing `**…**`.
  if (cls.includes('decision') || cls.includes('before-after')) {
    html = html.replace(/<(ul|ol)>([\s\S]*)<\/\1>/, (full, tag, inner) => {
      // Walk top-level <li>…</li> with depth tracking.
      const out = [];
      let liDepth = 0, liStart = -1, i = 0, lastEmitted = 0;
      while (i < inner.length) {
        if (inner.startsWith('<li>', i)) {
          if (liDepth === 0) liStart = i + 4;
          liDepth++; i += 4;
        } else if (inner.startsWith('</li>', i)) {
          liDepth--;
          if (liDepth === 0 && liStart !== -1) {
            out.push(inner.slice(lastEmitted, liStart));
            out.push(liftSlotLabel(inner.slice(liStart, i)));
            lastEmitted = i;
            liStart = -1;
          }
          i += 5;
        } else i++;
      }
      out.push(inner.slice(lastEmitted));
      return `<${tag}>${out.join('')}</${tag}>`;
    });
  }

  // stats: wrap ol, each li becomes a stat-item with h1 number + span label
  if (cls.includes('stats')) {
    html = html.replace(/<ol>([\s\S]*?)<\/ol>/g, (_, inner) => {
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
      const statItems = items.map(content => {
        // content is like: <strong>73%</strong> faster close
        const numMatch = content.match(/<strong>(.*?)<\/strong>/);
        const num = numMatch ? numMatch[1] : '';
        const label = content.replace(/<strong>.*?<\/strong>/, '').trim();
        return `<div class="stat-item"><span class="stat-num">${num}</span><span class="stat-label">${label}</span></div>`;
      });
      return `<div class="stats-row">${statItems.join('')}</div>`;
    });
  }

  // roadmap status / horizons: state-marker tagging on <td> cells, or
  // transpose the workstream × phase table into a horizons-card grid.
  // Implementation lives in lib/roadmap.js — shared with marp.config.js
  // and mirrored by the runtime DOM transform in lattice-runtime.js so
  // every render path produces the same DOM.
  if (cls.includes('roadmap')) {
    html = transformRoadmapSection(html, cls);
  }

  // journey: nested list → user-journey board (legend, section ribbon,
  // task chips, plumb lines, mood faces, swimlanes, mood curve). One
  // shared DOM; CSS varies the look per variant (heatmap, curve,
  // swimlane, weighted). Shared with marp.config.js and mirrored in
  // lattice-runtime.js for the marp-vscode preview.
  if (cls.includes('journey')) {
    html = transformJourneySection(html, cls);
  }

  // word-cloud: rewrite the first <ul> into a .word-cloud-canvas with
  // weighted <span class="wc-word"> children. One source contract feeds
  // the default and four modifier variants — all the visual difference
  // comes from CSS, the transform output is identical across variants.
  // Implementation lives in lib/word-cloud.js — shared with marp.config.js
  // and mirrored by the runtime DOM transform in lattice-runtime.js.
  if (cls.includes('word-cloud')) {
    html = transformWordCloudSection(html, cls);
  }

  // radar: rewrite the nested list into a native SVG radar/spider chart.
  // One series-major source contract feeds the default and five modifier
  // variants (target, delta, benchmark, quadrant, small-multiples); the
  // value scale auto-fits the data unless the eyebrow pins a range.
  // Implementation lives in lib/radar.js — shared with marp.config.js and
  // mirrored by the runtime DOM transform in lattice-runtime.js.
  if (cls.includes('radar')) {
    html = transformRadarSection(html, cls);
  }

  // verdict-grid: transform [x]/[-]/[ ] prefixed inner li items into badge spans.
  // The ul > li card structure and last-inner-li body text are left intact for CSS.
  if (cls.includes('verdict-grid')) {
    html = html.replace(/<li>\s*\[([x\- ])\]\s*([\s\S]*?)<\/li>/g, (_, marker, label) => {
      const bc = marker === 'x' ? 'badge pass' : marker === '-' ? 'badge warn' : 'badge fail';
      return `<li><span class="${bc}">${label.trim()}</span></li>`;
    });
  }

  // checklist: top-level <li> whose body starts with [x] / [-] / [ ] gets
  // class="state pass|warn|fail" and the marker stripped. CSS draws the
  // glyph and pins a trailing <code> as the right-aligned row pill
  // (universal pill convention, shared with cards-grid / cards-side /
  // actors).
  if (cls.includes('checklist')) {
    html = html.replace(/<li>([\s\S]*?)<\/li>/g, (full, inner) => {
      const m = /^\s*\[([x\- ])\]\s*/.exec(inner);
      if (!m) return full;
      const stateClass = m[1] === 'x' ? 'pass' : m[1] === '-' ? 'warn' : 'fail';
      return `<li class="state ${stateClass}">${inner.slice(m[0].length)}</li>`;
    });
  }

  // featured: first list item = .feat-card (accent hero), rest = .sub-row > .sub-card
  if (cls.includes('featured')) {
    const ulIdx = html.indexOf('<ul>');
    if (ulIdx !== -1) {
      // Depth-aware scan to find the matching </ul>
      let depth = 0, pos = ulIdx, ulEnd = -1;
      while (pos < html.length) {
        if (html.startsWith('<ul>', pos))       { depth++; pos += 4; }
        else if (html.startsWith('</ul>', pos)) { depth--; if (depth === 0) { ulEnd = pos; break; } pos += 5; }
        else pos++;
      }
      if (ulEnd !== -1) {
        const ulInner = html.slice(ulIdx + 4, ulEnd);
        // Depth-aware: collect top-level <li> contents
        const items = [];
        let liDepth = 0, liStart = -1, i = 0;
        while (i < ulInner.length) {
          if (ulInner.startsWith('<li>', i))       { if (liDepth === 0) liStart = i + 4; liDepth++; i += 4; }
          else if (ulInner.startsWith('</li>', i)) { liDepth--; if (liDepth === 0 && liStart !== -1) { items.push(ulInner.slice(liStart, i)); liStart = -1; } i += 5; }
          else i++;
        }
        const extractCard = (content) => {
          const strongMatch = content.match(/<strong>(.*?)<\/strong>/);
          const innerUlIdx = content.indexOf('<ul>');
          let title, body;
          if (strongMatch) {
            title = strongMatch[1];
            if (innerUlIdx !== -1) {
              const innerLiMatch = content.slice(innerUlIdx).match(/<li>([\s\S]*?)<\/li>/);
              body = innerLiMatch ? innerLiMatch[1].trim() : '';
            } else {
              body = content.replace(strongMatch[0], '').trim();
            }
          } else {
            // No <strong>: title is all content before first <ul>, body is inside nested <li>
            if (innerUlIdx !== -1) {
              title = content.slice(0, innerUlIdx).trim();
              const innerLiMatch = content.slice(innerUlIdx).match(/<li>([\s\S]*?)<\/li>/);
              body = innerLiMatch ? innerLiMatch[1].trim() : '';
            } else {
              title = '';
              body = content.trim();
            }
          }
          return { title, body };
        };
        const [first, ...rest] = items;
        const { title: featTitle, body: featBody } = extractCard(first);
        const featCard = `<div class="feat-card"><strong>${featTitle}</strong><p>${featBody}</p></div>`;
        const subCards = rest.map(content => {
          const { title, body } = extractCard(content);
          return `<div class="sub-card"><strong>${title}</strong><p>${body}</p></div>`;
        });
        html = html.slice(0, ulIdx) + `<div class="feat-layout">${featCard}<div class="sub-row">${subCards.join('')}</div></div>` + html.slice(ulEnd + 5);
      }
    }
  }

  // split-panel: h2+h5+code-only-p go in panel-left, everything after in panel-right
  if (cls.includes('split-panel')) {
    const h2Match = html.match(/<h2>([\s\S]*?)<\/h2>/);
    const h5Match = html.match(/<h5>([\s\S]*?)<\/h5>/);
    // Code-only paragraph (e.g. `Section 02`) → left panel, matching the CSS fallback
    const codePMatch = html.match(/<p><code>[^<]+<\/code><\/p>/);
    const h2 = h2Match ? h2Match[0] : '';
    const h5 = h5Match ? h5Match[0] : '';
    const codeP = codePMatch ? codePMatch[0] : '';
    const watermarkLetter = h2Match ? h2Match[1].trim()[0] : 'S';
    const rest = html
      .replace(h2, '')
      .replace(h5, '')
      .replace(codeP, '')
      .trim();
    html = `<div class="panel-left"><div class="watermark">${watermarkLetter}</div>${codeP}${h5}${h2}</div><div class="panel-right">${rest}</div>`;
  }

  // Depth-aware lift of each top-level <li> in the first ul/ol of `src`.
  // Mirrors the slot-label-lift Marpit plugin for the emulator path.
  function liftListItems(src) {
    const listMatch = src.match(/<(ul|ol)>/);
    if (!listMatch) return src;
    const listTag = listMatch[1];
    const openList = `<${listTag}>`, closeList = `</${listTag}>`;
    const listStart = src.indexOf(openList);
    let depth = 0, pos = listStart, listEnd = -1;
    while (pos < src.length) {
      if (src.startsWith(openList, pos)) { depth++; pos += openList.length; }
      else if (src.startsWith(closeList, pos)) { depth--; if (depth === 0) { listEnd = pos; break; } pos += closeList.length; }
      else pos++;
    }
    if (listEnd === -1) return src;
    const inner = src.slice(listStart + openList.length, listEnd);
    const out = []; let liDepth = 0, liStart = -1, i = 0, lastEmitted = 0;
    while (i < inner.length) {
      if (inner.startsWith('<li>', i)) { if (liDepth === 0) liStart = i + 4; liDepth++; i += 4; }
      else if (inner.startsWith('</li>', i)) {
        liDepth--;
        if (liDepth === 0 && liStart !== -1) {
          out.push(inner.slice(lastEmitted, liStart));
          out.push(liftSlotLabel(inner.slice(liStart, i)));
          lastEmitted = i; liStart = -1;
        }
        i += 5;
      } else i++;
    }
    out.push(inner.slice(lastEmitted));
    return src.slice(0, listStart) + openList + out.join('') + closeList + src.slice(listEnd + closeList.length);
  }

  // split-brief: `eyebrow` code-p + h2 + first non-code p → brief-left;
  // tight ul (title / -- body sub-item pairs, title auto-lifted) → brief-right.
  if (cls.includes('split-brief')) {
    const codePMatch = html.match(/<p><code>([^<]+)<\/code><\/p>/);
    const h2Match = html.match(/<h2>([\s\S]*?)<\/h2>/);
    const introPMatch = html.match(/<p>(?!<code>)([\s\S]*?)<\/p>/);
    const eyebrow = codePMatch ? `<span class="eyebrow">${codePMatch[1]}</span>` : '';
    const codeP = codePMatch ? codePMatch[0] : '';
    const h2 = h2Match ? h2Match[0] : '';
    const introP = introPMatch ? introPMatch[0] : '';
    let right = html;
    if (codeP) right = right.replace(codeP, '');
    if (h2) right = right.replace(h2, '');
    if (introP) right = right.replace(introP, '');
    right = liftListItems(right.trim());
    html = `<div class="brief-left">${eyebrow}${h2}${introP}</div><div class="brief-right">${right}</div>`;
  }

  // split-metric: `unit-label` code-p → span.unit-label; h2 = hero number;
  // first non-code p → span.metric-context; tight ul (title auto-lifted) → metric-right.
  if (cls.includes('split-metric')) {
    const codePMatch = html.match(/<p><code>([^<]+)<\/code><\/p>/);
    const h2Match = html.match(/<h2>([\s\S]*?)<\/h2>/);
    const introPMatch = html.match(/<p>(?!<code>)([\s\S]*?)<\/p>/);
    const unitLabel = codePMatch ? `<span class="unit-label">${codePMatch[1]}</span>` : '';
    const codeP = codePMatch ? codePMatch[0] : '';
    const h2 = h2Match ? h2Match[0] : '';
    const introP = introPMatch ? introPMatch[0] : '';
    const context = introP ? `<span class="metric-context">${introP.replace(/<\/?p>/g, '')}</span>` : '';
    let right = html;
    if (codeP) right = right.replace(codeP, '');
    if (h2) right = right.replace(h2, '');
    if (introP) right = right.replace(introP, '');
    right = liftListItems(right.trim());
    html = `<div class="metric-left">${unitLabel}${h2}${context}</div><div class="metric-right">${right}</div>`;
  }

  // split-steps: `phase-num` code-p → span.phase-num; h2 + first non-code p →
  // steps-left; tight ol (title auto-lifted / -- body sub-item) → steps-right.
  if (cls.includes('split-steps')) {
    const codePMatch = html.match(/<p><code>([^<]+)<\/code><\/p>/);
    const h2Match = html.match(/<h2>([\s\S]*?)<\/h2>/);
    const introPMatch = html.match(/<p>(?!<code>)([\s\S]*?)<\/p>/);
    const phaseNum = codePMatch ? `<span class="phase-num">${codePMatch[1]}</span>` : '';
    const codeP = codePMatch ? codePMatch[0] : '';
    const h2 = h2Match ? h2Match[0] : '';
    const introP = introPMatch ? introPMatch[0] : '';
    let right = html;
    if (codeP) right = right.replace(codeP, '');
    if (h2) right = right.replace(h2, '');
    if (introP) right = right.replace(introP, '');
    right = liftListItems(right.trim());
    html = `<div class="steps-left">${phaseNum}${h2}${introP}</div><div class="steps-right">${right}</div>`;
  }

  // split-compare: `frame-label` code-p + h2 + first non-code p → compare-left;
  // ul/ol top-level li items → .option / .option.preferred; blockquote → .verdict.
  // Second top-level list item is always the preferred option.
  if (cls.includes('split-compare')) {
    const codePMatch = html.match(/<p><code>([^<]+)<\/code><\/p>/);
    const h2Match = html.match(/<h2>([\s\S]*?)<\/h2>/);
    const introPMatch = html.match(/<p>(?!<code>)([\s\S]*?)<\/p>/);
    const bqMatch = html.match(/<blockquote>([\s\S]*?)<\/blockquote>/);
    const frameLabel = codePMatch ? `<span class="frame-label">${codePMatch[1]}</span>` : '';
    const codeP = codePMatch ? codePMatch[0] : '';
    const h2 = h2Match ? h2Match[0] : '';
    const introP = introPMatch ? introPMatch[0] : '';
    const bq = bqMatch ? bqMatch[0] : '';
    let body = html;
    if (codeP) body = body.replace(codeP, '');
    if (h2) body = body.replace(h2, '');
    if (introP) body = body.replace(introP, '');
    if (bq) body = body.replace(bq, '');
    body = body.trim();
    // Split the first ul/ol into top-level li items → .option divs.
    const listMatch = body.match(/<(ul|ol)>/);
    let options = '';
    if (listMatch) {
      const listTag = listMatch[1];
      const openList = `<${listTag}>`, closeList = `</${listTag}>`;
      const listStart = body.indexOf(openList);
      let depth = 0, pos = listStart, listEnd = -1;
      while (pos < body.length) {
        if (body.startsWith(openList, pos)) { depth++; pos += openList.length; }
        else if (body.startsWith(closeList, pos)) { depth--; if (depth === 0) { listEnd = pos; break; } pos += closeList.length; }
        else pos++;
      }
      if (listEnd !== -1) {
        const inner = body.slice(listStart + openList.length, listEnd);
        const items = []; let liDepth = 0, liStart = -1, i = 0;
        while (i < inner.length) {
          if (inner.startsWith('<li>', i)) { if (liDepth === 0) liStart = i + 4; liDepth++; i += 4; }
          else if (inner.startsWith('</li>', i)) { liDepth--; if (liDepth === 0 && liStart !== -1) { items.push(inner.slice(liStart, i)); liStart = -1; } i += 5; }
          else i++;
        }
        options = items.map((item, idx) => {
          const optCls = idx === 1 ? 'option preferred' : 'option';
          return `<div class="${optCls}">${liftSlotLabel(item)}</div>`;
        }).join('');
      }
    }
    const verdict = bq ? `<div class="verdict">${bq}</div>` : '';
    html = `<div class="compare-left">${frameLabel}${h2}${introP}</div>`
         + `<div class="compare-right"><div class="options">${options}</div>${verdict}</div>`;
  }

  // split-statement: leading blockquote → statement-left; `cite` code-p → cite
  // element; tight ul (title auto-lifted / -- body sub-item pairs) → statement-right.
  if (cls.includes('split-statement')) {
    const bqMatch = html.match(/<blockquote>([\s\S]*?)<\/blockquote>/);
    const codePMatch = html.match(/<p><code>([^<]+)<\/code><\/p>/);
    const bq = bqMatch ? bqMatch[0] : '';
    const codeP = codePMatch ? codePMatch[0] : '';
    const cite = codePMatch ? `<cite>${codePMatch[1]}</cite>` : '';
    let right = html;
    if (bq) right = right.replace(bq, '');
    if (codeP) right = right.replace(codeP, '');
    right = liftListItems(right.trim());
    html = `<div class="statement-left">${bq}${cite}</div><div class="statement-right">${right}</div>`;
  }

  // cards-wide: wrap ol/ul, each li becomes a wide-card; ol gets numbered badge
  if (cls.includes('cards-wide')) {
    html = html.replace(/<(ol|ul)>([\s\S]*?)<\/\1>/g, (_, tag, inner) => {
      const isOrdered = tag === 'ol';
      // Split inner into top-level <li>…</li> blocks, tracking nested ul/ol depth
      // so a nested list's </li> doesn't terminate the outer item.
      const items = [];
      const re = /<li>|<\/li>|<(?:ul|ol)>|<\/(?:ul|ol)>/g;
      let depth = 0, liStart = -1, m;
      while ((m = re.exec(inner)) !== null) {
        const tok = m[0];
        if (tok === '<li>') {
          if (depth === 0) liStart = m.index + tok.length;
          depth++;
        } else if (tok === '</li>') {
          depth--;
          if (depth === 0 && liStart >= 0) {
            items.push(inner.slice(liStart, m.index));
            liStart = -1;
          }
        } else if (tok === '<ul>' || tok === '<ol>') {
          depth++;
        } else {
          depth--;
        }
      }
      const cards = items.map(content => {
        // Header = content before the first nested <ul> (or whole content if none).
        // Strip a wrapping <strong>…</strong> if the author wrote one — the layout
        // bolds the heading via CSS, so manual bolding is optional.
        const nestedUl = content.match(/<ul>([\s\S]*)<\/ul>\s*$/);
        let headerRaw = nestedUl ? content.slice(0, nestedUl.index) : content;
        headerRaw = headerRaw.trim();
        const strongOnly = headerRaw.match(/^<strong>([\s\S]*?)<\/strong>$/);
        const heading = strongOnly ? strongOnly[1] : headerRaw;
        if (!heading) return `<div class="wide-card"><div class="wide-card-body"><span>${content}</span></div></div>`;
        let bodyHtml = '';
        if (nestedUl) {
          const bodyItems = [...nestedUl[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => x[1]);
          bodyHtml = bodyItems.map(b => `<span>${b}</span>`).join('');
        }
        const badgeHtml = '';
        return `<div class="wide-card"><div class="wide-card-header">${badgeHtml}<span class="wide-card-heading">${heading}</span></div><div class="wide-card-body">${bodyHtml}</div></div>`;
      });
      const orderedClass = isOrdered ? ' ordered' : '';
      return `<div class="three-stack${orderedClass}">${cards.join('')}</div>`;
    });
  }

  // compare-code: pair each p>code+pre into .code-col divs inside .code-cols
  // Structure: [p>code(eyebrow)] h2(heading) p>code(left-label) pre p>code(right-label) pre
  // Column labels are inline-code paragraphs (p>code), consistent with the eyebrow convention.
  // Eyebrow = p>code appearing before h2 (at start of html); column labels = p>code after h2.
  if (cls.includes('compare-code')) {
    const eyeMatch = html.match(/^(<p><code>[\s\S]*?<\/code><\/p>)/);
    const h2Match  = html.match(/(<h2>[\s\S]*?<\/h2>)/);
    const eyeEl = eyeMatch ? eyeMatch[1] : '';
    const h2El  = h2Match  ? h2Match[1]  : '';
    // Remove eyebrow and h2, leaving the two col p>code+pre pairs
    let rest = html;
    if (eyeEl) rest = rest.replace(eyeEl, '');
    if (h2El)  rest = rest.replace(h2El,  '');
    // Split on p>code to get column pairs, filter empties
    const parts = rest.split(/(?=<p><code>)/).filter(s => s.trim());
    const cols = parts.map(p => `<div class="code-col">${p.trim()}</div>`).join('');
    html = `${eyeEl}${h2El}<div class="code-cols">${cols}</div>`;
  }

  // criteria: wrap each top-level li content in .crit-body (depth-aware — non-greedy
  // regex breaks on nested lists since it stops at the first </li>)
  if (cls.includes('list-criteria')) {
    const critListMatch = html.match(/<(ul|ol)>/);
    if (critListMatch) {
      const critTag = critListMatch[1];
      const critOpen = `<${critTag}>`, critClose = `</${critTag}>`;
      const critStart = html.indexOf(critOpen);
      let cdepth = 0, cpos = critStart, critEnd = -1;
      while (cpos < html.length) {
        if (html.startsWith(critOpen, cpos))  { cdepth++; cpos += critOpen.length; }
        else if (html.startsWith(critClose, cpos)) { cdepth--; if (cdepth === 0) { critEnd = cpos; break; } cpos += critClose.length; }
        else cpos++;
      }
      if (critEnd !== -1) {
        const critInner = html.slice(critStart + critOpen.length, critEnd);
        const critItems = [];
        let cliDepth = 0, cliStart = -1, ci = 0;
        while (ci < critInner.length) {
          if (critInner.startsWith('<li>', ci))       { if (cliDepth === 0) cliStart = ci + 4; cliDepth++; ci += 4; }
          else if (critInner.startsWith('</li>', ci)) { cliDepth--; if (cliDepth === 0 && cliStart !== -1) { critItems.push(critInner.slice(cliStart, ci)); cliStart = -1; } ci += 5; }
          else ci++;
        }
        const wrappedCrit = critItems.map(c => `<li><div class="crit-body">${c}</div></li>`).join('');
        html = html.slice(0, critStart + critOpen.length) + wrappedCrit + html.slice(critEnd);
      }
    }
  }

  // steps: ol already renders correctly via CSS counter + strong
  // list-tabular: nested ul flattens into the parent grid via CSS
  // `display:contents`, so no runtime DOM transform is needed — all three
  // render paths (this emulator, marp-cli, lattice-runtime) ship the same
  // markdown shape through identical CSS.

  // ── glossary: nested-list → table transform ──────────────────────────────
  // Author writes:
  //   - Term
  //     - Definition
  // Runtime transforms to a 2-column table with the term auto-bolded.
  // Mirrors the Marpit plugin in marp.config.js and the DOM injector in
  // lattice-runtime.js so all three pipelines emit identical HTML.
  if (cls.includes('glossary')) {
    // Find the first top-level <ul>...</ul> with balanced depth (a non-greedy
    // regex would stop at the FIRST nested </ul>).
    const startIdx = html.indexOf('<ul>');
    if (startIdx >= 0) {
      const tagRe = /<(\/?)ul>/g;
      tagRe.lastIndex = startIdx;
      let depth = 0, endIdx = -1, m;
      while ((m = tagRe.exec(html)) !== null) {
        if (m[1] === '') depth++;
        else { depth--; if (depth === 0) { endIdx = m.index + m[0].length; break; } }
      }
      if (endIdx > startIdx) {
        const inner = html.slice(startIdx + 4, endIdx - 5); // strip outer <ul></ul>
        // Walk top-level <li>…</li> spans; for each, split term from any nested <ul>.
        const liRe = /<(\/?)(ul|li)>/g;
        let liDepth = 0, itemStart = -1;
        const items = [];
        let t;
        while ((t = liRe.exec(inner)) !== null) {
          const closing = t[1] === '/';
          const tag = t[2];
          if (tag === 'li' && !closing && liDepth === 0) { itemStart = t.index + t[0].length; liDepth = 1; continue; }
          if (tag === 'ul' && !closing && liDepth >= 1) { liDepth++; continue; }
          if (tag === 'ul' && closing && liDepth >= 2) { liDepth--; continue; }
          if (tag === 'li' && closing && liDepth === 1) {
            items.push(inner.slice(itemStart, t.index));
            liDepth = 0; itemStart = -1;
          }
        }
        const rows = [];
        for (const item of items) {
          const nestedIdx = item.search(/<ul>/);
          let term, def;
          if (nestedIdx >= 0) {
            term = item.slice(0, nestedIdx).trim();
            const nested = item.slice(nestedIdx);
            const defMatch = nested.match(/<ul>\s*<li>([\s\S]*?)<\/li>\s*<\/ul>/);
            def = defMatch ? defMatch[1].trim() : '';
          } else {
            term = item.trim(); def = '';
          }
          if (!/^<(?:strong|b)\b/i.test(term)) term = `<strong>${term}</strong>`;
          rows.push(`<tr><td>${term}</td><td>${def}</td></tr>`);
        }
        if (rows.length) {
          const thead = `<thead><tr><th>Term</th><th>Definition</th></tr></thead>`;
          const table = `<table>${thead}<tbody>\n${rows.join('\n')}\n</tbody></table>`;
          html = html.slice(0, startIdx) + table + html.slice(endIdx);
        }
      }
    }
  }

  // ── glossary: auto-range pill ────────────────────────────────────────────
  // Every glossary slide gets a brand pill appended to its h2, spanning the
  // alphabetic range of the table — e.g. `Glossary` becomes
  // `Glossary <span class="range-pill">A – G</span>`. The first and last
  // visible characters of the table's first-column cells are read at parse
  // time, so reordering entries cannot desync the header. Mirrors the Marpit
  // plugin in marp.config.js so the result is identical in build, VS Code
  // Marp preview, and this LLM-env emulator.
  if (cls.includes('glossary')) {
    const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (tbodyMatch) {
      const rows = [...tbodyMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
      if (rows.length) {
        const firstCell = rows[0][1].match(/<td>([\s\S]*?)<\/td>/);
        const lastCell  = rows[rows.length - 1][1].match(/<td>([\s\S]*?)<\/td>/);
        const firstChar = (s) => (s.replace(/<[^>]+>/g, '').trim()[0] || '').toUpperCase();
        if (firstCell && lastCell) {
          const a = firstChar(firstCell[1]);
          const z = firstChar(lastCell[1]);
          const range = a === z ? a : `${a} – ${z}`;
          const pill = ` <span class="range-pill">${range}</span>`;
          html = html.replace(/(<h2>[\s\S]*?)(<\/h2>)/, (_, open, close) => `${open}${pill}${close}`);
        }
      }
    }
  }

  // ── Chart family (experimental — 2026-05-07) ─────────────────────────────
  // Shared frame for list-and-pill chart layouts (progress, timeline-list,
  // piechart). Each layout's <ul>/<ol> is rewritten into chart-specific
  // markup, then the whole slide is wrapped in a chart-frame skeleton:
  // header (lucent strip with eyebrow + h2 + subtitle), body, optional
  // caption. Class collisions matter — we match exact tokens, not
  // substrings, because `progress-N` is already a modifier on `agenda`.
  const classTokens = cls.trim().split(/\s+/);
  const chartLayouts = ['progress', 'timeline-list', 'piechart', 'gantt', 'kanban'];
  const chartLayout = chartLayouts.find(l => classTokens.includes(l));
  if (chartLayout) {
    // ── Helper: extract top-level <li> contents from a list inner string,
    //   tracking nested <ul>/<ol> depth so a nested </li> doesn't terminate
    //   the outer item. Used by all three chart layouts.
    const parseTopLevelLis = (inner) => {
      const items = [];
      let depth = 0, liStart = -1, i = 0;
      while (i < inner.length) {
        if (inner.startsWith('<li>', i)) {
          if (depth === 0) liStart = i + 4;
          depth++;
          i += 4;
        } else if (inner.startsWith('</li>', i)) {
          depth--;
          if (depth === 0 && liStart !== -1) {
            items.push(inner.slice(liStart, i));
            liStart = -1;
          }
          i += 5;
        } else if (inner.startsWith('<ul>', i) || inner.startsWith('<ol>', i)) {
          depth++; i += 4;
        } else if (inner.startsWith('</ul>', i) || inner.startsWith('</ol>', i)) {
          depth--; i += 5;
        } else {
          i++;
        }
      }
      return items;
    };

    // Strip trailing <code>X</code> (with optional whitespace) repeatedly,
    // returning {leadStripped, pills} where pills are in source order.
    const stripTrailingPills = (lead) => {
      const pills = [];
      let s = lead;
      while (true) {
        const m = s.match(/^([\s\S]*?)\s*<code>([^<]+)<\/code>\s*$/);
        if (!m) break;
        pills.unshift(m[2].trim());
        s = m[1];
      }
      return { leadStripped: s, pills };
    };

    const escAttr = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

    // Depth-aware extractor for the first <ul> in a string. Unlike the lazy
    // regex /<ul>[\s\S]*?<\/ul>/, this correctly handles nested sub-lists
    // (the lazy pattern would stop at the first inner </ul>, not the outer).
    // Returns { inner, start, end } or null if no <ul> found.
    const extractFirstUl = (src) => {
      const s = src.indexOf('<ul>');
      if (s < 0) return null;
      let depth = 0, pos = s, inner = '';
      while (pos < src.length) {
        if (src.startsWith('<ul>', pos) || src.startsWith('<ol>', pos)) {
          if (depth > 0) inner += src.slice(pos, pos + 4);
          depth++; pos += 4;
        } else if (src.startsWith('</ul>', pos) || src.startsWith('</ol>', pos)) {
          depth--;
          if (depth === 0) return { inner, start: s, end: pos + 5 };
          inner += src.slice(pos, pos + 5); pos += 5;
        } else {
          if (depth > 0) inner += src[pos];
          pos++;
        }
      }
      return null;
    };

    // ── progress ── one bar per top-level <li>
    if (chartLayout === 'progress') {
      html = html.replace(/<ul>([\s\S]*?)<\/ul>/, (_full, ulInner) => {
        const items = parseTopLevelLis(ulInner);
        const rows = items.map(item => {
          // Find nested <ul> (the body footnote, if any)
          const nestedIdx = item.search(/<ul>/);
          const lead = nestedIdx >= 0 ? item.slice(0, nestedIdx) : item;
          let note = '';
          if (nestedIdx >= 0) {
            const nestedMatch = item.slice(nestedIdx).match(/<ul>\s*<li>([\s\S]*?)<\/li>\s*<\/ul>/);
            if (nestedMatch) note = nestedMatch[1].trim();
          }
          // Trailing pills: pct (required) + status (optional)
          const { leadStripped, pills } = stripTrailingPills(lead.replace(/<\/?p>/g, '').trim());
          const pctRaw = pills[0] || '';
          const status = pills[1] || '';
          const pct = parseInt(pctRaw, 10) || 0;
          const labelText = leadStripped.trim();
          const statusAttr = status ? ` data-s="${escAttr(status)}"` : '';
          const statusEl = status
            ? `<span class="chart-status"${statusAttr}>${status}</span>`
            : '<span class="chart-status-empty"></span>';
          const noteEl = note ? `<div class="progress-note">${note}</div>` : '';
          return `<div class="progress-row">` +
            `<div class="progress-label">${labelText}</div>` +
            `<div class="progress-track"><div class="progress-fill"${statusAttr} style="--pct:${pct}"></div></div>` +
            `<div class="progress-pct">${pctRaw}</div>` +
            statusEl +
            noteEl +
            `</div>`;
        }).join('');
        return `<div class="progress-bars">${rows}</div>`;
      });
    }

    // ── timeline-list ── horizontal spine; date pill leads, status trails
    if (chartLayout === 'timeline-list') {
      html = html.replace(/<ol>([\s\S]*?)<\/ol>/, (_full, olInner) => {
        const items = parseTopLevelLis(olInner);
        const itemEls = items.map(item => {
          const nestedIdx = item.search(/<ul>/);
          let lead = nestedIdx >= 0 ? item.slice(0, nestedIdx) : item;
          let body = '';
          if (nestedIdx >= 0) {
            const nestedMatch = item.slice(nestedIdx).match(/<ul>\s*<li>([\s\S]*?)<\/li>\s*<\/ul>/);
            if (nestedMatch) body = nestedMatch[1].trim();
          }
          lead = lead.replace(/<\/?p>/g, '').trim();
          // Leading <code> = date pill
          const leadingMatch = lead.match(/^<code>([^<]+)<\/code>\s*/);
          const datePill = leadingMatch ? leadingMatch[1].trim() : '';
          if (leadingMatch) lead = lead.slice(leadingMatch[0].length);
          // Trailing <code> = status pill
          const { leadStripped, pills } = stripTrailingPills(lead);
          const statusPill = pills[0] || '';
          const title = leadStripped.trim();
          const dateEl = datePill ? `<div class="timeline-pill">${datePill}</div>` : '<div class="timeline-pill timeline-pill--empty"></div>';
          const statusEl = statusPill ? `<span class="chart-status" data-s="${escAttr(statusPill)}">${statusPill}</span>` : '';
          const bodyEl = body ? `<div class="timeline-body">${body}</div>` : '';
          return `<div class="timeline-item">` +
            `<div class="timeline-dot"></div>` +
            dateEl +
            `<div class="timeline-title">${title}</div>` +
            statusEl +
            bodyEl +
            `</div>`;
        }).join('');
        return `<div class="timeline-spine">${itemEls}</div>`;
      });
    }

    // ── piechart ── flat list with magnitude pill; emit SVG donut + legend
    if (chartLayout === 'piechart') {
      const palette = [
        'var(--cat-blue)', 'var(--cat-green)', 'var(--cat-purple)', 'var(--cat-orange)',
        'var(--cat-teal)', 'var(--cat-rose)', 'var(--cat-mauve)', 'var(--cat-slate)'
      ];
      const isDonut = classTokens.includes('donut');
      html = html.replace(/<ul>([\s\S]*?)<\/ul>/, (_full, ulInner) => {
        const items = parseTopLevelLis(ulInner);
        const parsed = items.map(item => {
          const lead = item.replace(/<\/?p>/g, '').trim();
          const { leadStripped, pills } = stripTrailingPills(lead);
          const valueRaw = pills[0] || '0';
          const numMatch = valueRaw.match(/[\d.]+/);
          const num = numMatch ? parseFloat(numMatch[0]) : 0;
          return { label: leadStripped.trim(), valueRaw, num };
        });
        const total = parsed.reduce((s, p) => s + p.num, 0) || 1;
        const cx = 100, cy = 100, R = 80, r = 50;
        let cumul = 0;
        const wedges = parsed.map((p, idx) => {
          const startAngle = (cumul / total) * 2 * Math.PI;
          cumul += p.num;
          const endAngle = (cumul / total) * 2 * Math.PI;
          const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
          const x1 = (cx + R * Math.sin(startAngle)).toFixed(2);
          const y1 = (cy - R * Math.cos(startAngle)).toFixed(2);
          const x2 = (cx + R * Math.sin(endAngle)).toFixed(2);
          const y2 = (cy - R * Math.cos(endAngle)).toFixed(2);
          const fill = palette[idx % palette.length];
          if (isDonut) {
            const ix1 = (cx + r * Math.sin(startAngle)).toFixed(2);
            const iy1 = (cy - r * Math.cos(startAngle)).toFixed(2);
            const ix2 = (cx + r * Math.sin(endAngle)).toFixed(2);
            const iy2 = (cy - r * Math.cos(endAngle)).toFixed(2);
            const d = `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
            return `<path class="wedge" style="fill:${fill}" d="${d}"/>`;
          }
          const d = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          return `<path class="wedge" style="fill:${fill}" d="${d}"/>`;
        }).join('');
        const svg = `<svg class="piechart-svg" viewBox="0 0 200 200" role="img" aria-hidden="true">${wedges}</svg>`;
        const legendItems = parsed.map((p, idx) => {
          const fill = palette[idx % palette.length];
          return `<li>` +
            `<span class="legend-swatch" style="background:${fill}"></span>` +
            `<span class="legend-label">${p.label}</span>` +
            `<span class="legend-pct">${p.valueRaw}</span>` +
            `</li>`;
        }).join('');
        const legend = `<ol class="piechart-legend">${legendItems}</ol>`;
        return `<div class="piechart-figure">${svg}${legend}</div>`;
      });
    }

    // ── gantt ── categorical bar chart from a two-level list
    // Top-level bullet = swimlane; sub-bullet = bar with leading range pill
    // and optional trailing status pill. The axis tick labels and bar positions
    // share the same effective width (both are flex:1 inside a flex row that
    // starts with a fixed-width label column) so percentage-based absolute
    // positioning in .gantt-bars aligns precisely with the grid in .gantt-ticks.
    // Sibling paths: lattice.css section.gantt, lattice-runtime.js (TODO).
    if (chartLayout === 'gantt') {
      // Parse the time window declared in the eyebrow (e.g. "2026 Q1 → 2026 Q4").
      // Supports quarterly (Q1–Q4) and monthly (Jan–Dec) axes.
      const parseGanttWindow = (text) => {
        const m = text.match(/(.+?)\s*(?:→|–|->)\s*(.+)/);
        if (!m) return { ticks: [], colMap: {} };
        const norm = (s) => {
          const q = s.match(/Q[1-4]/i); if (q) return q[0].toUpperCase();
          const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const mo = allM.find(mn => new RegExp(mn, 'i').test(s)); if (mo) return mo;
          return s.trim();
        };
        const start = norm(m[1].trim()), end = norm(m[2].trim());
        const allQ = ['Q1','Q2','Q3','Q4'];
        const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const qs = allQ.indexOf(start), qe = allQ.indexOf(end);
        const ms = allM.indexOf(start), me = allM.indexOf(end);
        let ticks;
        if (qs >= 0 && qe >= 0 && qe >= qs)   ticks = allQ.slice(qs, qe + 1);
        else if (ms >= 0 && me >= 0 && me >= ms) ticks = allM.slice(ms, me + 1);
        else return { ticks: [], colMap: {} };
        const colMap = {};
        ticks.forEach((t, i) => { colMap[t] = i + 1; }); // 1-indexed in bar area
        return { ticks, colMap };
      };

      // Parse a bar's range pill (e.g. "Q1 → Q2") into { col, span }.
      // col is 1-indexed within the bar area (1 = first tick column).
      const parseBarRange = (pill, colMap) => {
        const m = pill.match(/(.+?)\s*(?:→|–|->)\s*(.+)/);
        if (!m) return { col: 1, span: 1 };
        const norm = (s) => {
          const q = s.match(/Q[1-4]/i); if (q) return q[0].toUpperCase();
          const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const mo = allM.find(mn => new RegExp(mn, 'i').test(s)); if (mo) return mo;
          return s.trim();
        };
        const sc = colMap[norm(m[1].trim())], ec = colMap[norm(m[2].trim())];
        if (!sc || !ec) return { col: 1, span: 1 };
        return { col: sc, span: ec - sc + 1 };
      };

      // Extract window from eyebrow already sitting in html
      const eyeHtmlMatch = html.match(/<p>\s*<code>([^<]+?)<\/code>\s*<\/p>/);
      const { ticks, colMap } = parseGanttWindow(eyeHtmlMatch ? eyeHtmlMatch[1] : '');
      const numCols = ticks.length || 4;

      const ulExtract = extractFirstUl(html);
      if (ulExtract) {
        // Axis row: spacer + grid of tick labels
        const tickHtml = ticks.map(t => `<div class="gantt-tick">${t}</div>`).join('');
        const axisRow = `<div class="gantt-axis-row"><div class="gantt-axis-spacer"></div>` +
          `<div class="gantt-ticks">${tickHtml}</div></div>`;

        // Swimlanes
        const swimlanes = parseTopLevelLis(ulExtract.inner);
        const lanesHtml = swimlanes.map(lane => {
          const laneUl = extractFirstUl(lane);
          const laneLabel = (laneUl ? lane.slice(0, laneUl.start) : lane)
            .replace(/<\/?p>/g, '').trim();
          let barsHtml = '';
          if (laneUl) {
            const barItems = parseTopLevelLis(laneUl.inner);
            barsHtml = barItems.map(barContent => {
              const bc = barContent.replace(/<\/?p>/g, '').trim();
              const { leadStripped, pills } = stripTrailingPills(bc);
              const rangePill  = pills.find(p => /→|–|->/.test(p)) || '';
              const statusPill = pills.find(p => !/→|–|->/.test(p)) || '';
              const { col, span } = rangePill ? parseBarRange(rangePill, colMap) : { col: 1, span: 1 };
              const sAttr = statusPill ? ` data-s="${escAttr(statusPill)}"` : '';
              return `<div class="gantt-bar"${sAttr} style="--gantt-col-start:${col};--gantt-col-span:${span}">` +
                `${leadStripped.trim()}</div>`;
            }).join('');
          }
          return `<div class="gantt-lane">` +
            `<div class="gantt-lane-label">${laneLabel}</div>` +
            `<div class="gantt-bars">${barsHtml}</div>` +
            `</div>`;
        }).join('');

        const ganttHtml = `<div class="gantt-chart" style="--gantt-cols:${numCols}">` +
          axisRow + lanesHtml + `</div>`;
        html = html.slice(0, ulExtract.start) + ganttHtml + html.slice(ulExtract.end);
      }
    }

    // ── kanban ── board from a two-level list
    // Top-level bullet = column header; sub-bullet = card with optional
    // size pill (S/M/L/XL), lane pill (any word), status pill (vocabulary).
    // Pill order is structural: size → lane → status (left to right trailing).
    // Sibling paths: lattice.css section.kanban, lattice-runtime.js (TODO).
    if (chartLayout === 'kanban') {
      const KB_STATUS = ['on-track','done','live','at-risk','warn','blocked','fail',
        'pilot','decision','deferred'];
      const KB_SIZE   = ['s','m','l','xl'];
      const KB_DONE_NAMES = ['done','completed','shipped','closed'];

      const laneColorVars = ['var(--cat-blue)','var(--cat-green)','var(--cat-purple)',
        'var(--cat-orange)','var(--cat-teal)','var(--cat-rose)','var(--cat-mauve)','var(--cat-slate)'];
      const laneColorMap = {};
      let laneColorIdx = 0;
      const getLaneColor = (lane) => {
        if (!lane) return '';
        const key = lane.toLowerCase();
        if (!laneColorMap[key]) laneColorMap[key] = laneColorVars[laneColorIdx++ % laneColorVars.length];
        return laneColorMap[key];
      };

      const ulExtract = extractFirstUl(html);
      if (ulExtract) {
        const columns = parseTopLevelLis(ulExtract.inner);
        const columnsHtml = columns.map(col => {
          const colUl = extractFirstUl(col);
          const colHeader = (colUl ? col.slice(0, colUl.start) : col)
            .replace(/<\/?p>/g, '').trim();
          const isDone = KB_DONE_NAMES.includes(colHeader.toLowerCase());

          let cardsHtml = '';
          if (colUl) {
            const cardItems = parseTopLevelLis(colUl.inner);
            cardsHtml = cardItems.map(cardContent => {
              const bodyUl = extractFirstUl(cardContent);
              const cardLead = (bodyUl ? cardContent.slice(0, bodyUl.start) : cardContent)
                .replace(/<\/?p>/g, '').trim();
              // Size: one trailing size code on the title line
              let size = '', cardTitle = cardLead;
              const sizeM = cardLead.match(/^([\s\S]*?)\s*<code>([^<]+)<\/code>\s*$/);
              if (sizeM && KB_SIZE.includes(sizeM[2].trim().toLowerCase())) {
                size = sizeM[2].trim().toUpperCase();
                cardTitle = sizeM[1].trim();
              }

              // Label + status: first sub-bullet (prose = label, trailing code = status)
              let label = '', status = '', cardBody = '';
              if (bodyUl) {
                const subItems = parseTopLevelLis(bodyUl.inner);
                if (subItems[0]) {
                  const metaLine = subItems[0].replace(/<\/?p>/g, '').trim();
                  const statM = metaLine.match(/^([\s\S]*?)\s*<code>([^<]+)<\/code>\s*$/);
                  if (statM && KB_STATUS.includes(statM[2].trim().toLowerCase())) {
                    status = statM[2].trim();
                    label  = statM[1].replace(/<[^>]+>/g, '').trim();
                  } else {
                    label = metaLine.replace(/<[^>]+>/g, '').trim();
                  }
                }
                cardBody = subItems[1] ? subItems[1].replace(/<\/?p>/g, '').trim() : '';
              }

              const laneColor = getLaneColor(label);
              const laneStyle = laneColor ? ` style="--lane-color:${laneColor}"` : '';
              const sAttr     = status ? ` data-s="${escAttr(status)}"` : '';
              const sizeEl    = size  ? `<span class="kanban-size">${size}</span>` : '';
              const laneEl    = label
                ? `<span class="kanban-lane" style="--lane-color:${laneColor || 'var(--accent)'}">${label}</span>`
                : '';
              const statusEl  = status
                ? `<span class="chart-status" data-s="${escAttr(status)}">${status}</span>`
                : '';
              const titleEl   = `<div class="kanban-card-title"><span class="kanban-title-text">${cardTitle}</span>${sizeEl}</div>`;
              const metaEl    = (laneEl || statusEl) ? `<div class="kanban-card-meta">${laneEl}${statusEl}</div>` : '';
              const bodyEl    = cardBody ? `<div class="kanban-card-body">${cardBody}</div>` : '';

              return `<div class="kanban-card"${sAttr}${laneStyle}>${titleEl}${metaEl}${bodyEl}</div>`;
            }).join('');
          }

          const doneAttr = isDone ? ' data-done' : '';
          return `<div class="kanban-column"${doneAttr}>` +
            `<div class="kanban-column-header">${colHeader}</div>` +
            `<div class="kanban-cards">${cardsHtml}</div>` +
            `</div>`;
        }).join('');

        const kanbanHtml = `<div class="kanban-board">${columnsHtml}</div>`;
        html = html.slice(0, ulExtract.start) + kanbanHtml + html.slice(ulExtract.end);
      }
    }

    // ── Wrap in chart-frame skeleton ─────────────────────────────────────
    // Pull eyebrow / h2 / subtitle / chart-body / caption out of the html
    // and reassemble. The chart body anchor is the <div> emitted by the
    // layout-specific transform above.
    const h2RE = /<h2>[\s\S]*?<\/h2>/;
    const h2Match = h2RE.exec(html);
    const bodyRE = /<div\s+class="(?:progress-bars|timeline-spine|piechart-figure|gantt-chart|kanban-board)"[^>]*>/;
    const bodyMatch = h2Match && bodyRE.exec(html.slice(h2Match.index + h2Match[0].length));
    if (h2Match && bodyMatch) {
      const h2El = h2Match[0];
      const beforeH2 = html.slice(0, h2Match.index);
      const afterH2 = html.slice(h2Match.index + h2El.length);
      const bodyStart = bodyMatch.index;
      // depth-aware close-tag scan
      let depth = 0, pos = bodyStart, end = -1;
      while (pos < afterH2.length) {
        if (afterH2.startsWith('<div', pos)) {
          const close = afterH2.indexOf('>', pos);
          if (close < 0) break;
          depth++; pos = close + 1;
        } else if (afterH2.startsWith('</div>', pos)) {
          depth--;
          if (depth === 0) { end = pos + 6; break; }
          pos += 6;
        } else { pos++; }
      }
      if (end > 0) {
        const between = afterH2.slice(0, bodyStart);
        const bodyHtml = afterH2.slice(bodyStart, end);
        const afterBody = afterH2.slice(end);

        // Eyebrow: <p><code>...</code></p> immediately before h2
        let eyebrowEl = '';
        let beforeRest = beforeH2;
        const eyeMatch = beforeH2.match(/<p>\s*<code>([^<]+?)<\/code>\s*<\/p>\s*$/);
        if (eyeMatch) {
          eyebrowEl = `<p class="chart-eyebrow"><code>${eyeMatch[1]}</code></p>`;
          beforeRest = beforeH2.slice(0, eyeMatch.index);
        }

        // Subtitle: first <p>...</p> between h2 and the chart body
        let subtitleEl = '';
        const subMatch = between.match(/<p>([\s\S]*?)<\/p>/);
        if (subMatch) {
          subtitleEl = `<p class="chart-subtitle">${subMatch[1]}</p>`;
        }

        // Caption: trailing <p>(<em>?)X(</em>?)</p> after the chart body
        let captionEl = '';
        let afterRest = afterBody;
        const capMatch = afterBody.match(/<p>([\s\S]*?)<\/p>\s*$/);
        if (capMatch) {
          let cap = capMatch[1];
          const emM = cap.match(/^<em>([\s\S]*)<\/em>$/);
          if (emM) cap = emM[1];
          captionEl = `<p class="chart-caption">${cap}</p>`;
          afterRest = afterBody.slice(0, capMatch.index);
        }

        html = beforeRest +
          `<div class="chart-header">` + eyebrowEl + h2El + subtitleEl + `</div>` +
          `<div class="chart-body">` + bodyHtml + `</div>` +
          captionEl +
          afterRest;

        // Add chart-frame to the section's class list
        if (!classAttr.split(/\s+/).includes('chart-frame')) {
          classAttr = (classAttr + ' chart-frame').trim();
        }
      }
    }
  }

  // ── Universal below-note ─────────────────────────────────────────────────────
  // Any layout where the last element in html is a plain <p> gets it wrapped
  // in .below-note for the full-width hairline treatment.
  // Excludes: bookends and layouts where trailing <p> is already claimed
  // (caption / attribution / main content / italic legend).
  const noBeloNote = ['title','closing','quote','big-number','subtopic','divider','image','split-panel','split-brief','split-metric','split-steps','split-compare','split-statement','content','diagram','stats','code','roadmap','progress','timeline-list','piechart','gantt','kanban','image-razor','image-brief','image-chamber'];
  const isNoBelowNote = noBeloNote.some(x => cls.includes(x));
  if (!isNoBelowNote) {
    // Only wrap a trailing <p> as below-note if it follows a structural block
    // (div, ul, ol, table, pre) — not if it follows another <p> (that's main content)
    html = html.replace(/((?:<\/div>|<\/ul>|<\/ol>|<\/table>|<\/pre>|<\/blockquote>)\s*)<p>([^]*?)<\/p>\s*$/, '$1<div class="below-note"><p>$2</p></div>');
  }

  // ── Assemble section — matching Marp v4 HTML output ───────────────────────
  // Marp produces:
  //   <section id="N" class="..." data-marpit-slide="N"
  //            data-marpit-pagination="N" style="--marp-slide:N;">
  //     <header><p>text</p></header>   ← only when header is set
  //     [content]
  //     <footer><p>text</p></footer>   ← only when footer is set
  //   </section>
  //
  // Pagination is rendered via the native Marp mechanism: a CSS pseudo-element
  // `section::after { content: attr(data-marpit-pagination); }` fed by the
  // data attribute on the section itself. We do NOT inject a real DOM element —
  // that would create two pagination paths (Marp CLI vs lattice-emulator.js) with
  // divergent positioning. Single mechanism, single CSS rule.

  const slideNum   = index + 1;
  const styleAttr  = bgColor
    ? ` style="--marp-slide:${slideNum};background-color:${bgColor};"`
    : ` style="--marp-slide:${slideNum};"`;
  const paginAttr  = paginate ? ` data-marpit-pagination="${slideNum}"` : '';

  const headerEl   = header  ? `<header><div style="display:block;width:100%;text-align:left">${header}</div></header>` : '';
  const footerEl   = footer  ? `<footer><div style="display:block;width:100%;text-align:left">${footer}</div></footer>` : '';

  return [
    `<section id="${slideNum}" class="${classAttr}"`,
    ` data-marpit-slide="${slideNum}"${paginAttr}${styleAttr}>`,
    headerEl,
    bgImageHtml,
    html,
    footerEl,
    `</section>`
  ].join('');
}

const slides = rawSlides.map((s, i) => parseSlide(s, i));

// ── Marp-equivalent CSS for pagination and header/footer ────────────────────
// Marp injects these styles itself; we reproduce them here since we're
// not running through marp-core.
//
// Pagination uses the native Marp mechanism: the section carries a
// `data-marpit-pagination="N"` attribute, and `section::after` consumes it
// as the pseudo-element content. All visual styling (font, color, position)
// lives in lattice.css on `section::after` — see the !important block there.
// We only need the `content` rule here so the page number actually renders.
const marpSystemCss = `
/* Marp system styles — pagination content binding.
   Header/footer positioning + section::after typography live in lattice.css
   so both the CLI and the Marp VS Code preview share identical coordinates. */

section { position: relative; }

section[data-marpit-pagination]::after {
  content: attr(data-marpit-pagination);
}
`;

// ── Google Fonts ─────────────────────────────────────────────────────────────
const googleFonts = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">`;

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

const highlightedSlides = slides.map(s => applyHighlighting(s));

// ── HTML document ─────────────────────────────────────────────────────────────
const htmlDoc = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
${googleFonts}
<style>
@page { size: 1280px 720px; margin: 0; }
body  { margin: 0; padding: 0; }
${css}
${marpSystemCss}
${globalStyle ? `\n/* Front-matter style: directive */\n${globalStyle}\n` : ''}
</style></head><body>
${highlightedSlides.join('\n')}
<script>
/* Overflow watcher — tags any section whose content exceeds the 1280×720
   frame with class "overflow" so lattice.css can draw the red warning ring.
   Mirrors the watcher in lattice-runtime.js (used by the VS Code preview). */
(function(){
  var TOL = 12;
  function check(){
    document.querySelectorAll('section').forEach(function(s){
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

const outHtml = outFile.replace(/\.pdf$/, '.html');
fs.writeFileSync(outHtml, htmlDoc);
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
  await page.goto('file://' + path.resolve(outHtml), {
    waitUntil: 'networkidle0',
    timeout: 60000
  });
  // Tag any section whose content exceeds the 1280×720 frame so the red
  // overflow ring (defined in lattice.css under `section.overflow`) is
  // burned into the printed PDF. Mirrors the runtime watcher in
  // lattice-runtime.js so authors get the same loud signal in both the
  // VS Code preview and the exported PDF.
  const overflowing = await page.evaluate(() => {
    const TOL = 12; // filter sub-pixel rounding; see lattice-runtime.js
    const flagged = [];
    document.querySelectorAll('section').forEach((s, i) => {
      const over = s.scrollHeight > s.clientHeight + TOL
                || s.scrollWidth  > s.clientWidth  + TOL;
      if (over) {
        s.classList.add('overflow');
        flagged.push(i + 1);
      }
    });
    return flagged;
  });
  if (overflowing.length) {
    console.warn(`  ⚠ Overflow on slide${overflowing.length > 1 ? 's' : ''} ${overflowing.join(', ')} — red ring drawn in PDF.`);
  }
  await page.pdf({
    path: outFile,
    width: '1280px', height: '720px',
    printBackground: true,
    preferCSSPageSize: true
  });
  await browser.close();
  if (!QUIET) console.log(`PDF: ${outFile}`);
})();
