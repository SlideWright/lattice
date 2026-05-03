/**
 * Marpit plugin: numbers each `.split-panel` slide at build time and writes
 * `data-split-panel-n="01"` onto the section. The theme reads it with
 * `content: attr(data-split-panel-n)` — same mechanism Marp uses for native
 * pagination (`data-marpit-pagination`), which is why it survives per-slide
 * image export while CSS counters do not.
 */
function splitPanelCounter(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "split_panel_counter", (state) => {
    let n = 0;
    for (const token of state.tokens) {
      if (token.type !== "marpit_slide_open") continue;
      const klass = token.attrGet("class") || "";
      if (!/\bsplit-panel\b/.test(klass)) continue;
      n += 1;
      token.attrSet("data-split-panel-n", String(n).padStart(2, "0"));
    }
  });
}

/**
 * Marpit plugin: wraps ✓/✗ nested list items inside `.verdict-grid` sections
 * in <span class="badge pass/fail"> so the existing .badge CSS colors them.
 * Only fires for list items at depth ≥ 2 (nested badge items, not the card title
 * or the body text line at the end). Body text does not start with ✓/✗ so it
 * passes through untouched.
 */
function verdictGridBadges(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "verdict_grid_badges", (state) => {
    let inVerdictGrid = false;
    let listDepth = 0;
    for (const token of state.tokens) {
      if (token.type === "marpit_slide_open") {
        inVerdictGrid = (token.attrGet("class") || "").includes("verdict-grid");
        listDepth = 0;
        continue;
      }
      if (token.type === "marpit_slide_close") { inVerdictGrid = false; continue; }
      if (!inVerdictGrid) continue;
      if (token.type === "bullet_list_open" || token.type === "ordered_list_open") { listDepth++; continue; }
      if (token.type === "bullet_list_close" || token.type === "ordered_list_close") { listDepth--; continue; }
      if (token.type !== "inline" || listDepth < 2 || !token.children) continue;
      const text = token.children.map(c => c.content || "").join("").trim();
      if (!/^\[/.test(text)) continue; // body text item — skip
      const badgeClass = text.startsWith("[x]") ? "badge pass" : text.startsWith("[~]") ? "badge warn" : "badge fail";
      const label = text.replace(/^\[[x~\s]\]\s*/, "");
      const htmlToken = new (token.children[0].constructor)("html_inline", "", 0);
      htmlToken.content = `<span class="${badgeClass}">${label}</span>`;
      token.children = [htmlToken];
    }
  });
}

const mermaidLanguage = require("./lib/mermaid-hljs");

/**
 * Teach marp-core's bundled highlight.js about Mermaid syntax so fenced
 * ```mermaid blocks get hljs token spans at SSR time. The default
 * `marp.highlighter` returns the empty string for unknown languages, which
 * caused mermaid sources to render as raw plaintext when the runtime fails
 * (or has not yet been able to render) the diagram. Once the language is
 * registered, marp's existing highlighter logic picks it up automatically
 * via `hljs.getLanguage('mermaid')`.
 *
 * Idempotent: re-running the engine hook is a no-op because hljs throws on
 * duplicate registrations and we suppress it.
 */
function registerMermaidHljs(marp) {
  try {
    if (!marp.highlightjs.getLanguage("mermaid")) {
      marp.highlightjs.registerLanguage("mermaid", mermaidLanguage);
    }
  } catch (_e) { /* already registered */ }
}

/** @type {import('@marp-team/marp-cli').MarpCLIConfig} */
module.exports = {
  themeSet: [
    "lattice.css",
    "themes/indaco.css",
    "themes/cuoio.css",
  ],
  html: true,
  allowLocalFiles: true,
  imageScale: 3,
  engine: ({ marp }) => {
    registerMermaidHljs(marp);
    return marp.use(splitPanelCounter).use(verdictGridBadges);
  },
};
