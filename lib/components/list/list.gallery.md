---
marp: true
theme: indaco
paginate: true
header: "Lattice · list"
---

<!-- _class: title silent -->

# list

`Inventory · Stack · Prose`

Plain bullet list under a heading.

---

<!-- _class: list -->
<!-- _footer: "Default · list" -->

## When the items truly are a list.

- Five to six short points, each under twelve words.
- No internal structure per item — if items have title + body, use cards-stack instead.
- Numbered (ol) when order matters; bulleted (ul) when it does not.
- Inline-code metadata at the end of a row becomes a pill via the universal-pill recipe.
- For richer items with descriptions, prefer list-tabular.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · list" -->

## When NOT to reach for list.

- **Title plus body per item.** If each bullet is `**Title.** body`, the layout under-serves it. Move to cards-stack (2-3 items) or list-tabular (5+ rows) instead.
- **Wall of long bullets.** Past twelve words per line the slide becomes paragraph soup. Either trim or move to content for prose, cards-stack for structured items.
- **Two-item lists.** Two bullets read as a thin slide. For pairs, reach for cards-side or compare-prose — both give the pair the weight it deserves.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `tldr` — single-line takeaways at the end of a section
- `cards-stack` — each item has a title plus body sentence
- `list-tabular` — five or more rows with label-plus-description
- `checklist` — items carry state markers (done / partial / todo)
