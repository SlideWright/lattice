---
status: design-decided, not-yet-implemented
version: 1
supersedes: none
related:
  - ../references/templates.md (current inline-code semantics)
  - ../references/gotchas.md ("Marp Core wraps emoji in <img class='emoji'>")
---

# Lattice — namespaced inline-code directives (Font Awesome, vars, …)

> **Status.** Design landed in conversation on 2026-05-11. Nothing
> implemented yet. This note is the handoff for a future session to
> pick up and ship. When implementation lands, fold the canonical
> rules into `docs/references/templates.md` and delete this note.

## What's already done

- **Branch `claude/fix-emoji-rendering-WO4vI`** ships the unicode-emoji
  fix (commit `2e01112`): Marp Core was rewriting unicode emoji to
  `<img class="emoji">` and the `section img { display:block }`
  catch-all forced them onto their own line. The carve-out
  `section img:not(.emoji)` plus an `img.emoji { display:inline-block;
  height:1em }` rule restored inline rendering. Emoji font fallbacks
  (Apple/Segoe/Noto) were appended to every `--font-*` stack so the
  lattice-emulator path (raw unicode, no twemoji rewrite) also gets
  predictable inline metrics.
- See `docs/references/gotchas.md → "Marp Core wraps emoji in
  <img class='emoji'>"` for the full root cause + mitigation.

## What this note proposes

A canonical, extensible vocabulary for **inline code** (`` ` ``…`` ` ``,
NOT triple-backtick fenced blocks) so authors can drop in icons,
variables, kbd chords, badges, etc. without colliding with the
existing positional semantics that already overload inline code
(eyebrow, subtitle, card actor pill, see
`docs/references/templates.md`).

### The shape

Three complementary forms inside a single backtick pair, dispatched
by the leading character of the code text:

| Form | Meaning | Example | Renders to |
|---|---|---|---|
| `` `$name` `` | Variable interpolation from front-matter `vars:` | `` `$client` `` | text "Acme Corp" |
| `` `prefix:value` `` | Namespaced directive | `` `fa:rocket` `` | `<i class="fa-solid fa-rocket">` |
| `` `(X)` / `[X]` / `[X>` / `((X))` … `` | Bracket-shape pill (Mermaid-inspired) — see below | `` `(LIVE)` `` | `<span class="pill" data-shape="…">LIVE</span>` |
| `` `literal` `` (anything else) | Plain inline code, unchanged | `` `getUserId()` `` | `<code>getUserId()</code>` |

Detection rule (in order): the `<code>` token's text is a directive iff
- starts with `$` and matches `^\$[A-Za-z_][\w.]*$` → variable
- starts with a registered bracket opener and the brackets balance → pill
- matches `^[a-z]+:[^\s]+$` → namespaced
- otherwise → literal

Modifiers (e.g. color, size) are appended with `:` *after* the value
(`` `(LIVE):c3:lg` ``). Namespace-form directives don't take modifiers
(greedy-first-colon makes the value side own all subsequent `:`).
Bracket-form does, because the closing delimiter gives the parser a
clean handoff point.

### Why this shape (decisions already made)

- **`$` is the only sigil.** Variables are the only directive that
  repeats often enough (10–50× per deck) that single-char terseness
  pays for itself. One-off icons / pills are infrequent; the cost of a
  cheatsheet outweighs the saved keystrokes.
- **Sigils `:` `@` `#` `!` are forbidden.** Lattice ships
  CSS-themed decks where inline code routinely starts with `:root`,
  `@media`, `#header`, `!important`. A sigil scheme on those chars
  would misfire constantly and there's no clean escape per-occurrence.
- **`prefix:value` for the long tail.** Self-documenting in source
  (a code reviewer can tell what `` `kbd:Cmd+P` `` does without a
  cheatsheet), avoids the CSS collision problem because the namespace
  is `[a-z]+` and the value follows a `:`.
- **Plain inline code keeps working.** The "no prefix, no `$`" case is
  literal — authors don't need to learn the system to write
  `` `getUserId()` ``. This is the escape hatch.
- **Fenced ` ``` ` blocks are out of scope.** They stay as
  syntax-highlighted code blocks. Repurposing them would break the
  gallery.

### Pill shapes — Mermaid-inspired bracket grammar

Pills get their own grammar because shape is a visual axis the
`prefix:value` form can't express terselys. The bracket grammar is
adopted from Mermaid flowchart shape syntax, so authors who write
flowcharts in this codebase already know it.

#### Shape map

Only the subset that makes visual sense as an inline pill — Mermaid's
diagram-only shapes (cylinder, trapezoid, parallelogram) are out.

| Source | Mermaid name | Lattice pill shape | data-shape |
|---|---|---|---|
| `` `[X]` `` | rectangle | tag (sharp) | `tag` |
| `` `(X)` `` | rounded rect | chip | `chip` |
| `` `([X])` `` | stadium | pill (default capsule) | `pill` |
| `` `((X))` `` | circle | circular badge | `circle` |
| `` `[X>` `` | asymmetric | chevron, right-pointing | `chevron-right` |
| `` `<X]` `` | (no Mermaid match) | chevron, left-pointing | `chevron-left` |
| `` `{X}` `` | rhombus | diamond | `diamond` |
| `` `[[X]]` `` | subroutine | bordered tag (double stroke) | `tag-bordered` |

Detection: a small explicit opener→closer table (not a "match any
bracket" regex), so `` `[X)` `` and other mismatched pairs are
**literal**, not a parse error. Lookup order: longest opener first
(`((` before `(`, `[[` before `[`, `([` before `[`) so the parser
doesn't backtrack.

#### Color modifier — ordinal slot, not color name

Lattice's 8 categorical tokens are stable engine identifiers — but
the *actual rendered colors* are theme-dependent and the token names
are not honest color claims. Survey (`themes/*.css`):

- `--cat-blue` is sky blue on `indaco`, **deep red** on `burgundy`,
  **green** on `carbone`, **olive** on `mustard`, **mauve** on
  `magnolia`, **gray** on `onyx`.
- Same pattern for every other `--cat-*` token across the 12 light
  palettes (each dark variant `@import`s its light sibling).

A modifier API named `:blue` would lie to authors writing portable
decks. So the pill color modifier is **ordinal**: `:c1` through `:c8`
map 1:1 to the categorical token order, with no color promise.

| Modifier | Token |
|---|---|
| `:c1` | `var(--cat-blue)` |
| `:c2` | `var(--cat-green)` |
| `:c3` | `var(--cat-purple)` |
| `:c4` | `var(--cat-orange)` |
| `:c5` | `var(--cat-teal)` |
| `:c6` | `var(--cat-rose)` |
| `:c7` | `var(--cat-slate)` |
| `:c8` | `var(--cat-mauve)` |

(The underlying tokens stay named `--cat-blue`...`--cat-mauve` — that
rename is out of scope. The modifier API translates.)

No modifier = default pill (whatever the current `.pill` rule paints,
typically `--accent`). Authors who want explicit categorical
contrast pick a slot.

Text-on-color contrast comes for free: the existing categorical
contrast policy in `lattice.css:61-78` derives `--cat-<name>-deep`
variants per theme for AA-passing text-on-color. Pill CSS consumes
those automatically — no per-modifier contrast math.

#### Size modifier (axis 2)

```
:sm  :md (default)  :lg
```

Maps to `--pill-size-*` tokens (to be defined in `lattice.css`).
Modifier order is free — `` `[BETA]:c4:lg` `` and `` `[BETA]:lg:c4` ``
parse identically because the parser sorts modifiers by which axis
they belong to (color vs size).

#### Worked examples

```
`(LIVE)`              → default pill, no opinion (current .pill look)
`(LIVE):c2`           → pill, slot-2 color
`[BETA]`              → sharp tag
`[BETA]:c6:lg`        → tag, slot-6, large
`[STEP 2>`            → chevron right, default
`[STEP 2>:c1`         → chevron right, slot-1
`((1)):c5`            → circle "1", slot-5
`{DECIDE}:c3`         → diamond, slot-3
`[[CRITICAL]]:c6`     → bordered tag, slot-6
```

#### HTML output shape

```html
<span class="pill" data-shape="tag" data-c="c4" data-size="lg">BETA</span>
```

CSS in `lattice.css` consumes `data-shape` for geometry and `data-c`
for color (`.pill[data-c="c4"] { --pill-bg: var(--cat-orange); }`).
No inline styles needed; themes can repaint by overriding `--cat-*`.

#### What this lets us delete

The earlier-proposed `pill:`, `tag:`, `kbd:` *as pill prefixes* go
away — pills are bracket-form only. `kbd:` stays as a separate
namespace directive (`<kbd>` is structurally different from a pill;
it carries semantic meaning, not visual variant).

### Open questions to lock before coding

1. **Bare vs braced var syntax.** `` `$client` `` (bare) or
   `` `${client}` `` (braced)? Recommend **braced** if we ever want
   dotted paths (`` `${client.name}` ``) or composition
   (`` `${a} report` ``). Recommend **bare** if a var is always the
   whole inline-code content. Decide before implementation; the
   regex differs.
2. **Escape for literal `prefix:value`.** Someone documenting CSS
   might literally want `` `var:--brand` `` as code. Recommend
   honouring CommonMark's double-backtick form: `` ``var:--brand`` ``
   skips preprocessing because we only run the rule on single-backtick
   `code_inline` tokens with no internal-padding marker. Validate this
   actually distinguishes in markdown-it (it should — the AST
   preserves the marker count).
3. **Missing-var behaviour.** `` `$undefined` `` should render as
   loud `??$undefined??` at build (catches typos in author review),
   silent empty in production, or build-time warning + literal
   passthrough? Recommend **build-time warning + loud `??name??`** —
   loud is the right default for an authoring tool.
4. **Unknown prefix behaviour.** `` `xyz:foo` `` (no registered
   handler) should warn and render literal. Don't error — additive but
   discoverable.
5. **Initial directive registry.** Ship with at minimum:
   - `$name` → variable interpolation.
   - `fa:` → Font Awesome (decide free vs Pro, webfont vs SVG —
     **recommend free + webfont** for print/PDF, no JS required).
   - Bracket-shape pills with `:c1`–`:c8` color slots and `:sm`/`:md`/
     `:lg` sizes (full grammar above).
   - Stretch namespace prefixes: `kbd:`. Can land incrementally.

## Implementation plan

### Architecture (the three-renderer rule)

Per `CLAUDE.md`: any authoring transform must land in all three render
paths or they drift. For inline-code directives:

1. **`marp.config.js`** — register a `markdown-it` rule that walks
   `code_inline` tokens after parse and rewrites matching ones into
   `html_inline` tokens (or a custom token type). Cheapest path —
   runs once during parse, no DOM walk. Covers marp-cli build AND
   marp-vscode preview (both go through the same engine).
2. **`lattice-emulator.js`** — emulator doesn't run markdown-it the
   same way (see header at `lattice-emulator.js:2167` "not running
   through marp-core"). Add the same transform to its inline pipeline.
   Look at how `liftSlotLabel` / `chartFamily` / `splitPanelCounter`
   are mirrored across renderers (each has a sibling-implementations
   header comment) for the established pattern.
3. **`lattice-runtime.js`** — DOM-walk fallback for marp-vscode
   preview cases where the parse-time rule can't reach (e.g. content
   injected by a later transform). May not be needed if (1) covers
   the preview path; verify before adding.

### Suggested file layout

- **`lib/inline-directives.js`** — single source of truth: regex,
  registry of handlers (`{ fa: renderFa, var: renderVar, ... }`),
  pure functions taking `(text, ctx)` and returning HTML strings.
  No DOM, no markdown-it dependency — same shape as
  `lib/chart-family.js`. Unit-testable in isolation.
- **`marp.config.js`** plugin → calls `lib/inline-directives.js` from
  inside a markdown-it rule.
- **`lattice-emulator.js`** → calls the same lib from its inline
  transform pass.
- **Add Font Awesome stylesheet** to `lattice.css` (CDN `@import` or
  vendored, decide based on offline-build constraint — vendoring
  matches how Google Fonts is loaded today via `@import url(...)` at
  the top of `lattice.css`, but FA's webfont CSS pulls font files
  too, so the choice has more moving parts).

### Reference parser (drop-in starting point)

Hand-rolled single-pass dispatcher. The grammar has no recursion
(directives can't nest inside backticks), so this is both the simplest
and fastest shape. ~40 lines, no PEG, no parser combinators.

```js
// lib/inline-directives.js — pure function, no DOM, no markdown-it.
// Input: text content of a code_inline token (what's between the backticks).
// Output: { kind, … } describing the directive, or null = "leave literal".

// Longest opener first; first match wins. ~8 entries, linear scan = ~30 char compares worst case.
const BRACKETS = [
  ['([', '])',  'pill'           ],
  ['((', '))',  'circle'         ],
  ['[[', ']]',  'tag-bordered'   ],
  ['[',  '>',   'chevron-right'  ],
  ['<',  ']',   'chevron-left'   ],
  ['[',  ']',   'tag'            ],
  ['(',  ')',   'chip'           ],
  ['{',  '}',   'diamond'        ],
];

const VAR_RE = /^\$([A-Za-z_][\w.]*)$/;
const NS_RE  = /^([a-z]+):(.+)$/;

function parse(text) {
  // 1) variable — first-char dispatch, O(1) reject
  if (text.charCodeAt(0) === 0x24 /* $ */) {
    const m = VAR_RE.exec(text);
    return m ? { kind: 'var', name: m[1] } : null;
  }

  // 2) bracket pill — first-char dispatch, small lookup table
  const c0 = text[0];
  if (c0 === '[' || c0 === '(' || c0 === '{' || c0 === '<') {
    for (const [open, close, shape] of BRACKETS) {
      if (!text.startsWith(open)) continue;
      const closeIdx = text.indexOf(close, open.length);
      if (closeIdx < open.length) continue;
      const tail = text.slice(closeIdx + close.length);
      if (tail && tail[0] !== ':') continue;       // tail must be empty or start with :
      const value = text.slice(open.length, closeIdx);
      if (!value) continue;
      const mods = tail ? tail.slice(1).split(':') : [];
      return { kind: 'pill', shape, value, mods };
    }
  }

  // 3) namespace prefix — single anchored regex, no backtracking
  const ns = NS_RE.exec(text);
  if (ns) return { kind: 'prefix', prefix: ns[1], value: ns[2] };

  // 4) literal — caller leaves the <code> alone
  return null;
}
```

Properties to preserve in the implementation:

- **O(n) single pass.** No backtracking, no recursion. `n` is the
  code-token text length, typically 5–30 chars.
- **First-char dispatch routes to disjoint branches** ($, brackets,
  lowercase letters). Literal text falls through without allocating.
- **No allocation on the literal path.** Return `null`; the
  markdown-it ruler leaves the token untouched — no new tokens, no
  string churn.
- **Two anchored regexes total.** Both linear, no alternation.

For a 70-page deck with ~500 inline-code tokens, total parse cost is
well under a millisecond per render. Dominant cost on preview
re-render remains mermaid and the marp pipeline — directive parsing
is dust.

**Approaches to resist:**

- PEG / parser combinators. Overkill — no recursive structure here.
- One mega-regex with alternation + capture groups. Slower and harder
  to read than the dispatch above.
- Memoization. Tokens are unique enough per deck that cache hit rate
  isn't worth the map.

Handler dispatch (separate from parsing) is a plain object keyed by
`kind` and (for `kind: 'prefix'`) by `prefix`:

```js
const PREFIX_HANDLERS = {
  fa: (value, mods) => `<i class="fa-solid fa-${escapeAttr(value)}"></i>`,
  kbd: (value, mods) => renderKbdChord(value),
  // …
};

const PILL_COLORS = ['c1','c2','c3','c4','c5','c6','c7','c8']; // → --cat-*
const PILL_SIZES  = ['sm','md','lg'];

function render(parsed, ctx) {
  switch (parsed.kind) {
    case 'var':    return ctx.vars[parsed.name] ?? `??${parsed.name}??`;
    case 'pill':   return renderPill(parsed.shape, parsed.value, parsed.mods);
    case 'prefix': {
      const h = PREFIX_HANDLERS[parsed.prefix];
      return h ? h(parsed.value) : null;  // null = warn + leave literal
    }
  }
}
```

Pill mod resolution sorts mods into axes (color = `c[1-8]`, size =
`sm|md|lg`) so `:c4:lg` and `:lg:c4` produce identical output.

### Tests to add

- `test/unit/inline-directives.test.js` — pure-function tests for
  `lib/inline-directives.js`: regex matching, var resolution,
  unknown prefix, escape via double backticks, edge cases
  (`` `$` ``, `` `:` ``, empty value).
- Cross-renderer parity assertion in `test/integration` — same input
  produces the same icon/var output through emulator and marp-cli.
- Gallery slide demonstrating each directive (probably one new slide
  in `examples/gallery.md` under a new "Inline directives" section).
  Don't forget to commit the rebuilt PDF in the same commit per
  `CLAUDE.md` ("When committing gallery edits, keep the deck and its
  rebuilt PDF in the same commit.").

### Performance — already analysed

Discussed in the originating conversation: a `markdown-it` `code_inline`
ruler is microseconds per render (markdown-it dispatches by token
type; we touch only `code_inline` tokens). The current cost of a
preview re-render is dominated by mermaid + the marp render itself.
Don't add a `MutationObserver` — the gotchas file already documents
self-trigger loops at line 480. Stay inside the existing render-pass
shape.

## Branch + handoff

- Start fresh from `main` (not from `claude/fix-emoji-rendering-WO4vI`,
  which is scoped to the emoji bugfix).
- Suggested branch: `feat/inline-directives` or
  `feat/fontawesome-vars`.
- First PR: scaffold `lib/inline-directives.js` + the markdown-it
  ruler in `marp.config.js` + `$` (vars), `fa:` (Font Awesome), and
  bracket-shape pills with `:c1`–`:c8` + `:sm`/`:lg`. Unit tests +
  one gallery slide demonstrating each. Hold `kbd:` for a follow-up
  PR to keep the diff small.

## Decisions still owed by the human before coding starts

1. Bare `` `$client` `` vs braced `` `${client}` ``.
2. Font Awesome free vs Pro (and where the kit URL lives if Pro).
3. Webfont vs SVG (recommend webfont).
4. Missing-var loudness (recommend loud `??name??`).
5. Pill default shape with no brackets at all is **not a thing** —
   `` `LIVE` `` is literal code. Confirm that's intended (the choice
   was: keep plain inline code as the escape hatch). To get the
   default-look pill, author writes `` `(LIVE)` `` (chip) or
   `` `([LIVE])` `` (full stadium). Which is the "default pill" if
   author just wants any pill? Recommend `` `(LIVE)` `` — single
   parens, lowest typing cost.
