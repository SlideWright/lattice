/**
 * Node-only intrinsic-dimension reader for the adaptive `image` layout.
 *
 * The author hands us an arbitrary rectangle; to resolve a boardroom-ready
 * treatment we need its aspect at BUILD time (deterministic for the PDF/HTML
 * export — no waiting on image load). This reads width/height straight from the
 * file header for the formats a deck realistically carries — SVG, PNG, JPEG,
 * GIF, WebP — with NO dependency (each format's size lives in the first bytes).
 * Anything it can't parse (remote URL, exotic format, unreadable) returns null,
 * and the caller falls back to the Clean floor — always safe.
 *
 * Pairs with lib/core/image-aspect.js (pure bucketing) and the browser-measure
 * fallback in lib/runtime (for remote/data-url assets in live preview).
 * See engineering/decisions/2026-06-19-adaptive-image.md.
 */

const fs = require('node:fs');
const { fileURLToPath } = require('node:url');
const { bucketForAspect } = require('./image-aspect');

// ── Per-format header parsers (buffer → {w,h} | null) ────────────────────────

function svgSize(buf) {
  // Read enough of the head to catch the opening <svg …>. width/height win;
  // else derive from viewBox (last two numbers = w h).
  const head = buf.toString('utf8', 0, Math.min(buf.length, 2048));
  const tag = head.match(/<svg\b[^>]*>/i);
  if (!tag) return null;
  const s = tag[0];
  const px = (v) => { const m = /^([\d.]+)/.exec(String(v).trim()); return m ? parseFloat(m[1]) : NaN; };
  const wM = s.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
  const hM = s.match(/\bheight\s*=\s*["']([^"']+)["']/i);
  let w = wM ? px(wM[1]) : NaN, h = hM ? px(hM[1]) : NaN;
  if (!(w > 0 && h > 0)) {
    const vb = s.match(/\bviewBox\s*=\s*["']\s*[\d.eE+-]+\s+[\d.eE+-]+\s+([\d.eE+-]+)\s+([\d.eE+-]+)/i);
    if (vb) { w = parseFloat(vb[1]); h = parseFloat(vb[2]); }
  }
  return (w > 0 && h > 0) ? { w, h } : null;
}

function pngSize(buf) {
  // 89 50 4E 47 … then IHDR at byte 16: width(4) height(4) big-endian.
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function gifSize(buf) {
  // 'GIF8' then logical screen width/height little-endian at bytes 6,8.
  if (buf.length < 10 || buf.toString('ascii', 0, 4) !== 'GIF8') return null;
  return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
}

function webpSize(buf) {
  // RIFF????WEBP, then a VP8/VP8L/VP8X chunk carrying the canvas size.
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fmt = buf.toString('ascii', 12, 16);
  if (fmt === 'VP8 ') {            // lossy: 0x9d012a then w-1,h-1 LE (14-bit)
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fmt === 'VP8L') {            // lossless: 1-byte sig 0x2f then 14+14 bits
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (fmt === 'VP8X') {            // extended: 24-bit (w-1),(h-1) LE at byte 24
    const w = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
    const h = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
    return { w, h };
  }
  return null;
}

function jpegSize(buf) {
  // Scan APP/segment markers for a Start-Of-Frame (SOFn); its payload holds
  // height(2) width(2) big-endian after a 1-byte precision.
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) { off++; continue; }
    let marker = buf[off + 1];
    while (marker === 0xff && off + 1 < buf.length) { off++; marker = buf[off + 1]; } // skip fill bytes
    // SOF0..SOF15 carry the frame size, excluding the non-SOF markers in this range.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = buf.readUInt16BE(off + 5), w = buf.readUInt16BE(off + 7);
      return (w > 0 && h > 0) ? { w, h } : null;
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; } // standalone
    const len = buf.readUInt16BE(off + 2);          // segment length includes the 2 length bytes
    if (len < 2) return null;
    off += 2 + len;
  }
  return null;
}

/**
 * Read intrinsic dimensions from a local image file.
 * @param {string} filePath  absolute (or cwd-relative) path to a local asset
 * @returns {{w:number,h:number}|null}  dimensions, or null if unreadable/unknown
 */
function readDimensions(filePath) {
  let buf;
  try { buf = fs.readFileSync(filePath); } catch { return null; }
  if (!buf || buf.length < 4) return null;
  const b0 = buf[0];
  try {
    if (b0 === 0x89) return pngSize(buf);
    if (b0 === 0xff) return jpegSize(buf);
    if (b0 === 0x47) return gifSize(buf);
    if (b0 === 0x52) return webpSize(buf);            // 'R' of RIFF
    // SVG / XML: '<' directly, or a BOM / whitespace then '<'
    const head = buf.toString('utf8', 0, Math.min(buf.length, 64));
    if (/<(?:\?xml|svg)/i.test(head)) return svgSize(buf);
  } catch { return null; }
  return null;
}

// ── Build-time bucket stamp ──────────────────────────────────────────────────
// The adaptive `image` layout resolves its composition in CSS from
// `[data-img-bucket] × [data-orientation]`. This stamps the FIRST half — the
// image's intrinsic aspect bucket — onto the <section>, by reading the resolved
// asset off the already-emitted `.lattice-bg` panel. Deterministic for the
// PDF/HTML export (no waiting on image load). Anything unreadable (remote URL,
// exotic format) is left unstamped → CSS falls to the Clean floor. The browser
// measure pass in lib/runtime covers preview / remote / data-url assets.

function bgUrlOf(sectionHtml) {
  const m = sectionHtml.match(/class="lattice-bg[^"]*"[^>]*background-image:\s*url\(\s*['"]?([^'")]+)/i);
  return m ? m[1] : null;
}

function urlToLocalPath(u) {
  if (u.startsWith('file://')) { try { return fileURLToPath(u); } catch { return null; } }
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('//') || u.startsWith('data:')) return null; // remote / data
  return u; // already a filesystem path
}

/**
 * Stamp `data-img-bucket` on an `image` section by reading its `.lattice-bg`
 * asset's intrinsic aspect. Idempotent; a no-op for non-image sections, an
 * already-stamped section, or an unreadable/remote asset (→ Clean floor).
 * @param {string} sectionHtml  one `<section …>…</section>`
 * @returns {string} the section, possibly with `data-img-bucket` added
 */
function stampImageBucket(sectionHtml) {
  if (typeof sectionHtml !== 'string') return sectionHtml;
  const open = sectionHtml.match(/^<section\b[^>]*>/i);
  if (!open || !/\bclass="[^"]*\bimage\b/.test(open[0])) return sectionHtml;
  if (/\bdata-img-bucket=/.test(open[0])) return sectionHtml;
  const url = bgUrlOf(sectionHtml);
  if (!url) return sectionHtml;
  const filePath = urlToLocalPath(url);
  if (!filePath) return sectionHtml;
  const dim = readDimensions(filePath);
  const bucket = dim && bucketForAspect(dim.w, dim.h);
  if (!bucket) return sectionHtml;
  return open[0].replace(/^<section\b/i, `<section data-img-bucket="${bucket}"`) + sectionHtml.slice(open[0].length);
}

module.exports = { readDimensions, stampImageBucket, bgUrlOf, urlToLocalPath, svgSize, pngSize, jpegSize, gifSize, webpSize };
