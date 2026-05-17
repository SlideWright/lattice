/**
 * roadmap transformer — registry-shaped adapter around the engine
 * kernel at lib/components/roadmap/roadmap.transform.js.
 *
 * The engine module owns the rewrite logic for the `roadmap` layout
 * (status modifier — cell state markers; horizons modifier — table →
 * three-card transpose).
 *
 * Consumers:
 *   - marp.config.js     — render hook calls registry.applyAllToHtml
 *                          (which dispatches to applyToHtml here)
 *   - lattice-emulator.js — per-slide parseSlide loop calls
 *                           registry.applyAllToSection(html, classAttr)
 *   - lattice-runtime.js  — keeps a hand-edited DOM mirror inline. The
 *                           applyToDom slot is intentionally not filled
 *                           here yet; chart-family phase 2 introduces
 *                           the pattern for lifting runtime DOM walks
 *                           into the registry, and the remaining four
 *                           components (roadmap, journey, word-cloud,
 *                           plus chart-family) all follow that pattern.
 *
 * Class mutation: transformRoadmapSection does NOT mutate cls.
 */

const engine = require('../components/roadmap/roadmap.transform');

module.exports = {
  name: 'roadmap',
  layouts: ['roadmap'],
  selector: 'section.roadmap',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToSection(innerHtml, cls) {
    return { html: engine.transformRoadmapSection(innerHtml, cls), cls };
  },
};
