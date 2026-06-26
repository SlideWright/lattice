// Workbench "Preview setup" — the state-backed deck-config for a studio.
//
// The Workbench studios render a FIXED preview deck (the Theme Studio's specimen,
// the Layout Studio's skeleton) — there's no author deck to carry front matter.
// This mounts the universal config panel (createConfigPanel, preview profile)
// against a VIRTUAL source: `block + body`, where `body` is the fixed preview
// deck and `block` is a managed front-matter block we hold in state (persisted to
// localStorage) and apply at render. So an author can preview their theme/
// component under a finish / size / form "behind the scenes" — no raw YAML,
// and nothing that leaks into the saved theme or component.
//
// `composed()` is what the studio renders: `block + body()`. `onChange` fires
// after every edit so the studio re-renders.

import { CONFIG_PROFILES, createConfigPanel } from './deck-config.js';

// The leading `---\n…\n---\n+` front-matter fence, captured WITH its trailing
// blank line(s) so `block + body` reconstructs the deck verbatim.
const FENCE = /^---\n[\s\S]*?\n---\n+/;

export function mountStudioPreviewConfig({ root, body, onChange, finishes = [], storageKey, note }) {
  const trigger = root.querySelector('[data-preview-setup]');
  const host = root.querySelector('.studio-preview-config');
  if (!trigger || !host || typeof body !== 'function') return { composed: body || (() => '') };

  let block = '';
  try { block = localStorage.getItem(storageKey) || ''; } catch { /* private mode */ }

  const composed = () => block + body();

  const panel = createConfigPanel({
    host,
    trigger,
    getSource: composed,
    setSource: (next) => {
      const m = next.match(FENCE);
      block = m ? m[0] : '';
      try { localStorage.setItem(storageKey, block); } catch { /* private mode */ }
      if (onChange) onChange();
    },
    finishes,
    fields: CONFIG_PROFILES.preview,
    note: note || 'Preview-only — applied to the specimen so you can audit your work under a finish, size, or the Form model. It isn’t saved with your theme/component.',
  });

  function open() { panel.render(); host.hidden = false; trigger.setAttribute('aria-expanded', 'true'); }
  function close() { host.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
  trigger.addEventListener('click', () => (host.hidden ? open() : close()));

  return { composed, open, close, panel };
}
