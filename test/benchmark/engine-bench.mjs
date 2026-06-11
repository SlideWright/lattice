// Engine rendering benchmark — marp-core vs the owned lattice-engine.
//
// Built on tinybench (the runner-agnostic benchmark framework that powers
// `vitest bench`): it handles warmup, sampling, and the statistics (mean, p99,
// relative margin of error) so we don't hand-roll timing. Both engines are
// driven through the real lib/playground/index.js paths the Drawing Board
// toggles, against the SAME workloads.
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
// NOTE on the ratio: the lattice path emits its own HTML AND delegates CSS
// packing to marp (engine.render(md).html + marp.render(src).css), so it does
// strictly MORE work than the marp path until the engine ships its own CSS
// emitter (proposal P5). The breakdown bench isolates the engine's HTML cost
// from the shared marp CSS cost so the ratio is interpretable.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marp } from '@marp-team/marp-core';
import { Bench } from 'tinybench';
import latticeEngine from '../../lib/engine/index.js';
import api from '../../lib/playground/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const wantExport = process.argv.includes('--export');
const asJson = process.argv.includes('--json');

// Standalone engines for the HTML-only vs CSS-only cost breakdown.
const rawMarp = new Marp({ html: true, math: 'katex', minifyCSS: false, script: false, inlineSVG: false });
const rawEngine = latticeEngine.createEngine();

const registered = new Set();
function registerTheme(palette) {
  for (const rel of ['dist/lattice.css', `themes/${palette}.css`]) {
    if (registered.has(rel) || !existsSync(join(ROOT, rel))) continue;
    const css = readFileSync(join(ROOT, rel), 'utf8');
    api.addThemes([css]);
    try {
      rawMarp.themeSet.add(css);
    } catch {
      /* dup */
    }
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
  d.slides = (rawMarp.render(`<!-- theme: ${d.theme} -->\n${d.src}`).html.match(/<\/section>/g) || []).length;
}

const mean = (task) => task.result.latency.mean; // ms

// ── render tier ───────────────────────────────────────────────────────────────
async function renderTier() {
  // marp vs lattice, full render path.
  const main = new Bench({ name: 'render', warmup: true, time: 1500, iterations: 8 });
  for (const d of datasets) {
    main.add(`${d.name} · marp`, () => api.render(d.src, d.theme), { beforeAll: () => api.setEngine('marp') });
    main.add(`${d.name} · lattice`, () => api.render(d.src, d.theme), { beforeAll: () => api.setEngine('lattice') });
  }
  await main.run();
  console.log('\n=== RENDER · full path (markdown → HTML+CSS) ===');
  console.table(main.table());

  // Cost breakdown: engine HTML only vs the shared marp CSS pack.
  const split = new Bench({ name: 'breakdown', warmup: true, time: 1500, iterations: 8 });
  for (const d of datasets) {
    const src = `<!-- theme: ${d.theme} -->\n${d.src}`;
    split.add(`${d.name} · engine-HTML`, () => rawEngine.render(d.src));
    split.add(`${d.name} · marp-CSS`, () => rawMarp.render(src).css);
  }
  await split.run();
  console.log('\n=== RENDER · cost breakdown (where the lattice path spends time) ===');
  console.table(split.table());

  // Interpreted summary: ratio + slide throughput.
  console.log('\n=== SUMMARY ===');
  console.log(`${'dataset'.padEnd(20)}${'slides'.padStart(7)}${'marp ms'.padStart(10)}${'lattice ms'.padStart(12)}${'ratio'.padStart(8)}${'marp sl/s'.padStart(11)}${'latt sl/s'.padStart(11)}`);
  const summary = [];
  for (const d of datasets) {
    const m = mean(main.getTask(`${d.name} · marp`));
    const l = mean(main.getTask(`${d.name} · lattice`));
    console.log(
      `${d.name.padEnd(20)}${String(d.slides).padStart(7)}${m.toFixed(1).padStart(10)}${l.toFixed(1).padStart(12)}${(l / m).toFixed(2).concat('x').padStart(8)}${String(Math.round((d.slides / m) * 1000)).padStart(11)}${String(Math.round((d.slides / l) * 1000)).padStart(11)}`,
    );
    summary.push({ dataset: d.name, slides: d.slides, marpMs: m, latticeMs: l, ratio: l / m });
  }
  return { main: main.table(), breakdown: split.table(), summary };
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
  async function exportOnce(eng, d) {
    api.setEngine(eng);
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
    for (const eng of ['marp', 'lattice']) bench.add(`${d.name} · ${eng}`, () => exportOnce(eng, d));
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
