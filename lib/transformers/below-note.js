/**
 * Registry adapter for the universal below-note wrap.
 *
 * The kernel lives in lib/core/below-note.js (a structural primitive coupled
 * to no component). This adapter wires it into the shared registry for the
 * two renderers that walk whole-document output:
 *
 *   - applyToHtml — marp.config.js render hook (full Marpit HTML string)
 *   - applyToDom  — lattice-runtime.js (live DOM, marp-vscode preview)
 *
 * There is intentionally NO applyToSection. The emulator's parseSlide runs
 * below-note as its LAST step (after the bespoke crit/glossary transforms
 * that the registry's earlier applyAllToSection pass does not include), so it
 * calls the kernel's `wrapSectionBody` directly at that point rather than via
 * the registry. Exposing applyToSection here would run the wrap too early in
 * the emulator and re-order it ahead of those transforms.
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
