/**
 * overflow-probe — the ONE source of truth for "does this slide overflow its
 * frame?", shared by every measurement site (HARD RULE #1).
 *
 * The naive test is `section.scrollHeight > section.clientHeight`. That was
 * correct while every component body flowed as direct children of `<section>`:
 * an over-stuffed body grew the section's scrollHeight, and the watcher saw it.
 *
 * The flex cell-tree (2026-06-26-frames-as-flex-cell-trees.md) changes that. A
 * bounded content Cell (`overflow: clip; min-height: 0`) CONTAINS its overflow —
 * so the cell can be 110px over its box while the SECTION reports zero overflow.
 * Left unfixed, the clip would silently swallow overflow: the red ring would
 * stop firing, the export "Overflows" warning would go quiet, and — worst —
 * runtime autosplit (lib/core/auto-split.js), which divides slides BY their
 * measured scrollHeight/clientHeight ratio, would never trigger and the content
 * would be lost off-cell with no signal. (Verified empirically on an
 * over-stuffed split-panel: section over 110px→0px once `.panel-right` clipped.)
 *
 * So overflow must be probed CELL-AWARE: a section overflows if its own box
 * overflows OR any bounded content Cell clips content internally. We surface a
 * clipped cell's internal overflow as section-equivalent (clientH + delta) so
 * the existing ratio math in measureOverflow keeps working unchanged — autosplit
 * sizes the split from the real content height, not the clipped box.
 *
 * CLIP_CELL_SELECTOR lists the bounded CONTENT cells (doc §4c: content cells
 * clip AND report; decorative cells — watermark, atmosphere, the split feature
 * bleed — clip but are NOT probed, so an intentional decorative bleed never
 * trips the ring). `.cell-stage` is the standard frame's body cell (the generic-
 * prose + migrated-component body); `.panel-right`/`.compare-right` are the split
 * frames' supporting cells. This is the single place the set is maintained.
 */

// Bounded CONTENT cells that clip their overflow and MUST be probed for it.
// Keep this in sync as frames adopt the flex cell-tree clip contract.
const CLIP_CELL_SELECTOR = '.cell-stage, .panel-right, .compare-right';

/**
 * Does `s` (a slide <section>) overflow its frame, counting the internal
 * overflow of any bounded content cell that clips? Pure + browser-evaluable
 * (no closures, no module refs) so it can be `.toString()`-injected into the
 * emulator's inline watcher and page.evaluate contexts verbatim.
 *
 * @returns {{over:boolean, vOver:boolean, scrollH:number, clientH:number}}
 *   vOver = vertical overflow only (autosplit can only fix vertical);
 *   scrollH/clientH = the EFFECTIVE vertical extent (cell overflow folded in),
 *   for the caller's ratio math.
 */
function probeSectionOverflow(s, clipSelector, TOL) {
  let scrollH = s.scrollHeight;
  const clientH = s.clientHeight;
  let scrollW = s.scrollWidth;
  const clientW = s.clientWidth;
  const cells = s.querySelectorAll(clipSelector);
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    let dy = c.scrollHeight - c.clientHeight;
    let dx = c.scrollWidth - c.clientWidth;
    // `scrollHeight - clientHeight` UNDER-reports a CENTRED (or bottom-anchored)
    // cell: content clipped off the TOP sits at a negative offset scrollHeight never
    // counts, so a too-tall `justify-content:center` body reads as ~half its real
    // overflow — or zero — and the gate stays silent while the slide visibly clips
    // its head. Measure the true content SPILL past the cell box from the children's
    // layout rects (getBoundingClientRect returns the layout box regardless of clip),
    // and take the larger: flex-start stays correct, centre / flex-end get caught.
    // Guarded on getBoundingClientRect so the pure-dims unit fakes (and any childless
    // cell) keep the legacy path untouched.
    if (typeof c.getBoundingClientRect === 'function' && c.children && c.children.length) {
      const cr = c.getBoundingClientRect();
      let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity, seen = 0;
      for (let j = 0; j < c.children.length; j++) {
        const r = c.children[j].getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue; // skip display:contents / empty
        seen++;
        if (r.top < top) top = r.top;
        if (r.bottom > bottom) bottom = r.bottom;
        if (r.left < left) left = r.left;
        if (r.right > right) right = r.right;
      }
      if (seen) {
        // spill past EITHER edge (a centred overflow spills both top and bottom)
        const overV = (cr.top - top > 0 ? cr.top - top : 0) + (bottom - cr.bottom > 0 ? bottom - cr.bottom : 0);
        const overH = (cr.left - left > 0 ? cr.left - left : 0) + (right - cr.right > 0 ? right - cr.right : 0);
        if (overV > dy) dy = overV;
        if (overH > dx) dx = overH;
      }
    }
    if (dy > 0) scrollH = Math.max(scrollH, clientH + dy);
    if (dx > 0) scrollW = Math.max(scrollW, clientW + dx);
  }
  const vOver = scrollH > clientH + TOL;
  const over = vOver || scrollW > clientW + TOL;
  return { over, vOver, scrollH, clientH };
}

module.exports = {
  CLIP_CELL_SELECTOR,
  probeSectionOverflow,
  // Function source for verbatim injection into browser-string contexts
  // (the emulator inline watcher + page.evaluate) — keeps the LOGIC single-sourced.
  PROBE_SRC: probeSectionOverflow.toString(),
};
