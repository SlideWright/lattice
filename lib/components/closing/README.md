# closing

> Final slide. Dark canvas mirror of title.

**Function** anchor · **Form** bookend · **Substance** prose

## When to use

Every deck ends here. The closing slide restates the takeaway or
makes the call to action. Like `title`, it suppresses header, footer,
and pagination — the dark canvas signals "we're done."

Use `accent` modifier to recolour the focal heading.

## Authoring

```markdown
<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Closing takeaway or call to action
```

Tip: replace those three Marp suppression directives with the universal
`silent` variant for cleaner source: `<!-- _class: closing silent -->`.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| heading | `h1` | yes | the closing line |
| eyebrow | `p > code` | no | category label |
| subtitle | `p` | no | supporting line |

## Variants

Layout-specific: `numbered` (renumbered closing — useful for serialized
deck families). Inherits universals + semi-universals.
