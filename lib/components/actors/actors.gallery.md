---
marp: true
theme: indaco
paginate: true
header: "Lattice · actors"
---

<!-- _class: title silent -->

# actors

`Inventory · Ledger · Structure`

Roster of responsibilities owned by named actors.

---

<!-- _class: actors -->
<!-- _footer: "Default · actors" -->

## Who owns each part of the lifecycle.

- **Author.** Drafts the deck; owns content and framing.
- **Reviewer.** Validates clarity, factual accuracy, and audience-fit.
- **Engineer.** Ensures the build path renders the same PDF Marp preview shows.
- **Designer.** Owns the visual contract; palette tokens, layout balance, typography.
- **Operator.** Schedules the briefing; controls the room and the projector.


---

<!-- _class: cards-grid -->
<!-- _footer: "Anti-patterns · actors" -->

## When NOT to reach for actors.

- **Process sequence.** If the rows describe stages in order, use list-steps or process-flow. actors is for parallel ownership, not handoff sequence.
- **Long per-actor prose.** More than one sentence per row crowds the ledger. Move the detail to a dedicated slide and keep actors as the index.
- **Roles without names.** If the labels are job titles in the abstract ("the engineer"), reach for cards-stack or list. The actors layout earns its weight when the names are named.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `list-tabular` — rows are reference entries, not owners
- `cards-stack` — each item needs two sentences of body text
- `principles` — stating shared rules rather than per-actor responsibilities
- `glossary` — the left column is a term, not an actor
