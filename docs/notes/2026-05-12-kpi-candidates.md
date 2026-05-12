---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · KPI redesign candidates v2"
style: |
  /* ─────────────────────────────────────────────────────────────────────
   * Shared base
   * ───────────────────────────────────────────────────────────────────── */
  section[class*="kpi-"] { display: flex; flex-direction: column; }
  section[class*="kpi-"] h2 {
    font-size: var(--fs-lg);
    margin: 0 0 var(--sp-lg) 0;
  }
  section[class*="kpi-"] > ol,
  section[class*="kpi-"] > ul {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
  }
  section[class*="kpi-"] > ol > li::marker,
  section[class*="kpi-"] > ul > li::marker { content: ''; }
  section[class*="kpi-"] > ol > li > ul,
  section[class*="kpi-"] > ul > li > ul {
    list-style: none; padding: 0; margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 1. STATUS GRID — fill the canvas with the numbers. 2-up to 3-up
   *    auto-fit grid; numerals at fs-hero (110px) dominate every cell.
   *    Target line promoted to peer weight via --accent (no longer muted).
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-status > ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
    grid-auto-rows: 1fr;
    gap: var(--sp-xl) var(--sp-2xl);
    align-content: stretch;
  }
  section.kpi-status > ol > li {
    display: flex; flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    min-width: 0;
    padding-top: var(--sp-md);
    border-top: 2px solid var(--text-heading);
  }
  section.kpi-status > ol > li > strong {
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--fs-hero);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 0.92;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    margin-bottom: var(--sp-sm);
  }
  section.kpi-status > ol > li > ul > li:first-child {
    font-size: var(--fs-content);
    color: var(--text-heading);
    font-weight: 600;
    line-height: var(--lh-snug);
  }
  section.kpi-status > ol > li > ul > li + li {
    font-size: var(--fs-emphasis);
    font-family: var(--font-mono);
    color: var(--accent);
    font-weight: 500;
    margin-top: var(--sp-xs);
    letter-spacing: 0.02em;
  }
  /* Demo-only status colouring. Production would expose pass/warn/fail
   * as a per-cell modifier; here the colours show what's possible. */
  section.kpi-status.demo > ol > li:nth-child(1) {
    border-top-color: var(--warn);
  }
  section.kpi-status.demo > ol > li:nth-child(1) > ul > li + li {
    color: var(--warn);
  }
  section.kpi-status.demo > ol > li:nth-child(2),
  section.kpi-status.demo > ol > li:nth-child(3),
  section.kpi-status.demo > ol > li:nth-child(4) {
    border-top-color: var(--pass);
  }
  section.kpi-status.demo > ol > li:nth-child(2) > ul > li + li,
  section.kpi-status.demo > ol > li:nth-child(3) > ul > li + li,
  section.kpi-status.demo > ol > li:nth-child(4) > ul > li + li {
    color: var(--pass);
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 2. GAP-BAR — the gap to target IS the slide. Each row shows label
   *    + a literal progress bar coloured by status (pass / warn / fail),
   *    with the current number on the right.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-gap > ol {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
  }
  section.kpi-gap > ol > li {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 2fr);
    grid-template-rows: auto auto;
    column-gap: var(--sp-xl);
    row-gap: var(--sp-sm);
    padding: var(--sp-sm) 0;
    --pct: 100;
    --status: var(--pass);
  }
  section.kpi-gap > ol > li:nth-child(1) { --pct: 95; --status: var(--warn); }
  section.kpi-gap > ol > li:nth-child(2) { --pct: 100; --status: var(--pass); }
  section.kpi-gap > ol > li:nth-child(3) { --pct: 100; --status: var(--pass); }
  section.kpi-gap > ol > li:nth-child(4) { --pct: 100; --status: var(--pass); }

  section.kpi-gap > ol > li > ul { display: contents; }
  section.kpi-gap > ol > li > ul > li:first-child {
    grid-column: 1; grid-row: 1;
    font-size: var(--fs-content);
    color: var(--text-heading);
    font-weight: 600;
    align-self: end;
  }
  section.kpi-gap > ol > li > strong {
    grid-column: 2; grid-row: 1;
    text-align: right;
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--fs-stat);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    align-self: end;
  }
  section.kpi-gap > ol > li::after {
    content: '';
    grid-column: 1; grid-row: 2;
    height: 14px;
    background: linear-gradient(to right,
      var(--status) 0% calc(var(--pct) * 1%),
      var(--bg-alt) calc(var(--pct) * 1%) 100%);
    border-radius: 999px;
    align-self: start;
  }
  section.kpi-gap > ol > li > ul > li + li {
    grid-column: 2; grid-row: 2;
    text-align: right;
    font-size: var(--fs-label);
    font-family: var(--font-mono);
    color: var(--text-muted);
    align-self: start;
    letter-spacing: 0.02em;
  }
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "KPI redesign · v2 candidates" -->

# KPI redesign — round two

`Internal review · 2026-05-12`

Round one failed on direction, not tuning. The five v1 layouts under-sold
the numbers and treated status as decoration. Two new directions here.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Before · the shipped layout" -->

`The starting point`

## What we're replacing — chunky cards, rainbow stripes, no hierarchy.

---

<!-- _class: kpi target -->
<!-- _footer: "Shipped — kpi · kpi target" -->

## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - target 99%, +2pp QoQ
2. **8 ms**
   - p99 detokenize
   - target 10 ms, -3 ms QoQ
3. **0**
   - Examiner findings
   - target 0, flat
4. **3.2×**
   - Detokenize headroom
   - target 2×, +0.4× QoQ

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "After · the two new directions" -->

`The redesign`

## Make the numbers loud. Let status carry the colour.

---

<!-- _class: kpi-status demo -->
<!-- _footer: "Candidate A · kpi-status — fill the canvas" -->

## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - target 99% · -5pp
2. **8 ms**
   - p99 detokenize
   - target 10 ms · -2 ms
3. **0**
   - Examiner findings
   - target 0 · flat
4. **3.2×**
   - Detokenize headroom
   - target 2× · +1.2×

---

<!-- _class: kpi-gap -->
<!-- _footer: "Candidate B · kpi-gap — the gap is the slide" -->

## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - target 99%
2. **8 ms**
   - p99 detokenize
   - target 10 ms
3. **0**
   - Examiner findings
   - target 0
4. **3.2×**
   - Detokenize headroom
   - target 2×

---

<!-- _class: kpi-status -->
<!-- _footer: "kpi-status · neutral (no demo modifier)" -->

## Same layout without the demo status colours — for general use.

1. **94%**
   - Token-issuance success
   - target 99% · +2pp QoQ
2. **8 ms**
   - p99 detokenize
   - target 10 ms · -3 ms QoQ
3. **0**
   - Examiner findings
   - target 0 · flat
4. **3.2×**
   - Detokenize headroom
   - target 2× · +0.4× QoQ
