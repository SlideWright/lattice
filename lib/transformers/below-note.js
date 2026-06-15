/**
 * Registry adapter for the universal below-note wrap.
 *
 * The kernel lives in lib/core/below-note.js (a structural primitive coupled
 * to no component). This adapter wires it into the shared registry for the
 * two renderers that walk whole-document output:
 *
 *   - applyToHtml — lattice-emulator.js (via
 *                   lib/engine), both full Marpit HTML string
 *   - applyToDom  — lattice-runtime.js (live DOM, marp-vscode preview)
 *
 * below-note runs LAST among the HTML-stage transforms: it wraps the section's
 * final trailing `<p>`, so it must see that element after every structural
 * transform has settled. Its position at the end of the registry's TRANSFORMERS
 * list (consumed by applyAllToHtml / applyAllToDom) guarantees that ordering.
 *
 * Idempotent: applyToHtml skips a section already carrying `.below-note`;
 * applyToDom skips a section with a `:scope > .below-note` child.
 */

const belowNote = require('../core/below-note');

module.exports = {
  name: 'below-note',
  selector: 'section',
  applyToHtml(html) {
    return belowNote.applyToHtml(html);
  },
  applyToDom(root) {
    belowNote.applyToDom(root);
  },
};
