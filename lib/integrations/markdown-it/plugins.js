/**
 * Marpit / marp-core engine plugins — the markdown-it token transforms and
 * HTML-stage helpers that give Lattice components their structure (verdict-grid
 * badges, checklist state discs, obligation-matrix cells, slot-label bolding,
 * glossary tables, heading-period adjustment, deck-wide
 * class propagation, the `logo:` convenience directive, and functionplot fences).
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
const { finishClasses } = require('../../core/resolve-finish');
const { resolveSplitMode } = require('../../core/resolve-split');
const { headingSplitPoints } = require('../../core/heading-split-core');
const { splitSections } = require('../../core/split-sections');

// Base64 that works in both Node (Buffer) and the browser (btoa). Used by the
// functionplot fence rewriter to pack the fence config into a data- attribute.
function toBase64(str) {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Marpit plugin: the deck-wide `split: headings` slide divider. When the deck's
 * front matter selects `split: headings` (lib/core/resolve-split.js), inject a
 * top-level `hr` token before every h1/h2 that is the SECOND-or-later heading in
 * its slide, so the downstream slide splitter (Marpit's `marpit_slide` ruler, or
 * lib/engine/slides.js `splitOnHr` — both split on top-level `hr`) starts a new
 * slide there. Runs `.before('marpit_slide')` so both render paths observe the
 * injected breaks identically (HARD RULE #1).
 *
 * Eyebrow-aware by construction: the FIRST heading in a slide never injects a
 * break, so lead content above a title (an eyebrow tag, a `<!-- _class -->`
 * comment, a kicker line) stays attached to that heading's slide instead of
 * orphaning into a titleless slide — the failure mode marp-core's native
 * `headingDivider` has, which is why we don't use it. An author-written `---`
 * (a top-level `hr` already in the stream) resets the per-slide heading state,
 * so `split: headings` is HYBRID: `##` AND `---` both start slides.
 *
 * Headings inside fenced code are `fence`/`code_block` tokens, never
 * `heading_open`, so the split is fence-safe for free. Only top-level headings
 * (token.level === 0) divide; an h1/h2 nested in a blockquote or list does not.
 *
 * PULL-BACK: a slide's "lead-in" — its per-slide `<!-- _key -->` directive
 * comments and its eyebrow (a paragraph that is only inline `code`) — is written
 * ABOVE the heading in source (that's how the eyebrow renders above the title).
 * So the break is inserted before that lead-in run, not before the bare heading,
 * or the directive + eyebrow would orphan onto the PREVIOUS slide. The pull-back
 * only ever fires on a slide's 2nd+ heading, so it never disturbs a `---`-split
 * deck (every such slide's heading is its first), keeping both modes
 * slide-count-identical on the committed corpus.
 */
function headingSplit(markdown) {
  markdown.core.ruler.before('marpit_slide', 'lattice_heading_split', (state) => {
    if (state.inlineMode) return;
    const src = (state.env && (state.env.markdown || state.env.source)) || state.src || '';
    if (resolveSplitMode(src) !== 'headings') return;

    // Shared boundary computation (lib/core/heading-split-core.js) — the SAME
    // points the Export-to-Marp baker materializes as `---`, so they can't drift.
    const points = new Set(headingSplitPoints(state.tokens));
    if (!points.size) return;
    const out = [];
    for (let i = 0; i < state.tokens.length; i++) {
      if (points.has(i)) {
        const hr = new state.Token('hr', 'hr', 0);
        hr.markup = '---';
        hr.block = true;
        out.push(hr);
      }
      out.push(state.tokens[i]);
    }
    state.tokens = out;
  });
}

/**
 * Marpit plugin: deck-wide `class:` + `finish:` propagation. Marpit's native
 * directive spec is "spot replaces global" — a slide with `<!-- _class: foo -->`
 * discards the deck-wide `class:` value. This reads the front-matter `class:`
 * line and APPENDS any token not already present, so `class: dark` +
 * `_class: title` becomes `class="title dark"`. The custom `finish:` register
 * (sketch / sketch-clean / boardroom — Marpit has no native key) is mapped to
 * its class tokens (lib/core/resolve-finish.js) and appended the same way, so
 * `finish: sketch` reaches every section even ones carrying their own `_class:`.
 */
function deckClassPropagate(markdown) {
  markdown.core.ruler.after('marpit_slide_containers', 'deck_class_propagate', (state) => {
    const src = (state.env && (state.env.markdown || state.env.source)) || state.src || '';
    const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!fmMatch) return;
    const cm = fmMatch[1].match(/^\s*class:\s*["']?(.*?)["']?\s*$/m);
    const classTokens = cm ? cm[1].trim().split(/\s+/).filter(Boolean) : [];
    const fm = fmMatch[1].match(/^\s*finish:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m);
    const finishTokens = finishClasses(fm ? fm[1] : '').split(/\s+/).filter(Boolean);
    const deckTokens = [...classTokens, ...finishTokens];
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
  return html.replace(/<section\b([^>]*\bdata-lattice-slide="[^"]*"[^>]*)>/g, (match, attrs) => {
    const c = attrs.match(/\sclass="([^"]*)"/);
    const cls = c ? c[1].split(/\s+/).filter(Boolean) : [];
    const isTitle = cls.includes('title');
    const isFirst = !firstSeen;
    firstSeen = true;
    if (cfg.on !== 'all' && !isFirst && !isTitle) return match;
    return `${match}${img}`;
  });
}

/* The meta, progress and watermark Tiles are self-contained Form Tiles (issue
 * #356): each owns its kernel (applyToHtml + applyToDom), CSS and manifest in
 * one folder under lib/forms/tile/<id>, so its logic is ONE shared
 * implementation across all three render paths instead of hand-copied here and
 * in a DOM mirror. The depth-aware <section> walker they share lives in
 * lib/core/split-sections.js. This file no longer owns any Form Tile injector.
 */

/* ── FORM deck-wide toggle (`form: off | standard | minimal`) ───────────────
 * The deck-level feature flag that enables the Form model across a whole
 * deck without tagging each slide. It resolves to the per-slide `form`
 * class on every ELIGIBLE section, so all the existing Form logic
 * (masthead-lift, meta / progress / watermark) works unchanged. Three modes:
 *   · off (default; also `false`/`no`)        — disabled.
 *   · standard (also `true`/`on`/`yes`)       — masthead band + bay + progress rail.
 *   · minimal                                 — band + bay, but the progress rail is
 *                                               suppressed (adds `no-progress`), for a
 *                                               quieter deck.
 * Skipped on:
 *   · bookends (title / divider / closing) — their own centred chrome,
 *   · math / compare-code — they drive their own `> h2` title grid,
 *   · split-panel / split-compare — sovereign; the registry rewrites the h2
 *     before masthead-lift would see it,
 *   · image / featured — imagery / full-bleed.
 * A per-slide `no-form` token opts a single slide out. Build-time only —
 * like the deck-wide `class:` and `logo:` directives it shares a limitation
 * with, it does NOT apply in the marp-vscode preview (which doesn't run these
 * config plugins); use a per-slide `form` token there. */
/**
 * The chrome-exempt (sovereign) Frames the deck-wide `form:` toggle must NOT
 * tag with the `form` class. This set is DERIVED from the Form frame manifests
 * (lib/forms/frame/<id>/<id>.manifest.json — the set of Frames with
 * `exemptFromChrome: true`), so adding a sovereign Frame folder auto-updates
 * the engine's skip behaviour without editing this file (design/forms.md §11;
 * 2026-06-15-form-implementation.md §6 — the Open/Closed win).
 *
 * DUAL-CONSUMER CONTRACT (see this file's header): the Form loader reads the
 * filesystem, which the browser playground bundle (esbuild, platform:browser)
 * cannot do. So the derivation runs ONLY at Node load, behind a guard that
 * esbuild cannot statically resolve; the browser bundle falls back to the
 * baked literal below. A unit test asserts the two are identical, so the baked
 * fallback can never drift from the manifests.
 */
const FORM_TOGGLE_SKIP_FALLBACK = [
  'closing', 'compare-code', 'divider',
  'featured', 'image', 'math',
  'split-compare', 'split-panel', 'title',
];

function deriveFormToggleSkip() {
  // `require` via a computed expression so esbuild leaves it as a runtime call
  // (unresolved in the browser bundle) instead of pulling node:fs into it.
  try {
    if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
      return FORM_TOGGLE_SKIP_FALLBACK;
    }
    const req = (typeof module !== 'undefined' && module.require)
      ? module.require.bind(module)
      : require;
    // Computed (non-literal) specifier so esbuild can't statically resolve and
    // bundle the fs-using loader into the browser IIFE — it stays a runtime
    // require that simply fails (caught) in the browser.
    const spec = ['..', '..', 'forms'].join('/');
    const forms = req(spec);
    const derived = forms.frameToggleSkip();
    return derived && derived.length ? derived : FORM_TOGGLE_SKIP_FALLBACK;
  } catch (_e) {
    return FORM_TOGGLE_SKIP_FALLBACK;
  }
}

const FORM_TOGGLE_SKIP = deriveFormToggleSkip();

/** The three values the `form:` toggle accepts. */
const FORM_MODES = ['off', 'standard', 'minimal'];

/** Read the deck-wide `form:` front-matter toggle → 'off' | 'standard' | 'minimal'. */
function readFormMode(src) {
  if (typeof src !== 'string' || !src.length) return 'off';
  const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fmMatch) return 'off';
  const m = fmMatch[1].match(/^\s*form:\s*["']?(.*?)["']?\s*$/m);
  if (!m) return 'off';
  const v = m[1].trim().toLowerCase();
  if (/^(standard|true|on|yes)$/.test(v)) return 'standard';
  if (v === 'minimal') return 'minimal';
  return 'off';
}

/**
 * Resolve one section's class list under the deck toggle (`mode` is the
 * deck-level Form mode). Appends `form` (plus `no-progress` in `minimal`
 * mode) unless the section already opts in/out (`form` / `no-form`) or
 * its layout is in the skip set. Idempotent; returns the class string.
 */
function formToggleClass(classAttr, mode = 'standard') {
  if (mode === 'off') return classAttr;
  const tokens = (classAttr || '').split(/\s+/).filter(Boolean);
  if (tokens.includes('form') || tokens.includes('no-form')) return classAttr;
  if (tokens.some((t) => FORM_TOGGLE_SKIP.includes(t))) return classAttr;
  tokens.push('form');
  if (mode === 'minimal' && !tokens.includes('no-progress')) tokens.push('no-progress');
  return tokens.join(' ');
}

/**
 * HTML-stage helper: apply the deck-wide `form:` toggle to rendered HTML
 * by adding the `form` class to every eligible TOP-LEVEL `<section>`. Runs
 * FIRST in the marp-cli render hook, before the registry, so masthead-lift et
 * al. see the class. Uses the depth-aware splitSections walker, so it only
 * rewrites real slide sections — a raw `<section>` in slide content is nested
 * and left untouched. (lib/engine — which the emulator runs — applies this same
 * function in its renderHtml, before its registry pass.)
 */
function applyFormToggleToHtml(html, markdown) {
  const mode = readFormMode(markdown);
  if (mode === 'off') return html;
  return splitSections(html).map((p) => {
    if (p.type === 'gap') return p.text;
    const next = formToggleClass(p.cls, mode);
    if (next === p.cls) return p.openTag + p.inner + '</section>';
    const openTag = /\sclass="/.test(p.openTag)
      ? p.openTag.replace(/\sclass="[^"]*"/, ` class="${next}"`)
      : p.openTag.replace(/<section\b/, `<section class="${next}"`);
    return openTag + p.inner + '</section>';
  }).join('');
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
 * functionPlotFences — rewrites ```functionplot fenced blocks into a
 * `<div class="functionplot" data-fp-config="…base64 JSON…"></div>` placeholder
 * that the vendored function-plot bundle inflates into an inline SVG. The fence
 * body is function-plot's own config schema (https://mauriciopoppe.github.io/function-plot/),
 * not a Lattice grammar — Lattice owns only the fence + the SVG theming + the
 * degradation-to-code-block contract. `latticeplot` is accepted as a DEPRECATED
 * alias for one release (the construct was renamed for honesty; see
 * spec/LFM-1.0.md §3.3 and the 2026-06-13-lfm-standard decision note).
 */
function functionPlotFences(md) {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = (token.info || '').trim();
    if (info === 'functionplot' || info === 'latticeplot') {
      const cfg64 = toBase64(token.content);
      return `<div class="functionplot" data-fp-config="${cfg64}"></div>\n`;
    }
    return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
  };
}

module.exports = {
  headingSplit,
  deckClassPropagate,
  readDeckLogoFrontMatter,
  applyDeckLogoToHtml,
  FORM_MODES,
  FORM_TOGGLE_SKIP,
  FORM_TOGGLE_SKIP_FALLBACK,
  readFormMode,
  formToggleClass,
  applyFormToggleToHtml,
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
  functionPlotFences,
};
