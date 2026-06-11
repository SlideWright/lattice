/**
 * Integration: SVG charts scale with the slide — the 4K fidelity gate (#180).
 *
 * Runs tools/check-svg-scaling.js, which renders test/fixtures/responsive-charts.md
 * at HD (1280) and 4K (3840) and measures each chart SVG's rendered box in a real
 * browser, asserting it scales ~3× (the slide ratio). A fixed-px size cap would
 * pin the chart and fail this — the regression that page-count and 72dpi pixel
 * checks cannot catch. Slow tier (spawns the emulator + Chromium).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { spawnSync } = require('child_process');

describe('svg-scaling (4K fidelity)', () => {
  const ROOT = path.join(__dirname, '..', '..', '..');
  const GATE = path.join(ROOT, 'tools', 'check-svg-scaling.js');

  test('radar + quadrant SVGs scale ~3× from HD to 4K', () => {
    const r = spawnSync(process.execPath, [GATE], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 180000,
      env: process.env,
    });
    // Exit 2 = harness unavailable (no puppeteer/Chrome in this env). The
    // screenshot test in this same dir already gates Chromium availability, so
    // skip here rather than fail — this gate's job is to catch exit-1 (a chart
    // that stopped scaling), not to re-police the harness.
    if (r.status === 2) {
      console.warn(`svg-scaling: harness unavailable, skipping.\n${r.stdout || ''}${r.stderr || ''}`);
      return;
    }
    assert.equal(r.status, 0, `check-svg-scaling failed (a chart did not scale):\n${r.stdout}\n${r.stderr}`);
  });
});
