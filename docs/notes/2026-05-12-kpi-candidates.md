---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · KPI redesign · power-play cards"
style: |
  /* ─────────────────────────────────────────────────────────────────────
   * Five card-based KPI power-play directions. Each shows the same four
   * Authentication metrics; one (li#1, 94% vs 99% target) is the critical
   * card — raised, four-point-starred, given the spotlight. Supporting
   * cards step down in weight, size, or chrome.
   * ───────────────────────────────────────────────────────────────────── */

  section[class*="kpi-"] {
    display: flex; flex-direction: column;
    padding-top: var(--sp-lg);
  }
  section[class*="kpi-"] h3 {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0 0 var(--sp-xs) 0;
  }
  section[class*="kpi-"] h2 {
    font-family: var(--font-display);
    font-size: var(--fs-2xl);
    font-weight: 700;
    color: var(--text-heading);
    line-height: var(--lh-tight);
    margin: 0 0 var(--sp-lg) 0;
  }
  section[class*="kpi-"] > ol {
    list-style: none; padding: 0; margin: 0;
    flex: 1;
  }
  section[class*="kpi-"] > ol > li::marker { content: ''; }
  section[class*="kpi-"] > ol > li > ul {
    list-style: none; padding: 0; margin: 0;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * A · SPOTLIGHT — one hero card top-left, three supports stacked right.
   *   Hero: raised, fs-hero number, four-point star, accent-soft fill.
   *   Supports: minimal, hairline-separated.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-spotlight > ol {
    display: grid;
    grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr);
    grid-template-rows: 1fr 1fr 1fr;
    gap: var(--sp-md) var(--sp-2xl);
  }
  section.kpi-spotlight > ol > li:nth-child(1) {
    grid-column: 1; grid-row: 1 / -1;
    background: var(--accent-soft);
    padding: var(--sp-2xl);
    position: relative;
    display: flex; flex-direction: column;
    justify-content: space-between;
    border-radius: 4px;
    box-shadow:
      0 24px 48px -24px rgba(0, 61, 102, 0.20),
      0 1px 0 0 rgba(0, 0, 0, 0.05);
    transform: translateY(-8px);
  }
  section.kpi-spotlight > ol > li:nth-child(1)::after {
    content: '✦';
    position: absolute;
    top: var(--sp-lg); right: var(--sp-lg);
    font-size: var(--fs-2xl);
    color: var(--accent);
    line-height: 1;
  }
  section.kpi-spotlight > ol > li:nth-child(1) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-watermark);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 0.88;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    display: block;
  }
  section.kpi-spotlight > ol > li:nth-child(1) > ul > li:first-child {
    font-family: var(--font-display);
    font-size: var(--fs-xl);
    font-weight: 600;
    color: var(--text-heading);
    margin-top: var(--sp-lg);
    line-height: var(--lh-snug);
  }
  section.kpi-spotlight > ol > li:nth-child(1) > ul > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-emphasis);
    color: var(--warn);
    font-weight: 600;
    letter-spacing: 0.04em;
    margin-top: var(--sp-sm);
    text-transform: uppercase;
  }
  section.kpi-spotlight > ol > li:not(:first-child) {
    grid-column: 2;
    display: flex; flex-direction: column;
    justify-content: center;
    padding: 0 0 0 var(--sp-md);
    border-left: 1px solid var(--border);
  }
  section.kpi-spotlight > ol > li:nth-child(2) { grid-row: 1; }
  section.kpi-spotlight > ol > li:nth-child(3) { grid-row: 2; }
  section.kpi-spotlight > ol > li:nth-child(4) { grid-row: 3; }
  section.kpi-spotlight > ol > li:not(:first-child) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-3xl);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  section.kpi-spotlight > ol > li:not(:first-child) > ul > li:first-child {
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 500;
    margin-top: var(--sp-xs);
  }
  section.kpi-spotlight > ol > li:not(:first-child) > ul > li + li {
    font-size: var(--fs-label);
    font-family: var(--font-mono);
    color: var(--text-muted);
    margin-top: var(--sp-xs);
    letter-spacing: 0.04em;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * B · BENTO — asymmetric tile grid (hero 2x2, side 1x2, two stragglers).
   *   Each card has distinct chrome to reinforce information hierarchy.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-bento > ol {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.4fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1fr);
    gap: var(--sp-md);
  }
  section.kpi-bento > ol > li {
    padding: var(--sp-lg);
    position: relative;
    display: flex; flex-direction: column;
    justify-content: space-between;
    min-width: 0;
    border-radius: 4px;
  }
  /* Hero — top-left 2x2 */
  section.kpi-bento > ol > li:nth-child(1) {
    grid-column: 1 / 3; grid-row: 1 / 3;
    background: var(--brand-blue-deep);
    color: #ffffff;
    padding: var(--sp-xl);
    box-shadow: 0 30px 60px -28px rgba(0, 61, 102, 0.35);
  }
  section.kpi-bento > ol > li:nth-child(1)::after {
    content: '✦';
    position: absolute;
    top: var(--sp-xl); right: var(--sp-xl);
    font-size: var(--fs-3xl);
    color: #ffffff;
    opacity: 0.9;
    line-height: 1;
  }
  section.kpi-bento > ol > li:nth-child(1) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-hero);
    color: #ffffff;
    line-height: 0.9;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    display: block;
    font-weight: 700;
  }
  section.kpi-bento > ol > li:nth-child(1) > ul > li:first-child {
    font-family: var(--font-display);
    font-size: var(--fs-lg);
    color: #ffffff;
    font-weight: 600;
    margin-top: var(--sp-md);
  }
  section.kpi-bento > ol > li:nth-child(1) > ul > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-emphasis);
    color: #ffffff;
    opacity: 0.75;
    margin-top: var(--sp-sm);
    letter-spacing: 0.04em;
  }
  /* Side — right column tall (1x3) */
  section.kpi-bento > ol > li:nth-child(2) {
    grid-column: 3; grid-row: 1 / 4;
    background: var(--accent-soft);
  }
  section.kpi-bento > ol > li:nth-child(2) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-stat);
    color: var(--accent);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    display: block;
    font-weight: 700;
  }
  section.kpi-bento > ol > li:nth-child(2) > ul > li:first-child {
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 600;
    margin-top: var(--sp-md);
  }
  section.kpi-bento > ol > li:nth-child(2) > ul > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    margin-top: var(--sp-xs);
    letter-spacing: 0.04em;
  }
  /* Bottom-left (3rd metric) */
  section.kpi-bento > ol > li:nth-child(3) {
    grid-column: 1; grid-row: 3;
    background: var(--bg-alt);
  }
  /* Bottom-middle (4th metric) */
  section.kpi-bento > ol > li:nth-child(4) {
    grid-column: 2; grid-row: 3;
    background: var(--bg-alt);
  }
  section.kpi-bento > ol > li:nth-child(3) > strong,
  section.kpi-bento > ol > li:nth-child(4) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-3xl);
    color: var(--text-heading);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    display: block;
    font-weight: 700;
  }
  section.kpi-bento > ol > li:nth-child(3) > ul > li:first-child,
  section.kpi-bento > ol > li:nth-child(4) > ul > li:first-child {
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 500;
    margin-top: var(--sp-xs);
  }
  section.kpi-bento > ol > li:nth-child(3) > ul > li + li,
  section.kpi-bento > ol > li:nth-child(4) > ul > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    margin-top: var(--sp-xs);
    letter-spacing: 0.04em;
  }
  section.kpi-bento > ol > li:nth-child(3),
  section.kpi-bento > ol > li:nth-child(4) {
    padding: var(--sp-md) var(--sp-lg);
  }

  /* ─────────────────────────────────────────────────────────────────────
   * C · EDITORIAL — magazine spread. Full-height hero left, supports right.
   *   Hero gets gigantic serif typography; supports are hairline-listed.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-editorial > ol {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    grid-template-rows: 1fr 1fr 1fr;
    gap: 0 var(--sp-2xl);
  }
  section.kpi-editorial > ol > li:nth-child(1) {
    grid-column: 1; grid-row: 1 / -1;
    background: var(--bg-alt);
    padding: var(--sp-2xl);
    position: relative;
    display: flex; flex-direction: column;
    justify-content: flex-end;
    border-left: 4px solid var(--warn);
  }
  section.kpi-editorial > ol > li:nth-child(1)::before {
    content: '✦';
    position: absolute;
    top: var(--sp-xl); right: var(--sp-xl);
    font-family: var(--font-display);
    font-size: var(--fs-2xl);
    color: var(--warn);
    line-height: 1;
  }
  section.kpi-editorial > ol > li:nth-child(1)::after {
    content: 'CRITICAL';
    position: absolute;
    top: var(--sp-xl);
    left: var(--sp-2xl);
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--warn);
    font-weight: 700;
    letter-spacing: 0.22em;
  }
  section.kpi-editorial > ol > li:nth-child(1) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-watermark);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 0.88;
    letter-spacing: -0.05em;
    font-variant-numeric: tabular-nums;
    display: block;
  }
  section.kpi-editorial > ol > li:nth-child(1) > ul > li:first-child {
    font-family: var(--font-display);
    font-size: var(--fs-xl);
    font-weight: 600;
    color: var(--text-heading);
    margin-top: var(--sp-md);
    line-height: var(--lh-snug);
  }
  section.kpi-editorial > ol > li:nth-child(1) > ul > li + li {
    font-family: var(--font-display);
    font-style: italic;
    font-size: var(--fs-md);
    color: var(--text-muted);
    margin-top: var(--sp-sm);
  }
  section.kpi-editorial > ol > li:not(:first-child) {
    grid-column: 2;
    display: flex; flex-direction: column;
    justify-content: center;
    padding: var(--sp-sm) 0;
    min-height: 0;
  }
  section.kpi-editorial > ol > li:nth-child(2) {
    grid-row: 1;
    border-top: 1.5px solid var(--text-heading);
  }
  section.kpi-editorial > ol > li:nth-child(3) {
    grid-row: 2;
    border-top: 1px solid var(--border);
  }
  section.kpi-editorial > ol > li:nth-child(4) {
    grid-row: 3;
    border-top: 1px solid var(--border);
    border-bottom: 1.5px solid var(--text-heading);
  }
  section.kpi-editorial > ol > li:not(:first-child) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-3xl);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  section.kpi-editorial > ol > li:not(:first-child) > ul > li:first-child {
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 500;
    margin-top: var(--sp-xs);
  }
  section.kpi-editorial > ol > li:not(:first-child) > ul > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    margin-top: var(--sp-xs);
    letter-spacing: 0.04em;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * D · RAISED — 2x2 equal grid, critical card raised + starred.
   *   Power-play through elevation, not size.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-raised > ol {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: var(--sp-md) var(--sp-2xl);
    padding: var(--sp-sm) 0;
  }
  section.kpi-raised > ol > li {
    padding: var(--sp-sm) var(--sp-md);
    display: flex; flex-direction: column;
    justify-content: center;
    position: relative;
    border-top: 1px solid var(--border);
    min-width: 0;
    min-height: 0;
  }
  section.kpi-raised > ol > li:nth-child(1) {
    background: var(--bg);
    border: 1px solid var(--accent);
    border-top: 4px solid var(--accent);
    box-shadow:
      0 24px 48px -24px rgba(0, 61, 102, 0.28),
      0 2px 4px rgba(0, 0, 0, 0.04);
    transform: translateY(-10px);
    padding: var(--sp-md) var(--sp-lg);
  }
  section.kpi-raised > ol > li:nth-child(1)::after {
    content: '✦';
    position: absolute;
    top: var(--sp-sm); right: var(--sp-md);
    font-size: var(--fs-xl);
    color: var(--accent);
    line-height: 1;
  }
  section.kpi-raised > ol > li > strong {
    font-family: var(--font-display);
    font-size: var(--fs-stat);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 0.95;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    display: block;
  }
  section.kpi-raised > ol > li:nth-child(1) > strong {
    color: var(--accent);
    font-size: var(--fs-hero);
  }
  section.kpi-raised > ol > li > ul > li:first-child {
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 600;
    margin-top: var(--sp-xs);
  }
  section.kpi-raised > ol > li > ul > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    margin-top: var(--sp-xs);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-weight: 600;
  }
  section.kpi-raised > ol > li:nth-child(1) > ul > li + li {
    color: var(--warn);
  }

  /* ─────────────────────────────────────────────────────────────────────
   * E · POWER TRIANGLE — asymmetric cascade. Hero top-left, others step
   *   down. Each card has distinct visual chrome by rank.
   * ───────────────────────────────────────────────────────────────────── */
  section.kpi-triangle > ol {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: var(--sp-md);
  }
  section.kpi-triangle > ol > li {
    padding: var(--sp-lg);
    display: flex; flex-direction: column;
    justify-content: space-between;
    position: relative;
    min-width: 0;
    border-radius: 2px;
  }
  /* Hero — top-left 2x1 */
  section.kpi-triangle > ol > li:nth-child(1) {
    grid-column: 1; grid-row: 1 / -1;
    background: linear-gradient(135deg, var(--accent-soft) 0%, var(--bg-alt) 100%);
    padding: var(--sp-2xl);
    box-shadow: 0 24px 48px -28px rgba(0, 61, 102, 0.25);
  }
  section.kpi-triangle > ol > li:nth-child(1)::after {
    content: '✦';
    position: absolute;
    top: var(--sp-lg); right: var(--sp-lg);
    font-size: var(--fs-2xl);
    color: var(--accent);
    line-height: 1;
  }
  section.kpi-triangle > ol > li:nth-child(1) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-watermark);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 0.88;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    display: block;
  }
  section.kpi-triangle > ol > li:nth-child(1) > ul > li:first-child {
    font-family: var(--font-display);
    font-size: var(--fs-xl);
    font-weight: 600;
    color: var(--text-heading);
    margin-top: var(--sp-md);
  }
  section.kpi-triangle > ol > li:nth-child(1) > ul > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-emphasis);
    color: var(--warn);
    font-weight: 600;
    margin-top: var(--sp-sm);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  /* Card 2 — middle column, top */
  section.kpi-triangle > ol > li:nth-child(2) {
    grid-column: 2; grid-row: 1;
    background: var(--bg-alt);
  }
  /* Card 3 — right column, top */
  section.kpi-triangle > ol > li:nth-child(3) {
    grid-column: 3; grid-row: 1;
    background: var(--bg-alt);
  }
  /* Card 4 — spans bottom of middle + right */
  section.kpi-triangle > ol > li:nth-child(4) {
    grid-column: 2 / 4; grid-row: 2;
    background: var(--bg);
    border: 1px solid var(--border);
  }
  section.kpi-triangle > ol > li:not(:first-child) > strong {
    font-family: var(--font-display);
    font-size: var(--fs-stat);
    font-weight: 700;
    color: var(--text-heading);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    display: block;
  }
  section.kpi-triangle > ol > li:nth-child(4) > strong {
    font-size: var(--fs-3xl);
  }
  section.kpi-triangle > ol > li:not(:first-child) > ul > li:first-child {
    font-size: var(--fs-md);
    color: var(--text-heading);
    font-weight: 500;
    margin-top: var(--sp-sm);
  }
  section.kpi-triangle > ol > li:not(:first-child) > ul > li + li {
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    color: var(--text-muted);
    margin-top: var(--sp-xs);
    letter-spacing: 0.04em;
  }
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "KPI redesign · power-play cards · winners" -->

# KPI redesign — power-play cards

`2026-05-12`

Five card-based directions. One critical metric is the hero — raised,
starred, monumentalised. Supporting metrics step down by chrome, size,
or both.

---

<!-- _class: kpi-spotlight -->
<!-- _header: '' -->
<!-- _footer: "A · spotlight — hero left, supports stacked right" -->

### Authentication · Q4 2026
## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - Target 99% · -5pp this quarter
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

<!-- _class: kpi-bento -->
<!-- _header: '' -->
<!-- _footer: "B · bento — asymmetric tiles, dark hero" -->

### Authentication · Q4 2026
## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - target 99% · -5pp
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

<!-- _class: kpi-editorial -->
<!-- _header: '' -->
<!-- _footer: "C · editorial spread — magazine, full-height hero left" -->

### Authentication · Q4 2026
## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - Five percentage points below quarterly plan; remediation already underway.
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

<!-- _class: kpi-raised -->
<!-- _header: '' -->
<!-- _footer: "D · raised — equal grid, critical card elevated + starred" -->

### Authentication · Q4 2026
## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - target 99% · -5pp
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

<!-- _class: kpi-triangle -->
<!-- _header: '' -->
<!-- _footer: "E · power triangle — asymmetric cascade, hero anchors left" -->

### Authentication · Q4 2026
## Where we are against quarter targets.

1. **94%**
   - Token-issuance success
   - target 99% · -5pp
2. **8 ms**
   - p99 detokenize
   - target 10 ms
3. **0**
   - Examiner findings
   - target 0
4. **3.2×**
   - Detokenize headroom
   - target 2×
