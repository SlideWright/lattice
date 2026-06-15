#!/usr/bin/env node
/**
 * Font-embedding parity gate — keep the engine's font demand and offline supplies in sync.
 *
 * A render silently embeds a system fallback (the `finish: sketch` body-drop) when a face
 * the engine asks for was never self-hosted. This gate holds one DEMAND ⟺ two SUPPLIES to
 * the same set of (family, weight, style) faces:
 *
 *   DEMAND   — the Google-Fonts `@import` in lib/base/base.tokens.css declares
 *              every face the engine asks for on the online/browser path.
 *   SUPPLY 1 — SELF_HOSTED_FACES in lattice-emulator.js + assets/fonts/*.woff2:
 *              what the emulator PDF path base64-injects offline.
 *   SUPPLY 2 — the FACES table in docs/src/playground/font-embed.js + its
 *              ./fonts/*.woff2: what the Drawing Board PDF/PPTX web-export
 *              path inlines as data: URIs.
 *
 * Add a weight to the `@import` and forget either supply and a render quietly
 * synthesises or falls back — invisible to the page-count tests. This gate
 * fails loudly instead: it diffs the three sets and reports every face that is
 * requested-but-unbundled, bundled-but-unrequested, or listed without a woff2
 * on disk. It is a presence gate, not a binding check — it catches a missing or
 * extra face and a missing file, but not a row whose woff2 exists yet is the
 * wrong file (right tuple, wrong glyphs); get the filename↔face binding right.
 * Read-only; never writes.
 *
 * Noto Color Emoji is the single declared-but-excluded face: it is requested in
 * the `@import` (so the browser path gets colour emoji) but is ~10 MB and
 * impractical to inline, so neither offline supply carries it — colour-emoji
 * glyphs come from the installed system emoji font instead. It lives in EXCLUDE.
 *
 * Background: engineering/decisions/2026-06-12-export-font-embedding.md.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Families requested in the @import but deliberately NOT self-hosted offline.
const EXCLUDE = new Set(['Noto Color Emoji']);

const TOKENS_CSS = path.join(ROOT, 'lib', 'base', 'base.tokens.css');
const EMULATOR_JS = path.join(ROOT, 'lattice-emulator.js');
const EMULATOR_FONTS = path.join(ROOT, 'assets', 'fonts');
const WEBEXPORT_JS = path.join(ROOT, 'docs', 'src', 'playground', 'font-embed.js');
const WEBEXPORT_FONTS = path.join(ROOT, 'docs', 'src', 'playground', 'fonts');

const key = (family, weight, style) => `${family} ${weight} ${style}`;

// ── DEMAND: parse the Google-Fonts @import in base.tokens.css ─────────────────
// URL shape: …/css2?family=Playfair+Display:ital,wght@0,400;0,700&family=Outfit:wght@300;400&…
function parseDemand() {
  const css = fs.readFileSync(TOKENS_CSS, 'utf8');
  const m = css.match(/@import\s+url\(['"]([^'"]+)['"]\)/);
  if (!m) throw new Error(`no @import url(...) found in ${rel(TOKENS_CSS)}`);
  const faces = new Set();
  // Each family=… segment, up to the next & or end.
  for (const seg of m[1].matchAll(/[?&]family=([^&]+)/g)) {
    const raw = decodeURIComponent(seg[1]);
    const [namePart, axisPart] = raw.split(':');
    const family = namePart.replace(/\+/g, ' ');
    if (EXCLUDE.has(family)) continue;
    if (!axisPart) {
      // No axis spec → the single regular face.
      faces.add(key(family, 400, 'normal'));
      continue;
    }
    const [axes, tuples] = axisPart.split('@');
    const hasItal = axes.split(',').includes('ital');
    for (const tuple of tuples.split(';')) {
      const parts = tuple.split(',');
      let weight;
      let style = 'normal';
      if (hasItal) {
        // `ital,wght` pairs: 0=normal, 1=italic.
        style = parts[0] === '1' ? 'italic' : 'normal';
        weight = Number(parts[1]);
      } else {
        weight = Number(parts[0]);
      }
      faces.add(key(family, weight, style));
    }
  }
  return faces;
}

// ── SUPPLY 1: SELF_HOSTED_FACES + assets/fonts/*.woff2 ───────────────────────
function parseEmulatorSupply(missingFiles) {
  const js = fs.readFileSync(EMULATOR_JS, 'utf8');
  const block = sliceArray(js, 'SELF_HOSTED_FACES', EMULATOR_JS);
  const faces = new Set();
  // ['Family', weight, 'style', 'file']
  const row = /\[\s*'([^']+)'\s*,\s*(\d+)\s*,\s*'(\w+)'\s*,\s*'([^']+)'\s*\]/g;
  let r;
  while ((r = row.exec(block))) {
    const [, family, weight, style, file] = r;
    faces.add(key(family, Number(weight), style));
    const fp = path.join(EMULATOR_FONTS, `${file}.woff2`);
    if (!fs.existsSync(fp)) missingFiles.push(`${rel(EMULATOR_JS)} → ${rel(fp)} (no woff2 on disk)`);
  }
  return faces;
}

// ── SUPPLY 2: font-embed.js FACES + its ./fonts/*.woff2 ──────────────────────
function parseWebExportSupply(missingFiles) {
  const js = fs.readFileSync(WEBEXPORT_JS, 'utf8');
  const faces = new Set();
  // { family: 'X', weight: N, style: 'Y', … }
  const row = /\{\s*family:\s*'([^']+)'\s*,\s*weight:\s*(\d+)\s*,\s*style:\s*'(\w+)'/g;
  let r;
  while ((r = row.exec(js))) {
    faces.add(key(r[1], Number(r[2]), r[3]));
  }
  // import x from './fonts/FILE.woff2' — verify each referenced file exists.
  for (const imp of js.matchAll(/from\s+'\.\/fonts\/([^']+\.woff2)'/g)) {
    const fp = path.join(WEBEXPORT_FONTS, imp[1]);
    if (!fs.existsSync(fp)) missingFiles.push(`${rel(WEBEXPORT_JS)} → ${rel(fp)} (no woff2 on disk)`);
  }
  return faces;
}

// Slice the `[ … ]` literal that follows `<name> = ` — brace-matched so a
// stray bracket in a comment can't truncate it.
function sliceArray(src, name, file) {
  const start = src.indexOf(`${name} = [`);
  if (start === -1) throw new Error(`no ${name} = [ … ] in ${rel(file)}`);
  const open = src.indexOf('[', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']' && --depth === 0) return src.slice(open, i + 1);
  }
  throw new Error(`unterminated ${name} array in ${rel(file)}`);
}

function rel(p) {
  return path.relative(ROOT, p);
}

function diff(a, b) {
  return [...a].filter((x) => !b.has(x)).sort();
}

function main() {
  const missingFiles = [];
  const demand = parseDemand();
  const emulator = parseEmulatorSupply(missingFiles);
  const webExport = parseWebExportSupply(missingFiles);

  const problems = [];
  const report = (label, list) => {
    if (list.length) problems.push(`${label}:\n  - ${list.join('\n  - ')}`);
  };

  report('Requested by @import but NOT self-hosted for the emulator PDF path (SELF_HOSTED_FACES + assets/fonts/)', diff(demand, emulator));
  report('Self-hosted in lattice-emulator.js but NOT requested by the @import (stale)', diff(emulator, demand));
  report('Requested by @import but NOT vendored for the web-export path (font-embed.js)', diff(demand, webExport));
  report('Vendored in font-embed.js but NOT requested by the @import (stale)', diff(webExport, demand));
  report('Listed in a supply but missing its woff2 on disk', missingFiles);

  if (problems.length) {
    process.stderr.write(
      'font parity FAILED — the @import demand and the offline supplies have drifted.\n' +
        'A rendered PDF will silently fall back / synthesise the faces below.\n' +
        'Reconcile lib/base/base.tokens.css, lattice-emulator.js (SELF_HOSTED_FACES) +\n' +
        'assets/fonts/, and docs/src/playground/font-embed.js + its ./fonts/.\n' +
        `(Noto Color Emoji is the one intentional exclusion — see ${path.basename(__filename)}.)\n\n` +
        `${problems.join('\n\n')}\n`,
    );
    return 1;
  }

  process.stdout.write(`font parity OK — ${demand.size} faces declared and self-hosted on both PDF paths.\n`);
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { parseDemand, parseEmulatorSupply, parseWebExportSupply };
