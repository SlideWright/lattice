---
marp: true
theme: indaco
paginate: true
header: "Lattice · decision"
---

<!-- _class: title silent -->

# decision

`Comparison · Canvas · Structure`

The verdict slide — one chosen path, named explicitly.

---

<!-- _class: decision -->
<!-- _footer: "Default · decision" -->

## What we are doing.

- **Chosen path.** Self-contained per-component folders at lib/components, one folder per component. Holds manifest plus styles plus optional transform plus example plus README.
- **Rejected option.** Flat files alongside each other in lib/components. Defeats the self-contained goal and leaves transform.js scattered.


---

<!-- _class: cards-grid -->
<!-- _footer: "Anti-patterns · decision" -->

## When NOT to reach for decision.

- **No clear chosen path.** If the cards don't name one focal verdict, the slide is back to being a comparison. Use `compare-prose` or `split-compare`; reserve decision for the resolved call.
- **Long body per card.** Each card is one sentence of rationale. Paragraphs belong on the comparison slide upstream, not on the verdict slide.
- **Generic heading.** The h2 carries the decision verb — Build, not buy. Adopt the framework. Pause the rollout. A heading like Next steps wastes the focal real estate.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `compare-prose` — the comparison slide that should precede decision
- `split-compare` — comparison and verdict on one slide instead of two
- `closing` — the deck ends without a single-call verdict
- `big-number` — the decision is a quantitative commitment
