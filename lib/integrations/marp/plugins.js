/**
 * Marpit / marp-core engine plugins — the markdown-it token transforms and
 * HTML-stage helpers that give Lattice components their structure (verdict-grid
 * badges, checklist state discs, obligation-matrix cells, slot-label bolding,
 * glossary tables, heading-period adjustment, deck-wide
 * class propagation, the `logo:` convenience directive, and latticeplot fences).
 *
 * These were originally inlined in marp.config.js (the marp-cli build path).
 * They are pure markdown-it/Marpit token manipulators with no Node-only
 * dependencies, so they are extracted here as the SINGLE SOURCE OF TRUTH shared
 * by two consumers:
 *
 *   1. marp.config.js          — the marp-cli build path (`.use()`s them in engine()).
 *   2. lib/playground/index.js — the browser playground bundle, which runs the
 *                                exact same engine client-side for render parity.
 *
 * Keeping one copy is what prevents the build path and the playground from
 * drifting. The unit suite (test/unit/parsing/marp-plugins.test.js) exercises
 * each plugin through a real marp-core instance.
 */

const mermaidLanguage = require('../mermaid/mermaid.hljs');

// Base64 that works in both Node (Buffer) and the browser (btoa). Used by the
// latticeplot fence rewriter to pack the fence config into a data- attribute.
function toBase64(str) {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Marpit plugin: deck-wide `class:` propagation. Marpit's native directive
 * spec is "spot replaces global" — a slide with `<!-- _class: foo -->`
 * discards the deck-wide `class:` value. This reads the front-matter `class:`
 * line and APPENDS any token not already present, so `class: dark` +
 * `_class: title` becomes `class="title dark"`.
 */
function deckClassPropagate(markdown) {
  markdown.core.ruler.after('marpit_slide_containers', 'deck_class_propagate', (state) => {
    const src = (state.env && (state.env.markdown || state.env.source)) || state.src || '';
    const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!fmMatch) return;
    const cm = fmMatch[1].match(/^\s*class:\s*["']?(.*?)["']?\s*$/m);
    if (!cm) return;
    const deckTokens = cm[1].trim().split(/\s+/).filter(Boolean);
    if (!deckTokens.length) return;

    for (const token of state.tokens) {
      if (token.type !== 'marpit_slide_open') continue;
      const cur = (token.attrGet('class') || '').split(/\s+/).filter(Boolean);
      for (const t of deckTokens) {
        if (!cur.includes(t)) cur.push(t);
      }
      token.attrSet('class', cur.join(' '));
    }
  });
}

/**
 * Front-matter reader for the convenience `logo:` directive. Returns
 * `{ logo, style, on, brand }` or `null` when no logo is configured.
 */
function readDeckLogoFrontMatter(src) {
  if (typeof src !== 'string' || !src.length) return null;
  const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fmMatch) return null;
  const fm = fmMatch[1];
  const logoMatch = fm.match(/^\s*logo:\s*["']?(.*?)["']?\s*$/m);
  if (!logoMatch) return null;
  const logo = logoMatch[1].trim();
  if (!logo) return null;
  const styleMatch = fm.match(/^\s*logo-style:\s*["']?(.*?)["']?\s*$/m);
  const onMatch = fm.match(/^\s*logo-on:\s*["']?(.*?)["']?\s*$/m);
  const style = styleMatch ? styleMatch[1].trim().toLowerCase() : 'auto';
  const on = onMatch ? onMatch[1].trim().toLowerCase() : 'all';
  return {
    logo,
    style,
    on: on === 'title' ? 'title' : 'all',
    brand: style === 'brand',
  };
}

/**
 * HTML-stage helper: the convenience `logo:` front-matter directive. Injects
 * `<img class="deck-logo" …>` as the first child of every selected `<section>`.
 */
function applyDeckLogoToHtml(html, markdown) {
  const cfg = readDeckLogoFrontMatter(markdown);
  if (!cfg) return html;
  const htmlEscape = (s) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeSrc = htmlEscape(cfg.logo);
  const classes = `deck-logo${cfg.brand ? ' deck-logo-brand' : ''}`;
  const img = `<img class="${classes}" src="${safeSrc}" alt="" aria-hidden="true">`;
  let firstSeen = false;
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
 * Universal state-token marker decoder. Maps a single-char marker to the
 * semantic + shape classes the universal CSS recipe paints.
 *   [x] → pass + state-full · [-] → warn + state-half
 *   [ ] → fail + state-empty · [/] → skip + state-slashed
 */
function stateClassesFor(marker, neutralEmpty = false) {
  if (marker === 'x') return { sem: 'pass', shape: 'state-full' };
  if (marker === '-') return { sem: 'warn', shape: 'state-half' };
  if (marker === '/') return { sem: 'skip', shape: 'state-slashed' };
  // `[ ]` is overloaded: a NEUTRAL "todo / pending" in checklist (todo),
  // obligation-matrix (exempt) and roadmap (planned), but "not met" in
  // verdict-grid. neutralEmpty picks the neutral todo treatment (open ring);
  // the default keeps the not-met treatment (red ✕).
  return neutralEmpty
    ? { sem: 'todo', shape: 'state-todo' }
    : { sem: 'fail', shape: 'state-empty' };
}

/**
 * Marpit plugin: wraps [x]/[-]/[ ]/[/] nested list items inside
 * `.verdict-grid` (and `.pricing`, which shares the nested-card-with-badges
 * shape — features per tier) sections in `<span class="badge {sem} {shape}">`.
 */
function verdictGridBadges(markdown) {
  markdown.core.ruler.after('marpit_slide_containers', 'verdict_grid_badges', (state) => {
    let inVerdictGrid = false;
    let listDepth = 0;
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        const cls = token.attrGet('class') || '';
        inVerdictGrid = cls.includes('verdict-grid') || cls.includes('pricing');
        listDepth = 0;
        continue;
      }
      if (token.type === 'marpit_slide_close') {
        inVerdictGrid = false;
        continue;
      }
      if (!inVerdictGrid) continue;
      if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
        listDepth++;
        continue;
      }
      if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
        listDepth--;
        continue;
      }
      if (token.type !== 'inline' || listDepth < 2 || !token.children) continue;
      const text = token.children.map((c) => c.content || '').join('').trim();
      const m = /^\[([x\-/ ])\]\s*(.*)$/.exec(text);
      if (!m) continue;
      const { sem, shape } = stateClassesFor(m[1]);
      const htmlToken = new token.children[0].constructor('html_inline', '', 0);
      htmlToken.content = `<span class="badge ${sem} ${shape}">${m[2]}</span>`;
      token.children = [htmlToken];
    }
  });
}

/**
 * Marpit plugin: on `obligation-matrix` slides, wraps `[x]/[-]/[ ]/[/]` text
 * inside <td> cells in `<span class="state {sem} {shape}">…</span>`.
 */
function obligationMatrixBadges(markdown) {
  markdown.core.ruler.after('marpit_slide_containers', 'obligation_matrix_badges', (state) => {
    let inMatrix = false;
    let inTd = false;
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        inMatrix = /\bobligation-matrix\b/.test(token.attrGet('class') || '');
        inTd = false;
        continue;
      }
      if (token.type === 'marpit_slide_close') {
        inMatrix = false;
        continue;
      }
      if (!inMatrix) continue;
      if (token.type === 'td_open') {
        inTd = true;
        continue;
      }
      if (token.type === 'td_close') {
        inTd = false;
        continue;
      }
      if (token.type !== 'inline' || !inTd || !token.children) continue;
      const text = token.children.map((c) => c.content || '').join('').trim();
      const m = /^\[([x\-/ ])\]\s*(.*)$/.exec(text);
      if (!m) continue;
      const { sem, shape } = stateClassesFor(m[1], true); // obligation [ ] = exempt (neutral)
      const htmlToken = new token.children[0].constructor('html_inline', '', 0);
      htmlToken.content = `<span class="state ${sem} ${shape}">${m[2]}</span>`;
      token.children = [htmlToken];
    }
  });
}

/**
 * Marpit plugin: on a `checklist` slide, marks each top-level list item whose
 * text begins with `[x]/[-]/[ ]/[/]` with the state classes; strips the marker.
 */
function checklistItemStates(markdown) {
  markdown.core.ruler.after('marpit_slide_containers', 'checklist_item_states', (state) => {
    let inChecklist = false;
    let listDepth = 0;
    let pendingItemOpen = null;
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        inChecklist = /\bchecklist\b/.test(token.attrGet('class') || '');
        listDepth = 0;
        pendingItemOpen = null;
        continue;
      }
      if (token.type === 'marpit_slide_close') {
        inChecklist = false;
        continue;
      }
      if (!inChecklist) continue;
      if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
        listDepth++;
        continue;
      }
      if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
        listDepth--;
        continue;
      }
      if (token.type === 'list_item_open' && listDepth === 1) {
        pendingItemOpen = token;
        continue;
      }
      if (token.type !== 'inline' || !pendingItemOpen || !token.children) continue;
      const textChild = token.children.find((c) => c.type === 'text');
      if (!textChild) {
        pendingItemOpen = null;
        continue;
      }
      const m = /^\[([x\-/ ])\]\s*/.exec(textChild.content);
      if (!m) {
        pendingItemOpen = null;
        continue;
      }
      const { sem, shape } = stateClassesFor(m[1], true); // checklist [ ] = todo (neutral)
      const stateClass = `state ${sem} ${shape}`;
      const cur = pendingItemOpen.attrGet('class');
      pendingItemOpen.attrSet('class', cur ? `${cur} ${stateClass}` : stateClass);
      textChild.content = textChild.content.slice(m[0].length);
      pendingItemOpen = null;
    }
  });
}

/**
 * Marpit plugin: on slot-labeled layouts, wraps the lead inline content of
 * each top-level <li> in <strong> so the labeled corner-tag CSS fires.
 */
function slotLabelLift(markdown) {
  // Whole-class-token match: the `(?<![\w-]) … (?![\w-])` boundaries treat
  // hyphenated names as atomic so `timeline` does NOT match the unrelated
  // `timeline-list` chart class (a plain `\b` boundary would, since `-` is a
  // word boundary).
  const SLOT_LAYOUTS =
    /(?<![\w-])(compare-prose|decision|split-panel|split-compare|statute-stack|regulatory-update|authority-chain|redline|timeline|list-criteria|actors|kpi|stats)(?![\w-])/;
  markdown.core.ruler.after('marpit_slide_containers', 'slot_label_lift', (state) => {
    let active = false;
    let chipTail = false;
    let listDepth = 0;
    let pendingLi = false;
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        const klass = token.attrGet('class') || '';
        active = SLOT_LAYOUTS.test(klass);
        // actors: a trailing inline-code chip (actor-name pill) stays a
        // sibling of the <strong> label, not a child of it.
        chipTail = /(?<![\w-])actors(?![\w-])/.test(klass);
        listDepth = 0;
        pendingLi = false;
        continue;
      }
      if (token.type === 'marpit_slide_close') {
        active = false;
        continue;
      }
      if (!active) continue;
      if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
        listDepth++;
        continue;
      }
      if (token.type === 'bullet_list_close' || token.type === 'ordered_list_close') {
        listDepth--;
        continue;
      }
      if (token.type === 'list_item_open' && listDepth === 1) {
        pendingLi = true;
        continue;
      }
      if (token.type !== 'inline' || !pendingLi || !token.children || !token.children.length) continue;
      pendingLi = false;
      if (token.children[0].type === 'strong_open') continue;
      // For chip-tail layouts (actors), a trailing run of inline-code chips
      // (+ whitespace) is metadata (the actor-name pill), not heading text —
      // leave it outside the <strong> so `li > code` CSS keeps matching.
      let end = token.children.length;
      if (chipTail) {
        while (end > 0) {
          const t = token.children[end - 1];
          if (t.type === 'code_inline') { end--; continue; }
          if (t.type === 'text' && !t.content.trim()) { end--; continue; }
          break;
        }
        if (end === 0) continue; // lead is only a chip — nothing to label
      }
      const Ctor = token.children[0].constructor;
      const open = new Ctor('strong_open', 'strong', 1);
      const close = new Ctor('strong_close', 'strong', -1);
      token.children = [
        open,
        ...token.children.slice(0, end),
        close,
        ...token.children.slice(end),
      ];
    }
  });
}

/**
 * Marpit plugin: on a `no-period` slide, strips a trailing period from every
 * heading. Opt in deck-wide via `class: no-period`.
 */
function stripHeadingPeriods(markdown) {
  markdown.core.ruler.after('marpit_slide_containers', 'strip_heading_periods', (state) => {
    let active = false;
    let pendingInline = false;
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        active = /\bno-period\b/.test(token.attrGet('class') || '');
        pendingInline = false;
        continue;
      }
      if (token.type === 'marpit_slide_close') {
        active = false;
        continue;
      }
      if (!active) continue;
      if (token.type === 'heading_open') {
        pendingInline = true;
        continue;
      }
      if (token.type === 'heading_close') {
        pendingInline = false;
        continue;
      }
      if (token.type !== 'inline' || !pendingInline || !token.children) continue;
      for (let i = token.children.length - 1; i >= 0; i--) {
        if (token.children[i].type === 'text') {
          token.children[i].content = token.children[i].content.replace(/\.\s*$/, '');
          break;
        }
      }
    }
  });
}

/**
 * Marpit plugin: on a `with-period` slide, appends a period to any heading
 * not already ending with terminal punctuation. Opt in via `class: with-period`.
 */
function addHeadingPeriods(markdown) {
  markdown.core.ruler.after('marpit_slide_containers', 'add_heading_periods', (state) => {
    let active = false;
    let pendingInline = false;
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        active = /\bwith-period\b/.test(token.attrGet('class') || '');
        pendingInline = false;
        continue;
      }
      if (token.type === 'marpit_slide_close') {
        active = false;
        continue;
      }
      if (!active) continue;
      if (token.type === 'heading_open') {
        pendingInline = true;
        continue;
      }
      if (token.type === 'heading_close') {
        pendingInline = false;
        continue;
      }
      if (token.type !== 'inline' || !pendingInline || !token.children) continue;
      for (let i = token.children.length - 1; i >= 0; i--) {
        if (token.children[i].type === 'text') {
          const c = token.children[i].content;
          if (!/[.!?:…]$/.test(c)) token.children[i].content = `${c}.`;
          break;
        }
      }
    }
  });
}

/**
 * Marpit plugin: on a `glossary` slide, transforms a 2-level nested bullet
 * list (Term → Definition) into a 2-column glossary table.
 */
function glossaryListToTable(markdown) {
  markdown.core.ruler.after('marpit_slide_containers', 'glossary_list_to_table', (state) => {
    const tokens = state.tokens;
    let inGlossary = false;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'marpit_slide_open') {
        const cls = t.attrGet('class') || '';
        inGlossary = /\bglossary\b/.test(cls);
        continue;
      }
      if (t.type === 'marpit_slide_close') {
        inGlossary = false;
        continue;
      }
      if (!inGlossary) continue;
      if (t.type !== 'bullet_list_open') continue;
      let depth = 1;
      let end = -1;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'bullet_list_open') depth++;
        else if (tokens[j].type === 'bullet_list_close') {
          depth--;
          if (depth === 0) {
            end = j;
            break;
          }
        }
      }
      if (end < 0) continue;
      const rows = [];
      let liDepth = 0;
      let term = '';
      let def = '';
      let captureTo = null;
      for (let j = i + 1; j < end; j++) {
        const tk = tokens[j];
        if (tk.type === 'list_item_open') {
          liDepth++;
          if (liDepth === 1) {
            term = '';
            def = '';
            captureTo = 'term';
          }
        } else if (tk.type === 'list_item_close') {
          if (liDepth === 1) {
            const termHtml = /^<(?:strong|b)\b/.test(term) ? term : `<strong>${term}</strong>`;
            rows.push(`<tr><td>${termHtml}</td><td>${def}</td></tr>`);
          }
          liDepth--;
        } else if (tk.type === 'bullet_list_open' && liDepth === 1) {
          captureTo = 'def';
        } else if (tk.type === 'inline') {
          const html = markdown.renderer.renderInline(tk.children, markdown.options, state.env);
          if (captureTo === 'term' && liDepth === 1 && !term) {
            term = html;
            captureTo = null;
          } else if (captureTo === 'def' && liDepth === 2 && !def) {
            def = html;
          }
        }
      }
      if (!rows.length) continue;
      const Ctor = t.constructor;
      const repl = new Ctor('html_block', '', 0);
      repl.content = `<table><thead><tr><th>Term</th><th>Definition</th></tr></thead><tbody>\n${rows.join('\n')}\n</tbody></table>\n`;
      repl.block = true;
      tokens.splice(i, end - i + 1, repl);
    }
  });
}

/**
 * Marpit plugin: on a `glossary` slide, appends an alphabetic-range pill to the
 * h2 spanning the table's first-column first/last characters.
 */
function glossaryRange(markdown) {
  markdown.core.ruler.after('glossary_list_to_table', 'glossary_range', (state) => {
    let inGlossary = false;
    let h2InlineToken = null;
    let firstTermChar = null;
    let lastTermChar = null;
    let captureNextInline = false;
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        const cls = token.attrGet('class') || '';
        inGlossary = /\bglossary\b/.test(cls);
        h2InlineToken = null;
        firstTermChar = null;
        lastTermChar = null;
        captureNextInline = false;
        continue;
      }
      if (!inGlossary) continue;
      if (token.type === 'marpit_slide_close') {
        if (h2InlineToken && firstTermChar) {
          const range =
            firstTermChar === lastTermChar
              ? firstTermChar
              : `${firstTermChar} – ${lastTermChar || firstTermChar}`;
          const Ctor = h2InlineToken.children?.[0] ? h2InlineToken.children[0].constructor : null;
          if (Ctor) {
            const space = new Ctor('text', '', 0);
            space.content = ' ';
            const pill = new Ctor('html_inline', '', 0);
            pill.content = `<span class="range-pill">${range}</span>`;
            h2InlineToken.children = [...(h2InlineToken.children || []), space, pill];
          }
        }
        inGlossary = false;
        continue;
      }
      if (token.type === 'heading_open' && token.tag === 'h2') {
        captureNextInline = 'h2';
        continue;
      }
      if (captureNextInline === 'h2' && token.type === 'inline') {
        if (!h2InlineToken) h2InlineToken = token;
        captureNextInline = false;
        continue;
      }
      if (token.type === 'html_block' && /<table>/.test(token.content)) {
        const tbody = token.content.match(/<tbody>([\s\S]*?)<\/tbody>/);
        if (tbody) {
          const rows = [...tbody[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
          if (rows.length) {
            const fc = rows[0][1].match(/<td>([\s\S]*?)<\/td>/);
            const lc = rows[rows.length - 1][1].match(/<td>([\s\S]*?)<\/td>/);
            const firstChar = (s) => (s.replace(/<[^>]+>/g, '').trim()[0] || '').toUpperCase();
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
 * ```mermaid blocks get hljs token spans. Idempotent.
 */
function registerMermaidHljs(marp) {
  try {
    if (!marp.highlightjs.getLanguage('mermaid')) {
      marp.highlightjs.registerLanguage('mermaid', mermaidLanguage);
    }
  } catch (_e) {
    /* already registered */
  }
}

/**
 * latticeplotFences — rewrites ```latticeplot fenced blocks into a
 * `<div class="latticeplot" data-fp-config="…base64 JSON…"></div>` placeholder
 * that the vendored function-plot bundle inflates into an inline SVG.
 */
function latticeplotFences(md) {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = (token.info || '').trim();
    if (info === 'latticeplot') {
      const cfg64 = toBase64(token.content);
      return `<div class="latticeplot" data-fp-config="${cfg64}"></div>\n`;
    }
    return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };
}

module.exports = {
  deckClassPropagate,
  readDeckLogoFrontMatter,
  applyDeckLogoToHtml,
  stateClassesFor,
  verdictGridBadges,
  obligationMatrixBadges,
  checklistItemStates,
  slotLabelLift,
  stripHeadingPeriods,
  addHeadingPeriods,
  glossaryListToTable,
  glossaryRange,
  registerMermaidHljs,
  latticeplotFences,
};
