---
marp: true
theme: indaco
size: 16:9
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

## My working day

- Go to work
  - Make tea `@me` `:5`
  - Go upstairs `@me` `:3`
  - Do work `@me` `@cat` `:1`
- Go home
  - Go downstairs `@me` `:5`
  - Sit down `@me` `:5`

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 03`

## Heatmap · friction at a glance.

---

<!-- _class: journey heatmap -->
<!-- _footer: "Heatmap variant · journey heatmap" -->

## Onboarding · where do we lose people?

- Acquisition
  - Land on site `@visitor` `:4`
  - Read pricing `@visitor` `:3`
- Sign-up
  - Create account `@visitor` `:3`
  - Verify email `@visitor` `:2`
  - First login `@user` `:3`
- Activation
  - Tour `@user` `:4`
  - First action `@user` `:5`

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 04`

## Curve · the emotional arc.

---

<!-- _class: journey curve -->
<!-- _footer: "Curve variant · journey curve" -->

## Quarterly close · the shape of the week

- Monday
  - Kickoff `@finance` `:4`
  - Pull data `@finance` `:3`
- Mid-week
  - Reconcile `@finance` `:2`
  - First draft `@finance` `:3`
  - Review cycle 1 `@finance` `@cfo` `:2`
- Late week
  - Review cycle 2 `@finance` `@cfo` `:3`
  - Board pack `@finance` `:4`
  - Submit `@finance` `:5`

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 05`

## Swimlane · who feels what, where.

---

<!-- _class: journey swimlane -->
<!-- _footer: "Swimlane variant · journey swimlane" -->

## Support escalation · two perspectives

- Intake
  - Submit ticket `@customer` `:2`
  - Triage `@agent` `:4`
- Resolution
  - First reply `@agent` `:4`
  - Wait `@customer` `:1`
  - Follow-up `@agent` `@customer` `:3`
- Close
  - Solution `@agent` `:5`
  - Confirm `@customer` `:4`

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 06`

## Weighted · volume × pain in one view.

---

<!-- _class: journey weighted -->
<!-- _footer: "Weighted variant · journey weighted" -->

## Where to invest · prioritized by traffic

- Discover
  - Home `@visitor` `:4` `+45`
  - Pricing `@visitor` `:3` `+18`
- Convert
  - Sign-up `@visitor` `:2` `+12`
  - Verify `@visitor` `:1` `+10`
- Retain
  - Dashboard `@user` `:4` `+8`
  - Settings `@user` `:3` `+4`
  - Support `@user` `:2` `+3`

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
