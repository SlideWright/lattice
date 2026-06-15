/**
 * lattice-engine — slide pipeline (markdown-it core rulers).
 *
 * Reproduces, on a plain markdown-it instance, the exact token contract the
 * Lattice plugins bind to (lib/integrations/markdown-it/plugins.js):
 *
 *   - a `marpit_slide_containers` core ruler (so `.after('marpit_slide_containers')`
 *     resolves), and
 *   - `marpit_slide_open` / `marpit_slide_close` tokens carrying the section's
 *     `class` attribute and `marpitSlide` / `marpitSlideTotal` meta.
 *
 * Because the contract matches, every Lattice markdown-it plugin (verdict-grid
 * badges, checklist states, slot-label lift, glossary tables, heading periods,
 * deck-class propagation, …) composes onto this engine UNCHANGED — they are the
 * Lattice-specific, hard-won part and we do not rewrite them.
 *
 * Marp reference (mirrored, not vendored): @marp-team/marpit
 *   lib/markdown/slide.js              → split on hr, wrap in section
 *   lib/markdown/directives/apply.js   → class / data-<kebab> / --<kebab> / pagination / bg
 *   lib/markdown/slide_container.js    → div.marpit wrapper
 */



const { KNOWN_DIRECTIVES, APPLIED_DIRECTIVES, kebab } = require('./directives');

// Pull a single `<!-- (_)key: value -->` directive out of a comment body.
// Returns { spot, key, value } or null. Mirrors directives.parseCommentDirectives
// but operates on a token's raw content inside the pipeline.
function readDirectiveComment(raw) {
  const m = /^<!--\s*(_?)([A-Za-z][\w]*)\s*:\s*([\s\S]*?)\s*-->$/.exec(raw.trim());
  if (!m) return null;
  const [, spot, key, value] = m;
  if (!KNOWN_DIRECTIVES.has(key)) return null;
  return { spot: Boolean(spot), key, value: stripQuotes(value) };
}

function stripQuotes(v) {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/**
 * Install the slide pipeline. `globalBase` seeds the running global directive
 * map from front matter (parsed before markdown-it sees the body).
 */
function installSlidePipeline(md, globalBase = {}, opts = {}) {
  // Predicate: is a theme name registered? marp-core only applies the `theme`
  // directive (data-theme / --theme) when the palette is in its themeSet; an
  // unknown theme is dropped. Default true keeps the engine usable standalone.
  const isThemeKnown = opts.isThemeKnown || (() => true);
  // ── 0. Drop empty-content text tokens left around emphasis markers ─────────
  // Standalone markdown-it leaves `text("")` tokens at the edges of inline
  // content (the consumed `**`/`_` markers). Marpit's pipeline emits a clean
  // stream — `[strong_open, text, strong_close]` — and the Lattice plugins'
  // `children[0].type === 'strong_open'` guards depend on it (without this,
  // slot-label-lift double-wraps an already-bold label). Filtering zero-length
  // text children reproduces marp-core's shape.
  md.core.ruler.after('inline', 'lattice_clean_inline', (state) => {
    for (const token of state.tokens) {
      if (token.type === 'inline' && token.children) {
        token.children = token.children.filter(
          (c) => !(c.type === 'text' && c.content === ''),
        );
      }
    }
  });

  // ── 1. Split on top-level `hr` into <section> slides ──────────────────────
  md.core.ruler.push('marpit_slide', (state) => {
    if (state.inlineMode) return;
    const groups = splitOnHr(state.tokens);
    const total = groups.length;
    const out = [];
    groups.forEach((slideTokens, idx) => {
      const open = new state.Token('marpit_slide_open', 'section', 1);
      open.block = true;
      open.attrSet('id', String(idx + 1));
      open.meta = { marpitSlide: idx, marpitSlideTotal: total };
      const close = new state.Token('marpit_slide_close', 'section', -1);
      close.block = true;
      close.meta = { marpitSlide: idx, marpitSlideTotal: total };
      out.push(open, ...slideTokens, close);
    });
    state.tokens = out;
  });

  // ── 2. Parse directive comments → per-slide directive meta ────────────────
  md.core.ruler.after('marpit_slide', 'marpit_directives', (state) => {
    if (state.inlineMode) return;
    const runningGlobal = { ...globalBase };
    let current = null; // the open token of the slide we're inside
    let slideLocal = {};
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        current = token;
        slideLocal = {};
        continue;
      }
      if (token.type === 'marpit_slide_close') {
        // Effective = running globals overlaid with this slide's spot directives.
        current.meta.marpitDirectives = { ...runningGlobal, ...slideLocal };
        current = null;
        continue;
      }
      if (!current) continue;
      if (token.type !== 'html_block' && token.type !== 'html_inline') continue;
      const dir = readDirectiveComment(token.content);
      if (!dir) continue;
      if (dir.spot) {
        slideLocal[dir.key] = dir.value;
      } else {
        // Global comment directive — applies to this slide and all following.
        runningGlobal[dir.key] = dir.value;
      }
      token.content = ''; // consume the directive comment
      token.type = 'text';
    }
  });

  // ── 3. Apply directive meta to the section token ──────────────────────────
  md.core.ruler.after('marpit_directives', 'marpit_directives_apply', (state) => {
    if (state.inlineMode) return;
    let pageNumber = 0;
    const paginated = [];
    for (const token of state.tokens) {
      if (token.type !== 'marpit_slide_open') continue;
      const dirs = token.meta.marpitDirectives || {};
      // Count EVERY slide — the pagination number is the slide's absolute 1-based
      // position, and the total is the whole deck's slide count, exactly as
      // marp-core does. A `_paginate: false` slide is still counted (its number is
      // hidden), so the next paginated slide reads its true position, not one less.
      // Incrementing only on paginated slides renumbered after a hidden slide and
      // undercounted the total (the parity sweep caught "2" rendering as "1").
      pageNumber += 1;
      const style = new InlineStyle(token.attrGet('style'));
      for (const key of Object.keys(dirs)) {
        if (!APPLIED_DIRECTIVES.has(key)) continue;
        const value = dirs[key];
        if (!value) continue;
        // paginate only lands when truthy ('false'/'skip'/'hold' emit nothing).
        if (key === 'paginate' && !truthy(value)) continue;
        // theme only lands when the palette is registered, matching marp-core.
        if (key === 'theme' && !isThemeKnown(value)) continue;
        const kb = kebab(key);
        token.attrSet(`data-${kb}`, value);
        style.set(`--${kb}`, value);
      }
      if (dirs.class) token.attrJoin('class', dirs.class);
      if (dirs.color) style.set('color', dirs.color);
      if (dirs.backgroundColor) style.set('background-color', dirs.backgroundColor).set('background-image', 'none');
      if (dirs.backgroundImage) {
        style.set('background-image', dirs.backgroundImage)
          .set('background-position', dirs.backgroundPosition || 'center')
          .set('background-repeat', dirs.backgroundRepeat || 'no-repeat')
          .set('background-size', dirs.backgroundSize || 'cover');
      }
      if (truthy(dirs.paginate)) {
        token.attrSet('data-marpit-pagination', String(pageNumber));
        paginated.push(token);
      }
      if (dirs.header) token.meta.marpitHeader = dirs.header;
      if (dirs.footer) token.meta.marpitFooter = dirs.footer;
      const s = style.toString();
      if (s) token.attrSet('style', s);
    }
    for (const token of paginated) token.attrSet('data-marpit-pagination-total', String(pageNumber));
  });

  // ── 3b. Header / footer DOM — marp-core emits <header>/<footer> as the
  //        first/last child of each section (content rendered as inline md). ──
  md.core.ruler.after('marpit_directives_apply', 'marpit_header_footer', (state) => {
    if (state.inlineMode) return;
    const out = [];
    let footer = null; // pending footer for the slide we're inside
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        out.push(token);
        if (token.meta.marpitHeader) {
          out.push(rawBlock(state, `<header>${state.md.renderInline(token.meta.marpitHeader)}</header>`));
        }
        footer = token.meta.marpitFooter || null;
        continue;
      }
      if (token.type === 'marpit_slide_close') {
        if (footer) out.push(rawBlock(state, `<footer>${state.md.renderInline(footer)}</footer>`));
        footer = null;
        out.push(token);
        continue;
      }
      out.push(token);
    }
    state.tokens = out;
  });

  // ── 4. Container wrapper (div.marpit) — the name the plugins hook after ────
  md.core.ruler.after('marpit_header_footer', 'marpit_slide_containers', (state) => {
    if (state.inlineMode) return;
    const open = new state.Token('marpit_slide_containers_open', 'div', 1);
    open.block = true;
    open.attrSet('class', 'marpit');
    const close = new state.Token('marpit_slide_containers_close', 'div', -1);
    close.block = true;
    state.tokens = [open, ...state.tokens, close];
  });
}

// Split a token array into per-slide groups on top-level `hr` (the `---`
// separator). Mirrors marpit's split(tokens, hr, true): a leading hr starts a
// new (possibly empty) slide; the separator token itself is dropped.
function splitOnHr(tokens) {
  const groups = [[]];
  for (const t of tokens) {
    if (t.type === 'hr' && t.level === 0) {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(t);
    }
  }
  // Drop a leading empty group only when it is truly empty (front matter
  // already stripped upstream, so an empty first group means a leading `---`).
  if (groups.length > 1 && groups[0].length === 0) groups.shift();
  return groups;
}

function truthy(v) {
  return v && v !== 'false' && v !== 'skip' && v !== 'hold';
}

// A block-level raw-HTML token (used for injected <header>/<footer>).
function rawBlock(state, html) {
  const t = new state.Token('html_block', '', 0);
  t.block = true;
  t.content = html;
  return t;
}

/**
 * Minimal inline-style accumulator matching marpit's helpers/inline_style:
 * ordered `prop: value;` pairs, last-write-wins, serialised without spaces
 * between declarations (so `--paginate:true;--class:x;` matches marp-core).
 */
class InlineStyle {
  constructor(initial) {
    this.map = new Map();
    if (initial) {
      for (const decl of String(initial).split(';')) {
        const i = decl.indexOf(':');
        if (i === -1) continue;
        this.map.set(decl.slice(0, i).trim(), decl.slice(i + 1).trim());
      }
    }
  }
  set(prop, value) {
    this.map.set(prop, value);
    return this;
  }
  toString() {
    let s = '';
    for (const [k, v] of this.map) s += `${k}:${v};`;
    return s;
  }
}

module.exports = { installSlidePipeline, splitOnHr, InlineStyle };
