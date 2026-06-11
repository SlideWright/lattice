// The Drawing Board — deck setup (front-matter config drawer).
//
// A first-class home for the deck's Marp front matter, so the author never
// hand-writes YAML and the Markdown body stays content-only ("the deck stays
// clean"). The drawer's controls read/write a MANAGED `---` block at the very
// top of the deck source — the single channel that already persists (IndexedDB,
// via drawing-board-store.js) and exports (drawing-board-export.js ships the
// source verbatim). So these settings survive refreshes and travel with an
// exported `.md` for free, with no second data channel to keep in sync.
//
// Theme/palette is deliberately NOT here: the topbar palette picker owns it and
// the playground's withTheme() (lib/playground/index.js) overrides any source
// `theme:` at render time, so a theme control would be a live no-op. This drawer
// owns the directives the picker doesn't: size, paginate, header, footer, plus
// the lower-traffic class / math / lang.
//
// The parse/serialize helpers are PURE (no DOM, no storage) and unit-tested in
// test/unit/playground/drawing-board-config.test.js. createConfigPanel() is the
// only DOM consumer and is never called at import, so the module loads in Node.
//
// Front-matter grammar matches Marp / lib/engine/directives.js: a leading
// `---\n…\n---` flat key:value block. We re-emit a minimal block — only
// non-default keys, always led by `marp: true` so the exported `.md` renders
// through marp-cli — and remove the block entirely when nothing is configured.

// The managed fields and their "default" (omitted) value. A field at its default
// is dropped from the block, so a pristine deck carries no front matter at all.
const FIELD_DEFAULTS = {
  // `theme` is the deck's palette — the one value the top-bar picker, this
  // drawer's select, and the editor all reflect (full three-way sync). It's
  // written explicitly into the deck (transparent, portable) rather than forced
  // on at render time. Validity is enforced where it's PROPAGATED (the
  // controller only syncs a registered palette), not here — writeFrontMatter
  // never scrubs a hand-typed value out of the author's source.
  theme: '',
  size: '16:9', // Marp's default page size (themes also define 4K / standard)
  paginate: 'false',
  header: '',
  footer: '',
  class: '',
  math: '', // '' / 'katex' = the default KaTeX renderer; 'mathjax' switches
  lang: '',
};
const MANAGED = Object.keys(FIELD_DEFAULTS);

// Emit order for known keys; any unmanaged keys we preserved trail in their
// original order. `marp` leads (it's what tells marp-cli to render the deck).
const EMIT_ORDER = ['marp', 'theme', 'size', 'paginate', 'header', 'footer', 'class', 'math', 'lang'];

const TRUEY = /^(true|yes|on|1)$/i;

function stripQuotes(v) {
  const t = (v || '').trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

// Split the leading `---\n…\n---` block into ordered [key, value] entries (flat
// scalar map, per Marp) plus the body with the block removed. `present` flags
// whether a block existed. Mirrors the front-matter regex in directives.js.
function splitFrontMatter(source) {
  const src = source || '';
  const m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(src);
  if (!m) return { entries: [], body: src, present: false };
  const entries = [];
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
    if (kv) entries.push([kv[1], kv[2].trim()]);
    // Non key:value lines (blanks, stray comments) are dropped — Marp front
    // matter is a flat scalar map, matching parseFrontMatter in directives.js.
  }
  return { entries, body: src.slice(m[0].length), present: true };
}

// The form-facing view of a deck's current front matter — pre-fills the drawer's
// controls ("some of which are filled in"). paginate is surfaced as a boolean;
// everything else as a trimmed string with sensible defaults.
export function readFrontMatter(source) {
  const { entries, present } = splitFrontMatter(source);
  const map = {};
  for (const [k, v] of entries) map[k] = stripQuotes(v);
  return {
    theme: map.theme || '',
    size: map.size || '16:9',
    paginate: TRUEY.test(map.paginate || ''),
    header: map.header || '',
    footer: map.footer || '',
    class: map.class || '',
    math: map.math || '',
    lang: map.lang || '',
    // Whether the deck carries any NON-THEME managed front matter — drives the
    // trigger's "configured" cue. `theme` is excluded: with full sync nearly
    // every deck has one, so it isn't a signal of bespoke setup.
    configured: present && MANAGED.some((k) => k !== 'theme' && map[k] != null && map[k] !== '' && !isDefault(k, map[k])),
  };
}

function isDefault(key, value) {
  if (key === 'paginate') return !TRUEY.test(value);
  if (key === 'math') return value === '' || value === 'katex';
  return (value == null ? '' : String(value)) === FIELD_DEFAULTS[key];
}

// Coerce a control's value into the canonical front-matter string, or null when
// it's at its default (and should be omitted). `value` is a boolean for
// paginate, a string otherwise.
function normalize(key, value) {
  if (key === 'paginate') return value === true || TRUEY.test(value || '') ? 'true' : null;
  const v = (value == null ? '' : String(value)).trim();
  if (key === 'math') return v === '' || v === 'katex' ? null : v;
  if (v === '' || v === FIELD_DEFAULTS[key]) return null;
  return v;
}

// A scalar that needs quoting to round-trip through a flat YAML reader: a colon
// or hash (would start an inline mapping / comment) or edge whitespace. Booleans,
// sizes and keywords never trip this, so they stay bare like the example decks.
function quoteIfNeeded(value) {
  const v = String(value);
  if (/[:#]/.test(v) || /^\s|\s$/.test(v) || v === '') return `"${v.replace(/"/g, '\\"')}"`;
  return v;
}

// Set (or clear) ONE managed field and return the rewritten source. Re-reads the
// current block each call, so it composes with manual edits and never clobbers
// unmanaged keys (style, backgroundColor, a hand-typed theme, …). Managed keys
// are canonicalized + re-quoted as needed; unmanaged keys are emitted verbatim
// (we don't know their grammar). When the block would hold nothing but `marp`,
// it's removed entirely — back to a clean deck.
export function writeFrontMatter(source, key, value) {
  const { entries, body, present } = splitFrontMatter(source);

  // Partition the existing block: managed keys → bare canonical values we own;
  // everything else → preserved verbatim in original order. `marp` is re-derived.
  const managed = new Map();
  const preserved = [];
  for (const [k, raw] of entries) {
    if (k === 'marp') continue;
    if (MANAGED.includes(k)) {
      const n = normalize(k, k === 'paginate' ? raw : stripQuotes(raw));
      if (n != null) managed.set(k, n);
    } else {
      preserved.push([k, raw]);
    }
  }

  // Apply the incoming change (null = clear → at default).
  const norm = normalize(key, value);
  if (norm == null) managed.delete(key);
  else managed.set(key, norm);

  if (managed.size === 0 && preserved.length === 0) {
    // Nothing configured → drop the block; collapse the gap it left behind.
    return present ? body.replace(/^\n+/, '') : source;
  }

  const presAt = (k) => preserved.find(([pk]) => pk === k);
  const lines = ['marp: true']; // leads the block so an exported .md renders
  for (const k of EMIT_ORDER) {
    if (k === 'marp') continue;
    if (managed.has(k)) lines.push(`${k}: ${quoteIfNeeded(managed.get(k))}`);
    const p = presAt(k);
    if (p) lines.push(`${p[0]}: ${p[1]}`); // e.g. a hand-typed theme, at its slot
  }
  for (const [pk, pv] of preserved) {
    if (!EMIT_ORDER.includes(pk)) lines.push(`${pk}: ${pv}`); // trailing unknowns
  }
  return `---\n${lines.join('\n')}\n---\n\n${body.replace(/^\n+/, '')}`;
}

// ── the drawer panel ──────────────────────────────────────────────────────────
// Builds the contextual controls, pre-filled from the deck's current front
// matter, and writes each change straight back into the editor source (which
// re-renders + autosaves via the controller's onEdit). DOM-only; called when the
// drawer opens.
export function createConfigPanel({ host, trigger, getSource, setSource, palettes = [], getDefaultTheme = () => '' }) {
  if (!host || typeof getSource !== 'function' || typeof setSource !== 'function') {
    return { render() {}, syncTrigger() {}, writeFrontMatter };
  }

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const titleCase = (s) => s.replace(/(^|-)(\w)/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase());

  // Reflect whether the deck carries managed front matter on the trigger — a
  // quiet accent cue (matching the model chip's active state) that the deck has
  // been configured. Cheap; safe to call on every edit.
  function syncTrigger() {
    if (!trigger) return;
    try { trigger.classList.toggle('is-set', readFrontMatter(getSource()).configured); } catch { /* no-op */ }
  }

  // Apply a single field, then refresh the trigger cue. We do NOT re-render the
  // panel so text inputs keep focus + caret while typing.
  function apply(key, value) {
    try { setSource(writeFrontMatter(getSource(), key, value)); } catch { /* editor gone */ }
    syncTrigger();
  }

  // A label + hint pair (the left side of every row).
  function text(label, hint) {
    const t = el('div', 'db-pref-text');
    t.append(el('span', 'db-pref-label', label));
    if (hint) t.append(el('span', 'db-pref-hint', hint));
    return t;
  }

  // An inline select row (theme, size, math) — label/hint left, <select> right.
  // `rerender` re-paints the panel after a change (the theme row uses it so the
  // "unknown theme" note + the select settle on the new valid value).
  function selectRow(key, label, hint, options, current, rerender = false) {
    const row = el('div', 'db-pref-row');
    const sel = el('select', 'db-pref-select');
    sel.setAttribute('aria-label', label);
    for (const [value, optLabel] of options) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = optLabel;
      if (value === current) o.selected = true;
      sel.append(o);
    }
    sel.addEventListener('change', () => { apply(key, sel.value); if (rerender) render(); });
    row.append(text(label, hint), sel);
    return row;
  }

  // A switch row (paginate) — reuses the settings switch styling.
  function switchRow(key, label, hint, on) {
    const row = el('label', 'db-or-switch');
    const sw = el('span', 'db-switch');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'db-switch-input';
    cb.checked = !!on;
    cb.setAttribute('aria-label', label);
    cb.addEventListener('change', () => apply(key, cb.checked));
    sw.append(cb, el('span', 'db-switch-knob'));
    row.append(text(label, hint), sw);
    return row;
  }

  // A stacked text field (header, footer, class, lang) — label/hint above a
  // full-width input, since these run long. Writes debounced as you type so the
  // live preview tracks the edit without thrashing the editor on every keystroke.
  function textField(key, label, hint, value, placeholder) {
    const box = el('div', 'db-config-field');
    box.append(text(label, hint));
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'db-config-input';
    inp.value = value || '';
    if (placeholder) inp.placeholder = placeholder;
    inp.setAttribute('aria-label', label);
    let t = null;
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => apply(key, inp.value), 250); });
    inp.addEventListener('change', () => { clearTimeout(t); apply(key, inp.value); });
    box.append(inp);
    return box;
  }

  function render() {
    const fm = readFrontMatter(getSource());
    host.innerHTML = '';

    host.append(el('p', 'db-settings-note',
      'These live in the deck’s front matter — managed for you, so the Markdown stays clean. ' +
      'They apply to the whole deck and travel with an exported .md.'));

    // Theme — the deck's palette, written into the front matter and kept in sync
    // with the top-bar palette picker (same value, set in either place). Light /
    // dark is the separate top-bar toggle, so the options are the base palettes.
    if (palettes.length) {
      const raw = fm.theme;
      const valid = !!raw && palettes.includes(raw);
      const current = valid ? raw : (getDefaultTheme() || palettes[0] || '');
      host.append(selectRow('theme', 'Theme',
        'Palette for the whole deck — synced with the top-bar picker', // transparent, not magic
        palettes.map((p) => [p, titleCase(p)]), current, true));
      if (raw && !valid) {
        // Don't propagate a nonexistent theme — say so, and keep rendering the
        // fallback rather than blanking the deck.
        host.append(el('p', 'db-settings-note db-config-warn',
          `“${raw}” isn’t a known theme — the deck renders with ${current} until you pick a valid one.`));
      }
    }

    host.append(selectRow('size', 'Slide size', 'The page aspect ratio + resolution', [
      ['16:9', 'Widescreen 16:9 · 1280×720 (default)'],
      ['4K', '4K · 3840×2160'],
      ['standard', 'Standard 4:3 · 960×720'],
    ], fm.size));

    host.append(switchRow('paginate', 'Page numbers', 'Show pagination on every slide', fm.paginate));
    host.append(textField('header', 'Header', 'Running header text on every slide', fm.header, 'e.g. Lattice · Q3 Board Review'));
    host.append(textField('footer', 'Footer', 'Running footer text on every slide', fm.footer, 'e.g. Confidential'));

    host.append(el('h3', 'db-settings-head db-settings-subhead', 'Advanced'));

    host.append(textField('class', 'Default slide class', 'A class applied to every slide (e.g. dark)', fm.class, 'e.g. dark'));
    host.append(selectRow('math', 'Math renderer', 'How $…$ math is typeset', [
      ['', 'KaTeX (default)'],
      ['mathjax', 'MathJax'],
    ], fm.math === 'mathjax' ? 'mathjax' : ''));
    host.append(textField('lang', 'Language', 'The deck’s document language tag', fm.lang, 'e.g. en'));

    syncTrigger();
  }

  return { render, syncTrigger, writeFrontMatter };
}
