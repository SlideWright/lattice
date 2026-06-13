/**
 * Unit: Export to Marp (tools/export-marp.js).
 *
 * Covers the pure helpers (front-matter theme read, asset localization) and an
 * end-to-end bundle: the exporter produces the expected layout, and the baked
 * deck.md divides into the same slides as the source — the portability contract.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const REPO = path.join(__dirname, '..', '..', '..');
const TOOL = path.join(REPO, 'tools', 'export-marp.js');
const { localizeAssets, readTheme } = require(TOOL);
const latticeEngine = require('../../../lib/engine');

describe('export-marp helpers', () => {
  test('readTheme reads the front-matter palette, or null', () => {
    assert.equal(readTheme('---\nmarp: true\ntheme: cuoio\n---\n\n# A'), 'cuoio');
    assert.equal(readTheme('# A\n\nno front matter'), null);
  });

  test('localizeAssets copies local images + rewrites paths; leaves remote alone', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-loc-'));
    const deckDir = path.join(tmp, 'src');
    fs.mkdirSync(deckDir);
    fs.writeFileSync(path.join(deckDir, 'logo.png'), 'PNGDATA');
    const dest = path.join(tmp, 'out');
    fs.mkdirSync(dest);
    const body = '![logo](logo.png)\n\n![remote](https://x/y.png)\n\n![missing](nope.png)';
    const { body: out, count } = localizeAssets(body, deckDir, dest);
    assert.match(out, /!\[logo\]\(assets\/logo\.png\)/, 'local image rewritten to assets/');
    assert.match(out, /!\[remote\]\(https:\/\/x\/y\.png\)/, 'remote URL untouched');
    assert.match(out, /!\[missing\]\(nope\.png\)/, 'dangling ref left as-is');
    assert.equal(count, 1);
    assert.ok(fs.existsSync(path.join(dest, 'assets', 'logo.png')), 'image copied into assets/');
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('export-marp bundle (end-to-end)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exp-e2e-'));
  let dest;
  before(() => {
    execFileSync('node', [TOOL, path.join(REPO, 'examples', 'split-headings.md'), tmp], { stdio: 'pipe' });
    dest = path.join(tmp, 'split-headings');
  });
  after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  test('produces the expected bundle layout', () => {
    for (const f of [
      'split-headings.md', 'README.md', 'marp.config.cjs', 'package.json',
      'dist/lattice.css', 'dist/lattice-emulator.js', 'themes/indaco.css', 'themes/indaco-dark.css',
    ]) {
      assert.ok(fs.existsSync(path.join(dest, f)), `bundle is missing ${f}`);
    }
  });

  test('baked deck.md states split: rule and divides into the same slides', () => {
    const baked = fs.readFileSync(path.join(dest, 'split-headings.md'), 'utf8');
    assert.match(baked, /split: rule/, 'splits are baked → split: rule');
    const original = fs.readFileSync(path.join(REPO, 'examples', 'split-headings.md'), 'utf8');
    const engine = latticeEngine.createEngine();
    const count = (src) => (engine.render(src).html.match(/<section[\s>]/g) || []).length;
    assert.equal(count(baked), count(original), 'baked deck divides identically to the source');
  });

  test('package.json pins marp-cli + the lattice engine', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf8'));
    assert.ok(pkg.dependencies['@marp-team/marp-cli']);
    assert.ok(pkg.dependencies['@slidewright/lattice']);
  });
});
