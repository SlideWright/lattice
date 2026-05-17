---
marp: true
theme: indaco
paginate: true
header: "Lattice · subtopic"
---

<!-- _class: title silent -->

# subtopic

`Anchor · Divider · Prose`

Sub-section boundary — lighter than divider, no canvas reskin.

---

<!-- _class: subtopic -->
<!-- _footer: "Default · subtopic" -->

`Anchor family · light divider`

## Subtopic introduces a specific topic within a section.


---

<!-- _class: subtopic numbered -->
<!-- _footer: "Numbered — auto-incrementing module index · subtopic numbered" -->

`Module 04`

## Then the next sub-topic, numbered automatically.


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · subtopic" -->

## When NOT to reach for subtopic.

- **Used as a divider replacement.** If the next slides are an entirely new section, reach for divider (dark canvas, h1). Subtopic is for sub-section orientation, not section starts.
- **Stacked subtopics.** Two subtopic slides back-to-back means the first didn't introduce anything. Merge them or move directly to content.
- **h1 instead of h2.** The layout expects h2 (subtopic name is one level below the section title). Promoting to h1 makes the slide compete visually with the divider.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `divider` — major section starts — darker, h1, dedicated canvas
- `title` — opens the deck — same dark-bookend chrome as divider
- `content` — the body slides that follow a subtopic
