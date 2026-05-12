---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · executive KPI system · v1"
style: |
  /* ═══════════════════════════════════════════════════════════════════════
   * EXECUTIVE KPI SYSTEM — one cohesive base, five layout modifiers.
   *
   *   Shared primitives (used by all five layouts below):
   *     · Eyebrow: h3 mono small caps, "Domain · Period"
   *     · Headline: h2 Playfair display
   *     · Number: Playfair Display, tabular figures, status-coloured
   *     · Pill: inline `code` on a list item (lattice universal rule)
   *     · Star: ✦ four-point on critical/flagship card only
   *     · Status palette: --pass / --warn / --fail (existing tokens)
   *
   *   Authoring (one contract across all five):
   *     <!-- _class: kpi-sys kpi-{briefing|ops|compliance|trajectory|spotlight} -->
   *     ### Domain · Period
   *     ## Headline statement.
   *
   *     1. **$2.4B**
   *        - Average daily settlement
   *        - target $2.0B · +20% `On plan` `Board`
   *     2. ...
   *
   *   Trailing inline `code` on any line becomes a pill. The FIRST pill
   *   carries the status; the per-row status colour is hooked via the
   *   list's nth-child cycle in each layout below (production would
   *   replace that with a per-item modifier).
   * ═══════════════════════════════════════════════════════════════════════ */

  /* ── shared base: every kpi-sys slide gets this scaffold ───────────── */
  section.kpi-sys {
    display: flex; flex-direction: column;
    padding-top: var(--sp-md);
  }
  section.kpi-sys h3 {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0 0 var(--sp-xs) 0;
  }
  section.kpi-sys h2 {
    font-family: var(--font-display);
    font-size: var(--fs-2xl);
    font-weight: 700;
    color: var(--text-heading);
    line-height: var(--lh-tight);
    margin: 0 0 var(--sp-md) 0;
  }
  section.kpi-sys > ol,
  section.kpi-sys > ul {
    list-style: none; padding: 0; margin: 0;
    flex: 1;
  }
  section.kpi-sys > :where(ol, ul) > li::marker { content: ''; }
  section.kpi-sys > :where(ol, ul) > li > :where(ul, ol) {
    list-style: none; padding: 0; margin: 0;
  }
  section.kpi-sys > :where(ol, ul) > li > :where(ul, ol) > li::marker { content: ''; }

  /* ── universal pill: trailing inline `code` on any line ────────────── */
  section.kpi-sys code {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid var(--pill-border, var(--text-muted));
    background: var(--pill-bg, var(--bg));
    color: var(--pill-fg, var(--text-body));
    border-radius: 999px;
    padding: 3px 10px;
    white-space: nowrap;
    margin-left: 6px;
    vertical-align: 1px;
  }
  /* Status pills: derived from per-li class hooks set by each layout. */
  section.kpi-sys li.pass {
    --pill-border: var(--pass);
    --pill-bg: var(--pass-bg);
    --pill-fg: var(--pass);
  }
  section.kpi-sys li.warn {
    --pill-border: var(--warn);
    --pill-bg: var(--warn-bg);
    --pill-fg: var(--warn);
  }
  section.kpi-sys li.fail {
    --pill-border: var(--fail);
    --pill-bg: var(--fail-bg);
    --pill-fg: var(--fail);
  }
  /* Only the FIRST pill carries the status colour; later pills stay neutral. */
  section.kpi-sys > :where(ol, ul) > li :where(ul, ol) > li code ~ code,
  section.kpi-sys > :where(ol, ul) > li > code ~ code {
    --pill-border: var(--text-muted);
    --pill-bg: var(--bg);
    --pill-fg: var(--text-muted);
  }

  /* ── shared number / label / target typography ──────────────────────── */
  section.kpi-sys > :where(ol, ul) > li > strong {
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--text-heading);
    font-variant-numeric: tabular-nums;
    line-height: 0.95;
    letter-spacing: -0.03em;
    display: block;
  }
  section.kpi-sys > :where(ol, ul) > li > :where(ul, ol) > li:first-child {
    font-size: var(--fs-content);
    font-weight: 500;
    color: var(--text-heading);
    margin-top: var(--sp-sm);
    line-height: var(--lh-snug);
  }
  section.kpi-sys > :where(ol, ul) > li > :where(ul, ol) > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    margin-top: var(--sp-xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ── flagship star: applied to a single :nth-child(1) in some layouts */
  section.kpi-sys .flagship::after {
    content: '✦';
    position: absolute;
    top: var(--sp-md); right: var(--sp-md);
    font-size: var(--fs-xl);
    color: var(--accent);
    line-height: 1;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * MODIFIER 1 · BRIEFING — board / financial. Hero + 3 supports.
   *   Pills: status + audience (Board / Investor / Audit).
   * ═══════════════════════════════════════════════════════════════════════ */
  section.kpi-briefing > ol {
    display: grid;
    grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr);
    grid-template-rows: 1fr 1fr 1fr;
    gap: 0 var(--sp-2xl);
  }
  section.kpi-briefing > ol > li:nth-child(1) {
    grid-column: 1; grid-row: 1 / -1;
    background: var(--accent-soft);
    padding: var(--sp-xl) var(--sp-2xl);
    position: relative;
    display: flex; flex-direction: column;
    justify-content: center;
    border-left: 4px solid var(--accent);
  }
  section.kpi-briefing > ol > li:nth-child(1)::after {
    content: '✦';
    position: absolute;
    top: var(--sp-lg); right: var(--sp-lg);
    font-size: var(--fs-2xl);
    color: var(--accent);
    line-height: 1;
  }
  section.kpi-briefing > ol > li:nth-child(1) > strong {
    font-size: var(--fs-watermark);
    line-height: 0.88;
  }
  section.kpi-briefing > ol > li:nth-child(1) > ul > li:first-child {
    font-family: var(--font-display);
    font-size: var(--fs-xl);
    margin-top: var(--sp-md);
  }
  section.kpi-briefing > ol > li:not(:first-child) {
    grid-column: 2;
    display: flex; flex-direction: column;
    justify-content: center;
    padding: var(--sp-sm) 0;
  }
  section.kpi-briefing > ol > li:nth-child(2) { grid-row: 1; border-top: 1.5px solid var(--text-heading); }
  section.kpi-briefing > ol > li:nth-child(3) { grid-row: 2; border-top: 1px solid var(--border); }
  section.kpi-briefing > ol > li:nth-child(4) {
    grid-row: 3;
    border-top: 1px solid var(--border);
    border-bottom: 1.5px solid var(--text-heading);
  }
  section.kpi-briefing > ol > li:not(:first-child) > strong {
    font-size: var(--fs-3xl);
  }

  /* Per-row status colour, briefing — all on-plan (default pass) */
  section.kpi-briefing > ol > li {
    --pill-border: var(--pass);
    --pill-bg: var(--pass-bg);
    --pill-fg: var(--pass);
  }
  /* Subsequent pills (audience etc) stay neutral via the ~ code rule. */

  /* ═══════════════════════════════════════════════════════════════════════
   * MODIFIER 2 · OPS — SLO/SLA review. 2×2 grid, every card with status pill.
   * ═══════════════════════════════════════════════════════════════════════ */
  section.kpi-ops > ol {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: var(--sp-md);
  }
  section.kpi-ops > ol > li {
    background: var(--bg-alt);
    padding: var(--sp-md) var(--sp-lg);
    display: flex; flex-direction: column;
    justify-content: center;
    position: relative;
    min-width: 0;
  }
  section.kpi-ops > ol > li > strong {
    font-size: var(--fs-hero);
    line-height: 0.92;
  }
  section.kpi-ops > ol > li:nth-child(1),
  section.kpi-ops > ol > li:nth-child(3) {
    --pill-border: var(--warn);
    --pill-bg: var(--warn-bg);
    --pill-fg: var(--warn);
  }
  section.kpi-ops > ol > li:nth-child(2),
  section.kpi-ops > ol > li:nth-child(4) {
    --pill-border: var(--pass);
    --pill-bg: var(--pass-bg);
    --pill-fg: var(--pass);
  }
  section.kpi-ops > ol > li:nth-child(1) > strong,
  section.kpi-ops > ol > li:nth-child(3) > strong { color: var(--warn); }

  /* ═══════════════════════════════════════════════════════════════════════
   * MODIFIER 3 · COMPLIANCE — legal / regulatory. Vertical list with
   *   binary-state pills and source footnote.
   * ═══════════════════════════════════════════════════════════════════════ */
  section.kpi-compliance > ol {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  section.kpi-compliance > ol > li {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr) max-content;
    grid-template-rows: auto auto;
    column-gap: var(--sp-2xl);
    row-gap: var(--sp-xs);
    padding: var(--sp-md) 0;
    border-bottom: 1px solid var(--border);
    align-items: baseline;
  }
  section.kpi-compliance > ol > li:last-child {
    border-bottom: 1.5px solid var(--text-heading);
  }
  section.kpi-compliance > ol > li > strong {
    grid-column: 1; grid-row: 1 / 3;
    font-size: var(--fs-stat);
    min-width: 4ch;
    text-align: right;
    align-self: center;
  }
  section.kpi-compliance > ol > li > ul { display: contents; }
  section.kpi-compliance > ol > li > ul > li:first-child {
    grid-column: 2; grid-row: 1;
    margin-top: 0;
  }
  section.kpi-compliance > ol > li > ul > li + li {
    grid-column: 2; grid-row: 2;
    margin-top: 0;
  }
  section.kpi-compliance > ol > li > ul > li code:first-of-type {
    grid-column: 3; grid-row: 1 / 3;
    align-self: center;
    margin-left: 0;
  }
  /* Row-level status hooks for compliance */
  section.kpi-compliance > ol > li:nth-child(1),
  section.kpi-compliance > ol > li:nth-child(2),
  section.kpi-compliance > ol > li:nth-child(4) {
    --pill-border: var(--pass);
    --pill-bg: var(--pass-bg);
    --pill-fg: var(--pass);
  }
  section.kpi-compliance > ol > li:nth-child(3) {
    --pill-border: var(--warn);
    --pill-bg: var(--warn-bg);
    --pill-fg: var(--warn);
  }
  section.kpi-compliance > p:last-of-type {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin: var(--sp-md) 0 0 0;
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * MODIFIER 4 · TRAJECTORY — investor / period-over-period. Equal cards
   *   with direction indicators in pills.
   * ═══════════════════════════════════════════════════════════════════════ */
  section.kpi-trajectory > ol {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-auto-rows: max-content;
    align-content: center;
    gap: var(--sp-md);
  }
  section.kpi-trajectory > ol > li {
    background: var(--bg-alt);
    padding: var(--sp-lg) var(--sp-md);
    display: flex; flex-direction: column;
    justify-content: center;
    gap: var(--sp-sm);
    position: relative;
    border-top: 4px solid var(--accent);
  }
  section.kpi-trajectory > ol > li:nth-child(1) { border-top-color: var(--cat-blue); }
  section.kpi-trajectory > ol > li:nth-child(2) { border-top-color: var(--cat-green); }
  section.kpi-trajectory > ol > li:nth-child(3) { border-top-color: var(--cat-purple); }
  section.kpi-trajectory > ol > li:nth-child(4) { border-top-color: var(--cat-orange); }
  section.kpi-trajectory > ol > li > strong {
    font-size: var(--fs-stat);
    line-height: 1;
  }
  section.kpi-trajectory > ol > li {
    --pill-border: var(--pass);
    --pill-bg: var(--pass-bg);
    --pill-fg: var(--pass);
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * MODIFIER 5 · SPOTLIGHT — single hero metric, monumentalised.
   * ═══════════════════════════════════════════════════════════════════════ */
  section.kpi-spotlight > ol {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: stretch;
    gap: var(--sp-2xl);
  }
  section.kpi-spotlight > ol > li:nth-child(1) {
    background: var(--accent-soft);
    padding: var(--sp-lg) var(--sp-xl);
    position: relative;
    display: flex; flex-direction: column;
    justify-content: center;
    border-left: 4px solid var(--accent);
  }
  section.kpi-spotlight > ol > li:nth-child(1)::after {
    content: '✦';
    position: absolute;
    top: var(--sp-xl); right: var(--sp-xl);
    font-size: var(--fs-3xl);
    color: var(--accent);
    line-height: 1;
  }
  section.kpi-spotlight > ol > li:nth-child(1) > strong {
    font-size: var(--fs-hero);
    line-height: 0.88;
  }
  section.kpi-spotlight > ol > li:nth-child(1) > ul > li:first-child {
    font-family: var(--font-display);
    font-size: var(--fs-xl);
    margin-top: var(--sp-md);
  }
  section.kpi-spotlight > ol > li:nth-child(1) > ul > li + li {
    font-family: var(--font-display);
    font-style: italic;
    font-size: var(--fs-md);
    color: var(--text-muted);
    letter-spacing: 0;
    text-transform: none;
    margin-top: var(--sp-sm);
    line-height: var(--lh-snug);
    text-overflow: clip;
  }
  section.kpi-spotlight > ol > li:not(:first-child) > strong {
    font-size: var(--fs-lg);
  }
  section.kpi-spotlight > ol > li:not(:first-child) {
    padding: 0;
  }
  section.kpi-spotlight > ol > li:not(:first-child) > ul > li:first-child {
    margin-top: 2px;
    font-size: var(--fs-md);
  }
  section.kpi-spotlight > ol > li:not(:first-child) > ul > li + li {
    font-size: 11px;
    margin-top: 2px;
  }
  section.kpi-spotlight > ol > li:not(:first-child) code {
    padding: 2px 8px;
    font-size: 10px;
  }
  section.kpi-spotlight > ol > li:nth-child(1) {
    --pill-border: var(--pass);
    --pill-bg: var(--pass-bg);
    --pill-fg: var(--pass);
  }
  /* Right column: a "context" panel — list of 3 small supporting facts. */
  section.kpi-spotlight > ol > li:not(:first-child) {
    display: flex; flex-direction: column;
    justify-content: center;
    padding: var(--sp-md) 0;
  }
  section.kpi-spotlight > ol > li:nth-child(2) { border-top: 1.5px solid var(--text-heading); }
  section.kpi-spotlight > ol > li:nth-child(3) { border-top: 1px solid var(--border); }
  section.kpi-spotlight > ol > li:nth-child(4) {
    border-top: 1px solid var(--border);
    border-bottom: 1.5px solid var(--text-heading);
  }
  section.kpi-spotlight > ol > li:not(:first-child) > strong {
    font-size: var(--fs-3xl);
  }

  /* Spotlight has a column for the supports — make the grid put them in col 2 */
  section.kpi-spotlight > ol > li:nth-child(2) { grid-column: 2; grid-row: 1; }
  section.kpi-spotlight > ol > li:nth-child(3) { grid-column: 2; grid-row: 2; }
  section.kpi-spotlight > ol > li:nth-child(4) { grid-column: 2; grid-row: 3; }
  section.kpi-spotlight > ol {
    grid-template-rows: 1fr 1fr 1fr;
  }
  section.kpi-spotlight > ol > li:nth-child(1) { grid-column: 1; grid-row: 1 / -1; }
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "Executive KPI system · v1" -->

# Executive KPI system

`2026-05-12`

One cohesive base, five use-case modifiers. Pills carry the verdict
and the audience; the ✦ flagship marks what the executive should
look at first.

---

<!-- _class: kpi-sys kpi-briefing -->
<!-- _header: '' -->
<!-- _footer: "kpi.briefing · board / financial summary" -->

### Financial · Q4 2026
## Revenue ahead of plan; margin and cash both expanded.

1. **$2.4B**
   - Total revenue
   - target $2.2B · +9% vs plan `On plan` `Board`
2. **42%**
   - Gross margin
   - +2pp QoQ `On plan` `Audit`
3. **$1.1B**
   - Cash & equivalents
   - +$180M QoQ `On plan` `Investor`
4. **+18%**
   - YoY revenue growth
   - vs 14% prior year `Ahead` `Board`

---

<!-- _class: kpi-sys kpi-ops -->
<!-- _header: '' -->
<!-- _footer: "kpi.ops · SLO / SLA review" -->

### Platform · Q4 2026
## One latency target slipping; everything else inside SLO.

1. **99.92%**
   - API availability
   - SLO 99.95% · -0.03pp `At risk` `SRE`
2. **42 ms**
   - p99 read latency
   - SLO 50 ms · -16% headroom `On track` `SRE`
3. **18 ms**
   - p99 write latency
   - SLO 15 ms · +20% `Breaching` `Platform`
4. **0.04%**
   - Error budget burn (28d)
   - SLO 1% · 4% consumed `On track` `Reliability`

---

<!-- _class: kpi-sys kpi-compliance -->
<!-- _header: '' -->
<!-- _footer: "kpi.compliance · legal / regulatory posture" -->

### Compliance · Q4 2026
## Three frameworks clean; one open finding under remediation.

1. **0**
   - SOC 2 Type II open findings
   - 2026 audit complete `Compliant` `Auditor`
2. **0**
   - PCI-DSS open findings
   - QSA review Oct 2026 `Compliant` `QSA`
3. **1**
   - GDPR open findings
   - remediation due Q1 2027 `Remediating` `DPO`
4. **0**
   - Internal audit material findings
   - quarterly review complete `Compliant` `Audit Committee`

Source · regulatory register · weekly export

---

<!-- _class: kpi-sys kpi-trajectory -->
<!-- _header: '' -->
<!-- _footer: "kpi.trajectory · investor period-over-period" -->

### Growth · FY26 vs FY25
## Every growth lever moved forward this year.

1. **$420M**
   - ARR
   - +28% YoY `YoY +28%` `Investor`
2. **94%**
   - Net dollar retention
   - +3pp YoY `YoY +3pp` `Investor`
3. **2,840**
   - Enterprise logos
   - +540 net new `YoY +23%` `Board`
4. **$148K**
   - Average contract value
   - +$22K vs FY25 `YoY +18%` `Board`

---

<!-- _class: kpi-sys kpi-spotlight -->
<!-- _header: '' -->
<!-- _footer: "kpi.spotlight · single hero metric" -->

### Headline · Q4 2026
## The number behind the quarter.

1. **$420M**
   - Annual recurring revenue
   - First quarter past the $400M threshold; up 28% year-over-year and ahead of the FY26 plan by $18M.
   - `Headline` `Board` `Investor`
2. **94%**
   - Net dollar retention
   - +3pp YoY `On plan`
3. **2,840**
   - Enterprise logos
   - +540 net new `On plan`
4. **$148K**
   - Average contract value
   - +$22K vs prior year `On plan`
