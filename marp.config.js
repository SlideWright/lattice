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

/**
 * Marpit plugin: on a `checklist` slide, transforms each top-level list item
 * whose text begins with `[x]`, `[~]`, or `[ ]` into:
 *
 *   <li class="state pass|warn|pending">label</li>
 *
 * The marker is stripped from the rendered text; CSS draws the state glyph
 * (✓ / ~ / ☐) as a `::before` pseudo. Trailing `_italic_` annotations are
 * preserved untouched. Items without a marker pass through unchanged.
 */
function checklistItemStates(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "checklist_item_states", (state) => {
    let inChecklist = false;
    let listDepth = 0;
    let pendingItemOpen = null;
    for (const token of state.tokens) {
      if (token.type === "marpit_slide_open") {
        inChecklist = /\bchecklist\b/.test(token.attrGet("class") || "");
        listDepth = 0;
        pendingItemOpen = null;
        continue;
      }
      if (token.type === "marpit_slide_close") { inChecklist = false; continue; }
      if (!inChecklist) continue;
      if (token.type === "bullet_list_open" || token.type === "ordered_list_open") { listDepth++; continue; }
      if (token.type === "bullet_list_close" || token.type === "ordered_list_close") { listDepth--; continue; }
      if (token.type === "list_item_open" && listDepth === 1) { pendingItemOpen = token; continue; }
      if (token.type !== "inline" || !pendingItemOpen || !token.children) continue;
      // Find the first text child and inspect its leading marker.
      const textChild = token.children.find((c) => c.type === "text");
      if (!textChild) { pendingItemOpen = null; continue; }
      const m = /^\[([x~ ])\]\s*/.exec(textChild.content);
      if (!m) { pendingItemOpen = null; continue; }
      const stateClass = m[1] === "x" ? "state pass" : m[1] === "~" ? "state warn" : "state fail";
      // Append to existing class on the <li> (Marpit/markdown-it: attrJoin).
      const cur = pendingItemOpen.attrGet("class");
      pendingItemOpen.attrSet("class", cur ? `${cur} ${stateClass}` : stateClass);
      textChild.content = textChild.content.slice(m[0].length);
      // Trailing-em → right-aligned row pill. Locate a trailing
      //   [text? em_open inline-text em_close text?(whitespace only)]
      // run at the end of the inline children, strip an optional preceding
      // em-dash / hyphen separator from the text node before em_open, and
      // wrap the em in `<span class="row-pill">…</span>` via html_inline
      // tokens. Mid-sentence ems are left untouched.
      const kids = token.children;
      let endIdx = kids.length - 1;
      // skip a trailing whitespace-only text node, if any
      if (endIdx >= 0 && kids[endIdx].type === "text" && /^\s*$/.test(kids[endIdx].content)) endIdx--;
      if (endIdx >= 2 && kids[endIdx].type === "em_close") {
        // walk back to the matching em_open at the same depth
        let depth = 1, openIdx = endIdx - 1;
        while (openIdx > 0 && depth > 0) {
          if (kids[openIdx].type === "em_close") depth++;
          else if (kids[openIdx].type === "em_open") { depth--; if (depth === 0) break; }
          openIdx--;
        }
        if (openIdx > 0 && kids[openIdx].type === "em_open") {
          // strip a trailing separator (em-dash, en-dash, hyphen runs) from
          // the text node directly before em_open
          const prev = kids[openIdx - 1];
          if (prev && prev.type === "text") {
            prev.content = prev.content.replace(/\s*[—–-]+\s*$/, "");
          }
          const openSpan = new state.Token("html_inline", "", 0);
          openSpan.content = '<span class="row-pill">';
          const closeSpan = new state.Token("html_inline", "", 0);
          closeSpan.content = "</span>";
          // insert openSpan before em_open and closeSpan after em_close
          kids.splice(endIdx + 1, 0, closeSpan);
          kids.splice(openIdx, 0, openSpan);
        }
      }
      pendingItemOpen = null;
    }
  });
}

const mermaidLanguage = require("./lib/mermaid-hljs");

/**
 * Marpit plugin: on a `glossary` slide, transforms a top-level 2-level
 * nested bullet list:
 *
 *   - Term
 *     - Definition
 *
 * into a 2-column glossary table with the term auto-bolded. Lets authors
 * write glossaries as nested bullets rather than markdown tables. Runs
 * before `glossaryRange` so the pill logic finds the generated <td> cells.
 */
function glossaryListToTable(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "glossary_list_to_table", (state) => {
    const tokens = state.tokens;
    let inGlossary = false;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === "marpit_slide_open") {
        const cls = t.attrGet("class") || "";
        inGlossary = /\bglossary\b/.test(cls);
        continue;
      }
      if (t.type === "marpit_slide_close") { inGlossary = false; continue; }
      if (!inGlossary) continue;
      if (t.type !== "bullet_list_open") continue;
      // Find matching bullet_list_close at the same depth.
      let depth = 1, end = -1;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === "bullet_list_open") depth++;
        else if (tokens[j].type === "bullet_list_close") { depth--; if (depth === 0) { end = j; break; } }
      }
      if (end < 0) continue;
      // Walk top-level list_item children to build (term, def) rows.
      const rows = [];
      let liDepth = 0;
      let term = "", def = "";
      let captureTo = null; // 'term' | 'def'
      for (let j = i + 1; j < end; j++) {
        const tk = tokens[j];
        if (tk.type === "list_item_open") {
          liDepth++;
          if (liDepth === 1) { term = ""; def = ""; captureTo = "term"; }
        } else if (tk.type === "list_item_close") {
          if (liDepth === 1) {
            const termHtml = /^<(?:strong|b)\b/.test(term) ? term : `<strong>${term}</strong>`;
            rows.push(`<tr><td>${termHtml}</td><td>${def}</td></tr>`);
          }
          liDepth--;
        } else if (tk.type === "bullet_list_open" && liDepth === 1) {
          captureTo = "def";
        } else if (tk.type === "inline") {
          const html = markdown.renderer.renderInline(tk.children, markdown.options, state.env);
          if (captureTo === "term" && liDepth === 1 && !term) {
            term = html;
            captureTo = null;
          } else if (captureTo === "def" && liDepth === 2 && !def) {
            def = html;
          }
        }
      }
      if (!rows.length) continue;
      // Replace tokens [i..end] with one html_block.
      const Ctor = t.constructor;
      const repl = new Ctor("html_block", "", 0);
      repl.content = `<table><thead><tr><th>Term</th><th>Definition</th></tr></thead><tbody>\n${rows.join("\n")}\n</tbody></table>\n`;
      repl.block = true;
      tokens.splice(i, end - i + 1, repl);
      // Continue scanning from i+1 (replacement is a single token).
    }
  });
}

/**
 * Marpit plugin: on a `glossary` slide, appends a pill to the
 * h2 spanning the alphabetic range of the table — e.g. the h2 `Glossary`
 * becomes `Glossary <span class="range-pill">A – G</span>`. The first and
 * last visible characters of the table's first-column cells are read at
 * parse time, so reordering or moving entries cannot desync the header.
 * Runs in both the build pipeline and VS Code's Marp preview.
 */
function glossaryRange(markdown) {
  markdown.core.ruler.after("glossary_list_to_table", "glossary_range", (state) => {
    let inGlossary = false;
    let h2InlineToken = null;
    let firstTermChar = null;
    let lastTermChar = null;
    let captureNextInline = false;
    // We've already converted the bullet list to an html_block by the time
    // this ruler runs — read first/last term out of the table HTML directly.
    for (const token of state.tokens) {
      if (token.type === "marpit_slide_open") {
        const cls = token.attrGet("class") || "";
        inGlossary = /\bglossary\b/.test(cls);
        h2InlineToken = null;
        firstTermChar = null;
        lastTermChar = null;
        captureNextInline = false;
        continue;
      }
      if (!inGlossary) continue;
      if (token.type === "marpit_slide_close") {
        if (h2InlineToken && firstTermChar) {
          const range = firstTermChar === lastTermChar
            ? firstTermChar
            : `${firstTermChar} – ${lastTermChar || firstTermChar}`;
          const Ctor = (h2InlineToken.children && h2InlineToken.children[0])
            ? h2InlineToken.children[0].constructor
            : null;
          if (Ctor) {
            const space = new Ctor("text", "", 0); space.content = " ";
            const pill = new Ctor("html_inline", "", 0);
            pill.content = `<span class="range-pill">${range}</span>`;
            h2InlineToken.children = [...(h2InlineToken.children || []), space, pill];
          }
        }
        inGlossary = false;
        continue;
      }
      if (token.type === "heading_open" && token.tag === "h2") {
        captureNextInline = "h2";
        continue;
      }
      if (captureNextInline === "h2" && token.type === "inline") {
        if (!h2InlineToken) h2InlineToken = token;
        captureNextInline = false;
        continue;
      }
      // Read the table HTML (from glossary_list_to_table) or from a literal
      // markdown table token sequence. We take the easy path for the
      // html_block produced by our transform; for raw token tables we
      // walk tbody tds the same way as before.
      if (token.type === "html_block" && /<table>/.test(token.content)) {
        const tbody = token.content.match(/<tbody>([\s\S]*?)<\/tbody>/);
        if (tbody) {
          const rows = [...tbody[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
          if (rows.length) {
            const fc = rows[0][1].match(/<td>([\s\S]*?)<\/td>/);
            const lc = rows[rows.length - 1][1].match(/<td>([\s\S]*?)<\/td>/);
            const firstChar = (s) => (s.replace(/<[^>]+>/g, "").trim()[0] || "").toUpperCase();
            if (fc) firstTermChar = firstChar(fc[1]);
            if (lc) lastTermChar = firstChar(lc[1]);
          }
        }
      }
    }
  });
}

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
    return marp.use(splitPanelCounter).use(verdictGridBadges).use(checklistItemStates).use(glossaryListToTable).use(glossaryRange);
  },
};
