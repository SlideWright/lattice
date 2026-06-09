/**
 * image-text-panel transformer — wraps the text content of half-canvas
 * `image` slides in a `<div class="image-text">` panel so the section
 * can use the canonical split-* layout pattern (flex row, child panels
 * with explicit width) instead of the percentage-padding anti-pattern
 * that breaks `container-type: size` for every cqi unit inside.
 *
 * Why this matters. The base section rule sets
 *   `section { container-type: size }`
 * which means cqi inside a section measures the section's content-box
 * (per CSS Containment Module Level 3 §4.4). When a section has
 *   `padding-right: calc(50% + var(--sp-2xl))`
 * (which is how the old half-canvas image rule constrained the text
 * slot), the content-box shrinks to ~40% of the slide. Every `cqi`
 * unit inside resolves to 40% of its intended value — body and h2
 * font tokens, padding tokens, everything. Text becomes unreadable.
 *
 * The fix is structural, matching how split-panel / split-compare
 * already work: section keeps normal padding,
 * a child panel takes width: 50%, text wraps to the panel.
 *
 * Marpit's three-section advanced-background scaffold lands the text
 * inside the section with `data-marpit-advanced-background="content"`.
 * That section is the one we wrap. The bg section (with the figure
 * → img.image-asset rewrite from `image-asset.js`) stays untouched.
 *
 * Idempotent: re-running the transform on already-wrapped content is
 * a no-op (existing `.image-text` div is detected and preserved).
 */

function isHalfCanvasImage(cls) {
  if (typeof cls !== 'string' || !cls) return false;
  if (!/\bimage\b/.test(cls)) return false;
  return !/\b(?:full|contain|museum)\b/.test(cls);
}

// Marp CLI path: rewrite the rendered HTML string. Only the content
// section (which carries the text + chrome) is touched.
function applyToHtml(html) {
  if (typeof html !== 'string' || !html.includes('image')) return html;
  return html.replace(
    /(<section\b[^>]*\bclass="([^"]+)"[^>]*\bdata-marpit-advanced-background="content"[^>]*>)([\s\S]*?)(<\/section>)/g,
    (whole, openTag, cls, inner, closeTag) => {
      if (!isHalfCanvasImage(cls)) return whole;
      if (inner.includes('class="image-text"')) return whole;
      // Split inner around <header>…</header> and <footer>…</footer>;
      // wrap the remainder. Header / footer stay siblings of the wrapper
      // because they're absolute-positioned chrome, not text-slot content.
      const headerMatch = inner.match(/<header[\s\S]*?<\/header>/);
      const footerMatch = inner.match(/<footer[\s\S]*?<\/footer>/);
      const header = headerMatch ? headerMatch[0] : '';
      const footer = footerMatch ? footerMatch[0] : '';
      let body = inner;
      if (header) body = body.replace(header, '');
      if (footer) body = body.replace(footer, '');
      return openTag + header + `<div class="image-text">${body}</div>` + footer + closeTag;
    },
  );
}

// Emulator path: the emulator wraps directly in parseSlide (see
// lattice-emulator.js section template). applyToSection isn't used
// here because the emulator's per-slide wrapping happens before this
// registry runs.
function applyToSection() {
  return null;
}

// Runtime path: DOM walk for marp-vscode preview. Same logic, working
// on a live document.
function applyToDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const sections = root.querySelectorAll(
    'section.image[data-marpit-advanced-background="content"]',
  );
  for (const section of sections) {
    if (!isHalfCanvasImage(section.className)) continue;
    if (section.querySelector(':scope > .image-text')) continue;
    const doc = section.ownerDocument;
    const wrapper = doc.createElement('div');
    wrapper.className = 'image-text';
    // Move every direct child that isn't header/footer into the wrapper.
    const skip = new Set(['HEADER', 'FOOTER']);
    const movers = [];
    for (const child of Array.from(section.children)) {
      if (!skip.has(child.tagName)) movers.push(child);
    }
    for (const child of movers) wrapper.appendChild(child);
    // Insert wrapper after the header (or at start if no header).
    const header = section.querySelector(':scope > header');
    if (header?.nextSibling) {
      section.insertBefore(wrapper, header.nextSibling);
    } else if (header) {
      section.appendChild(wrapper);
    } else {
      section.insertBefore(wrapper, section.firstChild);
    }
  }
}

module.exports = {
  name: 'image-text-panel',
  layouts: ['image'],
  selector: 'section.image',
  applyToHtml,
  applyToSection,
  applyToDom,
};
