/**
 * Marpit plugin: deck-wide `class:` propagation.
 *
 * Marpit's native directive spec is "spot replaces global": a slide with
 * `<!-- _class: foo -->` discards the deck-wide `class:` value entirely,
 * which makes deck-wide modifiers (e.g. `class: dark` in front matter)
 * useless on layout-heavy decks where every slide carries a layout
 * `_class:` directive of its own.
 *
 * This plugin overrides that semantic for the deck-wide direction: it
 * reads the YAML front-matter `class:` line directly from the source,
 * splits it into tokens, and APPENDS any token that isn't already on
 * each section. Per-slide `_class:` still wins for tokens it declares
 * (Marpit set them first); deck-wide tokens are merged in after, so
 * `class: dark` + `_class: title` becomes `class="title dark"`.
 *
 * Mirrored by lattice-emulator.js's front-matter parser so both render
 * paths produce identical class lists.
 */
function deckClassPropagate(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "deck_class_propagate", (state) => {
    // Read the front-matter block straight from source; the global
    // `class:` value isn't preserved on tokens once Marpit has applied it.
    const src = (state.env && (state.env.markdown || state.env.source)) || state.src || "";
    const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!fmMatch) return;
    const cm = fmMatch[1].match(/^\s*class:\s*["']?(.*?)["']?\s*$/m);
    if (!cm) return;
    const deckTokens = cm[1].trim().split(/\s+/).filter(Boolean);
    if (!deckTokens.length) return;

    for (const token of state.tokens) {
      if (token.type !== "marpit_slide_open") continue;
      const cur = (token.attrGet("class") || "").split(/\s+/).filter(Boolean);
      for (const t of deckTokens) {
        if (!cur.includes(t)) cur.push(t);
      }
      token.attrSet("class", cur.join(" "));
    }
  });
}

/**
 * Front-matter reader for the convenience `logo:` directive. Shared by
 * the `deckLogo` Marpit plugin (token-level class injection) and the
 * `applyDeckLogoStyleToCss` HTML-stage helper (CSS injection). Returns
 * `{ logo, style, on, brand }` or `null` when no logo is configured.
 *
 * Recognised front-matter keys:
 *   logo:        path to the image (required to activate)
 *   logo-style:  `auto` (default) | `brand` | `mono` (alias of auto)
 *   logo-on:     `all` (default) | `title`
 *
 * Mirrored by lattice-emulator.js's front-matter parser so both render
 * paths produce identical classes and the same --deck-logo value.
 */
function readDeckLogoFrontMatter(src) {
  if (typeof src !== "string" || !src.length) return null;
  const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const logoMatch = fm.match(/^\s*logo:\s*["']?(.*?)["']?\s*$/m);
  if (!logoMatch) return null;
  const logo = logoMatch[1].trim();
  if (!logo) return null;
  const styleMatch = fm.match(/^\s*logo-style:\s*["']?(.*?)["']?\s*$/m);
  const onMatch    = fm.match(/^\s*logo-on:\s*["']?(.*?)["']?\s*$/m);
  const style = styleMatch ? styleMatch[1].trim().toLowerCase() : "auto";
  const on    = onMatch ? onMatch[1].trim().toLowerCase() : "all";
  return {
    logo,
    style,
    on: on === "title" ? "title" : "all",
    brand: style === "brand",
  };
}

/**
 * HTML-stage helper: convenience `logo:` front-matter directive.
 *
 * Injects `<img class="deck-logo" src="..." alt="" aria-hidden="true">`
 * as the first child of every `<section>` selected by the `logo-on`
 * rule. The img carries an inline `style="--deck-logo-src:url('...')"`
 * so the CSS rule in lib/base/base.modifiers.css can paint it as a
 * silhouette via mask-image at watermark opacity. When `logo-style:
 * brand` is set, the `deck-logo-brand` class is added alongside.
 *
 * Real DOM injection (rather than a `::before` pseudo) is what lets
 * the logo compose with `::before`-based decorations like
 * `bg-orbit-br`, `bg-asterisk-scatter`, `bg-grid-micro`, etc.
 * Each chrome rule paints on its own render layer.
 *
 * Sibling: lattice-emulator.js requires this same function and calls
 * it on its assembled HTML so both renderers produce identical DOM.
 *
 * This is a build-time only convenience. The marp-vscode preview pane
 * does NOT load workspace marp.config.js plugins, so the logo does
 * not appear there. Same limitation
 * lattice-runtime.js's applyDeckClassFromFrontMatter documents at
 * lines 3399-3401. See docs/references/gotchas.md.
 */
function applyDeckLogoToHtml(html, markdown) {
  const cfg = readDeckLogoFrontMatter(markdown);
  if (!cfg) return html;
  const htmlEscape = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // CSS-escape for inside a `url("...")` CSS string: backslashes first,
  // then quotes (so quote-escapes aren't doubled by the backslash pass).
  // Then HTML-encode for the surrounding style attribute context so the
  // raw value can't break out of the attribute.
  const cssEscape = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const safeSrc = htmlEscape(cfg.logo);
  const safeCssSrc = htmlEscape(cssEscape(cfg.logo));
  const classes = `deck-logo${cfg.brand ? ' deck-logo-brand' : ''}`;
  const img = `<img class="${classes}" src="${safeSrc}" alt="" aria-hidden="true" style="--deck-logo-src:url(&quot;${safeCssSrc}&quot;)">`;
  let firstSeen = false;
  // Match Marp-emitted section opens only — they all carry
  // `data-marpit-slide="N"`. The qualifier prevents the rewriter from
  // touching literal `<section>` text that authors write inside code
  // blocks, where HTML parses the tag as a real nested section element.
  return html.replace(/<section\b([^>]*\bdata-marpit-slide="[^"]*"[^>]*)>/g, (match, attrs) => {
    const c = attrs.match(/\sclass="([^"]*)"/);
    const cls = c ? c[1].split(/\s+/).filter(Boolean) : [];
    const isTitle = cls.includes('title');
    const isFirst = !firstSeen;
    firstSeen = true;
    if (cfg.on !== 'all' && !isFirst && !isTitle) return match;
    return `${match}${img}`;
  });
}

/**
 * Marpit plugin: numbers each `.split-list` slide at build time and writes
 * `data-split-list-n="01"` onto the section. The theme reads it with
 * `content: attr(data-split-list-n)` — same mechanism Marp uses for native
 * pagination (`data-marpit-pagination`), which is why it survives per-slide
 * image export while CSS counters do not.
 */
function splitPanelCounter(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "split_panel_counter", (state) => {
    let n = 0;
    for (const token of state.tokens) {
      if (token.type !== "marpit_slide_open") continue;
      const klass = token.attrGet("class") || "";
      if (!/\bsplit-list\b/.test(klass)) continue;
      n += 1;
      token.attrSet("data-split-list-n", String(n).padStart(2, "0"));
    }
  });
}

/**
 * Universal state-token marker decoder — shared by verdictGridBadges,
 * obligationMatrixBadges, and checklistItemStates. Maps a single-char
 * marker to the semantic + shape classes that the universal CSS recipe
 * paints. Sibling implementations in lattice-emulator.js and
 * lattice-runtime.js must stay in sync (cross-renderer parity).
 *
 *   [x] → pass + state-full     (filled disc)
 *   [-] → warn + state-half     (half-filled disc)
 *   [ ] → fail + state-empty    (outline disc)
 *   [/] → skip + state-slashed  (filled disc + diagonal slash)
 */
function stateClassesFor(marker) {
  if (marker === "x") return { sem: "pass", shape: "state-full" };
  if (marker === "-") return { sem: "warn", shape: "state-half" };
  if (marker === "/") return { sem: "skip", shape: "state-slashed" };
  return { sem: "fail", shape: "state-empty" };
}

/**
 * Marpit plugin: wraps [x]/[-]/[ ]/[/] nested list items inside
 * `.verdict-grid` sections in `<span class="badge {sem} {shape}">` so
 * the universal state-token CSS paints the badge glyph. Only fires for
 * list items at depth ≥ 2 (nested badge items, not the card title or
 * the body text line at the end). Body text does not start with `[`
 * so it passes through untouched.
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
      const m = /^\[([x\-/ ])\]\s*(.*)$/.exec(text);
      if (!m) continue;
      const { sem, shape } = stateClassesFor(m[1]);
      const htmlToken = new (token.children[0].constructor)("html_inline", "", 0);
      htmlToken.content = `<span class="badge ${sem} ${shape}">${m[2]}</span>`;
      token.children = [htmlToken];
    }
  });
}

/**
 * Marpit plugin: on `obligation-matrix` slides, wraps `[x]/[-]/[ ]/[/]`
 * text inside <td> cells in `<span class="state {sem} {shape}">…</span>`.
 * Mirrors verdictGridBadges and checklistItemStates but operates on
 * table cells. The bracket marker is stripped — CSS draws the universal
 * state token (coloured disc + shape class). Any trailing label after
 * the marker is preserved as the span's text content (and hidden via
 * font-size:0 by the layout chrome — the visual is the disc).
 */
function obligationMatrixBadges(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "obligation_matrix_badges", (state) => {
    let inMatrix = false;
    let inTd = false;
    for (const token of state.tokens) {
      if (token.type === "marpit_slide_open") {
        inMatrix = /\bobligation-matrix\b/.test(token.attrGet("class") || "");
        inTd = false;
        continue;
      }
      if (token.type === "marpit_slide_close") { inMatrix = false; continue; }
      if (!inMatrix) continue;
      if (token.type === "td_open") { inTd = true; continue; }
      if (token.type === "td_close") { inTd = false; continue; }
      if (token.type !== "inline" || !inTd || !token.children) continue;
      const text = token.children.map(c => c.content || "").join("").trim();
      const m = /^\[([x\-/ ])\]\s*(.*)$/.exec(text);
      if (!m) continue;
      const { sem, shape } = stateClassesFor(m[1]);
      const htmlToken = new (token.children[0].constructor)("html_inline", "", 0);
      htmlToken.content = `<span class="state ${sem} ${shape}">${m[2]}</span>`;
      token.children = [htmlToken];
    }
  });
}

/**
 * Marpit plugin: on a `checklist` slide, transforms each top-level list item
 * whose text begins with `[x]/[-]/[ ]/[/]` into:
 *
 *   <li class="state {pass|warn|fail|skip} {state-full|state-half|state-empty|state-slashed}">label</li>
 *
 * The marker is stripped from the rendered text; CSS draws the universal
 * state token via `::before` (no font dependency). Trailing `_italic_`
 * annotations are preserved untouched. Items without a marker pass
 * through unchanged.
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
      const m = /^\[([x\-/ ])\]\s*/.exec(textChild.content);
      if (!m) { pendingItemOpen = null; continue; }
      const { sem, shape } = stateClassesFor(m[1]);
      const stateClass = `state ${sem} ${shape}`;
      // Append to existing class on the <li> (Marpit/markdown-it: attrJoin).
      const cur = pendingItemOpen.attrGet("class");
      pendingItemOpen.attrSet("class", cur ? `${cur} ${stateClass}` : stateClass);
      textChild.content = textChild.content.slice(m[0].length);
      // CSS handles the trailing-`code` pill (universal pill convention,
      // shared with cards-grid, cards-side, actors). No token surgery.
      pendingItemOpen = null;
    }
  });
}

/**
 * Marpit plugin: on `compare-prose`, `before-after`, and `decision` slides,
 * wraps the lead inline content of each top-level <li> in <strong> so the
 * labeled corner-tag CSS (`> strong:first-child`) fires without authors
 * writing `**Label**` in source. Mirrors the same lift in
 * lattice-emulator.js, so Marp CLI build, Marp VS Code preview, and the
 * emulator pipeline all produce the same DOM.
 *
 * Idempotent: skips items whose first inline child is already `strong_open`.
 */
function slotLabelLift(markdown) {
  const SLOT_LAYOUTS = /\b(compare-prose|before-after|decision|split-brief|split-metric|split-steps|split-compare|split-statement|statute-stack|regulatory-update|authority-chain|redline)\b/;
  markdown.core.ruler.after("marpit_slide_containers", "slot_label_lift", (state) => {
    let active = false;
    let listDepth = 0;
    let pendingLi = false;
    for (const token of state.tokens) {
      if (token.type === "marpit_slide_open") {
        active = SLOT_LAYOUTS.test(token.attrGet("class") || "");
        listDepth = 0;
        pendingLi = false;
        continue;
      }
      if (token.type === "marpit_slide_close") { active = false; continue; }
      if (!active) continue;
      if (token.type === "bullet_list_open" || token.type === "ordered_list_open") { listDepth++; continue; }
      if (token.type === "bullet_list_close" || token.type === "ordered_list_close") { listDepth--; continue; }
      if (token.type === "list_item_open" && listDepth === 1) { pendingLi = true; continue; }
      if (token.type !== "inline" || !pendingLi || !token.children || !token.children.length) continue;
      pendingLi = false;
      // Idempotent: leave existing `**Label**` lead alone.
      if (token.children[0].type === "strong_open") continue;
      const Ctor = token.children[0].constructor;
      const open = new Ctor("strong_open", "strong", 1);
      const close = new Ctor("strong_close", "strong", -1);
      token.children = [open, ...token.children, close];
    }
  });
}

/**
 * Marpit plugin: on a `no-period` slide, strips any trailing
 * period (and optional trailing whitespace) from every heading token.
 * Authors opt in deck-wide via `class: no-period` in front
 * matter. Mirrors the `sp` helper in lattice-emulator.js and the
 * `transformStripHeadingPeriods` function in lattice-runtime.js.
 */
function stripHeadingPeriods(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "strip_heading_periods", (state) => {
    let active = false;
    let pendingInline = false;
    for (const token of state.tokens) {
      if (token.type === "marpit_slide_open") {
        active = /\bno-period\b/.test(token.attrGet("class") || "");
        pendingInline = false;
        continue;
      }
      if (token.type === "marpit_slide_close") { active = false; continue; }
      if (!active) continue;
      if (token.type === "heading_open")  { pendingInline = true;  continue; }
      if (token.type === "heading_close") { pendingInline = false; continue; }
      if (token.type !== "inline" || !pendingInline || !token.children) continue;
      for (let i = token.children.length - 1; i >= 0; i--) {
        if (token.children[i].type === "text") {
          token.children[i].content = token.children[i].content.replace(/\.\s*$/, "");
          break;
        }
      }
    }
  });
}

/**
 * Marpit plugin: on an `with-period` slide, appends a period to any
 * heading that does not already end with terminal punctuation (.!?:…).
 * Authors opt in deck-wide via `class: with-period` in front matter.
 * Mirrors the `ap` helper in lattice-emulator.js and the
 * `transformAddHeadingPeriods` function in lattice-runtime.js.
 */
function addHeadingPeriods(markdown) {
  markdown.core.ruler.after("marpit_slide_containers", "add_heading_periods", (state) => {
    let active = false;
    let pendingInline = false;
    for (const token of state.tokens) {
      if (token.type === "marpit_slide_open") {
        active = /\bwith-period\b/.test(token.attrGet("class") || "");
        pendingInline = false;
        continue;
      }
      if (token.type === "marpit_slide_close") { active = false; continue; }
      if (!active) continue;
      if (token.type === "heading_open")  { pendingInline = true;  continue; }
      if (token.type === "heading_close") { pendingInline = false; continue; }
      if (token.type !== "inline" || !pendingInline || !token.children) continue;
      for (let i = token.children.length - 1; i >= 0; i--) {
        if (token.children[i].type === "text") {
          const c = token.children[i].content;
          if (!/[.!?:…]$/.test(c)) token.children[i].content = c + ".";
          break;
        }
      }
    }
  });
}

const mermaidLanguage = require("./lib/integrations/mermaid/mermaid.hljs");

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
          const Ctor = (h2InlineToken.children?.[0])
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

const { applyToRenderedHtml: applyChartFamilyToHtml } = require('./lib/chart-family/chart-family');
const { applyToRenderedHtml: applySplitPanelsToHtml } = require('./lib/engine/split-panels');
const { applyToRenderedHtml: applyRoadmapToHtml }     = require('./lib/components/roadmap/roadmap.transform');
const { applyToRenderedHtml: applyJourneyToHtml }     = require('./lib/components/journey/journey.transform');
const { applyToRenderedHtml: applyWordCloudToHtml }   = require('./lib/components/word-cloud/word-cloud.transform');

/**
 * latticeplotFences — rewrites ```latticeplot fenced code blocks into a
 * `<div class="latticeplot" data-fp-config="…base64 JSON…"></div>` placeholder.
 * The vendored function-plot UMD bundle (loaded via the runtime / emulator
 * head) inflates each placeholder into an inline SVG. Mirrors the
 * `lang === 'latticeplot'` branch in lattice-emulator.js's fence handler;
 * keep the two in step.
 */
function latticeplotFences(md) {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = (token.info || '').trim();
    if (info === 'latticeplot') {
      const cfg64 = Buffer.from(token.content, 'utf8').toString('base64');
      return `<div class="latticeplot" data-fp-config="${cfg64}"></div>\n`;
    }
    return defaultFence ? defaultFence(tokens, idx, options, env, self)
                        : self.renderToken(tokens, idx, options);
  };
}
// Radar is a chart-family member — its dispatch rides
// applyChartFamilyToHtml above; lib/radar.js is the parsing + geometry
// kernel that chart-family delegates to.

/** @type {import('@marp-team/marp-cli').MarpCLIConfig} */
module.exports = {
  themeSet: [
    "lattice.css",
    "themes/indaco.css",
    "themes/indaco-dark.css",
    "themes/cuoio.css",
    "themes/cuoio-dark.css",
  ],
  html: true,
  allowLocalFiles: true,
  imageScale: 1,
  // Math support — KaTeX is the Marp default; we set it explicitly so the
  // contract is visible in config. KaTeX renders synchronously to HTML+CSS,
  // which is critical under the headless-Chromium PDF path (MathJax's async
  // reflow has caused PDF race conditions in the past). The emulator path
  // (lattice-emulator.js) calls katex.renderToString() at slide-parse time
  // and injects the same katex.min.css into the HTML head — see the math
  // extractor near the top of that file for the parity contract.
  math: 'katex',
  engine: ({ marp }) => {
    registerMermaidHljs(marp);
    marp.use(deckClassPropagate)
        .use(splitPanelCounter)
        .use(verdictGridBadges)
        .use(obligationMatrixBadges)
        .use(checklistItemStates)
        .use(slotLabelLift)
        .use(glossaryListToTable)
        .use(glossaryRange)
        .use(stripHeadingPeriods)
        .use(addHeadingPeriods)
        .use(latticeplotFences);

    // Wrap render() so chart-family slides are rewritten into the
    // chart-frame skeleton in the rendered HTML — same DOM the export
    // pipeline produces. Marp Core / Marpit's render returns
    // { html, css, comments } (or similar). VS Code's marp-vscode
    // extension calls render() through the same engine, so the preview
    // and the export now go through one transform.
    const originalRender = marp.render.bind(marp);
    marp.render = (markdown, env) => {
      const result = originalRender(markdown, env);
      if (result && typeof result.html === 'string') {
        result.html = applyChartFamilyToHtml(result.html);
        result.html = applySplitPanelsToHtml(result.html);
        result.html = applyRoadmapToHtml(result.html);
        result.html = applyJourneyToHtml(result.html);
        result.html = applyWordCloudToHtml(result.html);
        result.html = applyDeckLogoToHtml(result.html, markdown);
      }
      return result;
    };

    return marp;
  },
};

// Plugin functions exposed for unit tests. Marp-cli reads only the
// known config keys above and ignores the rest, so attaching this is
// safe; consumers should treat it as test-internal API.
module.exports.plugins = {
  deckClassPropagate,
  applyDeckLogoToHtml,
  readDeckLogoFrontMatter,
  splitPanelCounter,
  verdictGridBadges,
  obligationMatrixBadges,
  checklistItemStates,
  slotLabelLift,
  latticeplotFences,
  glossaryListToTable,
  glossaryRange,
  stripHeadingPeriods,
  addHeadingPeriods,
};
