---
status: proposed
summary: The Studio topbar packs ~9–15 controls into one 54px row; on a portrait phone (~390px) it is visibly cramped. This designs the information architecture for that bar — (1) collapse theme + light/dark into one Appearance control, (2) introduce a responsive overflow ("⋯ More") that folds secondary controls into a single dropdown on compact widths while desktop keeps the full bar, and (3) decide the primary-vs-overflow split per breakpoint across BOTH portrait phone (mobile tier, <700px) and landscape phone (tablet tier, 700–1099px). It reuses existing primitives (ThemeMenuItems, Radix DropdownMenu, the ⌘K CommandPalette) per HARD RULE #15, and is red-teamed by Munger inversion + an independent checker before any code.
---

# Studio topbar information architecture — appearance grouping + responsive overflow

*2026-06-30 · status: proposed (design only; no code until confirmed)*

## Problem

The Studio topbar is one 54px row carrying, for an onboarded user, up to ~15
controls: workspace launcher, deck switcher, ⌘K search, theme, light/dark,
Present, Share, Focus, Architect toggle, Inspector toggle, Library, Workspace
settings, avatar. On a **portrait phone (~390px)** that's visibly cramped (user
report + screenshot); on a **landscape phone / small tablet (700–1099px)** it's
busy but breathing. Desktop (≥1100px) has room.

The asks: group **theme + color mode**; fold **other** controls into a single
**dropdown** on mobile; and decide whether that grouping should **extend to
tablet and desktop**, considering **portrait and landscape** phones.

## Breakpoints (the fixed constraints)

`use-breakpoint.ts`: **mobile <700**, **tablet 700–1099**, **desktop ≥1100**.
So **portrait phone → mobile tier**; **landscape phone (~844) → tablet tier**.
`compact = mobile || tablet` (≤1099). The redesign keys off these existing tiers
— it introduces no new breakpoint.

## Principles

1. **Primary actions stay one tap; secondary collapse.** The deliverable verbs
   (Present, Share) and the working-panel toggles must not require digging.
2. **Reveal, don't bury (discoverability).** An overflow is only safe if what it
   hides is genuinely secondary AND there's a second path (⌘K already mirrors
   every action). Hiding a *frequent* control behind a menu is a regression.
3. **Group by meaning.** Theme + mode are one concept ("appearance"); they belong
   together regardless of width.
4. **Reuse, don't fork (#15).** Use `ThemeMenuItems`, Radix `DropdownMenu`, and
   the existing `CommandPalette`; do not invent a bespoke menu widget.
5. **Desktop is not the problem — don't regress it.** Whatever helps the phone
   must not make the spacious desktop bar worse (an overflow there hides
   one-click controls power users want).

## The design

### A. Appearance grouping (all breakpoints)
Theme picker + light/dark collapse into **one "Appearance" control**:
- **Desktop / tablet:** a single bordered **segment** — the theme dropdown
  trigger and the light/dark toggle sit in one rounded group (visually unified,
  but the mode toggle stays a **direct one-tap** button). This satisfies
  "grouped" without burying the frequently-used mode toggle (see Munger §M5).
- **Mobile:** the segment collapses to **one Appearance popover** (palette icon)
  whose first row is the light/dark toggle, then the `ThemeMenuItems` list.
  −1 icon where space is tightest; mode is 2 taps on mobile only.

### B. Responsive overflow ("⋯ More") on compact only
A single trailing **`⋯` button → Radix `DropdownMenu`** appears at **≤1099px
(compact: portrait phone + landscape phone + tablet)**; **desktop (≥1100) keeps
the full bar** (no overflow — principle 5).

Primary-vs-overflow split, per tier:

| Tier (width) | Left | Right primary | In "⋯ More" |
|---|---|---|---|
| **Desktop ≥1100** | launcher · deck switcher | ⌘K · Appearance · Present · Share · Focus · Architect · Inspector · Library · Workspace · avatar | — (no overflow) |
| **Tablet 700–1099** (landscape phone, small tablets) | launcher · deck switcher | Present · Share · Architect · Inspector · ⋯ | Appearance · Library · Workspace · Search/commands |
| **Mobile <700** (portrait phone) | launcher · deck switcher | Present · Share · ⋯ | Appearance · Architect · Inspector · Library · Workspace · Search/commands |

Rationale for the split:
- **Present + Share are always primary** — the two deliverable verbs.
- **Architect + Inspector stay primary on tablet** (room exists) but **fold into
  ⋯ on portrait** (tightest). On portrait the panels open as full sheets anyway,
  so one extra tap to reach them is acceptable.
- **Appearance is secondary** (you set it rarely) → overflow on all compact tiers.
- **Search/commands** in ⋯ gives touch users the ⌘K surface they otherwise can't
  reach (⌘K is keyboard-only and hidden <1100).

### C. The pulse interaction (depends on #635)
PR #635 (open) adds a one-time **pulse on the Inspector toggle** after a
newcomer's first edit. On **portrait**, the Inspector toggle lives *inside* ⋯ —
a pulse in a closed menu is invisible. **Resolution:** when the Inspector control
is in the overflow, **mirror the pulse onto the ⋯ trigger** (and open-then-
highlight on expand). On tablet/desktop the Inspector is on the bar, so the pulse
is direct. *(This is why #635 should land first or this must be built against it
— see Sequencing.)*

## Why not the alternatives
- **One overflow on ALL widths (incl. desktop):** rejected — hides one-click
  controls on a bar that has room; net negative for the primary (power-user)
  surface (principle 5).
- **Make ⋯ just open the existing CommandPalette:** tempting reuse, but a command
  *list* can't host theme swatches or a light/dark toggle well; ⋯ needs to be a
  settings-style menu. We still surface "Search/commands" *inside* ⋯ as a row that
  opens the palette — reuse without forcing the wrong widget.
- **Single Appearance popover everywhere (mode always 2 taps):** rejected on
  desktop/tablet where room exists — keep mode one-tap there (Munger §M5).

## Munger inversion — how would this make the Studio *worse*?
*(Invert: enumerate the failure modes, then design against each.)*

- **M1 — A "junk drawer" ⋯ that's a worse ⌘K.** If everything lands in ⋯, it's an
  unsorted dump. *Guard:* ⋯ holds a short, fixed, semantically-secondary set;
  power discovery stays ⌘K; ⋯ is compact-only.
- **M2 — Buried deliverables.** If Present/Share go in ⋯, users can't find how to
  export/present. *Guard:* Present + Share are primary at every tier.
- **M3 — The #635 pulse dies in a closed menu** → newcomers never find the
  Inspector. *Guard:* mirror the pulse to ⋯ when the Inspector is inside it (§C).
- **M4 — Two competing overflow surfaces (⋯ and ⌘K)** confuse. *Guard:* they
  don't co-exist visibly — ⌘K is hidden <1100 (no keyboard), so ⋯ *is* the touch
  overflow; on desktop ⋯ is absent and ⌘K rules. One overflow per tier.
- **M5 — Grouping makes the frequent mode toggle slower** (1 tap → 2). *Guard:*
  keep mode a direct toggle inside a bordered Appearance *segment* on
  desktop/tablet; only collapse to a popover (2 taps) on mobile where space forces
  it.
- **M6 — Overflow icon doesn't scan / no label.** A bare `⋯` is ambiguous and the
  avatar/Workspace lost their home. *Guard:* the trigger has an aria-label
  ("More controls") + a visible tooltip; everything it contains keeps its label.
- **M7 — Regrouping silently breaks the test surface.** Tests query topbar
  buttons by aria-label (Library, Workspace, Present, Share, toggles). *Guard:*
  preserve every aria-label verbatim; jsdom renders at the desktop tier (full
  bar), so existing tests keep finding them; add explicit compact-tier tests that
  open ⋯ and assert the moved controls.
- **M8 — Landscape phone falls in a bad middle.** A 844px landscape phone is the
  *tablet* tier — if we tuned only for 390px it could look sparse or wrong at
  844px. *Guard:* the split is defined per tier (tablet keeps panels primary), and
  visual review covers 390 portrait, 844 landscape, 820 tablet, 1440 desktop.
- **M9 — Two open PRs touch the same topbar (#635 + this) → merge conflict /
  stacked-PR risk (#17).** *Guard:* see Sequencing — fold into #635 or land #635
  first; never a stacked chain.

## Sequencing (HARD RULE #17)
This edits the same topbar as the open #635. Options: **(a) fold into #635** (same
area, not yet merged — "increment in place"), or **(b) land #635 first, then this
as its own PR off the new main.** Either avoids a stacked chain; the owner picks.

## Test + verification plan
- Unit: Appearance segment/popover renders theme + mode; aria-labels preserved
  (M7); compact-tier tests open ⋯ and assert Library/Workspace/Appearance live
  inside it; desktop renders the full bar.
- Visual (HARD RULE Quality Bar — required at all widths): **390 portrait, 844
  landscape, 820 tablet, 1440 desktop**, light + dark, screenshot evidence.
- The pulse-in-⋯ mirror (M3) verified in a real browser (jsdom can't fire it).

## Open questions for the owner
1. **Split:** is "Present + Share always primary; panels primary on tablet, in ⋯
   on portrait" the right cut — or keep Architect/Inspector primary on portrait
   too (tighter bar) / fold Present or Share into ⋯ (rejected here)?
2. **Appearance:** segment-with-1-tap-mode on desktop/tablet + popover on mobile
   (recommended), or one popover everywhere (simpler, mode always 2 taps)?
3. **Sequencing:** fold into #635, or land #635 first then a fresh PR?
