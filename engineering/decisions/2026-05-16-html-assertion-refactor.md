---
status: design-proposal
version: 1
supersedes: none
last-status-update: 2026-05-16
---

# Proposal — replace regex-on-HTML assertions with parsed-DOM queries

> **Not yet implemented.** Captured as a follow-up to the test-infrastructure
> overhaul that landed on `claude/add-test-scoping-eWq6r`. That branch
> stops at "infrastructure" intentionally; the work below is test-content
> migration and belongs on its own branch / PR.

## The situation

`chart-family.test.js` and seven other test files assert on the
emulator's HTML output using `assert.match(html, /<some-regex>/)` and
`html.match(/.../g)`. A representative slice:

```javascript
const firstProgress = html.match(
  /<section[^>]*class="progress chart-frame"[^>]*>[\s\S]*?<\/section>/
);
assert.ok(firstProgress, 'first progress section not found');
const rows = (firstProgress[0].match(/<div class="progress-row">/g) || []).length;
assert.equal(rows, 5, `expected 5 progress-row, got ${rows}`);
```

This works, but the failure modes are bad:

- Reordering attributes (`class="a b"` → `class="b a"`) breaks regex that
  encode attribute order.
- Inserting unrelated whitespace breaks regex with `[^>]*` boundaries.
- Adding a class breaks regex that match `class="exact-string"`.
- Nesting changes break regex that assume flat siblings.
- The failure message points at "regex didn't match," not at "the
  element is missing" or "there are 4 rows instead of 5."

The intent of every one of these tests is **structural**: "the rendered
HTML has *N* of these elements," "this element has class *X*," "this
element contains that text." Regex is the wrong tool for structural
assertions; CSS-selector queries over a parsed DOM are the right one.

## Inventory

```
38  test/unit/parsing/marp-plugins.test.js
24  test/integration/parity/chart-family.test.js
21  test/unit/layouts/roadmap.test.js
14  test/unit/layouts/journey.test.js
 8  test/unit/layouts/radar.test.js
 7  test/unit/layouts/word-cloud.test.js
 5  test/unit/layouts/quadrant.test.js
 1  test/integration/parity/deck-class-fm.test.js
───
118 regex-on-HTML assertions across 8 files
```

(Count: `grep -cE "assert\.match.*\/<|\.match\(/<|matchAll\(/" <file>`.)

## Proposed shape

Add `linkedom` as a `devDependency` — modern, lightweight (~50kB
gzipped), ESM, parses an HTML string into a real `Document` with
`querySelector` / `querySelectorAll` in roughly 3 ms. Wrap it in a
small `test/helpers/dom.js`:

```javascript
const { parseHTML } = require('linkedom');

/** Parse an HTML string; return the document for querying. */
function dom(html) {
  return parseHTML(html).document;
}

module.exports = { dom };
```

Then the chart-family example above becomes:

```javascript
const { dom } = require('../../helpers/dom');

const doc = dom(getHtml());
const firstProgress = doc.querySelector('section.progress.chart-frame');
assert.ok(firstProgress, 'first progress section not found');
const rows = firstProgress.querySelectorAll('.progress-row');
assert.equal(rows.length, 5);
assert.ok(
  firstProgress.querySelector('.progress-fill[data-s="on-track"]'),
  'progress-fill[data-s=on-track] missing',
);
```

The intent is now in the assertion itself, and the failure messages
become "element not found at selector X" instead of "regex didn't
match against 50kB of HTML."

### Why `linkedom`, not the alternatives

| Library | Verdict |
| --- | --- |
| `linkedom` | **Yes.** Lightweight, ESM-first, real DOM API, fast cold parse. |
| `cheerio` | Defensible. jQuery-style API may feel dated to anyone who learned the DOM after 2016. |
| `jsdom` | Overkill — pulls in a full browser-like environment (CSS engine, layout, XHR). Slow to load. |
| `happy-dom` | Lightweight, similar profile to linkedom. Slightly less mature. |
| `@xmldom/xmldom` + `xpath` | XPath is powerful but most CSS-selector use cases are simpler; only reach for XPath when text-content matching or sibling axes are required. |

### Why not snapshot testing for these

Snapshots collapse the assertion to "this output matches the saved
file." That's appealing for sprawling output, but it has costs the
current style avoids:

- The assertion is implicit. A reviewer reading the test can't see
  what specifically matters about the output without opening the
  snapshot file.
- The "looks right, commit it" cycle erodes correctness over time —
  developers update snapshots without verifying.
- Snapshots make moving the renderer (palette tweak, attribute order
  change) noisy: every test re-records even when nothing meaningful
  changed.

CSS-selector queries keep the assertion **explicit and intent-bearing**
without the regex fragility. Snapshots remain on the table for a
future test where the output is genuinely too sprawling to assert
piece-by-piece — none of the current tests qualify.

## Scope of the work

Full sweep, not pilot. The codebase's stated value is no tech debt;
leaving 118 regex assertions in place while the new pattern lives in
one file is exactly the kind of split that rots into "the old way and
the new way" forever.

Order of conversion (small files first to validate the helper, large
files last when the pattern is settled):

1. `deck-class-fm.test.js` (1 assertion) — already half-converted; one
   query to update.
2. `quadrant.test.js` (5)
3. `word-cloud.test.js` (7)
4. `radar.test.js` (8)
5. `journey.test.js` (14)
6. `roadmap.test.js` (21)
7. `chart-family.test.js` (24)
8. `marp-plugins.test.js` (38) — biggest, last, after the pattern is
   battle-tested on the others.

Each conversion is structurally:
- Replace the inline regex with a `dom(html)` call at the top.
- Convert `assert.match(html, /<X>/)` → `assert.ok(doc.querySelector('X'))`.
- Convert `html.match(/<X>/g).length === N` →
  `assert.equal(doc.querySelectorAll('X').length, N)`.
- Convert "find section, then count children inside" two-step regex
  into nested `querySelector` calls.
- Verify the test still fails when the assertion should fail (mutation
  test: change the expected count by 1 before merging).

## Estimated cost

- Helper + linkedom install + dom.js: ~20 minutes.
- Conversion: ~3 minutes per assertion average — some are mechanical
  one-liners, some need restructuring of the section-finding logic.
  118 × 3 min ≈ **5–6 hours of careful work**.
- Verification: re-run unit + cheap integration after each file;
  full integration suite once at the end. **Add 30 min.**
- Total: **half a working day**, single contributor.

Worth noting: the conversion will likely surface **latent assertion
gaps** — places where the regex was loose enough to tolerate a real
change that querySelector wouldn't. Each surfaced gap is a decision:
tighten the new assertion, or accept the looser version intentionally
and document why. Budget another 1–2 hours for those.

## Risks

- **False failures from previously-tolerant regex.** A regex like
  `class="progress chart-frame"` was order-sensitive; the new
  `'section.progress.chart-frame'` is order-insensitive (CSS classes
  don't have a meaningful order). So the new test is *correctly*
  stricter — good — but may flag historical output that was always
  "wrong but tolerated." Handle case-by-case.
- **linkedom parse quirks.** linkedom is faithful but isn't a browser.
  Edge cases in custom elements, malformed input, or namespaces can
  diverge from Chromium. The emulator's output is clean HTML, so this
  is theoretical. Surface and fix the day a divergence appears.
- **Test-runtime cost.** linkedom parses fast (~3 ms per call), but
  118 parse calls × ~3 ms = ~350 ms added to the unit suite. Mitigate
  by parsing once per file (already the pattern in chart-family.test.js
  via `getHtml()` memoization — extend to `getDoc()`).

## Out of scope (deliberately)

- **Snapshot testing.** Tracked separately if a future test legitimately
  needs it.
- **Migration to Vitest / Jest / etc.** Not justified by this change.
  `node:test` plus `linkedom` is the smallest move that fixes the
  smell.
- **JSDoc types on the helper.** `linkedom`'s types come with the
  package; the helper's surface (one function returning Document) is
  trivial enough to leave untyped.

## When to do this

After the test-infrastructure branch (`claude/add-test-scoping-eWq6r`)
merges. That branch is purely *how tests run*; this work is purely
*how tests assert*. Keeping them separate gives each PR a clean
review scope and lets the infrastructure changes settle before
test bodies start moving.

## Cross-cutting rule that lands with the work

In `engineering/development.md`:

> **HTML-shape assertions use `test/helpers/dom.js`, not regex.**
> Parse with `dom(html)`, query with `querySelector` / `querySelectorAll`.
> Regex on HTML is reserved for sentinel checks where the structure
> doesn't matter (e.g., "the file contains the string `@charset`").
