// Engine rendering benchmark — the owned lattice-engine, over time.
//
// Built on tinybench (the runner-agnostic benchmark framework that powers
// `vitest bench`): it handles warmup, sampling, and the statistics (mean, p99,
// relative margin of error) so we don't hand-roll timing. Both tiers drive the
// real lib/playground/index.js path the docs surfaces render through, against the
// SAME workloads.
//
// The jargon gallery (examples/gallery-jargon.md) is the baseline "normal"
// workload per the design brief; "stress" multiplies it to a large deck and
// "charts" exercises the chart bucket's runtime transform. This is a MEASUREMENT
// tool, not part of `npm test` (which must stay fast) — run on demand:
//
//   node test/benchmark/engine-bench.mjs            # render tiers
//   node test/benchmark/engine-bench.mjs --export   # + rasterize/export tier
//   node test/benchmark/engine-bench.mjs --json     # machine-readable dump
//
// Marp was retired in P4; the final engine-vs-marp comparison (the owned engine
// rendered 3–5× faster, dated) is recorded in
// engineering/decisions/2026-06-12-p4-regression-gate-retire-marp.md §A. This
// bench now tracks the engine's OWN speed over time — a perf-regression signal,
// not a vs-marp claim.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bench } from 'tinybench';
import latticeEngine from '../../lib/engine/index.js';
import api from '../../lib/playground/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const wantExport = process.argv.includes('--export');
const asJson = process.argv.includes('--json');

// Standalone engine for the HTML-only cost line.
const rawEngine = latticeEngine.createEngine();

const registered = new Set();
function registerTheme(palette) {
  for (const rel of ['dist/lattice.css', `themes/${palette}.css`]) {
    if (registered.has(rel) || !existsSync(join(ROOT, rel))) continue;
    const css = readFileSync(join(ROOT, rel), 'utf8');
    api.addThemes([css]);
    rawEngine.addThemes([css]);
    registered.add(rel);
  }
}

// ── datasets ──────────────────────────────────────────────────────────────────
const jargon = readFileSync(join(ROOT, 'examples/gallery-jargon.md'), 'utf8');

// Stress = the jargon body repeated to a large deck, keeping one front-matter
// block (split on the `---` slide separators, not the front matter).
function stressDeck(times) {
  const fmEnd = jargon.indexOf('\n---\n', jargon.indexOf('---') + 3);
  return jargon.slice(0, fmEnd) + Array.from({ length: times }, () => jargon.slice(fmEnd)).join('\n');
}

const datasets = [
  { name: 'normal (jargon)', src: jargon, theme: 'crepuscolo' },
  { name: 'charts', src: readFileSync(join(ROOT, 'lib/components/chart/chart.gallery.md'), 'utf8'), theme: 'indaco' },
  { name: 'stress (jargon x6)', src: stressDeck(6), theme: 'crepuscolo' },
];
for (const d of datasets) {
  registerTheme(d.theme);
  d.slides = (rawEngine.render(d.src, d.theme).html.match(/<\/section>/g) || []).length;
}

const mean = (task) => task.result.latency.mean; // ms

// ── render tier ───────────────────────────────────────────────────────────────
async function renderTier() {
  const main = new Bench({ name: 'render', warmup: true, time: 1500, iterations: 8 });
  for (const d of datasets) {
    main.add(d.name, () => api.render(d.src, d.theme));
  }
  await main.run();
  console.log('\n=== RENDER · full path (markdown → HTML+CSS) ===');
  console.table(main.table());

  // Interpreted summary: ms + slide throughput.
  console.log('\n=== SUMMARY ===');
  console.log(`${'dataset'.padEnd(20)}${'slides'.padStart(7)}${'ms'.padStart(10)}${'slides/s'.padStart(11)}`);
  const summary = [];
  for (const d of datasets) {
    const l = mean(main.getTask(d.name));
    console.log(
      `${d.name.padEnd(20)}${String(d.slides).padStart(7)}${l.toFixed(1).padStart(10)}${String(Math.round((d.slides / l) * 1000)).padStart(11)}`,
    );
    summary.push({ dataset: d.name, slides: d.slides, ms: l, slidesPerSec: Math.round((d.slides / l) * 1000) });
  }
  return { main: main.table(), summary };
}

// ── export / rasterize tier (lazy puppeteer) ──────────────────────────────────
async function exportTier() {
  const { default: puppeteer } = await import('puppeteer');
  const { execSync } = await import('node:child_process');
  let chrome = process.env.CHROME_PATH;
  if (!chrome || !existsSync(chrome)) {
    try {
      chrome = execSync('ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome 2>/dev/null | head -1', { encoding: 'utf8' }).trim();
    } catch {
      /* default */
    }
  }
  const RUNTIME = readFileSync(join(ROOT, 'dist/lattice-runtime.js'), 'utf8');
  const SLIDE_BOX = '.marpit>section{width:1280px;height:720px}';
  const srcdoc = (html, css) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}${SLIDE_BOX}.marpit>section{display:block;transform:none;margin:0}${css}</style></head><body>${html}<script>${RUNTIME}</script></body></html>`;

  const browser = await puppeteer.launch({ executablePath: chrome || undefined, args: ['--no-sandbox'] });
  // One full export cycle = render → load → screenshot every slide (what the
  // Drawing Board's html-to-image PDF/PPTX export does, server-side).
  async function exportOnce(d) {
    const out = api.render(d.src, d.theme);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setContent(srcdoc(out.html, out.css), { waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {});
    for (const sec of await page.$$('.marpit > section')) await sec.screenshot({ type: 'png' });
    await page.close();
  }
  // Heavy + IO-bound: a few samples is plenty, no warmup. Skip the 481-slide
  // stress deck here — thousands of screenshots would dominate runtime without
  // adding signal; render-tier already covers stress scaling.
  const bench = new Bench({ name: 'export', warmup: false, time: 1, iterations: 2 });
  for (const d of datasets.filter((x) => !x.name.startsWith('stress'))) {
    bench.add(d.name, () => exportOnce(d));
  }
  await bench.run();
  console.log('\n=== EXPORT / RASTERIZE · per-deck screenshot cycle ===');
  console.table(bench.table());
  await browser.close();
  return bench.table();
}

async function main() {
  const render = await renderTier();
  const exp = wantExport ? await exportTier() : null;
  if (asJson) console.log('\n' + JSON.stringify({ render, export: exp }, null, 2));
  console.log('\nDone.' + (wantExport ? '' : ' (pass --export to also time the rasterize tier.)'));
}

main();
