/**
 * Integration: the owned multi-format export (PDF / PPTX / PNG) end-to-end.
 *
 * Renders the 3-slide fixture deck through lattice-emulator once per output
 * extension and asserts each artifact is real and well-formed:
 *   - .pdf  : the original vector path still works (regression guard).
 *   - .pptx : a valid OOXML zip with one slide part + one media image per slide.
 *   - .png  : one PNG per slide (`<base>.NNN.png`) at the 2× raster size.
 * No marp-cli — this is the marp-free export path. Slow tier (spawns Chromium);
 * kept tight with the same no-Mermaid fixture the screenshot suite uses.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');
const { spawnSync } = require('child_process');

describe('export-formats', () => {
  const ROOT     = path.join(__dirname, '..', '..', '..');
  const EMULATOR = path.join(ROOT, 'lattice-emulator.js');
  const FIXTURE  = path.join(ROOT, 'test', 'fixtures', 'preview-deck.md');
  const TIMEOUT  = 60000;

  function tmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'lattice-export-'));
  }

  function run(out) {
    return spawnSync(process.execPath, [EMULATOR, FIXTURE, out, '--quiet'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env },
      timeout: TIMEOUT,
    });
  }

  function readPngDimensions(file) {
    const buf = fs.readFileSync(file);
    assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `not a PNG: ${file}`);
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  test('renders a valid vector PDF (regression guard)', { timeout: TIMEOUT }, () => {
    const out = path.join(tmpDir(), 'deck.pdf');
    const r = run(out);
    assert.equal(r.status, 0, `emulator failed: ${r.stderr}`);
    assert.ok(fs.existsSync(out), 'pdf should exist');
    assert.equal(fs.readFileSync(out).subarray(0, 5).toString(), '%PDF-', 'not a PDF');
  });

  test('renders an OOXML .pptx with one slide + image per slide', { timeout: TIMEOUT }, async () => {
    const out = path.join(tmpDir(), 'deck.pptx');
    const r = run(out);
    assert.equal(r.status, 0, `emulator failed: ${r.stderr}`);
    assert.ok(fs.existsSync(out), 'pptx should exist');

    const bytes = fs.readFileSync(out);
    assert.equal(bytes.subarray(0, 4).toString('hex'), '504b0304', 'pptx is not a zip');

    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(bytes);
    const names = Object.keys(zip.files);
    const slides = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    const media  = names.filter((n) => /^ppt\/media\/.+\.png$/i.test(n));
    assert.equal(slides.length, 3, `expected 3 slides, got ${slides.length}`);
    assert.equal(media.length, 3, `expected 3 images, got ${media.length}`);
  });

  test('renders one PNG per slide at the 2× raster size', { timeout: TIMEOUT }, () => {
    const dir = tmpDir();
    const out = path.join(dir, 'deck.png');
    const r = run(out);
    assert.equal(r.status, 0, `emulator failed: ${r.stderr}`);

    for (const n of ['001', '002', '003']) {
      const f = path.join(dir, `deck.${n}.png`);
      assert.ok(fs.existsSync(f), `expected ${f}`);
      const { width, height } = readPngDimensions(f);
      assert.equal(width, 2560, 'HD slide should rasterize at 2× width');
      assert.equal(height, 1440, 'HD slide should rasterize at 2× height');
      assert.ok(fs.statSync(f).size > 5000, 'PNG should be non-trivial (catches blank screenshots)');
    }
  });
});
