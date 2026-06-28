# Studio polish backlog (mobile review, 2026-06-28)

A live review of the Studio (`lattice.style`) on mobile/landscape surfaced 29
polish + feature items. They are grouped into cohesive workstreams, each shipped
as its own PR with merge sign-off. This doc is the durable tracker; delete it once
the backlog is cleared.

**Order:** G1 → G2 → G6 → G3 → G4 → G7 → G5 → G8 (visible no-key polish first;
then repair the AI backbone so the AI-chat/voice features sit on a verified model
layer; library/zip after the studios settle save/share; perf last, on the finished
thing). A group may split into two PRs if a sub-item balloons.

## G1 · Shell, responsive & preview  *(no key)*
- **Distinct drawer icons** — the two panel toggles read as "a drawer" twice; give
  the Inspector and Architect toggles semantically distinct icons.
- **Delete confirms** — the slide-toolbar trash deletes with no confirmation.
- **Preview real-estate / padding** — re-evaluate after the aspect fix; check the
  landscape "bleed off the right edge".
- **Swipe nav (mobile) + verify desktop wheel/scroll** — the preview has zero
  touch/wheel handlers today.
- **Icon-only buttons at compact widths** — Present / Share / Insert / Fix all /
  Markdown carry text labels that crowd a phone row.
- **Un-squish the user avatar** — the "SA" avatar renders as an oval; hold a fixed
  circular size (`shrink-0`, `aspect-square`).
- **Slide-toolbar arrows** — they are REORDER ("Move slide left/right"), but read as
  navigation and don't change the viewed slide. Disambiguate (clear move icons) and
  give real nav (swipe + the preview-header arrows).
- **Speaker Notes → own drawer** — move it out of the Deck Inspector into a
  dedicated drawer, triggered from the Edit/Preview row.
- **Preview reflects the selected Size's aspect ratio** — the card is hardcoded
  `aspect-video` (and the status bar hardcodes "16 : 9") regardless of `size:`.
  Canonical size→dims: `docs/src/playground/deck-sizes.js` `SIZE_OPTIONS` +
  `lib/_theme.css` `@size` table.

## G2 · Theme selection & light/dark  *(no key)*
- All themes incl. the **AA / CVD colorblind-safe** palettes in the picker (today a
  curated 8 only).
- A **light/dark mode toggle** (engine already honors `<html data-mode>`; the
  footer shows the mode but there's no control).
- The theme control becomes a **grouped dropdown**: Curated / Fabricated (saved) /
  AA / the rest — everywhere (topbar menu + Inspector Look).
- **Theme naming** mirrors component creation — an explicit name field, no magic.

## G3 · Theme Studio depth  *(AI part needs key)*
- **Editable + labeled** engine-derived contract tokens (click → color picker; each
  token labeled with its role; the WCAG audit stays the guardrail).
- Make **light vs dark curation** explicit (and tunable, not just an audition
  toggle).
- **AI "describe a look"** → generate a theme, AA-compliant via
  `deriveTheme`/`auditBoth`.
- Save/Share as **icon buttons on the Studio header row** (consistent w/ Component).

## G4 · Component Studio depth  *(AI part needs key)*
- Rename **"Layout" → "Component"** (user-facing labels).
- **CodeMirror** w/ syntax highlighting for the CSS + skeleton fields (reuse the
  deck `Editor`).
- **AI "describe a component"** → generate scoped, palette-blind CSS + skeleton,
  gated by `gateCss`/`skeletonInvokes`.

## G5 · Asset library & sharing  *(no key)*
- **Unify** the save/share model across themes + components.
- **Zip-share contract** — define what a *theme* zip contains; reconcile with the
  existing zip design doc.
- A **unified Library** view to browse/manage all saved themes + components.

## G6 · AI models & spend  *(verify w/ live key)*
- **Model picker + curated grouping** in Workspace; default to **Claude Sonnet**.
- **Restore the local/on-device tier** (in-browser: WebLLM / Prompt API / built-in)
  — the architect ladder rung the Studio dropped from its UI.
- **Realtime, accurate spend** — today it reads $0 despite real usage; pull live
  OpenRouter usage + credits (`openRouterAccount()`), not just a local estimate.

## G7 · Real voice / TTS  *(verify w/ live key)*
- Get **browser TTS actually speaking** (not silently falling through to captions).
- Wire **OpenRouter TTS** (never got working) per
  <https://openrouter.ai/docs/guides/overview/multimodal/tts>.

## G8 · Performance  *(no key)*
- **UI can hang** — profile main-thread blocking (engine render, per-keystroke
  lint, export rasterization, theme derivation); offload to web workers where it
  pays. Some work is already workered (Kokoro voice).

## Deferred · Security decision (no build yet)
- **Transformer-JS authoring** in the Component Studio is a real RCE/XSS surface
  (reads storage, can exfiltrate the OpenRouter key, embeds in shared decks). Only
  with a real sandbox — a locked-down Worker (no DOM/network/storage) or a curated
  allowlisted DSL — and never auto-running a transformer from an imported deck.
  Needs its own threat model + decision doc before any implementation.
