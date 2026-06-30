// The default split-panel assembly (default / metric / steps variants — the
// `else` branch of lib/core/split-panels.js applyPanel) expressed as DSL rules.
// This is the §11 prototype's validation target: a real component's re-parenting
// transform written declaratively as `extract` + `wrap` + one `capability`,
// proving the grammar + the capability bridge reproduce the hand-written
// transformer's structure across both render paths.
//
// Kept as a TEST FIXTURE, not in split-panel.manifest.json — the DSL is not yet
// wired into the transformer registry (that is §12, after this prototype).
const SPLIT_PANEL_RULES = [
  {
    name: 'split-panel-feature',
    // split-panel sections, excluding the two variants whose left assembly
    // differs (pullquote → blockquote+cite, watermark → letterform glyph).
    match: { section: 'split-panel', not: { section: ['pullquote', 'watermark'] } },
    do: [
      // the one imperative bit: the code-only lead <p> → <span class=panel-eyebrow>.
      { capability: 'panel-eyebrow' },
      // re-parent the feature into the left panel: eyebrow, heading, lede (in order).
      { extract: { into: { element: 'div', class: 'panel-left' }, slots: ['span.panel-eyebrow', 'h2', 'p'] } },
      // everything that remains (the supporting list) becomes the right zone.
      { wrap: { target: 'rest', into: { element: 'div', class: 'panel-right' } } },
    ],
  },
];

// A rendered-HTML sample shaped like Marp's output for `_class: split-panel`.
const SAMPLE_HTML =
  '<section class="split-panel">' +
  '<p><code>Q2 board review</code></p>' +
  '<h2>Renewals held; the gap is new logos.</h2>' +
  '<p>The quarter closed on plan for retention.</p>' +
  '<ul><li>Net retention beat plan</li><li>New-logo pipeline thinned</li></ul>' +
  '</section>';

module.exports = { SPLIT_PANEL_RULES, SAMPLE_HTML, COMPONENT: 'split-panel' };
