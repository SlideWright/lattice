/**
 * Unit: lib/core/overflow-probe.js — the cell-aware overflow probe.
 *
 * The probe is the ONE source of truth behind every overflow-measurement site
 * (preview watcher, export watcher, autosplit's measureOverflow). It must report
 * overflow when EITHER the section's own box overflows OR a bounded content cell
 * (overflow:clip) overflows internally — because a clipping cell hides its
 * overflow from `section.scrollHeight`. These tests drive it with plain fake
 * DOM nodes (the probe only reads scroll/client dims + querySelectorAll).
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { CLIP_CELL_SELECTOR, probeSectionOverflow, PROBE_SRC } = require('../../../lib/core/overflow-probe');

// Minimal fake <section>: its own box dims + a list of "clip cell" children
// returned from querySelectorAll(selector). The selector is ignored by the fake
// (the test supplies the cells directly), which is fine — the probe's contract is
// "probe whatever querySelectorAll returns".
function fakeSection({ scrollHeight, clientHeight, scrollWidth = 0, clientWidth = 0, cells = [] }) {
  return {
    scrollHeight, clientHeight,
    scrollWidth: scrollWidth || clientWidth,
    clientWidth,
    querySelectorAll: () => cells,
  };
}
const cell = (sh, ch, sw = 0, cw = 0) => ({ scrollHeight: sh, clientHeight: ch, scrollWidth: sw || cw, clientWidth: cw });

const TOL = 12;

describe('overflow-probe', () => {
  test('no overflow → over=false', () => {
    const s = fakeSection({ scrollHeight: 700, clientHeight: 700 });
    const r = probeSectionOverflow(s, CLIP_CELL_SELECTOR, TOL);
    assert.equal(r.over, false);
    assert.equal(r.vOver, false);
  });

  test('section itself overflows vertically → over=true (legacy path unchanged)', () => {
    const s = fakeSection({ scrollHeight: 830, clientHeight: 700 });
    const r = probeSectionOverflow(s, CLIP_CELL_SELECTOR, TOL);
    assert.equal(r.over, true);
    assert.equal(r.vOver, true);
    assert.equal(r.scrollH, 830);
  });

  test('a clipping CELL overflows while the section reports zero → over=true', () => {
    // The regression the probe fixes: section box is exactly full (clip contains
    // the body), but the bounded cell is 110px over. Must still be detected.
    const s = fakeSection({
      scrollHeight: 700, clientHeight: 700,
      cells: [cell(828, 718)], // +110 internal overflow
    });
    const r = probeSectionOverflow(s, CLIP_CELL_SELECTOR, TOL);
    assert.equal(r.over, true);
    assert.equal(r.vOver, true);
    // effective extent folds the cell overflow back in for the autosplit ratio
    assert.equal(r.scrollH, 700 + (828 - 718));
    assert.equal(r.clientH, 700);
  });

  test('a sub-TOL cell jitter does NOT trip the ring', () => {
    const s = fakeSection({
      scrollHeight: 700, clientHeight: 700,
      cells: [cell(706, 700)], // +6, under the 12px tolerance
    });
    assert.equal(probeSectionOverflow(s, CLIP_CELL_SELECTOR, TOL).over, false);
  });

  test('horizontal cell overflow flags over but NOT vOver (autosplit can\'t fix width)', () => {
    const s = fakeSection({
      scrollHeight: 700, clientHeight: 700, clientWidth: 1280,
      cells: [cell(700, 700, 1500, 1280)], // +220 wide
    });
    const r = probeSectionOverflow(s, CLIP_CELL_SELECTOR, TOL);
    assert.equal(r.over, true);
    assert.equal(r.vOver, false);
  });

  test('the largest cell overflow wins when several clip', () => {
    const s = fakeSection({
      scrollHeight: 700, clientHeight: 700,
      cells: [cell(740, 700), cell(900, 700)],
    });
    const r = probeSectionOverflow(s, CLIP_CELL_SELECTOR, TOL);
    assert.equal(r.scrollH, 700 + 200);
  });

  test('CLIP_CELL_SELECTOR names the current bounded content cells', () => {
    assert.match(CLIP_CELL_SELECTOR, /\.cell-stage/);
    assert.match(CLIP_CELL_SELECTOR, /\.panel-right/);
    assert.match(CLIP_CELL_SELECTOR, /\.compare-right/);
  });

  test('PROBE_SRC is the function source, for verbatim browser injection', () => {
    assert.equal(typeof PROBE_SRC, 'string');
    // reconstituting it yields a working probe (the emulator does exactly this)
    const reified = new Function('return (' + PROBE_SRC + ')')();
    const s = fakeSection({ scrollHeight: 700, clientHeight: 700, cells: [cell(828, 718)] });
    assert.equal(reified(s, CLIP_CELL_SELECTOR, TOL).over, true);
  });
});
