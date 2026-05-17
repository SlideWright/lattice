/**
 * journey transformer — registry-shaped adapter around the engine
 * kernel at lib/components/journey/journey.transform.js.
 *
 * The engine module rewrites the `journey` layout — nested list →
 * .journey-board (legend, section ribbon, task chips, plumb lines,
 * mood faces, swimlanes, mood curve). One shared DOM across variants
 * (heatmap, curve, swimlane, weighted); CSS varies the look per
 * variant.
 *
 * Consumers:
 *   - marp.config.js     — render hook calls registry.applyAllToHtml
 *   - lattice-emulator.js — registry.applyAllToSection(html, classAttr)
 *   - src/runtime/index.js → lattice-runtime.js bundle —
 *                            registry.applyAllToDom(document)
 *
 * Class mutation: transformJourneySection does NOT mutate cls.
 *
 * DOM-walk strategy: now that esbuild bundles the engine kernel into
 * the runtime, applyToDom delegates to engine.transformJourneySection
 * rather than maintaining a parallel DOM parser/emitter. The kernel
 * already operates on a section's inner HTML; replacing
 * section.innerHTML with the result gives the same DOM the marp-cli
 * render hook produces. Idempotence is provided by the kernel.
 *
 * Trade-off: setting innerHTML destroys existing child nodes, so any
 * other transformer that mutated journey's inner DOM before this one
 * runs would lose those changes. Runtime's runAllContentTransforms
 * is ordered so this isn't a problem (no other transform touches
 * journey sections), and the registry's TRANSFORMERS order keeps
 * journey's adapter as the only one that owns its sections.
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
  applyToDom(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    for (const section of root.querySelectorAll('section.journey')) {
      const rewritten = engine.transformJourneySection(section.innerHTML, section.className);
      if (rewritten !== section.innerHTML) section.innerHTML = rewritten;
    }
  },
};
