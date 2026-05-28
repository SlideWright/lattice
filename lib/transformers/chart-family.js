/**
 * chart-family transformer — registry-shaped adapter around the engine
 * kernel at lib/components/chart/_chart-family/chart-family.js plus its delegated
 * radar/quadrant kernels at lib/components/{radar,quadrant}/*.transform.js.
 *
 * The engine module owns the HTML-string rewrite for all seven chart
 * layouts (progress, timeline-list, piechart, gantt, kanban, radar,
 * quadrant). Each layout's transform pulls the first <ul>/<ol> out of
 * the section, builds the layout-specific markup, then wraps the whole
 * thing in the chart-frame skeleton and tags the section with
 * `chart-frame`.
 *
 * Consumers:
 *   - marp.config.js     — render hook calls registry.applyAllToHtml
 *   - lattice-emulator.js — registry.applyAllToSection(html, classAttr)
 *   - lib/runtime/index.js → lattice-runtime.js bundle —
 *                            registry.applyAllToDom(document)
 *
 * Class mutation: transformChartSection appends `chart-frame` to the
 * section's class list. applyToSection returns the updated cls.
 * applyToDom propagates that to section.classList.
 *
 * DOM-walk strategy: delegates to engine.transformChartSection rather
 * than maintaining a parallel runtime mirror. Before this commit the
 * runtime carried ~1815 lines of duplicated chart-family + radar +
 * quadrant logic; bundling the engine into lattice-runtime.js lets
 * the runtime route through the same kernel marp-cli uses. Same
 * trade-off as the journey / word-cloud adapters: innerHTML
 * replacement destroys existing child nodes, but no other transformer
 * mutates chart sections before this one runs.
 */

const engine = require('../components/chart/_chart-family/chart-family');

module.exports = {
  name: 'chart-family',
  layouts: engine.CHART_LAYOUTS,
  selector: engine.CHART_LAYOUTS.map(l => `section.${l}`).join(', '),
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToSection(innerHtml, cls) {
    const r = engine.transformChartSection(innerHtml, cls);
    return { html: r.html, cls: r.cls };
  },
  applyToDom(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    for (const layout of engine.CHART_LAYOUTS) {
      for (const section of root.querySelectorAll('section.' + layout)) {
        try {
          const r = engine.transformChartSection(section.innerHTML, section.className);
          if (!r.transformed) continue;
          section.innerHTML = r.html;
          // chart-family appends 'chart-frame' to cls; propagate to the
          // live section's class list. classList.add is idempotent.
          for (const tok of r.cls.split(/\s+/).filter(Boolean)) {
            if (!section.classList.contains(tok)) section.classList.add(tok);
          }
        } catch (e) {
          if (typeof console !== 'undefined') {
            console.warn('[lattice-runtime] chart-family transform failed', layout, e);
          }
        }
      }
    }
  },
};
