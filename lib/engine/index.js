/**
 * lattice-engine — owned markdown→slide engine (Marp replacement, P1).
 *
 * Status: EXPERIMENTAL. This is the P1 core from
 * engineering/decisions/2026-06-10-marp-replacement-proposal.md. It renders
 * Lattice markdown to the same `<section>` HTML contract marp-core produces, by
 * running the Lattice markdown-it plugins (lib/integrations/markdown-it/plugins.js) and
 * the shared transformer registry (lib/transformers/) UNCHANGED on a plain
 * markdown-it instance whose core rulers reproduce Marpit's slide/directive
 * token contract (lib/engine/slides.js).
 *
 * It does NOT yet replace any shipping path. marp.config.js (marp-cli),
 * lib/playground/index.js (browser), and lattice-emulator.js are untouched.
 * The migration is sequenced in the proposal (P2 emulator, P3 playground,
 * P4 retire marp-cli). This module is reachable only via the `@slidewright/
 * lattice/engine` export and the differential test harness.
 *
 * Parity scope today: the HTML pipeline — slide splitting, the in-use directive
 * set, `class`/pagination/background-color attribute application, GFM body via
 * markdown-it 14 (the version marp-core pins), `![bg]` backgrounds (basic mode),
 * header/footer DOM, and the full plugin + registry composition. NOT yet at
 * parity: the emitted scaffold/theme CSS (the `css` field is a minimal stub),
 * and Marpit advanced-background split containers for `![bg left|right]` (the
 * inline-SVG PDF path). Those are P1.1.
 *
 * Façade matches lib/playground/index.js so it can drop in as the playground's
 * core at P3: render(markdown, theme) → { html, css, width, height }; geometry;
 * addThemes; hasTheme.
 */



const MarkdownIt = require('markdown-it');
// Pinned to ^11.11.1 to match the highlight.js marp-core bundles, so fenced-code
// (and ```mermaid source) token spans are byte-identical to the marp path —
// without it the engine emitted plain, uncoloured code (the 2026-06 parity sweep
// caught `code` / `compare-code` rendering monochrome against marp's hljs spans).
const hljs = require('highlight.js');
const { installSlidePipeline } = require('./slides');
const { installBackgroundImage } = require('./background-image');
const { installMath } = require('./math');
const { ThemeStore } = require('./themes');
const { parseFrontMatter } = require('./directives');
const watermarkTile = require('../forms/tile/watermark/watermark.transform');
const metaTile = require('../forms/tile/meta/meta.transform');
const progressTile = require('../forms/tile/progress/progress.transform');

const {
  addHeadingPeriods,
  applyDeckLogoToHtml,
  headingSplit,
  applyFormToggleToHtml,
  checklistItemStates,
  deckClassPropagate,
  glossaryListToTable,
  glossaryRange,
  functionPlotFences,
  obligationMatrixBadges,
  registerMermaidHljs,
  slotLabelLift,
  stripHeadingPeriods,
  verdictGridBadges,
} = require('../integrations/markdown-it/plugins');
const { applyAllToHtml } = require('../transformers/registry');

// The Lattice markdown-it plugins, in the exact order marp.config.js and the
// playground apply them. They bind to the slide-pipeline token contract.
const LATTICE_PLUGINS = [
  // `split: headings` divider — injects `hr` tokens before the slide-split
  // ruler, so it must compose first (it registers `.before('marpit_slide')`,
  // which installSlidePipeline has already created by the time this runs).
  headingSplit,
  deckClassPropagate,
  verdictGridBadges,
  obligationMatrixBadges,
  checklistItemStates,
  slotLabelLift,
  glossaryListToTable,
  glossaryRange,
  stripHeadingPeriods,
  addHeadingPeriods,
  functionPlotFences,
];

/**
 * Build a fresh engine. Each engine owns its markdown-it instance and a
 * ThemeStore. `globalBase` is reserved for front-matter directives, which
 * render() supplies per call (see below) — the instance is rebuilt per render
 * so front-matter globals seed the pipeline correctly, matching marp-core's
 * per-render directive resolution.
 */
function createEngine(opts = {}) {
  const themes = new ThemeStore();

  function buildMd(globalBase) {
    // 'commonmark' preset to match Marpit (lib/marpit.js: new MarkdownIt(
    // 'commonmark')). The default preset leaves empty edge text tokens around
    // emphasis that the commonmark preset's inline post-processing removes —
    // the plugins' `children[0].type === 'strong_open'` guards depend on the
    // clean shape. Then re-enable the GFM surface marp-core uses.
    // The `highlight` option drives markdown-it's default fence renderer; the
    // shared highlight.js singleton ships with the common languages registered
    // (an `hljs.newInstance()` would start EMPTY — getLanguage → undefined → no
    // spans). This top-level highlight.js is lattice-exclusive (marp-core bundles
    // its own copy), so it is safe for registerMermaidHljs to teach it the
    // Mermaid grammar via `md.highlightjs`, matching marp's ```mermaid colouring.
    const md = new MarkdownIt('commonmark', {
      html: true,
      // marp-core sets `breaks: true` — soft line breaks render as <br>. The
      // commonmark preset defaults it off, which dropped the <br> on multi-line
      // blockquotes/paragraphs (the parity sweep caught a math `stats` slide
      // whose CI/p-value lines collapsed onto one line vs marp's two).
      breaks: true,
      highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
          } catch {
            /* unhighlightable — fall back to markdown-it's default escaping */
          }
        }
        return '';
      },
    });
    md.highlightjs = hljs;
    md.enable(['table', 'strikethrough']);
    installSlidePipeline(md, globalBase, { isThemeKnown: (name) => themes.has(name) });
    installBackgroundImage(md);
    if (opts.math !== false) installMath(md, { output: opts.mathOutput });
    registerMermaidHljs(md);
    for (const plugin of LATTICE_PLUGINS) md.use(plugin);
    return md;
  }

  function renderHtml(body, globalBase, source) {
    const md = buildMd(globalBase);
    // env.markdown carries the ORIGINAL source (front matter included) so the
    // front-matter readers — deckClassPropagate, applyDeckLogoToHtml — see it
    // even though the body we parse has the front matter stripped. Matches the
    // env marp-cli/marpit populate.
    let html = md.render(body, { markdown: source });
    // HTML-stage transforms — identical order to marp.config.js's render hook.
    // Form toggle runs FIRST so the registry's masthead-lift + the Tile
    // injectors below all see the resolved `form` class.
    html = applyFormToggleToHtml(html, source);
    html = applyAllToHtml(html);
    // deck-logo keys off `data-lattice-slide`, which lib/engine omits — so this
    // no-ops here and the emulator re-runs it after stamping the attribute. The
    // Form Tile injectors below match on section class, not the slide attribute,
    // so they resolve correctly at this stage.
    html = applyDeckLogoToHtml(html, source);
    html = metaTile.applyToHtml(html, source);
    html = progressTile.applyToHtml(html);
    html = watermarkTile.applyToHtml(html);
    return html;
  }

  /**
   * render(markdown, theme) → { html, css, width, height }. `theme` (a
   * registered palette name) overrides the deck's own `theme:` directive,
   * matching the playground. `width`/`height` are the resolved `@size` geometry
   * in px (numbers): the browser hosts fit-scale and export against them, so a
   * `size: 4K` deck is scaled by its true 3840-wide box, not a hardcoded 1280
   * (the bug where 4K previews rendered 3× oversized + exported a cropped page).
   */
  function render(markdown, theme) {
    const { directives, body } = parseFrontMatter(markdown);
    const globalBase = { ...directives };
    if (theme) globalBase.theme = theme;
    const html = renderHtml(body, globalBase, markdown);
    const themeName = globalBase.theme || directives.theme || 'lattice';
    const sizeName = globalBase.size || directives.size;
    const css = themes.cssFor(themeName, sizeName);
    const { width, height } = themes.geometryFor(themeName, sizeName);
    return { html, css, width, height };
  }

  /**
   * geometry(markdown, theme) → { width, height } in px. The slide box without a
   * full render — for the marp-core escape-hatch path (and any host that has the
   * markdown but renders through the other engine), so it can fit-scale against
   * the same `@size` the owned engine resolves.
   */
  function geometry(markdown, theme) {
    const { directives } = parseFrontMatter(markdown);
    return themes.geometryFor(theme || directives.theme || 'lattice', directives.size);
  }

  function addThemes(cssTextList) {
    for (const css of cssTextList) themes.add(css);
  }

  function hasTheme(name) {
    return themes.has(name);
  }

  return { render, geometry, addThemes, hasTheme, themes };
}

// Default singleton — mirrors the playground's module-level instance + the
// window global, so a browser bundle can expose the same API surface.
const engine = createEngine();
const api = {
  createEngine,
  render: engine.render,
  geometry: engine.geometry,
  addThemes: engine.addThemes,
  hasTheme: engine.hasTheme,
};
if (typeof window !== 'undefined') window.LatticeEngine = api;

module.exports = api;
module.exports.createEngine = createEngine;
