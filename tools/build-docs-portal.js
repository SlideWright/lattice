#!/usr/bin/env node
/**
 * Aggregate every component manifest into a single canonical reference,
 * emitted in two forms:
 *
 *   reference/components.md    — one self-contained Markdown document: a
 *                           generated table of contents (bucket →
 *                           component) followed by the full per-component
 *                           reference, reusing the exact prose the
 *                           per-component docs.md generator emits.
 *   reference/components.html  — a self-contained, themable two-panel portal:
 *                           a clickable bucket→component sidebar (scroll-
 *                           spy + live filter) on the left, the full
 *                           reference on the right. The reader picks any
 *                           Lattice palette by name from a dropdown and
 *                           toggles light/dark; both drive the real theme
 *                           tokens, resolved from themes/<name>.css at
 *                           build time.
 *
 * The manifest is the single source of truth — the same fields the
 * per-component docs.md generator (tools/build-component-docs.js) reads,
 * so both outputs stay automatically in sync with the docs.md files.
 *
 * Deterministic and idempotent: re-running with no manifest/theme change
 * produces byte-identical output.
 *
 * Usage:
 *   node tools/build-docs-portal.js            # build both files
 *   node tools/build-docs-portal.js --check    # CI gate (stale = exit 1)
 *
 * Exit codes:
 *   0  success (or --check: up to date)
 *   1  --check: an output is stale relative to the manifests/themes
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadAll, groupByBucket, BUCKETS, manifestBucket } = require('../lib/components');
const { BUCKET_BLURBS } = require('./build-bucket-galleries');
const { renderDocs } = require('./build-component-docs');

const ROOT = path.join(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'lib', 'components');
const THEMES_DIR = path.join(ROOT, 'themes');
const ASCII_TOOL = path.join(ROOT, 'tools', 'ascii-preview.py');
const HTML_FILE = path.join(ROOT, 'reference', 'components.html');
const MD_FILE = path.join(ROOT, 'reference', 'components.md');

// Portal-consumed theme tokens, resolved per palette / per mode. The
// portal layout CSS consumes only these; everything else (sidebar fill,
// shadows, semantic pass/fail) is derived in BASE_STYLE.
const PORTAL_TOKENS = [
  'bg', 'bg-alt', 'border',
  'text-heading', 'text-body', 'text-muted',
  'accent', 'accent-soft', 'bg-dark',
];

// Palettes surfaced first in the dropdown (the two canonical palettes
// named in CLAUDE.md); the rest follow alphabetically.
const PALETTE_PRIORITY = ['indaco', 'cuoio'];

// ── Anatomy catalog (shared shape with build-component-docs.js) ──────────
let _anatomyCatalog = null;
function loadAnatomyCatalog() {
  if (_anatomyCatalog) return _anatomyCatalog;
  const out = execFileSync('python3', [ASCII_TOOL, 'build'], { encoding: 'utf8' });
  const catalog = Object.create(null);
  let currentId = null;
  let currentLines = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^=== (\S+) ===$/);
    if (m) {
      if (currentId) catalog[currentId] = currentLines.join('\n').replace(/\n+$/, '');
      currentId = m[1];
      currentLines = [];
    } else if (currentId) {
      currentLines.push(line);
    }
  }
  if (currentId) catalog[currentId] = currentLines.join('\n').replace(/\n+$/, '');
  _anatomyCatalog = catalog;
  return catalog;
}

function resolveAnatomy(blockId) {
  const catalog = loadAnatomyCatalog();
  const block = catalog[blockId];
  if (!block) {
    const known = Object.keys(catalog).sort().join(', ');
    throw new Error(`anatomyBlock "${blockId}" not found in tools/ascii-preview.py catalog. Known IDs: ${known}`);
  }
  return block;
}

// ── Theme token resolution ────────────────────────────────────────────────
//
// Each base palette (themes/<name>.css that `@import 'lattice'`) declares
// the portal tokens either directly (carbone — inherently dark) or via the
// CSS light-dark(L, R) function with the dark side referencing --dark-*
// vars in the same file. We resolve each token to a concrete {light, dark}
// pair at build time so the portal needs no runtime CSS engine — it just
// swaps token blocks keyed by [data-palette][data-mode].

/** Parse a theme stylesheet into a flat var map, :root winning over
 *  :where(:root). Comments are stripped first so braces in prose don't
 *  confuse the block scan; theme token blocks have no nested braces. */
function parseThemeVars(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const whereMap = new Map();
  const rootMap = new Map();
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    const body = m[2];
    const isWhere = /:where\(\s*:root\s*\)/.test(selector);
    const isRoot = /(^|,)\s*:root\s*(,|$)/.test(selector);
    if (!isWhere && !isRoot) continue;
    const target = isWhere ? whereMap : rootMap;
    for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      target.set(d[1], d[2].trim());
    }
  }
  const merged = new Map(whereMap);
  for (const [k, v] of rootMap) merged.set(k, v);
  return merged;
}

/** Recursively expand var(--x) / var(--x, fallback) references to literals. */
function expandVars(map, value, depth = 0) {
  if (depth > 24) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (whole, name, fb) => {
    const v = map.get(name);
    if (v != null) return expandVars(map, v, depth + 1);
    if (fb != null) return expandVars(map, fb, depth + 1);
    return whole;
  });
}

/** Split a string on top-level commas (paren-aware). */
function splitTopLevel(s) {
  const parts = [];
  let depth = 0;
  let buf = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  parts.push(buf);
  return parts;
}

/** Resolve a single token to {light, dark}. Returns null if undefined. */
function resolveToken(map, tokenName) {
  const raw = map.get(`--${tokenName}`);
  if (raw == null) return null;
  const expanded = expandVars(map, raw).trim();
  const ld = expanded.match(/^light-dark\(([\s\S]*)\)$/);
  if (ld) {
    const args = splitTopLevel(ld[1]);
    if (args.length >= 2) {
      return { light: args[0].trim(), dark: args[1].trim() };
    }
  }
  return { light: expanded, dark: expanded };
}

/** Ordered list of selectable base palettes (those importing lattice). */
let _basePalettes = null;
function listBasePalettes() {
  if (_basePalettes) return _basePalettes;
  const names = [];
  for (const file of fs.readdirSync(THEMES_DIR).sort()) {
    if (!file.endsWith('.css')) continue;
    const css = fs.readFileSync(path.join(THEMES_DIR, file), 'utf8');
    if (!/@import\s+['"]lattice['"]/.test(css)) continue;
    names.push(file.replace(/\.css$/, ''));
  }
  const priority = PALETTE_PRIORITY.filter((p) => names.includes(p));
  const rest = names.filter((p) => !priority.includes(p)).sort();
  _basePalettes = [...priority, ...rest];
  return _basePalettes;
}

/** Resolve every palette's portal tokens to {light, dark} sets. */
function resolvePalettes() {
  return listBasePalettes().map((name) => {
    const css = fs.readFileSync(path.join(THEMES_DIR, `${name}.css`), 'utf8');
    const map = parseThemeVars(css);
    const light = {};
    const dark = {};
    for (const t of PORTAL_TOKENS) {
      const r = resolveToken(map, t);
      if (!r) throw new Error(`theme "${name}" is missing token --${t}`);
      light[t] = r.light;
      dark[t] = r.dark;
    }
    // A palette whose light and dark surfaces are identical is single-mode
    // (e.g. carbone — inherently dark). Flagged for the dropdown label.
    const singleMode = light.bg === dark.bg && light['text-heading'] === dark['text-heading'];
    return { name, light, dark, singleMode };
  });
}

/** Emit the per-palette / per-mode CSS token blocks. */
function paletteCss() {
  const blocks = [];
  for (const p of resolvePalettes()) {
    const decls = (set) => PORTAL_TOKENS.map((t) => `--${t}:${set[t]};`).join('');
    blocks.push(`html[data-palette="${p.name}"][data-mode="light"]{${decls(p.light)}}`);
    blocks.push(`html[data-palette="${p.name}"][data-mode="dark"]{${decls(p.dark)}}`);
  }
  return blocks.join('\n');
}

// ── Text helpers ─────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Render the small inline-Markdown subset the manifest prose uses. */
function inline(s) {
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, b) => `<strong>${b}</strong>`);
  return out;
}

function tc(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function componentId(m) {
  return `c-${m.name}`;
}

function sortedMembers(list) {
  return list.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function bucketTitle(bucket) {
  return tc(bucket);
}

function bucketTagline(bucket) {
  const blurb = BUCKET_BLURBS[bucket] || bucket;
  const idx = blurb.indexOf(' — ');
  return idx >= 0 ? blurb.slice(idx + 3) : blurb;
}

/** Relative path (from reference/) to a component's light gallery PDF, or null. */
function galleryHref(m) {
  const bucket = manifestBucket(m);
  const abs = path.join(COMPONENTS_DIR, bucket, m.name, `${m.name}.gallery.light.pdf`);
  if (!fs.existsSync(abs)) return null;
  return path.relative(path.join(ROOT, 'reference'), abs).split(path.sep).join('/');
}

// ── HTML: per-component article ────────────────────────────────────────────
function renderComponent(m) {
  const h = [];
  h.push(`<article class="component" id="${componentId(m)}">`);
  h.push('  <header class="component-head">');
  h.push(`    <h3>${esc(m.name)}</h3>`);
  h.push('    <div class="ffs">');
  h.push(`      <span class="ffs-pill" title="Function">${esc(tc(m.function))}</span>`);
  h.push(`      <span class="ffs-pill" title="Form">${esc(tc(m.form))}</span>`);
  h.push(`      <span class="ffs-pill" title="Substance">${esc(tc(m.substance))}</span>`);
  h.push('    </div>');
  h.push('  </header>');
  h.push(`  <p class="lead">${inline(m.description)}</p>`);
  if (m.purpose) h.push(`  <p class="purpose">${inline(m.purpose)}</p>`);

  if (Array.isArray(m.whenToUse) && m.whenToUse.length) {
    h.push('  <section class="guidance use">');
    h.push('    <h4>When to use</h4>');
    h.push('    <ul>');
    for (const it of m.whenToUse) {
      h.push(`      <li><strong>${inline(it.title)}.</strong> ${inline(it.body)}</li>`);
    }
    h.push('    </ul>');
    h.push('  </section>');
  }

  if (Array.isArray(m.antiPatterns) && m.antiPatterns.length) {
    h.push('  <section class="guidance avoid">');
    h.push('    <h4>When not to use</h4>');
    h.push('    <ul>');
    for (const it of m.antiPatterns) {
      h.push(`      <li><strong>${inline(it.title)}.</strong> ${inline(it.body)}</li>`);
    }
    h.push('    </ul>');
    h.push('  </section>');
  }

  h.push('  <section class="authoring">');
  h.push('    <h4>Authoring</h4>');
  h.push(`    <pre class="code"><code>${esc(m.skeleton.replace(/\n$/, ''))}</code></pre>`);
  h.push('  </section>');

  if (m.slots && Object.keys(m.slots).length) {
    h.push('  <section class="slots">');
    h.push('    <h4>Slots</h4>');
    h.push('    <table>');
    h.push('      <thead><tr><th>Slot</th><th>Selector</th><th>Required</th><th>Description</th></tr></thead>');
    h.push('      <tbody>');
    for (const [name, slot] of Object.entries(m.slots)) {
      const req = slot.required
        ? '<span class="req yes">yes</span>'
        : '<span class="req no">no</span>';
      h.push(`        <tr><td><code>${esc(name)}</code></td><td><code>${esc(slot.selector)}</code></td><td>${req}</td><td>${inline(slot.description)}</td></tr>`);
    }
    h.push('      </tbody>');
    h.push('    </table>');
    h.push('  </section>');
  }

  if (m.anatomyBlock) {
    h.push('  <section class="anatomy">');
    h.push('    <h4>Anatomy</h4>');
    h.push(`    <pre class="ascii"><code>${esc(resolveAnatomy(m.anatomyBlock))}</code></pre>`);
    h.push('  </section>');
  }

  const variantDocs = m.variantDocs || {};
  const variantKeys = Array.isArray(m.variants) ? m.variants.filter((v) => variantDocs[v]) : [];
  if (variantKeys.length) {
    h.push('  <section class="variants">');
    h.push('    <h4>Variants</h4>');
    for (const v of variantKeys) {
      const vd = variantDocs[v];
      const label = vd.label ? ` — ${esc(vd.label)}` : '';
      h.push('    <div class="variant">');
      h.push(`      <h5><code>${esc(v)}</code>${label}</h5>`);
      h.push(`      <p>${inline(vd.caption)}</p>`);
      h.push(`      <pre class="code"><code>${esc(vd.sample.replace(/\n$/, ''))}</code></pre>`);
      h.push('    </div>');
    }
    h.push('  </section>');
  }

  if (Array.isArray(m.related) && m.related.length) {
    h.push('  <section class="related">');
    h.push('    <h4>Related</h4>');
    h.push('    <ul class="related-list">');
    for (const r of m.related) {
      h.push(`      <li><a class="chip" href="#c-${esc(r.name)}">${esc(r.name)}</a> <span>${inline(r.when)}</span></li>`);
    }
    h.push('    </ul>');
    h.push('  </section>');
  }

  const gh = galleryHref(m);
  if (gh) {
    h.push('  <section class="demo">');
    h.push(`    <a class="gallery-link" href="${esc(gh)}">View rendered gallery →</a>`);
    h.push('  </section>');
  }

  h.push('</article>');
  return h.join('\n');
}

// ── HTML: page assembly ─────────────────────────────────────────────────────
function renderPortalHtml(manifests) {
  const grouped = groupByBucket(manifests);
  const orderedBuckets = BUCKETS.filter((b) => (grouped[b] || []).length);
  const total = manifests.length;

  const nav = [];
  for (const bucket of orderedBuckets) {
    const members = sortedMembers(grouped[bucket]);
    nav.push('      <div class="nav-bucket">');
    nav.push(`        <a class="nav-bucket-head" href="#b-${bucket}"><span>${esc(bucketTitle(bucket))}</span><span class="count">${members.length}</span></a>`);
    nav.push('        <ul>');
    for (const m of members) {
      nav.push(`          <li><a href="#${componentId(m)}" data-target="${componentId(m)}">${esc(m.name)}</a></li>`);
    }
    nav.push('        </ul>');
    nav.push('      </div>');
  }

  const sections = [];
  for (const bucket of orderedBuckets) {
    const members = sortedMembers(grouped[bucket]);
    sections.push(`    <section class="bucket" id="b-${bucket}">`);
    sections.push('      <header class="bucket-head">');
    sections.push(`        <h2>${esc(bucketTitle(bucket))}</h2>`);
    sections.push(`        <p>${esc(bucketTagline(bucket))}</p>`);
    sections.push('      </header>');
    for (const m of members) sections.push(renderComponent(m));
    sections.push('    </section>');
  }

  const palettes = resolvePalettes();
  const options = palettes
    .map((p) => {
      const label = p.singleMode ? `${tc(p.name)} (dark)` : tc(p.name);
      return `        <option value="${p.name}">${esc(label)}</option>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" data-palette="indaco" data-mode="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lattice · Component Reference</title>
<meta name="description" content="Canonical, themable reference for every Lattice slide component, generated from the component manifests.">
<style>
${buildStyle()}
</style>
</head>
<body>
<button class="nav-toggle" aria-label="Toggle navigation" onclick="document.body.classList.toggle('nav-open')">☰</button>
<div class="layout">
  <aside class="sidebar">
    <div class="brand">
      <a href="#top" class="brand-mark">Lattice</a>
      <p class="brand-sub">Component Reference</p>
    </div>
    <div class="controls">
      <label class="palette-field">
        <span>Palette</span>
        <select id="palette" aria-label="Palette">
${options}
        </select>
      </label>
      <button class="theme-toggle" id="theme-toggle" aria-label="Toggle light / dark" title="Toggle light / dark"></button>
    </div>
    <input type="search" class="filter" id="filter" placeholder="Filter components…" aria-label="Filter components">
    <nav class="nav">
${nav.join('\n')}
    </nav>
    <footer class="sidebar-foot">
      <span>${total} components · ${orderedBuckets.length} buckets</span>
      <span class="gen">Generated from manifests — do not edit by hand.</span>
    </footer>
  </aside>
  <main class="content" id="top">
    <header class="hero">
      <p class="eyebrow">Boardroom-quality slides from Markdown</p>
      <h1>Component Reference</h1>
      <p class="hero-lead">Every Lattice layout, modifier, and substance contract — when to reach for it, how to author it, and what it composes with. Generated from the component manifests, the single source of truth. Pick any Lattice palette above to preview the reference in its own tokens.</p>
    </header>
${sections.join('\n')}
    <footer class="content-foot">
      <p>Lattice — the engine layer of SlideWright. The visual contract is <code>lattice.css</code>; palettes supply the tokens. See <code>reference/design-system.md</code> for the Function · Form · Substance · Finish model, and <code>reference/components.md</code> for the plain-Markdown edition of this reference.</p>
    </footer>
  </main>
</div>
<script>
${SCRIPT}
</script>
</body>
</html>
`;
}

// ── Inline CSS — Lattice visual contract ──────────────────────────────────
// Color tokens are injected per palette/mode (PALETTE_BLOCKS placeholder);
// :root carries structural tokens + a light-indaco fallback so the page is
// styled even before the palette blocks match.
const BASE_STYLE = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Outfit', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;

  /* Fallback palette (indaco light) — overridden by the palette blocks. */
  --bg: #FFFFFF;
  --bg-alt: #F2F5FA;
  --border: #E4EAF2;
  --text-heading: #0A1628;
  --text-body: #1E3A5F;
  --text-muted: #6B7F9A;
  --accent: #006FA8;
  --accent-soft: #EFF6FC;
  --bg-dark: #003D66;

  --sidebar-w: 300px;
}

/* Derived + mode-level (palette-agnostic) tokens. */
:root, html[data-mode="light"] {
  --bg-sidebar: var(--bg-alt);
  --pass: #2E7D32;
  --fail: #C20000;
  --shadow: 0 1px 2px rgba(10, 22, 40, 0.04), 0 8px 24px rgba(10, 22, 40, 0.06);
}
html[data-mode="dark"] {
  --bg-sidebar: var(--bg-alt);
  --pass: #6FCF7E;
  --fail: #FF8A8A;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.35);
}

/*__PALETTE_BLOCKS__*/

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--font-body);
  font-weight: 400;
  color: var(--text-body);
  background: var(--bg);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
code { font-family: var(--font-mono); font-size: 0.88em; }

.layout { display: flex; align-items: flex-start; }

/* ── Sidebar ──────────────────────────────────────────────────────── */
.sidebar {
  position: sticky;
  top: 0;
  width: var(--sidebar-w);
  flex: 0 0 var(--sidebar-w);
  height: 100vh;
  overflow-y: auto;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  padding: 28px 22px 20px;
  display: flex;
  flex-direction: column;
}

.brand { margin-bottom: 16px; }
.brand-mark {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 700;
  color: var(--text-heading);
  text-decoration: none;
  letter-spacing: -0.01em;
}
.brand-sub {
  margin: 2px 0 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.controls {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 14px;
}
.palette-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.palette-field span {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
}
.palette-field select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-body);
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
}
.palette-field select:focus { outline: none; border-color: var(--accent); }
.theme-toggle {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-body);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
.theme-toggle::before { content: '☾'; }
html[data-mode="dark"] .theme-toggle::before { content: '☀'; }

.filter {
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-body);
  font-family: var(--font-body);
  font-size: 13px;
}
.filter:focus { outline: none; border-color: var(--accent); }

.nav { flex: 1; }
.nav-bucket { margin-bottom: 14px; }
.nav-bucket.hidden { display: none; }
.nav-bucket-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-muted);
  padding: 4px 8px;
}
.nav-bucket-head .count {
  font-size: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1px 7px;
  letter-spacing: 0;
}
.nav-bucket ul { list-style: none; margin: 4px 0 0; padding: 0; }
.nav-bucket li.hidden { display: none; }
.nav-bucket li a {
  display: block;
  padding: 4px 10px 4px 14px;
  font-size: 13px;
  text-decoration: none;
  color: var(--text-body);
  border-left: 2px solid transparent;
  border-radius: 0 6px 6px 0;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.nav-bucket li a:hover { background: var(--accent-soft); color: var(--accent); }
.nav-bucket li a.active {
  color: var(--accent);
  border-left-color: var(--accent);
  background: var(--accent-soft);
  font-weight: 500;
}

.sidebar-foot {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  font-size: 10.5px;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.sidebar-foot .gen { opacity: 0.7; }

/* ── Content ──────────────────────────────────────────────────────── */
.content {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 920px;
  margin: 0 auto;
  padding: 56px 56px 96px;
}

.hero { margin-bottom: 56px; }
.hero .eyebrow {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 12px;
}
.hero h1 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 52px;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--text-heading);
  margin: 0 0 16px;
}
.hero-lead { font-size: 18px; max-width: 62ch; color: var(--text-body); margin: 0; }

.bucket { margin-bottom: 24px; scroll-margin-top: 20px; }
.bucket-head {
  border-bottom: 2px solid var(--border);
  padding-bottom: 10px;
  margin: 48px 0 8px;
}
.bucket-head h2 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 30px;
  color: var(--text-heading);
  margin: 0;
  letter-spacing: -0.01em;
}
.bucket-head p { margin: 4px 0 0; color: var(--text-muted); font-size: 15px; }

/* ── Component ────────────────────────────────────────────────────── */
.component {
  scroll-margin-top: 20px;
  padding: 28px 0;
  border-bottom: 1px solid var(--border);
}
.component.hidden { display: none; }
.component-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.component-head h3 {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 22px;
  color: var(--text-heading);
  margin: 0;
}
.ffs { display: flex; gap: 6px; flex-wrap: wrap; }
.ffs-pill {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--border);
}

.lead { font-size: 17px; color: var(--text-heading); margin: 12px 0 0; font-weight: 500; }
.purpose { margin: 10px 0 0; color: var(--text-body); }

.component h4 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin: 26px 0 10px;
  font-weight: 600;
}

.guidance ul { list-style: none; margin: 0; padding: 0; }
.guidance li {
  position: relative;
  padding: 6px 0 6px 26px;
  font-size: 14.5px;
}
.guidance li::before {
  position: absolute;
  left: 0;
  top: 6px;
  font-weight: 700;
}
.guidance.use li::before { content: '✓'; color: var(--pass); }
.guidance.avoid li::before { content: '✕'; color: var(--fail); }
.guidance li strong { color: var(--text-heading); }

pre.code, pre.ascii {
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
  overflow-x: auto;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-heading);
}
pre.code code, pre.ascii code { font-size: inherit; white-space: pre; }
pre.ascii { font-size: 11px; line-height: 1.35; }

table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
thead th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  background: var(--bg-alt);
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
tbody td { padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
tbody tr:last-child td { border-bottom: none; }
.req { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 8px; }
.req.yes { color: var(--pass); background: color-mix(in srgb, var(--pass) 12%, transparent); }
.req.no { color: var(--text-muted); background: var(--bg-alt); }

.variant { margin-bottom: 16px; }
.variant h5 { font-size: 14px; margin: 0 0 6px; color: var(--text-heading); font-weight: 600; }
.variant p { margin: 0 0 8px; font-size: 14px; }

.related-list { list-style: none; margin: 0; padding: 0; }
.related-list li { padding: 5px 0; font-size: 14px; }
.chip {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid var(--border);
  text-decoration: none;
  margin-right: 6px;
}
.chip:hover { border-color: var(--accent); }
.related-list span { color: var(--text-muted); }

.demo { margin-top: 22px; }
.gallery-link { font-size: 13px; font-weight: 500; color: var(--accent); text-decoration: none; }
.gallery-link:hover { text-decoration: underline; }

.content-foot {
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-muted);
}

.nav-toggle {
  display: none;
  position: fixed;
  top: 14px;
  left: 14px;
  z-index: 30;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-heading);
  font-size: 18px;
  cursor: pointer;
  box-shadow: var(--shadow);
}

/* ── Responsive ───────────────────────────────────────────────────── */
@media (max-width: 880px) {
  .nav-toggle { display: block; }
  .sidebar {
    position: fixed;
    z-index: 25;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    box-shadow: var(--shadow);
  }
  body.nav-open .sidebar { transform: translateX(0); }
  .content { padding: 72px 24px 80px; }
  .hero h1 { font-size: 38px; }
}`;

function buildStyle() {
  return BASE_STYLE.replace('/*__PALETTE_BLOCKS__*/', paletteCss());
}

// ── Inline JS — palette select, mode toggle, scroll-spy, filter ────────────
const SCRIPT = `(function () {
  var root = document.documentElement;
  var MODE_KEY = 'lattice-docs-mode';
  var PALETTE_KEY = 'lattice-docs-palette';
  var palettes = Array.prototype.map.call(document.querySelectorAll('#palette option'), function (o) { return o.value; });

  // Palette: stored choice wins, else the default baked into the markup.
  var storedPalette = null;
  try { storedPalette = localStorage.getItem(PALETTE_KEY); } catch (e) {}
  if (storedPalette && palettes.indexOf(storedPalette) !== -1) {
    root.setAttribute('data-palette', storedPalette);
  }
  var select = document.getElementById('palette');
  if (select) {
    select.value = root.getAttribute('data-palette');
    select.addEventListener('change', function () {
      root.setAttribute('data-palette', select.value);
      try { localStorage.setItem(PALETTE_KEY, select.value); } catch (e) {}
    });
  }

  // Mode: stored choice wins, else follow OS preference.
  var storedMode = null;
  try { storedMode = localStorage.getItem(MODE_KEY); } catch (e) {}
  if (storedMode === 'light' || storedMode === 'dark') {
    root.setAttribute('data-mode', storedMode);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-mode', 'dark');
  }
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-mode', next);
      try { localStorage.setItem(MODE_KEY, next); } catch (e) {}
    });
  }

  // Scroll-spy: the active component is the last one whose top has scrolled
  // past a threshold line near the viewport top. Deterministic under both
  // gradual scrolling and big anchor jumps.
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-bucket li a[data-target]'));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('data-target')] = a; });
  var articles = Array.prototype.slice.call(document.querySelectorAll('article.component'));
  var current = null;
  var THRESHOLD = 120;

  function updateSpy() {
    var activeId = articles.length ? articles[0].id : null;
    for (var i = 0; i < articles.length; i++) {
      if (articles[i].getBoundingClientRect().top <= THRESHOLD) activeId = articles[i].id;
      else break;
    }
    if (!activeId || activeId === current) return;
    if (current && byId[current]) byId[current].classList.remove('active');
    var link = byId[activeId];
    if (link) {
      link.classList.add('active');
      var nav = document.querySelector('.nav');
      if (link.offsetTop < nav.scrollTop || link.offsetTop > nav.scrollTop + nav.clientHeight) {
        link.scrollIntoView({ block: 'nearest' });
      }
    }
    current = activeId;
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { updateSpy(); ticking = false; });
  }, { passive: true });
  updateSpy();

  // Filter components by name or description. Nav links and article
  // panels share the same match so the two stay in sync.
  var filter = document.getElementById('filter');
  if (filter) {
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      document.querySelectorAll('article.component').forEach(function (art) {
        var name = art.id.replace(/^c-/, '');
        var lead = art.querySelector('.lead');
        var desc = lead ? lead.textContent.toLowerCase() : '';
        var match = !q || name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
        art.classList.toggle('hidden', !match);
        var navLi = byId['c-' + name] ? byId['c-' + name].parentElement : null;
        if (navLi) navLi.classList.toggle('hidden', !match);
      });
      document.querySelectorAll('.nav-bucket').forEach(function (b) {
        var anyVisible = Array.prototype.some.call(b.querySelectorAll('li'), function (li) { return !li.classList.contains('hidden'); });
        b.classList.toggle('hidden', !anyVisible);
      });
    });
  }

  // Close mobile nav after picking a component.
  document.querySelector('.nav').addEventListener('click', function (e) {
    if (e.target.closest('a')) document.body.classList.remove('nav-open');
  });
})();`;

// ── Markdown: single canonical document ─────────────────────────────────────

/** Add `by` levels to every ATX heading, skipping fenced code blocks. */
function demoteHeadings(md, by) {
  let inFence = false;
  return md
    .split('\n')
    .map((line) => {
      if (/^```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const m = line.match(/^(#{1,6}) (.*)$/);
      if (!m) return line;
      const level = Math.min(6, m[1].length + by);
      return `${'#'.repeat(level)} ${m[2]}`;
    })
    .join('\n');
}

/** Rewrite the cross-file links in a generated docs.md body so they resolve
 *  from reference/components.md: related → in-page anchors, design-system →
 *  sibling reference/, gallery → the rendered light PDF. */
function rewriteLinks(md, m) {
  let out = md.replace(/\]\(\.\.\/([a-z0-9-]+)\/\1\.docs\.md\)/g, '](#$1)');
  out = out.replace(/\]\(\.\.\/\.\.\/docs\/([^)]+)\)/g, '](./$1)');
  const gh = galleryHref(m);
  if (gh) out = out.replace(/\]\(\.\/[a-z0-9-]+\.gallery\.pdf\)/g, `](${gh})`);
  return out;
}

function renderPortalMd(manifests) {
  const grouped = groupByBucket(manifests);
  const orderedBuckets = BUCKETS.filter((b) => (grouped[b] || []).length);

  const out = [];
  out.push('# Lattice — Component Reference');
  out.push('');
  out.push('> Canonical reference for every Lattice slide component, aggregated from the component manifests (the single source of truth). Generated by `tools/build-docs-portal.js` — do not edit by hand; edit the manifests and re-run `npm run docs:portal`.');
  out.push('');
  out.push(`**${manifests.length} components · ${orderedBuckets.length} buckets.** For the themable, browsable edition see [components.html](./components.html).`);
  out.push('');
  out.push('## Contents');
  out.push('');
  for (const bucket of orderedBuckets) {
    out.push(`- [${bucketTitle(bucket)}](#${bucket}) — ${bucketTagline(bucket)}`);
    for (const m of sortedMembers(grouped[bucket])) {
      out.push(`  - [\`${m.name}\`](#${m.name})`);
    }
  }
  out.push('');

  for (const bucket of orderedBuckets) {
    out.push(`## ${bucketTitle(bucket)}`);
    out.push('');
    out.push(`*${bucketTagline(bucket)}*`);
    out.push('');
    for (const m of sortedMembers(grouped[bucket])) {
      // renderDocs starts at `# name`; demote by 2 so it nests under the
      // bucket h2 as `### name`, then rewrite cross-file links.
      let body = renderDocs(m);
      body = demoteHeadings(body, 2);
      body = rewriteLinks(body, m);
      out.push(body.trimEnd());
      out.push('');
    }
  }

  return `${out.join('\n')}\n`;
}

// ── CLI ────────────────────────────────────────────────────────────────────
function build() {
  const manifests = loadAll();
  return {
    html: renderPortalHtml(manifests),
    md: renderPortalMd(manifests),
    count: manifests.length,
  };
}

function isStale(file, content) {
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  return current !== content;
}

function main(argv) {
  const check = argv.includes('--check');
  const { html, md, count } = build();
  const targets = [
    { file: HTML_FILE, content: html, label: 'reference/components.html' },
    { file: MD_FILE, content: md, label: 'reference/components.md' },
  ];

  if (check) {
    const stale = targets.filter((t) => isStale(t.file, t.content));
    if (stale.length) {
      for (const t of stale) {
        process.stderr.write(`stale: ${t.label} — run \`node tools/build-docs-portal.js\` to regenerate.\n`);
      }
      return 1;
    }
    process.stdout.write('docs portal up to date.\n');
    return 0;
  }

  let wrote = 0;
  for (const t of targets) {
    if (isStale(t.file, t.content)) {
      fs.writeFileSync(t.file, t.content);
      process.stdout.write(`wrote ${t.label}\n`);
      wrote += 1;
    }
  }
  if (!wrote) process.stdout.write('no changes (docs portal up to date).\n');
  else process.stdout.write(`${count} components, ${listBasePalettes().length} palettes.\n`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = {
  renderPortalHtml,
  renderPortalMd,
  renderComponent,
  resolvePalettes,
  listBasePalettes,
  build,
  HTML_FILE,
  MD_FILE,
};
