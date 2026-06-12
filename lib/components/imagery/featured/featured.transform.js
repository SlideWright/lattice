/**
 * featured transform — restructure the `featured` layout's top-level list into
 * the feat-layout grid: the first item becomes the `.feat-card` (accent hero),
 * the rest become `.sub-card`s inside a `.sub-row`.
 *
 *   <div class="feat-layout">
 *     <div class="feat-card"><strong>{title}</strong><p>{body}</p></div>
 *     <div class="sub-row">
 *       <div class="sub-card"><strong>{title}</strong><p>{body}</p></div> …
 *     </div>
 *   </div>
 *
 * Was bespoke to lattice-emulator.js parseSlide; migrated to the shared registry
 * so the marp-cli and runtime paths produce it too (they rendered a plain <ul>
 * before). See engineering/decisions/2026-06-11-emulator-on-engine-p2.md.
 *
 * Sibling implementations via lib/transformers/featured.js:
 *   - marp.config.js      → applyToHtml (full Marpit HTML; depth-aware section walk)
 *   - lattice-emulator.js → applyToSection (one section's inner HTML)
 *   - lattice-runtime.js  → applyToDom (live DOM)
 *
 * Idempotent: guarded on the `.feat-layout` marker.
 */

// Split one list item's inner HTML into { title, body }. The title is a leading
// <strong> (or all text before a nested <ul>); the body is the nested <li> (or
// the remaining text).
function extractCard(content) {
  const strongMatch = content.match(/<strong>(.*?)<\/strong>/);
  const innerUlIdx = content.indexOf('<ul>');
  let title;
  let body;
  if (strongMatch) {
    title = strongMatch[1];
    if (innerUlIdx !== -1) {
      const innerLiMatch = content.slice(innerUlIdx).match(/<li>([\s\S]*?)<\/li>/);
      body = innerLiMatch ? innerLiMatch[1].trim() : '';
    } else {
      body = content.replace(strongMatch[0], '').trim();
    }
  } else if (innerUlIdx !== -1) {
    title = content.slice(0, innerUlIdx).trim();
    const innerLiMatch = content.slice(innerUlIdx).match(/<li>([\s\S]*?)<\/li>/);
    body = innerLiMatch ? innerLiMatch[1].trim() : '';
  } else {
    title = '';
    body = content.trim();
  }
  return { title, body };
}

// Collect the top-level <li> contents of a <ul> body, depth-aware (nested lists
// stay inside their parent item).
function topLevelItems(ulInner) {
  const items = [];
  let liDepth = 0;
  let liStart = -1;
  let i = 0;
  while (i < ulInner.length) {
    if (ulInner.startsWith('<li>', i)) {
      if (liDepth === 0) liStart = i + 4;
      liDepth++;
      i += 4;
    } else if (ulInner.startsWith('</li>', i)) {
      liDepth--;
      if (liDepth === 0 && liStart !== -1) {
        items.push(ulInner.slice(liStart, i));
        liStart = -1;
      }
      i += 5;
    } else {
      i++;
    }
  }
  return items;
}

// Rewrite one section's inner HTML. No-op unless the class is `featured`, a
// top-level <ul> is present, and the grid hasn't already been built.
function transformFeaturedSection(innerHtml, cls) {
  if (typeof innerHtml !== 'string' || !/\bfeatured\b/.test(cls || '')) return innerHtml;
  if (innerHtml.indexOf('class="feat-layout"') !== -1) return innerHtml; // idempotent

  const ulIdx = innerHtml.indexOf('<ul>');
  if (ulIdx === -1) return innerHtml;
  // Depth-aware scan to the matching </ul>.
  let depth = 0;
  let pos = ulIdx;
  let ulEnd = -1;
  while (pos < innerHtml.length) {
    if (innerHtml.startsWith('<ul>', pos)) {
      depth++;
      pos += 4;
    } else if (innerHtml.startsWith('</ul>', pos)) {
      depth--;
      if (depth === 0) { ulEnd = pos; break; }
      pos += 5;
    } else {
      pos++;
    }
  }
  if (ulEnd === -1) return innerHtml;

  const items = topLevelItems(innerHtml.slice(ulIdx + 4, ulEnd));
  if (items.length === 0) return innerHtml;

  const [first, ...rest] = items;
  const hero = extractCard(first);
  const featCard = `<div class="feat-card"><strong>${hero.title}</strong><p>${hero.body}</p></div>`;
  const subCards = rest
    .map((content) => {
      const { title, body } = extractCard(content);
      return `<div class="sub-card"><strong>${title}</strong><p>${body}</p></div>`;
    })
    .join('');
  const featLayout = `<div class="feat-layout">${featCard}<div class="sub-row">${subCards}</div></div>`;
  return innerHtml.slice(0, ulIdx) + featLayout + innerHtml.slice(ulEnd + 5);
}

// Depth-aware <section> walk over Marpit's rendered HTML (mirrors
// lib/core/masthead-lift.js). Non-featured sections pass through unchanged.
function applyToRenderedHtml(html) {
  if (typeof html !== 'string' || html.indexOf('featured') === -1) return html;
  let out = '';
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf('<section', i);
    if (open < 0) { out += html.slice(i); break; }
    out += html.slice(i, open);
    const tagEnd = html.indexOf('>', open);
    if (tagEnd < 0) { out += html.slice(open); break; }
    const openTag = html.slice(open, tagEnd + 1);
    const classMatch = openTag.match(/\sclass="([^"]*)"/);
    const cls = classMatch ? classMatch[1] : '';

    let depth = 1;
    let pos = tagEnd + 1;
    let closeEnd = -1;
    while (pos < html.length) {
      if (html.startsWith('<section', pos)) {
        const e = html.indexOf('>', pos);
        if (e < 0) break;
        depth++;
        pos = e + 1;
      } else if (html.startsWith('</section>', pos)) {
        depth--;
        if (depth === 0) { closeEnd = pos + '</section>'.length; break; }
        pos += '</section>'.length;
      } else {
        pos++;
      }
    }
    if (closeEnd < 0) { out += html.slice(open); break; }

    const inner = html.slice(tagEnd + 1, closeEnd - '</section>'.length);
    out += openTag + transformFeaturedSection(inner, cls) + '</section>';
    i = closeEnd;
  }
  return out;
}

module.exports = { extractCard, transformFeaturedSection, applyToRenderedHtml };
