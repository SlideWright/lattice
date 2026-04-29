/**
 * lattice.js — Marp-faithful HTML renderer + PDF exporter
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
 * Usage: node lattice.js <source.md> <theme.css> <output.pdf>
 *
 * NOTE: This script exists only because Marp CLI cannot be installed
 * in this build environment. End users should use Marp CLI directly:
 *   marp deck.md --theme lattice.css --pdf --allow-local-files
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

const [,, mdFile, cssFile, outFile, paletteArg] = process.argv;
if (!mdFile || !cssFile || !outFile) {
  console.error('Usage: node lattice.js source.md theme.css output.pdf [palette]');
  console.error('Default palette: indaco');
  process.exit(1);
}

const md  = fs.readFileSync(mdFile, 'utf8');

// Load palette CSS (color tokens) and prepend to theme CSS (layouts).
// Palette tokens must be defined before layouts that reference them via var().
// Palette resolves in this order:
//   1. Explicit CLI argument (4th positional arg, e.g. "indaco" or "cuoio").
//   2. Explicit env var LATTICE_PALETTE.
//   3. Default: "indaco".
const paletteName = paletteArg || process.env.LATTICE_PALETTE || 'indaco';
const palettePath = path.join(__dirname, 'themes', `${paletteName}.css`);
let paletteCSS = '';
if (fs.existsSync(palettePath)) {
  paletteCSS = fs.readFileSync(palettePath, 'utf8');
} else {
  console.error(`Palette not found: ${palettePath}`);
  console.error(`Available palettes: ${fs.readdirSync(path.join(__dirname, 'themes')).filter(f => f.endsWith('.css')).map(f => f.replace('.css', '')).join(', ')}`);
  process.exit(1);
}
const themeCSS = fs.readFileSync(cssFile, 'utf8');
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
// See THEMING.md for the per-diagram override surface and parser limits.
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
  primaryColor:             { var: 'primary-color' },
  secondaryColor:           { var: 'secondary-color' },
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
  mainBkg:                  { var: 'primary-color' },
  nodeBorder:               { var: 'mermaid-border' },
  nodeTextColor:            { var: 'text-heading' },
  clusterBkg:               { var: 'bg-alt' },
  clusterBorder:            { var: 'mermaid-border' },

  // cScale (mid-tone band) — kanban lighten brings to L≈70
  cScale0:                  { var: 'mermaid-mid-blue' },
  cScale1:                  { var: 'mermaid-mid-green' },
  cScale2:                  { var: 'mermaid-mid-purple' },
  cScale3:                  { var: 'mermaid-mid-orange' },
  cScale4:                  { var: 'mermaid-mid-teal' },
  cScale5:                  { var: 'mermaid-mid-rose' },
  cScale6:                  { var: 'mermaid-mid-blue' },
  cScale7:                  { var: 'mermaid-mid-green' },
  cScale8:                  { var: 'mermaid-mid-purple' },
  cScale9:                  { var: 'mermaid-mid-orange' },
  cScale10:                 { var: 'mermaid-mid-teal' },
  cScale11:                 { var: 'mermaid-mid-rose' },

  // fillType (subgraph / mindmap-level fills, pale band)
  fillType0: { var: 'primary-color' },
  fillType1: { var: 'secondary-color' },
  fillType2: { var: 'pie-purple' },
  fillType3: { var: 'pie-orange' },
  fillType4: { var: 'pie-teal' },
  fillType5: { var: 'pie-rose' },
  fillType6: { var: 'primary-color' },
  fillType7: { var: 'secondary-color' },

  // Sequence diagram
  actorBkg:                 { var: 'primary-color' },
  actorBorder:              { var: 'mermaid-border' },
  actorTextColor:           { var: 'text-heading' },
  actorLineColor:           { var: 'mermaid-line' },
  signalColor:              { var: 'mermaid-line' },
  signalTextColor:          { var: 'text-heading' },
  labelBoxBkgColor:         { var: 'bg-alt' },
  labelBoxBorderColor:      { var: 'mermaid-border' },
  activationBorderColor:    { var: 'mermaid-border' },
  activationBkgColor:       { var: 'primary-color' },
  sequenceNumberColor:      { var: 'text-heading' },

  // Notes (yellow accent — category-distinct)
  noteBkgColor:             { var: 'mermaid-note-bg' },
  noteTextColor:            { var: 'text-heading' },
  noteBorderColor:          { var: 'mermaid-note-border' },

  // Error (alarm — saturated red)
  errorBkgColor:            { var: 'mermaid-error-bg' },
  errorTextColor:           { var: 'mermaid-error-text' },

  // Pie chart (pale palette — unified contract)
  pie1:  { var: 'primary-color' },
  pie2:  { var: 'secondary-color' },
  pie3:  { var: 'pie-purple' },
  pie4:  { var: 'pie-orange' },
  pie5:  { var: 'pie-teal' },
  pie6:  { var: 'pie-rose' },
  pie7:  { var: 'mermaid-pie-yellow' },
  pie8:  { var: 'mermaid-pie-red' },
  pie9:  { var: 'mermaid-pie-slate' },
  pie10: { var: 'mermaid-pie-sage' },
  pie11: { var: 'mermaid-pie-violet' },
  pie12: { var: 'primary-color' },
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
  sectionBkgColor2:       { var: 'primary-color' },
  taskBkgColor:           { var: 'primary-color' },
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
  git0: { var: 'mermaid-mid-blue' },
  git1: { var: 'mermaid-mid-green' },
  git2: { var: 'mermaid-mid-purple' },
  git3: { var: 'mermaid-mid-orange' },
  git4: { var: 'mermaid-mid-teal' },
  git5: { var: 'mermaid-mid-rose' },
  git6: { var: 'mermaid-mid-slate' },
  git7: { var: 'mermaid-mid-mauve' },
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
  quadrantInternalBorderStrokeFill: { var: 'mermaid-mid-slate' },
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

// ── CSS variable name aliases ─────────────────────────────────────────────
// The map above uses short role names. The palette CSS file uses longer
// names like --primary-color, --bg, --bg-alt, --text-heading. This alias
// table connects the two. Add new aliases when introducing a new palette
// role in themes/<n>.css.
const CSS_VAR_ALIASES = {
  'bg':                'bg',
  'bg-alt':            'bg-alt',
  'text-heading':      'text-heading',
  'primary-color':     'mermaid-primary-color',
  'secondary-color':   'mermaid-secondary-color',
  'pie-purple':        'mermaid-pie-purple',
  'pie-orange':        'mermaid-pie-orange',
  'pie-teal':          'mermaid-pie-teal',
  'pie-rose':          'mermaid-pie-rose',
  'mermaid-line':      'mermaid-line',
  'mermaid-border':    'mermaid-border',
  'mermaid-mid-blue':       'mermaid-mid-blue',
  'mermaid-mid-green':      'mermaid-mid-green',
  'mermaid-mid-purple':     'mermaid-mid-purple',
  'mermaid-mid-orange':     'mermaid-mid-orange',
  'mermaid-mid-teal':       'mermaid-mid-teal',
  'mermaid-mid-rose':       'mermaid-mid-rose',
  'mermaid-mid-slate':      'mermaid-mid-slate',
  'mermaid-mid-mauve':      'mermaid-mid-mauve',
  'mermaid-pie-yellow':     'mermaid-pie-yellow',
  'mermaid-pie-red':        'mermaid-pie-red',
  'mermaid-pie-slate':      'mermaid-pie-slate',
  'mermaid-pie-sage':       'mermaid-pie-sage',
  'mermaid-pie-violet':     'mermaid-pie-violet',
  'mermaid-quadrant-1-fill': 'mermaid-quadrant-1-fill',
  'mermaid-quadrant-2-fill': 'mermaid-quadrant-2-fill',
  'mermaid-quadrant-3-fill': 'mermaid-quadrant-3-fill',
  'mermaid-quadrant-4-fill': 'mermaid-quadrant-4-fill',
  'mermaid-quadrant-1-text': 'mermaid-quadrant-1-text',
  'mermaid-quadrant-2-text': 'mermaid-quadrant-2-text',
  'mermaid-quadrant-3-text': 'mermaid-quadrant-3-text',
  'mermaid-quadrant-4-text': 'mermaid-quadrant-4-text',
  'mermaid-gantt-active':         'mermaid-gantt-active',
  'mermaid-gantt-active-border':  'mermaid-gantt-active-border',
  'mermaid-gantt-done':           'mermaid-gantt-done',
  'mermaid-gantt-done-border':    'mermaid-gantt-done-border',
  'mermaid-gantt-critical':       'mermaid-gantt-critical',
  'mermaid-gantt-critical-border':'mermaid-gantt-critical-border',
  'mermaid-gantt-today':          'mermaid-gantt-today',
  'mermaid-gantt-grid':           'mermaid-gantt-grid',
  'mermaid-note-bg':              'mermaid-note-bg',
  'mermaid-note-border':          'mermaid-note-border',
  'mermaid-error-bg':             'mermaid-error-bg',
  'mermaid-error-text':           'mermaid-error-text',
};

// ── Resolver: parses CSS custom properties from the palette file ─────────
// Walks every :root { ... } block and extracts --variable-name: #hex pairs,
// then resolves any var() references one level deep. Returns a flat hex map.
function parsePaletteVars(paletteCSSContent) {
  const vars = {};
  const rootBlocks = paletteCSSContent.match(/:root\s*\{[^}]*\}/g) || [];
  for (const block of rootBlocks) {
    const decls = block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || [];
    for (const d of decls) {
      const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
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
      const cssVar = CSS_VAR_ALIASES[entry.var];
      if (!cssVar) {
        console.warn(`  ⚠ Mermaid theme references undefined role: ${entry.var}`);
        return '#000000';
      }
      const val = paletteVars[cssVar];
      if (!val) {
        console.warn(`  ⚠ Palette missing CSS variable: --${cssVar} (for Mermaid role ${entry.var})`);
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
  const themed = hasInit
    ? definition
    : `%%{init: ${JSON.stringify(initObj)}}%%\n${definition}`;

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
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (fs.existsSync(outSvg)) fs.unlinkSync(outSvg);
      execSync(
        `mmdc -i "${inFile}" -o "${outSvg}" --backgroundColor transparent --puppeteerConfigFile "${cfgFile}"`,
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
    process.stdout.write('  Rendering mermaid diagram...');
    const svg = renderMermaid(def.trim());
    console.log(' done');
    return svg;
  });
}


const rawMd = preprocessMermaid(md);
const fmMatch = rawMd.match(/^---([\s\S]*?)---\n/);
const fm      = fmMatch ? fmMatch[1] : '';
const paginateGlobal = /^\s*paginate:\s*true/m.test(fm);
const globalHeader   = (fm.match(/^\s*header:\s*["']?(.*?)["']?\s*$/m) || [])[1] || '';
const globalFooter   = (fm.match(/^\s*footer:\s*["']?(.*?)["']?\s*$/m) || [])[1] || '';

const content   = rawMd.replace(/^---[\s\S]*?---\n/, '');
const rawSlides = content.split(/\n---\n/).filter(s => s.trim().length > 0);
const total     = rawSlides.length;

// ── Inline parser ────────────────────────────────────────────────────────────
function parseInline(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>');
}

// ── Slide parser ─────────────────────────────────────────────────────────────
function parseSlide(raw, index) {
  // Read per-slide directives
  let classAttr = '';
  let paginate  = paginateGlobal;
  let header    = globalHeader;
  let footer    = globalFooter;
  let bgColor   = '';

  const cm = raw.match(/<!--\s*_class:\s*(.*?)\s*-->/);
  if (cm) classAttr = cm[1].trim();

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
  // Handles: ![bg right](url), ![bg left](url), ![bg](url)
  let bgImageHtml = '';
  raw = raw.replace(/!\[bg(?:\s+(right|left))?\]\(([^)]+)\)/g, (_, side, url) => {
    const pos = side === 'right' ? 'right:0;top:0;bottom:0;width:50%;'
              : side === 'left'  ? 'left:0;top:0;bottom:0;width:50%;'
              : 'inset:0;';
    bgImageHtml = `<div style="position:absolute;${pos}background:url('${url}') center/cover no-repeat;z-index:0;"></div>`;
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
  let inList = false, inOrderedList = false, inSubList = false, inBlockquote = false, inPre = false;

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
      if (inSubList)      { html += '</ul></li>';  inSubList      = false; }
      if (inList)         { html += '</ul>';        inList         = false; }
      if (inOrderedList)  { html += '</ol>';        inOrderedList  = false; }
      if (inBlockquote)   { html += '</blockquote>'; inBlockquote  = false; }
      continue;
    }
    if      (t.startsWith('######')) { html += `<h6>${parseInline(t.slice(6).trim())}</h6>`; }
    else if (t.startsWith('#####'))  { html += `<h5>${parseInline(t.slice(5).trim())}</h5>`; }
    else if (t.startsWith('####'))   { html += `<h4>${parseInline(t.slice(4).trim())}</h4>`; }
    else if (t.startsWith('### '))   { html += `<h3>${parseInline(t.slice(4))}</h3>`; }
    else if (t.startsWith('## '))    { html += `<h2>${parseInline(t.slice(3))}</h2>`; }
    else if (t.startsWith('# '))     { html += `<h1>${parseInline(t.slice(2))}</h1>`; }
    else if (/^(\*{3,}|_{3,})$/.test(t)) { html += '<hr>'; }
    else if (t.startsWith('> ')) {
      if (!inBlockquote) { html += '<blockquote>'; inBlockquote = true; }
      html += `<p>${parseInline(t.slice(2))}</p>`;
    }
    else if (/^ {2,}- /.test(line)) {
      if (!inSubList) { html += '<ul>'; inSubList = true; }
      html += `<li>${parseInline(t.slice(2))}</li>`;
    }
    else if (t.startsWith('- ')) {
      if (inSubList)      { html += '</ul></li>'; inSubList     = false; }
      if (inOrderedList)  { html += '</ol>';       inOrderedList = false; }
      if (!inList)        { html += '<ul>';        inList        = true;  }
      html += `<li>${parseInline(t.slice(2))}`;
      const next = i + 1 < lines.length ? lines[i + 1] : '';
      if (!/^ {2,}- /.test(next)) html += '</li>';
    }
    else if (/^\d+\. /.test(t)) {
      // Ordered list item — e.g. "1. item text"
      if (inList)   { html += '</ul>'; inList = false; }
      if (inSubList) { html += '</ul></li>'; inSubList = false; }
      if (!inOrderedList) { html += '<ol>'; inOrderedList = true; }
      html += `<li>${parseInline(t.replace(/^\d+\. /, ''))}`;
      // Check if next line is a sub-list — if not, close immediately
      const nextOl = i + 1 < lines.length ? lines[i + 1] : '';
      if (!/^ {2,}- /.test(nextOl) && !/^   /.test(nextOl)) html += '</li>';
    }
    else if (/^ {2,}- /.test(line) || /^   - /.test(line)) {
      // Sub-list item inside parent list item (2-5 space indent)
      if (!inSubList) { html += '<ul>'; inSubList = true; }
      html += `<li>${parseInline(t.replace(/^-\s+/, ''))}</li>`;
    }
    else if (t.startsWith('<')) { html += t + '\n'; }
    else {
      if (inBlockquote) { html += '</blockquote>'; inBlockquote = false; }
      if (inSubList)    { html += '</ul></li>';    inSubList    = false; }
      if (inList)       { html += '</ul>';         inList       = false; }
      html += `<p>${parseInline(t)}</p>`;
    }
  }
  if (inSubList)    html += '</ul></li>';
  if (inList)       html += '</ul>';
  if (inOrderedList) html += '</ol>';
  if (inBlockquote) html += '</blockquote>';

  // ── Layout-specific post-processing ──────────────────────────────────────
  // Wraps native markdown elements into the containers CSS needs for layout.
  // This is the only place structural HTML is generated — never in the .md source.

  const cls = classAttr;

  // card-grid: wrap ul/ol into .card-grid-inner, each top-level li becomes a .card.
  // Uses depth tracking to handle nested lists (li > ul/ol for body text).
  // handles 2 cards (1 row), 3 cards (2+1 via CSS :last-child:nth-child(odd)), 4 cards (2×2)
  // card-grid-2plus1 and cards-side both consolidate here
  if (cls.includes('card-grid') || cls.includes('cards-side')) {
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
        const innerClass = listTag === 'ol' ? 'card-grid-inner card-grid-inner--ordered' : 'card-grid-inner';
        html = html.slice(0, listStart) + `<div class="${innerClass}">${cards}</div>` + html.slice(listEnd + closeList.length);
      }
    }
  }

  // comparison: wrap ul/ol, 2 li as cards with → connector between, optional trailing p
  if (cls.includes('comparison') && !cls.includes('code')) {
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
        const cards = items.map(c => `<div class="card">${c}</div>`);
        const inner_html = `<div class="comparison-inner">${cards[0]}<div class="connector">❯</div>${cards[1] || ''}</div>`;
        html = html.slice(0, listStart) + inner_html + html.slice(listEnd + closeList.length);
      }
    }
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

  // verdict-grid: ul > li(strong title + ul(badge items + last body)) → grid-verdict
  if (cls.includes('verdict-grid')) {
    // Greedy match on outer ul so nested uls don't split the match
    html = html.replace(/<ul>([\s\S]*)<\/ul>/, (_, outerInner) => {
      // Nested-list format: each top-level li has <strong>title + inner <ul>
      const nestedRe = /<li>\s*<strong>([\s\S]*?)<\/strong>([\s\S]*?)<\/ul>\s*<\/li>/g;
      const nestedMatches = [...outerInner.matchAll(nestedRe)];
      if (nestedMatches.length > 0) {
        const vcards = nestedMatches.map(m => {
          const title = m[1];
          const nestedItems = [...m[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(n => n[1].trim());
          const badgeItems = nestedItems.slice(0, -1);
          const bodyText = nestedItems[nestedItems.length - 1] ?? '';
          const badges = badgeItems.map(b => {
            const bc = /^\[x\]/.test(b) ? 'badge pass' : /^\[~\]/.test(b) ? 'badge warn' : 'badge fail';
            const label = b.replace(/^\[[x~\s]\]\s*/, '');
            return `<span class="${bc}">${label}</span>`;
          }).join('');
          return `<div class="vcard"><div class="vcard-title">${title}</div><div class="badge-row">${badges}</div><div class="vcard-body">${bodyText}</div></div>`;
        });
        return `<div class="grid-verdict">${vcards.join('')}</div>`;
      }
      // Legacy flat format: li > strong + inline text
      const vcards = [...outerInner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => {
        const titleMatch = m[1].match(/<strong>(.*?)<\/strong>/);
        const title = titleMatch ? titleMatch[1] : '';
        const body = m[1].replace(/<strong>.*?<\/strong>/, '').trim();
        return `<div class="vcard"><div class="vcard-title">${title}</div><div class="vcard-body">${body}</div></div>`;
      });
      return `<div class="grid-verdict">${vcards.join('')}</div>`;
    });
  }

  // featured: blockquote = featured card, ul items = sub-cards
  if (cls.includes('featured')) {
    html = html.replace(/<ul>([\s\S]*?)<\/ul>/g, (_, inner) => {
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
      const subCards = items.map(content => {
        const titleMatch = content.match(/<strong>(.*?)<\/strong>/);
        const title = titleMatch ? titleMatch[1] : '';
        const body = content.replace(/<strong>.*?<\/strong>/, '').trim();
        return `<div class="sub-card"><h3>${title}</h3><p>${body}</p></div>`;
      });
      return `<div class="sub-row">${subCards.join('')}</div>`;
    });
  }

  // split-panel: h2+h5 go in panel-left, everything after in panel-right
  if (cls.includes('split-panel')) {
    const h2Match = html.match(/<h2>([\s\S]*?)<\/h2>/);
    const h5Match = html.match(/<h5>([\s\S]*?)<\/h5>/);
    const h2 = h2Match ? h2Match[0] : '';
    const h5 = h5Match ? h5Match[0] : '';
    const watermarkLetter = h2Match ? h2Match[1].trim()[0] : 'S';
    const rest = html
      .replace(h2Match ? h2Match[0] : '', '')
      .replace(h5Match ? h5Match[0] : '', '')
      .trim();
    html = `<div class="panel-left"><div class="watermark">${watermarkLetter}</div>${h5}${h2}</div><div class="panel-right">${rest}</div>`;
  }

  // cards-wide-3: wrap ol/ul, each li becomes a wide-card; ol gets numbered badge
  if (cls.includes('cards-wide-3')) {
    html = html.replace(/<(ol|ul)>([\s\S]*?)<\/\1>/g, (_, tag, inner) => {
      const isOrdered = tag === 'ol';
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
      let counter = 0;
      const cards = items.map(content => {
        counter++;
        const strongMatch = content.match(/<strong>(.*?)<\/strong>/);
        if (!strongMatch) return `<div class="wide-card"><div class="wide-card-body"><span>${content}</span></div></div>`;
        const heading = strongMatch[1];
        // Support nested <ul><li>body</li></ul> (preferred) or inline text body
        const nestedUl = content.match(/<ul>([\s\S]*?)<\/ul>/);
        let bodyHtml;
        if (nestedUl) {
          const bodyItems = [...nestedUl[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => m[1]);
          bodyHtml = bodyItems.map(b => `<span>${b}</span>`).join('');
        } else {
          bodyHtml = `<span>${content.replace(strongMatch[0], '').trim()}</span>`;
        }
        const badgeHtml = isOrdered
          ? `<span class="wide-card-badge">${counter}</span>`
          : '';
        return `<div class="wide-card"><div class="wide-card-header">${badgeHtml}<span class="wide-card-heading">${heading}</span></div><div class="wide-card-body">${bodyHtml}</div></div>`;
      });
      const orderedClass = isOrdered ? ' ordered' : '';
      return `<div class="three-stack${orderedClass}">${cards.join('')}</div>`;
    });
  }

  // finding: build .finding-top scaffold from ul-based or legacy h4+p authoring
  if (cls.includes('finding') && !cls.includes('cards')) {
    const h3Match = html.match(/(<h3>[\s\S]*?<\/h3>)/);
    const h2Match = html.match(/(<h2>[\s\S]*?<\/h2>)/);
    const h3El = h3Match ? h3Match[1] : '';
    const h2El = h2Match ? h2Match[1] : '';
    if (/<ul>/.test(html) && !/<h4>/.test(html)) {
      // ul-based authoring: li > strong + nested ul > li body, *em* verdict
      const emMatch = html.match(/<p><em>([\s\S]*?)<\/em><\/p>/);
      const bqMatch = html.match(/(<blockquote>[\s\S]*?<\/blockquote>)/);
      const verdictEl = emMatch
        ? `<p class="verdict"><span class="verdict-dot">●</span>${emMatch[1]}</p>`
        : (bqMatch ? bqMatch[1] : '');
      const ulMatch = html.match(/<ul>([\s\S]*)<\/ul>/);
      if (ulMatch) {
        const liChunks = ulMatch[1].split(/(?=<li>)/).filter(s => s.trim());
        const cards = liChunks.map(chunk => {
          const titleMatch = chunk.match(/<strong>([\s\S]*?)<\/strong>/);
          const bodyMatch  = chunk.match(/<ul>[\s\S]*?<li>([\s\S]*?)<\/li>/);
          const title = titleMatch ? `<h4>${titleMatch[1]}</h4>` : '';
          const body  = bodyMatch  ? `<p>${bodyMatch[1]}</p>`    : '';
          return `<div class="card">${title}${body}</div>`;
        }).join('');
        html = `${h3El}${h2El}<div class="finding-top">${cards}</div>${verdictEl}`;
      }
    } else {
      // Legacy h4+p authoring (blockquote = verdict/key-insight)
      const bqMatch = html.match(/(<blockquote>[\s\S]*?<\/blockquote>)/);
      const bqEl = bqMatch ? bqMatch[1] : '';
      let rest = html.replace(h3El, '').replace(h2El, '').replace(bqEl, '');
      const cardParts = rest.split(/(?=<h4>)/).filter(s => s.trim());
      const cards = cardParts.map(part => `<div class="card">${part.trim()}</div>`).join('');
      html = `${h3El}${h2El}<div class="finding-top">${cards}</div>${bqEl}`;
    }
  }

  // code-compare: pair each h3+pre into .code-col divs inside .code-cols
  // Structure: h3(eyebrow) h2(heading) h3(left-label) pre h3(right-label) pre
  // Split AFTER h2, pair remaining h3+pre chunks as columns
  if (cls.includes('code-compare')) {
    const h3EyeMatch = html.match(/^(<h3>[\s\S]*?<\/h3>)/);
    const h2Match    = html.match(/(<h2>[\s\S]*?<\/h2>)/);
    const h3Eye = h3EyeMatch ? h3EyeMatch[1] : '';
    const h2El  = h2Match    ? h2Match[1]    : '';
    // Remove eyebrow h3 and h2, leaving the two col h3+pre pairs
    let rest = html;
    if (h3Eye) rest = rest.replace(h3Eye, '');
    if (h2El)  rest = rest.replace(h2El,  '');
    // Split on h3 to get col pairs, filter empties
    const parts = rest.split(/(?=<h3>)/).filter(s => s.trim());
    const cols = parts.map(p => `<div class="code-col">${p.trim()}</div>`).join('');
    html = `${h3Eye}${h2El}<div class="code-cols">${cols}</div>`;
  }

  // criteria: ol li — wrap strong+ul into .crit-body div
  if (cls.includes('criteria')) {
    html = html.replace(/<li>([\s\S]*?)<\/li>/g, (_, content) => {
      return `<li><div class="crit-body">${content}</div></li>`;
    });
  }

  // timeline: ol li — strong = label, em = description
  // (already handled by CSS selectors, no post-processing needed)

  // steps: ol already renders correctly via CSS counter + strong + p
  // list-tabular: ol li — strong = verb, em = meta
  if (cls.includes('list-tabular')) {
    html = html.replace(/<li>([\s\S]*?)<\/li>/g, (_, content) => {
      // strong = verb, em = meta, plain text = desc
      return `<li>${content}</li>`;
    });
  }

  // ── Universal below-note ─────────────────────────────────────────────────────
  // Any layout where the last element in html is a plain <p> gets it wrapped
  // in .below-note for the full-width hairline treatment.
  // Excludes: title, closing, quote, big-number, subtopic, divider (centred layouts
  // where the trailing p IS the main content, not a footnote).
  const noBeloNote = ['title','closing','quote','big-number','subtopic','divider','full-bleed','image-full','split-panel','content','image-right','image-left','two-column','timeline','diagram','stats','code'];
  const isNoBelowNote = noBeloNote.some(x => cls.includes(x));
  if (!isNoBelowNote) {
    // Only wrap a trailing <p> as below-note if it follows a structural block
    // (div, ul, ol, table, pre) — not if it follows another <p> (that's main content)
    html = html.replace(/((?:<\/div>|<\/ul>|<\/ol>|<\/table>|<\/pre>|<\/blockquote>)\s*)<p>([^]*?)<\/p>\s*$/, '$1<div class="below-note"><p>$2</p></div>');
  }

  // ── Assemble section — matching Marp v4 HTML output ───────────────────────
  // Marp produces:
  //   <section id="N" class="..." data-marpit-slide="N" style="--marp-slide:N;">
  //     <header><p>text</p></header>   ← only when header is set
  //     [content]
  //     <footer><p>text</p></footer>   ← only when footer is set
  //     <span class="marp-slide-pagination">N</span>  ← when paginate:true
  //   </section>

  const slideNum   = index + 1;
  const styleAttr  = bgColor
    ? ` style="--marp-slide:${slideNum};background-color:${bgColor};"`
    : ` style="--marp-slide:${slideNum};"`;

  const headerEl   = header  ? `<header><div style="display:block;width:100%;text-align:left">${header}</div></header>` : '';
  const footerEl   = footer  ? `<footer><div style="display:block;width:100%;text-align:left">${footer}</div></footer>` : '';
  const paginEl    = paginate ? `<span class="marp-slide-pagination">${slideNum}</span>` : '';

  return [
    `<section id="${slideNum}" class="${classAttr}"`,
    ` data-marpit-slide="${slideNum}"${styleAttr}>`,
    headerEl,
    bgImageHtml,
    html,
    footerEl,
    paginEl,
    `</section>`
  ].join('');
}

const slides = rawSlides.map((s, i) => parseSlide(s, i));

// ── Marp-equivalent CSS for pagination and header/footer ────────────────────
// Marp injects these styles itself; we reproduce them here since we're
// not running through marp-core.
const marpSystemCss = `
/* Marp system styles — pagination only.
   Header/footer positioning is defined in lattice.css so both the CLI
   and the Marp VS Code preview use identical coordinates. */

section { position: relative; }

.marp-slide-pagination {
  position: absolute;
  bottom: 24px;
  right:  30px;
  color:        var(--marp-slide-pagination-color, var(--text-muted, #A69882));
  font-size:    var(--marp-slide-pagination-font-size, var(--fs-label, 13px));
  font-family:  var(--font-mono, monospace);
  font-weight:  500;
  letter-spacing: 0.06em;
  z-index: 20;
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
</style></head><body>
${highlightedSlides.join('\n')}
</body></html>`;

const outHtml = outFile.replace(/\.pdf$/, '.html');
fs.writeFileSync(outHtml, htmlDoc);
console.log(`HTML: ${slides.length} slides → ${outHtml}`);

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
  await page.pdf({
    path: outFile,
    width: '1280px', height: '720px',
    printBackground: true,
    preferCSSPageSize: true
  });
  await browser.close();
  console.log(`PDF: ${outFile}`);
})();
