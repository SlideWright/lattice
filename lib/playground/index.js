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
 *   render(markdown, theme)     → { html, css, width, height } for the theme
 *                                 (width/height = resolved `@size` box, px)
 *   setEngine('marp'|'lattice') switch the active render engine
 *   engine                      the active engine name (getter)
 *
 * TWO engines, one bundle. The default is now the owned `lattice-engine`
 * (`lib/engine/`) — HTML + the owned CSS emitter — after it reached full pixel
 * parity with marp-core across the gallery corpus + the 89pp baseline. marp-core
 * stays bundled as the `?engine=marp` (and `?css=marp`) escape hatch and the live
 * A/B oracle; themes register on BOTH, so switching needs no re-fetch. This is P3
 * of the Marp-replacement plan
 * (engineering/decisions/2026-06-10-marp-replacement-proposal.md).
 *
 * GATE: the owned CSS emitter's one un-automatable check is mobile WebKit (iOS
 * Safari) — the original shelving bug (collapsed cqi / dropped counters) was
 * invisible to every headless-Chromium gate. Do NOT ship this flip until that
 * on-device pass is confirmed; revert by flipping `active`/`ownCss` back.
 */

import { Marp } from '@marp-team/marp-core';
import { bakeSplits } from '../core/bake-splits.js';
// The Export-to-Marp bundle spec — the SAME pure module the CLI uses, so the
// in-browser export (docs/src/playground/drawing-board-export.js) produces a
// byte-identical bundle to `npm run export:marp`.
import * as marpBundle from '../core/marp-bundle.js';
import latticeEngine from '../engine/index.js';
import {
  addHeadingPeriods,
  applyDeckLogoToHtml,
  checklistItemStates,
  deckClassPropagate,
  functionPlotFences,
  glossaryListToTable,
  glossaryRange,
  headingSplit,
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
    .use(headingSplit)
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

// Active render engine. Default 'lattice' — the owned engine is the render path
// now (full HTML + CSS pixel parity with marp-core across the gallery corpus +
// the 89pp baseline). `?engine=marp` opts back to marp-core, kept for the A/B and
// as an escape hatch while marp-core is still bundled.
let active = 'lattice';
function setEngine(name) {
  active = name === 'marp' ? 'marp' : 'lattice';
  return active;
}

// CSS source for the owned engine. Default true → the owned emitter (lib/engine/
// css.js), which mirrors Marpit's pack faithfully and is ~7× cheaper. `?css=marp`
// opts back to marp-core's packer (the old delegated path). Only meaningful when
// active === 'lattice'.
let ownCss = true;
function setCssSource(name) {
  ownCss = name !== 'marp' && name !== 'delegate' && name !== 'marp-core';
  return ownCss;
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

// Force the playground's selected palette onto the deck WITHOUT breaking YAML
// front matter. A leading `<!-- theme -->` comment pushes a `---` front-matter
// fence off line 0, so Marpit stops parsing it as front matter — it emits a
// spurious empty leading slide and paints the directives as body text (the
// 2026-06 engine-parity sweep caught this across every front-matter gallery on
// the marp path; the owned engine, which gets the raw markdown, was unaffected).
// When the deck HAS front matter, set `theme:` INSIDE it (overriding any
// declared theme); otherwise a leading directive comment is safe.
function withTheme(markdown, theme) {
  if (!theme) return markdown;
  const fm = markdown.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (fm) {
    const inner = fm[1].replace(/^[ \t]*theme:.*$/im, '').replace(/\n{2,}/g, '\n').replace(/^\n|\n$/g, '');
    return `---\n${inner ? `${inner}\n` : ''}theme: ${theme}\n---\n${markdown.slice(fm[0].length)}`;
  }
  return `<!-- theme: ${theme} -->\n${markdown}`;
}

function render(markdown, theme) {
  const src = withTheme(markdown, theme);
  if (active === 'lattice') {
    // The owned engine produces the HTML (its novel, owned pipeline). CSS
    // theme-packing is DELEGATED to marp-core's packer by default: the engine's
    // own emitter (lib/engine/css.js) once diverged from Marpit's pack and broke
    // mobile Safari/WebKit (collapsed cqi spacing + dropped CSS counters) — a bug
    // invisible to the headless-Chromium gates and to desktop WebKit. The emitter
    // now mirrors Marpit's pack pipeline faithfully (root-replace + specificity
    // guard, slide-scoping prepend, pagination content masking) and is gated by a
    // rule-level CSS-pack parity test vs marp-core, but the final mobile-WebKit
    // confirmation is a real-device check. So the owned emitter is OPT-IN
    // (`?css=engine`) until that check passes; plain `?engine=lattice` stays on
    // marp's mobile-correct stylesheet. Flipping the default + dropping the marp
    // CSS dependency is the tail of P5 in the proposal.
    const out = engine.render(markdown, theme);
    // width/height (the resolved `@size` box in px) ride along so the browser
    // hosts fit-scale + export against the real slide dimensions — a `size: 4K`
    // deck is a 3840-wide box, not the hardcoded 1280 they used to assume.
    return { html: out.html, css: ownCss ? out.css : marp.render(src).css, width: out.width, height: out.height };
  }
  // withTheme() forces the palette as a `theme` directive (inside front matter
  // if present, else a leading comment) without ever displacing a `---` fence, so
  // Marpit consumes it and it never becomes a visible slide. marp-core doesn't
  // surface the resolved @size, so the geometry comes from the owned engine's
  // store (themes are registered on both, so it knows every `@size`).
  const out = marp.render(src);
  const geo = engine.geometry(markdown, theme);
  return { html: out.html, css: out.css, width: geo.width, height: geo.height };
}

const api = {
  addThemes,
  hasTheme,
  render,
  setEngine,
  setCssSource,
  get engine() {
    return active;
  },
  get cssSource() {
    return ownCss ? 'engine' : 'marp';
  },
  // Export-to-Marp building blocks for the Drawing Board's in-browser export:
  // the split baker + the shared bundle spec (templates + static-asset manifest).
  marp: { bakeSplits, ...marpBundle },
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
  // stored workspace pref, else the owned-engine default. `?engine=marp` /
  // `?css=marp` are the escape hatches back to marp-core.
  try {
    const search = new URLSearchParams(window.location.search);
    const param = search.get('engine');
    let stored = null;
    try {
      stored = window.localStorage.getItem(ENGINE_PREF_KEY);
    } catch (_e) {
      /* private mode / blocked storage — fall through to the default */
    }
    if (param) setEngine(param);
    else if (stored) setEngine(stored);
    const cssParam = search.get('css');
    if (cssParam) setCssSource(cssParam);
  } catch (_e) {
    /* no location (SSR / worker) — stay on the default */
  }
}
export default api;
