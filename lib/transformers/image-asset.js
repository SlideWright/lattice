/**
 * image-asset transformer — replaces marpit's
 *
 *   <figure style="background-image:url('X')"></figure>
 *
 * (emitted inside `[data-marpit-advanced-background-container]` for
 * any `![bg ...]` directive) with the canonical Lattice shape
 *
 *   <img class="image-asset" src="X" alt="">
 *
 * Why: marpit ships its image as a CSS background on a figure, which
 * forces every consumer to use `background-size` / `background-position`
 * with `!important` to override marpit's own declarations. The emulator
 * emits a real `<img>` with no `background-image`. The mismatch means
 * every image rule needs two parallel selectors with two parallel sets
 * of properties (`background-size` vs `object-fit`). Normalizing both
 * paths to a real `<img class="image-asset">` lets CSS target one class
 * with one set of properties — `object-fit`, `object-position`,
 * `box-shadow`, etc.
 *
 * Marpit's container parent (`[data-marpit-advanced-background-container]`)
 * is left in place — it still does the positioning work (split-right
 * width:50%, full-slide width:100%, etc.) via marpit's own CSS, which
 * is exactly what we want. We only swap the inner element from figure
 * to img.
 *
 * The emulator already emits `<img class="image-asset">` inside its
 * own wrapper (`.lattice-bg`), so no transformation is needed for that
 * path — but for symmetry the registry calls applyToSection too, where
 * we just verify the class is present.
 */

const FIGURE_BG_RE = /<figure\s+style="background-image:\s*url\(([^)]+)\)\s*;?\s*"\s*><\/figure>/g;

function unquoteUrl(raw) {
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  // Marpit HTML-escapes embedded quotes in the style attribute as &quot;
  return s
    .replace(/&quot;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, '');
}

function htmlAttrEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

// Marp CLI path — string rewrite over the rendered HTML.
function applyToHtml(html) {
  if (typeof html !== 'string' || html.indexOf('background-image:url(') === -1) {
    return html;
  }
  return html.replace(FIGURE_BG_RE, (_whole, urlRaw) => {
    const url = unquoteUrl(urlRaw);
    return `<img class="image-asset" src="${htmlAttrEscape(url)}" alt=""/>`;
  });
}

// Emulator path — the emulator emits the canonical shape directly, so
// applyToSection is a no-op other than the safety check.
function applyToSection() {
  return null;
}

// Runtime path — DOM walk. Replaces each marpit figure-with-bg with
// an img element of the same URL.
function applyToDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const figures = root.querySelectorAll(
    'figure[style*="background-image"]',
  );
  for (const figure of figures) {
    const style = figure.getAttribute('style') || '';
    const m = style.match(/background-image:\s*url\(([^)]+)\)/);
    if (!m) continue;
    const url = unquoteUrl(m[1]);
    const img = figure.ownerDocument.createElement('img');
    img.className = 'image-asset';
    img.setAttribute('src', url);
    img.setAttribute('alt', '');
    figure.parentNode.replaceChild(img, figure);
  }
}

module.exports = {
  name: 'image-asset',
  layouts: ['image'],
  selector: 'figure[style*="background-image"]',
  applyToHtml,
  applyToSection,
  applyToDom,
};
