---
status: shipped
summary: G8 Studio performance. Profiling overturned the backlog's premise — the "UI hangs" was largely a dev-server artifact (jsxDEV + unbundled modules, ~50× inflated), and the two paths slated for web workers (theme derivation 0.5 ms, lint 0.006 ms) are sub-millisecond, so a worker can't pay. The real, production-grade wins: (1) the live preview re-rendered the full engine on EVERY keystroke — fixed with an opt-in trailing debounce on the shared DeckPreview (prod 53 ms→0 ms median blocking) plus closing an active-edge effect that leaked an un-debounced render per keystroke; (2) the PDF/PPTX export froze the tab for ~5 s with zero feedback — fixed by threading per-slide progress (the Studio passed onStatus: undefined) and yielding to the event loop between slides so the tab paints + stays responsive (bytes unchanged).
---

# G8 — Studio main-thread performance: measure first, then fix the real thing

**Closes #43** (G8 of the Studio polish backlog, `2026-06-28-studio-polish-backlog.md`).

The backlog item read: *"UI can hang — profile main-thread blocking (engine render,
per-keystroke lint, export rasterization, theme derivation); offload to web workers
where it pays."* The instruction to profile first is what saved this from shipping
the wrong fix.

## What the profiling actually found

A CPU/long-task harness (puppeteer + `PerformanceObserver('longtask')` + a CDP CPU
profile, bucketed by script) over a 106-character typing burst and a real PDF export.

**Finding 1 — the headline "3-second hang" was mostly a dev-server artifact.**

| Build | Per-keystroke blocking (median) | Long tasks / burst |
|---|---|---|
| Vite **dev** server | 3,432 ms | 44–70 |
| **Production**, before | **53 ms** (spikes ~200 ms) | 0–4 |
| **Production**, after | **0 ms** | 0–2 |

The dev profile's top self-time was `jsxDEV` (React's dev-mode JSX factory, ~1.5 s)
+ unbundled per-module loading — none of which exists in the built site users hit on
Cloudflare Pages. **Always profile the production build for a main-thread claim.**

**Finding 2 — the worker plan doesn't pay.** The two pure paths the backlog wanted on
workers are already trivial: `deriveTheme`+`auditBoth`+`serialize` = **0.5 ms**, the
lint scan (`scoreDeck`/`unknownComponents`) = **0.006 ms**. The one real per-keystroke
cost is the engine *preview render*, whose dominant slice is DOM injection + the
Fit-Spine measurement + paint — all of which **must** stay on the main thread. The
workerable slice (markdown→HTML) is ~1 ms of a ~38 ms render. A worker would add
complexity to save ~1 ms. Rejected on evidence.

## Fix 1 — stop re-rendering the preview on every keystroke

`EditorView.updateListener` → `setSource` fires per keystroke, and the shared
`DeckPreview` re-ran the **whole engine** on each `sample` change with no coalescing.
Added an **opt-in `debounceMs`** to `DeckPreview`: the first paint is immediate, then
rapid changes coalesce to one trailing render. Wired `debounceMs={140}` into the three
interactive hosts (deck editor, Fabricate theme canvas, Component canvas); static hosts
(landing, showcases) keep `0` = eager.

While adding it, the test caught a real bug in the *existing* code: the active-edge
effect (`requestAnimationFrame(render)` with `[active, render]` deps) re-fired on every
content change, leaking an un-debounced render past the debounce. Fixed to fire only on
a true rising edge of `active`, reading the latest render via a ref. That closed the leak
(prod typing → 0 ms / 0 long tasks) and removed a redundant mount double-render.

## Fix 2 — the export was the real freeze (and it was silent)

A ~6-slide PDF export: **~16 s wall, 5.1 s of main-thread blocking, an 877 ms freeze**,
and **no progress feedback** — the Studio passed `onStatus: undefined`, so the user saw a
bare spinner for 16 seconds. Two changes, both leaving the exported **bytes identical**
(so no export sign-off needed):

- **Progress** — thread a real `onStatus` from `ShareSheet` through `sharePdf`/`sharePptx`;
  the busy row now shows "Rendering slide 3 of 6…" live (verified end-to-end: all six slide
  states paint).
- **Yield between slides** — the per-slide rasterize (canvas encode) + jsPDF `addImage`
  (PNG deflate) are inherently synchronous and can't leave the main thread; a `setTimeout`
  yield after each slide lets the browser paint the progress and service input, so the
  export *advances visibly* instead of freezing solid. Total CPU is unchanged — this is a
  **responsiveness** fix, not a throughput one, and the honest framing is exactly that.

Lives in the shared export kernel (`drawing-board-export.js`), so the Drawing Board gets
the same treatment.

## Evidence & reproduction

Browser long-task A/B (not the Node `engine-bench`, which covers the transform, not the
UI): typing prod median **53 ms → 0 ms**; export progress **invisible → 6/6 slide states
painted**. The engine `bench` baseline is intentionally untouched — this PR changes UI
scheduling, not the engine transform, so those numbers neither move nor should.

## Off-path, logged not done

A worker for the markdown→HTML transform (~1 ms) and reducing the export's one-time
font-embed cost (the 877 ms task) are possible but low-value / higher-risk (font embed
touches export bytes). Left for a future slice if export speed ever becomes a real ask.
