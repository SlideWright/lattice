/**
 * marp-cli configuration — the build-path render config.
 *
 * The markdown-it / Marpit engine plugins (deck-class propagation, the `logo:`
 * directive, verdict-grid / obligation-matrix / checklist state markers,
 * slot-label lift, glossary table + range, heading-period adjustment,
 * functionplot fences, Mermaid hljs registration) now live
 * in lib/integrations/markdown-it/plugins.js so the browser playground bundle can run
 * the SAME engine for render parity. This file wires them into marp-cli and
 * adds the HTML-stage transformer registry + deck-logo injection.
 */

const path = require('node:path');
const {
  headingSplit,
  deckClassPropagate,
  applyDeckLogoToHtml,
  readDeckLogoFrontMatter,
  FORM_MODES,
  readFormMode,
  formToggleClass,
  applyFormToggleToHtml,
  stateClassesFor,
  verdictGridBadges,
  obligationMatrixBadges,
  checklistItemStates,
  slotLabelLift,
  stripHeadingPeriods,
  addHeadingPeriods,
  glossaryListToTable,
  glossaryRange,
  registerMermaidHljs,
  functionPlotFences,
} = require('./lib/integrations/markdown-it/plugins');
const watermarkTile = require('./lib/forms/tile/watermark/watermark.transform');
const metaTile = require('./lib/forms/tile/meta/meta.transform');
const progressTile = require('./lib/forms/tile/progress/progress.transform');
const { applyAllToHtml: applyTransformerRegistryToHtml } = require('./lib/transformers/registry');

/** @type {import('@marp-team/marp-cli').MarpCLIConfig} */
module.exports = {
  // Anchored to __dirname so theme resolution works regardless of the
  // caller's cwd — e.g. when this config is consumed from node_modules.
  // The emulator anchors the same way (lattice-emulator.js).
  themeSet: [
    "dist/lattice.css",
    "themes/ardesia.css",
    "themes/ardesia-dark.css",
    "themes/atelier.css",
    "themes/atelier-dark.css",
    "themes/brina.css",
    "themes/brina-dark.css",
    "themes/burgundy.css",
    "themes/burgundy-dark.css",
    "themes/carbone.css",
    "themes/carta.css",
    "themes/carta-dark.css",
    "themes/concrete.css",
    "themes/concrete-dark.css",
    "themes/crepuscolo.css",
    "themes/crepuscolo-dark.css",
    "themes/cuoio.css",
    "themes/cuoio-dark.css",
    "themes/indaco.css",
    "themes/indaco-dark.css",
    "themes/laguna.css",
    "themes/laguna-dark.css",
    "themes/magnolia.css",
    "themes/magnolia-dark.css",
    "themes/mustard.css",
    "themes/mustard-dark.css",
    "themes/onyx.css",
    "themes/onyx-dark.css",
  ].map((p) => path.join(__dirname, p)),
  html: true,
  allowLocalFiles: true,
  imageScale: 1,
  // Math support — KaTeX is the Marp default; we set it explicitly so the
  // contract is visible in config. KaTeX renders synchronously to HTML+CSS,
  // which is critical under the headless-Chromium PDF path (MathJax's async
  // reflow has caused PDF race conditions in the past). The emulator path
  // (lattice-emulator.js) calls katex.renderToString() at slide-parse time
  // and injects the same katex.min.css into the HTML head — see the math
  // extractor near the top of that file for the parity contract.
  math: 'katex',
  engine: ({ marp }) => {
    registerMermaidHljs(marp);
    marp.use(headingSplit)
        .use(deckClassPropagate)
        .use(verdictGridBadges)
        .use(obligationMatrixBadges)
        .use(checklistItemStates)
        .use(slotLabelLift)
        .use(glossaryListToTable)
        .use(glossaryRange)
        .use(stripHeadingPeriods)
        .use(addHeadingPeriods)
        .use(functionPlotFences);

    // Wrap render() so chart-family slides are rewritten into the
    // chart-frame skeleton in the rendered HTML — same DOM the export
    // pipeline produces. Marp Core / Marpit's render returns
    // { html, css, comments } (or similar). VS Code's marp-vscode
    // extension calls render() through the same engine, so the preview
    // and the export now go through one transform.
    const originalRender = marp.render.bind(marp);
    marp.render = (markdown, env) => {
      const result = originalRender(markdown, env);
      if (result && typeof result.html === 'string') {
        // Deck-wide `form:` toggle — resolve it to the `form` class on
        // every eligible section FIRST, so the registry's masthead-lift and
        // the Tile injectors below all see it.
        result.html = applyFormToggleToHtml(result.html, markdown);
        // Shared transformer registry — dispatches chart-family,
        // split-panels, roadmap, journey, word-cloud (in that order).
        // See lib/transformers/registry.js for the order rationale and
        // the per-transformer adapter contracts.
        result.html = applyTransformerRegistryToHtml(result.html);
        // deck-logo stays separate — it operates on the rendered shell
        // (front-matter-driven <img> injection across selected sections),
        // not on per-section content. The shape doesn't fit the
        // registry's per-section primitive.
        result.html = applyDeckLogoToHtml(result.html, markdown);
        // meta · progress · watermark Tiles — each a self-contained kernel
        // (lib/forms/tile/<id>) with one source for all three render paths.
        // meta fills the masthead bay the registry just built with the
        // front-matter `meta:`; progress + watermark are deck-level (they need
        // every section), so they run here on the full shell, not per-section.
        result.html = metaTile.applyToHtml(result.html, markdown);
        result.html = progressTile.applyToHtml(result.html);
        result.html = watermarkTile.applyToHtml(result.html);
      }
      return result;
    };

    return marp;
  },
};

// Plugin functions exposed for unit tests. Marp-cli reads only the
// known config keys above and ignores the rest, so attaching this is
// safe; consumers should treat it as test-internal API. Re-exported from
// the shared module (lib/integrations/markdown-it/plugins.js) — single source.
module.exports.plugins = {
  headingSplit,
  deckClassPropagate,
  applyDeckLogoToHtml,
  readDeckLogoFrontMatter,
  FORM_MODES,
  readFormMode,
  formToggleClass,
  applyFormToggleToHtml,
  stateClassesFor,
  verdictGridBadges,
  obligationMatrixBadges,
  checklistItemStates,
  slotLabelLift,
  functionPlotFences,
  glossaryListToTable,
  glossaryRange,
  stripHeadingPeriods,
  addHeadingPeriods,
};
