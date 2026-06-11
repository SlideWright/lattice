#!/usr/bin/env node
/**
 * engine-diff — side-by-side visual diff of a deck rendered through marp-core
 * vs the owned lattice-engine, using the SAME render path the Drawing Board /
 * playground use (window.LatticePlayground.render). For each slide it emits a
 * labelled PNG with marp on the left and lattice on the right, plus a computed-
 * style dump for diagnosing cascade/layout divergences.
 *
 * Each column is an isolated iframe (its own <style> + lattice-runtime.js), so
 * marp's prefixed selectors and the engine's raw CSS never cross-contaminate —
 * exactly the isolation the real preview iframe gives.
 *
 *   node tools/engine-diff.js <deck.md> [--slides 0,3,7] [--out .scratch/diff]
 *
 * Renders at hd (1280x720) regardless of the deck's `size:` so screenshots stay
 * review-sized; cqi layout is size-invariant so proportions are identical.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const deckPath = args[0];
if (!deckPath) { console.error('usage: node tools/engine-diff.js <deck.md> [--slides a,b,c] [--out dir]'); process.exit(1); }
const _si = args.indexOf('--slides');
const slidesArg = _si >= 0 ? (args[_si + 1] || '').split(',').filter(Boolean).map(Number) : [];
const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(ROOT, '.scratch', 'engine-diff');
fs.mkdirSync(outDir, { recursive: true });

const chrome = require('node:child_process').execSync(
  'ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome 2>/dev/null | head -1',
).toString().trim();

// Read deck verbatim (keep its real `size:` — the DB forces 1280x720 via
// SLIDE_BOX, so any @size/forced-box conflict must reproduce here too).
const deck = fs.readFileSync(deckPath, 'utf8');
const theme = (deck.match(/^theme:\s*(\S+)/m) || [])[1] || 'lattice';

const latticeCss = fs.readFileSync(path.join(ROOT, 'dist', 'lattice.css'), 'utf8');
const themeCss = fs.readFileSync(path.join(ROOT, 'themes', `${theme}.css`), 'utf8');
const runtime = fs.readFileSync(path.join(ROOT, 'dist', 'lattice-runtime.js'), 'utf8');
const bundle = fs.readFileSync(path.join(ROOT, 'docs', 'public', 'playground', 'lattice-playground.js'), 'utf8');

// Faithful DB frame: the whole deck in ONE document, SLIDE_BOX forcing every
// section to 1280x720 (the playground's real frame rule), runtime at the end.
const SLIDE_BOX = '.marpit>section{width:1280px!important;height:720px!important}';
function deckDoc(css) {
  return '<!doctype html><html><head><meta charset="utf-8"><style>'
    + 'html,body{margin:0;padding:0;background:#fff}' + SLIDE_BOX + css
    + '</style></head><body>__HTML__<scr' + 'ipt>' + runtime + '</scr' + 'ipt></body></html>';
}

async function renderDeckPage(browser, css, html) {
  const p = await browser.newPage();
  // Abort cross-origin requests (Google Fonts, Mermaid CDN): they hang the page
  // and keep the DOM mutating, which deadlocks element screenshots. Layout
  // diagnosis (centering, spacing, collapse) is font-fallback-tolerant.
  await p.setRequestInterception(true);
  p.on('request', (req) => {
    if (/^https?:\/\//.test(req.url())) req.abort().catch(() => {});
    else req.continue().catch(() => {});
  });
  await p.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await p.setContent(deckDoc(css).replace('__HTML__', () => html), { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 1200)); // runtime DOM transforms settle
  return p;
}

// Clip-based screenshot: scroll the section to the top of the viewport and grab
// the 1280x720 region. page.screenshot({clip}) does NOT wait for element
// stability, so it can't deadlock on a still-mutating runtime.
async function shoot(page, i, label) {
  const info = await page.evaluate((idx) => {
    const s = document.querySelectorAll('.marpit > section')[idx];
    if (!s) return null;
    const r = s.getBoundingClientRect();
    const c = getComputedStyle(s);
    return { y: r.top + window.scrollY, x: r.left + window.scrollX, w: r.width, h: r.height,
      display: c.display, justifyContent: c.justifyContent, alignItems: c.alignItems,
      padding: c.padding, containerType: c.containerType, width: c.width, height: c.height };
  }, i);
  if (!info) return null;
  // Clip in PAGE coordinates at the section's absolute position (captureBeyond-
  // Viewport pulls the off-screen region without scrolling/stability waits).
  await page.screenshot({
    path: path.join(outDir, `${label}-${String(i).padStart(2, '0')}.png`),
    captureBeyondViewport: true,
    clip: { x: Math.max(0, info.x), y: Math.max(0, info.y), width: 1280, height: 720 },
  });
  return { display: info.display, justifyContent: info.justifyContent, alignItems: info.alignItems,
    padding: info.padding, containerType: info.containerType, width: info.width, height: info.height,
    box: Math.round(info.w) + 'x' + Math.round(info.h) };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
  });
  const reg = await browser.newPage();
  await reg.goto('about:blank');
  await reg.addScriptTag({ content: bundle });
  // Render through the OWNED engine only — the marp baseline is the committed
  // PDF (examples/<deck>.pdf), rasterized separately; re-rendering marp in this
  // injected context loses its packed token scoping (renders blank).
  const out = await reg.evaluate((lat, thm, name, src) => {
    const PG = window.LatticePlayground;
    PG.addThemes([lat, thm]);
    PG.setEngine('lattice');
    return PG.render(src, name);
  }, latticeCss, themeCss, theme, deck);

  const page = await renderDeckPage(browser, out.css, out.html);
  const classes = await page.$$eval('.marpit > section', (ss) => ss.map((s) => s.className));
  console.log(`engine slides: ${classes.length}`);
  fs.writeFileSync(path.join(outDir, 'manifest.txt'), classes.map((c, i) => `${i}: ${c || '(none)'}`).join('\n'));

  const n = classes.length;
  const want = slidesArg.length ? slidesArg : [...Array(n).keys()];
  const styleDump = {};
  for (const i of want) {
    if (i >= n) continue;
    styleDump[i] = await shoot(page, i, 'lattice');
    fs.writeFileSync(path.join(outDir, 'styles.json'), JSON.stringify(styleDump, null, 2)); // incremental
    process.stdout.write(`\rshot ${i + 1}/${want.length}`);
  }
  console.log(`\nwrote ${want.length} engine slide(s) to ${outDir}`);
  await browser.close();
})();
