// The Drawing Board — workspace preferences (the "make it yours" layer).
//
// Small scalar settings that shape how the studio behaves, kept in localStorage
// so they're read synchronously in hot paths (createDeck, deleteDeck, the
// arch-mode landing) without an IndexedDB round-trip. Shared by the store (which
// READS them) and the unified Settings popover (which WRITES them), so the keys
// and defaults live in exactly one place. Model on/off + the loaded tier stay in
// drawing-board-settings.js — those are AI-tier state, not workspace taste.
//
// Each pref degrades to its default when localStorage is unavailable (private
// mode) or unset, so a fresh visitor gets the current behaviour with no setup.

export const PREFS = {
  // How many AUTO checkpoints to keep per deck (manual ones are kept forever).
  // 'all' → unbounded. Replaces the old hardcoded AUTO_CAP=30.
  historyCap:  { key: 'lattice-db-history-cap',  def: '30',       values: ['10', '30', '100', 'all'] },
  // Which Architect mode to land in after a reload. 'remember' keeps the last
  // one you used (the legacy behaviour); coach/converse pin it.
  landingMode: { key: 'lattice-db-landing-mode', def: 'remember', values: ['remember', 'coach', 'converse'] },
  // On reload: reopen the last-edited deck, or start on a fresh blank one.
  restoreDeck: { key: 'lattice-db-restore-deck', def: 'last',     values: ['last', 'fresh'] },
  // What a new deck starts from: the starter scaffold, or a blank canvas.
  newDeck:     { key: 'lattice-db-new-deck',     def: 'starter',  values: ['starter', 'blank'] },
  // How delete behaves: an inline "Delete?" confirm in the row, or an optimistic
  // removal with an Undo toast (no gate, fully reversible for a few seconds).
  deleteStyle: { key: 'lattice-db-delete-style', def: 'confirm',  values: ['confirm', 'undo'] },
  // Deck-grammar autocomplete in the editor (component names, modifiers, theme
  // names, skeletons, map regions, …). On by default; off silences the popup.
  autocomplete: { key: 'lattice-db-autocomplete', def: 'on',      values: ['on', 'off'] },
  // Proactive "type-ahead": auto-open the completion popup on ENTERING a grammar
  // context, before a character is typed. 'class' (default) limits it to the
  // `_class:` directive (component → modifiers); 'all' extends it to every
  // grammar context (directives, fence language, front-matter values); 'off'
  // opens the popup only on typing / Ctrl-Space. Inert when autocomplete is off.
  typeahead:    { key: 'lattice-db-typeahead',    def: 'class',    values: ['class', 'all', 'off'] },
};

export function getPref(name) {
  const p = PREFS[name];
  if (!p) return undefined;
  try {
    const v = localStorage.getItem(p.key);
    return p.values.includes(v) ? v : p.def;
  } catch {
    return p.def;
  }
}

export function setPref(name, value) {
  const p = PREFS[name];
  if (!p?.values.includes(value)) return;
  try {
    if (value === p.def) localStorage.removeItem(p.key);
    else localStorage.setItem(p.key, value);
  } catch {}
}

// Resolved numeric cap — Infinity for "keep all", so autoToPrune(…, historyCap())
// returns nothing to prune.
export function historyCap() {
  const v = getPref('historyCap');
  return v === 'all' ? Infinity : parseInt(v, 10) || 30;
}
