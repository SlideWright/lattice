# citation-card

> Single authoritative reference — heading + citation + verbatim quote + plain-English gloss.

**Function** evidence · **Form** canvas · **Substance** prose

Use when one citation IS the slide. The blockquote carries the verbatim language; the trailing list explains what it means and what we must do about it.

## When to use

- **One citation carries the slide.** When a single statute, contract clause, regulation, or standard is doing the argumentative work. The citation IS the evidence; the slide gives it the room to be read.
- **Verbatim language matters.** Reach for citation-card when the exact wording is load-bearing — definitions, scope clauses, exception language. The blockquote preserves the language unmodified so the gloss can interpret it.
- **Audience needs the 'so what'.** The gloss list translates legalese into plain English and names the concrete action. Without it the slide is a quotation; with it the slide is a decision.

## When NOT to use

- **Multiple citations on one slide.** If you are stacking two or three statutes, use statute-stack instead — citation-card is built for the canvas-weight treatment of a single authority.
- **Paraphrased 'quote'.** If you are rewriting the source language, drop the citation framing and use content or split-statement. The whole point of citation-card is verbatim language with attribution.
- **Gloss longer than the quote.** When the plain-English explanation runs three paragraphs, the citation is no longer the focus. Trim the gloss to one sentence plus a `What we must do` action, or move to content.

## Authoring

```markdown
<!-- _class: citation-card -->

## Headline framing what this citation establishes.

`Citation reference · short name`

> Verbatim quotation of the cited language.

- Plain-English interpretation of what the language covers.
- **What we must do.** The concrete action this citation argues for.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `heading` | `h2` | yes | Slide heading framing what the citation establishes. |
| `citation` | `p:first-of-type > code` | yes | Inline-code paragraph with the citation reference (e.g. 'Cal. Civ. Code §1798.140(o) · CCPA/CPRA'). |
| `quotation` | `blockquote` | yes | Verbatim quote of the cited language. |
| `gloss` | `ul > li` | no | Optional plain-English interpretation. Use **What we must do** for the actionable item. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│  Single authority heading.              │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ § Citation reference here         │  │
│  │ — full title of authority         │  │
│  │ Holding or principle gloss        │  │
│  └───────────────────────────────────┘  │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `pull-quote` — Pull-quote treatment

Promotes the blockquote to a pull-quote scale — the verbatim language reads as the headline; the gloss compresses to the actionable item.

```markdown
<!-- _class: citation-card pull-quote -->

## "Personal information" includes the household, not just the person.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> Information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- What we must do.
  - Audit pixel inventory; treat household IDs as PI in DSAR workflows.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, decoration backgrounds). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`statute-stack`](../statute-stack/statute-stack.docs.md) — two or three citations need to land on one slide
- [`quote`](../quote/quote.docs.md) — the source is a person, not a document
- [`split-statement`](../split-statement/split-statement.docs.md) — a quote with three or four implications
- [`content`](../content/content.docs.md) — the citation is one input among several in a prose argument

## Demo deck

See [citation-card.gallery.pdf](./citation-card.gallery.pdf) for rendered examples of every variant.
