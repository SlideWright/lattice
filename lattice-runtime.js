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

  // ── Build Mermaid themeVariables from the active theme's CSS custom properties ──
  // Reads computed values from the loaded theme CSS file (indaco.css, cuoio.css, …)
  // so that themeVariables always match whatever theme is active in the Marp preview.
  // The CSS variables referenced here are the same --mermaid-* tokens defined in
  // each theme file's :root block. This replaces the old hardcoded cuoio block that
  // caused every preview to show cuoio colors regardless of the active theme.
  function buildMermaidThemeVars() {
    if (typeof document === 'undefined') return {};
    const s = getComputedStyle(document.documentElement);
    const v = (name) => s.getPropertyValue('--' + name).trim();

    const bg      = v('bg');
    const bgAlt   = v('bg-alt');
    const text    = v('text-heading');
    const border  = v('mermaid-border');
    const line    = v('mermaid-line');
    const primary = v('mermaid-primary-color');
    const second  = v('mermaid-secondary-color');
    const slate   = v('mermaid-mid-slate');

    return {
      fontFamily: v('font-body') || "'Outfit', system-ui, sans-serif",
      fontSize: '14px',

      // Canvas and primary fills
      background:               bg,
      primaryColor:             primary,
      primaryTextColor:         text,
      primaryBorderColor:       border,
      secondaryColor:           second,
      secondaryTextColor:       text,
      secondaryBorderColor:     border,
      tertiaryColor:            bgAlt,
      tertiaryBorderColor:      border,
      tertiaryTextColor:        text,
      textColor:                text,
      titleColor:               text,
      labelTextColor:           text,
      loopTextColor:            text,
      classText:                text,
      labelColor:               text,

      // Lines
      lineColor:                line,
      defaultLinkColor:         line,
      edgeLabelBackground:      bg,
      labelBackground:          bg,

      // Flowchart
      mainBkg:                  primary,
      nodeBorder:               border,
      nodeTextColor:            text,
      clusterBkg:               bgAlt,
      clusterBorder:            border,

      // Categorical scale — cScale feeds kanban columns, mindmap levels, etc.
      // CSS themeCSS overrides already target kanban and mindmap explicitly;
      // cScale is the fallback for other diagrams that read it directly.
      cScale0:  v('mermaid-mid-blue'),   cScale1:  v('mermaid-mid-green'),
      cScale2:  v('mermaid-mid-purple'), cScale3:  v('mermaid-mid-orange'),
      cScale4:  v('mermaid-mid-teal'),   cScale5:  v('mermaid-mid-rose'),
      cScale6:  v('mermaid-mid-blue'),   cScale7:  v('mermaid-mid-green'),
      cScale8:  v('mermaid-mid-purple'), cScale9:  v('mermaid-mid-orange'),
      cScale10: v('mermaid-mid-teal'),   cScale11: v('mermaid-mid-rose'),

      // fillType — subgraph and mindmap level fills (pale band)
      fillType0: primary,              fillType1: second,
      fillType2: v('mermaid-pie-purple'), fillType3: v('mermaid-pie-orange'),
      fillType4: v('mermaid-pie-teal'),   fillType5: v('mermaid-pie-rose'),
      fillType6: primary,              fillType7: second,

      // Sequence diagram
      actorBkg:              primary,
      actorBorder:           border,
      actorTextColor:        text,
      actorLineColor:        line,
      signalColor:           line,
      signalTextColor:       text,
      labelBoxBkgColor:      bgAlt,
      labelBoxBorderColor:   border,
      activationBkgColor:    primary,
      activationBorderColor: border,
      sequenceNumberColor:   text,

      // Notes
      noteBkgColor:    v('mermaid-note-bg'),
      noteTextColor:   text,
      noteBorderColor: v('mermaid-note-border'),

      // Error
      errorBkgColor:  v('mermaid-error-bg'),
      errorTextColor: v('mermaid-error-text'),

      // Pie chart
      pie1:  primary,               pie2:  second,
      pie3:  v('mermaid-pie-purple'), pie4:  v('mermaid-pie-orange'),
      pie5:  v('mermaid-pie-teal'),   pie6:  v('mermaid-pie-rose'),
      pie7:  v('mermaid-pie-yellow'), pie8:  v('mermaid-pie-red'),
      pie9:  v('mermaid-pie-slate'),  pie10: v('mermaid-pie-sage'),
      pie11: v('mermaid-pie-violet'), pie12: primary,
      pieTitleTextSize:    '18px',
      pieTitleTextColor:   text,
      pieSectionTextSize:  '14px',
      pieSectionTextColor: text,
      pieLegendTextSize:   '13px',
      pieLegendTextColor:  text,
      pieStrokeColor:      bg,
      pieStrokeWidth:      '2px',
      pieOuterStrokeWidth: '2px',
      pieOuterStrokeColor: border,
      pieOpacity:          '1',

      // Gantt
      sectionBkgColor:        bgAlt,
      altSectionBkgColor:     bg,
      sectionBkgColor2:       primary,
      taskBkgColor:           primary,
      taskTextColor:          text,
      taskTextLightColor:     text,
      taskTextOutsideColor:   text,
      taskTextDarkColor:      text,
      taskBorderColor:        border,
      activeTaskBkgColor:     v('mermaid-gantt-active'),
      activeTaskBorderColor:  v('mermaid-gantt-active-border'),
      gridColor:              v('mermaid-gantt-grid'),
      doneTaskBkgColor:       v('mermaid-gantt-done'),
      doneTaskBorderColor:    v('mermaid-gantt-done-border'),
      critBkgColor:           v('mermaid-gantt-critical'),
      critBorderColor:        v('mermaid-gantt-critical-border'),
      todayLineColor:         v('mermaid-gantt-today'),

      // Git graph
      git0: v('mermaid-mid-blue'),   git1: v('mermaid-mid-green'),
      git2: v('mermaid-mid-purple'), git3: v('mermaid-mid-orange'),
      git4: v('mermaid-mid-teal'),   git5: v('mermaid-mid-rose'),
      git6: v('mermaid-mid-slate'),  git7: v('mermaid-mid-mauve'),
      gitBranchLabel0: text, gitBranchLabel1: text,
      gitBranchLabel2: text, gitBranchLabel3: text,
      gitBranchLabel4: text, gitBranchLabel5: text,
      gitBranchLabel6: text, gitBranchLabel7: text,
      commitLabelColor:      text,
      commitLabelBackground: bgAlt,
      tagLabelColor:         bg,
      tagLabelBackground:    border,
      tagLabelBorder:        text,

      // Quadrant chart
      quadrant1Fill:                    v('mermaid-quadrant-1-fill'),
      quadrant2Fill:                    v('mermaid-quadrant-2-fill'),
      quadrant3Fill:                    v('mermaid-quadrant-3-fill'),
      quadrant4Fill:                    v('mermaid-quadrant-4-fill'),
      quadrant1TextFill:                v('mermaid-quadrant-1-text'),
      quadrant2TextFill:                v('mermaid-quadrant-2-text'),
      quadrant3TextFill:                v('mermaid-quadrant-3-text'),
      quadrant4TextFill:                v('mermaid-quadrant-4-text'),
      quadrantPointFill:                border,
      quadrantPointTextFill:            text,
      quadrantXAxisTextFill:            text,
      quadrantYAxisTextFill:            text,
      quadrantInternalBorderStrokeFill: slate,
      quadrantExternalBorderStrokeFill: border,
      quadrantTitleFill:                text,

      // State / class diagram
      altBackground: bgAlt,

      // XY chart
      xyChart: {
        backgroundColor: bg,
        titleColor:       text,
        xAxisTitleColor:  text,
        xAxisLabelColor:  text,
        xAxisLineColor:   border,
        xAxisTickColor:   slate,
        yAxisTitleColor:  text,
        yAxisLabelColor:  text,
        yAxisLineColor:   border,
        yAxisTickColor:   slate,
        plotColorPalette: [
          v('mermaid-mid-blue'),   v('mermaid-mid-green'),
          v('mermaid-mid-purple'), v('mermaid-mid-orange'),
          v('mermaid-mid-teal'),   v('mermaid-mid-rose'),
        ].join(','),
      },

      // ER diagram
      attributeBackgroundColorOdd:  primary,
      attributeBackgroundColorEven: bgAlt,
    };
  }

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
        securityLevel: "loose", // Required to allow HTML (e.g. <br/>) in node labels; htmlLabels:true alone is not sufficient.
        layout: "tidy-tree",
        htmlLabels: true,
        markdownAutoWrap: false, // Marp doesn't support line breaks in code fences, so disable Mermaid's auto-wrapping to avoid unexpected formatting changes.
        themeVariables: buildMermaidThemeVars(),
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
