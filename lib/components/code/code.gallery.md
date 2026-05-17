---
marp: true
theme: indaco
paginate: true
header: "Lattice · code"
---

<!-- _class: title silent -->

# code

`Evidence · Canvas · Prose`

Single fenced code block as the slide's centerpiece.

---

<!-- _class: code -->
<!-- _footer: "Default · code" -->

## What loading a manifest looks like.

```js
const { loadAll, groupByFunction } = require("./lib/components");

const manifests = loadAll();           // 58 components, validated
const byFunction = groupByFunction(manifests);

for (const m of byFunction.evidence) {
  console.log(m.name, m.form, m.substance);
}
```


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · code" -->

## When NOT to reach for code.

- **Comparing two versions.** If you need before/after, use compare-code — it gives both snippets parallel framing. code is for a single snippet doing one job.
- **Code-as-decoration.** A screenshot of an IDE or a snippet the audience cannot read defeats the layout. If the code is too long to legibly fit, the slide isn't a code slide — it's a content slide that talks about code.
- **No language hint.** A bare fence renders as undifferentiated mono. Always tag the language so the highlighter and the reviewer both know what they are looking at.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `compare-code` — before/after snippet comparison
- `diagram` — the architecture matters more than the code
- `math` — the equation is the argument, not the implementation
- `content` — code is one piece of a longer prose explanation
