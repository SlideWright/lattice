/* Last & Ledger — Mermaid bootstrap (minimal)
   Goal: fenced ```mermaid blocks render in Marp previews.

   Mermaid expects something like: <pre class="mermaid">graph TD ...</pre>
   Marp preview emits: <marp-pre><code class="language-mermaid">...</code></marp-pre>
   We upgrade those wrappers + run Mermaid after DOMContentLoaded.
*/

(function () {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  if (globalScope.__llMermaidBootstrapLoaded) return;
  globalScope.__llMermaidBootstrapLoaded = true;

  // Marp preview often re-renders slide DOM on edit without a full page reload.
  // A one-shot DOMContentLoaded init can miss newly inserted fences, making Mermaid
  // appear to "randomly" stop rendering. We keep a lightweight observer that
  // schedules Mermaid runs when Mermaid fences/containers are added/changed.

  let scheduledRunHandle = null;
  function scheduleRun(reason) {
    // Debounce: avoid running Mermaid for every keystroke / micro DOM update.
    if (scheduledRunHandle) return;
    scheduledRunHandle = setTimeout(() => {
      scheduledRunHandle = null;
      initAndRun();
    }, 200);
  }

  function upgradeFences() {
    for (const codeEl of document.querySelectorAll(
      [
        "pre > code.language-mermaid",
        "pre > code[class*='language-mermaid']",
        "marp-pre > code.language-mermaid",
        "marp-pre > code[class*='language-mermaid']",
      ].join(","),
    )) {
      const wrapper = codeEl.parentElement;
      if (!wrapper) continue;

      // If the fence was already upgraded/replaced, skip.
      if (wrapper.dataset.llMermaidUpgraded === "1") continue;

      const source = codeEl.textContent || "";

      // Marp preview/export wraps fences in <marp-pre> or <pre is="marp-pre" data-auto-scaling>
      // which can apply downscaling transforms. Replace the wrapper with a plain <div>
      // so our normal layout CSS (width, max-width, centering) can win.
      const replacement = document.createElement("div");
      replacement.className = "mermaid";
      replacement.textContent = source;
      replacement.dataset.llMermaidUpgraded = "1";

      wrapper.replaceWith(replacement);
    }
  }

  function initAndRun() {
    transformVerdictGridBadges();
    const mermaid = globalScope.mermaid;
    if (!mermaid) return false;

    upgradeFences();

    if (!globalScope.__llMermaidConfigured) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        layout: "tidy-tree",
        htmlLabels: true,
        markdownAutoWrap: false, // Marp doesn't support line breaks in code fences, so disable Mermaid's auto-wrapping to avoid unexpected formatting changes.
        themeVariables: {
          // ── Cuoio theme — see cuoio-mermaid-theme-reference.md ──────────────
          // Design intent: diagrams are drawings *in* the deck, not dashboards.
          // Warm brown ink on aged paper; gold is an emphasis accent, not a fill.
          //
          // Tonal ladder inside the warm family:
          //   canvas  #FAF7F2 → node  #F3EDE4 → subgraph  #E0D8CC
          //   node border #A69882 (muted taupe — jumps off cream)
          //   edge/arrow  #6B5D4F (body ink — recedes)
          //   emphasis    #8B6914 (accent gold — used sparingly)
          //
          // Categorical palette (6 earth pigments, not the --spectrum rainbow):
          //   gold #8B6914 · petrol #3E5C6B · iris #4F4770
          //   sienna #8B3A2E · moss #6E7A3A · rose #6E4558
          // Tints for deep mindmap levels sit one step lighter than the base.
          //
          // The two-palette rule (borrowed from ll-mermaidjs.js):
          //   • Small accent marks — pie slices, git dots, journey ticks,
          //     plot series, point fills — draw from the pigment palette.
          //   • Large surface fills — cScale (kanban/mindmap), quadrant
          //     regions, gantt sections — draw from the cream→taupe tonal
          //     ladder so adjacent regions read as brightness layering, not
          //     as hue salad.
          fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
          fontSize: "18px",

          // ── Shared (all diagrams) ────────────────────────────────────────
          background: "#FAF7F2",          // canvas — cream parchment
          primaryColor: "#F3EDE4",        // node fill — one step darker than canvas
          primaryTextColor: "#1E1A15",    // node text — heading ink
          primaryBorderColor: "#8B7E6D",  // node border — deep taupe (WCAG 1.4.11: 3.71x canvas, 3.40x node)
          secondaryColor: "#E0D8CC",      // container/cluster fill — two steps darker
          tertiaryColor: "#F5EFE0",       // notes / accent-soft wash
          tertiaryBorderColor: "#8B6914", // note border — the one place gold fills sit
          lineColor: "#6B5D4F",           // edges — warm brown ink, not gold
          textColor: "#6B5D4F",           // body-level diagram text
          mainBkg: "#F3EDE4",
          noteBkgColor: "#F5EFE0",
          noteBorderColor: "#8B6914",
          noteTextColor: "#1E1A15",
          errorBkgColor: "#9b1c1c",       // --fail (semantic only)

          // ── Flowchart ────────────────────────────────────────────────────
          nodeBorder: "#8B7E6D",
          nodeTextColor: "#1E1A15",
          clusterBkg: "#E0D8CC",          // subgraph band — tonal step down from nodes
          clusterBorder: "#6B5D4F",       // frames the cluster strongly
          defaultLinkColor: "#6B5D4F",    // brown edges — gold reserved for emphasis
          edgeLabelBackground: "#FAF7F2", // canvas-matched so labels float over arrows
          titleColor: "#1E1A15",

          // ── Sequence ─────────────────────────────────────────────────────
          actorBkg: "#F3EDE4",
          actorBorder: "#8B7E6D",
          actorTextColor: "#1E1A15",
          actorLineColor: "#A69882",      // lifelines recede (taupe, not gold)
          signalColor: "#6B5D4F",
          signalTextColor: "#6B5D4F",
          labelBoxBkgColor: "#F5EFE0",
          labelBoxBorderColor: "#8B6914",
          activationBkgColor: "#F5EFE0",  // activation = the one gold touch
          activationBorderColor: "#8B6914",
          sequenceNumberColor: "#FAF7F2",

          // ── Gantt ────────────────────────────────────────────────────────
          sectionBkgColor: "#F3EDE4",
          altSectionBkgColor: "#FAF7F2",
          sectionBkgColor2: "#F5EFE0",
          taskBkgColor: "#8B6914",        // gold task bars — the signature role
          taskTextColor: "#FAF7F2",
          taskTextLightColor: "#FAF7F2",
          taskTextOutsideColor: "#1E1A15",
          taskTextDarkColor: "#1E1A15",
          taskBorderColor: "#6B5D4F",
          activeTaskBkgColor: "#F5EFE0",
          activeTaskBorderColor: "#8B6914",
          doneTaskBkgColor: "#E0D8CC",
          doneTaskBorderColor: "#A69882",
          critBkgColor: "#9b1c1c",        // --fail (semantic)
          critBorderColor: "#9b1c1c",
          todayLineColor: "#8B3A2E",      // sienna — earthy, not the old hot coral
          gridColor: "#E0D8CC",

          // ── State diagram ────────────────────────────────────────────────
          labelColor: "#1E1A15",
          altBackground: "#F5EFE0",

          // ── Class diagram ────────────────────────────────────────────────
          classText: "#1E1A15",

          // ── Categorical scale — tonal ladder, NOT pigments ───────────────
          // Mermaid uses cScale0..11 as *surface fills* for diagrams where
          // sections are large rectangles (kanban columns, mindmap levels).
          // Saturated pigments belong on small accent marks (pie slices, git
          // dots, journey ticks) — those have their own explicit vars below.
          // For surface work we want the same tonal logic as the rest of the
          // deck: cream parchment, stepped by brightness, never by hue.
          //
          // Four-shade warm ladder, cycled 3× for 0–11 (same strategy as
          // ll-mermaidjs.js): phase/section order reads as a paper-stain
          // gradient rather than a highlighter set.
          //   step 1  #F5EFE0  note wash (lightest)
          //   step 2  #F3EDE4  node fill
          //   step 3  #E8DECF  mid taupe (interpolated)
          //   step 4  #E0D8CC  subgraph band (deepest)
          // Card/text ink #1E1A15 clears >10x AA on all four; node border
          // #8B7E6D stays visible on the deepest step.
          cScale0: "#F5EFE0", // step 1
          cScale1: "#F3EDE4", // step 2
          cScale2: "#E8DECF", // step 3
          cScale3: "#E0D8CC", // step 4
          cScale4: "#F5EFE0",
          cScale5: "#F3EDE4",
          cScale6: "#E8DECF",
          cScale7: "#E0D8CC",
          cScale8: "#F5EFE0",
          cScale9: "#F3EDE4",
          cScale10: "#E8DECF",
          cScale11: "#E0D8CC",

          // Pie slice fills use the same 6 pigments, cycling through tints.
          pie1:  "#8B6914", pie2:  "#3E5C6B", pie3:  "#8B3A2E", pie4:  "#4F4770",
          pie5:  "#5F6A2F", pie6:  "#76394C", pie7:  "#B38A2B", pie8:  "#6B8A98",
          pie9:  "#B05A48", pie10: "#7A7295", pie11: "#8E9B4C", pie12: "#A26878",
          pieTitleTextSize: "22px",        // title carries weight — lifted from body
          pieSectionTextSize: "16px",      // in-slice values meet sustained-read floor
          pieLegendTextSize: "15px",       // legend meets read-briefly floor
          pieStrokeColor: "#FAF7F2",       // cream separators keep slice edges crisp
          pieOuterStrokeWidth: "0px",      // no ring — pigments carry the boundary

          // ── User journey ────────────────────────────────────────────────
          // Task bubbles are small accent marks — pigments (not tints) so each
          // step is identifiable at thumbnail size. Section *bands* read from
          // cScale above (tonal ladder), so the surface-vs-accent rule holds
          // without a separate sectionFill block.
          fillType0: "#8B6914", fillType1: "#3E5C6B",
          fillType2: "#8B3A2E", fillType3: "#4F4770",
          fillType4: "#5F6A2F", fillType5: "#76394C",
          fillType6: "#B38A2B", fillType7: "#6B8A98",

          // ── Git graph (8 branches from the same base + tint row) ─────────
          git0: "#8B6914", git1: "#3E5C6B", git2: "#8B3A2E", git3: "#4F4770",
          git4: "#5F6A2F", git5: "#76394C", git6: "#B38A2B", git7: "#2d6a3f", // --pass at the tail
          // All base pigments are dark enough for cream labels; tints 4–6 too.
          gitBranchLabel0: "#FAF7F2", gitBranchLabel1: "#FAF7F2",
          gitBranchLabel2: "#FAF7F2", gitBranchLabel3: "#FAF7F2",
          gitBranchLabel4: "#FAF7F2", gitBranchLabel5: "#FAF7F2",
          gitBranchLabel6: "#1E1A15", // gold-tint · needs dark ink
          gitBranchLabel7: "#FAF7F2",
          commitLabelColor: "#1E1A15",
          commitLabelBackground: "#FAF7F2",
          tagLabelColor: "#1E1A15",
          tagLabelBackground: "#F5EFE0",
          tagLabelBorder: "#8B6914",

          // ── Quadrant chart ───────────────────────────────────────────────
          // Four distinct tonal steps for four regions (ll-mermaidjs pattern).
          // Each quadrant is visually distinguishable by brightness alone —
          // the reader can tell the quadrants apart without reading the
          // axis labels. Same cream→taupe ladder used everywhere else the
          // deck covers large surfaces with category.
          // Accent pigments (gold points) live on top; cream separators.
          quadrant1Fill: "#F5EFE0",  // note wash (lightest)  — top-right
          quadrant2Fill: "#F3EDE4",  // node fill             — top-left
          quadrant3Fill: "#E8DECF",  // mid taupe             — bottom-left
          quadrant4Fill: "#E0D8CC",  // subgraph band (deepest)— bottom-right
          quadrant1TextFill: "#1E1A15",
          quadrant2TextFill: "#1E1A15",
          quadrant3TextFill: "#1E1A15",
          quadrant4TextFill: "#1E1A15",
          quadrantInternalBorderStrokeFill: "#A69882",  // stronger to read over the darker steps
          quadrantExternalBorderStrokeFill: "#8B7E6D",
          quadrantTitleFill: "#1E1A15",
          quadrantXAxisTextFill: "#1E1A15",             // lift to ink — was muted (ll-mermaidjs uses full ink)
          quadrantYAxisTextFill: "#1E1A15",
          quadrantPointFill: "#8B6914",                 // gold — the accent stays on the point
          quadrantPointTextFill: "#1E1A15",

          // ── XY chart ─────────────────────────────────────────────────────
          xyChart: {
            backgroundColor: "#FAF7F2",
            titleColor: "#1E1A15",
            xAxisTitleColor: "#1E1A15",
            xAxisLabelColor: "#1E1A15",   // lift to ink for readability (ll-mermaidjs pattern)
            xAxisLineColor: "#8B7E6D",
            xAxisTickColor: "#A69882",
            yAxisTitleColor: "#1E1A15",
            yAxisLabelColor: "#1E1A15",
            yAxisLineColor: "#8B7E6D",
            yAxisTickColor: "#A69882",
            // Plot series use the six earth pigments in sequence.
            plotColorPalette:
              "#8B6914, #3E5C6B, #8B3A2E, #4F4770, #5F6A2F, #76394C",
          },

          // ── ER diagram ───────────────────────────────────────────────────
          // Entity boxes use the standard node ladder; attribute rows alternate
          // between node-fill and note-wash so row boundaries read clearly.
          // Relationship lines inherit lineColor (warm brown ink).
          attributeBackgroundColorOdd: "#F3EDE4",   // node fill
          attributeBackgroundColorEven: "#F5EFE0",  // note wash — subtle row alternation
        },
        quadrantChart: {
          titleFontSize: 24,
          pointTextPadding: 20,
          pointLabelFontSize: 14,
          pointRadius: 6,
          quadrantLabelFontSize: 18,
          yAxisLabelFontSize: 22,
          xAxisLabelFontSize: 22,
        },
        flowchart: {
          // Render flowcharts at intrinsic size, not stretched to container.
          // useMaxWidth:true scales the SVG's viewBox to fit 100% width, which
          // makes small-viewBox diagrams blow up and large ones shrink — giving
          // visually inconsistent sizing across the deck. false = intrinsic
          // pixel size; the slide-level h2 handles the title (SVG title is
          // suppressed by CSS in the slide context but retained for exports).
          useMaxWidth: false,
          htmlLabels: true,
          // Adds internal breathing room between node border and label.
          // (Only used by Mermaid's newer flowchart renderer, but harmless otherwise.)
          padding: 15,
          subGraphTitleMargin: {
            top: 10,
            bottom: 100,
          },
          // Reduce aggressive label wrapping in flowcharts.
          // Default is 200; larger values keep short phrases on one line.
          wrappingWidth: 480,
        },
      });
      globalScope.__llMermaidConfigured = true;
    }

    try {
      mermaid.run({
        querySelector:
          ".mermaid:not([data-processed]):not([data-ll-mermaid-static])",
        suppressErrors: true,
      });
    } catch (_err) {
      // fail soft
    }

    return true;
  }

  /**
   * Transforms verdict-grid badge items in VS Code preview (no Marp plugin).
   * Finds [x]/[~]/[ ] prefixed li items inside section.verdict-grid, strips
   * the prefix, and wraps the label in <span class="badge pass|warn|fail">.
   * Idempotent — skips li items that already contain a .badge span.
   */
  function transformVerdictGridBadges() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.verdict-grid')) {
      if (section.querySelector('.grid-verdict')) continue; // Marp CLI plugin already ran
      for (const outerLi of section.querySelectorAll(':scope > ul > li')) {
        const innerUl = outerLi.querySelector(':scope > ul');
        if (!innerUl) continue;
        const innerItems = [...innerUl.children];
        // Last item is body text — skip it; all others are badge items
        const badgeItems = innerItems.slice(0, -1);
        for (const li of badgeItems) {
          if (li.querySelector('.badge')) continue; // already transformed
          const text = li.textContent.trim();
          if (!/^\[/.test(text)) continue;
          const badgeClass = text.startsWith('[x]') ? 'badge pass'
                           : text.startsWith('[~]') ? 'badge warn'
                           : 'badge fail';
          const label = text.replace(/^\[[x~\s]\]\s*/, '');
          li.innerHTML = `<span class="${badgeClass}">${label}</span>`;
        }
      }
    }
  }

  function startObserver() {
    if (typeof MutationObserver === "undefined") return;
    if (globalScope.__llMermaidObserverStarted) return;
    globalScope.__llMermaidObserverStarted = true;

    const observer = new MutationObserver((mutations) => {
      // Only schedule a run when a Mermaid-relevant node is added/changed.
      for (const m of mutations) {
        if (m.type === "childList") {
          for (const node of m.addedNodes) {
            if (!(node instanceof HTMLElement)) continue;

            if (
              node.matches?.(
                ".mermaid, pre > code.language-mermaid, marp-pre > code.language-mermaid, code.language-mermaid",
              ) ||
              node.querySelector?.(
                ".mermaid, pre > code.language-mermaid, marp-pre > code.language-mermaid, code.language-mermaid",
              )
            ) {
              scheduleRun("dom-added");
              return;
            }
          }
        }

        // If Marp updates the text inside an existing code fence, characterData
        // mutations can fire (depending on renderer). Schedule a rerun.
        if (m.type === "characterData") {
          scheduleRun("dom-text");
          return;
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }

  function runWithRetries() {
    let attempts = 0;
    const maxAttempts = 40; // ~4s
    const delayMs = 100;

    const tick = () => {
      attempts += 1;
      initAndRun();
      if (attempts >= maxAttempts) return;
      setTimeout(tick, delayMs);
    };

    tick();
    // One extra pass later for late-rendered slide DOM.
    setTimeout(initAndRun, 700);

    // Keep Mermaid responsive to Marp live preview edits.
    startObserver();
  }

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWithRetries, {
      once: true,
    });
  } else {
    runWithRetries();
  }
})();
