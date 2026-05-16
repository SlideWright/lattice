# title

> Opening slide. Dark canvas, centered, no chrome.

**Function** anchor · **Form** bookend · **Substance** prose

## When to use

Every deck starts here. The title slide sets topic, audience, and
visual tone. Always suppresses header, footer, and pagination — or use
the universal `silent` modifier for the same effect in one token.

## Authoring

```markdown
<!-- _class: title silent -->

# Deck title goes here

`Category · Date or audience`

One-line subtitle that frames the deck.
```

The inline-code paragraph after the h1 becomes the eyebrow (rendered
visually ABOVE the title via flex order — non-obvious markdown trick).
The plain paragraph after that becomes the subtitle.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| heading | `h1` | yes | the deck title |
| eyebrow | `p > code` | no | inline-code paragraph after h1 |
| subtitle | `p` | no | plain paragraph after eyebrow |

## Variants

Layout-specific: *(none)*. Inherits universals + semi-universals.
