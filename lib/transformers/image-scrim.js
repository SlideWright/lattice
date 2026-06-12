/**
 * image-scrim transformer — injects a `.image-scrim` div into the
 * content section of `image.full` and `image.contain` slides so the
 * dark bottom-gradient scrim renders behind the text overlay.
 *
 * Why a real div instead of `::before` — marpit core injects
 *
 *   section[data-marpit-advanced-background="content"]::before,
 *   section[data-marpit-advanced-background="content"]::after,
 *   section[data-marpit-advanced-background="background"]::before,
 *   section[data-marpit-advanced-background="background"]::after
 *     { display: none !important }
 *
 * which kills any pseudo-element scrim in marp-cli + lattice-runtime
 * (both use marpit-core). A real DOM element bypasses the override.
 * `image.museum` doesn't need this — it uses a matte plate at the
 * bottom (no scrim) so contrast comes from solid background tokens.
 *
 * The injected node is `aria-hidden` because it's decorative.
 */

const SCRIM_HTML = '<div class="image-scrim" aria-hidden="true"></div>';

function needsScrim(cls) {
  if (typeof cls !== 'string' || !cls) return false;
  if (!/\bimage\b/.test(cls)) return false;
  if (/\bmuseum\b/.test(cls)) return false;
  return /\bfull\b/.test(cls) || /\bcontain\b/.test(cls);
}

// Marp CLI / VS Code preview path: rewrite the rendered HTML string.
// Marpit emits three sections per slide for `![bg]` directives
// (background / content / pseudo) — only the content section carries
// the text overlay, so we target it via the data attribute.
function applyToHtml(html) {
  if (typeof html !== 'string' || !html.includes('image')) return html;
  return html.replace(
    /(<section\b[^>]*\bclass="([^"]+)"[^>]*\bdata-marpit-advanced-background="content"[^>]*>)/g,
    (whole, openTag, cls) => {
      if (!needsScrim(cls)) return whole;
      if (whole.indexOf('class="image-scrim') !== -1) return whole;
      return openTag + SCRIM_HTML;
    },
  );
}

// Emulator path: called from parseSlide's per-section loop. The
// emulator emits one section per slide (no marpit advanced-background
// triple), so we inject the scrim into the inner HTML directly.
function applyToSection(innerHtml, cls) {
  if (!needsScrim(cls)) return null;
  if (typeof innerHtml === 'string' && innerHtml.includes('class="image-scrim')) {
    return null;
  }
  return { html: SCRIM_HTML + innerHtml, cls };
}

// Runtime path (lattice-runtime DOM walk in marp-vscode preview). The
// content section is identified by the data attribute (marpit emits
// it) OR by the presence of text content (emulator-like single-section
// DOM, if the runtime ever receives that). We only inject where text
// will overlay.
function applyToDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const sections = root.querySelectorAll(
    'section.image.full, section.image.contain',
  );
  for (const section of sections) {
    if (section.querySelector(':scope > .image-scrim')) continue;
    const isBgSection = section.getAttribute('data-marpit-advanced-background') === 'background';
    const isPseudoSection = section.getAttribute('data-marpit-advanced-background') === 'pseudo';
    if (isBgSection || isPseudoSection) continue;
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
  applyToHtml,
  applyToSection,
  applyToDom,
  // Primitives reused by the emulator's engine-backed path, which injects the
  // scrim by class — it has neither Marpit's advanced-background attribute that
  // applyToHtml keys on, nor the per-section applyAllToSection pass parseSlide
  // runs. See lattice-emulator.js engineSlides.
  needsScrim,
  SCRIM_HTML,
};
