---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · KPI redesign candidates"
style: |
  /* ─────────────────────────────────────────────────────────────────────
   * Shared base — applies to every candidate.
   * ───────────────────────────────────────────────────────────────────── */
  section[class*="kpi-"] { display: flex; flex-direction: column; }
  section[class*="kpi-"] h2 { font-size: var(--fs-lg); margin: 0 0 var(--sp-lg) 0; }
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
  section[class*="kpi-"] > p {
    font-size: var(--fs-label);
    font-style: italic;
    color: var(--text-muted);
    margin-top: var(--sp-md);
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 1. ANCHOR — hero on the left, supporting stacked right with hairlines.
   * Works for 3 or 4 items (1 hero + 2 or 3 supporting).
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-anchor > ol {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    grid-template-rows: repeat(3, 1fr);
    column-gap: var(--sp-2xl);
  }
  section.kpi-anchor > ol > li {
    min-width: 0;
  }
  section.kpi-anchor > ol > li:first-child {
    grid-column: 1;
    grid-row: 1 / -1;
    border-right: 1px solid var(--border);
    padding-right: var(--sp-2xl);
    display: flex; flex-direction: column;
    justify-content: center;
  }
  section.kpi-anchor > ol > li:not(:first-child) {
    grid-column: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: baseline;
    column-gap: var(--sp-lg);
    padding: var(--sp-md) 0;
    border-top: 1px solid var(--border);
  }
  section.kpi-anchor > ol > li:last-child {
    border-bottom: 1px solid var(--border);
  }

  /* Hero typography */
  section.kpi-anchor > ol > li:first-child > strong {
    display: block;
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--fs-hero);
    font-weight: 700;
    color: var(--text-heading);
    line-height: var(--lh-tight);
    letter-spacing: -0.03em;
    margin-bottom: var(--sp-md);
    font-variant-numeric: tabular-nums;
  }
  section.kpi-anchor > ol > li:first-child > ul > li:first-child {
    font-size: var(--fs-xl);
    color: var(--text-heading);
    font-weight: 600;
    line-height: var(--lh-snug);
  }
  section.kpi-anchor > ol > li:first-child > ul > li + li {
    font-size: var(--fs-md);
    color: var(--text-muted);
    margin-top: var(--sp-sm);
    font-family: var(--font-mono);
  }

  /* Supporting typography — number left, labels right */
  section.kpi-anchor > ol > li:not(:first-child) > strong {
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--fs-2xl);
    font-weight: 700;
    color: var(--text-heading);
    line-height: var(--lh-tight);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  section.kpi-anchor > ol > li:not(:first-child) > ul {
    align-self: center;
  }
  section.kpi-anchor > ol > li:not(:first-child) > ul > li:first-child {
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 600;
    line-height: var(--lh-snug);
  }
  section.kpi-anchor > ol > li:not(:first-child) > ul > li + li {
    font-size: var(--fs-label);
    color: var(--text-muted);
    font-family: var(--font-mono);
    margin-top: 2px;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 2. LEDGER — datasheet rows: label · value · target. No chrome.
   * `display: contents` lets the inner ul participate in the row grid.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-ledger > ol {
    display: flex; flex-direction: column;
    justify-content: center;
    border-top: 2px solid var(--text-heading);
    border-bottom: 2px solid var(--text-heading);
  }
  section.kpi-ledger > ol > li {
    display: flex;
    align-items: baseline;
    gap: var(--sp-xl);
    padding: var(--sp-sm) var(--sp-sm);
    border-bottom: 1px solid var(--border);
  }
  section.kpi-ledger > ol > li:last-child { border-bottom: none; }
  section.kpi-ledger > ol > li > ul { display: contents; }
  section.kpi-ledger > ol > li > ul > li:first-child {
    order: 1;
    flex: 1;
    font-family: var(--font-body);
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 500;
    line-height: 1;
  }
  section.kpi-ledger > ol > li > strong {
    order: 2;
    min-width: 5ch;
    text-align: right;
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--fs-2xl);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  section.kpi-ledger > ol > li > ul > li + li {
    order: 3;
    min-width: 18ch;
    text-align: right;
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    letter-spacing: 0.02em;
    line-height: 1;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 3. SLAT — full-width horizontal rows. Big numeral right-aligned,
   * label stack left. Hairline dividers between, nothing else.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-slat > ol {
    display: flex; flex-direction: column;
    justify-content: space-evenly;
  }
  section.kpi-slat > ol > li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: center;
    column-gap: var(--sp-xl);
    padding: var(--sp-xs) 0;
    border-top: 1px solid var(--border);
  }
  section.kpi-slat > ol > li:last-child { border-bottom: 1px solid var(--border); }
  section.kpi-slat > ol > li > strong {
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--fs-3xl);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 1.05;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    text-align: right;
    padding-right: var(--sp-lg);
    border-right: 1px solid var(--border);
  }
  section.kpi-slat > ol > li > ul > li:first-child {
    font-size: var(--fs-xl);
    color: var(--text-heading);
    font-weight: 600;
    line-height: var(--lh-snug);
  }
  section.kpi-slat > ol > li > ul > li + li {
    font-size: var(--fs-label);
    color: var(--text-muted);
    font-family: var(--font-mono);
    margin-top: var(--sp-xs);
    letter-spacing: 0.02em;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 4. MARQUEE — horizontal ticker band, vertical hairlines between
   * equal-width panels. Mono small-caps label below numeral.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-marquee > ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    align-items: center;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  section.kpi-marquee > ol > li {
    padding: var(--sp-lg) var(--sp-md);
    border-right: 1px solid var(--border);
    text-align: center;
    display: flex; flex-direction: column;
    align-items: center;
    gap: var(--sp-sm);
  }
  section.kpi-marquee > ol > li:last-child { border-right: none; }
  section.kpi-marquee > ol > li > strong {
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--fs-display);
    font-weight: 700;
    color: var(--text-heading);
    line-height: var(--lh-tight);
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  section.kpi-marquee > ol > li > ul {
    display: flex; flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  section.kpi-marquee > ol > li > ul > li:first-child {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: var(--text-label);
  }
  section.kpi-marquee > ol > li > ul > li + li {
    font-size: var(--fs-xs);
    color: var(--text-muted);
    font-family: var(--font-mono);
    letter-spacing: 0.02em;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * 5. GRID — refined card grid. No border, no fill, no radius. Single
   * 2px categorical left rule, left-aligned typography. Drop-in for the
   * shipped kpi class.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-grid > ol {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    column-gap: var(--sp-2xl);
    row-gap: var(--sp-xl);
    align-content: center;
  }
  section.kpi-grid > ol > li {
    padding-left: var(--sp-md);
    border-left: 2px solid var(--kpi-accent, var(--accent));
    display: flex; flex-direction: column;
    gap: var(--sp-xs);
  }
  section.kpi-grid > ol > li > strong {
    font-family: var(--font-display, var(--font-sans));
    font-size: var(--fs-display);
    font-weight: 700;
    color: var(--text-heading);
    line-height: var(--lh-tight);
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  section.kpi-grid > ol > li > ul > li:first-child {
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 600;
    line-height: var(--lh-snug);
  }
  section.kpi-grid > ol > li > ul > li + li {
    font-size: var(--fs-label);
    color: var(--text-muted);
    font-family: var(--font-mono);
    margin-top: var(--sp-xs);
    letter-spacing: 0.02em;
  }
  /* Categorical rotation across cells (matches shipped kpi cycle) */
  section.kpi-grid > ol > li:nth-child(8n+1) { --kpi-accent: var(--cat-blue); }
  section.kpi-grid > ol > li:nth-child(8n+2) { --kpi-accent: var(--cat-green); }
  section.kpi-grid > ol > li:nth-child(8n+3) { --kpi-accent: var(--cat-purple); }
  section.kpi-grid > ol > li:nth-child(8n+4) { --kpi-accent: var(--cat-orange); }
  section.kpi-grid > ol > li:nth-child(8n+5) { --kpi-accent: var(--cat-teal); }
  section.kpi-grid > ol > li:nth-child(8n+6) { --kpi-accent: var(--cat-rose); }
  section.kpi-grid > ol > li:nth-child(8n+7) { --kpi-accent: var(--cat-mauve); }
  section.kpi-grid > ol > li:nth-child(8n)   { --kpi-accent: var(--cat-slate); }
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "KPI redesign · candidates" -->

# KPI redesign — five candidates

`Internal review · 2026-05-12`

Five layout directions, one winner per direction. Same metrics, same
authoring contract. Inspect side-by-side and pick the one (or two) to
promote into `lattice.css`.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Before · the shipped layout" -->

`Section 01 · Where we start`

## The current KPI — chunky cards, rainbow stripes, no hierarchy.

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
<!-- _footer: "After · five candidates" -->

`Section 02 · The redesign`

## Five directions. Same numbers. Pick the one that earns its slide.

---

<!-- _class: kpi-anchor -->
<!-- _footer: "Candidate 01 · kpi-anchor" -->

## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - target 99%, +2pp QoQ
2. **8 ms**
   - p99 detokenize
   - target 10 ms · -3 ms QoQ
3. **0**
   - Examiner findings
   - target 0 · flat
4. **3.2×**
   - Detokenize headroom
   - target 2× · +0.4× QoQ

Hero on the left carries the headline metric at `--fs-hero`. Supporting metrics stack on the right with hairline dividers, number right-aligned to a shared axis.

---

<!-- _class: kpi-ledger -->
<!-- _footer: "Candidate 02 · kpi-ledger" -->

## Where we are against quarter targets.

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

A spec-sheet read. No tables; CSS Grid with `display: contents` puts label, value, and target on a single baseline-aligned row. Tabular-nums keep digits on axis.

---

<!-- _class: kpi-slat -->
<!-- _footer: "Candidate 03 · kpi-slat" -->

## Where we are against quarter targets.

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

Full-width slats, one per metric. Numeral right-aligned against a hairline rule; label stack starts where the rule ends. Reads top-to-bottom like a financial report.

---

<!-- _class: kpi-marquee -->
<!-- _footer: "Candidate 04 · kpi-marquee" -->

## Where we are against quarter targets.

1. **94%**
   - Issuance success
   - +2pp QoQ
2. **8 ms**
   - p99 detokenize
   - -3 ms QoQ
3. **0**
   - Examiner findings
   - flat
4. **3.2×**
   - Detok headroom
   - +0.4× QoQ

Equal-width panels separated by vertical hairlines, like an index header. Mono small-caps label below the numeral gives the ticker register. Best for 3–5 indicators of equal weight.

---

<!-- _class: kpi-grid -->
<!-- _footer: "Candidate 05 · kpi-grid" -->

## Where we are against quarter targets.

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

The shipped layout, refined. Card chrome gone — no border, no fill, no radius. Categorical signal survives as a single 2px left rule. Drop-in replacement for the existing `kpi` class.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Cross-cut · 3 vs 5 metrics" -->

`Section 03 · How they handle different counts`

## Anchor with 3, ledger with 5, marquee with 5. Stress-testing the favourites.

---

<!-- _class: kpi-anchor -->
<!-- _footer: "kpi-anchor · 3 metrics" -->

## The headline, with two follow-on metrics.

1. **94%**
   - Token-issuance success
   - target 99%, +2pp QoQ
2. **8 ms**
   - p99 detokenize
   - target 10 ms · -3 ms QoQ
3. **0**
   - Examiner findings
   - target 0 · flat

---

<!-- _class: kpi-ledger -->
<!-- _footer: "kpi-ledger · 5 metrics" -->

## Quarter-end ledger, five lines.

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
5. **+12%**
   - Throughput Δ vs last quarter
   - +6pp above plan

---

<!-- _class: kpi-marquee -->
<!-- _footer: "kpi-marquee · 5 metrics" -->

## Index strip, five indicators.

1. **94%**
   - Issuance
   - +2pp QoQ
2. **8 ms**
   - p99 detok
   - -3 ms QoQ
3. **0**
   - Findings
   - flat
4. **3.2×**
   - Headroom
   - +0.4× QoQ
5. **+12%**
   - Throughput Δ
   - +6pp plan
