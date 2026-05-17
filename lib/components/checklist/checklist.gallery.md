---
marp: true
theme: indaco
paginate: true
header: "Lattice · checklist"
---

<!-- _class: title silent -->

# checklist

`Inventory · Stack · Structure`

Items with state markers — done, partial, todo.

---

<!-- _class: checklist -->
<!-- _footer: "Default · checklist" -->

## Pre-flight checklist for a new component.

- [x] Pick function and form coordinates per the spec
- [x] Write the manifest with name, function, form, substance, and slots
- [x] Author CSS rules scoped to the section class
- [-] Add a transform module if substance is structure or series
- [-] Write a substantive example and README
- [ ] Update the templates catalog reference
- [ ] Add unit tests under the new component test path


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · checklist" -->

## When NOT to reach for checklist.

- **All-done lists.** If every item is `[x]` the state markers are decoration. Use `list` or `tldr` for celebratory recaps; checklist earns its weight when the mix matters.
- **Long per-item prose.** Each item is one short line. If a row needs a sentence of explanation, the right home is cards-stack or list-tabular.
- **Custom state markers.** Only `[x]`, `[-]`, and `[ ]` map to the glyph palette. Authoring `[?]` or `[!]` renders as literal text and breaks the visual contract.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `list` — items have no state — just bullets
- `tldr` — summary lines without per-item completion tracking
- `list-tabular` — rows need a label-plus-description structure, not state
- `cards-stack` — each item needs two sentences of body
