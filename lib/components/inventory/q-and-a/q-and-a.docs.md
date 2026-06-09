# q-and-a

> Anticipated questions paired with prepared answers — the end-of-pitch 'what we expect to be asked' slide.

**Function** inventory · **Form** stack · **Substance** structure

**Tags** `pitch` · `board-deck` · `recommendation`

Use to pre-empt the room: line up the three or four hardest questions the audience will raise and answer each one before it is asked. The question reads as a prompt; the prepared answer carries the substance. Distinct from a reference FAQ (many terse look-up pairs) — this is a few weighty defenses of a recommendation.

## When to use

- **The questions are the point.** The slide that ends a pitch by naming the hard questions and answering them first. Anticipating the objection and closing it on your terms is more persuasive than waiting to be asked — it signals you have already done the thinking.
- **Three or four weighty pairs.** A few substantive questions, each with a reasoned two-to-three-sentence answer. Past five the answers compress below persuasion; for a long reference list of one-line look-ups use `faq` or `glossary` instead.
- **Question as prompt, answer as substance.** The layout deliberately weights the two unequally — the question is the lighter prompt, the answer is the payoff. Lead each pair with the interrogative line and nest the prepared answer one level under it.

## When NOT to use

- **A flat FAQ of one-liners.** Six or more terse question/answer pairs you flip back to as a reference belong in `faq` or `glossary`, which are built to stack many short look-ups. q-and-a is for a few defended answers, not a help page.
- **Rhetorical questions with no answer.** Every question needs a nested answer that genuinely closes it. A bare question used as a section header or a hook is a `divider` or a `statement`, not a Q&A pair.
- **Evaluation criteria in disguise.** If the top-level item is a requirement you are scoring against (with a rationale below), that is `list-criteria`, not a question you expect to be asked. q-and-a defends; list-criteria evaluates.

## Authoring

```markdown
<!-- _class: q-and-a -->

## What we expect to be asked.

- First question the audience will raise?
  - The prepared answer — two or three sentences that close it down.
- Second question?
  - The prepared answer.
- Third question?
  - The prepared answer.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `eyebrow` | `p > code:only-child` | no | Optional kicker above the headline — wrap a short label in backticks, e.g. `Anticipated questions`. |
| `title` | `h2` | no | Optional headline framing the set — name the pressure ('What the board will press on'), not a bare label ('Q&A'). |
| `question` | `ul > li, ol > li` | yes | One top-level list item per question, in the order you want to take them (lead with the toughest). Author it as plain interrogative text — no bold. Use a `ul` for unnumbered questions or an `ol` to number them. |
| `answer` | `ul > li > ul > li, ol > li > ol > li` | yes | The prepared answer, nested one level under its question. Two or three sentences that actually close the question down — a reasoned response, not a restatement. Every question needs one. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│       What we expect to be asked.       │
│                                         │
│  Q  Why not wait two quarters?          │
│  A  The window closes in Q3.            │
│                                         │
│  Q  What if pricing shifts?             │
│  A  Contracts lock 2026 rates.          │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `solo` — Solo — one question, one answer

Gives a single question and its answer the whole slide, at display weight — for the one objection you know is coming and want to meet head-on. The question runs large as a prompt; the prepared answer sits below it in message type.

```markdown
<!-- _class: q-and-a solo -->

## The one question we know is coming.

- If the pilot fails, what have we actually lost?
  - One quarter and $180K, fully recoverable. The contract caps exposure at the pilot scope, with no auto-renewal and a thirty-day exit. The downside is bounded; the upside is the whole thesis.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`faq`](../faq/faq.docs.md) — many terse reference questions to flip back to, not a few weighty defenses
- [`glossary`](../../inventory/glossary/glossary.docs.md) — term/definition reference pairs rather than question/answer pairs
- [`list-criteria`](../../progression/list-criteria/list-criteria.docs.md) — numbered criteria with rationale — evaluation, not anticipated objections
- [`cards-stack`](../../inventory/cards-stack/cards-stack.docs.md) — parallel co-equal cards with no question/answer role split
- [`decision`](../../comparison/decision/decision.docs.md) — a single verdict to state rather than a set of questions to defend

## Demo deck

See [q-and-a.gallery.light.pdf](./q-and-a.gallery.light.pdf) for rendered examples of every variant.
