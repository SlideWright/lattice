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
 *   setEngine('marp'|'lattice') switch the active render engine
 *   engine                      the active engine name (getter)
 *
 * TWO engines, one bundle. The default is marp-core (path #2 fidelity, zero
 * change for visitors). The owned lattice-engine (`lib/engine/`) is opt-in: the
 * page flips to it via `?engine=lattice`, so the Drawing Board doubles as an
 * A/B harness — same deck, same palettes, swap the param to compare the
 * Marp-replacement engine against marp-core live. Themes register on BOTH, so
 * switching needs no re-fetch. This is P3 of the Marp-replacement plan
 * (engineering/decisions/2026-06-10-marp-replacement-proposal.md), landed in a
 * reversible, non-default form first.
 */

import { Marp } from '@marp-team/marp-core';
import latticeEngine from '../engine/index.js';
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
const engine = latticeEngine.createEngine();

// Active render engine. Default 'marp' so visitors and every existing gate are
// unchanged; the page opts into 'lattice' via ?engine=lattice.
let active = 'marp';
function setEngine(name) {
  active = name === 'lattice' ? 'lattice' : 'marp';
  return active;
}

function addThemes(cssTextList) {
  // Register on BOTH engines so flipping `active` never needs a re-fetch.
  for (const css of cssTextList) {
    try {
      marp.themeSet.add(css);
    } catch (_e) {
      /* duplicate or unparseable theme — ignore */
    }
  }
  engine.addThemes(cssTextList);
}

function hasTheme(name) {
  return active === 'lattice' ? engine.hasTheme(name) : Boolean(marp.themeSet.get(name));
}

function render(markdown, theme) {
  const src = theme ? `<!-- theme: ${theme} -->\n${markdown}` : markdown;
  if (active === 'lattice') {
    // The owned engine produces the HTML (its novel, owned pipeline). CSS
    // theme-packing is DELEGATED to marp-core's packer for now: the engine's own
    // P1.1 emitter (lib/engine/css.js) diverged subtly enough from Marpit's pack
    // to break mobile Safari/WebKit (collapsed cqi spacing + dropped CSS
    // counters) — a class of bug invisible to the headless-Chromium gates and
    // not reproducible on desktop WebKit either. Pairing the owned HTML with
    // marp's exact, mobile-correct stylesheet guarantees identical styling to the
    // default path while we keep the HTML ownership. The engine's HTML mirrors
    // marp's section structure (the differential test asserts class parity), so
    // marp's `div.marpit > section.x` selectors match. Reimplementing the CSS
    // packer to drop this marp dependency is tracked as P5 in the proposal.
    return { html: engine.render(markdown, theme).html, css: marp.render(src).css };
  }
  // A global `theme` directive forces the palette without editing the source
  // the author typed. Marpit consumes the directive comment, so it never
  // becomes a visible slide.
  return marp.render(src);
}

const api = {
  addThemes,
  hasTheme,
  render,
  setEngine,
  get engine() {
    return active;
  },
};
// Persisted engine choice. The key is shared with the Drawing Board's
// `renderEngine` workspace pref (docs/src/playground/drawing-board-prefs.js) so
// the settings toggle and this boot read/write one place. A `?engine=` query
// param wins over the stored pref (an explicit per-visit override).
const ENGINE_PREF_KEY = 'lattice-db-render-engine';

if (typeof window !== 'undefined') {
  window.LatticePlayground = api;
  // Select the engine on load so the Drawing Board / playground / specimens all
  // render through it with no per-surface wiring: URL param first, else the
  // stored workspace pref, else the marp-core default.
  try {
    const param = new URLSearchParams(window.location.search).get('engine');
    let stored = null;
    try {
      stored = window.localStorage.getItem(ENGINE_PREF_KEY);
    } catch (_e) {
      /* private mode / blocked storage — fall through to the default */
    }
    if (param) setEngine(param);
    else if (stored) setEngine(stored);
  } catch (_e) {
    /* no location (SSR / worker) — stay on the default */
  }
}
export default api;
