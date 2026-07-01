/**
 * Shared kernel for the `connect` bucket's QR-card components (wifi, contact).
 *
 * Both parse the same authoring shape — a postfix-key list where each bullet is
 * `value `key`` (value first, trailing inline-code names the field) — assemble a
 * payload string, encode it to a palette-blind SVG via lib/engine/qr, and emit a
 * two-zone card (readable fields + QR). Only the payload builder and the card's
 * field layout differ per component; everything mechanical lives here.
 *
 * Underscore-prefixed folder so the component loader and the bucket CSS walker
 * skip it (mirrors chart/_chart-family) — it is bucket-scoped infrastructure,
 * not a component.
 *
 * Values are pulled from the RENDERED `<li>` but reduced to their raw text
 * (tags stripped, entities decoded) so an autolinked URL or emphasized password
 * still encodes to the exact string the author typed.
 */

const { qrSvg } = require('../../../engine/qr');

// ── field parsing ──────────────────────────────────────────────────────────
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&#x27;/gi, "'")
    .replace(/&#8209;/g, '‑');
}
const stripTags = (s) => s.replace(/<[^>]+>/g, '');

// Parse `<li> value <code>key</code></li>` items into { value, key }. The last
// <code> in the item is the key; everything before it is the value.
function parseFields(innerHtml) {
  const fields = [];
  const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(innerHtml))) {
    const li = m[1];
    const codeRe = /<code\b[^>]*>([\s\S]*?)<\/code>/gi;
    let last = null, c;
    while ((c = codeRe.exec(li))) last = c;
    if (!last) continue; // no postfix key → not a field bullet
    const key = decodeEntities(stripTags(last[1])).trim().toLowerCase();
    const value = decodeEntities(stripTags(li.slice(0, last.index))).trim();
    fields.push({ value, key });
  }
  return fields;
}

// First value whose key matches any of the given aliases.
function pick(fields, ...keys) {
  const f = fields.find((x) => keys.includes(x.key));
  return f ? f.value : '';
}

// ── heading extraction (kept verbatim in the card) ──────────────────────────
function extractHeading(body) {
  const m = body.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i);
  return m ? m[0] : '';
}

// ── QR encode (fixed error-correction, generous quiet zone) ─────────────────
const encode = (payload) => qrSvg(payload, { ecLevel: 'M', margin: 3 });

// ── depth-aware <section class="NAME"> walk (mirrors compare-code) ───────────
// Calls renderSection(innerHtml, cls) for each matching section; leaves the rest
// untouched. Idempotency is the renderSection's responsibility.
function walkSections(html, name, renderSection) {
  if (typeof html !== 'string' || html.indexOf(name) === -1) return html;
  let out = '', i = 0;
  while (i < html.length) {
    const open = html.indexOf('<section', i);
    if (open < 0) { out += html.slice(i); break; }
    out += html.slice(i, open);
    const tagEnd = html.indexOf('>', open);
    if (tagEnd < 0) { out += html.slice(open); break; }
    const openTag = html.slice(open, tagEnd + 1);
    const cls = (openTag.match(/\sclass="([^"]*)"/) || [])[1] || '';
    let depth = 1, pos = tagEnd + 1, closeEnd = -1;
    while (pos < html.length) {
      if (html.startsWith('<section', pos)) { const e = html.indexOf('>', pos); if (e < 0) break; depth++; pos = e + 1; }
      else if (html.startsWith('</section>', pos)) { depth--; if (depth === 0) { closeEnd = pos + 10; break; } pos += 10; }
      else pos++;
    }
    if (closeEnd < 0) { out += html.slice(open); break; }
    const inner = html.slice(tagEnd + 1, closeEnd - 10);
    const has = (c) => new RegExp(`\\b${name}\\b`).test(c);
    out += openTag + (has(cls) ? renderSection(inner, cls) : inner) + '</section>';
    i = closeEnd;
  }
  return out;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

module.exports = { parseFields, pick, extractHeading, encode, walkSections, esc, decodeEntities, stripTags };
