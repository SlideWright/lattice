#!/usr/bin/env node
/**
 * Aggregate every component manifest into a single canonical HTML
 * reference portal: a two-panel page with a clickable bucket→component
 * sidebar (with scroll-spy + filter) on the left and the full prose
 * reference for every component on the right.
 *
 * The manifest is the single source of truth — the same fields the
 * per-component docs.md generator (tools/build-component-docs.js) reads.
 * This tool renders them as semantic HTML instead of Markdown, so the
 * portal stays automatically in sync with the docs.md files: both
 * derive from the manifest. Styling mirrors the Lattice visual contract
 * (Playfair Display / Outfit / JetBrains Mono, the indaco light + dark
 * token palettes).
 *
 * Output: docs/components.html (self-contained — fonts via Google Fonts
 * @import, all CSS/JS inline). Deterministic and idempotent: re-running
 * with no manifest change produces byte-identical output.
 *
 * Usage:
 *   node tools/build-docs-portal.js            # build
 *   node tools/build-docs-portal.js --check    # CI gate (stale = exit 1)
 *
 * Exit codes:
 *   0  success (or --check: up to date)
 *   1  --check: portal is stale relative to the manifests
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadAll, groupByBucket, BUCKETS, manifestBucket } = require('../lib/components');
const { BUCKET_BLURBS } = require('./build-bucket-galleries');

const ROOT = path.join(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'lib', 'components');
const ASCII_TOOL = path.join(ROOT, 'tools', 'ascii-preview.py');
const OUT_FILE = path.join(ROOT, 'docs', 'components.html');

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

// ── Text helpers ─────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render the small subset of inline Markdown the manifest prose uses:
 * `code` spans and **bold**. HTML is escaped first, so this is safe on
 * arbitrary manifest text.
 */
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

/**
 * Relative path (from docs/) to a component's light gallery PDF, or null
 * when the deck hasn't been rendered yet.
 */
function galleryHref(m) {
  const bucket = manifestBucket(m);
  const abs = path.join(COMPONENTS_DIR, bucket, m.name, `${m.name}.gallery.light.pdf`);
  if (!fs.existsSync(abs)) return null;
  return path.relative(path.join(ROOT, 'docs'), abs).split(path.sep).join('/');
}

// ── Per-component article ─────────────────────────────────────────────────
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

function bucketTitle(bucket) {
  return tc(bucket);
}

function bucketTagline(bucket) {
  const blurb = BUCKET_BLURBS[bucket] || bucket;
  const idx = blurb.indexOf(' — ');
  return idx >= 0 ? blurb.slice(idx + 3) : blurb;
}

// ── Page assembly ──────────────────────────────────────────────────────────
function renderPortal(manifests) {
  const grouped = groupByBucket(manifests);
  // Stable bucket order: the canonical BUCKETS list, skipping empties.
  const orderedBuckets = BUCKETS.filter((b) => (grouped[b] || []).length);
  const total = manifests.length;

  // Sidebar nav.
  const nav = [];
  for (const bucket of orderedBuckets) {
    const members = grouped[bucket].slice().sort((a, b) => a.name.localeCompare(b.name));
    nav.push('      <div class="nav-bucket">');
    nav.push(`        <a class="nav-bucket-head" href="#b-${bucket}"><span>${esc(bucketTitle(bucket))}</span><span class="count">${members.length}</span></a>`);
    nav.push('        <ul>');
    for (const m of members) {
      nav.push(`          <li><a href="#${componentId(m)}" data-target="${componentId(m)}">${esc(m.name)}</a></li>`);
    }
    nav.push('        </ul>');
    nav.push('      </div>');
  }

  // Content sections.
  const sections = [];
  for (const bucket of orderedBuckets) {
    const members = grouped[bucket].slice().sort((a, b) => a.name.localeCompare(b.name));
    sections.push(`    <section class="bucket" id="b-${bucket}">`);
    sections.push('      <header class="bucket-head">');
    sections.push(`        <h2>${esc(bucketTitle(bucket))}</h2>`);
    sections.push(`        <p>${esc(bucketTagline(bucket))}</p>`);
    sections.push('      </header>');
    for (const m of members) sections.push(renderComponent(m));
    sections.push('    </section>');
  }

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lattice · Component Reference</title>
<meta name="description" content="Canonical reference for every Lattice slide component, generated from the component manifests.">
<style>
${STYLE}
</style>
</head>
<body>
<button class="nav-toggle" aria-label="Toggle navigation" onclick="document.body.classList.toggle('nav-open')">☰</button>
<div class="layout">
  <aside class="sidebar">
    <div class="brand">
      <a href="#top" class="brand-mark">Lattice</a>
      <p class="brand-sub">Component Reference</p>
      <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode" title="Toggle dark mode"></button>
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
      <p class="hero-lead">Every Lattice layout, modifier, and substance contract — when to reach for it, how to author it, and what it composes with. Generated from the component manifests, the single source of truth.</p>
    </header>
${sections.join('\n')}
    <footer class="content-foot">
      <p>Lattice — the engine layer of SlideWright. The visual contract is <code>lattice.css</code>; palettes supply the tokens. See <code>docs/design-system.md</code> for the Function · Form · Substance · Finish model.</p>
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
const STYLE = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Outfit', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;

  --bg: #FFFFFF;
  --bg-alt: #F2F5FA;
  --bg-sidebar: #F7F9FC;
  --border: #E4EAF2;
  --text-heading: #0A1628;
  --text-body: #1E3A5F;
  --text-muted: #6B7F9A;
  --accent: #006FA8;
  --accent-soft: #EFF6FC;
  --canvas: #003D66;
  --pass: #2E7D32;
  --fail: #C20000;
  --sidebar-w: 300px;
  --shadow: 0 1px 2px rgba(10, 22, 40, 0.04), 0 8px 24px rgba(10, 22, 40, 0.06);
}

html[data-theme="dark"] {
  --bg: #001D33;
  --bg-alt: #002847;
  --bg-sidebar: #00253f;
  --border: #0F3A5F;
  --text-heading: #FFFFFF;
  --text-body: #CBD9E8;
  --text-muted: #A0B8D0;
  --accent: #82C8E5;
  --accent-soft: #002847;
  --canvas: #001220;
  --pass: #6FCF7E;
  --fail: #FF8A8A;
  --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.35);
}

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

.brand { position: relative; margin-bottom: 18px; }
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
.theme-toggle {
  position: absolute;
  top: 0;
  right: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-body);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  transition: background 0.15s, border-color 0.15s;
}
.theme-toggle:hover { border-color: var(--accent); color: var(--accent); }
.theme-toggle::before { content: '☾'; }
html[data-theme="dark"] .theme-toggle::before { content: '☀'; }

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
  background: var(--bg-alt);
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
.hero-lead { font-size: 18px; max-width: 60ch; color: var(--text-body); margin: 0; }

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

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}
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
.gallery-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
}
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

// ── Inline JS — scroll-spy, theme toggle, filter ───────────────────────────
const SCRIPT = `(function () {
  var root = document.documentElement;
  var KEY = 'lattice-docs-theme';

  // Theme: stored choice wins, else follow OS preference.
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored === 'light' || stored === 'dark') {
    root.setAttribute('data-theme', stored);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    root.setAttribute('data-theme', 'dark');
  }
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  // Scroll-spy: highlight the nav link for the component in view.
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav-bucket li a[data-target]'));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('data-target')] = a; });
  var current = null;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        if (current && byId[current]) byId[current].classList.remove('active');
        if (byId[id]) {
          byId[id].classList.add('active');
          current = id;
          var nav = document.querySelector('.nav');
          var link = byId[id];
          if (link.offsetTop < nav.scrollTop || link.offsetTop > nav.scrollTop + nav.clientHeight) {
            link.scrollIntoView({ block: 'nearest' });
          }
        }
      }
    });
  }, { rootMargin: '-10% 0px -75% 0px', threshold: 0 });
  document.querySelectorAll('article.component').forEach(function (el) { observer.observe(el); });

  // Filter components by name / description.
  var filter = document.getElementById('filter');
  if (filter) {
    filter.addEventListener('input', function () {
      var q = filter.value.trim().toLowerCase();
      document.querySelectorAll('article.component').forEach(function (art) {
        var name = art.id.replace(/^c-/, '');
        var text = art.textContent.toLowerCase();
        var match = !q || name.indexOf(q) !== -1 || text.indexOf(q) !== -1;
        art.classList.toggle('hidden', !match);
        var navLi = byId['c-' + name] ? byId['c-' + name].parentElement : null;
        if (navLi) navLi.classList.toggle('hidden', !(!q || name.indexOf(q) !== -1));
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

// ── CLI ────────────────────────────────────────────────────────────────────
function build() {
  const manifests = loadAll();
  return renderPortal(manifests);
}

function main(argv) {
  const check = argv.includes('--check');
  const html = build();
  if (check) {
    const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
    if (current !== html) {
      process.stderr.write(`stale: docs/components.html — run \`node tools/build-docs-portal.js\` to regenerate.\n`);
      return 1;
    }
    process.stdout.write('docs/components.html up to date.\n');
    return 0;
  }
  const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
  if (current === html) {
    process.stdout.write('no changes (docs/components.html up to date).\n');
    return 0;
  }
  fs.writeFileSync(OUT_FILE, html);
  process.stdout.write(`wrote docs/components.html (${loadAll().length} components).\n`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { renderPortal, renderComponent, build, OUT_FILE };
