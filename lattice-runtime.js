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
      // Browsers return `rgba(0, 0, 0, 0)` when the var() is unresolved.
      // Fall through to the raw value so Mermaid sees an empty string
      // rather than a transparent black it would happily accept.
      return c && c !== 'rgba(0, 0, 0, 0)' ? c : v(name);
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
      if (target && target.classList.contains("mermaid")) {
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
      const target = preEl.nextElementSibling && preEl.nextElementSibling.classList.contains("mermaid")
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
          const svg = result && result.svg;
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
    let scan = target ? target.nextElementSibling : preEl.nextElementSibling;
    if (scan && scan.classList.contains("mermaid-error")) errEl = scan;
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
   * Transforms verdict-grid badge items in VS Code preview (no Marp plugin).
   * Finds [x]/[-]/[ ] prefixed li items inside section.verdict-grid, strips
   * the prefix, and wraps the label in <span class="badge pass|warn|fail">.
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
          if (!/^\[/.test(text)) continue;
          const badgeClass = text.startsWith('[x]') ? 'badge pass'
                           : text.startsWith('[-]') ? 'badge warn'
                           : 'badge fail';
          const label = text.replace(/^\[[x\-\s]\]\s*/, '');
          li.innerHTML = `<span class="${badgeClass}">${label}</span>`;
        }
      }
    }
  }

  /**
   * Transforms checklist items in VS Code preview (mirrors the Marp plugin).
   * For each top-level <li> in section.checklist whose text starts with
   * [x] / [-] / [ ], strips the marker and adds class="state pass|warn|fail"
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
        const m = /^\[([x\- ])\]\s*/.exec(firstText.nodeValue);
        if (!m) continue;
        const stateClass = m[1] === 'x' ? 'pass' : m[1] === '-' ? 'warn' : 'fail';
        firstText.nodeValue = firstText.nodeValue.slice(m[0].length);
        li.classList.add('state', stateClass);
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
    const SELECTOR = 'section.compare-prose, section.before-after, section.decision, section.split-brief, section.split-metric, section.split-steps, section.split-compare, section.split-statement';
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
      [...sec.children].filter(el => el !== header).forEach(el => right.appendChild(el));
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
      [...sec.children].filter(el => el !== header).forEach(el => right.appendChild(el));
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
      [...sec.children].filter(el => el !== header).forEach(el => right.appendChild(el));
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
          [...li.childNodes].forEach(n => div.appendChild(n));
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
      [...sec.children].filter(el => el !== header).forEach(el => right.appendChild(el));
      sec.appendChild(left);
      sec.appendChild(right);
    }
  }

  // ── Roadmap modifier transforms ─────────────────────────────────────────
  // Mirror lib/roadmap.js / lattice-emulator.js. Idempotent: each transform
  // checks for the marker class on the section/cell and bails early when it
  // has already run.
  //
  // Sibling implementations (parity contract):
  //   lib/roadmap.js        — HTML-string transform run by marp.config.js render hook
  //   lattice-emulator.js   — per-slide emulator path delegates to lib/roadmap.js
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
          const m = /^\s*\[([x\-\/ ])\]\s*/.exec(text);
          if (!m) continue;
          const state = roadmapMarkerToState(m[1]);
          if (!state) continue;
          const label = ROADMAP_STATE_LABEL[state];
          // Strip the marker from the first text node and wrap the
          // remaining content in a <span class="cell-state-text">.
          const firstText = (function () {
            for (const n of td.childNodes) {
              if (n.nodeType === 3) return n;
              if (n.nodeType === 1) return null;
            }
            return null;
          })();
          if (firstText) {
            firstText.nodeValue = firstText.nodeValue.replace(/^\s*\[[x\-\/ ]\]\s*/, '');
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
        // Lift a trailing <code> into a meta pill — mirrors lib/roadmap.js.
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
    const e = Math.pow(t, opts.sizeCurve);
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
        const trialSize = w.size * Math.pow(WC_SHRINK_FACTOR, retry);
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
   * Journey diagram — runtime mirror of lib/journey.js. Walks each
   * `section.journey` and rewrites its innerHTML in place. The
   * implementation below is a near-verbatim copy of the pure-string
   * parser + emitter in lib/journey.js — that file is canonical; this
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
  // redundant encoding mirror of lib/journey.js (assignActorLabels).
  function jAssignActorLabels(actorNames) {
    const labels = new Map();
    for (const name of actorNames) {
      let chosen = null;
      for (let len = 1; len <= name.length; len++) {
        const prefix = name.slice(0, len).toUpperCase();
        const collides = actorNames.some(function (other) {
          return other !== name && other.slice(0, len).toUpperCase() === prefix;
        });
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
    const actorLabel = jAssignActorLabels(actors.map(function (e) { return e[0]; }));
    const sectionVolumes = model.sections.map(function (s) {
      return s.tasks.reduce(function (sum, t) { return sum + (t.volume == null ? 1 : t.volume); }, 0);
    });
    const legendHtml = actors.map(function (e) {
      const n = e[0], c = e[1];
      const lbl = actorLabel.get(n);
      return '<li class="journey-actor" data-actor="' + jEscAttr(n) + '" style="--actor-color:' + c + '">' +
        '<span class="journey-actor-dot" data-label-len="' + lbl.length + '" aria-hidden="true">' + jEscHtml(lbl) + '</span>' +
        '<span class="journey-actor-name">' + jEscHtml(n) + '</span>' +
      '</li>';
    }).join('');
    const moodLegendHtml = (
      '<li class="journey-mood-key journey-mood-key-low">Pain</li>' +
      [1, 2, 3, 4, 5].map(function (m) {
        return '<li class="journey-mood-key" data-mood="' + m + '">' +
                 '<span class="journey-mood-key-swatch" aria-hidden="true"></span>' +
                 '<span class="journey-mood-key-label">' + m + '</span>' +
               '</li>';
      }).join('') +
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
        const dots = t.actors.map(function (a) {
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
    const gridLines = [0, 1, 2, 3, 4].map(function (y) {
      return '<line class="journey-curve-grid" x1="0" y1="' + y + '" x2="' + taskCount + '" y2="' + y + '" ' +
             'stroke="currentColor" stroke-width="1" stroke-dasharray="3 4" ' +
             'vector-effect="non-scaling-stroke"/>';
    }).join('');
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
      const target = preEl.nextElementSibling &&
        preEl.nextElementSibling.classList.contains("mermaid")
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
          const codeEl = m.target && m.target.parentElement;
          if (!isOwnedCode(codeEl)) continue;
          // Source changed in a fence we own — invalidate the cached render
          // so initAndRun picks it up again. Reset state and clear the SVG
          // sibling; wrapFences will reuse the empty sibling next pass.
          const preEl = codeEl.parentElement;
          if (!preEl) continue;
          delete preEl.dataset.mermaidState;
          const sib = preEl.nextElementSibling;
          if (sib && sib.classList.contains("mermaid")) sib.innerHTML = "";
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
    if (!root || !root.querySelectorAll) return;
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
        const defLi = nested && nested.querySelector(':scope > li');
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
    if (!root || !root.querySelectorAll) return;
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
  const CHART_LAYOUTS = ['progress', 'timeline-list', 'piechart', 'gantt', 'kanban'];
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
    else return;

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
    if (!root || !root.querySelectorAll) return;
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
          mermaidVersion: globalScope.mermaid && globalScope.mermaid.version,
          fenceCount,
          readyState: document.readyState,
          host: location && location.href,
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
  // Fix: inject concrete px values via CSS variables --_sec-pad-v and
  // --_sec-border-w, keyed off section.offsetWidth (which returns the CSS
  // width before any transform scale, i.e. 3840 for 4K slides in VS Code).
  // lattice.css consumes these as var(--_sec-pad-v, 6.875cqi) — the cqi
  // fallback still fires in the PDF emulator path where the variables are
  // not set, and the @page ICB resolves them correctly there.
  function patchSectionGeometry() {
    if (typeof document === 'undefined') return;
    const patch = (s) => {
      const w = s.offsetWidth;
      if (!w) return;
      s.style.setProperty('--_sec-pad-v',    (w * 6.875  / 100).toFixed(2) + 'px');
      s.style.setProperty('--_sec-pad-h',    (w * 5      / 100).toFixed(2) + 'px');
      s.style.setProperty('--_sec-border-w', (w * 0.3125 / 100).toFixed(2) + 'px');
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

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
