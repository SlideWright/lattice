/**
 * chart-family transformer — registry-shaped adapter around the engine
 * kernel at lib/chart-family/chart-family.js.
 *
 * The engine module owns the HTML-string rewrite for all seven chart
 * layouts (progress, timeline-list, piechart, gantt, kanban, radar,
 * quadrant). Each layout's transform pulls the first <ul>/<ol> out of
 * the section, builds the layout-specific markup (progress-bars,
 * piechart-figure, gantt-chart, …), then wraps the whole thing in the
 * chart-frame skeleton (eyebrow / h2 / subtitle, body, caption) and
 * tags the section with `chart-frame`.
 *
 * Consumers:
 *   - marp.config.js     — render hook calls registry.applyAllToHtml
 *                          (which dispatches to applyToHtml here)
 *   - lattice-emulator.js — per-slide parseSlide loop calls
 *                           registry.applyAllToSection(html, classAttr)
 *                           (which dispatches to applyToSection here)
 *   - lattice-runtime.js  — currently keeps its own hand-edited DOM mirror
 *                           inline (src/runtime/index.js, the
 *                           applyChartFamily / transformChartSection block).
 *                           applyToDom slot will be filled in a follow-up
 *                           PR; lifting the DOM walk + the runtime-local
 *                           radar/quadrant kernels is too big for one
 *                           reviewable change.
 *
 * Class mutation: transformChartSection appends `chart-frame` to the
 * section's class list. The registry's applyToSection contract returns
 * { html, cls } so the emulator's parseSlide loop can pick that up.
 */

const engine = require('../chart-family/chart-family');

module.exports = {
  name: 'chart-family',
  layouts: engine.CHART_LAYOUTS,
  selector: engine.CHART_LAYOUTS.map(l => `section.${l}`).join(', '),
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  // Per-section primitive. transformChartSection returns
  // { html, cls, transformed } — `transformed` is internal bookkeeping
  // (false means the section didn't match a chart layout or had no
  // h2/body to wrap). The registry's contract is the simpler
  // { html, cls } shape; we drop `transformed`.
  applyToSection(innerHtml, cls) {
    const r = engine.transformChartSection(innerHtml, cls);
    return { html: r.html, cls: r.cls };
  },
  // applyToDom intentionally omitted in this PR; the runtime's inline
  // DOM walk at src/runtime/index.js (function applyChartFamily) still
  // runs. See the module docstring for the follow-up.
};
