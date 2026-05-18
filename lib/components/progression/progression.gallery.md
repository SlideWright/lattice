<!-- _class: title silent -->

# progression

`6 components`

Progression — ordered movement through stages or time.


---

<!-- _class: journey -->

## Customer onboarding · trial to activation.

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

---

<!-- _class: list-criteria -->

## What every component manifest must satisfy.

1. **Stable name.** Kebab-case, matching the `_class` directive authors type when invoking the component.
2. **Function coordinate.** One of seven families per the four-layer model: anchor, statement, inventory, comparison, progression, evidence, imagery.
3. **Form coordinate.** One of eleven spatial shapes: bookend, divider, canvas, grid, stack, ledger, panel, matrix, scatter, timeline, split.
4. **Substance coordinate.** One of four plugin contracts: prose, structure, series, graph (or mixed for panel-form components).
5. **Skeleton plus sample.** Skeleton scaffolds blank slides for the new-slide CLI; sample demonstrates the component substantively for the gallery.

---

<!-- _class: list-steps -->

## How to add a new component to Lattice.

1. Scaffold the folder
   - Create `lib/components/<name>/` with a manifest declaring name, function, form, substance, slots, and skeleton.
2. Author the styles
   - Scope the CSS to the section class. Use palette tokens — no hex literals in layout rules.
3. Add a transform if needed
   - Substance `structure` or `series` ships a transform module wired into all three render paths.
4. Demo and document
   - Author `<name>.example.md` and enrich the manifest with sample, whenToUse, antiPatterns, and related. The generator emits the docs and gallery sidecars.

---

<!-- _class: roadmap -->

`Layout · roadmap`

## What ships in each phase, by workstream.

| Workstream | Foundation `Q2 2026`  | Hardening `Q3 2026`    | Scale `Q4 2026`           |
| ---------- | --------------------- | ---------------------- | ------------------------- |
| Platform   | [x] Codebook signing  | [-] Multi-tenant DEKs  | [ ] Per-purpose codebooks |
| Operations | [x] Manual rotation   | [-] Automated rotation | [ ] Crypto-shred          |
| Compliance | [x] Audit trail       | [x] Centralised log    | [ ] Examiner pack         |
| SDK        | [x] Java              | [/] .NET               | [ ] Polyglot parity       |

State markers `[x]/[-]/[ ]/[/]` are universal: ✓ shipped, ◐ in flight, ○ planned, ╱ out of scope.

---

<!-- _class: split-steps -->

`02`

## Discovery and Scoping

Four weeks. Shared definition of the problem before any solution work begins.

1. Stakeholder Interviews
   - Eight cross-functional conversations. Open questions only — listening for friction, not confirming assumptions.
2. Current-State Audit
   - System inventory, workflow documentation, and data-quality review feed a single source-of-truth artefact.
3. Problem Framing Workshop
   - Half-day session to align on root cause. Output is a ranked problem statement the team signs off on.
4. Scope Confirmation
   - Written sign-off on what is in, what is out, and what requires a separate decision.

---

<!-- _class: timeline -->

## How a deck moves from draft to share.

1. **Draft**
   - *Author writes markdown with the appropriate `_class` directives.*
2. **Build**
   - *`npm run build:<deck>` renders HTML then PDF via Puppeteer.*
3. **Review**
   - *Reviewer opens the raw PDF link; the per-feature deck shows the change in context.*
4. **Ship**
   - *Merge the PR; CI rebuilds against main and refreshes the gallery.*
