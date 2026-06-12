/**
 * Registry adapter for the featured-layout transform. Kernel:
 * lib/components/imagery/featured/featured.transform.js (the HTML-string path);
 * the DOM mirror below reuses the kernel's `extractCard` so the title/body split
 * is identical across paths.
 *
 *   - marp.config.js      → applyAllToHtml → applyToHtml
 *   - lattice-emulator.js → parseSlide loop → applyAllToSection → applyToSection
 *   - lattice-runtime.js  → applyAllToDom → applyToDom
 *
 * Idempotent: guarded on the `.feat-layout` marker.
 */

const engine = require('../components/imagery/featured/featured.transform');

function transformFeaturedDom(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const doc = root.ownerDocument || root;
  for (const sec of root.querySelectorAll('section.featured')) {
    if (sec.querySelector(':scope > .feat-layout')) continue; // idempotent
    const ul = sec.querySelector(':scope > ul');
    if (!ul) continue;
    const items = [...ul.children].filter((el) => el.tagName === 'LI');
    if (items.length === 0) continue;

    const makeCard = (li, klass) => {
      const { title, body } = engine.extractCard(li.innerHTML);
      const div = doc.createElement('div');
      div.className = klass;
      div.innerHTML = `<strong>${title}</strong><p>${body}</p>`;
      return div;
    };

    const layout = doc.createElement('div');
    layout.className = 'feat-layout';
    layout.appendChild(makeCard(items[0], 'feat-card'));
    const subRow = doc.createElement('div');
    subRow.className = 'sub-row';
    for (let k = 1; k < items.length; k++) subRow.appendChild(makeCard(items[k], 'sub-card'));
    layout.appendChild(subRow);
    ul.replaceWith(layout);
  }
}

module.exports = {
  name: 'featured',
  selector: 'section.featured',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToSection(innerHtml, cls) {
    return { html: engine.transformFeaturedSection(innerHtml, cls), cls };
  },
  applyToDom(root) {
    transformFeaturedDom(root);
  },
};
