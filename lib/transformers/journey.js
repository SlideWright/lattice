/**
 * journey transformer — registry-shaped adapter around the engine
 * kernel at lib/components/journey/journey.transform.js.
 *
 * The engine module owns the rewrite logic for the `journey` layout —
 * nested list → .journey-board (legend, section ribbon, task chips,
 * plumb lines, mood faces, swimlanes, mood curve). One shared DOM
 * across variants (heatmap, curve, swimlane, weighted); CSS varies
 * the look per variant.
 *
 * Consumers + class mutation: see lib/transformers/roadmap.js — same
 * shape; journey also does not mutate cls.
 */

const engine = require('../components/journey/journey.transform');

module.exports = {
  name: 'journey',
  layouts: ['journey'],
  selector: 'section.journey',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToSection(innerHtml, cls) {
    return { html: engine.transformJourneySection(innerHtml, cls), cls };
  },
};
