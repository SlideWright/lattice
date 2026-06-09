// CodeMirror autocomplete for the `map` component's region grammar.
//
// The spelling-variance problem world maps live with (Côte d'Ivoire, Myanmar,
// Czechia) is a STATIC-VOCABULARY problem, not a generative one — so it's
// solved client-side from the baked basemaps, with ZERO model calls. As the
// author types a list item inside a `map` slide, this offers the country/state
// names and the group names (continents + dated blocs) the basemap resolves,
// so the right spelling is one keypress away instead of a render-time miss (or
// an LLM round-trip to guess what they meant).
//
// Companion to the deterministic "did you mean" lint rule in
// lib/authoring/lint-core.js (findUnknownMapRegions): autocomplete prevents the
// typo at the keystroke, the lint catches one that slips through — both off the
// same baked vocabulary, neither costing a token.

import { autocompletion } from '@codemirror/autocomplete';
import usBasemap from '../../../lib/components/chart/map/map.basemap.json';
import worldBasemap from '../../../lib/components/chart/map/map.basemap.world.json';

// Build the completion option list for one basemap: every region name + every
// group label, de-duplicated, with a `detail` chip naming what it is.
function optionsFor(basemap, kindLabel) {
  const seen = new Set();
  const options = [];
  for (const r of Object.values(basemap.regions || {})) {
    if (seen.has(r.name)) continue;
    seen.add(r.name);
    options.push({ label: r.name, type: 'constant', detail: kindLabel });
  }
  for (const g of Object.values(basemap.groups || {})) {
    if (seen.has(g.label)) continue;
    seen.add(g.label);
    options.push({ label: g.label, type: 'keyword', detail: g.kind });
  }
  return options;
}

const OPTIONS = {
  us: optionsFor(usBasemap, 'state'),
  world: optionsFor(worldBasemap, 'country'),
};

const CLASS_RE = /<!--\s*_class:\s*([^>]+?)\s*-->/;

// Walk back from the cursor line to the nearest `_class` directive without
// crossing a slide boundary (`---`). Returns the basemap key if that slide is a
// `map` slide, else null.
function mapBasemapAt(state, lineNo) {
  for (let n = lineNo; n >= 1; n--) {
    const text = state.doc.line(n).text;
    if (n !== lineNo && /^---\s*$/.test(text)) return null;
    const m = text.match(CLASS_RE);
    if (m) {
      const tokens = m[1].split(/\s+/).filter(Boolean);
      if (!tokens.includes('map')) return null;
      return tokens.includes('world') ? 'world' : 'us';
    }
  }
  return null;
}

// Completion source: active only on a list-item NAME position inside a map
// slide (after `- `, before the trailing inline-code value).
function mapCompletionSource(context) {
  const line = context.state.doc.lineAt(context.pos);
  const which = mapBasemapAt(context.state, line.number);
  if (!which) return null;

  const beforeCursor = context.state.sliceDoc(line.from, context.pos);
  // `- ` / `* ` bullet, then the name being typed — no backtick yet (the value
  // pill ends the name). The capture group's start is where we replace from.
  const m = beforeCursor.match(/^(\s*[-*]\s+)([^`]*)$/);
  if (!m) return null;
  const from = line.from + m[1].length;
  const typed = m[2];
  // Don't pop the menu on a bare bullet until there's a keystroke, unless
  // explicitly invoked (Ctrl-Space), to stay out of the way.
  if (!typed.trim() && !context.explicit) return null;

  return {
    from,
    options: OPTIONS[which],
    validFor: /^[\p{L} .,'’()-]*$/u,
  };
}

// The extension: map completions only (the markdown editor has no other
// sources we want competing), case-insensitive, no auto-pop on every letter.
export function mapAutocomplete() {
  return autocompletion({
    override: [mapCompletionSource],
    activateOnTyping: true,
    icons: false,
  });
}
