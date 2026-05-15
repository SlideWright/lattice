---
marp: true
theme: indaco
size: hd
paginate: true
header: "Lattice · User Journey"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "Title slide · title" -->

# The Journey Layout

`User experience · 2026`

A Markdown-native, list-and-inline-code driven user-journey diagram.
One layout, five variants — each answers a different question about
the experience you're documenting.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 01`

## Authoring · nested list + inline code.

---

<!-- _class: tldr -->
<!-- _footer: "Authoring syntax · tldr" -->

## How to write a journey

- **Sections** are top-level list items
  - **Tasks** are nested list items
- **Actors** are inline-code `@name` tokens — appearance order drives the legend
- **Mood** is `:1` (pain) → `:5` (delight); default `:3` if omitted
- **Volume** is `+N` for the weighted variant — task width scales by this number

The same five lines of Markdown render in any of the five variants —
swap `journey` for `journey heatmap`, `journey curve`, etc.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 02`

## Classic · the default Mermaid look.

---

<!-- _class: journey -->
<!-- _footer: "Classic variant · journey" -->

## Customer onboarding · trial → activation

- Evaluate
  - Read case study `@prospect` `:5`
  - Book demo `@prospect` `:4`
  - Live demo `@prospect` `@sales` `:4`
- Trial
  - Trial signup `@prospect` `:3`
  - Workspace setup `@user` `@onboarding` `:1`
- Activate
  - First report `@user` `:3`
  - Daily use `@user` `:5`

> **Setup is the chokepoint.** Mood drops three points between trial
> signup and first report — the only stretch we own end-to-end and the
> only place we can move conversion this quarter.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 03`

## Heatmap · friction at a glance.

---

<!-- _class: journey heatmap -->
<!-- _footer: "Heatmap variant · journey heatmap" -->

## Support escalation · where customers cool off

- Submission
  - Find help article `@customer` `:3`
  - Open ticket `@customer` `:2`
- Triage
  - Acknowledged `@customer` `:3`
  - Routed `@customer` `:2`
- Resolution
  - First reply `@customer` `:3`
  - Solution delivered `@customer` `:4`
  - Close-out `@customer` `:4`

> **Routing latency, not solution quality, drives the orange band.**
> Customers rate the resolution itself a 4 (Solution, Close-out), but
> mood stalls between acknowledge and route. Cutting that gap below
> four hours reclaims the dip.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 04`

## Curve · the emotional arc.

---

<!-- _class: journey curve -->
<!-- _footer: "Curve variant · journey curve" -->

## Quarterly close · the J-curve of the cycle

- Open
  - Kickoff `@finance` `:4`
  - Pull data `@finance` `:3`
- Reconcile
  - Cleanse data `@finance` `:2`
  - First draft `@finance` `:2`
  - Audit cycle 1 `@finance` `@auditor` `:1`
- Close
  - Audit cycle 2 `@finance` `@auditor` `:3`
  - Board pack `@finance` `:4`
  - Submit `@finance` `@cfo` `:5`

> **The trough is the audit, not the math.** Close itself is
> technically straightforward; the dip is reconciliation rework and
> first-audit-pass surprises. Pre-audit prep is the cycle-time unlock.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 05`

## Swimlane · who feels what, where.

---

<!-- _class: journey swimlane -->
<!-- _footer: "Swimlane variant · journey swimlane" -->

## Loan application · two perspectives diverge

- Application
  - Start app `@customer` `:3`
  - Submit docs `@customer` `:2`
- Review
  - Initial review `@underwriter` `:3`
  - Doc requests `@customer` `:1`
  - Re-submit `@customer` `:2`
  - Approve `@underwriter` `:4`
- Funding
  - Sign `@customer` `:5`
  - Disburse `@customer` `@underwriter` `:5`

> **Customer pain peaks where underwriter mood holds.** Their lowest
> point — doc requests at mood 1 — is our steady state. NPS will trail
> underwriting efficiency until doc-request UX is fixed.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 06`

## Weighted · volume × pain in one view.

---

<!-- _class: journey weighted -->
<!-- _footer: "Weighted variant · journey weighted" -->

## Subscription funnel · prioritized by traffic × pain

- Discover
  - Home `@visitor` `:4` `+45`
  - Pricing `@visitor` `:3` `+18`
- Convert
  - Sign-up `@visitor` `:2` `+12`
  - Verify email `@visitor` `:1` `+10`
- Retain
  - Dashboard `@user` `:4` `+8`
  - Settings `@user` `:3` `+4`
  - Support `@user` `:2` `+3`

> **Verify is the highest-leverage fix.** 10% of traffic hits mood 1
> at a single step we fully control. One week of work here outranks
> any home-page optimization on the roadmap.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 07`

## Picking a variant.

---

<!-- _class: tldr -->
<!-- _footer: "Variant guide · tldr" -->

## Which variant when?

- **`journey`** — boardroom-familiar Mermaid look; lowest learning cost
- **`journey heatmap`** — fastest exec scan; "where are the red spots?"
- **`journey curve`** — narrative; "what's the shape of the experience?"
- **`journey swimlane`** — cross-functional; "who feels what, where?"
- **`journey weighted`** — decision-grade; "invest where pain × volume is highest"

Default is `journey` (classic). All five variants accept the same
authored Markdown — only the class changes.

---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "Closing · title" -->

# One layout · five views.

`User journeys, themed and tokenized`

Same Markdown, same data, five distinct analytical reads. Picks up
the active theme's palette through `--cat-*` tokens; mood ramp is
`--journey-mood-1` … `--journey-mood-5`.


<!-- Import Mermaid and the Lattice runtime theme for VS Code / web preview.
     The build script (lattice-emulator.js) pre-renders Mermaid to SVG at build time
     so these scripts are a no-op in the PDF/HTML output. -->
<!-- markdownlint-disable MD033 -->
<script src="../mermaid-v11.min.js"></script>
<script src="../lattice-runtime.js"></script>
