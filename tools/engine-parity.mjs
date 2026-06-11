// Engine visual-parity harness — rasterize every slide of a deck through BOTH
// render engines (marp-core and the owned lattice-engine) and pixel-diff them.
//
// WHY. lattice-engine emits its own HTML but delegates CSS theme-packing to
// marp's packer, so the two should render pixel-identically. The exported PDFs
// confirmed it on one deck (byte-identical but for the writer's random /ID);
// this harness proves it across the whole gallery corpus, which is the true
// parity test. It drives the SAME module the Drawing Board toggles
// (lib/playground/index.js → setEngine('marp'|'lattice')), so it exercises the
// real code paths, then rasterizes through the SAME preview srcdoc the Drawing
// Board uses (frame-css SLIDE_BOX + lattice-runtime.js), so chart/structure
// transforms run exactly as they do live.
//
// Pixel diffing is done IN-BROWSER via canvas getImageData (no pixelmatch/pngjs
// dependency): each engine's slides are screenshot to PNG, then a diff page
// draws both and counts channel-differing pixels. Identical HTML+CSS rasterized
// in one browser is deterministic, so a PASS is an exact 0; any non-zero diff is
// a real, engine-induced divergence to investigate.
//
// Usage:
//   node tools/engine-parity.mjs <deck.md> [<deck2.md> …] [--palette indaco] [--dark]
//   node tools/engine-parity.mjs --galleries           # the full per-component + per-bucket corpus
//   node tools/engine-parity.mjs --jargon              # examples/gallery-jargon.md baseline
//
// Exit code is non-zero if any slide diverges past the threshold, so it can gate.
// Failure diff artifacts (marp / engine / diff PNGs) land in .scratch/parity/.

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import api from '../lib/playground/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.scratch', 'parity');

// A slide diff over this fraction of pixels is a FAIL (channel delta > 8 counts).
const FAIL_FRACTION = 0.0005; // 0.05% of 1280×720 ≈ 460 px

// ── Chromium ──────────────────────────────────────────────────────────────────
function resolveChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  try {
    const found = execSync(
      'ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome 2>/dev/null | head -1',
      { encoding: 'utf8' },
    ).trim();
    if (found) return found;
  } catch {
    /* fall through */
  }
  return undefined; // let puppeteer try its bundled default
}

// ── Theme registration ────────────────────────────────────────────────────────
// Mirror the playground: register the engine bundle (theme name "lattice") plus
// the chosen palette (+ its -dark variant) on BOTH engines.
const themeCache = new Set();
function ensureThemes(palette, dark) {
  const want = ['dist/lattice.css', `themes/${palette}.css`];
  if (dark) want.push(`themes/${palette}-dark.css`);
  const css = [];
  for (const rel of want) {
    if (themeCache.has(rel)) continue;
    const p = join(ROOT, rel);
    if (!existsSync(p)) continue;
    css.push(readFileSync(p, 'utf8'));
    themeCache.add(rel);
  }
  if (css.length) api.addThemes(css);
}

// Front-matter `theme:` directive, else the CLI palette, else indaco.
function paletteFor(md, cliPalette) {
  const m = md.match(/^---[\s\S]*?\btheme:\s*([\w-]+)/m);
  const declared = m?.[1];
  // The engine bundle theme is "lattice"; a deck naming it has no palette of its
  // own, so fall back to the CLI palette / indaco for a real colour set.
  if (declared && declared !== 'lattice') return declared.replace(/-dark$/, '');
  return cliPalette || 'indaco';
}

// ── Rasterize one engine's deck to per-slide PNG buffers ──────────────────────
const SLIDE_BOX = '.marpit>section{width:1280px;height:720px}';
const RUNTIME = readFileSync(join(ROOT, 'dist/lattice-runtime.js'), 'utf8');

function srcdoc(html, css, dark) {
  const bg = dark ? '#0c0c0c' : '#e7e7ea';
  return (
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
    `html,body{margin:0;padding:0;background:${bg};}` +
    SLIDE_BOX +
    // No scaling, no content-visibility: lay every slide out at full 1280×720 so
    // each screenshots cleanly. Drop the live FIT/virtualization the preview adds.
    '.marpit>section{display:block;transform:none;margin:0;box-shadow:none;border-radius:0;}' +
    css +
    '</style></head><body>' +
    html +
    `<script>${RUNTIME}</script>` +
    '</body></html>'
  );
}

async function shoot(browser, html, css, dark) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.setContent(srcdoc(html, css, dark), { waitUntil: 'networkidle0', timeout: 45000 }).catch(() => {});
  try {
    await page.evaluate(() => document.fonts?.ready);
  } catch {
    /* fonts best-effort */
  }
  await new Promise((r) => setTimeout(r, 400)); // settle chart/mermaid transforms
  const secs = await page.$$('.marpit > section');
  const shots = [];
  for (const s of secs) shots.push(Buffer.from(await s.screenshot({ type: 'png' })));
  await page.close();
  return shots;
}

// ── In-browser pixel diff ─────────────────────────────────────────────────────
async function diffPair(page, aBuf, bBuf) {
  const a = 'data:image/png;base64,' + aBuf.toString('base64');
  const b = 'data:image/png;base64,' + bBuf.toString('base64');
  return await page.evaluate(
    async (aUrl, bUrl) => {
      function load(u) {
        return new Promise((res) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = u;
        });
      }
      const [ia, ib] = await Promise.all([load(aUrl), load(bUrl)]);
      if (!ia || !ib) return { diffPx: -1, total: 0, maxCh: 255, w: 0, h: 0 };
      const w = Math.max(ia.width, ib.width);
      const h = Math.max(ia.height, ib.height);
      const mk = (img) => {
        const c = new OffscreenCanvas(w, h);
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, w, h).data;
      };
      const da = mk(ia);
      const db = mk(ib);
      let diffPx = 0;
      let maxCh = 0;
      for (let i = 0; i < da.length; i += 4) {
        const dr = Math.abs(da[i] - db[i]);
        const dg = Math.abs(da[i + 1] - db[i + 1]);
        const dbb = Math.abs(da[i + 2] - db[i + 2]);
        const m = Math.max(dr, dg, dbb);
        if (m > maxCh) maxCh = m;
        if (m > 8) diffPx++;
      }
      return { diffPx, total: w * h, maxCh, w, h };
    },
    a,
    b,
  );
}

// ── Per-deck run ──────────────────────────────────────────────────────────────
async function runDeck(browser, diffPage, deckPath, cliPalette, dark) {
  const md = readFileSync(deckPath, 'utf8');
  const palette = paletteFor(md, cliPalette);
  ensureThemes(palette, dark);
  const themeName = dark && api.hasTheme(palette + '-dark') ? palette + '-dark' : palette;

  api.setEngine('marp');
  const m = api.render(md, themeName);
  api.setEngine('lattice');
  const e = api.render(md, themeName);

  const marpShots = await shoot(browser, m.html, m.css, dark);
  const engineShots = await shoot(browser, e.html, e.css, dark);

  const n = Math.max(marpShots.length, engineShots.length);
  const slides = [];
  let worst = 0;
  for (let i = 0; i < n; i++) {
    if (!marpShots[i] || !engineShots[i]) {
      slides.push({ i, status: 'COUNT_MISMATCH', diffPx: -1 });
      worst = Infinity;
      continue;
    }
    const d = await diffPair(diffPage, marpShots[i], engineShots[i]);
    const frac = d.total ? d.diffPx / d.total : 1;
    const fail = d.diffPx < 0 || frac > FAIL_FRACTION;
    if (frac > worst) worst = frac;
    slides.push({ i, diffPx: d.diffPx, frac, maxCh: d.maxCh, status: fail ? 'FAIL' : 'ok' });
    if (fail) {
      // Key the artifact dir by the deck's REPO-RELATIVE path, not its basename:
      // sibling galleries collide on basename (code/code.gallery.md vs the bucket
      // code.gallery.md both → code_gallery_md) and overwrite each other's PNGs.
      const dir = join(OUT, relative(ROOT, deckPath).replace(/[^\w.-]+/g, '_'));
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `slide${i + 1}.marp.png`), marpShots[i]);
      writeFileSync(join(dir, `slide${i + 1}.engine.png`), engineShots[i]);
    }
  }
  return { deck: relative(ROOT, deckPath), palette: themeName, marp: marpShots.length, engine: engineShots.length, worst, slides };
}

// ── Deck selection ────────────────────────────────────────────────────────────
function galleryDecks() {
  const out = [];
  (function walk(dir) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.gallery.md')) out.push(p);
    }
  })(join(ROOT, 'lib/components'));
  return out.sort();
}

async function main() {
  const args = process.argv.slice(2);
  const dark = args.includes('--dark');
  const pi = args.indexOf('--palette');
  const cliPalette = pi >= 0 ? args[pi + 1] : null;
  let decks = args.filter((a) => a.endsWith('.md')).map((a) => (a.startsWith('/') ? a : join(process.cwd(), a)));
  if (args.includes('--galleries')) decks = galleryDecks();
  if (args.includes('--jargon')) decks.push(join(ROOT, 'examples/gallery-jargon.md'));
  if (!decks.length) {
    console.error('No decks. Pass deck.md paths, --galleries, or --jargon.');
    process.exit(2);
  }

  const browser = await puppeteer.launch({ executablePath: resolveChrome(), args: ['--no-sandbox'] });
  const diffPage = await browser.newPage();
  let anyFail = false;
  const report = [];
  for (const deck of decks) {
    try {
      const r = await runDeck(browser, diffPage, deck, cliPalette, dark);
      report.push(r);
      const failed = r.slides.filter((s) => s.status !== 'ok');
      const tag = r.marp !== r.engine ? `COUNT ${r.marp}≠${r.engine}` : failed.length ? `${failed.length} slide(s) diverge` : 'PARITY';
      const flag = failed.length || r.marp !== r.engine ? '✗' : '✓';
      if (flag === '✗') anyFail = true;
      console.log(`${flag} ${r.deck} [${r.palette}] ${r.marp}pp — ${tag}` + (failed.length ? `: ${failed.map((s) => `#${s.i + 1}(${s.diffPx}px)`).join(', ')}` : ''));
    } catch (err) {
      anyFail = true;
      console.log(`✗ ${relative(ROOT, deck)} — ERROR: ${String(err.message || err)}`);
    }
  }
  await browser.close();
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${report.length} deck(s). Report: ${relative(ROOT, join(OUT, 'report.json'))}. ${anyFail ? 'DIVERGENCES FOUND.' : 'FULL PARITY.'}`);
  process.exit(anyFail ? 1 : 0);
}

main();
