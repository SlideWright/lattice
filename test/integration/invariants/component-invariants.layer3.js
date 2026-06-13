/**
 * Layer 3 — per-component SEMANTIC invariants, and the TRANSFORM set.
 *
 * Layers 1–2 (contract slots + universal contrast/overflow) cover every component
 * automatically. But some components TRANSFORM their authored markup: a chart's
 * `ul > li` source list is consumed into an SVG/HTML chart frame, glossary's list
 * becomes a `<table>`, compare-code's fences become code panels, featured's list
 * becomes a feature layout. For those the manifest slot selector describes the
 * AUTHORING input (gone from the rendered DOM), so layer 1's "slot resolves" check
 * is skipped (TRANSFORM set) and the RENDERED-output contract is asserted here.
 *
 * Each entry maps a label → async `(page, assert, SLIDE) => {}` run against the
 * rendered sample slide (`SLIDE` = `section[data-marpit-slide="1"]`). Keep these
 * about MEANING — counts, presence of a computed relationship — not pixels.
 */

// Every chart-family component renders the same frame: a `.chart-body` (with a
// `.chart-header`), whether its body is an <svg> (funnel/piechart/radar/…) or
// HTML (gantt/kanban/progress/timeline-list). That frame existing == the
// chart-family transform ran and consumed the authored list.
const CHARTS = [
  'funnel', 'gantt', 'journey', 'kanban', 'map', 'piechart',
  'progress', 'quadrant', 'radar', 'timeline-list', 'word-cloud',
];

function chartFrameRenders() {
  return {
    'renders the chart-family frame (.chart-body)': async (page, assert, SLIDE) => {
      const n = await page.$$eval(`${SLIDE} .chart-body`, (els) => els.length);
      assert.ok(n >= 1, 'chart-family transform did not render a .chart-body frame (authored list not consumed into a chart)');
    },
  };
}

const LAYER3 = {
  ...Object.fromEntries(CHARTS.map((c) => [c, chartFrameRenders()])),

  glossary: {
    'authored list becomes a definition table': async (page, assert, SLIDE) => {
      const rows = await page.$$eval(`${SLIDE} table tr`, (els) => els.length);
      assert.ok(rows >= 1, `glossary list did not render as table rows (got ${rows})`);
    },
  },

  'compare-code': {
    'renders two code panels': async (page, assert, SLIDE) => {
      const n = await page.$$eval(`${SLIDE} pre`, (els) => els.length);
      assert.ok(n >= 2, `expected ≥2 <pre> code panels, got ${n}`);
    },
  },

  featured: {
    'renders the featured layout (.feat-card)': async (page, assert, SLIDE) => {
      const n = await page.$$eval(`${SLIDE} .feat-card`, (els) => els.length);
      assert.ok(n >= 1, 'featured did not render a .feat-card (authored list not transformed)');
    },
  },
};

// Components whose authored slot markup is consumed by a transform — layer 1's
// "slot selector resolves" is meaningless for them, so it's skipped and the
// rendered contract above stands in.
const TRANSFORM = new Set([...CHARTS, 'glossary', 'compare-code', 'featured']);

module.exports = { LAYER3, TRANSFORM };
