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
// HTML (gantt/kanban/progress/timeline-list/roadmap/state-chart). That frame
// existing == the chart-family transform ran and consumed the authored source.
const CHARTS = [
  'funnel', 'gantt', 'journey', 'kanban', 'map', 'piechart',
  'progress', 'quadrant', 'radar', 'roadmap', 'state-chart',
  'timeline-list', 'word-cloud',
];

/** Assert ≥`min` matches of `sel` inside the slide. */
function present(sel, min, msg) {
  return async (page, assert, SLIDE) => {
    const n = await page.$$eval(`${SLIDE} ${sel}`, (els) => els.length);
    assert.ok(n >= min, `${msg} (expected ≥${min} "${sel}", got ${n})`);
  };
}

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

  // ── code ──
  code: {
    'renders a syntax-highlighted code block (pre > code)':
      present('pre code', 1, 'code did not render a highlighted code panel'),
  },

  // ── comparison ──
  'compare-table': {
    'authored rows render as a table':
      present('table tr', 2, 'compare-table did not render table rows'),
  },
  'matrix-2x2': {
    'renders four quadrant cells (li carrying a nested ul)': async (page, assert, SLIDE) => {
      const n = await page.$$eval(`${SLIDE} li`, (els) =>
        els.filter((li) => li.querySelector(':scope > ul')).length);
      assert.ok(n >= 4, `expected 4 quadrant cells, got ${n}`);
    },
  },
  pricing: {
    'renders pricing state badges (.badge)':
      present('.badge', 1, 'pricing did not render state badges'),
  },
  'split-compare': {
    'renders left + right compare panels and a verdict': async (page, assert, SLIDE) => {
      const f = await page.evaluate((sel) => {
        const s = document.querySelector(sel);
        return {
          l: !!s.querySelector('.compare-left'),
          r: !!s.querySelector('.compare-right'),
          v: !!s.querySelector('.verdict'),
        };
      }, SLIDE);
      assert.ok(f.l && f.r, `split-compare missing a panel (left=${f.l} right=${f.r})`);
      assert.ok(f.v, 'split-compare missing its .verdict');
    },
  },
  'verdict-grid': {
    'renders verdict badges (.badge)':
      present('.badge', 1, 'verdict-grid did not render verdict badges'),
  },
  redline: {
    'renders the redlined quote (blockquote)':
      present('blockquote', 1, 'redline did not render its blockquote'),
  },

  // ── imagery ──
  image: {
    'renders an image asset (img)':
      present('img', 1, 'image did not render an <img>'),
  },

  // ── inventory ──
  actors: {
    'renders actor role pills (.lat-pill)':
      present('.lat-pill', 1, 'actors did not render role pills'),
  },
  checklist: {
    'renders status markers (.state)':
      present('.state', 1, 'checklist did not render status markers'),
  },
  'logo-wall': {
    'renders multiple logos (img)':
      present('img', 2, 'logo-wall did not render multiple logos'),
  },

  // ── legal ──
  'obligation-matrix': {
    'renders an obligation table with status markers': async (page, assert, SLIDE) => {
      const f = await page.evaluate((sel) => {
        const s = document.querySelector(sel);
        return { rows: s.querySelectorAll('table tr').length, states: s.querySelectorAll('.state').length };
      }, SLIDE);
      assert.ok(f.rows >= 2, `obligation-matrix table rows ${f.rows} < 2`);
      assert.ok(f.states >= 1, 'obligation-matrix missing status markers (.state)');
    },
  },
  'citation-card': {
    'renders the citation (blockquote)':
      present('blockquote', 1, 'citation-card did not render its blockquote'),
  },

  // ── math ──
  math: {
    'renders KaTeX math (.katex)':
      present('.katex', 1, 'math did not render any KaTeX (authored $…$ not transformed)'),
  },

  // ── statement ──
  quote: {
    'renders the quotation (blockquote)':
      present('blockquote', 1, 'quote did not render a blockquote'),
  },
  'split-panel': {
    'renders left + right panels': async (page, assert, SLIDE) => {
      const f = await page.evaluate((sel) => {
        const s = document.querySelector(sel);
        return { l: !!s.querySelector('.panel-left'), r: !!s.querySelector('.panel-right') };
      }, SLIDE);
      assert.ok(f.l && f.r, `split-panel missing a panel (left=${f.l} right=${f.r})`);
    },
  },
};

// Components whose authored slot markup is consumed by a transform — layer 1's
// "slot selector resolves" is meaningless for them, so it's skipped and the
// rendered contract above stands in.
const TRANSFORM = new Set([...CHARTS, 'glossary', 'compare-code', 'featured']);

module.exports = { LAYER3, TRANSFORM };
