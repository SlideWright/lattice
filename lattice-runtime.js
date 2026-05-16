/* Last & Ledger — Mermaid bootstrap (minimal)
   Goal: fenced ```mermaid blocks render in Marp previews.

   Mermaid expects something like: <pre class="mermaid">graph TD ...</pre>
   Marp preview emits: <marp-pre><code class="language-mermaid">...</code></marp-pre>
   We upgrade those wrappers + run Mermaid after DOMContentLoaded.
*/

(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  if (globalScope.__llMermaidBootstrapLoaded) return;
  globalScope.__llMermaidBootstrapLoaded = true;

  // Marp preview often re-renders slide DOM on edit without a full page reload.
  // A one-shot DOMContentLoaded init can miss newly inserted fences, making Mermaid
  // appear to "randomly" stop rendering. We keep a lightweight observer that
  // schedules Mermaid runs when Mermaid fences/containers are added/changed.

  // ── Build Mermaid themeVariables from the active theme's CSS custom properties ──
  // Reads computed values from the loaded palette file (themes/indaco.css,
  // themes/cuoio.css, …) so that themeVariables always match whatever palette
  // is active in the Marp preview. The CSS variables referenced here are the
  // --diagram-* tokens each palette declares; the renderer is otherwise
  // palette-blind. Per-diagram CSS overrides live in lattice.css's DIAGRAM
  // OVERRIDES section (loaded via the page stylesheet), not in this runtime —
  // only Mermaid's own themeVariables API surfaces are wired up here.
  // See docs/notes/2026-05-12-diagram-tokens.md for the architecture.
  function buildMermaidThemeVars() {
    if (typeof document === 'undefined') return {};
    // Marp scopes CSS custom properties to <section> elements, not :root.
    // Reading from document.documentElement always returns empty strings for
    // theme tokens. Use the first section in the DOM so getComputedStyle sees
    // the cascade from the Marp-scoped rule that actually defines these vars.
    const scopeEl = document.querySelector('section') ?? document.documentElement;
    const s = getComputedStyle(scopeEl);
    const v = (name) => s.getPropertyValue('--' + name).trim();

    // Colour resolver. CSS custom properties returned via getPropertyValue
    // come back as the raw token stream — so a token defined as
    // `light-dark(#FAF7F2, #15110D)` reads as that literal string, which
    // Mermaid's color parser rejects with "Unsupported color format".
    // Setting a real `color` property to `var(--name)` on a probe element
    // forces the browser to resolve light-dark() / color-mix() / etc. to
    // a flat rgb() value, which Mermaid accepts. The probe inherits
    // color-scheme from `scopeEl`, so per-section dark contexts resolve
    // to the dark side automatically. Falls back to raw string access for
    // non-color tokens (fontFamily etc.).
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
    scopeEl.appendChild(probe);
    const vc = (name) => {
      probe.style.color = '';
      probe.style.color = `var(--${name})`;
      const c = getComputedStyle(probe).color;
      if (c && c !== 'rgba(0, 0, 0, 0)') return c;
      // Probe didn't resolve — either the var is undefined or the value uses
      // a function the browser doesn't support (e.g. light-dark() on older
      // Chromium builds). Parse light-dark() manually so Mermaid never sees
      // the raw token string, which it rejects as "Unsupported color format".
      const raw = v(name);
      const ld = /^light-dark\(\s*([^,]+?)\s*,\s*(.+?)\s*\)$/i.exec(raw);
      if (ld) {
        const isDark = (getComputedStyle(scopeEl).colorScheme || '').includes('dark');
        return isDark ? ld[2].trim() : ld[1].trim();
      }
      return raw;
    };

    const bg      = vc('bg');
    const bgAlt   = vc('bg-alt');
    const text    = vc('text-heading');
    const ink     = vc('c-ink-light');
    const border  = vc('c-stroke');
    const line    = vc('c-line');
    const primary = vc('c1-light');
    const second  = vc('c2-light');
    const slate   = vc('c8-dark');

    const result = {
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

      // Categorical scale — cScale feeds kanban columns, mindmap levels,
      // gitgraph branches, etc. lattice-diagram.css already routes pale
      // section fills through --cN-light for the diagrams we override
      // explicitly; cScale is the fallback for diagrams that read it
      // directly (or for the saturated-mark mode kanban applies before
      // the lighten step). Fed from --cat-* (mid-tone L≈60).
      cScale0:  vc('c1-dark'),   cScale1:  vc('c2-dark'),
      cScale2:  vc('c3-dark'), cScale3:  vc('c4-dark'),
      cScale4:  vc('c5-dark'),   cScale5:  vc('c6-dark'),
      cScale6:  vc('c1-dark'),   cScale7:  vc('c2-dark'),
      cScale8:  vc('c3-dark'), cScale9:  vc('c4-dark'),
      cScale10: vc('c5-dark'),   cScale11: vc('c6-dark'),

      // cScaleLabel — text fill emitted by Mermaid's auto-generated rule
      // `.section-${r-1} text { fill: cScaleLabel${r} }`. Mermaid derives
      // cScaleLabel* from cScale* via WCAG-aware contrast logic, but with
      // our mid-tone cScale that derivation lands on WHITE — which fails
      // catastrophically when our CSS overrides also paint the band fill
      // pale. Set each slot to the paired band-text token so the auto
      // rule lands on the same dark ink as our explicit overrides. Covers
      // the timeline `section--1` edge case too (Mermaid generates the
      // rule, our `.section--1` CSS in lattice-diagram.css is the belt;
      // this is the braces).
      cScaleLabel0:  ink, cScaleLabel1:  ink, cScaleLabel2:  ink,
      cScaleLabel3:  ink, cScaleLabel4:  ink, cScaleLabel5:  ink,
      cScaleLabel6:  ink, cScaleLabel7:  ink, cScaleLabel8:  ink,
      cScaleLabel9:  ink, cScaleLabel10: ink, cScaleLabel11: ink,

      // fillType — subgraph and mindmap level fills (pale band)
      fillType0: primary,                 fillType1: second,
      fillType2: vc('c3-light'),    fillType3: vc('c4-light'),
      fillType4: vc('c5-light'),    fillType5: vc('c6-light'),
      fillType6: primary,                 fillType7: second,

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
      noteBkgColor:    vc('c-note'),
      noteTextColor:   text,
      noteBorderColor: vc('c-mark'),

      // Error
      errorBkgColor:  vc('c-alarm'),
      errorTextColor: vc('c-ink-dark'),

      // Pie chart
      pie1:  primary,                  pie2:  second,
      pie3:  vc('c3-light'),     pie4:  vc('c4-light'),
      pie5:  vc('c5-light'),     pie6:  vc('c6-light'),
      pie7:  vc('c7-light'),     pie8:  vc('c8-light'),
      pie9:  vc('c9-light'),     pie10: vc('c10-light'),
      pie11: vc('c11-light'),    pie12: vc('c12-light'),
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
      activeTaskBkgColor:     vc('c-warm-light'),
      activeTaskBorderColor:  vc('c-warm-dark'),
      gridColor:              vc('c-cool-light'),
      doneTaskBkgColor:       vc('c-cool-light'),
      doneTaskBorderColor:    vc('c-cool-dark'),
      critBkgColor:           vc('c-alarm'),
      critBorderColor:        vc('c-alarm-dark'),
      todayLineColor:         vc('c-mark'),

      // Git graph
      git0: vc('c1-dark'),   git1: vc('c2-dark'),
      git2: vc('c3-dark'), git3: vc('c4-dark'),
      git4: vc('c5-dark'),   git5: vc('c6-dark'),
      git6: vc('c8-dark'),  git7: vc('c7-dark'),
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
      quadrant1Fill:                    vc('c-quadrant-1-fill'),
      quadrant2Fill:                    vc('c-quadrant-2-fill'),
      quadrant3Fill:                    vc('c-quadrant-3-fill'),
      quadrant4Fill:                    vc('c-quadrant-4-fill'),
      quadrant1TextFill:                vc('c-quadrant-1-text'),
      quadrant2TextFill:                vc('c-quadrant-2-text'),
      quadrant3TextFill:                vc('c-quadrant-3-text'),
      quadrant4TextFill:                vc('c-quadrant-4-text'),
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
          vc('c1-dark'),   vc('c2-dark'),
          vc('c3-dark'), vc('c4-dark'),
          vc('c5-dark'),   vc('c6-dark'),
        ].join(','),
      },

      // ER diagram
      attributeBackgroundColorOdd:  primary,
      attributeBackgroundColorEven: bgAlt,
    };

    // Tear down the probe element. Must happen AFTER the result object is
    // built — vc() reads from the live DOM each time, so the probe must
    // live until every value is materialized.
    if (probe.parentNode) probe.parentNode.removeChild(probe);
    return result;
  }

  // Trailing-edge debounce for Marp's re-render mutation bursts (typically
  // 5–10 mutations within ~30ms). 150ms coalesces them below the
  // perceptible-lag threshold. We don't section-scope: initAndRun filters on
  // data-mermaid-state="pending" so already-rendered diagrams are no-ops.
  const DEBOUNCE_MS = 150;
  let scheduledRunHandle = null;
  function scheduleRun() {
    if (scheduledRunHandle) clearTimeout(scheduledRunHandle);
    scheduledRunHandle = setTimeout(() => {
      scheduledRunHandle = null;
      initAndRun();
    }, DEBOUNCE_MS);
  }

  function wrapFences() {
    // Mark each ```mermaid fence's <pre> with `data-mermaid-state="pending"`
    // and insert a sibling <div class="mermaid"> as the SVG render target.
    // We do NOT wrap the <pre> in any container — Marp's `<pre is="marp-pre">`
    // is a direct flex child of `<section>` and participates in Marp's
    // auto-scaling (`data-auto-scaling`); wrapping it broke that relationship.
    //
    // The <pre> is purely a conduit for mermaid.render() to read source from.
    // CSS hides it as soon as `data-mermaid-state` is set (any value), so it
    // is never shown to the author. Visibility transitions are:
    //   pending/rendering → nothing visible (host is loading the diagram)
    //   rendered          → sibling .mermaid (the SVG) visible
    //   error             → sibling .mermaid-error (themed error block) visible
    //
    // The .mermaid-error sibling is created lazily by attachError() on
    // failure; we don't pre-create it here.
    const FENCE_SELECTOR = [
      "pre > code.language-mermaid",
      "pre > code[class*='language-mermaid']",
      "marp-pre > code.language-mermaid",
      "marp-pre > code[class*='language-mermaid']",
    ].join(",");
    for (const codeEl of document.querySelectorAll(FENCE_SELECTOR)) {
      const preEl = codeEl.parentElement;
      if (!preEl) continue;
      // Already marked — skip.
      if (preEl.dataset.mermaidState) continue;

      // Defang the language class so other extensions that target
      // `code.language-mermaid` (notably bierner.markdown-mermaid in the
      // plain VS Code markdown preview) stop trying to render the same
      // fence with their own bundled mermaid build. We keep the original
      // text in `data-original-class` for diagnostics; nothing else reads it.
      // We retain "language-mermaid-source" so syntax highlighting from
      // marp.config.js (which scoped on `language-mermaid` at build time)
      // is untouched in exports — exports never run this runtime.
      if (codeEl.classList.contains("language-mermaid")) {
        codeEl.dataset.originalClass = codeEl.className;
        codeEl.classList.remove("language-mermaid");
        codeEl.classList.add("language-mermaid-source");
      }

      // Check whether a previous render-cycle's sibling survived. Marp's
      // VS Code preview re-renders the <section> on every content change,
      // which produces a fresh <pre> (no data-mermaid-state) but leaves the
      // adjacent `.mermaid` div untouched. Without this reuse path, every
      // re-render would prepend a new EMPTY sibling, orphaning the SVG-bearing
      // one further down — making the diagram visually disappear after the
      // first successful render.
      let target = preEl.nextElementSibling;
      if (target?.classList.contains("mermaid")) {
        // Existing sibling. If it already holds an SVG, the diagram survived
        // intact — flag the pre as rendered and we're done.
        if (target.querySelector("svg")) {
          preEl.dataset.mermaidState = "rendered";
          continue;
        }
        // Empty leftover sibling — reuse as the target for this cycle.
      } else {
        target = document.createElement("div");
        target.className = "mermaid";
        target.setAttribute("aria-hidden", "true");
        preEl.insertAdjacentElement("afterend", target);
      }
      preEl.dataset.mermaidState = "pending";
    }
  }

  function ensureConfigured(mermaid, { force = false } = {}) {
    // Guard: don't lock the config until the theme's CSS custom properties are
    // actually resolved. On the first tick in Marp's webview, getComputedStyle
    // may return empty strings for --diagram-* vars if the stylesheet hasn't
    // been applied yet. An empty primaryColor causes Mermaid to fall back to
    // its built-in base defaults (#fff4dd yellow), which cascades into yellow
    // clusters and wrong cScale values. Check one sentinel var — if it's empty,
    // skip initialization this tick (the rAF retry will catch it next frame).
    //
    // `force=true` bypasses the sentinel after the rAF retry budget is
    // exhausted. Some preview environments (notably marp-vscode's webview)
    // never expose theme CSS vars to JS — the themed `<section>` is loaded
    // but the cascade from a Marp scoped rule does not propagate to
    // `getComputedStyle` reads in the way the file:// browser preview does.
    // Without force, every diagram would stay forever in data-mermaid-state=pending.
    if (globalScope.__llMermaidConfigured) return true;
    const scopeEl = document.querySelector('section') ?? document.documentElement;
    const haveTheme = !!getComputedStyle(scopeEl).getPropertyValue('--c1-light').trim();
    if (!haveTheme && !force) return false;
    if (!haveTheme && force && typeof console !== 'undefined') {
      console.warn('[lattice-runtime] theme CSS vars not resolved after retry budget; proceeding with Mermaid defaults');
    }

    mermaid.initialize({
      startOnLoad: false, // We orchestrate rendering ourselves via mermaid.render() so we can attribute success/failure per-fence and surface the parse error to the user.
      theme: "base",
      securityLevel: "loose",        // Required to allow HTML (e.g. <br/>) in node labels; htmlLabels:true alone is not sufficient.
      suppressErrorRendering: true,  // We use mermaid.render() with try/catch and inject our own themed error block — Mermaid's built-in error SVG (fixed 2412×512 viewBox) does not fit slide bounds.
      // NOTE: do NOT set `layout` here. Mermaid 11.x recognizes only "dagre" (built-in) and "elk" (separate package). Any other value (e.g. "tidy-tree") makes Mermaid throw "Unknown layout algorithm" mid-render, which `suppressErrorRendering:true` then swallows silently — leaving certain diagram types (state, ER, class) with `data-processed=true` but no SVG. Omitting the option lets each diagram pick its native layout.
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
    return true;
  }

  let renderCounter = 0;
  // Caches already-rendered Mermaid SVGs by their exact source string so that
  // fences whose source did not change between re-renders skip mermaid.render()
  // entirely and inject the cached SVG instead. Key benefit: when Marp replaces
  // a <section> wholesale on every keystroke (producing new, unmarked <pre>
  // elements for all fences in the deck), only the fence whose source actually
  // changed calls mermaid.render(); all others get their SVG from this cache.
  //
  // Cache key is the raw source string (trimmed). No size bound is needed for a
  // single editor session; the number of distinct diagrams in a deck is small.
  //
  // Not used when mermaid.render() fails — errors are never cached so that a
  // fix to a broken diagram is retried on the next edit.
  //
  // Theme-change caveat: themeVariables are baked into the SVG at render time.
  // If the author switches themes without reloading the preview, stale SVGs from
  // the cache would show the old theme colours. This is acceptable because theme
  // switches require a manual preview reload in marp-vscode anyway.
  const mermaidSvgCache = new Map();

  // Runs every non-Mermaid DOM transform. Called from initAndRun (every
  // scheduled re-render), from bootstrap before the Mermaid wait, and
  // previously from the now-removed glossary/chart observers.
  // Ordering matters: transformSlotLabels must precede transformSplitCompare;
  // applyGlossaryListTable must precede applyGlossaryRangePills.
  function runAllContentTransforms() {
    transformStripHeadingPeriods();
    transformAddHeadingPeriods();
    transformVerdictGridBadges();
    transformObligationMatrixBadges();
    transformChecklistItemStates();
    transformSlotLabels();
    transformSplitBrief();
    transformSplitMetric();
    transformSplitSteps();
    transformSplitCompare();
    transformSplitStatement();
    transformRoadmapStatus();
    transformRoadmapHorizons();
    transformJourney();
    transformWordCloud();
    // Radar is a chart-family member; its DOM transform fires from
    // applyChartFamily() below, sharing the chart-frame wrap path.
    applyGlossaryListTable(document);
    applyGlossaryRangePills(document);
    applyChartFamily(document);
  }

  function initAndRun({ force = false } = {}) {
    runAllContentTransforms();
    const mermaid = globalScope.mermaid;
    // Guard against stub `window.mermaid` (e.g. bierner.markdown-mermaid in
    // VS Code's plain markdown preview, which exposes a render-blocks-only
    // shim without .initialize/.render). Without this check, scheduleRun
    // from the MutationObserver could re-enter ensureConfigured with the
    // stub and throw "mermaid.initialize is not a function".
    if (!mermaid || typeof mermaid.initialize !== "function" || typeof mermaid.render !== "function") {
      return false;
    }

    wrapFences();
    if (!ensureConfigured(mermaid, { force })) return false;

    // A pre is "pending" until mermaid.render() resolves into its sibling
    // target or we attach an error sibling. Re-running initAndRun is a no-op
    // for handled fences because we filter on data-mermaid-state.
    const FENCE_SELECTOR = [
      'pre[data-mermaid-state="pending"]',
      'marp-pre[data-mermaid-state="pending"]',
    ].join(",");
    for (const preEl of document.querySelectorAll(FENCE_SELECTOR)) {
      const codeEl = preEl.querySelector(":scope > code");
      const target = preEl.nextElementSibling?.classList.contains("mermaid")
        ? preEl.nextElementSibling
        : null;
      if (!codeEl || !target) continue;
      const source = (codeEl.textContent || "").trim();

      // Cache hit: same source was rendered earlier this session — reuse the
      // SVG directly and skip mermaid.render() entirely. This is the common
      // case when Marp replaces sections wholesale on every keystroke: only
      // the fence whose source actually changed gets a fresh render call.
      const cachedSvg = mermaidSvgCache.get(source);
      if (cachedSvg) {
        target.innerHTML = cachedSvg;
        preEl.dataset.mermaidState = "rendered";
        continue;
      }

      // Mark in-flight so a re-entrant scheduleRun does not double-dispatch.
      preEl.dataset.mermaidState = "rendering";

      const id = `lattice-mermaid-${++renderCounter}`;
      Promise.resolve()
        .then(() => mermaid.render(id, source))
        .then((result) => {
          // Mermaid may resolve with `undefined` if it failed silently in
          // older versions. Treat absence-of-svg as an error.
          const svg = result?.svg;
          if (!svg) {
            attachError(preEl, target, new Error("Mermaid produced no SVG"));
            return;
          }
          mermaidSvgCache.set(source, svg);
          target.innerHTML = svg;
          if (result.bindFunctions) {
            try { result.bindFunctions(target); } catch (_e) { /* non-fatal */ }
          }
          preEl.dataset.mermaidState = "rendered";
        })
        .catch((err) => attachError(preEl, target, err));
    }
    return true;
  }

  function attachError(preEl, target, err) {
    preEl.dataset.mermaidState = "error";
    // Strip any partial render Mermaid may have written into the SVG target.
    if (target) target.innerHTML = "";

    // Idempotent: don't append a second error block if scheduleRun fires twice.
    let errEl = null;
    const scan = target ? target.nextElementSibling : preEl.nextElementSibling;
    if (scan?.classList.contains("mermaid-error")) errEl = scan;
    if (!errEl) {
      errEl = document.createElement("div");
      errEl.className = "mermaid-error";
      errEl.setAttribute("role", "status");
      (target || preEl).insertAdjacentElement("afterend", errEl);
    }
    const message = (err && (err.message || err.str || String(err))) || "Mermaid render failed";
    // First line is the headline; the rest (if any) goes into a <pre>.
    const [headline, ...rest] = String(message).split("\n");
    errEl.innerHTML = "";
    const label = document.createElement("strong");
    label.className = "mermaid-error-label";
    label.textContent = "Mermaid error";
    errEl.appendChild(label);
    const msg = document.createElement("span");
    msg.className = "mermaid-error-msg";
    msg.textContent = headline;
    errEl.appendChild(msg);
    if (rest.length > 0) {
      const detail = document.createElement("pre");
      detail.className = "mermaid-error-detail";
      detail.textContent = rest.join("\n");
      errEl.appendChild(detail);
    }
  }

  /**
   * Universal state-token marker decoder — shared by transformVerdictGridBadges,
   * transformObligationMatrixBadges, and transformChecklistItemStates.
   * Maps a single-char marker to the semantic + shape classes that the
   * universal CSS recipe paints. Sibling implementations in
   * lattice-emulator.js and marp.config.js must stay in sync.
   *
   *   [x] → pass + state-full     (filled disc)
   *   [-] → warn + state-half     (half-filled disc)
   *   [ ] → fail + state-empty    (outline disc)
   *   [/] → skip + state-slashed  (filled disc + diagonal slash)
   */
  function stateClassesFor(marker) {
    if (marker === 'x') return { sem: 'pass', shape: 'state-full' };
    if (marker === '-') return { sem: 'warn', shape: 'state-half' };
    if (marker === '/') return { sem: 'skip', shape: 'state-slashed' };
    return { sem: 'fail', shape: 'state-empty' };
  }

  /**
   * Transforms verdict-grid badge items in VS Code preview (no Marp plugin).
   * Finds [x]/[-]/[ ]/[/] prefixed li items inside section.verdict-grid, strips
   * the prefix, and wraps the label in <span class="badge {sem} {shape}">.
   * Idempotent — skips li items that already contain a .badge span.
   */
  function transformVerdictGridBadges() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.verdict-grid')) {
      for (const outerLi of section.querySelectorAll(':scope > ul > li')) {
        const innerUl = outerLi.querySelector(':scope > ul');
        if (!innerUl) continue;
        const innerItems = [...innerUl.children];
        // Last item is body text — skip it; all others are badge items
        const badgeItems = innerItems.slice(0, -1);
        for (const li of badgeItems) {
          if (li.querySelector('.badge')) continue; // already transformed
          const text = li.textContent.trim();
          const m = /^\[([x\-/ ])\]\s*(.*)$/.exec(text);
          if (!m) continue;
          const { sem, shape } = stateClassesFor(m[1]);
          li.innerHTML = `<span class="badge ${sem} ${shape}">${m[2]}</span>`;
        }
      }
    }
  }

  /**
   * Transforms obligation-matrix table cells in VS Code preview (mirrors
   * the Marp plugin). Finds [x]/[-]/[ ]/[/] in <td> cells inside
   * section.obligation-matrix, strips the marker, and wraps any trailing
   * label in <span class="state {sem} {shape}">. CSS draws the universal
   * state token (coloured disc + shape mask). Idempotent — skips cells
   * already containing a .state span.
   */
  function transformObligationMatrixBadges() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.obligation-matrix')) {
      for (const td of section.querySelectorAll('td')) {
        if (td.querySelector('.state')) continue; // already transformed
        const text = td.textContent.trim();
        const m = /^\[([x\-/ ])\]\s*(.*)$/.exec(text);
        if (!m) continue;
        const { sem, shape } = stateClassesFor(m[1]);
        td.innerHTML = `<span class="state ${sem} ${shape}">${m[2]}</span>`;
      }
    }
  }

  /**
   * Transforms checklist items in VS Code preview (mirrors the Marp plugin).
   * For each top-level <li> in section.checklist whose text starts with
   * [x]/[-]/[ ]/[/], strips the marker and adds
   *   class="state {pass|warn|fail|skip} {state-full|state-half|state-empty|state-slashed}"
   * to the <li>. CSS handles the trailing-`code` pill (universal pill
   * convention, shared with cards-grid / cards-side / actors). Idempotent —
   * skips items already tagged.
   */
  function transformChecklistItemStates() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.checklist')) {
      for (const li of section.querySelectorAll(':scope > ul > li, :scope > ol > li')) {
        if (li.classList.contains('state')) continue;
        // Inspect the first text node (leading text content of the <li>).
        const firstText = (() => {
          for (const node of li.childNodes) {
            if (node.nodeType === 3) return node;
            if (node.nodeType === 1) return null; // element before any text
          }
          return null;
        })();
        if (!firstText) continue;
        const m = /^\[([x\-/ ])\]\s*/.exec(firstText.nodeValue);
        if (!m) continue;
        const { sem, shape } = stateClassesFor(m[1]);
        firstText.nodeValue = firstText.nodeValue.slice(m[0].length);
        li.classList.add('state', sem, shape);
      }
    }
  }

  /**
   * Lifts the leading inline content of each top-level <li> in named-slot
   * layouts (`compare-prose`, `before-after`, `decision`) into a <strong>
   * wrapper, matching the `slotLabelLift` Marpit plugin in marp.config.js
   * and `liftSlotLabel` in lattice-emulator.js. The labeled corner-tag CSS
   * (`> strong:first-child`) then renders the slot label as a flush
   * top-left tag without authors having to write `**Label**` in source.
   *
   * Idempotent: skips items whose first element child is already <strong>.
   * Walks until the first nested <ul>/<ol> (the body list) so prose lifts
   * cleanly even when the lead spans multiple inline tokens (e.g. trailing
   * `code`).
   */
  function transformSlotLabels() {
    if (typeof document === 'undefined') return;
    const SELECTOR = 'section.compare-prose, section.before-after, section.decision, section.split-brief, section.split-metric, section.split-steps, section.split-compare, section.split-statement, section.statute-stack, section.regulatory-update, section.authority-chain, section.redline';
    for (const section of document.querySelectorAll(SELECTOR)) {
      // compare-prose authored with the build pipeline already has the
      // .compare-prose-inner / .card structure with the strong inside.
      // The runtime only needs to handle the raw <ul>/<ol> case.
      const lists = section.querySelectorAll(':scope > ul, :scope > ol');
      for (const list of lists) {
        for (const li of list.children) {
          if (li.tagName !== 'LI') continue;
          // Idempotent: first element child already <strong>.
          const firstEl = li.firstElementChild;
          if (firstEl && firstEl.tagName === 'STRONG' &&
              (li.firstChild === firstEl ||
               (li.firstChild.nodeType === 3 && !li.firstChild.nodeValue.trim() && li.firstChild.nextSibling === firstEl))) {
            continue;
          }
          // Collect lead nodes up to (but not including) the first nested list.
          const lead = [];
          let cursor = li.firstChild;
          while (cursor && !(cursor.nodeType === 1 && (cursor.tagName === 'UL' || cursor.tagName === 'OL'))) {
            lead.push(cursor);
            cursor = cursor.nextSibling;
          }
          if (!lead.length) continue;
          // Skip empty / whitespace-only leads.
          const leadHasText = lead.some(n =>
            (n.nodeType === 3 && n.nodeValue.trim()) ||
            (n.nodeType === 1 && n.textContent.trim())
          );
          if (!leadHasText) continue;
          const strong = document.createElement('strong');
          for (const n of lead) strong.appendChild(n);
          li.insertBefore(strong, cursor);
        }
      }
    }
  }

  // ── Split panel DOM transforms ──────────────────────────────────────────────
  // Each mirrors the matching block in lattice-emulator.js. Idempotent: skips
  // sections already wrapped (left/right div present). Called from initAndRun.
  // Sibling implementations:
  //   lattice-emulator.js  — post-process per-slide transform
  //   lib/split-panels.js  — HTML-string transform run by marp.config.js render
  //                          hook (primary path for marp-vscode preview)
  // These DOM transforms act as a fallback for web export where scripts execute
  // but the marp.config.js engine hook has not run.

  function transformSplitBrief() {
    if (typeof document === 'undefined') return;
    for (const sec of document.querySelectorAll('section.split-brief')) {
      if (sec.querySelector('.brief-left')) continue;
      const codeP = [...sec.children].find(
        el => el.tagName === 'P' && el.childNodes.length === 1 && el.firstChild?.tagName === 'CODE'
      );
      const h2 = sec.querySelector('h2');
      const introP = [...sec.children].find(el => el.tagName === 'P' && el !== codeP);
      const left = document.createElement('div');
      left.className = 'brief-left';
      if (codeP) {
        const eyebrow = document.createElement('span');
        eyebrow.className = 'eyebrow';
        eyebrow.textContent = codeP.textContent;
        left.appendChild(eyebrow);
        codeP.remove();
      }
      if (h2) left.appendChild(h2);
      if (introP) left.appendChild(introP);
      const right = document.createElement('div');
      right.className = 'brief-right';
      const header = sec.querySelector('header');
      [...sec.children].filter(el => el !== header).forEach((el) => { right.appendChild(el); });
      sec.appendChild(left);
      sec.appendChild(right);
    }
  }

  function transformSplitMetric() {
    if (typeof document === 'undefined') return;
    for (const sec of document.querySelectorAll('section.split-metric')) {
      if (sec.querySelector('.metric-left')) continue;
      const codeP = [...sec.children].find(
        el => el.tagName === 'P' && el.childNodes.length === 1 && el.firstChild?.tagName === 'CODE'
      );
      const h2 = sec.querySelector('h2');
      const introP = [...sec.children].find(el => el.tagName === 'P' && el !== codeP);
      const left = document.createElement('div');
      left.className = 'metric-left';
      if (codeP) {
        const unitLabel = document.createElement('span');
        unitLabel.className = 'unit-label';
        unitLabel.textContent = codeP.textContent;
        left.appendChild(unitLabel);
        codeP.remove();
      }
      if (h2) left.appendChild(h2);
      if (introP) {
        const context = document.createElement('span');
        context.className = 'metric-context';
        context.innerHTML = introP.innerHTML;
        left.appendChild(context);
        introP.remove();
      }
      const right = document.createElement('div');
      right.className = 'metric-right';
      const header = sec.querySelector('header');
      [...sec.children].filter(el => el !== header).forEach((el) => { right.appendChild(el); });
      sec.appendChild(left);
      sec.appendChild(right);
    }
  }

  function transformSplitSteps() {
    if (typeof document === 'undefined') return;
    for (const sec of document.querySelectorAll('section.split-steps')) {
      if (sec.querySelector('.steps-left')) continue;
      const codeP = [...sec.children].find(
        el => el.tagName === 'P' && el.childNodes.length === 1 && el.firstChild?.tagName === 'CODE'
      );
      const h2 = sec.querySelector('h2');
      const introP = [...sec.children].find(el => el.tagName === 'P' && el !== codeP);
      const left = document.createElement('div');
      left.className = 'steps-left';
      if (codeP) {
        const phaseNum = document.createElement('span');
        phaseNum.className = 'phase-num';
        phaseNum.textContent = codeP.textContent;
        left.appendChild(phaseNum);
        codeP.remove();
      }
      if (h2) left.appendChild(h2);
      if (introP) left.appendChild(introP);
      const right = document.createElement('div');
      right.className = 'steps-right';
      const header = sec.querySelector('header');
      [...sec.children].filter(el => el !== header).forEach((el) => { right.appendChild(el); });
      sec.appendChild(left);
      sec.appendChild(right);
    }
  }

  function transformSplitCompare() {
    if (typeof document === 'undefined') return;
    for (const sec of document.querySelectorAll('section.split-compare')) {
      if (sec.querySelector('.compare-left')) continue;
      const codeP = [...sec.children].find(
        el => el.tagName === 'P' && el.childNodes.length === 1 && el.firstChild?.tagName === 'CODE'
      );
      const h2 = sec.querySelector('h2');
      const introP = [...sec.children].find(el => el.tagName === 'P' && el !== codeP);
      const bq = sec.querySelector(':scope > blockquote');
      const left = document.createElement('div');
      left.className = 'compare-left';
      if (codeP) {
        const frameLabel = document.createElement('span');
        frameLabel.className = 'frame-label';
        frameLabel.textContent = codeP.textContent;
        left.appendChild(frameLabel);
        codeP.remove();
      }
      if (h2) left.appendChild(h2);
      if (introP) left.appendChild(introP);
      // Split top-level li items from the options list into .option divs.
      // transformSlotLabels has already run, so li > strong is in place.
      const optionList = sec.querySelector(':scope > ul, :scope > ol');
      const right = document.createElement('div');
      right.className = 'compare-right';
      const opts = document.createElement('div');
      opts.className = 'options';
      if (optionList) {
        [...optionList.children].filter(el => el.tagName === 'LI').forEach((li, i) => {
          const div = document.createElement('div');
          div.className = i === 1 ? 'option preferred' : 'option';
          [...li.childNodes].forEach((n) => { div.appendChild(n); });
          opts.appendChild(div);
        });
        optionList.remove();
      }
      right.appendChild(opts);
      if (bq) {
        const verdict = document.createElement('div');
        verdict.className = 'verdict';
        verdict.appendChild(bq);
        right.appendChild(verdict);
      }
      sec.appendChild(left);
      sec.appendChild(right);
    }
  }

  function transformSplitStatement() {
    if (typeof document === 'undefined') return;
    for (const sec of document.querySelectorAll('section.split-statement')) {
      if (sec.querySelector('.statement-left')) continue;
      const bq = sec.querySelector(':scope > blockquote');
      const codeP = [...sec.children].find(
        el => el.tagName === 'P' && el.childNodes.length === 1 && el.firstChild?.tagName === 'CODE'
      );
      const left = document.createElement('div');
      left.className = 'statement-left';
      if (bq) left.appendChild(bq);
      if (codeP) {
        const cite = document.createElement('cite');
        cite.textContent = codeP.textContent;
        left.appendChild(cite);
        codeP.remove();
      }
      const right = document.createElement('div');
      right.className = 'statement-right';
      const header = sec.querySelector('header');
      [...sec.children].filter(el => el !== header).forEach((el) => { right.appendChild(el); });
      sec.appendChild(left);
      sec.appendChild(right);
    }
  }

  // ── Roadmap modifier transforms ─────────────────────────────────────────
  // Mirror lib/components/roadmap/transform.js / lattice-emulator.js. Idempotent:
  // each transform checks for the marker class on the section/cell and bails
  // early when it has already run.
  //
  // Sibling implementations (parity contract):
  //   lib/components/roadmap/transform.js — HTML-string transform run by marp.config.js render hook
  //   lattice-emulator.js                 — per-slide emulator path delegates to the transform
  //
  // These DOM transforms act as a fallback for web export and for any
  // preview path that didn't run the engine plugin.

  const ROADMAP_HORIZON_ACCENTS = [
    'var(--c1-dark)',   'var(--c2-dark)',  'var(--c3-dark)', 'var(--c4-dark)',
    'var(--c5-dark)',   'var(--c6-dark)',   'var(--c7-dark)',  'var(--c8-dark)',
  ];
  const ROADMAP_STATE_LABEL = {
    'state-shipped':  'Shipped',
    'state-wip':      'In flight',
    'state-planned':  'Planned',
    'state-skipped':  'Out of scope',
  };
  function roadmapMarkerToState(marker) {
    switch (marker) {
      case 'x': return 'state-shipped';
      case '-': return 'state-wip';
      case ' ': return 'state-planned';
      case '/': return 'state-skipped';
      default:  return '';
    }
  }

  function transformRoadmapStatus() {
    // State markers `[x]/[-]/[ ]/[/]` work on any roadmap variant. The
    // .status modifier adds the heavy treatment via CSS; other variants
    // get the light treatment (state-coloured dot + skip strike).
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.roadmap')) {
      const rows = section.querySelectorAll(':scope > table > tbody > tr');
      for (const tr of rows) {
        const tds = tr.querySelectorAll(':scope > td');
        for (let i = 0; i < tds.length; i++) {
          if (i === 0) continue; // workstream label cell
          const td = tds[i];
          if (td.classList.contains('cell-state')) continue;
          const text = td.textContent;
          const m = /^\s*\[([x\-/ ])\]\s*/.exec(text);
          if (!m) continue;
          const state = roadmapMarkerToState(m[1]);
          if (!state) continue;
          const label = ROADMAP_STATE_LABEL[state];
          // Strip the marker from the first text node and wrap the
          // remaining content in a <span class="cell-state-text">.
          const firstText = (() => {
            for (const n of td.childNodes) {
              if (n.nodeType === 3) return n;
              if (n.nodeType === 1) return null;
            }
            return null;
          })();
          if (firstText) {
            firstText.nodeValue = firstText.nodeValue.replace(/^\s*\[[x\-/ ]\]\s*/, '');
          }
          // Wrap remaining content
          const wrap = document.createElement('span');
          wrap.className = 'cell-state-text';
          while (td.firstChild) wrap.appendChild(td.firstChild);
          const eyebrow = document.createElement('span');
          eyebrow.className = 'cell-state-label';
          eyebrow.textContent = label;
          td.appendChild(eyebrow);
          td.appendChild(wrap);
          td.classList.add('cell-state', state);
        }
      }
    }
  }

  function transformRoadmapHorizons() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.roadmap.horizons')) {
      if (section.querySelector('.horizons')) continue;
      const table = section.querySelector(':scope > table');
      if (!table) continue;
      const headRow = table.querySelector(':scope > thead > tr');
      if (!headRow) continue;
      const headCells = [...headRow.children];
      if (headCells.length < 2) continue;
      const phaseHeaders = headCells.slice(1).map(c => c.innerHTML.trim());

      const bodyRows = [...table.querySelectorAll(':scope > tbody > tr')]
        .map(tr => {
          const cells = [...tr.children];
          return {
            label: cells[0] ? cells[0].innerHTML.trim() : '',
            cells: cells.slice(1).map(c => {
              // Pull the state class (set by transformRoadmapStatus
              // upstream when a [x]/[-]/[ ]/[/] marker was present)
              // and the plain text content out of the cell.
              let state = '';
              for (const cls of c.classList) {
                if (/^state-/.test(cls)) { state = cls; break; }
              }
              const textSpan = c.querySelector(':scope > .cell-state-text');
              const text = textSpan ? textSpan.innerHTML.trim() : c.innerHTML.trim();
              return { text, state };
            }),
          };
        })
        .filter(r => r.label !== '');

      const wrap = document.createElement('div');
      wrap.className = 'horizons';
      phaseHeaders.forEach((header, idx) => {
        const card = document.createElement('div');
        card.className = 'horizon-card';
        card.style.setProperty('--phase-accent', ROADMAP_HORIZON_ACCENTS[idx % ROADMAP_HORIZON_ACCENTS.length]);
        const head = document.createElement('div');
        head.className = 'horizon-head';
        const eyebrow = document.createElement('span');
        eyebrow.className = 'horizon-eyebrow';
        eyebrow.textContent = 'Phase ' + String(idx + 1).padStart(2, '0');
        // Lift a trailing <code> into a meta pill — mirrors lib/components/roadmap/transform.js.
        let headerHtml = header;
        let metaText = '';
        const trailingCode = header.match(/\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*$/);
        if (trailingCode) {
          headerHtml = header.slice(0, trailingCode.index).trim();
          metaText = trailingCode[1];
        }
        const title = document.createElement('span');
        title.className = 'horizon-title';
        title.innerHTML = headerHtml;
        head.appendChild(eyebrow);
        head.appendChild(title);
        if (metaText) {
          const meta = document.createElement('span');
          meta.className = 'horizon-meta';
          meta.innerHTML = metaText;
          head.appendChild(meta);
        }
        const ul = document.createElement('ul');
        ul.className = 'horizon-rows';
        for (const r of bodyRows) {
          const cell = r.cells[idx] || { text: '', state: '' };
          const li = document.createElement('li');
          if (cell.state) li.className = 'cell-state ' + cell.state;
          const lbl = document.createElement('span');
          lbl.className = 'row-label';
          lbl.innerHTML = r.label;
          const text = cell.text;
          const isEmpty = !text || text === '—' || text === '-';
          const txt = document.createElement('span');
          txt.className = isEmpty ? 'row-text row-empty' : 'row-text';
          txt.innerHTML = isEmpty ? '—' : text;
          li.appendChild(lbl);
          li.appendChild(txt);
          ul.appendChild(li);
        }
        card.appendChild(head);
        card.appendChild(ul);
        wrap.appendChild(card);
      });
      table.replaceWith(wrap);
    }
  }

  // ── Word-cloud layout transform ─────────────────────────────────────────
  // Mirrors the build-time spiral packer in lib/word-cloud.js so the
  // marp-vscode preview (which never runs marp.config.js's render hook
  // — see gotchas: webview CSP) produces the same layout the export
  // pipeline produces. The algorithm is the same; the only difference
  // is DOM-construction vs HTML-string emission.
  //
  // Sibling implementations (parity contract):
  //   lib/word-cloud.js     — HTML-string transform run by marp.config.js render hook
  //   lattice-emulator.js   — per-slide emulator path delegates to lib/word-cloud.js
  const WC_CANVAS_W = 1100;
  const WC_CANVAS_H = 320;
  const WC_CHAR_W_COEFF = 0.54;
  const WC_BBOX_PAD_EM = 0.12;
  const WC_GOLDEN_ANGLE = 2.399963229728653;
  const WC_SHRINK_FACTOR = 0.9;
  const WC_SHRINK_RETRIES = 4;
  const WC_CAT_ROTATION = [
    'var(--cat-blue)', 'var(--cat-orange)', 'var(--cat-teal)',
    'var(--cat-rose)', 'var(--cat-purple)', 'var(--cat-green)',
  ];
  const WC_VARIANT_OPTS = {
    default: {
      sizeSpread: [16, 84], sizeCurve: 1.35,
      spiral: { dr: 0.5,  dtheta: 0.12, maxIter: 3000 },
      rotation: { chance: 0.22, minWeight: 1.5, maxWeight: 3.5, rotated: 90 },
      color: 'cat-rotate',
    },
    constellation: {
      sizeSpread: [14, 100], sizeCurve: 1.55,
      spiral: { dr: 0.9,  dtheta: 0.18, maxIter: 2500 },
      rotation: { chance: 0, minWeight: 0, maxWeight: 0, rotated: 0 },
      color: 'accent-pair',
    },
    dense: {
      sizeSpread: [12, 60], sizeCurve: 1.20,
      spiral: { dr: 0.3,  dtheta: 0.09, maxIter: 4000 },
      rotation: { chance: 0.32, minWeight: 1, maxWeight: 3.5, rotated: 90 },
      color: 'cat-rotate',
    },
    spectrum: {
      sizeSpread: [14, 76], sizeCurve: 1.35,
      spiral: { dr: 0.45, dtheta: 0.12, maxIter: 3000 },
      rotation: { chance: 0, minWeight: 0, maxWeight: 0, rotated: 0 },
      color: 'heat-ramp',
    },
    focal: {
      sizeSpread: [12, 128], sizeCurve: 1.80,
      spiral: { dr: 0.45, dtheta: 0.12, maxIter: 3200 },
      rotation: { chance: 0.15, minWeight: 1, maxWeight: 2.5, rotated: 90 },
      color: 'focal-cats',
    },
  };

  function wcClampWeight(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 3;
    if (v < 1) return 1;
    if (v > 5) return 5;
    return v;
  }
  function wcLerp(a, b, t) { return a + (b - a) * t; }
  function wcSizeFromWeight(w, opts) {
    const t = (w - 1) / 4;
    const e = t ** opts.sizeCurve;
    return wcLerp(opts.sizeSpread[0], opts.sizeSpread[1], e);
  }
  function wcRotatedForRank(rank, weight, opts) {
    const r = opts.rotation;
    if (!r.chance) return false;
    if (weight > r.maxWeight || weight < r.minWeight) return false;
    return (((rank * 17) + 11) % 100) < r.chance * 100;
  }
  function wcColorForWord(rank, weight, opts) {
    if (opts.color === 'heat-ramp') {
      if (weight >= 4.5) return 'var(--accent)';
      if (weight >= 3.5) return 'var(--scale-700)';
      if (weight >= 2.5) return 'var(--scale-500)';
      if (weight >= 1.5) return 'var(--scale-400)';
      return 'var(--text-muted)';
    }
    if (opts.color === 'accent-pair') {
      if (weight >= 4) return 'var(--accent)';
      if (weight >= 2.5) return 'var(--cat-mauve)';
      return 'var(--text-muted)';
    }
    if (opts.color === 'focal-cats') {
      if (weight >= 4.5) return 'var(--accent)';
      if (weight <= 1.5) return 'var(--text-muted)';
      return WC_CAT_ROTATION[(rank - 1) % WC_CAT_ROTATION.length];
    }
    if (weight >= 4.5) return 'var(--accent)';
    if (weight <= 1.5) return 'var(--text-muted)';
    return WC_CAT_ROTATION[(rank - 1) % WC_CAT_ROTATION.length];
  }
  function wcBboxFor(text, size) {
    const len = text.length || 1;
    const padX = size * WC_BBOX_PAD_EM;
    const padY = size * WC_BBOX_PAD_EM;
    return { w: len * size * WC_CHAR_W_COEFF + padX * 2, h: size * 1.05 + padY * 2 };
  }
  function wcRectsCollide(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
             a.y + a.h <= b.y || b.y + b.h <= a.y);
  }
  function wcTryPlace(bbox, startTheta, canvas, placed, spiralOpts) {
    const cx = canvas.w / 2, cy = canvas.h / 2;
    const aspect = canvas.w / canvas.h;
    let theta = startTheta, r = 0;
    for (let i = 0; i < spiralOpts.maxIter; i++) {
      const px = r * aspect * Math.cos(theta);
      const py = r * Math.sin(theta);
      const x = cx + px - bbox.w / 2;
      const y = cy + py - bbox.h / 2;
      if (x < 0 || y < 0 || x + bbox.w > canvas.w || y + bbox.h > canvas.h) {
        theta += spiralOpts.dtheta; r += spiralOpts.dr; continue;
      }
      const cand = { x, y, w: bbox.w, h: bbox.h };
      let coll = false;
      for (const p of placed) { if (wcRectsCollide(cand, p)) { coll = true; break; } }
      if (coll) { theta += spiralOpts.dtheta; r += spiralOpts.dr; continue; }
      return cand;
    }
    return null;
  }
  function wcPackCloud(words, canvas, spiralOpts) {
    const placed = [];
    for (let wi = 0; wi < words.length; wi++) {
      const w = words[wi];
      const startTheta = wi * WC_GOLDEN_ANGLE;
      let found = null, finalSize = w.size, finalBbox = null;
      for (let retry = 0; retry <= WC_SHRINK_RETRIES; retry++) {
        const trialSize = w.size * WC_SHRINK_FACTOR ** retry;
        const plain = (w.text || '').replace(/<[^>]+>/g, '');
        const natBbox = wcBboxFor(plain, trialSize);
        const trialBbox = w.rotated
          ? { w: natBbox.h, h: natBbox.w }
          : natBbox;
        const cand = wcTryPlace(trialBbox, startTheta, canvas, placed, spiralOpts);
        if (cand) { found = cand; finalSize = trialSize; finalBbox = trialBbox; break; }
      }
      if (found) {
        placed.push(found);
        w.x = found.x + finalBbox.w / 2;
        w.y = found.y + finalBbox.h / 2;
        w.size = finalSize;
        w.placed = true;
      } else {
        w.placed = false;
      }
    }
    return words.filter(w => w.placed);
  }
  function wcPickVariant(classList) {
    for (const mod of ['constellation', 'dense', 'spectrum', 'focal']) {
      if (classList.contains(mod)) return mod;
    }
    return 'default';
  }

  function transformWordCloud() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.word-cloud')) {
      if (section.querySelector(':scope > .word-cloud-canvas')) continue;
      const ul = section.querySelector(':scope > ul');
      if (!ul) continue;
      const variant = wcPickVariant(section.classList);
      const opts = WC_VARIANT_OPTS[variant] || WC_VARIANT_OPTS.default;

      const items = [];
      let sourceIdx = 0;
      for (const li of ul.children) {
        if (li.tagName !== 'LI') continue;
        // Last <code> child = weight pill; default 3 otherwise. Mirror
        // the [^<] anchor logic in lib/word-cloud.js — only the trailing
        // <code> counts, an earlier inline-code mention isn't the weight.
        const children = [...li.childNodes];
        let weight = 3;
        let lastCodeIdx = -1;
        for (let i = children.length - 1; i >= 0; i--) {
          const n = children[i];
          if (n.nodeType === 1 && n.tagName === 'CODE') { lastCodeIdx = i; break; }
          if (n.nodeType === 1) break;
          if (n.nodeType === 3 && n.nodeValue.trim()) break;
        }
        let textHtml = li.innerHTML;
        if (lastCodeIdx >= 0) {
          weight = wcClampWeight(children[lastCodeIdx].textContent.trim());
          const tmp = document.createElement('div');
          for (let i = 0; i < lastCodeIdx; i++) tmp.appendChild(children[i].cloneNode(true));
          textHtml = tmp.innerHTML;
        }
        textHtml = textHtml.replace(/\s+$/, '');
        if (!textHtml.trim()) continue;
        items.push({ text: textHtml, weight, source: sourceIdx });
        sourceIdx++;
      }
      if (items.length === 0) continue;

      items.sort((a, b) => b.weight - a.weight || a.source - b.source);
      const visualed = items.map((it, idx) => {
        const rank = idx + 1;
        const size = wcSizeFromWeight(it.weight, opts);
        return {
          text: it.text,
          weight: it.weight,
          rank,
          size,
          rotated: wcRotatedForRank(rank, it.weight, opts),
          color: wcColorForWord(rank, it.weight, opts),
        };
      });
      const packed = wcPackCloud(visualed, { w: WC_CANVAS_W, h: WC_CANVAS_H }, opts.spiral);
      if (packed.length === 0) continue;

      const canvas = document.createElement('div');
      canvas.className = 'word-cloud-canvas';
      canvas.dataset.count = String(packed.length);
      canvas.dataset.variant = variant;
      canvas.style.setProperty('--wc-canvas-w', WC_CANVAS_W + 'px');
      canvas.style.setProperty('--wc-canvas-h', WC_CANVAS_H + 'px');
      for (const w of packed) {
        const span = document.createElement('span');
        span.className = 'wc-word';
        span.dataset.weight = String(w.weight);
        span.dataset.rank = String(w.rank);
        if (w.rotated) span.dataset.rotated = '1';
        const rotDeg = w.rotated ? opts.rotation.rotated : 0;
        span.style.setProperty('--wc-x',     w.x.toFixed(1) + 'px');
        span.style.setProperty('--wc-y',     w.y.toFixed(1) + 'px');
        span.style.setProperty('--wc-size',  w.size.toFixed(1) + 'px');
        span.style.setProperty('--wc-rot',   rotDeg + 'deg');
        span.style.setProperty('--wc-color', w.color);
        span.innerHTML = w.text;
        canvas.appendChild(span);
      }
      ul.replaceWith(canvas);
    }
  }

  /**
   * Journey diagram — runtime mirror of lib/components/journey/transform.js. Walks each
   * `section.journey` and rewrites its innerHTML in place. The
   * implementation below is a near-verbatim copy of the pure-string
   * parser + emitter in lib/components/journey/transform.js — that file is canonical; this
   * mirror exists because the marp-vscode preview can't `require` Node
   * modules. Three-renderer parity rule applies: edit both or neither.
   */
  const JOURNEY_ACTOR_PALETTE_RT = [
    'var(--c2-dark)',  'var(--c1-dark)',   'var(--c3-dark)', 'var(--c4-dark)',
    'var(--c5-dark)',   'var(--c6-dark)',   'var(--c7-dark)',  'var(--c8-dark)',
  ];
  function jEscAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function jEscHtml(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }
  function jStripTags(s) {
    return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  function jClampMood(n) {
    if (!Number.isFinite(n)) return 3;
    return Math.max(1, Math.min(5, Math.round(n)));
  }
  function jFindOuterUL(html) {
    const start = html.indexOf('<ul');
    if (start < 0) return null;
    const tagEnd = html.indexOf('>', start);
    if (tagEnd < 0) return null;
    let depth = 1, pos = tagEnd + 1;
    while (pos < html.length) {
      if (html.startsWith('<ul', pos) &&
          (html[pos + 3] === '>' || html[pos + 3] === ' ' || html[pos + 3] === '\t' || html[pos + 3] === '\n')) {
        const e = html.indexOf('>', pos);
        if (e < 0) return null;
        depth++; pos = e + 1;
      } else if (html.startsWith('</ul>', pos)) {
        depth--;
        if (depth === 0) return { start, end: pos + 5, inner: html.slice(tagEnd + 1, pos) };
        pos += 5;
      } else { pos++; }
    }
    return null;
  }
  function jSplitTopLevelLI(ulInner) {
    const lis = [];
    let pos = 0;
    while (pos < ulInner.length) {
      const liStart = ulInner.indexOf('<li', pos);
      if (liStart < 0) break;
      const liTagEnd = ulInner.indexOf('>', liStart);
      if (liTagEnd < 0) break;
      let ulDepth = 0, scan = liTagEnd + 1, liEnd = -1;
      while (scan < ulInner.length) {
        if (ulInner.startsWith('<ul', scan) &&
            (ulInner[scan + 3] === '>' || ulInner[scan + 3] === ' ' || ulInner[scan + 3] === '\t' || ulInner[scan + 3] === '\n')) {
          const e = ulInner.indexOf('>', scan);
          if (e < 0) break;
          ulDepth++; scan = e + 1;
        } else if (ulInner.startsWith('</ul>', scan)) {
          ulDepth--; scan += 5;
        } else if (ulInner.startsWith('</li>', scan) && ulDepth === 0) {
          liEnd = scan; break;
        } else { scan++; }
      }
      if (liEnd < 0) break;
      lis.push(ulInner.slice(liTagEnd + 1, liEnd));
      pos = liEnd + 5;
    }
    return lis;
  }
  function jParseTask(liInner) {
    const actors = []; let mood = null, volume = null;
    const codeRe = /<code\b[^>]*>([\s\S]*?)<\/code>/g;
    let m;
    while ((m = codeRe.exec(liInner)) !== null) {
      const tok = jStripTags(m[1]);
      if (tok.startsWith('@') && tok.length > 1) actors.push(tok.slice(1));
      else if (tok.startsWith(':')) { const n = parseInt(tok.slice(1), 10); if (Number.isFinite(n)) mood = n; }
      else if (tok.startsWith('+')) { const n = parseFloat(tok.slice(1)); if (Number.isFinite(n)) volume = n; }
    }
    let label = liInner.replace(/<code\b[^>]*>[\s\S]*?<\/code>/g, '');
    const innerUl = jFindOuterUL(label);
    if (innerUl) label = label.slice(0, innerUl.start) + label.slice(innerUl.end);
    label = jStripTags(label);
    return { label, actors, mood: jClampMood(mood == null ? 3 : mood), volume };
  }
  function jParseSection(liInner) {
    const nested = jFindOuterUL(liInner);
    const name = jStripTags(nested ? liInner.slice(0, nested.start) : liInner);
    const tasks = nested ? jSplitTopLevelLI(nested.inner).map(jParseTask).filter(t => t.label !== '') : [];
    return { name, tasks };
  }
  function jParseJourney(ulInner) {
    return {
      sections: jSplitTopLevelLI(ulInner).map(jParseSection)
        .filter(s => s.name !== '' && s.tasks.length > 0),
    };
  }
  function jMoodFaceSvg(mood) {
    const m = jClampMood(mood);
    const mouth = {
      5: 'M7.5 14 Q12 19.5 16.5 14',
      4: 'M8.5 14.2 Q12 17 15.5 14.2',
      3: 'M8.5 14.8 L15.5 14.8',
      2: 'M8.5 15.2 Q12 12.5 15.5 15.2',
      1: 'M7.5 16 Q12 10 16.5 16',
    }[m];
    return (
      '<svg class="journey-face" data-mood="' + m + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="10" fill="var(--journey-face-bg)" stroke="currentColor" stroke-width="1.2"/>' +
        '<circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>' +
        '<circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>' +
        '<path d="' + mouth + '"/>' +
      '</svg>'
    );
  }
  function jAssignActorColors(model) {
    const map = new Map();
    for (const s of model.sections) for (const t of s.tasks) for (const a of t.actors) {
      if (!map.has(a)) map.set(a, JOURNEY_ACTOR_PALETTE_RT[map.size % JOURNEY_ACTOR_PALETTE_RT.length]);
    }
    return map;
  }
  // Shortest uppercase prefix unique within the actor set. WCAG 1.4.1
  // redundant encoding mirror of lib/components/journey/transform.js (assignActorLabels).
  function jAssignActorLabels(actorNames) {
    const labels = new Map();
    for (const name of actorNames) {
      let chosen = null;
      for (let len = 1; len <= name.length; len++) {
        const prefix = name.slice(0, len).toUpperCase();
        const collides = actorNames.some((other) => other !== name && other.slice(0, len).toUpperCase() === prefix);
        if (!collides) { chosen = prefix; break; }
      }
      labels.set(name, chosen || name.toUpperCase());
    }
    return labels;
  }
  function jEmitBoard(model) {
    const taskCount = model.sections.reduce((n, s) => n + s.tasks.length, 0);
    if (taskCount === 0) return '';
    const actorColor = jAssignActorColors(model);
    const actors = [...actorColor.entries()];
    const actorLabel = jAssignActorLabels(actors.map((e) => e[0]));
    const sectionVolumes = model.sections.map((s) => s.tasks.reduce((sum, t) => sum + (t.volume == null ? 1 : t.volume), 0));
    const legendHtml = actors.map((e) => {
      const n = e[0], c = e[1];
      const lbl = actorLabel.get(n);
      return '<li class="journey-actor" data-actor="' + jEscAttr(n) + '" style="--actor-color:' + c + '">' +
        '<span class="journey-actor-dot" data-label-len="' + lbl.length + '" aria-hidden="true">' + jEscHtml(lbl) + '</span>' +
        '<span class="journey-actor-name">' + jEscHtml(n) + '</span>' +
      '</li>';
    }).join('');
    const moodLegendHtml = (
      '<li class="journey-mood-key journey-mood-key-low">Pain</li>' +
      [1, 2, 3, 4, 5].map((m) => '<li class="journey-mood-key" data-mood="' + m + '">' +
                 '<span class="journey-mood-key-swatch" aria-hidden="true"></span>' +
                 '<span class="journey-mood-key-label">' + m + '</span>' +
               '</li>').join('') +
      '<li class="journey-mood-key journey-mood-key-high">Delight</li>'
    );
    const sectionsHtml = model.sections.map((s, i) =>
      '<li class="journey-section" data-section="' + i + '" ' +
      'style="--span:' + s.tasks.length + '; --section-index:' + i + '; --section-volume:' + sectionVolumes[i] + '">' +
        '<span class="journey-section-name">' + jEscHtml(s.name) + '</span>' +
      '</li>'
    ).join('');
    let col = 0, totalVolume = 0;
    for (const s of model.sections) for (const t of s.tasks) totalVolume += (t.volume == null ? 1 : t.volume);
    const taskParts = [], moodParts = [], polyPoints = [];
    for (let si = 0; si < model.sections.length; si++) {
      for (const t of model.sections[si].tasks) {
        col++;
        const dots = t.actors.map((a) => {
          const lbl = actorLabel.get(a);
          return '<span class="journey-actor-dot" data-actor="' + jEscAttr(a) +
            '" data-label-len="' + lbl.length + '" ' +
            'style="--actor-color:' + actorColor.get(a) + '" aria-hidden="true">' + jEscHtml(lbl) + '</span>';
        }).join('');
        const vol = t.volume == null ? 1 : t.volume;
        const volPct = totalVolume > 0 ? Math.round((vol / totalVolume) * 100) : 0;
        taskParts.push(
          '<li class="journey-task" data-mood="' + t.mood + '" data-section="' + si + '" ' +
          'style="--col:' + col + '; --mood:' + t.mood + '; --volume:' + vol + '; --volume-pct:' + volPct + '">' +
            '<span class="journey-task-actors">' + dots + '</span>' +
            '<span class="journey-task-label">' + jEscHtml(t.label) + '</span>' +
          '</li>'
        );
        moodParts.push(
          '<li class="journey-mood" data-mood="' + t.mood + '" style="--col:' + col + '; --mood:' + t.mood + '">' +
            '<span class="journey-mood-line" aria-hidden="true"></span>' +
            jMoodFaceSvg(t.mood) +
          '</li>'
        );
        polyPoints.push((col - 0.5).toFixed(2) + ',' + (5 - t.mood).toFixed(2));
      }
    }
    const lanesHtml = actors.map(([name, color], ai) => {
      let lcol = 0; const lDots = [];
      for (const s of model.sections) for (const t of s.tasks) {
        lcol++;
        if (t.actors.includes(name)) {
          lDots.push(
            '<span class="journey-lane-dot" data-mood="' + t.mood + '" style="--col:' + lcol + '; --mood:' + t.mood + '" aria-hidden="true"></span>'
          );
        }
      }
      return (
        '<li class="journey-lane" data-actor="' + jEscAttr(name) +
        '" style="--actor-color:' + color + '; --row:' + (ai + 1) + '">' +
          '<span class="journey-lane-label">' + jEscHtml(name) + '</span>' +
          '<span class="journey-lane-track" aria-hidden="true"></span>' +
          lDots.join('') +
        '</li>'
      );
    }).join('');
    const gridLines = [0, 1, 2, 3, 4].map((y) => '<line class="journey-curve-grid" x1="0" y1="' + y + '" x2="' + taskCount + '" y2="' + y + '" ' +
             'stroke="currentColor" stroke-width="1" stroke-dasharray="3 4" ' +
             'vector-effect="non-scaling-stroke"/>').join('');
    const curveSvg = (
      '<svg class="journey-curve" viewBox="0 0 ' + taskCount + ' 5" preserveAspectRatio="none" aria-hidden="true">' +
        gridLines +
        '<polyline points="' + polyPoints.join(' ') + '" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" ' +
        'vector-effect="non-scaling-stroke"/>' +
      '</svg>'
    );
    return (
      '<div class="journey-board" style="--task-count:' + taskCount + '; --actor-count:' + actors.length + '">' +
        '<ol class="journey-legend">' + legendHtml + '</ol>' +
        '<ol class="journey-mood-legend" aria-label="Mood scale: 1 (pain) to 5 (delight)">' + moodLegendHtml + '</ol>' +
        '<ol class="journey-sections">' + sectionsHtml + '</ol>' +
        '<ol class="journey-tasks">' + taskParts.join('') + '</ol>' +
        '<div class="journey-timeline" aria-hidden="true"></div>' +
        '<ol class="journey-moods">' + moodParts.join('') + '</ol>' +
        curveSvg +
        '<ol class="journey-lanes">' + lanesHtml + '</ol>' +
      '</div>'
    );
  }
  function transformJourney() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.journey')) {
      if (section.querySelector(':scope > .journey-board')) continue;
      const ul = section.querySelector(':scope > ul');
      if (!ul) continue;
      const model = jParseJourney(ul.innerHTML);
      if (model.sections.length === 0) continue;
      const board = jEmitBoard(model);
      const tmp = document.createElement('div');
      tmp.innerHTML = board;
      const boardEl = tmp.firstElementChild;
      ul.replaceWith(boardEl);
    }
  }

  /**
   * Radar / spider chart — runtime mirror of lib/radar.js. Walks each
   * `section.radar` and replaces its source <ul> with a native SVG radar
   * figure. The implementation below is a near-verbatim copy of the pure
   * string parser + emitter in lib/radar.js — that file is canonical; this
   * mirror exists because the marp-vscode preview can't `require` Node
   * modules. Three-renderer parity rule applies: edit both or neither.
   */
  const R_MODIFIERS = ['target', 'delta', 'benchmark', 'quadrant', 'small-multiples'];
  const R_PALETTE = [
    'var(--cat-blue)',  'var(--cat-orange)', 'var(--cat-teal)',  'var(--cat-rose)',
    'var(--cat-purple)', 'var(--cat-green)', 'var(--cat-mauve)', 'var(--cat-slate)',
  ];
  const R_GEOM = { cx: 150, cy: 150, R: 105, rings: 4, labelGap: 22, viewBox: '0 0 300 300' };

  function rEscHtml(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }
  function rEscAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function rStripTags(s) {
    return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  function rFmtNum(n) {
    return Number(Number(n).toFixed(2)).toString();
  }
  function rFindOuterUL(html) {
    const start = html.indexOf('<ul');
    if (start < 0) return null;
    const tagEnd = html.indexOf('>', start);
    if (tagEnd < 0) return null;
    let depth = 1, pos = tagEnd + 1;
    while (pos < html.length) {
      if (html.startsWith('<ul', pos) &&
          (html[pos + 3] === '>' || html[pos + 3] === ' ' || html[pos + 3] === '\t' || html[pos + 3] === '\n')) {
        const e = html.indexOf('>', pos);
        if (e < 0) return null;
        depth++; pos = e + 1;
      } else if (html.startsWith('</ul>', pos)) {
        depth--;
        if (depth === 0) return { start, end: pos + 5, inner: html.slice(tagEnd + 1, pos) };
        pos += 5;
      } else { pos++; }
    }
    return null;
  }
  function rSplitTopLevelLI(ulInner) {
    const lis = [];
    let pos = 0;
    while (pos < ulInner.length) {
      const liStart = ulInner.indexOf('<li', pos);
      if (liStart < 0) break;
      const liTagEnd = ulInner.indexOf('>', liStart);
      if (liTagEnd < 0) break;
      let ulDepth = 0, scan = liTagEnd + 1, liEnd = -1;
      while (scan < ulInner.length) {
        if (ulInner.startsWith('<ul', scan) &&
            (ulInner[scan + 3] === '>' || ulInner[scan + 3] === ' ' || ulInner[scan + 3] === '\t' || ulInner[scan + 3] === '\n')) {
          const e = ulInner.indexOf('>', scan);
          if (e < 0) break;
          ulDepth++; scan = e + 1;
        } else if (ulInner.startsWith('</ul>', scan)) {
          ulDepth--; scan += 5;
        } else if (ulInner.startsWith('</li>', scan) && ulDepth === 0) {
          liEnd = scan; break;
        } else { scan++; }
      }
      if (liEnd < 0) break;
      lis.push(ulInner.slice(liTagEnd + 1, liEnd));
      pos = liEnd + 5;
    }
    return lis;
  }
  function rParseAxisItem(liInner) {
    let value = 0, text = liInner;
    const m = /<code\b[^>]*>([^<]*)<\/code>\s*$/.exec(liInner.trim());
    if (m) {
      const n = parseFloat(rStripTags(m[1]));
      value = Number.isFinite(n) ? n : 0;
      text = liInner.trim().slice(0, m.index);
    }
    return { label: rStripTags(text), value };
  }
  function rParseSeries(liInner, isQuadrant) {
    const nested = rFindOuterUL(liInner);
    const name = rStripTags(nested ? liInner.slice(0, nested.start) : liInner);
    const points = [];
    if (nested) {
      const childLis = rSplitTopLevelLI(nested.inner);
      if (isQuadrant) {
        for (const groupLi of childLis) {
          const groupNested = rFindOuterUL(groupLi);
          const groupName = rStripTags(groupNested ? groupLi.slice(0, groupNested.start) : groupLi);
          if (!groupNested) continue;
          for (const axLi of rSplitTopLevelLI(groupNested.inner)) {
            const { label, value } = rParseAxisItem(axLi);
            if (label) points.push({ axis: label, group: groupName, value });
          }
        }
      } else {
        for (const axLi of childLis) {
          const { label, value } = rParseAxisItem(axLi);
          if (label) points.push({ axis: label, group: null, value });
        }
      }
    }
    return { name, points };
  }
  function rParseRadar(ulInner, isQuadrant) {
    const raw = rSplitTopLevelLI(ulInner)
      .map(li => rParseSeries(li, isQuadrant))
      .filter(s => s.name && s.points.length > 0);
    if (raw.length === 0) return null;
    const axes = raw[0].points.map(p => ({ label: p.axis, group: p.group }));
    const series = raw.map(s => {
      const byLabel = new Map(s.points.map(p => [p.axis.toLowerCase(), p.value]));
      const values = axes.map((ax, i) => {
        const key = ax.label.toLowerCase();
        if (byLabel.has(key)) return byLabel.get(key);
        return s.points[i] ? s.points[i].value : 0;
      });
      return { name: s.name, values };
    });
    const groups = [];
    for (const ax of axes) {
      if (ax.group && !groups.includes(ax.group)) groups.push(ax.group);
    }
    return { axes, series, groups };
  }
  function rNiceCeil(v) {
    if (!(v > 0)) return 1;
    const exp = Math.floor(Math.log10(v));
    const base = 10 ** exp;
    const n = v / base;
    let nice;
    if (n <= 1) nice = 1;
    else if (n <= 2) nice = 2;
    else if (n <= 2.5) nice = 2.5;
    else if (n <= 5) nice = 5;
    else nice = 10;
    return nice * base;
  }
  function rParseScale(text) {
    const t = String(text);
    let m = t.match(/(-?[\d.]+)\s*(?:[–—-]|to)\s*(-?[\d.]+)/);
    if (m) {
      const min = parseFloat(m[1]), max = parseFloat(m[2]);
      if (Number.isFinite(min) && Number.isFinite(max) && max > min) return { min, max };
    }
    m = t.match(/(?:^|\s)([\d.]+)\s*$/);
    if (m) {
      const max = parseFloat(m[1]);
      if (Number.isFinite(max) && max > 0) return { min: 0, max };
    }
    return null;
  }
  function rResolveScale(model, eyebrowText) {
    const explicit = eyebrowText ? rParseScale(eyebrowText) : null;
    if (explicit) return explicit;
    let max = 0;
    for (const s of model.series) for (const v of s.values) if (v > max) max = v;
    return { min: 0, max: rNiceCeil(max) };
  }
  function rAxisAngle(i, n) { return i * 2 * Math.PI / n; }
  function rPolar(radius, angle) {
    return {
      x: R_GEOM.cx + radius * Math.sin(angle),
      y: R_GEOM.cy - radius * Math.cos(angle),
    };
  }
  function rValueRadius(value, scale) {
    const span = scale.max - scale.min || 1;
    const t = (value - scale.min) / span;
    return R_GEOM.R * Math.max(0, Math.min(1, t));
  }
  function rFmtPt(p) { return p.x.toFixed(2) + ',' + p.y.toFixed(2); }
  function rSeriesPoints(values, axisCount, scale) {
    const pts = [];
    for (let i = 0; i < axisCount; i++) {
      pts.push(rFmtPt(rPolar(rValueRadius(values[i], scale), rAxisAngle(i, axisCount))));
    }
    return pts.join(' ');
  }
  function rGridSvg(axisCount) {
    let out = '<g class="radar-grid" aria-hidden="true">';
    for (let r = 1; r <= R_GEOM.rings; r++) {
      const frac = r / R_GEOM.rings;
      const pts = [];
      for (let i = 0; i < axisCount; i++) {
        pts.push(rFmtPt(rPolar(R_GEOM.R * frac, rAxisAngle(i, axisCount))));
      }
      out += '<polygon class="radar-ring" data-ring="' + r + '" points="' + pts.join(' ') + '"/>';
    }
    for (let i = 0; i < axisCount; i++) {
      const p = rPolar(R_GEOM.R, rAxisAngle(i, axisCount));
      out += '<line class="radar-spoke" x1="' + R_GEOM.cx + '" y1="' + R_GEOM.cy +
        '" x2="' + p.x.toFixed(2) + '" y2="' + p.y.toFixed(2) + '"/>';
    }
    out += '</g>';
    return out;
  }
  function rAxisLabelsSvg(axes, gap) {
    const n = axes.length;
    const labelGap = gap == null ? R_GEOM.labelGap : gap;
    let out = '<g class="radar-axes">';
    for (let i = 0; i < n; i++) {
      const a = rAxisAngle(i, n);
      const p = rPolar(R_GEOM.R + labelGap, a);
      const sin = Math.sin(a), cos = Math.cos(a);
      const anchor = sin > 0.34 ? 'start' : sin < -0.34 ? 'end' : 'middle';
      const baseline = cos > 0.34 ? 'auto' : cos < -0.34 ? 'hanging' : 'middle';
      out += '<text class="radar-axis-label" x="' + p.x.toFixed(2) + '" y="' + p.y.toFixed(2) +
        '" text-anchor="' + anchor + '" dominant-baseline="' + baseline + '">' +
        rEscHtml(axes[i].label) + '</text>';
    }
    out += '</g>';
    return out;
  }
  function rTickLabelsSvg(scale) {
    let out = '<g class="radar-ticks" aria-hidden="true">';
    for (let r = 1; r <= R_GEOM.rings; r++) {
      const frac = r / R_GEOM.rings;
      const val = scale.min + (scale.max - scale.min) * frac;
      const p = rPolar(R_GEOM.R * frac, 0);
      out += '<text class="radar-tick" x="' + (p.x + 3).toFixed(2) + '" y="' + p.y.toFixed(2) +
        '" dominant-baseline="middle">' + rEscHtml(rFmtNum(val)) + '</text>';
    }
    out += '</g>';
    return out;
  }
  function rDotsSvg(values, axisCount, scale, seriesIdx, color) {
    let out = '';
    for (let i = 0; i < axisCount; i++) {
      const p = rPolar(rValueRadius(values[i], scale), rAxisAngle(i, axisCount));
      out += '<circle class="radar-dot" data-series="' + seriesIdx + '" style="--series-color:' + color +
        '" cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="2.6"/>';
    }
    return out;
  }
  function rLegendHtml(entries) {
    const items = entries.map((e, i) =>
      '<li data-series="' + i + '"' + (e.kind ? ' data-kind="' + rEscAttr(e.kind) + '"' : '') +
      ' style="--series-color:' + e.color + '">' +
        '<span class="radar-swatch" aria-hidden="true"></span>' +
        '<span class="radar-legend-label">' + rEscHtml(e.name) + '</span>' +
      '</li>'
    ).join('');
    return '<ol class="radar-legend">' + items + '</ol>';
  }
  function rFigure(variant, model, inner) {
    return '<div class="radar-figure" data-variant="' + variant + '" data-axes="' +
      model.axes.length + '" data-series="' + model.series.length + '">' + inner + '</div>';
  }
  function rOpenSvg(extraClass) {
    return '<svg class="radar-svg' + (extraClass ? ' ' + extraClass : '') +
      '" viewBox="' + R_GEOM.viewBox + '" role="img" aria-hidden="true">';
  }
  function rRenderStandard(model, scale, isMinimal) {
    const { axes, series } = model;
    const n = axes.length;
    let plot = '<g class="radar-plot">';
    series.forEach((s, idx) => {
      const color = R_PALETTE[idx % R_PALETTE.length];
      plot += '<polygon class="radar-poly" data-series="' + idx + '" style="--series-color:' + color +
        '" points="' + rSeriesPoints(s.values, n, scale) + '"/>';
    });
    series.forEach((s, idx) => {
      plot += rDotsSvg(s.values, n, scale, idx, R_PALETTE[idx % R_PALETTE.length]);
    });
    plot += '</g>';
    const svg = rOpenSvg() + rGridSvg(n) + rAxisLabelsSvg(axes) + rTickLabelsSvg(scale) + plot + '</svg>';
    const legend = rLegendHtml(series.map((s, i) => ({
      name: s.name, color: R_PALETTE[i % R_PALETTE.length],
    })));
    return rFigure(isMinimal ? 'minimal' : 'default', model, svg + legend);
  }
  function rRenderTarget(model, scale) {
    const { axes, series } = model;
    const n = axes.length;
    let targetIdx = series.findIndex(s => /^(target|goal|plan)$/i.test(s.name.trim()));
    if (targetIdx < 0) targetIdx = series.length - 1;
    const actualIdx = targetIdx === 0 ? Math.min(1, series.length - 1) : 0;
    const actual = series[actualIdx], target = series[targetIdx];
    const actualColor = R_PALETTE[0];
    let gaps = '<g class="radar-gaps" aria-hidden="true">';
    for (let i = 0; i < n; i++) {
      const a = rAxisAngle(i, n);
      const pa = rPolar(rValueRadius(actual.values[i], scale), a);
      const pt = rPolar(rValueRadius(target.values[i], scale), a);
      const dir = actual.values[i] < target.values[i] ? 'under' : 'over';
      gaps += '<line class="radar-gap" data-dir="' + dir + '" x1="' + pa.x.toFixed(2) + '" y1="' +
        pa.y.toFixed(2) + '" x2="' + pt.x.toFixed(2) + '" y2="' + pt.y.toFixed(2) + '"/>';
    }
    gaps += '</g>';
    const svg = rOpenSvg() + rGridSvg(n) + rAxisLabelsSvg(axes) + rTickLabelsSvg(scale) +
      '<polygon class="radar-poly radar-poly--target" points="' + rSeriesPoints(target.values, n, scale) + '"/>' +
      gaps +
      '<g class="radar-plot">' +
        '<polygon class="radar-poly" data-series="0" style="--series-color:' + actualColor +
          '" points="' + rSeriesPoints(actual.values, n, scale) + '"/>' +
        rDotsSvg(actual.values, n, scale, 0, actualColor) +
      '</g>' +
      '</svg>';
    const legend = rLegendHtml([
      { name: actual.name, color: actualColor },
      { name: target.name, color: 'var(--text-muted)', kind: 'target' },
    ]);
    return rFigure('target', model, svg + legend);
  }
  function rRenderDelta(model, scale) {
    const { axes, series } = model;
    const n = axes.length;
    const before = series[0], after = series[1] || series[0];
    const afterColor = R_PALETTE[0];
    let segs = '<g class="radar-deltas" aria-hidden="true">';
    for (let i = 0; i < n; i++) {
      const a = rAxisAngle(i, n);
      const pb = rPolar(rValueRadius(before.values[i], scale), a);
      const pa = rPolar(rValueRadius(after.values[i], scale), a);
      const dir = after.values[i] > before.values[i] ? 'up'
        : after.values[i] < before.values[i] ? 'down' : 'flat';
      segs += '<line class="radar-delta-seg" data-dir="' + dir + '" x1="' + pb.x.toFixed(2) + '" y1="' +
        pb.y.toFixed(2) + '" x2="' + pa.x.toFixed(2) + '" y2="' + pa.y.toFixed(2) + '"/>';
    }
    segs += '</g>';
    const svg = rOpenSvg() + rGridSvg(n) + rAxisLabelsSvg(axes) + rTickLabelsSvg(scale) +
      '<polygon class="radar-poly radar-poly--before" points="' + rSeriesPoints(before.values, n, scale) + '"/>' +
      segs +
      '<g class="radar-plot">' +
        '<polygon class="radar-poly" data-series="0" style="--series-color:' + afterColor +
          '" points="' + rSeriesPoints(after.values, n, scale) + '"/>' +
        rDotsSvg(after.values, n, scale, 0, afterColor) +
      '</g>' +
      '</svg>';
    const legend = rLegendHtml([
      { name: before.name, color: 'var(--text-muted)', kind: 'before' },
      { name: after.name, color: afterColor },
    ]);
    return rFigure('delta', model, svg + legend);
  }
  function rRenderBenchmark(model, scale) {
    const { axes, series } = model;
    const n = axes.length;
    const hero = series[0], pack = series.slice(1);
    const heroColor = R_PALETTE[0];
    let band = '';
    if (pack.length > 0) {
      const maxPts = [], minPts = [];
      for (let i = 0; i < n; i++) {
        const vals = pack.map(s => s.values[i]);
        const a = rAxisAngle(i, n);
        maxPts.push(rPolar(rValueRadius(Math.max.apply(null, vals), scale), a));
        minPts.push(rPolar(rValueRadius(Math.min.apply(null, vals), scale), a));
      }
      const outer = 'M ' + maxPts.map(p => p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' L ') + ' Z';
      const inner = 'M ' + minPts.slice().reverse()
        .map(p => p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' L ') + ' Z';
      band = '<path class="radar-band" fill-rule="evenodd" d="' + outer + ' ' + inner + '"/>';
    }
    const svg = rOpenSvg() + rGridSvg(n) + rAxisLabelsSvg(axes) + rTickLabelsSvg(scale) +
      band +
      '<g class="radar-plot">' +
        '<polygon class="radar-poly radar-poly--hero" data-series="0" style="--series-color:' + heroColor +
          '" points="' + rSeriesPoints(hero.values, n, scale) + '"/>' +
        rDotsSvg(hero.values, n, scale, 0, heroColor) +
      '</g>' +
      '</svg>';
    const legend = rLegendHtml([
      { name: hero.name, color: heroColor, kind: 'hero' },
      { name: pack.length ? 'Comparison range' : hero.name, color: 'var(--text-muted)', kind: 'band' },
    ]);
    return rFigure('benchmark', model, svg + legend);
  }
  function rRenderQuadrant(model, scale, isMinimal) {
    const { axes, series, groups } = model;
    const n = axes.length;
    if (groups.length === 0) return rRenderStandard(model, scale, isMinimal);
    const half = Math.PI / n;
    const heroVals = series[0].values;
    let sectors = '<g class="radar-sectors" aria-hidden="true">';
    let arcs = '<g class="radar-sector-means" aria-hidden="true">';
    let rim = '<g class="radar-sector-labels">';
    groups.forEach((g, gi) => {
      const idxs = [];
      for (let i = 0; i < n; i++) if (axes[i].group === g) idxs.push(i);
      if (idxs.length === 0) return;
      const color = R_PALETTE[gi % R_PALETTE.length];
      const startA = rAxisAngle(idxs[0], n) - half;
      const endA = rAxisAngle(idxs[idxs.length - 1], n) + half;
      const largeArc = (endA - startA) > Math.PI ? 1 : 0;
      const p1 = rPolar(R_GEOM.R, startA), p2 = rPolar(R_GEOM.R, endA);
      sectors += '<path class="radar-sector" data-group="' + gi + '" style="--series-color:' + color +
        '" d="M ' + R_GEOM.cx + ' ' + R_GEOM.cy + ' L ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) +
        ' A ' + R_GEOM.R + ' ' + R_GEOM.R + ' 0 ' + largeArc + ' 1 ' +
        p2.x.toFixed(2) + ' ' + p2.y.toFixed(2) + ' Z"/>';
      const mean = idxs.reduce((s, i) => s + heroVals[i], 0) / idxs.length;
      const mr = rValueRadius(mean, scale);
      const m1 = rPolar(mr, startA), m2 = rPolar(mr, endA);
      arcs += '<path class="radar-sector-mean" data-group="' + gi + '" style="--series-color:' + color +
        '" d="M ' + m1.x.toFixed(2) + ' ' + m1.y.toFixed(2) + ' A ' + mr.toFixed(2) + ' ' + mr.toFixed(2) +
        ' 0 ' + largeArc + ' 1 ' + m2.x.toFixed(2) + ' ' + m2.y.toFixed(2) + '"/>';
      const midA = (startA + endA) / 2;
      const lp = rPolar(R_GEOM.R + R_GEOM.labelGap + 16, midA);
      const sin = Math.sin(midA), cos = Math.cos(midA);
      const anchor = sin > 0.34 ? 'start' : sin < -0.34 ? 'end' : 'middle';
      const baseline = cos > 0.34 ? 'auto' : cos < -0.34 ? 'hanging' : 'middle';
      rim += '<text class="radar-sector-label" data-group="' + gi + '" style="--series-color:' + color +
        '" x="' + lp.x.toFixed(2) + '" y="' + lp.y.toFixed(2) + '" text-anchor="' + anchor +
        '" dominant-baseline="' + baseline + '">' + rEscHtml(g) + '</text>';
    });
    sectors += '</g>'; arcs += '</g>'; rim += '</g>';
    let plot = '<g class="radar-plot">';
    series.forEach((s, idx) => {
      const color = R_PALETTE[idx % R_PALETTE.length];
      plot += '<polygon class="radar-poly" data-series="' + idx + '" style="--series-color:' + color +
        '" points="' + rSeriesPoints(s.values, n, scale) + '"/>';
    });
    series.forEach((s, idx) => {
      plot += rDotsSvg(s.values, n, scale, idx, R_PALETTE[idx % R_PALETTE.length]);
    });
    plot += '</g>';
    const svg = rOpenSvg() + sectors + rGridSvg(n) + arcs +
      rAxisLabelsSvg(axes, R_GEOM.labelGap - 6) + rTickLabelsSvg(scale) + rim + plot + '</svg>';
    const legend = rLegendHtml(series.map((s, i) => ({
      name: s.name, color: R_PALETTE[i % R_PALETTE.length],
    })));
    return rFigure('quadrant', model, svg + legend);
  }
  function rRenderSmallMultiples(model, scale) {
    const { axes, series } = model;
    const n = axes.length;
    const minis = series.map((s, idx) => {
      const color = R_PALETTE[idx % R_PALETTE.length];
      const svg = rOpenSvg('radar-svg--mini') +
        rGridSvg(n) + rAxisLabelsSvg(axes, R_GEOM.labelGap - 8) +
        '<g class="radar-plot">' +
          '<polygon class="radar-poly" data-series="0" style="--series-color:' + color +
            '" points="' + rSeriesPoints(s.values, n, scale) + '"/>' +
          rDotsSvg(s.values, n, scale, 0, color) +
        '</g>' +
        '</svg>';
      return '<figure class="radar-mini" style="--series-color:' + color + '">' +
        svg +
        '<figcaption class="radar-mini-label">' + rEscHtml(s.name) + '</figcaption>' +
      '</figure>';
    }).join('');
    return rFigure('small-multiples', model, '<div class="radar-multiples">' + minis + '</div>');
  }
  function rPickVariant(tokens) {
    for (const mod of R_MODIFIERS) {
      if (tokens.includes(mod)) return mod;
    }
    return 'default';
  }
  function rBuildRadar(model, variant, scale, isMinimal) {
    switch (variant) {
      case 'target':          return rRenderTarget(model, scale);
      case 'delta':           return rRenderDelta(model, scale);
      case 'benchmark':       return rRenderBenchmark(model, scale);
      case 'quadrant':        return rRenderQuadrant(model, scale, isMinimal);
      case 'small-multiples': return rRenderSmallMultiples(model, scale);
      default:                return rRenderStandard(model, scale, isMinimal);
    }
  }
  // The radar runtime DOM transform fires via applyChartFamily() — radar is
  // a chart-family member, dispatched alongside progress / piechart / etc.
  // The rPickVariant / rParseRadar / rResolveScale / rBuildRadar functions
  // above are called by the buildRadarFigure helper in that block.

  /**
   * Quadrant chart — runtime mirror of lib/quadrant.js. Walks each
   * `section.quadrant` and replaces its source <ul> with a native SVG
   * 2×2 chart figure. The implementation below is a near-verbatim copy
   * of the pure string parser + emitter in lib/quadrant.js — that file
   * is canonical; this mirror exists because the marp-vscode preview
   * can't `require` Node modules. Three-renderer parity rule applies:
   * edit both or neither.
   */
  const Q_MODIFIERS = ['bubble', 'trail', 'cohort', 'threshold', 'magic'];
  // Palette assignment is owned by lattice.css per-cell rules (data-cell="0"…"3").
  // The runtime mirror just emits the cell index; theme picks the colour.
  const Q_MAGIC_NAMES = ['Challengers', 'Leaders', 'Niche Players', 'Visionaries'];
  const Q_MAGIC_AXES  = { x: 'Completeness of Vision', y: 'Ability to Execute' };
  const Q_THRESHOLD_ZONES = ['On Pace', 'Star', 'At Risk', 'Lagging'];
  const Q_GEOM = {
    viewBox: '0 0 420 320',
    vbW: 420, vbH: 320,
    plot: { x0: 56, y0: 30, x1: 392, y1: 274 },
    cornerInset: 14,
    bubble: { rMin: 5, rMax: 26 },
    dotR: 4.5,
  };

  function qEscHtml(s) {
    return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }
  function qEscAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function qStripTags(s) {
    return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  function qFmtNum(n) {
    return Number(Number(n).toFixed(2)).toString();
  }
  function qFindOuterUL(html) {
    const start = html.indexOf('<ul');
    if (start < 0) return null;
    const tagEnd = html.indexOf('>', start);
    if (tagEnd < 0) return null;
    let depth = 1, pos = tagEnd + 1;
    while (pos < html.length) {
      if (html.startsWith('<ul', pos) &&
          (html[pos + 3] === '>' || html[pos + 3] === ' ' || html[pos + 3] === '\t' || html[pos + 3] === '\n')) {
        const e = html.indexOf('>', pos);
        if (e < 0) return null;
        depth++; pos = e + 1;
      } else if (html.startsWith('</ul>', pos)) {
        depth--;
        if (depth === 0) return { start, end: pos + 5, inner: html.slice(tagEnd + 1, pos) };
        pos += 5;
      } else { pos++; }
    }
    return null;
  }
  function qSplitTopLevelLI(ulInner) {
    const lis = [];
    let pos = 0;
    while (pos < ulInner.length) {
      const liStart = ulInner.indexOf('<li', pos);
      if (liStart < 0) break;
      const liTagEnd = ulInner.indexOf('>', liStart);
      if (liTagEnd < 0) break;
      let ulDepth = 0, scan = liTagEnd + 1, liEnd = -1;
      while (scan < ulInner.length) {
        if (ulInner.startsWith('<ul', scan) &&
            (ulInner[scan + 3] === '>' || ulInner[scan + 3] === ' ' || ulInner[scan + 3] === '\t' || ulInner[scan + 3] === '\n')) {
          const e = ulInner.indexOf('>', scan);
          if (e < 0) break;
          ulDepth++; scan = e + 1;
        } else if (ulInner.startsWith('</ul>', scan)) {
          ulDepth--; scan += 5;
        } else if (ulInner.startsWith('</li>', scan) && ulDepth === 0) {
          liEnd = scan; break;
        } else { scan++; }
      }
      if (liEnd < 0) break;
      lis.push(ulInner.slice(liTagEnd + 1, liEnd));
      pos = liEnd + 5;
    }
    return lis;
  }
  function qParseItemPills(liInner) {
    const text = liInner.trim();
    const pills = [];
    let rest = text;
    while (true) {
      const m = /<code\b[^>]*>([^<]*)<\/code>\s*$/.exec(rest);
      if (!m) break;
      pills.unshift(qStripTags(m[1]));
      rest = rest.slice(0, m.index).trim();
    }
    return { label: qStripTags(rest), pills };
  }
  function qParseCoordPill(pillText) {
    const parts = String(pillText).split(',').map(s => s.trim()).filter(Boolean);
    const nums = [], extras = [];
    for (const part of parts) {
      const n = parseFloat(part);
      if (Number.isFinite(n) && /^[-+]?\d/.test(part)) { nums.push(n); extras.push(part); }
      else extras.push(part);
    }
    return { x: nums[0] || 0, y: nums[1] || 0, size: nums[2], parts: extras };
  }
  function qParseItem(liInner) {
    const { label, pills } = qParseItemPills(liInner);
    const a = pills[0] ? qParseCoordPill(pills[0]) : { x: 0, y: 0, size: undefined, parts: [] };
    const b = pills[1] ? qParseCoordPill(pills[1]) : null;
    return {
      label, x: a.x, y: a.y, size: a.size,
      sizePill: pills[0] && a.parts[2] !== undefined ? a.parts[2] : '',
      to: b ? { x: b.x, y: b.y } : null,
    };
  }
  function qParseGroup(liInner) {
    const nested = qFindOuterUL(liInner);
    const name = qStripTags(nested ? liInner.slice(0, nested.start) : liInner);
    const items = nested
      ? qSplitTopLevelLI(nested.inner).map(qParseItem).filter(it => it.label || (it.x || it.y))
      : [];
    return { name, items };
  }
  function qParseQuadrant(ulInner) {
    const groups = qSplitTopLevelLI(ulInner).map(qParseGroup)
      .filter(g => g.name || g.items.length > 0);
    if (groups.length === 0) return null;
    return { groups };
  }
  function qAllItems(model) {
    const flat = [];
    for (const g of model.groups) for (const it of g.items) flat.push({ group: g.name, ...it });
    return flat;
  }
  function qNiceCeil(v) {
    if (!(v > 0)) return 1;
    const exp = Math.floor(Math.log10(v));
    const base = 10 ** exp;
    const n = v / base;
    let nice;
    if (n <= 1) nice = 1;
    else if (n <= 2) nice = 2;
    else if (n <= 2.5) nice = 2.5;
    else if (n <= 5) nice = 5;
    else nice = 10;
    return nice * base;
  }
  function qPullRange(text) {
    const t = String(text).trim();
    const m = t.match(/(.*?)\s*(-?[\d.]+)\s*(?:[–—-]|to)\s*(-?[\d.]+)\s*$/);
    if (m) {
      const min = parseFloat(m[2]), max = parseFloat(m[3]);
      if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
        return { name: m[1].trim(), range: { min, max } };
      }
    }
    return { name: t, range: null };
  }
  function qParseTargets(text) {
    const m = String(text).match(/([-+]?[\d.]+)\s*,\s*([-+]?[\d.]+)/);
    if (!m) return null;
    const x = parseFloat(m[1]), y = parseFloat(m[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }
  function qParseEyebrow(text) {
    let core = String(text || '').trim();
    let targets = null;
    const tMatch = core.match(/(?:[·,;]\s*)?targets?\s*[:·]?\s*(.+)$/i);
    if (tMatch) {
      targets = qParseTargets(tMatch[1]);
      if (targets) core = core.slice(0, tMatch.index).trim();
    }
    const arrow = core.match(/(.*?)\s*(?:→|->)\s*(.*)/);
    let xText = '', yText = '';
    if (arrow) { xText = arrow[1].trim(); yText = arrow[2].trim(); }
    else { xText = core; }
    const xPart = qPullRange(xText);
    const yPart = qPullRange(yText);
    return {
      xName: xPart.name, yName: yPart.name,
      xRange: xPart.range, yRange: yPart.range,
      targets,
    };
  }
  function qResolveScale(model, eyebrow) {
    const eb = qParseEyebrow(eyebrow);
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const g of model.groups) for (const it of g.items) {
      const xs = [it.x]; const ys = [it.y];
      if (it.to) { xs.push(it.to.x); ys.push(it.to.y); }
      for (const x of xs) { if (x < xMin) xMin = x; if (x > xMax) xMax = x; }
      for (const y of ys) { if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
    }
    if (!Number.isFinite(xMin)) { xMin = 0; xMax = 1; }
    if (!Number.isFinite(yMin)) { yMin = 0; yMax = 1; }
    const xScale = eb.xRange || { min: xMin < 0 ? xMin : 0, max: qNiceCeil(Math.max(xMax, xMin < 0 ? -xMin : xMax)) };
    const yScale = eb.yRange || { min: yMin < 0 ? yMin : 0, max: qNiceCeil(Math.max(yMax, yMin < 0 ? -yMin : yMax)) };
    return {
      x: { ...xScale, label: eb.xName },
      y: { ...yScale, label: eb.yName },
      targets: eb.targets,
    };
  }
  function qPlotPoint(x, y, scale) {
    const { plot } = Q_GEOM;
    const tx = (x - scale.x.min) / (scale.x.max - scale.x.min || 1);
    const ty = (y - scale.y.min) / (scale.y.max - scale.y.min || 1);
    return {
      x: plot.x0 + Math.max(0, Math.min(1, tx)) * (plot.x1 - plot.x0),
      y: plot.y1 - Math.max(0, Math.min(1, ty)) * (plot.y1 - plot.y0),
    };
  }
  function qFmtPt(p) { return p.x.toFixed(2) + ',' + p.y.toFixed(2); }
  function qBubbleRadius(size, sizeRange) {
    if (!Number.isFinite(size) || !sizeRange || sizeRange.max <= 0) return Q_GEOM.dotR;
    const t = Math.sqrt(Math.max(0, size) / sizeRange.max);
    return Q_GEOM.bubble.rMin + t * (Q_GEOM.bubble.rMax - Q_GEOM.bubble.rMin);
  }
  function qConvexHull(points) {
    if (points.length < 3) return points.slice();
    const pts = points.slice().sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
    const cross = (O, A, B) => (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }
  function qCentroid(points) {
    if (points.length === 0) return { x: 0, y: 0 };
    if (points.length < 3) {
      const sx = points.reduce((s, p) => s + p.x, 0);
      const sy = points.reduce((s, p) => s + p.y, 0);
      return { x: sx / points.length, y: sy / points.length };
    }
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < points.length; i++) {
      const p = points[i], q = points[(i + 1) % points.length];
      const f = p.x * q.y - q.x * p.y;
      a += f; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f;
    }
    a *= 0.5;
    if (Math.abs(a) < 1e-6) {
      const sx = points.reduce((s, p) => s + p.x, 0);
      const sy = points.reduce((s, p) => s + p.y, 0);
      return { x: sx / points.length, y: sy / points.length };
    }
    return { x: cx / (6 * a), y: cy / (6 * a) };
  }
  function qTintsSvg(splitX, splitY) {
    const { plot } = Q_GEOM;
    const cells = [
      { x: plot.x0, y: plot.y0, w: splitX - plot.x0, h: splitY - plot.y0 },
      { x: splitX,  y: plot.y0, w: plot.x1 - splitX, h: splitY - plot.y0 },
      { x: plot.x0, y: splitY,  w: splitX - plot.x0, h: plot.y1 - splitY },
      { x: splitX,  y: splitY,  w: plot.x1 - splitX, h: plot.y1 - splitY },
    ];
    let out = '<g class="quadrant-tints" aria-hidden="true">';
    cells.forEach((c, i) => {
      if (c.w <= 0 || c.h <= 0) return;
      out += '<rect class="quadrant-tint" data-cell="' + i + '" ' +
        'x="' + c.x.toFixed(2) + '" y="' + c.y.toFixed(2) + '" ' +
        'width="' + c.w.toFixed(2) + '" height="' + c.h.toFixed(2) + '"/>';
    });
    out += '</g>';
    return out;
  }
  function qFrameSvg(splitX, splitY, splitVariant) {
    const { plot } = Q_GEOM;
    return '<g class="quadrant-frame" aria-hidden="true">' +
      '<rect class="quadrant-bounds" x="' + plot.x0 + '" y="' + plot.y0 + '" ' +
        'width="' + (plot.x1 - plot.x0).toFixed(2) + '" height="' + (plot.y1 - plot.y0).toFixed(2) + '"/>' +
      '<line class="quadrant-split quadrant-split--x" data-kind="' + splitVariant + '" ' +
        'x1="' + splitX.toFixed(2) + '" y1="' + plot.y0 + '" x2="' + splitX.toFixed(2) + '" y2="' + plot.y1 + '"/>' +
      '<line class="quadrant-split quadrant-split--y" data-kind="' + splitVariant + '" ' +
        'x1="' + plot.x0 + '" y1="' + splitY.toFixed(2) + '" x2="' + plot.x1 + '" y2="' + splitY.toFixed(2) + '"/>' +
    '</g>';
  }
  function qLabelsSvg(names, extraClass) {
    const { plot, cornerInset } = Q_GEOM;
    const positions = [
      { x: plot.x0 + cornerInset, y: plot.y0 + cornerInset, anchor: 'start', baseline: 'hanging' },
      { x: plot.x1 - cornerInset, y: plot.y0 + cornerInset, anchor: 'end',   baseline: 'hanging' },
      { x: plot.x0 + cornerInset, y: plot.y1 - cornerInset, anchor: 'start', baseline: 'auto'    },
      { x: plot.x1 - cornerInset, y: plot.y1 - cornerInset, anchor: 'end',   baseline: 'auto'    },
    ];
    let out = '<g class="quadrant-labels">';
    names.forEach((name, i) => {
      if (!name) return;
      const p = positions[i];
      out += '<text class="quadrant-label' + (extraClass ? ' ' + extraClass : '') + '" ' +
        'data-cell="' + i + '" ' +
        'x="' + p.x.toFixed(2) + '" y="' + p.y.toFixed(2) + '" ' +
        'text-anchor="' + p.anchor + '" dominant-baseline="' + p.baseline + '">' + qEscHtml(name) + '</text>';
    });
    out += '</g>';
    return out;
  }
  function qAxisLabelsSvg(scale) {
    const { plot, vbH } = Q_GEOM;
    const xMid = (plot.x0 + plot.x1) / 2;
    const yMid = (plot.y0 + plot.y1) / 2;
    let out = '<g class="quadrant-axes" aria-hidden="true">';
    if (scale.x.label) {
      out += '<text class="quadrant-axis-name quadrant-axis-name--x" ' +
        'x="' + xMid.toFixed(2) + '" y="' + (vbH - 8).toFixed(2) + '" ' +
        'text-anchor="middle" dominant-baseline="auto">' + qEscHtml(scale.x.label) + '</text>';
    }
    if (scale.y.label) {
      out += '<text class="quadrant-axis-name quadrant-axis-name--y" ' +
        'transform="rotate(-90 18 ' + yMid.toFixed(2) + ')" ' +
        'x="18" y="' + yMid.toFixed(2) + '" ' +
        'text-anchor="middle" dominant-baseline="auto">' + qEscHtml(scale.y.label) + '</text>';
    }
    out += '<text class="quadrant-tick" x="' + plot.x0.toFixed(2) + '" y="' + (plot.y1 + 14).toFixed(2) + '" ' +
      'text-anchor="start" dominant-baseline="hanging">' + qEscHtml(qFmtNum(scale.x.min)) + '</text>';
    out += '<text class="quadrant-tick" x="' + plot.x1.toFixed(2) + '" y="' + (plot.y1 + 14).toFixed(2) + '" ' +
      'text-anchor="end" dominant-baseline="hanging">' + qEscHtml(qFmtNum(scale.x.max)) + '</text>';
    out += '<text class="quadrant-tick" x="' + (plot.x0 - 6).toFixed(2) + '" y="' + plot.y1.toFixed(2) + '" ' +
      'text-anchor="end" dominant-baseline="auto">' + qEscHtml(qFmtNum(scale.y.min)) + '</text>';
    out += '<text class="quadrant-tick" x="' + (plot.x0 - 6).toFixed(2) + '" y="' + plot.y0.toFixed(2) + '" ' +
      'text-anchor="end" dominant-baseline="hanging">' + qEscHtml(qFmtNum(scale.y.max)) + '</text>';
    out += '</g>';
    return out;
  }
  function qDotWithLabelSvg(p, label, cellIdx, opts) {
    const r = opts && opts.r != null ? opts.r : Q_GEOM.dotR;
    const offset = r + 4;
    const plot = Q_GEOM.plot;
    const cz = { h: 80, v: 35 };
    const nearLeft  = p.x < plot.x0 + cz.h;
    const nearRight = p.x > plot.x1 - cz.h;
    const nearTop   = p.y < plot.y0 + cz.v;
    const nearBot   = p.y > plot.y1 - cz.v;
    const nearCorner = (nearLeft || nearRight) && (nearTop || nearBot);
    let lx, ly, anchor, baseline;
    if (nearCorner) {
      if (nearRight) { lx = p.x - offset; anchor = 'end'; }
      else           { lx = p.x + offset; anchor = 'start'; }
      ly = p.y;
      baseline = 'middle';
    } else {
      const above = p.y - offset > plot.y0 + 8;
      lx = p.x;
      ly = above ? p.y - offset : p.y + offset + 2;
      anchor = 'middle';
      baseline = above ? 'auto' : 'hanging';
    }
    let out = '';
    out += '<circle class="quadrant-dot" data-cell="' + cellIdx + '" ' +
      'cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="' + r.toFixed(2) + '"/>';
    if (label) {
      out += '<text class="quadrant-dot-label" data-cell="' + cellIdx + '" ' +
        'x="' + lx.toFixed(2) + '" y="' + ly.toFixed(2) + '" ' +
        'text-anchor="' + anchor + '" dominant-baseline="' + baseline + '">' + qEscHtml(label) + '</text>';
    }
    return out;
  }
  function qFigure(variant, model, scale, inner, extraAttrs) {
    const items = qAllItems(model);
    const xa = scale.x.label ? ' data-x-axis="' + qEscAttr(scale.x.label) + '"' : '';
    const ya = scale.y.label ? ' data-y-axis="' + qEscAttr(scale.y.label) + '"' : '';
    return '<div class="quadrant-figure" data-variant="' + variant + '" ' +
      'data-groups="' + model.groups.length + '" data-items="' + items.length + '"' +
      xa + ya + (extraAttrs || '') + '>' + inner + '</div>';
  }
  function qOpenSvg(extraClass) {
    return '<svg class="quadrant-svg' + (extraClass ? ' ' + extraClass : '') + '" ' +
      'viewBox="' + Q_GEOM.viewBox + '" role="img" aria-hidden="true">';
  }
  function qRenderStandard(model, scale, variant) {
    const isMagic = variant === 'magic';
    const splitX = (Q_GEOM.plot.x0 + Q_GEOM.plot.x1) / 2;
    const splitY = (Q_GEOM.plot.y0 + Q_GEOM.plot.y1) / 2;
    const names = [0, 1, 2, 3].map(i => {
      const fromGroup = model.groups[i] ? model.groups[i].name : '';
      return fromGroup || (isMagic ? Q_MAGIC_NAMES[i] : '');
    });
    const labelScale = isMagic
      ? { x: { ...scale.x, label: scale.x.label || Q_MAGIC_AXES.x },
          y: { ...scale.y, label: scale.y.label || Q_MAGIC_AXES.y },
          targets: scale.targets }
      : scale;
    const items = qAllItems(model);
    const labelEveryDot = isMagic || items.length <= 16;
    let plot = '<g class="quadrant-plot">';
    model.groups.forEach((g, gi) => {
      const cellIdx = gi % 4;
      for (const it of g.items) {
        const p = qPlotPoint(it.x, it.y, scale);
        plot += qDotWithLabelSvg(p, labelEveryDot ? it.label : '', cellIdx);
      }
    });
    plot += '</g>';
    const labelClass = isMagic ? 'quadrant-label--magic' : '';
    const svg = qOpenSvg(isMagic ? 'quadrant-svg--magic' : '') +
      qTintsSvg(splitX, splitY) +
      qFrameSvg(splitX, splitY, 'centerline') +
      qAxisLabelsSvg(labelScale) +
      qLabelsSvg(names, labelClass) +
      plot +
    '</svg>';
    return qFigure(variant, model, labelScale, svg);
  }
  function qRenderBubble(model, scale) {
    const splitX = (Q_GEOM.plot.x0 + Q_GEOM.plot.x1) / 2;
    const splitY = (Q_GEOM.plot.y0 + Q_GEOM.plot.y1) / 2;
    const names = [0, 1, 2, 3].map(i => (model.groups[i] ? model.groups[i].name : ''));
    let maxSize = 0;
    for (const g of model.groups) for (const it of g.items)
      if (Number.isFinite(it.size) && it.size > maxSize) maxSize = it.size;
    const sizeRange = maxSize > 0 ? { min: 0, max: maxSize } : null;
    const botCornerTop = Q_GEOM.plot.y1 - Q_GEOM.cornerInset - 13;
    let plot = '<g class="quadrant-plot">';
    model.groups.forEach((g, gi) => {
      const cellIdx = gi % 4;
      for (const it of g.items) {
        const p = qPlotPoint(it.x, it.y, scale);
        const r = qBubbleRadius(it.size, sizeRange);
        plot += '<circle class="quadrant-bubble" data-cell="' + cellIdx + '" ' +
          'cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="' + r.toFixed(2) + '"/>';
        const inside = r >= 11;
        const valY = inside ? p.y + 3 : p.y - r - 3;
        const valBaseline = inside ? 'middle' : 'auto';
        if (it.sizePill) {
          plot += '<text class="quadrant-bubble-value" data-pos="' + (inside ? 'inside' : 'above') + '" ' +
            'data-cell="' + cellIdx + '" ' +
            'x="' + p.x.toFixed(2) + '" y="' + valY.toFixed(2) + '" ' +
            'text-anchor="middle" dominant-baseline="' + valBaseline + '">' + qEscHtml(it.sizePill) + '</text>';
        }
        if (it.label) {
          const belowY = inside ? p.y + r + 3 : p.y + r + 11;
          const aboveY = p.y - r - (inside ? 3 : 11);
          const flipUp = belowY > botCornerTop - 12;
          const ny = flipUp ? aboveY : belowY;
          const baseline = flipUp ? 'auto' : 'hanging';
          plot += '<text class="quadrant-bubble-label" data-cell="' + cellIdx + '" ' +
            'x="' + p.x.toFixed(2) + '" y="' + ny.toFixed(2) + '" ' +
            'text-anchor="middle" dominant-baseline="' + baseline + '">' + qEscHtml(it.label) + '</text>';
        }
      }
    });
    plot += '</g>';
    const svg = qOpenSvg('quadrant-svg--bubble') +
      qTintsSvg(splitX, splitY) +
      qFrameSvg(splitX, splitY, 'centerline') +
      qAxisLabelsSvg(scale) +
      qLabelsSvg(names) +
      plot +
    '</svg>';
    return qFigure('bubble', model, scale, svg);
  }
  function qRenderTrail(model, scale) {
    const splitX = (Q_GEOM.plot.x0 + Q_GEOM.plot.x1) / 2;
    const splitY = (Q_GEOM.plot.y0 + Q_GEOM.plot.y1) / 2;
    const names = [0, 1, 2, 3].map(i => (model.groups[i] ? model.groups[i].name : ''));
    let plot = '<g class="quadrant-plot">';
    model.groups.forEach((g, gi) => {
      const cellIdx = gi % 4;
      for (const it of g.items) {
        const a = qPlotPoint(it.x, it.y, scale);
        const b = it.to ? qPlotPoint(it.to.x, it.to.y, scale) : a;
        plot += '<line class="quadrant-trail-line" data-cell="' + cellIdx + '" ' +
          'x1="' + a.x.toFixed(2) + '" y1="' + a.y.toFixed(2) + '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) + '"/>';
        plot += '<circle class="quadrant-trail-before" data-cell="' + cellIdx + '" ' +
          'cx="' + a.x.toFixed(2) + '" cy="' + a.y.toFixed(2) + '" r="' + (Q_GEOM.dotR - 0.5).toFixed(2) + '"/>';
        plot += '<circle class="quadrant-trail-after" data-cell="' + cellIdx + '" ' +
          'cx="' + b.x.toFixed(2) + '" cy="' + b.y.toFixed(2) + '" r="' + (Q_GEOM.dotR + 0.5).toFixed(2) + '"/>';
        if (it.label) {
          const labelAbove = b.y - 10 > Q_GEOM.plot.y0 + 8;
          const ly = labelAbove ? b.y - 9 : b.y + 12;
          const baseline = labelAbove ? 'auto' : 'hanging';
          plot += '<text class="quadrant-dot-label" data-cell="' + cellIdx + '" ' +
            'x="' + b.x.toFixed(2) + '" y="' + ly.toFixed(2) + '" ' +
            'text-anchor="middle" dominant-baseline="' + baseline + '">' + qEscHtml(it.label) + '</text>';
        }
      }
    });
    plot += '</g>';
    const svg = qOpenSvg('quadrant-svg--trail') +
      qTintsSvg(splitX, splitY) +
      qFrameSvg(splitX, splitY, 'centerline') +
      qAxisLabelsSvg(scale) +
      qLabelsSvg(names) +
      plot +
    '</svg>';
    return qFigure('trail', model, scale, svg);
  }
  function qRenderCohort(model, scale) {
    const splitX = (Q_GEOM.plot.x0 + Q_GEOM.plot.x1) / 2;
    const splitY = (Q_GEOM.plot.y0 + Q_GEOM.plot.y1) / 2;
    const hulls = model.groups.map((g, gi) => {
      const pts = g.items.map(it => qPlotPoint(it.x, it.y, scale));
      const hull = qConvexHull(pts);
      const c = qCentroid(hull.length ? hull : pts);
      return { name: g.name, cellIdx: gi % 4, hull, points: pts, centroid: c };
    });
    let hullsSvg = '<g class="quadrant-hulls" aria-hidden="true">';
    for (const h of hulls) {
      if (h.hull.length >= 3) {
        hullsSvg += '<polygon class="quadrant-hull" data-cell="' + h.cellIdx + '" ' +
          'points="' + h.hull.map(qFmtPt).join(' ') + '"/>';
      } else if (h.hull.length === 2) {
        const [a, b] = h.hull;
        hullsSvg += '<line class="quadrant-hull-line" data-cell="' + h.cellIdx + '" ' +
          'x1="' + a.x.toFixed(2) + '" y1="' + a.y.toFixed(2) + '" x2="' + b.x.toFixed(2) + '" y2="' + b.y.toFixed(2) + '"/>';
      }
    }
    hullsSvg += '</g>';
    let plot = '<g class="quadrant-plot">';
    hulls.forEach(h => {
      for (const p of h.points) {
        plot += '<circle class="quadrant-dot" data-cell="' + h.cellIdx + '" ' +
          'cx="' + p.x.toFixed(2) + '" cy="' + p.y.toFixed(2) + '" r="' + Q_GEOM.dotR.toFixed(2) + '"/>';
      }
    });
    plot += '</g>';
    let labels = '<g class="quadrant-cohort-labels">';
    for (const h of hulls) {
      if (!h.name || h.points.length === 0) continue;
      labels += '<text class="quadrant-cohort-label" data-cell="' + h.cellIdx + '" ' +
        'x="' + h.centroid.x.toFixed(2) + '" y="' + h.centroid.y.toFixed(2) + '" ' +
        'text-anchor="middle" dominant-baseline="middle">' + qEscHtml(h.name) + '</text>';
    }
    labels += '</g>';
    const legendItems = hulls.map(h =>
      '<li data-cell="' + h.cellIdx + '">' +
        '<span class="quadrant-swatch" aria-hidden="true"></span>' +
        '<span class="quadrant-legend-label">' + qEscHtml(h.name) + '</span>' +
        '<span class="quadrant-legend-count">' + h.points.length + '</span>' +
      '</li>'
    ).join('');
    const legend = '<ol class="quadrant-legend">' + legendItems + '</ol>';
    const svg = qOpenSvg('quadrant-svg--cohort') +
      qFrameSvg(splitX, splitY, 'centerline') +
      qAxisLabelsSvg(scale) +
      hullsSvg +
      plot +
      labels +
    '</svg>';
    return qFigure('cohort', model, scale, svg + legend);
  }
  function qRenderThreshold(model, scale) {
    const tx = scale.targets ? scale.targets.x : (scale.x.min + scale.x.max) / 2;
    const ty = scale.targets ? scale.targets.y : (scale.y.min + scale.y.max) / 2;
    const p = qPlotPoint(tx, ty, scale);
    const splitX = p.x, splitY = p.y;
    const names = [0, 1, 2, 3].map(i => {
      const fromGroup = model.groups[i] ? model.groups[i].name : '';
      return fromGroup || Q_THRESHOLD_ZONES[i];
    });
    let plot = '<g class="quadrant-plot">';
    model.groups.forEach((g, gi) => {
      const cellIdx = gi % 4;
      for (const it of g.items) {
        const pp = qPlotPoint(it.x, it.y, scale);
        plot += qDotWithLabelSvg(pp, it.label, cellIdx);
      }
    });
    plot += '</g>';
    let badges = '<g class="quadrant-target-badges" aria-hidden="true">';
    badges += '<text class="quadrant-target-badge quadrant-target-badge--x" ' +
      'x="' + splitX.toFixed(2) + '" y="' + (Q_GEOM.plot.y1 + 14).toFixed(2) + '" ' +
      'text-anchor="middle" dominant-baseline="hanging">' + qEscHtml(qFmtNum(tx)) + '</text>';
    badges += '<text class="quadrant-target-badge quadrant-target-badge--y" ' +
      'x="' + (Q_GEOM.plot.x0 - 6).toFixed(2) + '" y="' + splitY.toFixed(2) + '" ' +
      'text-anchor="end" dominant-baseline="middle">' + qEscHtml(qFmtNum(ty)) + '</text>';
    badges += '</g>';
    const svg = qOpenSvg('quadrant-svg--threshold') +
      qTintsSvg(splitX, splitY) +
      qFrameSvg(splitX, splitY, 'target') +
      qAxisLabelsSvg(scale) +
      qLabelsSvg(names, 'quadrant-label--zone') +
      badges +
      plot +
    '</svg>';
    return qFigure('threshold', model, scale, svg,
      ' data-tx="' + qEscAttr(qFmtNum(tx)) + '" data-ty="' + qEscAttr(qFmtNum(ty)) + '"');
  }
  function qPickVariant(tokens) {
    for (const mod of Q_MODIFIERS) if (tokens.includes(mod)) return mod;
    return 'default';
  }
  function qBuildQuadrant(model, variant, scale) {
    switch (variant) {
      case 'bubble':    return qRenderBubble(model, scale);
      case 'trail':     return qRenderTrail(model, scale);
      case 'cohort':    return qRenderCohort(model, scale);
      case 'threshold': return qRenderThreshold(model, scale);
      case 'magic':     return qRenderStandard(model, scale, 'magic');
      default:          return qRenderStandard(model, scale, 'default');
    }
  }
  // The quadrant runtime DOM transform fires via applyChartFamily() —
  // quadrant is a chart-family member. The above functions are called by
  // the buildQuadrantFigure helper in that block.

  /**
   * Strips trailing periods from headings on `no-period` slides.
   * Authors opt in deck-wide via `class: no-period` in front
   * matter. Walks to the last text node inside each heading so inline markup
   * (e.g. `<em>text.</em>`) is handled correctly. Mirrors the Marp plugin in
   * marp.config.js and the `sp` helper in lattice-emulator.js.
   */
  function transformStripHeadingPeriods() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.no-period')) {
      for (const h of section.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        if (h.dataset.periodsStripped) continue;
        let lastText = null;
        (function walk(node) {
          for (const child of node.childNodes) {
            if (child.nodeType === 3) lastText = child;       // TEXT_NODE
            else if (child.nodeType === 1) walk(child);       // ELEMENT_NODE
          }
        })(h);
        if (lastText) lastText.nodeValue = lastText.nodeValue.replace(/\.\s*$/, '');
        h.dataset.periodsStripped = '1';
      }
    }
  }

  /**
   * Appends a period to headings on `with-period` slides that do not
   * already end with terminal punctuation (.!?:…). Mirrors the Marp plugin in
   * marp.config.js and the `ap` helper in lattice-emulator.js.
   */
  function transformAddHeadingPeriods() {
    if (typeof document === 'undefined') return;
    for (const section of document.querySelectorAll('section.with-period')) {
      for (const h of section.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
        if (h.dataset.periodsAdded) continue;
        let lastText = null;
        (function walk(node) {
          for (const child of node.childNodes) {
            if (child.nodeType === 3) lastText = child;
            else if (child.nodeType === 1) walk(child);
          }
        })(h);
        if (lastText && !/[.!?:…]$/.test(lastText.nodeValue.trimEnd())) {
          lastText.nodeValue = lastText.nodeValue.trimEnd() + '.';
        }
        h.dataset.periodsAdded = '1';
      }
    }
  }

  // Eagerly hides raw fence source and reinstates cached SVGs within the
  // observer callback itself — no debounce. This eliminates the two visible
  // artefacts that appear during the 150ms debounce window after Marp
  // replaces a <section> wholesale:
  //
  //   1. Raw <pre><code class="language-mermaid"> source text becoming visible.
  //      wrapFences() sets data-mermaid-state on every unmarked fence; CSS
  //      collapses the <pre> as soon as that attribute exists (any value).
  //
  //   2. All other diagrams (whose source didn't change) going blank.
  //      For each fence now marked "pending", if its source is in the SVG
  //      cache we reinject synchronously — the diagram reappears in the same
  //      microtask that processed the mutation, before any repaint.
  //
  // Cache misses (diagram whose source actually changed) stay pending and are
  // handled by the debounced initAndRun() → mermaid.render() path as before.
  // Idempotent: wrapFences() skips already-marked fences; the cache inject
  // skips fences already in "rendered" state.
  function injectCachedSvgsEagerly() {
    wrapFences();
    if (!mermaidSvgCache.size) return;
    const PENDING_SEL = [
      'pre[data-mermaid-state="pending"]',
      'marp-pre[data-mermaid-state="pending"]',
    ].join(",");
    for (const preEl of document.querySelectorAll(PENDING_SEL)) {
      const codeEl = preEl.querySelector(":scope > code");
      const target = preEl.nextElementSibling?.classList.contains("mermaid")
        ? preEl.nextElementSibling : null;
      if (!codeEl || !target) continue;
      const svg = mermaidSvgCache.get((codeEl.textContent || "").trim());
      if (!svg) continue;
      target.innerHTML = svg;
      preEl.dataset.mermaidState = "rendered";
    }
  }

  // Single unified observer that replaces the former separate Mermaid,
  // glossary, and chart-family observers. Consolidating here means Marp's
  // burst of mutations on each keystroke (~5–10 within 30ms) collapses
  // to one 150ms trailing-edge run rather than triggering three independent
  // callback chains in the same burst.
  function startObserver() {
    if (typeof MutationObserver === "undefined") return;
    if (globalScope.__llObserverStarted) return;
    globalScope.__llObserverStarted = true;

    // We watch for two distinct events:
    //
    //   A. Any element added to the DOM (childList).
    //      Source: Marp replaces <section> elements wholesale on every
    //      keystroke. Scheduling a full content run covers layout transforms,
    //      glossary, chart family, and Mermaid fence discovery in one pass.
    //      The former observer only triggered when a Mermaid fence appeared;
    //      this broader trigger is necessary for non-Mermaid layouts (split
    //      panels, glossary, charts) which also need re-applying after a
    //      section replacement.
    //
    //   B. Source edits to Mermaid fences we've already claimed (characterData).
    //      Source: VS Code's markdown preview infrastructure morphs fences
    //      in place — the <pre>/<code> survive, only the text node changes.
    //      We filter strictly to text nodes inside code fences we own so
    //      that characterData mutations from Mermaid's SVG layout engine
    //      and from other transforms do not retrigger this path.
    //
    // Why no `attributes: true`:
    //   The former chart observer used `attributes: true` so that class
    //   changes (e.g. the `class: dark` directive) would re-apply chart
    //   transforms. But that also fired on every `data-mermaid-state`
    //   attribute write ("pending" → "rendering" → "rendered"), causing a
    //   cascade: each Mermaid render triggered 3+ full-document
    //   applyChartFamily calls (5× querySelectorAll each). No transform
    //   here needs attribute-change notification — idempotency guards
    //   (`.chart-header`, `.brief-left`, etc.) already handle re-entry, and
    //   section-class changes arrive via childList (section replacement).

    const isOwnedCode = (codeEl) =>
      codeEl &&
      codeEl.tagName === "CODE" &&
      (codeEl.classList.contains("language-mermaid") ||
       codeEl.classList.contains("language-mermaid-source"));

    const observer = new MutationObserver((mutations) => {
      let triggered = false;
      for (const m of mutations) {
        if (triggered) break;

        if (m.type === "childList") {
          // Any element addition: a section was replaced or content inserted.
          // Text-only mutations (pure text-node childList) are not meaningful
          // for our transforms; Marp's section replacements always include elements.
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              // Eagerly hide raw fence source and reinstate cached SVGs before
              // the debounce fires. See injectCachedSvgsEagerly() for details.
              injectCachedSvgsEagerly();
              scheduleRun();
              triggered = true;
              break;
            }
          }
        } else if (m.type === "characterData") {
          // Walk up from the changed text node to its <code> parent.
          const codeEl = m.target?.parentElement;
          if (!isOwnedCode(codeEl)) continue;
          // Source changed in a fence we own — invalidate the cached render
          // so initAndRun picks it up again. Reset state and clear the SVG
          // sibling; wrapFences will reuse the empty sibling next pass.
          const preEl = codeEl.parentElement;
          if (!preEl) continue;
          delete preEl.dataset.mermaidState;
          const sib = preEl.nextElementSibling;
          if (sib?.classList.contains("mermaid")) sib.innerHTML = "";
          scheduleRun();
          triggered = true;
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true, // filtered above to owned Mermaid fences only
    });
  }

  // ── Glossary list → table transform ─────────────────────────────────────
  // Author writes a 2-level nested list under a `glossary` slide:
  //   - Term
  //     - Definition
  // The runtime rewrites the first <ul> in each glossary section into a
  // 2-column table with the term auto-bolded. Mirrors the Marpit plugin in
  // marp.config.js and the post-processor in lattice-emulator.js.
  function applyGlossaryListTable(root) {
    if (!root?.querySelectorAll) return;
    const slides = root.querySelectorAll('section.glossary');
    slides.forEach((sec) => {
      // Skip if a table is already present (already transformed, or table-input author).
      if (sec.querySelector('table')) return;
      const ul = sec.querySelector(':scope > ul, :scope > div > ul');
      if (!ul) return;
      const items = Array.from(ul.children).filter(c => c.tagName === 'LI');
      if (!items.length) return;
      const tbody = document.createElement('tbody');
      items.forEach((li) => {
        const nested = li.querySelector(':scope > ul');
        let termHtml;
        if (nested) {
          // Term = li's content excluding the nested ul.
          const clone = li.cloneNode(true);
          const nestedClone = clone.querySelector(':scope > ul');
          if (nestedClone) nestedClone.remove();
          termHtml = clone.innerHTML.trim();
        } else {
          termHtml = li.innerHTML.trim();
        }
        if (!/^<(?:strong|b)\b/i.test(termHtml)) termHtml = `<strong>${termHtml}</strong>`;
        const defLi = nested?.querySelector(':scope > li');
        const defHtml = defLi ? defLi.innerHTML.trim() : '';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${termHtml}</td><td>${defHtml}</td>`;
        tbody.appendChild(tr);
      });
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Term</th><th>Definition</th></tr>';
      table.appendChild(thead);
      table.appendChild(tbody);
      ul.replaceWith(table);
    });
  }

  // ── Glossary range pill ─────────────────────────────────────────────────
  // Mirrors the Marpit plugin in marp.config.js and the post-processor in
  // lattice-emulator.js. VS Code's Marp preview won't load custom Marpit plugins
  // unless the user trusts the workspace and points the extension at the
  // config — too brittle to rely on. Instead we run a DOM-side injector
  // here so every `section.compare-table.glossary` gets its h2 pill in the
  // preview just like in marp-cli output.
  function applyGlossaryRangePills(root) {
    if (!root?.querySelectorAll) return;
    const slides = root.querySelectorAll('section.glossary');
    slides.forEach((sec) => {
      const h2 = sec.querySelector('h2');
      if (!h2) return;
      const tbody = sec.querySelector('table tbody');
      if (!tbody) return;
      const cells = tbody.querySelectorAll('tr > td:first-child');
      if (!cells.length) return;
      const firstChar = (el) => ((el.textContent || '').trim()[0] || '').toUpperCase();
      const a = firstChar(cells[0]);
      const z = firstChar(cells[cells.length - 1]);
      if (!a) return;
      const range = a === z ? a : `${a} \u2013 ${z}`;
      const existing = h2.querySelector(':scope > .range-pill');
      if (existing) {
        if (existing.textContent !== range) existing.textContent = range;
        return;
      }
      const pill = document.createElement('span');
      pill.className = 'range-pill';
      pill.textContent = range;
      h2.appendChild(document.createTextNode(' '));
      h2.appendChild(pill);
    });
  }

  // ── Chart family — DOM transform ───────────────────────────────────────
  // Mirror of the engine plugin (marp.config.js → lib/chart-family.js) for
  // the marp-vscode preview path, where marp.config.js is NOT loaded by
  // the extension. Same pattern as transformVerdictGridBadges,
  // applyGlossaryListTable, etc. The transform is idempotent: a section
  // already wrapped in `chart-frame` is a no-op.
  const CHART_LAYOUTS = ['progress', 'timeline-list', 'piechart', 'gantt', 'kanban', 'radar', 'quadrant'];
  const PIE_PALETTE = [
    'var(--c1-dark)',  'var(--c2-dark)', 'var(--c3-dark)', 'var(--c4-dark)',
    'var(--c5-dark)',  'var(--c6-dark)',  'var(--c7-dark)',  'var(--c8-dark)',
  ];

  function chartEscAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function extractTrailingPills(lead) {
    const pills = [];
    while (lead.lastChild) {
      while (lead.lastChild && lead.lastChild.nodeType === 3 &&
             !lead.lastChild.nodeValue.trim()) {
        lead.removeChild(lead.lastChild);
      }
      const last = lead.lastChild;
      if (!last || last.nodeType !== 1 || last.tagName !== 'CODE') break;
      pills.unshift(last.textContent.trim());
      lead.removeChild(last);
    }
    return pills;
  }

  function extractLeadingPill(lead) {
    while (lead.firstChild && lead.firstChild.nodeType === 3 &&
           !lead.firstChild.nodeValue.trim()) {
      lead.removeChild(lead.firstChild);
    }
    const first = lead.firstChild;
    if (!first || first.nodeType !== 1 || first.tagName !== 'CODE') return '';
    const text = first.textContent.trim();
    lead.removeChild(first);
    while (lead.firstChild && lead.firstChild.nodeType === 3 &&
           !lead.firstChild.nodeValue.trim()) {
      lead.removeChild(lead.firstChild);
    }
    return text;
  }

  function splitListItem(li) {
    const clone = li.cloneNode(true);
    let bodyHtml = '';
    const nested = clone.querySelector(':scope > ul, :scope > ol');
    if (nested) {
      const firstNested = nested.querySelector(':scope > li');
      bodyHtml = firstNested ? firstNested.innerHTML.trim() : '';
      nested.remove();
    }
    const lead = document.createElement('span');
    while (clone.firstChild) lead.appendChild(clone.firstChild);
    return { lead, bodyHtml };
  }

  function buildProgressBars(ul) {
    const wrap = document.createElement('div');
    wrap.className = 'progress-bars';
    for (const li of ul.querySelectorAll(':scope > li')) {
      const { lead, bodyHtml } = splitListItem(li);
      const pills = extractTrailingPills(lead);
      const pctRaw = pills[0] || '';
      const status = pills[1] || '';
      const pct = parseInt(pctRaw, 10) || 0;
      const labelHtml = lead.innerHTML.trim();
      const row = document.createElement('div');
      row.className = 'progress-row';
      row.innerHTML =
        '<div class="progress-label">' + labelHtml + '</div>' +
        '<div class="progress-track"><div class="progress-fill"' +
          (status ? ' data-s="' + chartEscAttr(status) + '"' : '') +
          ' style="--pct:' + pct + '"></div></div>' +
        '<div class="progress-pct">' + chartEscAttr(pctRaw) + '</div>' +
        (status
          ? '<span class="chart-status" data-s="' + chartEscAttr(status) + '">' + chartEscAttr(status) + '</span>'
          : '<span class="chart-status-empty"></span>') +
        (bodyHtml ? '<div class="progress-note">' + bodyHtml + '</div>' : '');
      wrap.appendChild(row);
    }
    return wrap;
  }

  function buildTimelineSpine(ol) {
    const wrap = document.createElement('div');
    wrap.className = 'timeline-spine';
    for (const li of ol.querySelectorAll(':scope > li')) {
      const { lead, bodyHtml } = splitListItem(li);
      const datePill = extractLeadingPill(lead);
      const pills = extractTrailingPills(lead);
      const statusPill = pills[0] || '';
      const titleHtml = lead.innerHTML.trim();
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML =
        '<div class="timeline-dot"></div>' +
        (datePill
          ? '<div class="timeline-pill">' + chartEscAttr(datePill) + '</div>'
          : '<div class="timeline-pill timeline-pill--empty"></div>') +
        '<div class="timeline-title">' + titleHtml + '</div>' +
        (statusPill
          ? '<span class="chart-status" data-s="' + chartEscAttr(statusPill) + '">' + chartEscAttr(statusPill) + '</span>'
          : '') +
        (bodyHtml ? '<div class="timeline-body">' + bodyHtml + '</div>' : '');
      wrap.appendChild(item);
    }
    return wrap;
  }

  function buildPieChart(ul, isDonut) {
    const items = [];
    for (const li of ul.querySelectorAll(':scope > li')) {
      const { lead } = splitListItem(li);
      const pills = extractTrailingPills(lead);
      const valueRaw = pills[0] || '0';
      const num = parseFloat((valueRaw.match(/[\d.]+/) || ['0'])[0]) || 0;
      items.push({ labelHtml: lead.innerHTML.trim(), valueRaw, num });
    }
    const total = items.reduce((s, p) => s + p.num, 0) || 1;
    const cx = 100, cy = 100, R = 80, r = 50;
    let cumul = 0;
    const wedgePaths = items.map((p, idx) => {
      const startAngle = (cumul / total) * 2 * Math.PI;
      cumul += p.num;
      const endAngle = (cumul / total) * 2 * Math.PI;
      const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
      const x1 = (cx + R * Math.sin(startAngle)).toFixed(2);
      const y1 = (cy - R * Math.cos(startAngle)).toFixed(2);
      const x2 = (cx + R * Math.sin(endAngle)).toFixed(2);
      const y2 = (cy - R * Math.cos(endAngle)).toFixed(2);
      const fill = PIE_PALETTE[idx % PIE_PALETTE.length];
      let d;
      if (isDonut) {
        const ix1 = (cx + r * Math.sin(startAngle)).toFixed(2);
        const iy1 = (cy - r * Math.cos(startAngle)).toFixed(2);
        const ix2 = (cx + r * Math.sin(endAngle)).toFixed(2);
        const iy2 = (cy - r * Math.cos(endAngle)).toFixed(2);
        d = 'M ' + x1 + ' ' + y1 + ' A ' + R + ' ' + R + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 +
            ' L ' + ix2 + ' ' + iy2 + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 0 ' + ix1 + ' ' + iy1 + ' Z';
      } else {
        d = 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 +
            ' A ' + R + ' ' + R + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z';
      }
      return '<path class="wedge" style="fill:' + fill + '" d="' + d + '"/>';
    }).join('');
    const legendItems = items.map((p, idx) => {
      const fill = PIE_PALETTE[idx % PIE_PALETTE.length];
      return '<li>' +
        '<span class="legend-swatch" style="background:' + fill + '"></span>' +
        '<span class="legend-label">' + p.labelHtml + '</span>' +
        '<span class="legend-pct">' + chartEscAttr(p.valueRaw) + '</span>' +
        '</li>';
    }).join('');
    const figure = document.createElement('div');
    figure.className = 'piechart-figure';
    figure.innerHTML =
      '<svg class="piechart-svg" viewBox="0 0 200 200" role="img" aria-hidden="true">' +
      wedgePaths + '</svg>' +
      '<ol class="piechart-legend">' + legendItems + '</ol>';
    return figure;
  }

  function buildGanttChart(ul, eyebrowText) {
    const parseWindow = (text) => {
      const m = text.match(/(.+?)\s*(?:→|–|->)\s*(.+)/);
      if (!m) return { ticks: [], colMap: {} };
      const norm = (s) => {
        const q = s.match(/Q[1-4]/i); if (q) return q[0].toUpperCase();
        const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mo = allM.find(mn => new RegExp(mn, 'i').test(s)); if (mo) return mo;
        return s.trim();
      };
      const start = norm(m[1].trim()), end = norm(m[2].trim());
      const allQ = ['Q1','Q2','Q3','Q4'];
      const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const qs = allQ.indexOf(start), qe = allQ.indexOf(end);
      const ms = allM.indexOf(start), me = allM.indexOf(end);
      let ticks;
      if (qs >= 0 && qe >= 0 && qe >= qs)       ticks = allQ.slice(qs, qe + 1);
      else if (ms >= 0 && me >= 0 && me >= ms)   ticks = allM.slice(ms, me + 1);
      else return { ticks: [], colMap: {} };
      const colMap = {};
      ticks.forEach((t, i) => { colMap[t] = i + 1; });
      return { ticks, colMap };
    };
    const parseRange = (pill, colMap) => {
      const m = pill.match(/(.+?)\s*(?:→|–|->)\s*(.+)/);
      if (!m) return { col: 1, span: 1 };
      const norm = (s) => {
        const q = s.match(/Q[1-4]/i); if (q) return q[0].toUpperCase();
        const allM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const mo = allM.find(mn => new RegExp(mn, 'i').test(s)); if (mo) return mo;
        return s.trim();
      };
      const sc = colMap[norm(m[1].trim())], ec = colMap[norm(m[2].trim())];
      if (!sc || !ec) return { col: 1, span: 1 };
      return { col: sc, span: ec - sc + 1 };
    };

    const { ticks, colMap } = parseWindow(eyebrowText || '');
    const numCols = ticks.length || 4;
    const chart = document.createElement('div');
    chart.className = 'gantt-chart';
    chart.style.setProperty('--gantt-cols', numCols);

    const axisRow = document.createElement('div');
    axisRow.className = 'gantt-axis-row';
    const axisSpacer = document.createElement('div');
    axisSpacer.className = 'gantt-axis-spacer';
    const ticksEl = document.createElement('div');
    ticksEl.className = 'gantt-ticks';
    for (const t of ticks) {
      const tick = document.createElement('div');
      tick.className = 'gantt-tick';
      tick.textContent = t;
      ticksEl.appendChild(tick);
    }
    axisRow.appendChild(axisSpacer);
    axisRow.appendChild(ticksEl);
    chart.appendChild(axisRow);

    for (const li of ul.querySelectorAll(':scope > li')) {
      const nestedUl = li.querySelector(':scope > ul, :scope > ol');
      const labelClone = li.cloneNode(true);
      labelClone.querySelector(':scope > ul, :scope > ol')?.remove();
      const laneLabel = labelClone.textContent.trim();

      const lane = document.createElement('div');
      lane.className = 'gantt-lane';
      const labelEl = document.createElement('div');
      labelEl.className = 'gantt-lane-label';
      labelEl.textContent = laneLabel;
      const barsEl = document.createElement('div');
      barsEl.className = 'gantt-bars';

      if (nestedUl) {
        for (const barLi of nestedUl.querySelectorAll(':scope > li')) {
          const clone = barLi.cloneNode(true);
          clone.querySelector(':scope > ul, :scope > ol')?.remove();
          const pills = extractTrailingPills(clone);
          const rangePill  = pills.find(p => /→|–|->/.test(p)) || '';
          const statusPill = pills.find(p => !/→|–|->/.test(p)) || '';
          const { col, span } = rangePill ? parseRange(rangePill, colMap) : { col: 1, span: 1 };
          const bar = document.createElement('div');
          bar.className = 'gantt-bar';
          if (statusPill) bar.dataset.s = statusPill;
          bar.style.setProperty('--gantt-col-start', col);
          bar.style.setProperty('--gantt-col-span', span);
          bar.innerHTML = clone.innerHTML.replace(/^<p[^>]*>([\s\S]*)<\/p>$/, '$1').trim();
          barsEl.appendChild(bar);
        }
      }
      lane.appendChild(labelEl);
      lane.appendChild(barsEl);
      chart.appendChild(lane);
    }
    return chart;
  }

  function buildKanbanBoard(ul) {
    const KB_STATUS = ['on-track','done','live','at-risk','warn','blocked','fail','pilot','decision','deferred'];
    const KB_SIZE   = ['s','m','l','xl'];
    const KB_DONE_NAMES = ['done','completed','shipped','closed'];
    const LANE_COLORS = [
      'var(--c1-dark)','var(--c2-dark)','var(--c3-dark)','var(--c4-dark)',
      'var(--c5-dark)','var(--c6-dark)','var(--c7-dark)','var(--c8-dark)',
    ];
    const laneColorMap = {};
    let laneColorIdx = 0;
    const getLaneColor = (lane) => {
      if (!lane) return '';
      const key = lane.toLowerCase();
      if (!laneColorMap[key]) laneColorMap[key] = LANE_COLORS[laneColorIdx++ % LANE_COLORS.length];
      return laneColorMap[key];
    };

    const board = document.createElement('div');
    board.className = 'kanban-board';

    for (const colLi of ul.querySelectorAll(':scope > li')) {
      const nestedUl = colLi.querySelector(':scope > ul, :scope > ol');
      const headerClone = colLi.cloneNode(true);
      headerClone.querySelector(':scope > ul, :scope > ol')?.remove();
      const colHeader = headerClone.textContent.trim();
      const isDone = KB_DONE_NAMES.includes(colHeader.toLowerCase());

      const col = document.createElement('div');
      col.className = 'kanban-column';
      if (isDone) col.dataset.done = '';
      const headerEl = document.createElement('div');
      headerEl.className = 'kanban-column-header';
      headerEl.textContent = colHeader;
      col.appendChild(headerEl);

      const cardsEl = document.createElement('div');
      cardsEl.className = 'kanban-cards';
      if (nestedUl) {
        for (const cardLi of nestedUl.querySelectorAll(':scope > li')) {
          const cardClone = cardLi.cloneNode(true);
          const bodySub = cardClone.querySelector(':scope > ul, :scope > ol');
          let label = '', status = '', cardBody = '';
          if (bodySub) {
            const subLis = Array.from(bodySub.querySelectorAll(':scope > li'));
            if (subLis[0]) {
              const metaClone = subLis[0].cloneNode(true);
              const trailingCode = metaClone.querySelector('code:last-child');
              const trailingText = trailingCode ? trailingCode.textContent.trim() : '';
              if (trailingText && KB_STATUS.includes(trailingText.toLowerCase())) {
                status = trailingText;
                trailingCode.remove();
              }
              label = metaClone.textContent.trim();
            }
            if (subLis[1]) cardBody = subLis[1].innerHTML.trim();
            bodySub.remove();
          }
          // Size: one trailing size code on the title line
          const titleCode = cardClone.querySelector('code:last-child');
          const titleCodeText = titleCode ? titleCode.textContent.trim() : '';
          let size = '';
          if (titleCodeText && KB_SIZE.includes(titleCodeText.toLowerCase())) {
            size = titleCodeText.toUpperCase();
            titleCode.remove();
          }
          const cardTitle = cardClone.innerHTML.replace(/^<p[^>]*>([\s\S]*)<\/p>$/, '$1').trim();
          const laneColor = getLaneColor(label);
          const card = document.createElement('div');
          card.className = 'kanban-card';
          if (status) card.dataset.s = status;
          if (laneColor) card.style.setProperty('--lane-color', laneColor);
          const sizeEl   = size   ? '<span class="kanban-size">' + chartEscAttr(size) + '</span>' : '';
          const laneEl   = label  ? '<span class="kanban-lane" style="--lane-color:' + (laneColor || 'var(--accent)') + '">' + chartEscAttr(label) + '</span>' : '';
          const statusEl = status ? '<span class="chart-status" data-s="' + chartEscAttr(status) + '">' + chartEscAttr(status) + '</span>' : '';
          card.innerHTML =
            '<div class="kanban-card-title"><span class="kanban-title-text">' + cardTitle + '</span>' + sizeEl + '</div>' +
            ((laneEl || statusEl) ? '<div class="kanban-card-meta">' + laneEl + statusEl + '</div>' : '') +
            (cardBody ? '<div class="kanban-card-body">' + cardBody + '</div>' : '');
          cardsEl.appendChild(card);
        }
      }
      col.appendChild(cardsEl);
      board.appendChild(col);
    }
    return board;
  }

  // Radar — delegates to the runtime radar kernel (rParseRadar / rBuildRadar)
  // defined above near line 1505. The kernel emits an HTML string for the
  // <div class="radar-figure"> wrapper; this wraps it in a host element so
  // it can be appended to the chart-body container.
  function buildRadarFigure(list, eyebrowText, className) {
    const tokens = String(className || '').trim().split(/\s+/);
    const variant = rPickVariant(tokens);
    const isMinimal = tokens.includes('minimal');
    const model = rParseRadar(list.innerHTML, variant === 'quadrant');
    if (!model) return null;
    const scale = rResolveScale(model, eyebrowText || '');
    const figHtml = rBuildRadar(model, variant, scale, isMinimal);
    const tmp = document.createElement('div');
    tmp.innerHTML = figHtml;
    return tmp.firstElementChild;
  }

  // Quadrant — delegates to the runtime quadrant kernel (qParseQuadrant /
  // qBuildQuadrant) defined above. Wraps the emitted HTML string in a host
  // element so the chart-body builder can append it directly.
  function buildQuadrantFigure(list, eyebrowText, className) {
    const tokens = String(className || '').trim().split(/\s+/);
    const variant = qPickVariant(tokens);
    const model = qParseQuadrant(list.innerHTML);
    if (!model) return null;
    const scale = qResolveScale(model, eyebrowText || '');
    const figHtml = qBuildQuadrant(model, variant, scale);
    const tmp = document.createElement('div');
    tmp.innerHTML = figHtml;
    return tmp.firstElementChild;
  }

  function transformChartSection(section, layout) {
    if (section.querySelector(':scope > .chart-header')) return;
    const h2 = section.querySelector(':scope > h2');
    const list = section.querySelector(':scope > ul, :scope > ol');
    if (!h2 || !list) return;

    let eyebrowEl = null;
    const prev = h2.previousElementSibling;
    if (prev && prev.tagName === 'P' &&
        prev.children.length === 1 && prev.firstElementChild.tagName === 'CODE' &&
        !prev.textContent.replace(prev.firstElementChild.textContent, '').trim()) {
      eyebrowEl = document.createElement('p');
      eyebrowEl.className = 'chart-eyebrow';
      const code = document.createElement('code');
      code.textContent = prev.firstElementChild.textContent;
      eyebrowEl.appendChild(code);
      prev.remove();
    }

    let subtitleEl = null;
    let cursor = h2.nextElementSibling;
    while (cursor && cursor !== list) {
      if (cursor.tagName === 'P') {
        subtitleEl = document.createElement('p');
        subtitleEl.className = 'chart-subtitle';
        subtitleEl.innerHTML = cursor.innerHTML;
        const next = cursor.nextElementSibling;
        cursor.remove();
        cursor = next;
        break;
      }
      cursor = cursor.nextElementSibling;
    }

    let chartContainer;
    const isDonut = section.classList.contains('donut');
    const eyebrowText = eyebrowEl ? eyebrowEl.firstElementChild.textContent : '';
    if (layout === 'progress')           chartContainer = buildProgressBars(list);
    else if (layout === 'timeline-list') chartContainer = buildTimelineSpine(list);
    else if (layout === 'piechart')      chartContainer = buildPieChart(list, isDonut);
    else if (layout === 'gantt')         chartContainer = buildGanttChart(list, eyebrowText);
    else if (layout === 'kanban')        chartContainer = buildKanbanBoard(list);
    else if (layout === 'radar')         chartContainer = buildRadarFigure(list, eyebrowText, section.className);
    else if (layout === 'quadrant')      chartContainer = buildQuadrantFigure(list, eyebrowText, section.className);
    else return;
    if (!chartContainer) return;

    let captionEl = null;
    let trailingP = null;
    let ws = list.nextSibling;
    while (ws && (ws.nodeType === 3 || (ws.nodeType === 1 && ws.tagName === 'P'))) {
      if (ws.nodeType === 1 && ws.tagName === 'P') trailingP = ws;
      ws = ws.nextSibling;
    }
    if (trailingP) {
      let inner = trailingP.innerHTML.trim();
      const m = inner.match(/^<em>([\s\S]*)<\/em>$/);
      if (m) inner = m[1];
      captionEl = document.createElement('p');
      captionEl.className = 'chart-caption';
      captionEl.innerHTML = inner;
      trailingP.remove();
    }

    const header = document.createElement('div');
    header.className = 'chart-header';
    if (eyebrowEl) header.appendChild(eyebrowEl);
    header.appendChild(h2.cloneNode(true));
    if (subtitleEl) header.appendChild(subtitleEl);
    const body = document.createElement('div');
    body.className = 'chart-body';
    body.appendChild(chartContainer);
    h2.parentNode.replaceChild(header, h2);
    list.parentNode.replaceChild(body, list);
    if (captionEl) body.parentNode.insertBefore(captionEl, body.nextSibling);
    section.classList.add('chart-frame');
  }

  function applyChartFamily(root) {
    if (!root?.querySelectorAll) return;
    for (const layout of CHART_LAYOUTS) {
      for (const section of root.querySelectorAll('section.' + layout)) {
        try { transformChartSection(section, layout); }
        catch (e) {
          if (typeof console !== 'undefined') {
            console.warn('[lattice-runtime] chart transform failed', layout, e);
          }
        }
      }
    }
  }

  /**
   * Mirror of marp.config.js's `deckClassPropagate` plugin for the preview
   * path. Marpit's spec is "spot replaces global", so a slide with a
   * `_class:` directive drops the deck-wide `class:` value entirely. The
   * Marpit plugin overrides that at token-rewrite time, but VS Code Marp
   * preview does not load `marp.config.js`, so the rendered DOM in the
   * preview retains only per-slide classes.
   *
   * The runtime can't read front matter from the rendered DOM (Marpit
   * strips it cleanly). Instead we fetch the source `.md` opportunistically
   * — works for published HTML decks where the source is co-located, and
   * gracefully no-ops for any context where fetch fails (notably VS Code's
   * `vscode-webview://` sandbox, which doesn't have access to workspace
   * files via fetch). For the VS Code preview case the recommended path is
   * the `theme: cuoio-dark` / `theme: indaco-dark` variant themes; this
   * mirror is a complementary path for users who want `class: dark` to
   * keep working in browser-based previews of exported HTML.
   */
  function applyDeckClassFromFrontMatter() {
    if (typeof document === 'undefined' || typeof fetch === 'undefined') return;
    if (typeof window === 'undefined' || !window.location || !window.location.href) return;
    // Derive the source `.md` URL from the current `.html` URL.
    const url = window.location.href.replace(/[?#].*$/, '');
    const mdUrl = url.replace(/\.html?$/i, '.md');
    if (mdUrl === url) return; // not an .html→.md mapping (e.g. webview://)

    fetch(mdUrl)
      .then((r) => (r.ok ? r.text() : null))
      .then((src) => {
        if (!src) return;
        const fm = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
        if (!fm) return;
        const cm = fm[1].match(/^\s*class:\s*["']?(.*?)["']?\s*$/m);
        if (!cm) return;
        const deckTokens = cm[1].trim().split(/\s+/).filter(Boolean);
        if (!deckTokens.length) return;
        for (const section of document.querySelectorAll('section')) {
          const cur = section.className.split(/\s+/).filter(Boolean);
          let changed = false;
          for (const t of deckTokens) {
            if (!cur.includes(t)) { cur.push(t); changed = true; }
          }
          if (changed) section.className = cur.join(' ');
        }
      })
      .catch(() => { /* fetch blocked / 404 / sandbox — no-op */ });
  }

  function bootstrap() {
    // Diagnostic breadcrumb. Visible in the host's DevTools console.
    // In VS Code: "Developer: Open Webview Developer Tools" while the Marp
    // preview pane has focus. If you don't see this log at all, the script
    // tag never executed (CSP block, src 404, or HTML filter stripped it).
    if (typeof console !== 'undefined') {
      try {
        const fenceCount = document.querySelectorAll(
          "pre > code.language-mermaid, marp-pre > code.language-mermaid"
        ).length;
        console.log('[lattice-runtime] bootstrap', {
          mermaidLoaded: typeof globalScope.mermaid !== 'undefined',
          mermaidVersion: globalScope.mermaid?.version,
          fenceCount,
          readyState: document.readyState,
          host: location?.href,
        });
      } catch (_) { /* swallow */ }
    }
    // Mark the document so we can verify script execution from the inspector
    // (look for `<html data-lattice-runtime="loaded">`).
    if (document.documentElement) {
      document.documentElement.setAttribute('data-lattice-runtime', 'loaded');
    }

    // Detect whether `window.mermaid` is the real Mermaid library. Some
    // environments (notably the VS Code plain markdown preview, when the
    // `bierner.markdown-mermaid` extension is installed) install a STUB
    // `window.mermaid` that exposes only `renderMermaidBlocksInElement` and
    // lacks `.initialize` / `.render` / `.version`. That stub also tries to
    // render the same `<pre><code class="language-mermaid">` fences using
    // its own bundled mermaid build, which fails on Marp-style frontmatter
    // inside the fence (UnknownDiagramError).
    //
    // Our `<script src="…/mermaid.min.js">` UMD will overwrite that stub
    // unconditionally — but only once it finishes loading. Until then we
    // must keep waiting; using the stub yields TypeError on .initialize.
    const isRealMermaid = (m) =>
      m && typeof m.initialize === 'function' && typeof m.render === 'function';

    // ...existing comment about two distinct waits applies, with one tweak:
    //
    //   1. Waiting for the REAL `window.mermaid` (one with .initialize/.render),
    //      not just any object on the global. ...
    let mermaidWaitFrames = 0;
    let themeWaitFrames = 0;
    const MERMAID_WAIT_CAP = 600;   // ~10s @ 60fps
    const THEME_WAIT_CAP = 30;      // ~500ms @ 60fps

    const tick = () => {
      if (!isRealMermaid(globalScope.mermaid)) {
        if (++mermaidWaitFrames > MERMAID_WAIT_CAP) {
          if (typeof console !== 'undefined') {
            console.warn('[lattice-runtime] real mermaid never loaded; giving up after',
              MERMAID_WAIT_CAP, 'frames. window.mermaid =', globalScope.mermaid,
              '— check that the mermaid <script src> path resolves and that no other extension is shadowing window.mermaid.');
          }
          return;
        }
        requestAnimationFrame(tick);
        return;
      }
      // Mermaid is loaded; now we're just waiting on theme vars.
      if (initAndRun()) {
        if (typeof console !== 'undefined') {
          console.log('[lattice-runtime] init OK after', themeWaitFrames, 'theme-wait frame(s)');
        }
        return;
      }
      if (++themeWaitFrames > THEME_WAIT_CAP) {
        if (typeof console !== 'undefined') {
          console.warn('[lattice-runtime] theme vars never resolved; force-init');
        }
        initAndRun({ force: true });
        return;
      }
      requestAnimationFrame(tick);
    };
    applyDeckClassFromFrontMatter();
    // Run all content transforms immediately so glossary, chart family, and
    // layout slides render without waiting for the Mermaid library to load.
    // tick() calls initAndRun() once Mermaid is ready, which re-runs them
    // (idempotent) alongside Mermaid fence rendering.
    runAllContentTransforms();
    // Mark every Mermaid fence pending immediately. Combined with the CSS rule
    // that hides <pre> for any data-mermaid-state except "error", this prevents
    // raw Mermaid source from being visible during the Mermaid library load and
    // on full webview reloads (where the SVG cache is cold and tick() takes
    // time to fire).
    wrapFences();
    tick();
    startObserver();
    patchSectionGeometry();
    startOverflowWatcher();
  }

  // ── Section geometry injector ─────────────────────────────────────────
  // section { container-type:size } makes section the query container, so
  // cqi on section's OWN properties (padding-top, border-top) cannot resolve
  // against section — they fall back to the ICB.  In PDF print mode the ICB
  // is the @page area (correct).  In VS Code screen mode the ICB is the editor
  // viewport, giving ~103px at 4K instead of the intended 264px.
  // section has container-type:size, so its own cqi properties cannot query
  // themselves (CSS self-reference) and fall back to the ICB. In VS Code screen
  // mode the ICB is the editor viewport, not the slide. Fix: set --_sec-1cqi to
  // section.offsetWidth/100 px (the CSS width before any transform scale —
  // 38.40px for a 3840px 4K slide). lattice.css uses calc(var(--_sec-1cqi,1cqi)*X)
  // for every direct-cqi property on section; the 1cqi fallback fires only in
  // the emulator/print path where @page sets the ICB to the slide size correctly.
  function patchSectionGeometry() {
    if (typeof document === 'undefined') return;
    const patch = (s) => {
      const w = s.offsetWidth;
      if (!w) return;
      s.style.setProperty('--_sec-1cqi', (w / 100).toFixed(3) + 'px');
    };
    for (const s of document.querySelectorAll('section')) patch(s);
    if (typeof MutationObserver !== 'undefined') {
      let raf = 0;
      const schedule = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          for (const s of document.querySelectorAll('section')) patch(s);
        });
      };
      new MutationObserver(schedule).observe(document.body, {
        subtree: true, childList: true, attributes: true,
      });
      if (typeof window !== 'undefined') window.addEventListener('resize', schedule);
    }
  }

  // ── Overflow watcher ─────────────────────────────────────────────────
  // Tags any <section> whose content exceeds the 1280×720 frame with
  // class `overflow`, which lattice.css renders as a loud red inset ring.
  // Re-checks on resize and whenever DOM mutations land (Marp preview
  // re-renders on every keystroke).
  function startOverflowWatcher() {
    if (typeof document === "undefined") return;
    // Sub-pixel rounding from nested flex/grid borders + shadows can push
    // scrollHeight a few px past clientHeight even when content visually
    // fits. 12px filters that noise while still catching genuine overflow
    // (smallest real bug observed in the gallery was a 211px overshoot).
    const TOL = 12;
    const check = () => {
      for (const s of document.querySelectorAll('section')) {
        const over = s.scrollHeight > s.clientHeight + TOL
                  || s.scrollWidth  > s.clientWidth  + TOL;
        s.classList.toggle('overflow', over);
      }
    };
    check();
    if (typeof MutationObserver !== "undefined") {
      let raf = 0;
      const schedule = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; check(); });
      };
      new MutationObserver(schedule).observe(document.body, {
        subtree: true, childList: true, characterData: true, attributes: true,
      });
      if (typeof window !== "undefined") window.addEventListener('resize', schedule);
    }
  }

  // ── function-plot inflater ────────────────────────────────────────────
  // The Marpit plugin (latticeplotFences in marp.config.js) emits
  //   `<div class="latticeplot" data-fp-config="…base64 JSON…"></div>`
  // The emulator path (lattice-emulator.js) injects function-plot.js + an
  // inline inflater into the print HTML. For the VS Code marp-vscode
  // preview, the runtime is what makes it animate: if `window.functionPlot`
  // has been loaded by the preview's script-injection settings, we inflate
  // the placeholder divs here. If not, the divs render as empty boxes —
  // the rest of the slide is unaffected.
  function inflateLatticePlots() {
    if (typeof window === 'undefined' || typeof window.functionPlot !== 'function') return;
    const divs = document.querySelectorAll('div.latticeplot[data-fp-config]');
    divs.forEach((div) => {
      if (div.dataset.fpInflated === '1') return;
      try {
        const cfg = JSON.parse(atob(div.getAttribute('data-fp-config')));
        const rect = div.getBoundingClientRect();
        cfg.target = div;
        cfg.width  = cfg.width  || Math.round(rect.width)  || 480;
        cfg.height = cfg.height || Math.round(rect.height) || 320;
        if (!cfg.tip) cfg.tip = { renderer: ()=> {} };
        window.functionPlot(cfg);
        div.dataset.fpInflated = '1';
      } catch (e) {
        div.textContent = 'latticeplot error: ' + e.message;
        div.classList.add('latticeplot-error');
      }
    });
  }

  if (typeof document === "undefined") return;
  function boot() { bootstrap(); inflateLatticePlots(); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
  // Re-inflate as the preview re-renders slides on edit.
  if (typeof MutationObserver !== 'undefined') {
    let raf = 0;
    new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; inflateLatticePlots(); });
    }).observe(document.body || document.documentElement, { subtree: true, childList: true });
  }
})();
