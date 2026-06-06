/**
 * Lattice playground engine — browser entry (bundled to
 * docs/public/playground/lattice-playground.js by tools/build-playground.js).
 *
 * This runs the marp-cli render path (path #2) CLIENT-SIDE so the docs-site
 * playground renders Lattice markdown with full fidelity. It composes the SAME
 * pieces marp.config.js wires for the build:
 *
 *   marp-core  +  lib/integrations/marp/plugins.js  +  lib/transformers/registry
 *
 * Because both the build config and this entry import the plugins + registry
 * from one place, the playground can't drift from the PDF output (the parity
 * test asserts slide-count + key structure agreement on a sample deck).
 *
 * Theme CSS (dist/lattice.css + themes/<name>.css) is NOT bundled — the page
 * fetches it from /playground/themes/ and registers it via addThemes(), so the
 * bundle stays engine-only and palettes load lazily.
 *
 * Public API (attached to window.LatticePlayground):
 *   addThemes(cssTextList)      register one or more @theme stylesheets
 *   hasTheme(name)              has a theme been registered?
 *   render(markdown, theme)     → { html, css } for the chosen theme name
 */

import { Marp } from '@marp-team/marp-core';
import {
  addHeadingPeriods,
  applyDeckLogoToHtml,
  checklistItemStates,
  deckClassPropagate,
  glossaryListToTable,
  glossaryRange,
  latticeplotFences,
  obligationMatrixBadges,
  registerMermaidHljs,
  slotLabelLift,
  splitPanelCounter,
  stripHeadingPeriods,
  verdictGridBadges,
} from '../integrations/marp/plugins.js';
import { applyAllToHtml } from '../transformers/registry.js';

function makeMarp() {
  // inlineSVG:false renders each slide as a plain <section> (inside
  // <div class="marpit">) instead of Marp's default <svg><foreignObject>
  // wrapper. The page scales those sections to fit with a CSS transform.
  //
  // WHY the playground diverges from the PDF path here: mobile Safari/WebKit
  // cannot lay out HTML inside a *scaled* <foreignObject>, so container
  // queries (container-type / cqi / cqh), CSS counters, and CSS `mask` all
  // degrade there — counters render "00", chart labels balloon and overlap,
  // SVG state marks drop. Every Lattice regression gate renders via headless
  // Chromium (which handles foreignObject natively), so the failure class was
  // invisible. Dropping the SVG wrapper removes it entirely; the PDF/emulator
  // path keeps inlineSVG (fixed-page rendering needs it) and is unaffected
  // (it renders server-side via Chromium anyway). See engineering/gotchas.md
  // "Playground renders broken in mobile Safari/WebKit".
  const marp = new Marp({ html: true, math: 'katex', minifyCSS: false, script: false, inlineSVG: false });
  registerMermaidHljs(marp);
  marp
    .use(deckClassPropagate)
    .use(splitPanelCounter)
    .use(verdictGridBadges)
    .use(obligationMatrixBadges)
    .use(checklistItemStates)
    .use(slotLabelLift)
    .use(glossaryListToTable)
    .use(glossaryRange)
    .use(stripHeadingPeriods)
    .use(addHeadingPeriods)
    .use(latticeplotFences);

  // Same render wrapper as marp.config.js: registry HTML transforms (chart-
  // family, split-panels, roadmap, journey, word-cloud) then deck-logo.
  const originalRender = marp.render.bind(marp);
  marp.render = (markdown, env) => {
    const result = originalRender(markdown, env);
    if (result && typeof result.html === 'string') {
      result.html = applyAllToHtml(result.html);
      result.html = applyDeckLogoToHtml(result.html, markdown);
    }
    return result;
  };
  return marp;
}

const marp = makeMarp();

function addThemes(cssTextList) {
  for (const css of cssTextList) {
    try {
      marp.themeSet.add(css);
    } catch (_e) {
      /* duplicate or unparseable theme — ignore */
    }
  }
}

function hasTheme(name) {
  return Boolean(marp.themeSet.get(name));
}

function render(markdown, theme) {
  // A global `theme` directive forces the palette without editing the source
  // the author typed. Marpit consumes the directive comment, so it never
  // becomes a visible slide.
  const src = theme ? `<!-- theme: ${theme} -->\n${markdown}` : markdown;
  return marp.render(src);
}

const api = { addThemes, hasTheme, render };
if (typeof window !== 'undefined') window.LatticePlayground = api;
export default api;
