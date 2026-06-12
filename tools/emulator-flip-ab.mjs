// Emulator flip-safety A/B — render every deck through the emulator's TWO
// internal paths (the default bespoke `parseSlide` and the engine-backed path
// behind LATTICE_EMULATOR_ENGINE=1), rasterize, and per-page md5-diff them.
//
// WHY (P2 step c → d). Before the default flips to the engine path and
// `parseSlide` is deleted, every rendered-pixel divergence between the two
// paths must be triaged to: regression (block), improvement (engine is
// GFM/marp-correct where parseSlide was lenient), or noise (sub-pixel). This
// harness enumerates the divergences so the triage is exhaustive, and becomes
// the gate that guards the flip. See
// engineering/decisions/2026-06-11-emulator-on-engine-p2.md.
//
// Usage:
//   node tools/emulator-flip-ab.mjs [--palette indaco] [--dark] [--dpi 72] [deck.md …]
//   node tools/emulator-flip-ab.mjs                 # full corpus (galleries + baseline + jargon)
//   node tools/emulator-flip-ab.mjs --json out.json # also write a machine report
//
// Exit code is the number of decks with at least one differing page (0 = clean).

import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.scratch', 'flip-ab');
const EMU = join(ROOT, 'lattice-emulator.js');

function resolveChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  try {
    return execSync('ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome 2>/dev/null | head -1', {
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
}

function galleryDecks() {
  const out = [];
  (function walk(dir) {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.gallery.md')) out.push(p);
    }
  })(join(ROOT, 'lib/components'));
  out.push(join(ROOT, 'test/integration/baseline-decks/gallery.md'));
  out.push(join(ROOT, 'examples/gallery-jargon.md'));
  return out.sort();
}

function render(deck, outPdf, palette, engine) {
  const env = { ...process.env, CHROME_PATH: resolveChrome() };
  if (engine) env.LATTICE_EMULATOR_ENGINE = '1';
  else delete env.LATTICE_EMULATOR_ENGINE;
  execFileSync(process.execPath, [EMU, deck, outPdf, palette, '--quiet'], { env, stdio: 'ignore' });
}

// Rasterize a PDF to per-page PNGs under prefix; return sorted page md5s.
function pageHashes(pdf, prefix, dpi) {
  execSync(`pdftoppm -png -r ${dpi} "${pdf}" "${prefix}" 2>/dev/null`);
  const dir = dirname(prefix);
  const base = prefix.slice(dir.length + 1);
  return readdirSync(dir)
    .filter((f) => f.startsWith(base) && f.endsWith('.png'))
    .sort()
    .map((f) => createHash('md5').update(readFileSync(join(dir, f))).digest('hex'));
}

function main() {
  const args = process.argv.slice(2);
  const palette = args.includes('--palette') ? args[args.indexOf('--palette') + 1] : 'indaco';
  const dark = args.includes('--dark');
  const dpi = args.includes('--dpi') ? Number(args[args.indexOf('--dpi') + 1]) : 72;
  const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
  let decks = args.filter((a) => a.endsWith('.md')).map((a) => (a.startsWith('/') ? a : join(process.cwd(), a)));
  if (decks.length === 0) decks = galleryDecks();

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const report = [];
  let dirtyDecks = 0;
  let totalDiffPages = 0;

  for (const deck of decks) {
    const tag = deck.replace(ROOT + '/', '').replace(/[^a-z0-9]+/gi, '_');
    const psPdf = join(OUT, `${tag}.ps.pdf`);
    const enPdf = join(OUT, `${tag}.en.pdf`);
    const pal = dark ? `${palette}-dark` : palette;
    try {
      render(deck, psPdf, pal, false);
      render(deck, enPdf, pal, true);
    } catch (e) {
      report.push({ deck: deck.replace(ROOT + '/', ''), error: String(e.message || e).split('\n')[0] });
      console.log(`✗ ${deck.replace(ROOT + '/', '')} — RENDER ERROR`);
      dirtyDecks++;
      continue;
    }
    const ps = pageHashes(psPdf, join(OUT, `${tag}_ps`), dpi);
    const en = pageHashes(enPdf, join(OUT, `${tag}_en`), dpi);
    const n = Math.max(ps.length, en.length);
    const diffs = [];
    for (let i = 0; i < n; i++) if (ps[i] !== en[i]) diffs.push(i + 1);
    const rel = deck.replace(ROOT + '/', '');
    if (ps.length !== en.length) {
      console.log(`✗ ${rel} — PAGE COUNT ${ps.length} (parseSlide) vs ${en.length} (engine) — STRUCTURAL`);
      report.push({ deck: rel, pages: ps.length, enginePages: en.length, structural: true, diffs });
      dirtyDecks++;
      totalDiffPages += diffs.length;
    } else if (diffs.length) {
      console.log(`• ${rel} — ${ps.length}pp, ${diffs.length} differ: ${diffs.join(' ')}`);
      report.push({ deck: rel, pages: ps.length, diffs });
      dirtyDecks++;
      totalDiffPages += diffs.length;
    } else {
      console.log(`✓ ${rel} — ${ps.length}pp identical`);
      report.push({ deck: rel, pages: ps.length, diffs: [] });
    }
  }

  console.log(
    `\n${decks.length} decks · ${dirtyDecks} with diffs · ${totalDiffPages} differing pages` +
      ` (palette=${dark ? palette + '-dark' : palette}, dpi=${dpi})`,
  );
  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify({ palette, dark, dpi, report }, null, 2));
    console.log(`report → ${jsonOut}`);
  }
  process.exit(dirtyDecks);
}

main();
