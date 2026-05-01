/* Last & Ledger — Mermaid bootstrap
 *
 * Goal: render ```mermaid fenced blocks consistently across all three contexts
 * where Lattice decks live.
 *
 * ─── Deployment contexts ─────────────────────────────────────────────────
 * 1. Standalone HTML  (e.g. examples/gallery.html)
 *      Mermaid script tag + this file load at the bottom of <body>.
 *      DOM is fully built before we run; observer rarely fires after init.
 *
 * 2. Marp VS Code preview  (marp-team.marp-vscode extension)
 *      VS Code's webview re-renders the markdown preview on every edit using
 *      morphdom-style DOM diffing. When a slide changes, Marp typically emits
 *      a fresh <section> and morphdom replaces the old subtree → childList
 *      mutation. The observer below schedules a scoped re-render for that
 *      section only, leaving every other already-rendered diagram alone.
 *
 * 3. Marp CLI HTML export  (`marp -o deck.html deck.md`)
 *      Diagrams may already be pre-rendered to inline SVG by lattice.js. Such
 *      nodes carry data-ll-mermaid-static="1" and we skip them everywhere.
 *
 * ─── Why the wrapper is replaced (not just renamed) ──────────────────────
 * Marp wraps fences in <marp-pre data-auto-scaling> which applies a downscale
 * transform via shadow DOM. Replacing the wrapper with a plain <div class=
 * "mermaid"> escapes the transform and lets normal layout CSS govern size.
 * As a side benefit it forces morphdom into a node-replacement code path on
 * future edits (the new <pre> never matches our existing <div>), which is why
 * a childList-only observer is sufficient — no characterData watching needed.
 *
 * ─── Element lifecycle / data-attribute contract ─────────────────────────
 *   data-ll-mermaid-upgraded="1"  on the <div.mermaid> we created (idempotency)
 *   data-ll-source="…"            preserved fence source (parse-fail fallback)
 *   data-ll-mermaid-static="1"    CLI-prerendered SVG; never touch
 *   data-processed="true"         set by Mermaid synchronously at run start
 *
 * Because data-processed is set BEFORE the async render finishes, restoration
 * (which checks for a missing <svg>) must wait on the run promise.
 */

(function () {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  if (globalScope.__llMermaidBootstrapLoaded) return;
  globalScope.__llMermaidBootstrapLoaded = true;

  // ─── Selectors used in multiple places ──────────────────────────────────
  // Code-fence wrappers Marp produces in any of its output modes.
  const FENCE_SELECTOR = [
    "pre > code.language-mermaid",
    "pre > code[class*='language-mermaid']",
    "marp-pre > code.language-mermaid",
    "marp-pre > code[class*='language-mermaid']",
  ].join(",");

  // .mermaid divs that we created and Mermaid has not yet touched.
  // Excludes CLI-prerendered diagrams (data-ll-mermaid-static).
  const UNRENDERED_SELECTOR =
    ".mermaid:not([data-processed]):not([data-ll-mermaid-static])";

  // .mermaid divs Mermaid has touched but that have no SVG (parse failure).
  const FAILED_SELECTOR =
    ".mermaid[data-processed]:not([data-ll-mermaid-static])";

  // ── Build Mermaid themeVariables from the active theme's CSS custom properties ──
  // Reads computed values from the loaded theme CSS file (indaco.css, cuoio.css, …)
  // so that themeVariables always match whatever theme is active in the Marp preview.
  // The CSS variables referenced here are the same --mermaid-* tokens defined in
  // each theme file's :root block. This replaces the old hardcoded cuoio block that
  // caused every preview to show cuoio colors regardless of the active theme.
  function buildMermaidThemeVars() {
    if (typeof document === 'undefined') return {};
    // Marp scopes CSS custom properties to <section> elements, not :root.
    // Reading from document.documentElement always returns empty strings for
    // theme tokens. Use the first section in the DOM so getComputedStyle sees
    // the cascade from the Marp-scoped rule that actually defines these vars.
    const scopeEl = document.querySelector('section') ?? document.documentElement;
    const s = getComputedStyle(scopeEl);
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

  // ─── Cached theme variables ─────────────────────────────────────────────
  // buildMermaidThemeVars() reads ~45 CSS custom properties via
  // getComputedStyle, which is non-trivial. The retry loop calls initAndRun
  // up to 40× before the observer takes over; recomputing on every call adds
  // measurable cost in the Marp webview. Once we have a non-empty result
  // (sentinel: primaryColor) we lock it in — themes don't swap mid-session,
  // and Mermaid's themeVariables are fixed at initialize() time anyway.
  let _themeVarsCache = null;
  function getThemeVars() {
    if (_themeVarsCache) return _themeVarsCache;
    const v = buildMermaidThemeVars();
    if (v && v.primaryColor) _themeVarsCache = v;
    return v;
  }

  // ─── Scheduling ─────────────────────────────────────────────────────────
  // Trailing-edge debounce. A burst of mutations from a single Marp
  // re-render settles into one initAndRun call once the dust clears.
  let scheduledRunHandle = null;
  let pendingSections = new Set();
  const DEBOUNCE_MS = 200;

  function scheduleRun(section) {
    if (section instanceof Element) pendingSections.add(section);
    if (scheduledRunHandle) clearTimeout(scheduledRunHandle);
    scheduledRunHandle = setTimeout(flushScheduled, DEBOUNCE_MS);
  }

  function flushScheduled() {
    scheduledRunHandle = null;
    // Drop sections that were detached before the debounce fired (Marp can
    // replace a slide twice in quick succession; the older reference is
    // orphaned). Operating on detached nodes is harmless but wasteful.
    const targets = [];
    for (const s of pendingSections) {
      if (s.isConnected) targets.push(s);
    }
    pendingSections = new Set();
    initAndRun(targets.length > 0 ? targets : null);
  }

  // ─── Fence upgrade ──────────────────────────────────────────────────────
  // Replace Marp's fence wrappers (<pre>, <marp-pre>) with a plain
  // <div class="mermaid"> Mermaid will render in place. Idempotent — every
  // upgraded div carries data-ll-mermaid-upgraded so re-running is a no-op.
  //
  // roots: optional array of elements to scope the search to those subtrees.
  //        null/undefined → whole document (initial load + retry loop).
  function upgradeFences(roots) {
    const searchRoots = (roots && roots.length > 0) ? roots : [document];
    for (const root of searchRoots) {
      for (const codeEl of root.querySelectorAll(FENCE_SELECTOR)) {
        const wrapper = codeEl.parentElement;
        if (!wrapper) continue;
        if (wrapper.dataset.llMermaidUpgraded === "1") continue;

        const source = codeEl.textContent || "";
        const replacement = document.createElement("div");
        replacement.className = "mermaid";
        replacement.textContent = source;
        replacement.dataset.llMermaidUpgraded = "1";
        // Preserve source for the parse-failure fallback (see initAndRun).
        replacement.dataset.llSource = source;
        wrapper.replaceWith(replacement);
      }
    }
  }

  // ─── Mermaid lifecycle ──────────────────────────────────────────────────
  // initAndRun is the single entry point that drives Mermaid. It is
  // idempotent and safe to call repeatedly; each call only acts on the
  // unrendered subset of diagrams within `targets` (or the whole document
  // when targets is null).
  //
  // Returns true once Mermaid is configured AND a run was dispatched (or
  // there was nothing left to render). The retry loop uses this to stop
  // ticking after the initial render succeeds.
  let _mermaidConfigured = false;

  function initAndRun(targets) {
    transformVerdictGridBadges();

    const mermaid = globalScope.mermaid;
    if (!mermaid) return false;

    // Only walk the document/affected sections to upgrade fences.
    upgradeFences(targets);

    // Sentinel guard: in the Marp webview, the first tick can race the
    // stylesheet load and getComputedStyle returns "" for every --mermaid-*
    // var. Locking themeVariables to empty strings makes Mermaid fall back
    // to its own #fff4dd default → yellow clusters cascade into wrong cScale
    // values. Wait until at least primaryColor resolves.
    const themeVars = getThemeVars();
    if (!_mermaidConfigured && (!themeVars || !themeVars.primaryColor)) {
      return false;
    }

    if (!_mermaidConfigured) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        // securityLevel:"loose" is required to allow HTML (e.g. <br/>) inside
        // node labels; htmlLabels:true alone is not sufficient.
        securityLevel: "loose",
        // Don't render Mermaid's own error SVG on parse failure: it uses a
        // fixed 2412×512 viewBox with content at x=1440 that overflows the
        // slide. Our :not(:has(svg)) CSS fallback shows the raw source as a
        // styled code block instead — see lattice.css.
        suppressErrorRendering: true,
        layout: "tidy-tree",
        htmlLabels: true,
        // Marp can't represent line breaks inside fenced code blocks, so
        // disable Mermaid's auto-wrap to keep label text predictable.
        markdownAutoWrap: false,
        themeVariables: themeVars,
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
          // useMaxWidth:true scales the SVG viewBox to 100% container width,
          // which makes small diagrams blow up and large ones shrink. false
          // keeps intrinsic size and gives consistent visual weight across
          // the deck.
          useMaxWidth: false,
          htmlLabels: true,
          padding: 15,
          subGraphTitleMargin: { top: 10, bottom: 100 },
          // Default 200 wraps short labels too aggressively for dense decks.
          wrappingWidth: 480,
        },
      });
      _mermaidConfigured = true;
    }

    // Build the render set.
    //   targets present  → mermaid.run({ nodes }) — scoped, leaves other
    //                      sections' rendered diagrams completely untouched.
    //   targets null     → mermaid.run({ querySelector }) — global scan for
    //                      first-time / retry-loop / observer-less runs.
    let runOpts;
    if (targets) {
      const nodes = [];
      for (const section of targets) {
        for (const el of section.querySelectorAll(UNRENDERED_SELECTOR)) {
          nodes.push(el);
        }
      }
      if (nodes.length === 0) return true;
      runOpts = { nodes, suppressErrors: true };
    } else {
      runOpts = { querySelector: UNRENDERED_SELECTOR, suppressErrors: true };
    }

    // mermaid.run is async: it stamps data-processed="true" synchronously
    // and renders each node via a Promise chain. Restoring source text in
    // .then() ensures we only restore diagrams that genuinely failed (no
    // <svg> child after the run completes), not ones still mid-render.
    let runPromise;
    try {
      runPromise = mermaid.run(runOpts);
    } catch (_err) {
      runPromise = Promise.resolve();
    }

    const restoreRoots = targets ?? [document];
    Promise.resolve(runPromise).then(() => {
      for (const root of restoreRoots) {
        for (const el of root.querySelectorAll(FAILED_SELECTOR)) {
          if (!el.querySelector("svg") && el.dataset.llSource) {
            el.textContent = el.dataset.llSource;
          }
        }
      }
    });

    return true;
  }

  /**
   * Transforms verdict-grid badge items in VS Code preview (no Marp plugin).
   * Finds [x]/[~]/[ ] prefixed li items inside section.verdict-grid, strips
   * the prefix, and wraps the label in <span class="badge pass|warn|fail">.
   * Idempotent — skips li items that already contain a .badge span.
   *
   * Lives here because the runtime script is the only JS that ships with
   * decks in every deployment context; moving it out would require a second
   * <script> tag in every template. Kept self-contained so it can be lifted
   * later if a separate badge-transform module emerges.
   */
  function transformVerdictGridBadges() {
    if (typeof document === "undefined") return;
    for (const section of document.querySelectorAll("section.verdict-grid")) {
      if (section.querySelector(".grid-verdict")) continue; // Marp CLI plugin already ran
      for (const outerLi of section.querySelectorAll(":scope > ul > li")) {
        const innerUl = outerLi.querySelector(":scope > ul");
        if (!innerUl) continue;
        const innerItems = [...innerUl.children];
        // Last item is body text — skip it; all others are badge items.
        const badgeItems = innerItems.slice(0, -1);
        for (const li of badgeItems) {
          if (li.querySelector(".badge")) continue;
          const text = li.textContent.trim();
          if (!/^\[/.test(text)) continue;
          const badgeClass = text.startsWith("[x]") ? "badge pass"
                           : text.startsWith("[~]") ? "badge warn"
                           : "badge fail";
          const label = text.replace(/^\[[x~\s]\]\s*/, "");
          li.innerHTML = `<span class="${badgeClass}">${label}</span>`;
        }
      }
    }
  }

  // ─── MutationObserver: live-edit support ────────────────────────────────
  // The observer's only job is to notice newly-inserted Mermaid fences and
  // hand the containing <section> off to scheduleRun for a scoped re-render.
  //
  // Why childList only (no characterData):
  //   Marp's preview re-render arrives via morphdom diffing. Because we
  //   replaced the original <pre> with a <div class="mermaid">, morphdom
  //   sees a tag mismatch when the new HTML arrives and replaces the entire
  //   subtree → childList mutation. characterData would only fire if Marp
  //   patched a text node inside an existing fence-wrapper, which the tag
  //   replacement makes impossible. Adding it back floods us with noise
  //   from every SVG <text> Mermaid creates during its own render.
  //
  // Why we don't watch .mermaid additions:
  //   We create them inside upgradeFences, which is called from initAndRun.
  //   Watching them would self-trigger a second initAndRun 200ms later; the
  //   second run's restoration phase fires while the first is still rendering
  //   and clobbers the in-progress SVG with restored source text.
  function startObserver() {
    if (typeof MutationObserver === "undefined") return;

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "childList") continue;
        for (const node of m.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(FENCE_SELECTOR) || node.querySelector(FENCE_SELECTOR)) {
            // Walk to the containing <section> so the re-render is scoped to
            // just that slide. If the addedNode is itself outside any section
            // (rare: header/footer mutations), fall back to the node itself.
            const section = node.closest("section") ?? node;
            scheduleRun(section);
            return; // one schedule per mutation batch is enough
          }
        }
      }
    });

    observer.observe(document.body, { subtree: true, childList: true });
  }

  // ─── Entry point ────────────────────────────────────────────────────────
  // Marp's webview can deliver the slide DOM after our script runs, and the
  // Mermaid script can finish loading after DOMContentLoaded. We tick
  // initAndRun up to 40 × 100ms (4s) plus one extra pass at 700ms, then
  // hand off to the observer. The retry loop short-circuits as soon as
  // Mermaid is configured AND no unrendered fences remain — there's no
  // value in scanning the whole document 40 times once everything's drawn.
  function runWithRetries() {
    let attempts = 0;
    const maxAttempts = 40;
    const delayMs = 100;

    const tick = () => {
      attempts += 1;
      const ok = initAndRun();
      // Stop early once we've configured Mermaid and there is nothing left
      // to render globally. The observer takes over from here.
      if (ok && _mermaidConfigured &&
          !document.querySelector(UNRENDERED_SELECTOR) &&
          !document.querySelector(FENCE_SELECTOR)) {
        return;
      }
      if (attempts >= maxAttempts) return;
      setTimeout(tick, delayMs);
    };

    tick();
    // One late pass for slide DOM that arrived after the retry window.
    setTimeout(() => initAndRun(), 700);
    startObserver();
  }

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runWithRetries, { once: true });
  } else {
    runWithRetries();
  }
})();
