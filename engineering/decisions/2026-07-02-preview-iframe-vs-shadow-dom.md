---
status: shipped
summary: Why the live slide preview (Studio / Playground / Drawing Board) is an IFRAME and not an in-page shadow-DOM / scoped-CSS host. Modern CSS modularity (Shadow DOM, `@scope`, `@layer`, container queries) genuinely solves the "styles bleed both ways" reason — that strand is obsolete. But the iframe is load-bearing for reasons modularity does NOT touch: it is a separate DOCUMENT (its own viewport, root font-size, `@font-face` registry, and `@page` model) and a separate REALM (its own globals + a security boundary for untrusted decks, HARD RULE #22). Lattice's core promise — preview is byte-for-byte the export — and the FIT measurement both depend on document-equivalence; `rem`/`vw`/`vh`/`@font-face`/`@page` all resolve against the wrong root outside an iframe. The touch saga (2026-07-01 debug overlay) is the tax the iframe charges. Decision: keep the iframe until/unless Lattice drops export-fidelity as a promise AND stops rendering untrusted content — then a shadow-DOM preview becomes the better call.
last-updated: 2026-07-02
companion:
  - ./2026-07-01-debug-bounding-boxes.md
  - ./2026-06-29-component-transformer-threat-model.md
---

# Preview `<iframe>` vs. shadow DOM — why it's still an iframe

**Date:** 2026-07-02
**Status:** Shipped (records the standing rationale; no code change).
**Prompted by:** a design question — "in a world with modular CSS and modular JS, is
there any reason to use an iframe for the Studio preview at all?"

---

## 1. The short answer

**Yes — but not for the reason people reach for it.** Modern CSS *does* solve the
"deck styles and docs-site styles bleed into each other" problem; that strand of the
question is genuinely obsolete. What keeps the iframe load-bearing is that it is a
separate **document** (its own viewport, root, font registry, and page model) and a
separate **realm** (its own globals and a security boundary). Modularity gives you
*scoping*; it does not give you a second document or a second realm — and Lattice's
core promise and its threat model lean on both.

The braid has three strands. One is cut by modern CSS. Two are not.

---

## 2. Strand 1 — modular CSS (the strand that IS solved)

The historical reason for the iframe is mutual style contamination:

- The **deck CSS** (`lattice.css` + a theme) is deliberately aggressive: element
  selectors (`section`, `h1`, `ul`, bare `body`), resets, `!important`, `@page`, a
  fixed 1280×720 geometry, custom properties, `@font-face`.
- The **docs site** is Tailwind + shadcn: a preflight reset and utility classes that
  would leak *into* the slide, while the slide's element selectors + `!important`
  would leak *out* into the docs chrome.

Today this is a solved problem without an iframe:

- **Shadow DOM** gives true two-way encapsulation — docs CSS can't reach in, deck
  selectors can't reach out.
- **`@layer`** tames cascade order; **`@scope`** scopes selectors to a subtree;
  **container queries** replace viewport-relative responsiveness.

If style-bleed were the *only* reason for the iframe, we could delete it today. It is
not.

---

## 3. Strand 2 — "preview === export" is a DOCUMENT property, not a scoping property

This is the load-bearing strand, and it is specific to Lattice. The product's whole
pitch is *what you preview is byte-for-byte what you export to PDF/PPTX*. The export
renders each slide as an isolated **document** (Chromium print / the emulator). The
iframe preview mirrors that document context; a shadow-DOM host does not, because a
shadow root is still part of the **outer document**. Several things resolve against
the document, not against any shadow/scope boundary:

| Feature | Resolves against… | In a shadow host | In an iframe |
|---|---|---|---|
| **`rem`** | the document root's font-size | the **docs site** `:root` — wrong | the slide's own root — faithful |
| **`vw` / `vh`** | the viewport | the **docs window** — wrong | the 1280×720 slide box — faithful |
| **`@font-face`** | must be document- or shadow-registered; **does not register from inside a shadow root** | fonts must live in the docs document → name collisions with the docs stack | scoped per-iframe, clean |
| **`@page` / print model** | the document, at print time | N/A (no page model) | the closest screen analog to what the exporter uses |
| **FIT measurement** | a stable, known-geometry viewport | contaminated by page flow, scrollbars, the docs grid | a clean fixed-size layout viewport |

None of these are cured by better CSS *modularity* — they are cured by *being a
document*. Take the iframe away and "no drift between preview and export" quietly
stops being true. A deck sized in `rem`, or using `vh` for vertical rhythm, or
relying on the vendored Caveat/Shantell faces, would render subtly differently in an
in-page preview than in the exported artifact — which defeats the point of the
preview.

---

## 4. Strand 3 — modular JS gives organization, not a realm

ES modules and import maps are code *structure*. The iframe buys two things modules
cannot:

- **A separate global realm.** The deck injects runtime `<script>` (the FIT agent,
  Mermaid, KaTeX). In the iframe these run against their own `window`/`document`,
  timers, and globals — no collision with the docs app, no shared mutable state.
- **A security boundary.** The Studio renders **untrusted** markdown — shared decks
  and AI-generated skeletons. The same-origin `srcdoc` iframe is the sanctioned
  threat boundary (HARD RULE #22, `2026-06-29-component-transformer-threat-model.md`):
  untrusted slide HTML is sanitized *before* it enters the frame, and script that
  slips through runs in the frame's realm, not the realm holding the OpenRouter key.
  Collapse the preview into the page and that boundary is gone. Modules do not
  sandbox; only an iframe (or a Worker, which has no DOM) does.

---

## 5. The tension — the iframe is the touch tax

The iframe is not free. It is exactly what caused the multi-round touch saga in the
debug-overlay work (`2026-07-01-debug-bounding-boxes.md`): **iOS Safari will not
deliver a touch INTO a CSS-transform-scaled iframe**, so press-and-hold had to be
rebuilt on a parent-hosted capture surface that maps coordinates *into* the frame.
That awkwardness is the price of document-equivalence + a security realm.

So the real trade is not "iframe vs. modern CSS." It is:

- **Iframe** — faithful to the export, safe for untrusted content, but a second
  document/realm you must reach across for every interaction (touch, hover, hit-test,
  measurement).
- **Shadow-DOM host** — ergonomic (input is just in-page), but you accept
  `rem`/`vw`/`vh`/`@font-face`/`@page` drift from the export and you give up the
  untrusted-content boundary.

For a product whose entire pitch is *no drift* and which renders untrusted decks, the
trade currently favors the iframe.

---

## 6. One nuance — same-origin, un-sandboxed, on purpose

We use a **same-origin, un-sandboxed `srcdoc`** iframe, not a locked-down
cross-origin one — *specifically so the parent can reach in*. That is what makes the
debug capture surface, `chart-interact`, and the FIT agent possible (they read the
frame's `getBoundingClientRect` / `elementsFromPoint` and drive its DOM directly). A
fully sandboxed iframe would be more isolated but would force everything through
`postMessage`, which would have made the touch fix (and much else) far harder. So the
isolation is a chosen point on a spectrum, not the maximum.

The security boundary this gives up (same-origin ⇒ the frame *could* reach the parent
if script escaped) is exactly why #22's sanitize-before-inject rule is a HARD RULE:
the sanitizer, not the origin, is the boundary.

---

## 7. Decision, and when to revisit

**Keep the iframe.** Modern CSS modularity retires the style-isolation *reason*, but
the iframe stands on document-equivalence (export fidelity + FIT measurement) and the
untrusted-content realm — neither of which modularity provides.

**Revisit if either pillar falls:**

- If Lattice ever **drops export-fidelity as a promise** (preview no longer needs to
  equal the PDF byte-for-byte), the `rem`/`vw`/`@font-face`/`@page` objections
  evaporate, and a shadow-DOM preview becomes the better call — and would delete a
  large class of interaction pain.
- If a surface renders **only first-party content**, the #22 boundary is not needed
  there, and that specific surface could move in-page.

Until both are true for a given surface, the iframe earns its keep.

---

## References

- `engineering/decisions/2026-07-01-debug-bounding-boxes.md` — the touch post-mortem;
  the concrete cost of the iframe (iOS won't deliver touch into a scaled frame).
- `engineering/decisions/2026-06-29-component-transformer-threat-model.md` §5.1 — the
  #22 sink rule; why the frame is the threat boundary for untrusted decks.
- `engineering/decisions/2026-06-22-the-fit-spine.md` — the measurement agent that
  needs a fixed-geometry document.
- `docs/src/lib/single-slide-render.ts` — the Studio single-slide iframe (element
  scaled by transform); `docs/src/playground/deck-preview.js` — the filmstrip
  (per-section scale).
