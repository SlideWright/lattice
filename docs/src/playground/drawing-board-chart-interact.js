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
//
// Popover POSITIONING is delegated to Floating UI (@floating-ui/dom — the same
// engine shadcn/Radix popovers run on), driven by a VIRTUAL REFERENCE built from
// the chart's geometry. This is the right tool for a cross-iframe anchor (no DOM
// node to point at) and gives real flip/shift/collision handling instead of a
// hand-rolled clamp. A direct dependency (not borrowed transitively from Radix).
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';

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
 * @param {boolean} [o.hoverAny=false]  PREVIEW mode — instead of a parent hit-surface
 *   pinned over one onSlide()-designated chart (Present/Practice), listen on the
 *   same-origin iframe document and reveal whichever chart is under the pointer, so
 *   an author scrolling a multi-slide deck gets the detail in place AS THEY EDIT.
 *   No hit-surface is pinned (it would eat the iframe's own pointer events); the
 *   popover stays a parent overlay. Re-bind to the doc on every srcdoc rewrite.
 */
export function createChartInteract({ stage, getFrame, tilt = true, onReveal, hoverAny = false }) {
  const useTilt = tilt && !REDUCED;

  // Parent chrome: a transparent container (pointer-events:none — lets the
  // capture layer/HUD through) holding the hit-surface and the popover, which
  // opt back into pointer-events as needed.
  const root = el('db-pp-chartlayer');
  if (hoverAny) root.classList.add('db-pp-chartlayer--preview');
  const hit = el('db-pp-charthit');
  const pop = el('db-pp-chartpop');
  pop.setAttribute('role', 'status');
  pop.setAttribute('aria-live', 'polite');
  // In preview mode the hit-surface is never pinned (we listen on the iframe doc
  // directly), so don't even mount it — it must never cover the live preview.
  if (hoverAny) root.append(pop); else root.append(hit, pop);
  stage.append(root);

  let curIdx = -1;       // current slide index
  let curSection = null; // the <section> whose chart is active (scopes all wedge/legend queries)
  let chartEl = null;    // the <svg class="piechart-svg"> in the current section (same-origin)
  let detailsEl = null;  // its sibling .piechart-details (the <template> payload)
  let sliceN = 0;        // slice count on the current chart
  let openSlice = -1;    // which slice's detail is showing (-1 = none)
  let chartBox = null;   // current chart rect in stage coords (Present hit-surface)
  let boundDoc = null;   // iframe document we've bound hover listeners to (preview mode)
  let stopAutoUpdate = null; // Floating UI autoUpdate teardown (while a popover is open)
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
    // A zero box means the chart node is detached (a section PATCH replaced it
    // without a db-frame-ready, so curSection is now orphaned) or scrolled
    // off-screen (content-visibility). Either way an open preview popover is stale
    // — dismiss it (it re-resolves on the next hover). hide() only clears the
    // Present hit-surface, so in hoverAny we clear() explicitly.
    if (!cr.width || !cr.height) { if (hoverAny && openSlice >= 0) clear(); hide(); return; }
    chartBox = { left: fr.left + cr.left - sr.left, top: fr.top + cr.top - sr.top, width: cr.width, height: cr.height };
    if (!hoverAny) {
      hit.style.cssText =
        `display:block;left:${chartBox.left}px;top:${chartBox.top}px;width:${chartBox.width}px;height:${chartBox.height}px`;
    }
    // Popover position is owned by Floating UI's autoUpdate (started on reveal),
    // so reflow only pins the Present hit-surface here.
  }

  function hide() { if (!hoverAny) hit.style.display = 'none'; }

  // Point the interaction at a specific <section>'s chart (the active Present
  // slide, or the hovered preview chart). Idempotent — re-selecting the same
  // section is a no-op so a hover stream doesn't thrash the open popover.
  function setChart(sec) {
    if (sec === curSection) return;
    clear();
    while (timers.length) clearTimeout(timers.pop());
    curSection = sec || null;
    chartEl = sec ? sec.querySelector('.piechart-svg') : null;
    detailsEl = sec ? sec.querySelector('.piechart-details') : null;
    // Only "interactive" when the authored detail is actually present.
    if (chartEl && detailsEl) {
      sliceN = detailsEl.querySelectorAll('template.piechart-detail').length
        || sec.querySelectorAll('.wedge[data-slice]').length;
      reflow();
    } else {
      curSection = chartEl = detailsEl = null; sliceN = 0; hide();
    }
  }

  // ── lifecycle: called after every slide change (Present/Practice) ───────────
  function onSlide(idx) {
    curIdx = idx | 0;
    const d = doc();
    setChart(d ? d.querySelectorAll('.marpit > section')[curIdx] : null);
    if (interactive()) {
      // The iframe re-fits at [60, 300, 1200]ms after a pv message; re-pin just after.
      [80, 360, 1240].forEach((t) => { timers.push(setTimeout(reflow, t)); });
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
    // Title parts come from the SVG legend (index-aligned); body/meta from the
    // authored <template>. All scoped to curSection so a multi-chart preview
    // reads the HOVERED chart's legend/detail, not the first chart in the doc.
    const label = textOf('.chart-key-label', i);
    const value = textOf('.chart-key-value', i);
    // The wedge fill is an SVG gradient ref (url(#…)), which is meaningless in the
    // parent doc — read the legend swatch's COMPUTED fill instead: its
    // color-mix(var(--chart-cat-N-hue)…) resolves (against the iframe's theme) to a
    // concrete colour the parent can paint.
    const swatch = curSection?.querySelectorAll('.chart-key-swatch')[i];
    const win = swatch?.ownerDocument?.defaultView || window;
    const dot = swatch ? win.getComputedStyle(swatch).fill : 'currentColor';
    const tpl = detailsEl?.querySelector(`template.piechart-detail[data-slice="${i}"]`);
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
    reflow();   // re-pin the Present hit-surface
    startPop(); // Floating UI owns the popover position from here
  }

  function textOf(sel, i) {
    if (!curSection) return '';
    const n = curSection.querySelectorAll(sel)[i];
    if (!n) return '';
    // A wrapped legend label is split across <tspan> lines; textContent would glue
    // them ("Actuallydeciding") — join the tspans with a space instead.
    const spans = n.querySelectorAll('tspan');
    return (spans.length ? [...spans].map((s) => s.textContent.trim()).join(' ') : n.textContent).trim();
  }

  // The popover anchors to the pie DISC (the union of the current chart's wedge
  // boxes), not an individual wedge — a calm, stable spot; the active slice is
  // already identified by the lift, the dim, and the popover's colour dot + label.
  // Floating UI anchors to a VIRTUAL REFERENCE: an object exposing the disc's box
  // in viewport coords, mapped from the iframe's own geometry through its offset.
  // That sidesteps the cross-iframe problem (no DOM node to point at) and lets the
  // engine do the hard part — flip below↔above, shift to stay in view.
  const EMPTY_RECT = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
  const discRect = () => {
    if (!curSection) return EMPTY_RECT;
    const wedges = curSection.querySelectorAll('.wedge[data-slice]');
    if (!wedges.length) return EMPTY_RECT;
    let fr;
    try { fr = getFrame().getBoundingClientRect(); } catch { return EMPTY_RECT; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    wedges.forEach((w) => {
      const r = w.getBoundingClientRect();
      minX = Math.min(minX, fr.left + r.left); minY = Math.min(minY, fr.top + r.top);
      maxX = Math.max(maxX, fr.left + r.right); maxY = Math.max(maxY, fr.top + r.bottom);
    });
    return { x: minX, y: minY, left: minX, top: minY, right: maxX, bottom: maxY, width: maxX - minX, height: maxY - minY };
  };
  const virtualRef = { getBoundingClientRect: discRect };

  function placePop() {
    computePosition(virtualRef, pop, {
      placement: 'bottom',
      strategy: 'absolute',
      middleware: [offset(12), flip({ padding: 8 }), shift({ padding: 8 })],
    }).then(({ x, y }) => {
      pop.style.left = `${Math.round(x)}px`;
      pop.style.top = `${Math.round(y)}px`;
    }).catch(() => { /* frame torn down mid-measure */ });
  }

  // Keep the popover pinned to the disc while it's open — autoUpdate re-runs
  // placePop on scroll/resize/layout shift (animationFrame:true also catches the
  // iframe's OWN internal scroll, which ancestor listeners would miss).
  function startPop() {
    stopPop();
    stopAutoUpdate = autoUpdate(virtualRef, pop, placePop, { animationFrame: true });
  }
  function stopPop() {
    if (stopAutoUpdate) { stopAutoUpdate(); stopAutoUpdate = null; }
  }

  // ── interaction-coupled tilt (settles flat; resting chart stays proportion-true) ──
  function liftAndTilt(i) {
    if (!chartEl || !curSection) return;
    const wedges = curSection.querySelectorAll('.wedge[data-slice]');
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
    stopPop();
    pop.classList.remove('show');
    if (curSection) curSection.querySelectorAll('.wedge[data-slice]').forEach((w) => { w.style.opacity = ''; w.style.transform = ''; });
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

  // ── PRESENT/PRACTICE: pointer wiring on the pinned hit-surface ───────────────
  // Fine pointer (mouse): hover-follow. Coarse (touch): tap a slice to reveal,
  // tap again / off-slice to clear.
  if (!hoverAny) {
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
  }

  // ── PREVIEW (hoverAny): listen on the iframe document; reveal the chart under
  // the pointer. No hit-surface, so the author can still scroll/select the slide.
  function resolveAt(target) {
    const w = target?.closest?.('[data-slice]');
    if (!w) return -1;
    setChart(w.closest('.marpit > section') || w.closest('section'));
    return interactive() ? +w.dataset.slice : -1;
  }
  function onDocMove(e) {
    const s = resolveAt(e.target);
    if (s >= 0) reveal(s); else if (openSlice >= 0) clear();
  }
  function onDocTap(e) {
    const s = resolveAt(e.target);
    if (s < 0 || s === openSlice) clear(); else reveal(s);
  }
  const onDocLeave = () => clear();
  const onDocScroll = () => { if (openSlice >= 0) reflow(); };
  function bindDoc() {
    const d = doc();
    if (!d || d === boundDoc) return;
    boundDoc = d;
    if (!COARSE) {
      d.addEventListener('pointermove', onDocMove, { passive: true });
      d.addEventListener('pointerleave', onDocLeave);
    } else {
      d.addEventListener('pointerdown', onDocTap, { passive: true });
    }
    d.addEventListener('scroll', onDocScroll, { passive: true, capture: true });
  }
  function unbindDoc() {
    if (!boundDoc) return;
    try {
      boundDoc.removeEventListener('pointermove', onDocMove);
      boundDoc.removeEventListener('pointerleave', onDocLeave);
      boundDoc.removeEventListener('pointerdown', onDocTap);
      boundDoc.removeEventListener('scroll', onDocScroll, { capture: true });
    } catch { /* doc already torn down */ }
    boundDoc = null;
  }
  // A srcdoc rewrite replaces the document (listeners + section refs die with it).
  // Hosts may call this (the Drawing Board does, on `db-frame-ready`); it's also
  // wired to the iframe's own `load` below. unbindDoc() first so a re-bind to the
  // SAME live doc can't double-attach — bindDoc's own d===boundDoc guard is moot.
  function rebind() {
    unbindDoc();
    curSection = null; chartEl = detailsEl = null; openSlice = -1;
    if (hoverAny) bindDoc();
  }
  // Self-sufficient re-bind: the iframe ELEMENT persists across srcdoc rewrites,
  // but its DOCUMENT is replaced and fires `load` once it's parseable. Binding to
  // that is more robust than relying on the host to call rebind() at the right
  // moment — the React playground's render() can return "done" before the new
  // doc is ready, so a host-timed rebind() would no-op (doc() still null) and the
  // listeners would never attach. A document patch (no srcdoc rewrite) keeps the
  // same doc, so `load` doesn't fire and the surviving listeners are reused.
  let frameEl = null;
  if (hoverAny) {
    frameEl = getFrame();
    if (frameEl) frameEl.addEventListener('load', rebind);
    bindDoc();
  }

  let ro = null;
  try { ro = new ResizeObserver(reflow); ro.observe(stage); } catch { /* older browser */ }
  window.addEventListener('resize', reflow);

  function destroy() {
    clear();
    while (timers.length) clearTimeout(timers.pop());
    if (frameEl) { try { frameEl.removeEventListener('load', rebind); } catch { /* gone */ } }
    unbindDoc();
    curSection = chartEl = detailsEl = null;
    try { ro?.disconnect(); } catch { /* noop */ }
    window.removeEventListener('resize', reflow);
    root.remove();
  }

  return { onSlide, reflow, handleKey, reveal, clear, interactive, rebind, destroy };
}
