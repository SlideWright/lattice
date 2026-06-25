---
status: proposed
summary: Retire the four landscape-only locks (kanban, compare-code, compare-table, redline) so EVERY layout has a portrait form and the Persona-2 phone export covers the whole catalog. A layout is locked only because it breaks in a narrow box; the honest fix is to give it a portrait form, not forbid portrait. Adds a new Fit-Ladder move — RESHAPE — for layouts that can't collapse/shed/paginate to fit the target box: a read-across table TRANSPOSES to card-per-row (column headers become in-card labels), which is vertically paginable, so cover-paginate then fits. Data-preserving (axiom 4), no shrink (floor intact). The balloon guard (already built) routes horizontal overflow to RESHAPE instead of the ring. Amends the-fit-spine.md §3. Decomposed one-PR-per-layout (HARD #17): compare-table first (it is #499, and the hardest case), then compare-code/redline/kanban. Supersedes the landscape-only quarantine in the spine §8 red-team.
---

# Retire landscape locks — a portrait form for every layout (Persona 2)

**Date:** 2026-06-25 · **Status:** Proposed — **compare-table** is instance #1 (in
progress, #499); compare-code/redline/kanban follow as separate PRs · **Decision
owner:** maintainer · **Amends:** `2026-06-22-the-fit-spine.md` §3 (adds the
RESHAPE move), §5/§8 (retires the landscape-only quarantine).

## 0. The mandate

> *"Nothing should be landscape-locked. We auto-split everything thoughtfully and
> fulfil the mission of supporting Persona 2."* — maintainer, 2026-06-25.

Persona 2 is the emailed-link reader who opens a deck **on their phone** and
receives the per-device (portrait) build-time export (`forms.md`; the Option-B
doc §5). If a layout has **no portrait form**, Persona 2 gets a hole in the deck.
Four layouts are landscape-locked today, so four holes. This doc closes them.

## 1. Why a lock is the wrong tool

A layout is landscape-locked (`lint-core.js` `LANDSCAPE_ONLY_LAYOUTS`) because it
breaks in a narrow box — a wide read-across table overflows horizontally, a kanban
of five lanes can't sit side-by-side on a phone. The lock makes that *the author's
problem* (a lint error in a portrait deck). But the spine's own axiom 2 says **a
look is a function of the box** — the box changing is not a mode, it's an argument.
So the honest answer to "this breaks in portrait" is **give it a portrait form**,
not forbid the box. The lock is a `single-orientation` escape hatch that, like the
de-boost before it, quietly caps the product's reach. It earns deletion.

## 2. The new Fit-Ladder move — RESHAPE

The spine's Fit Ladder is COLLAPSE → SHED → SPLIT → FLOOR (§3). A read-across table
in a narrow box defeats all four:

- **Collapse** can't help — the columns *are* the comparison; narrowing them past
  the floor is illegible.
- **Shed** can't help — every row and column is authored data; dropping one is the
  silent content-loss axiom 4 forbids.
- **Split** (row-pagination) can't help — it divides *vertically*; the overflow is
  *horizontal*. Row-splitting a too-wide table is futile and balloons the deck
  (the obligation-matrix failure mode; #500).

So we add a fifth move, between SHED and SPLIT:

> **RESHAPE — transform the content into an equivalent structure that the box
> *can* fit, losing no datum.** When a layout's native structure can't be made to
> fit by collapse/shed/paginate, re-author it into a form that paginates. The
> canonical case: a **read-across table TRANSPOSES to card-per-row** — each row
> becomes a card; the column headers become in-card labels.

Worked example — `Build vs Buy vs Delay`:

```
   landscape (native table)            portrait (RESHAPE → card-per-row)
   ┌────────┬───────┬──────┬───────┐    ┌─────────────────────────┐
   │        │ Build │ Buy  │ Delay │    │ Cost                    │
   ├────────┼───────┼──────┼───────┤    │   Build:  $1.2M         │
   │ Cost   │ $1.2M │ $400k│  $0   │ →  │   Buy:    $400k         │
   │ Time   │ 9 mo  │ 6 wk │  —    │    │   Delay:  $0            │
   │ Risk   │ High  │ Med  │ High  │    ├─────────────────────────┤
   └────────┴───────┴──────┴───────┘    │ Time   Build: 9 mo  …   │
                                        └─────────────────────────┘
   one wide slide that clips on a       cards stack + paginate; cover-paginate
   phone                                gives the accent cover → card pages
```

RESHAPE is **build-time** (like SPLIT) and **data-preserving** (axiom 4) and
**never shrinks** (the floor is untouched — cards use the portrait type scale). It
is *not* live runtime re-pagination (that's the Option-B doc); this is the
per-device export the spine already owns.

### How it composes with the balloon guard (already built)

The emulator measure gate now distinguishes **structural** carousels (reduce
horizontal extent) from **vertical paginators** (`lattice-emulator.js`,
`WIDTH_REDUCING_STRATEGIES`): a vertical paginator is marked splittable on
*vertical* overflow only, so a too-wide table no longer futile-row-splits. RESHAPE
gives that horizontal-overflow case a **destination**: transpose to cards, then
the (now vertical) overflow cover-paginates. Guard + RESHAPE are the two halves of
"a wide table fits portrait without ballooning."

## 3. The four locks, and each one's portrait form

| Layout | Why locked | Portrait form (RESHAPE) | PR |
|---|---|---|---|
| **compare-table** | wide read-across `<table>` | transpose → card-per-row → cover-paginate | **#499 — instance #1, this branch** |
| **compare-code** | side-by-side code columns | *already has* `cover-code` (one block per page, full width) — likely just drop the lock + verify | follow-up |
| **redline** | two-column before/after diff | stack the versions (before over after) per change, paginate | follow-up |
| **kanban** | N lanes side-by-side | stack lanes; paginate cards within a lane (lane = the card title) | follow-up |

Each is **one PR** (HARD #17), each export-affecting → each gets a light+dark
render and maintainer sign-off before merge. compare-table lands the RESHAPE
mechanism + the transpose transform the others reuse.

## 4. Spine amendments (made when this ratifies)

- **§3 Fit Ladder** — insert RESHAPE between SHED and SPLIT; note it is build-time,
  data-preserving, no-shrink, and the move read-across layouts reach for instead of
  the ring.
- **§5 / §8** — retire "read-across tables are quarantined `single-orientation:
  ['landscape']`" and "live runtime re-pagination" is unrelated; the quarantine is
  replaced by RESHAPE. `LANDSCAPE_ONLY_LAYOUTS` empties out as each PR lands.
- The **landscape no-op** for auto-split (#504) stays for layouts that genuinely
  resolve overflow by collapse/shed in a wide box; read-across layouts are exempt
  because RESHAPE/SPLIT is their only honest fit (a too-tall landscape table
  cover-paginates; a too-wide one transposes).

## 5. Decomposition & sequence

1. **compare-table (#499, this PR)** — remove its lock; add the `transpose`
   reshape (a new `carousel.js` strategy or a pre-split transform) wired so a
   portrait compare-table that overflows reshapes → cover-paginates; carry the
   cover's `--spectrum` tell (the maintainer's "subtle hybrid" pick, already
   wired). Demo deck + light/dark render + sign-off. Establishes the mechanism.
2. **compare-code** — drop the lock, verify the existing `cover-code` split covers
   portrait; minimal.
3. **redline** — stack-per-change reshape.
4. **kanban** — stack-lanes reshape.

## 6. Open questions (resolved per-PR, not blocking this model)

1. **Transpose grammar** — does the FIRST column become the card title (recommended:
   the row's subject leads the card) or a labelled field like the rest? Settle on
   compare-table, reuse.
2. **Card visual** — the card-per-row treatment must read as the same deck as the
   native table (hairlines, mono labels). A render-off, signed off per layout.
3. **lint** — `LANDSCAPE_ONLY_LAYOUTS` shrinks per PR; the `single-orientation`
   adapt mode is replaced by the layout's portrait form. Keep the gate; retarget it.
4. **Authoring-time signal** — a portrait deck using a (formerly) locked layout no
   longer lints as an error; the capacity/overflow advisory still applies.
