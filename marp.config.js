/**
 * marp-cli configuration — the build-path render config.
 *
 * The markdown-it / Marpit engine plugins (deck-class propagation, the `logo:`
 * directive, verdict-grid / obligation-matrix / checklist state markers,
 * slot-label lift, glossary table + range, heading-period adjustment,
 * latticeplot fences, Mermaid hljs registration) now live
 * in lib/integrations/marp/plugins.js so the browser playground bundle can run
 * the SAME engine for render parity. This file wires them into marp-cli and
 * adds the HTML-stage transformer registry + deck-logo injection.
 */

const path = require('node:path');
const {
  deckClassPropagate,
  applyDeckLogoToHtml,
  readDeckLogoFrontMatter,
  applyMastheadMetaToHtml,
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
  latticeplotFences,
} = require('./lib/integrations/marp/plugins');
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
    marp.use(deckClassPropagate)
        .use(verdictGridBadges)
        .use(obligationMatrixBadges)
        .use(checklistItemStates)
        .use(slotLabelLift)
        .use(glossaryListToTable)
        .use(glossaryRange)
        .use(stripHeadingPeriods)
        .use(addHeadingPeriods)
        .use(latticeplotFences);

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
        // meta island — fills the masthead bay the registry just built with
        // the front-matter `meta:` directive. Runs last so the bay exists.
        result.html = applyMastheadMetaToHtml(result.html, markdown);
      }
      return result;
    };

    return marp;
  },
};

// Plugin functions exposed for unit tests. Marp-cli reads only the
// known config keys above and ignores the rest, so attaching this is
// safe; consumers should treat it as test-internal API. Re-exported from
// the shared module (lib/integrations/marp/plugins.js) — single source.
module.exports.plugins = {
  deckClassPropagate,
  applyDeckLogoToHtml,
  readDeckLogoFrontMatter,
  applyMastheadMetaToHtml,
  stateClassesFor,
  verdictGridBadges,
  obligationMatrixBadges,
  checklistItemStates,
  slotLabelLift,
  latticeplotFences,
  glossaryListToTable,
  glossaryRange,
  stripHeadingPeriods,
  addHeadingPeriods,
};
