# Lead first-hand verifications (Opus, viewed renders directly)

- **kpi header/eyebrow collision — CONFIRMED P0.** kpi.gallery.light p2: top-left
  shows "LATTEFINANCPAL · Q4 2026" — running header `LATTICE` overprinted with
  eyebrow `FINANCIAL` on the same baseline. Root cause (per evidence checker):
  `section.kpi padding-top:1.875cqi` == absolute `header top:1.875cqi`; absolute
  header doesn't displace flow content, so the first h3 lands in the header band.
  Affects 11/13 gallery slides, light+dark. SEVERITY: ship-blocker.
  - Also visible: informal ✦ sparkle glyph top-right of the hero KPI panel (same
    glyph `featured` uses; reads as decorative clip-art in a boardroom number slide).

- **diagram dark-mode failure — CONFIRMED HIGH.** diagram.gallery.dark:
  - p4 flowchart: edge labels ("scored signal", "recalibration", "decide / close")
    render as **opaque white boxes** on the dark navy canvas — look like rendering
    errors. edgeLabelBackground not themed for dark.
  - p5 sequence: message/signal text along lifelines is **near-invisible**
    (dark-on-dark); a yellow note box ("decision logged on close") clips a lifeline.
  - Irony: both slides' KEY INSIGHT panel literally says "Full theme support —
    edge labels / signal colors all controllable via themeVariables" while the
    render disproves it in dark mode. The dark themeVariables injection omits
    edgeLabelBackground / signalColor / messageText / noteBkg.
  - The two MOST-used diagram types (flowchart, sequence) are the ones that break.

- **piechart undersized — CONFIRMED (via chart-A checker, consistent w/ static).**
  disc locked at 25cqi in ALL variants incl. cover; floats small with dead canvas.

- **diagram gallery intro (p2) overflow:** the third "Themeable" card runs off the
  bottom edge of the author-owned intro slide (minor, author-deck content bug).
