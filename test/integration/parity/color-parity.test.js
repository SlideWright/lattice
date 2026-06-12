/**
 * Integration: cross-renderer COLOUR parity.
 *
 * The structural parity gate (parity.test.js) proves the renderers agree on
 * slide COUNT. This proves they agree on COLOUR — the guarantee the universal
 * token system needs but nothing else asserts: that a token resolves to the
 * SAME value through the emulator's offline resolver
 * (lib/core/resolve-token-expr.js, the twin of getComputedStyle) and through a
 * REAL marp-cli-rendered DOM read by a real browser's getComputedStyle. A
 * rename that points a render path at a name one theme spells differently, or a
 * resolver that drifts from the browser's colour math, fails here instead of
 * shipping an off-brand diagram.
 *
 * The deck is rendered by marp-cli (so the cascade is the real Marpit one —
 * tokens on `section`, not a hand-injected `:root`; the latter does NOT
 * reproduce production and gives false negatives on alias-to-alias custom
 * properties). Two checks:
 *   1. Every bridge-fed token (the ones the Mermaid bridge reads) resolves to
 *      the EXACT same RGB in both renderers, indaco + cuoio, light + dark.
 *   2. The resolver's color-mix() evaluation tracks Chromium within a couple of
 *      levels (forward-looking: guards re-derivation / the chart triad flowing
 *      through the bridge).
 *
 * Needs marp-cli + a Chromium (CHROME_PATH or the puppeteer cache) — same as the
 * other integration tests. See engineering/decisions/2026-06-11-universal-token-system.md.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const puppeteer = require('puppeteer');
const { resolveTokenExpr } = require('../../../lib/core/resolve-token-expr');

const ROOT = path.join(__dirname, '..', '..', '..');
const LATTICE_CSS_FILE = path.join(ROOT, 'dist', 'lattice.css');
const MARP_CFG = path.join(ROOT, 'marp.config.js');

/** Best-effort Chromium path — mirrors tools/screenshot.js. */
function resolveChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const root of [path.join(os.homedir(), '.cache', 'puppeteer', 'chrome'), '/root/.cache/puppeteer/chrome']) {
    if (!fs.existsSync(root)) continue;
    for (const build of fs.readdirSync(root).filter(d => d.startsWith('linux-')).sort().reverse()) {
      const bin = path.join(root, build, 'chrome-linux64', 'chrome');
      if (fs.existsSync(bin)) return bin;
    }
  }
  return undefined;
}

/** Raw :root token map — mirrors the emulator's parsePaletteVars extraction. */
function rawRootVars(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  for (const block of stripped.match(/:root\s*\{[^}]*\}/g) || []) {
    for (const d of block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || []) {
      const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  return vars;
}

/** Render a one-slide probe deck for `theme` to HTML via the real marp-cli. */
function renderProbeHtml(theme) {
  const md = path.join(os.tmpdir(), `cp-${theme}-${process.pid}.md`);
  const html = path.join(os.tmpdir(), `cp-${theme}-${process.pid}.html`);
  fs.writeFileSync(md, `---\nmarp: true\ntheme: ${theme}\n---\n\n# probe\n\ntext\n`);
  // `--config-file` lets marp.config.js's themeSet (lattice engine + every
  // theme under themes/) register `theme:`; adding `--theme-set` instead
  // REPLACES that set and the named theme drops out → no tokens.
  execFileSync('npx', ['--no-install', 'marp', '--config-file', MARP_CFG,
    '--allow-local-files', '-o', html, md],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, env: { ...process.env } });
  return html;
}

// The bridge-fed tokens (what the Mermaid bridge reads), now under the universal
// vocabulary. All flat `light-dark()` → exact match expected.
const BRIDGE_TOKENS = [
  ...Array.from({ length: 12 }, (_, i) => `cat-${i + 1}-fill`),
  ...Array.from({ length: 12 }, (_, i) => `cat-${i + 1}-mark`),
  'cat-on-fill', 'cat-on-mark',
  'diagram-stroke', 'diagram-line',
  'diagram-active', 'diagram-active-mark', 'diagram-done', 'diagram-done-mark',
  'diagram-critical', 'diagram-critical-mark', 'diagram-today', 'diagram-note',
  'bg', 'bg-alt', 'surface-inverse', 'text-heading',
];

const THEMES = ['indaco', 'cuoio'];
const MODES = [['light', false], ['dark', true]];

describe('color-parity (emulator resolver ↔ real marp DOM getComputedStyle)', () => {
  let browser;
  const html = {};
  const raw = {};

  before(async () => {
    for (const theme of THEMES) {
      html[theme] = renderProbeHtml(theme);
      raw[theme] = rawRootVars(`${fs.readFileSync(LATTICE_CSS_FILE, 'utf8')}\n${fs.readFileSync(path.join(ROOT, 'themes', `${theme}.css`), 'utf8')}`);
    }
    browser = await puppeteer.launch({
      executablePath: resolveChrome(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });
  after(async () => { if (browser) await browser.close(); });

  /** Used-value RGB of an expression on the slide section, via a 1px canvas
   * (format-agnostic: handles rgb(), oklab(), color(srgb …)). */
  async function usedRgb(page, mode, expr) {
    return page.evaluate((m, e) => {
      const sec = document.querySelector('section');
      sec.style.colorScheme = m;
      sec.style.color = '';
      sec.style.color = e;
      const c = getComputedStyle(sec).color;
      const cv = document.createElement('canvas'); cv.width = cv.height = 1;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    }, mode, expr);
  }

  for (const theme of THEMES) {
    for (const [mode, isDark] of MODES) {
      test(`${theme}/${mode}: every bridge token resolves to the same RGB in both renderers`,
        { timeout: 120000 },
        async () => {
          const page = await browser.newPage();
          await page.goto(`file://${html[theme]}`, { waitUntil: 'load', timeout: 60000 });
          const drift = [];
          for (const tok of BRIDGE_TOKENS) {
            const emuHex = resolveTokenExpr(raw[theme][tok], raw[theme], isDark);
            const emu = emuHex ? await usedRgb(page, mode, emuHex) : null; // canvas-normalize the emulator literal too
            const br = await usedRgb(page, mode, `var(--${tok})`);
            if (!emu) { drift.push(`--${tok}: emulator did not resolve (${raw[theme][tok]})`); continue; }
            if (emu.some((c, i) => c !== br[i])) drift.push(`--${tok}: emulator ${emuHex}→${emu} vs browser ${br}`);
          }
          await page.close();
          assert.deepEqual(drift, [], `cross-renderer colour drift (${theme}/${mode}):\n${drift.join('\n')}`);
        });
    }
  }

  test('color-mix() evaluation tracks Chromium (±3 per channel)',
    { timeout: 60000 },
    async () => {
      const exprs = [
        'color-mix(in oklab, #0a6ce0 24%, #ffffff)',
        'color-mix(in oklab, #c2790a 40%, #000000)',
        'color-mix(in oklab, #1e9e48 58%, #000000)',
        'color-mix(in srgb, #112233 50%, #ffffff)',
      ];
      const page = await browser.newPage();
      await page.goto(`file://${html.indaco}`, { waitUntil: 'load', timeout: 60000 });
      const drift = [];
      for (const e of exprs) {
        const emu = await usedRgb(page, 'light', resolveTokenExpr(e, {}, false));
        const br = await usedRgb(page, 'light', e);
        const delta = Math.max(...emu.map((c, i) => Math.abs(c - br[i])));
        if (delta > 3) drift.push(`${e}: emulator ${emu} vs browser ${br} (Δ${delta})`);
      }
      await page.close();
      assert.deepEqual(drift, [], `color-mix drift:\n${drift.join('\n')}`);
    });
});
