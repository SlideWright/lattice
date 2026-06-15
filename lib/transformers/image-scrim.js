/**
 * image-scrim transformer — injects a `.image-scrim` div into the
 * content section of `image.full` and `image.contain` slides so the
 * dark bottom-gradient scrim renders behind the text overlay.
 *
 * A real DOM element (not a `::before`) so the scrim is a normal,
 * always-rendered node in every render path. `image.museum` doesn't
 * need it — it uses a matte plate at the bottom (no scrim) so contrast
 * comes from solid background tokens.
 *
 * The injected node is `aria-hidden` because it's decorative.
 *
 * Render paths: the runtime injects it via `applyToDom` (DOM walk, by
 * class); the engine/emulator inject it by class in `engineSlides` using
 * the `needsScrim` / `SCRIM_HTML` primitives exported below.
 */

const SCRIM_HTML = '<div class="image-scrim" aria-hidden="true"></div>';

function needsScrim(cls) {
  if (typeof cls !== 'string' || !cls) return false;
  if (!/\bimage\b/.test(cls)) return false;
  if (/\bmuseum\b/.test(cls)) return false;
  return /\bfull\b/.test(cls) || /\bcontain\b/.test(cls);
}

// Runtime path (lattice-runtime DOM walk). The content section is
// identified by its `image.full` / `image.contain` class; the scrim sits
// behind the text overlay.
function applyToDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const sections = root.querySelectorAll(
    'section.image.full, section.image.contain',
  );
  for (const section of sections) {
    if (section.querySelector(':scope > .image-scrim')) continue;
    const scrim = section.ownerDocument.createElement('div');
    scrim.className = 'image-scrim';
    scrim.setAttribute('aria-hidden', 'true');
    section.insertBefore(scrim, section.firstChild);
  }
}

module.exports = {
  name: 'image-scrim',
  layouts: ['image.full', 'image.contain'],
  selector: 'section.image.full, section.image.contain',
  applyToDom,
  // Primitives reused by the engine/emulator's engine-backed path, which injects
  // the scrim by class in engineSlides. See lattice-emulator.js.
  needsScrim,
  SCRIM_HTML,
};
