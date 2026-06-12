/**
 * lattice-engine — owned markdown→slide engine (Marp replacement, P1).
 *
 * Status: EXPERIMENTAL. This is the P1 core from
 * engineering/decisions/2026-06-10-marp-replacement-proposal.md. It renders
 * Lattice markdown to the same `<section>` HTML contract marp-core produces, by
 * running the Lattice markdown-it plugins (lib/integrations/marp/plugins.js) and
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
 * core at P3: render(markdown, theme) → { html, css }; addThemes; hasTheme.
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

const {
  addHeadingPeriods,
  applyDeckLogoToHtml,
  applyIslandsToggleToHtml,
  applyMastheadMetaToHtml,
  applyProgressRailToHtml,
  applyWatermarkToHtml,
  checklistItemStates,
  deckClassPropagate,
  glossaryListToTable,
  glossaryRange,
  latticeplotFences,
  obligationMatrixBadges,
  registerMermaidHljs,
  slotLabelLift,
  stripHeadingPeriods,
  verdictGridBadges,
} = require('../integrations/marp/plugins');
const { applyAllToHtml } = require('../transformers/registry');

// The Lattice markdown-it plugins, in the exact order marp.config.js and the
// playground apply them. They bind to the slide-pipeline token contract.
const LATTICE_PLUGINS = [
  deckClassPropagate,
  verdictGridBadges,
  obligationMatrixBadges,
  checklistItemStates,
  slotLabelLift,
  glossaryListToTable,
  glossaryRange,
  stripHeadingPeriods,
  addHeadingPeriods,
  latticeplotFences,
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
    // Islands toggle runs FIRST so the registry's masthead-lift + the island
    // injectors below all see the resolved `islands` class.
    html = applyIslandsToggleToHtml(html, source);
    html = applyAllToHtml(html);
    // deck-logo keys off `data-marpit-slide`, which lib/engine omits — so this
    // no-ops here and the emulator re-runs it after stamping the attribute. The
    // island injectors below match on section class, not the slide attribute,
    // so they resolve correctly at this stage.
    html = applyDeckLogoToHtml(html, source);
    html = applyMastheadMetaToHtml(html, source);
    html = applyProgressRailToHtml(html);
    html = applyWatermarkToHtml(html);
    return html;
  }

  /**
   * render(markdown, theme) → { html, css }. `theme` (a registered palette
   * name) overrides the deck's own `theme:` directive, matching the playground.
   */
  function render(markdown, theme) {
    const { directives, body } = parseFrontMatter(markdown);
    const globalBase = { ...directives };
    if (theme) globalBase.theme = theme;
    const html = renderHtml(body, globalBase, markdown);
    const css = themes.cssFor(
      globalBase.theme || directives.theme || 'lattice',
      globalBase.size || directives.size,
    );
    return { html, css };
  }

  function addThemes(cssTextList) {
    for (const css of cssTextList) themes.add(css);
  }

  function hasTheme(name) {
    return themes.has(name);
  }

  return { render, addThemes, hasTheme, themes };
}

// Default singleton — mirrors the playground's module-level instance + the
// window global, so a browser bundle can expose the same API surface.
const engine = createEngine();
const api = {
  createEngine,
  render: engine.render,
  addThemes: engine.addThemes,
  hasTheme: engine.hasTheme,
};
if (typeof window !== 'undefined') window.LatticeEngine = api;

module.exports = api;
module.exports.createEngine = createEngine;
