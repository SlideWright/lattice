/**
 * Component SEMANTIC INVARIANTS — render each component's example through the
 * real emulator, then assert on the MEANING of the laid-out DOM rather than its
 * pixels. The deterministic, machine-independent successor to the pixel-golden
 * gate (P4 pivot; see
 * engineering/decisions/2026-06-12-p4-regression-gate-retire-marp.md §0).
 *
 * Three invariant layers (this file is the layer 1–2 PROOF on a few components;
 * the full corpus + layer-3 semantic checks follow):
 *   1 · Contract  — every REQUIRED slot's manifest selector resolves on the slide
 *                   (derived automatically from <name>.manifest.json `slots`).
 *   2 · Universal — the slide does not overflow its frame, and the heading meets
 *                   WCAG AA contrast against the slide background.
 *   3 · Semantic  — (later) per-component truths: funnel widths ∝ values, etc.
 *
 * Needs Chromium (CHROME_PATH or the puppeteer cache) + the emulator — same
 * toolchain as the other integration tests.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const puppeteer = require('puppeteer');
const { renderHtml, deckFromSample, ROOT } = require('../../helpers/semantic-render');

/** Best-effort Chromium path — mirrors color-parity.test.js / tools/screenshot.js. */
function resolveChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const root of [path.join(os.homedir(), '.cache', 'puppeteer', 'chrome'), '/root/.cache/puppeteer/chrome']) {
    if (!fs.existsSync(root)) continue;
    for (const build of fs.readdirSync(root).filter((d) => d.startsWith('linux-')).sort().reverse()) {
      const bin = path.join(root, build, 'chrome-linux64', 'chrome');
      if (fs.existsSync(bin)) return bin;
    }
  }
  return undefined;
}

function manifest(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'components', rel), 'utf8'));
}

// The layer 1–2 proof set: text-only components (no image assets to resolve)
// across four buckets, exercising distinct slot shapes (h2 + list, number list,
// numbered KPIs, axis list).
const COMPONENTS = [
  'inventory/cards-grid/cards-grid',
  'statement/big-number/big-number',
  'evidence/kpi/kpi',
  'comparison/matrix-2x2/matrix-2x2',
];

const SLIDE = 'section[data-marpit-slide="1"]';

// Browser-side: WCAG contrast ratio between the heading text colour and the
// nearest opaque background. Format-agnostic (rgb/oklab/color()) via a 1px canvas,
// the same normalisation color-parity.test.js uses. Returns null if no heading.
function headingContrastInPage() {
  const sec = document.querySelector('section[data-marpit-slide="1"]');
  const h = sec && sec.querySelector('h1, h2');
  if (!h) return null;
  const toRgb = (c) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  let el = h;
  let bg = null;
  while (el) {
    const b = getComputedStyle(el).backgroundColor;
    if (b && b !== 'transparent' && !/^rgba\(0, 0, 0, 0\)/.test(b)) { bg = b; break; }
    el = el.parentElement;
  }
  const lum = ([r, g, b]) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const l1 = lum(toRgb(getComputedStyle(h).color));
  const l2 = lum(toRgb(bg || 'rgb(255,255,255)'));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('component semantic invariants (assert meaning, not pixels)', () => {
  let browser;
  before(async () => {
    browser = await puppeteer.launch({
      executablePath: resolveChrome(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });
  after(async () => { if (browser) await browser.close(); });

  for (const rel of COMPONENTS) {
    const m = manifest(`${rel}.manifest.json`);
    describe(m.name, () => {
      let page;
      before(async () => {
        const html = renderHtml(deckFromSample(m.sample), { key: m.name });
        page = await browser.newPage();
        await page.goto(`file://${html}`, { waitUntil: 'load', timeout: 60000 });
      });
      after(async () => { if (page) await page.close(); });

      // ── Layer 1 — every required slot's selector resolves ──
      for (const [slot, spec] of Object.entries(m.slots).filter(([, s]) => s.required)) {
        test(`contract: required slot "${slot}" (${spec.selector}) renders`, async () => {
          const n = await page.$$eval(`${SLIDE} ${spec.selector}`, (els) => els.length).catch(() => 0);
          assert.ok(n >= 1, `expected ≥1 "${spec.selector}" for required slot "${slot}", got ${n}`);
        });
      }

      // ── Layer 2a — content fits the frame (emulator's overflow watcher) ──
      test('universal: slide does not overflow its frame', async () => {
        const over = await page.$eval(SLIDE, (s) => s.classList.contains('overflow'));
        assert.equal(over, false, 'slide content overflows the 1280×720 frame (.overflow)');
      });

      // ── Layer 2b — heading meets WCAG AA contrast on the slide background ──
      test('universal: heading contrast ≥ 4.5:1', async () => {
        const ratio = await page.evaluate(headingContrastInPage);
        if (ratio === null) return; // component has no heading slot (e.g. big-number)
        assert.ok(ratio >= 4.5, `heading contrast ${ratio.toFixed(2)}:1 < 4.5:1 (WCAG AA)`);
      });
    });
  }
});
