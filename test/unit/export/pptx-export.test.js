/**
 * Unit: the owned image-per-slide PPTX writer (lib/export/pptx-export.js).
 *
 * Exercises the OOXML assembly directly with tiny PNG buffers — no Chromium,
 * no marp. Asserts the produced .pptx is a real OOXML zip carrying one slide
 * part and one media image per input buffer, and that an empty input is
 * rejected. The CLI's screenshot→PNG rasterization is covered by
 * test/integration/export/export-formats.test.js.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path   = require('path');
const fs     = require('fs');
const os     = require('os');

const { writePptx } = require('../../../lib/export/pptx-export');

// A minimal valid 1×1 PNG — enough for pptxgenjs to embed as slide media.
const ONE_PX_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
);

describe('pptx-export', () => {
  function tmpFile() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lattice-pptx-'));
    return path.join(dir, 'out.pptx');
  }

  test('writes a valid OOXML zip with one slide + one image per buffer', async () => {
    const out = tmpFile();
    const count = await writePptx(out, [ONE_PX_PNG, ONE_PX_PNG, ONE_PX_PNG], {
      title: 'Test Deck',
    });
    assert.equal(count, 3);
    assert.ok(fs.existsSync(out), 'pptx file should exist');

    // A .pptx is a zip whose first bytes are the local-file-header magic "PK\x03\x04".
    const head = fs.readFileSync(out).subarray(0, 4);
    assert.equal(head.toString('hex'), '504b0304', 'output is not a zip (PK header missing)');

    const JSZip = require('jszip');
    const zip = await JSZip.loadAsync(fs.readFileSync(out));
    const names = Object.keys(zip.files);
    const slides = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    const media  = names.filter((n) => /^ppt\/media\/.+\.(png|jpg|jpeg)$/i.test(n));
    assert.equal(slides.length, 3, `expected 3 slide parts, got ${slides.length}`);
    assert.equal(media.length, 3, `expected 3 media images, got ${media.length}`);
    // OOXML sanity: the content-types part must be present and name the deck.
    assert.ok(names.includes('[Content_Types].xml'), 'missing [Content_Types].xml');
  });

  test('rejects an empty slide set', async () => {
    const out = tmpFile();
    await assert.rejects(() => writePptx(out, []), /no slide images/i);
  });
});
