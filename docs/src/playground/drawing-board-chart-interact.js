// Present/practice CHART INTERACTION — parent-hosted, so the slide iframe stays a
// pure paint surface (isolation + screen===PDF parity untouched). See
// engineering/decisions/2026-06-19-css-3d-charts-feasibility.md ›
// "Present/practice interactive integration".
//
// The slide is a same-origin `srcdoc` iframe under a full-stage pointer-capture
// overlay. Rather than fight that overlay, the interaction lives on the PARENT
// side of the boundary:
//   - a thin hit-surface sits ABOVE the capture layer, but only over the chart's
//     rectangle (the rest of the stage keeps swipe / tap-to-reveal / edge-arrows);
//   - the popover renders as parent present-chrome in stage coordinates, reading
//     the slice's inert <template class="piechart-detail" data-slice> by index;
//   - reveal is one command bound to pointer (in the hit-surface), number keys
//     (1–9 → slice n, 0/Esc clears), and (later) a presenter-window control.
// Navigation never leaves keyboard / edge-arrows / wheel, so ceding the chart's
// own rectangle is safe — there is no click-to-advance to lose.
//
// Cross-iframe is fine because `srcdoc` is same-origin: we read the chart's
// geometry + `elementFromPoint` hit + the legend/template content directly.

const REDUCED = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
})();
const COARSE = (() => {
  try { return window.matchMedia('(pointer: coarse)').matches; } catch { return false; }
})();

function el(cls) { const d = document.createElement('div'); if (cls) d.className = cls; return d; }

/**
 * @param {object} o
 * @param {HTMLElement} o.stage  the .db-pp-stage (positioning context for our chrome)
 * @param {() => HTMLIFrameElement} o.getFrame  the live slide iframe
 * @param {boolean} [o.tilt=true]  interaction-coupled tilt (lifts/tips toward the open slice, settles flat)
 * @param {() => void} [o.onReveal]  fired when a slice opens (practice uses it to pause autoplay)
 */
export function createChartInteract({ stage, getFrame, tilt = true, onReveal }) {
  const useTilt = tilt && !REDUCED;

  // Parent chrome: a transparent container (pointer-events:none — lets the
  // capture layer/HUD through) holding the hit-surface and the popover, which
  // opt back into pointer-events as needed.
  const root = el('db-pp-chartlayer');
  const hit = el('db-pp-charthit');
  const pop = el('db-pp-chartpop');
  pop.setAttribute('role', 'status');
  pop.setAttribute('aria-live', 'polite');
  root.append(hit, pop);
  stage.append(root);

  let curIdx = -1;       // current slide index
  let chartEl = null;    // the <svg class="piechart-svg"> in the current section (same-origin)
  let detailsEl = null;  // its sibling .piechart-details (the <template> payload)
  let sliceN = 0;        // slice count on the current chart
  let openSlice = -1;    // which slice's detail is showing (-1 = none)
  let chartBox = null;   // current chart rect in stage coords (for popover anchoring)
  const timers = [];     // pending reflow re-pins (cleared on slide change / destroy)

  const doc = () => { try { return getFrame().contentDocument; } catch { return null; } };

  // ── geometry ──────────────────────────────────────────────────────────────
  // Map the chart's box (measured inside the iframe) into stage coordinates and
  // pin the hit-surface over it. Same for any open popover.
  function reflow() {
    if (!chartEl) { hide(); return; }
    let fr, sr, cr;
    try { fr = getFrame().getBoundingClientRect(); sr = stage.getBoundingClientRect(); cr = chartEl.getBoundingClientRect(); }
    catch { hide(); return; }
    if (!cr.width || !cr.height) { hide(); return; }
    chartBox = { left: fr.left + cr.left - sr.left, top: fr.top + cr.top - sr.top, width: cr.width, height: cr.height };
    hit.style.cssText =
      `display:block;left:${chartBox.left}px;top:${chartBox.top}px;width:${chartBox.width}px;height:${chartBox.height}px`;
    if (openSlice >= 0) positionPop(openSlice);
  }

  function hide() { hit.style.display = 'none'; }

  // Anchor the popover to the active wedge, kept within the chart's vertical band
  // so it never rides up over the slide title.
  function rectInStage(node) {
    const fr = getFrame().getBoundingClientRect(), sr = stage.getBoundingClientRect(), r = node.getBoundingClientRect();
    return { left: fr.left + r.left - sr.left, top: fr.top + r.top - sr.top, width: r.width, height: r.height };
  }

  // ── lifecycle: called after every slide change ──────────────────────────────
  function onSlide(idx) {
    clear();
    while (timers.length) clearTimeout(timers.pop());
    curIdx = idx | 0;
    const d = doc();
    const sec = d ? d.querySelectorAll('.marpit > section')[curIdx] : null;
    chartEl = sec ? sec.querySelector('.piechart-svg') : null;
    detailsEl = sec ? sec.querySelector('.piechart-details') : null;
    // Only "interactive" when the authored detail is actually present.
    if (chartEl && detailsEl) {
      sliceN = detailsEl.querySelectorAll('template.piechart-detail').length
        || sec.querySelectorAll('.wedge[data-slice]').length;
      // The iframe re-fits on a few beats after navigation; re-pin to match.
      reflow();
      // The iframe re-fits at [60, 300, 1200]ms after a pv message; re-pin just after.
      [80, 360, 1240].forEach((t) => { timers.push(setTimeout(reflow, t)); });
    } else {
      chartEl = detailsEl = null; sliceN = 0; hide();
    }
  }

  function interactive() { return !!(chartEl && detailsEl); }

  // ── hit-testing: parent pointer → iframe slice via elementFromPoint ─────────
  function sliceAt(clientX, clientY) {
    const d = doc(); if (!d) return -1;
    const fr = getFrame().getBoundingClientRect();
    const t = d.elementFromPoint(clientX - fr.left, clientY - fr.top);
    const w = t?.closest('[data-slice]');
    return w ? +w.dataset.slice : -1;
  }

  // ── reveal command (pointer / keys / presenter window all route here) ───────
  function reveal(i) {
    if (!interactive()) return;
    if (i < 0 || i >= sliceN) return;
    if (i === openSlice) return;
    if (openSlice < 0 && onReveal) { try { onReveal(); } catch { /* host hook */ } }
    openSlice = i;
    const d = doc();
    // Title parts come from the SVG legend (index-aligned); body/meta from the
    // authored <template>.
    const label = textOf(d, '.chart-key-label', i);
    const value = textOf(d, '.chart-key-value', i);
    // The wedge fill is an SVG gradient ref (url(#…)), which is meaningless in the
    // parent doc — read the legend swatch's COMPUTED fill instead: its
    // color-mix(var(--chart-cat-N-hue)…) resolves (against the iframe's theme) to a
    // concrete colour the parent can paint.
    const swatch = d?.querySelectorAll('.chart-key-swatch')[i];
    const win = swatch?.ownerDocument?.defaultView || window;
    const dot = swatch ? win.getComputedStyle(swatch).fill : 'currentColor';
    const tpl = d?.querySelector(`template.piechart-detail[data-slice="${i}"]`);
    const lis = tpl ? [...tpl.content.querySelectorAll('li')].map((n) => n.innerHTML.trim()) : [];
    const body = lis[0] || '';
    const meta = lis.slice(1).join(' · ');
    pop.innerHTML =
      `<div class="db-pp-chartpop-h"><span class="db-pp-chartpop-dot" style="background:${dot}"></span>` +
      `<span class="db-pp-chartpop-l">${label}</span>` +
      (value ? `<span class="db-pp-chartpop-v">${value}</span>` : '') + `</div>` +
      (body ? `<p>${body}</p>` : '') + (meta ? `<div class="db-pp-chartpop-m">${meta}</div>` : '');
    pop.classList.add('show');
    liftAndTilt(i);
    reflow();
  }

  function textOf(d, sel, i) {
    if (!d) return '';
    const n = d.querySelectorAll(sel)[i];
    return n ? n.textContent.trim() : '';
  }

  function positionPop(i) {
    const d = doc(); if (!d || !chartBox) return;
    const w = d.querySelectorAll('.wedge[data-slice]')[i];
    if (!w) return;
    let wb; try { wb = rectInStage(w); } catch { return; }
    pop.style.visibility = 'hidden'; pop.style.display = 'block';
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    const sr = stage.getBoundingClientRect();
    // Horizontally centred on the wedge; vertically ABOVE it, but never above the
    // chart's own top (→ would cover the title), in which case drop below the wedge.
    let x = wb.left + wb.width / 2 - pw / 2;
    let y = wb.top - ph - 12;
    if (y < chartBox.top) y = wb.top + wb.height + 12;
    x = Math.max(8, Math.min(x, sr.width - pw - 8));
    y = Math.max(chartBox.top, Math.min(y, sr.height - ph - 8));
    pop.style.left = `${x}px`; pop.style.top = `${y}px`; pop.style.visibility = '';
  }

  // ── interaction-coupled tilt (settles flat; resting chart stays proportion-true) ──
  function liftAndTilt(i) {
    if (!chartEl) return;
    const d = doc();
    const wedges = d ? d.querySelectorAll('.wedge[data-slice]') : [];
    wedges.forEach((w, n) => {
      w.style.transition = 'transform .22s cubic-bezier(.2,.7,.3,1), opacity .22s';
      w.style.opacity = n === i ? '1' : '0.45';
      w.style.transform = n === i ? liftVec(w, wedges) : '';
    });
    if (useTilt) {
      chartEl.style.transition = 'transform .3s cubic-bezier(.2,.7,.3,1)';
      chartEl.style.transformOrigin = '50% 55%';
      chartEl.style.transform = 'perspective(900px) rotateX(7deg)';
    }
  }

  // Nudge the active wedge a few px along its centroid→hub vector (its "out").
  function liftVec(w, wedges) {
    try {
      const box = w.getBBox();
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      // hub ≈ mean of all wedge centroids
      let mx = 0, my = 0;
      wedges.forEach((o) => { const b = o.getBBox(); mx += b.x + b.width / 2; my += b.y + b.height / 2; });
      mx /= wedges.length; my /= wedges.length;
      let dx = cx - mx, dy = cy - my; const len = Math.hypot(dx, dy) || 1;
      dx = (dx / len) * 7; dy = (dy / len) * 7;
      return `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    } catch { return ''; }
  }

  function clear() {
    if (openSlice < 0 && !pop.classList.contains('show')) { /* nothing open */ }
    openSlice = -1;
    pop.classList.remove('show');
    const d = doc();
    if (d) d.querySelectorAll('.wedge[data-slice]').forEach((w) => { w.style.opacity = ''; w.style.transform = ''; });
    if (chartEl) chartEl.style.transform = '';
  }

  // ── keyboard: number keys reveal; 0/Esc clear ───────────────────────────────
  function handleKey(e) {
    if (!interactive()) return false;
    if (e.key === 'Escape') { if (openSlice >= 0) { clear(); return true; } return false; }
    if (e.key === '0') { clear(); return true; }
    if (e.key >= '1' && e.key <= '9') {
      const i = +e.key - 1;
      if (i < sliceN) { reveal(i); return true; } // out-of-range digit → don't swallow it
    }
    return false;
  }

  // ── pointer wiring on the hit-surface ───────────────────────────────────────
  // Fine pointer (mouse): hover-follow. Coarse (touch): tap a slice to reveal,
  // tap again / off-slice to clear.
  if (!COARSE) {
    hit.addEventListener('pointermove', (e) => { const s = sliceAt(e.clientX, e.clientY); if (s >= 0) reveal(s); });
    hit.addEventListener('pointerleave', () => clear());
  } else {
    hit.addEventListener('pointerdown', (e) => {
      const s = sliceAt(e.clientX, e.clientY);
      if (s < 0 || s === openSlice) clear(); else reveal(s);
      e.stopPropagation(); // don't let the tap fall through to the capture layer
    });
  }

  let ro = null;
  try { ro = new ResizeObserver(reflow); ro.observe(stage); } catch { /* older browser */ }
  window.addEventListener('resize', reflow);

  function destroy() {
    clear();
    while (timers.length) clearTimeout(timers.pop());
    chartEl = detailsEl = null;
    try { ro?.disconnect(); } catch { /* noop */ }
    window.removeEventListener('resize', reflow);
    root.remove();
  }

  return { onSlide, reflow, handleKey, reveal, clear, interactive, destroy };
}
