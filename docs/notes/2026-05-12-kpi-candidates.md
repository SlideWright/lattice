---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · KPI redesign · round three"
style: |
  /* ─────────────────────────────────────────────────────────────────────
   * kpi-board — boardroom-grade earnings-report layout.
   *
   *   Eyebrow (h3, mono small caps)                   ┐
   *   Headline (h2, Playfair display)                 │ all three on a
   *   1.5px hairline rule                             ┘ shared top stack
   *
   *   ┌ Token-issuance success           94%   target 99% · -5pp
   *   │ p99 detokenize                  8 ms   target 10 ms · -2 ms
   *   │ Examiner findings                  0   target 0 · flat
   *   └ Detokenize headroom             3.2×   target 2× · +1.2×
   *
   *   1.5px closing rule, mono source line in muted small caps.
   *
   * Status communicated by a single warn-colour leader bar on the
   * underperforming row (and that row's gap text in --warn). Author
   * picks which row gets the callout via a per-row class; the `demo`
   * modifier here hardcodes it to li#1 for inspection.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-board {
    display: flex;
    flex-direction: column;
  }
  section.kpi-board h3 {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0 0 var(--sp-xs) 0;
  }
  section.kpi-board h2 {
    font-family: var(--font-display);
    font-size: var(--fs-2xl);
    font-weight: 700;
    color: var(--text-heading);
    line-height: var(--lh-tight);
    margin: 0 0 var(--sp-sm) 0;
    padding-bottom: var(--sp-xs);
    border-bottom: 1.5px solid var(--text-heading);
  }
  section.kpi-board > ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  section.kpi-board > ol > li::marker { content: ''; }
  section.kpi-board > ol > li > ul { display: contents; }
  section.kpi-board > ol > li > ul > li::marker { content: ''; }
  section.kpi-board > ol > li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content max-content;
    align-items: baseline;
    column-gap: var(--sp-2xl);
    padding: var(--sp-xs) 0 var(--sp-xs) var(--sp-md);
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  section.kpi-board > ol > li:last-child {
    border-bottom: 1.5px solid var(--text-heading);
  }
  section.kpi-board > ol > li > ul > li:first-child {
    grid-column: 1;
    font-size: var(--fs-content);
    font-weight: 500;
    color: var(--text-heading);
    letter-spacing: -0.005em;
  }
  section.kpi-board > ol > li > strong {
    grid-column: 2;
    font-family: var(--font-display);
    font-size: var(--fs-stat);
    font-weight: 700;
    color: var(--text-heading);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
    line-height: 1;
    text-align: right;
    min-width: 5ch;
  }
  section.kpi-board > ol > li > ul > li + li {
    grid-column: 3;
    font-size: var(--fs-emphasis);
    font-family: var(--font-mono);
    color: var(--text-muted);
    text-align: right;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    min-width: 18ch;
    white-space: nowrap;
  }
  /* Source line — last paragraph in the slide. */
  section.kpi-board > p:last-of-type {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: var(--sp-md) 0 0 0;
  }

  /* Demo: warn-coloured leader bar on li#1, warn gap text. */
  section.kpi-board.demo > ol > li:nth-child(1)::before {
    content: '';
    position: absolute;
    left: 0;
    top: 18%;
    bottom: 18%;
    width: 4px;
    background: var(--warn);
  }
  section.kpi-board.demo > ol > li:nth-child(1) > ul > li + li {
    color: var(--warn);
  }
  /* Stress test: warn + fail mixed. */
  section.kpi-board.mixed > ol > li:nth-child(1)::before,
  section.kpi-board.mixed > ol > li:nth-child(3)::before {
    content: '';
    position: absolute;
    left: 0;
    top: 18%;
    bottom: 18%;
    width: 4px;
  }
  section.kpi-board.mixed > ol > li:nth-child(1)::before { background: var(--warn); }
  section.kpi-board.mixed > ol > li:nth-child(3)::before { background: var(--fail); }
  section.kpi-board.mixed > ol > li:nth-child(1) > ul > li + li { color: var(--warn); }
  section.kpi-board.mixed > ol > li:nth-child(3) > ul > li + li { color: var(--fail); }
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "KPI redesign · round three" -->

# KPI redesign — round three

`Internal review · 2026-05-12`

Earlier rounds had the wrong look. This one targets boardroom-grade
typography: earnings-report numerals, hairline rules, a single warn
callout. No card chrome, no rainbow.

---

<!-- _class: kpi target -->
<!-- _footer: "Before · shipped" -->

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

<!-- _class: kpi-board demo -->
<!-- _header: '' -->
<!-- _footer: "After · kpi-board with single warn callout" -->

### Authentication · Q4 2026

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

<!-- _class: kpi-board -->
<!-- _header: '' -->
<!-- _footer: "kpi-board · neutral — everything on track" -->

### Treasury operations · Q4 2026

## Liquidity, settlement, and counter-party metrics all met plan.

1. **$2.4B**
   - Average daily settlement
   - target $2.0B · +20%
2. **99.97%**
   - Cash-sweep accuracy
   - target 99.9% · +0.07pp
3. **3.1**
   - Counter-party diversity index
   - target 3.0 · +0.1
4. **$0**
   - Reconciliation breaks
   - target $0 · flat

---

<!-- _class: kpi-board mixed -->
<!-- _header: '' -->
<!-- _footer: "kpi-board · mixed status (stress test)" -->

### Risk posture · Q4 2026

## Two metrics off plan; the rest on track.

1. **17 days**
   - Mean time to remediate critical findings
   - target 14 days · +3 days
2. **96.4%**
   - Patch coverage on production fleet
   - target 95% · +1.4pp
3. **4**
   - Open Sev-1 incidents
   - target 0 · +4
4. **1.8×**
   - Insurance coverage ratio
   - target 1.5× · +0.3×
