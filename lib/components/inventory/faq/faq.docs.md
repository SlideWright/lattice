# faq

> Frequently-asked questions laid out in five spatial forms — ledger, card grid, split panel, indexed stack, or statement focus.

**Function** inventory · **Form** ledger · **Substance** structure

**Tags** `reference` · `onboarding` · `compliance` · `board-deck`

Use for any Q&A content where the audience benefits from pre-answered questions: investor due diligence, onboarding packets, product launches, legal FAQs, or objection-handling slides. Choose the variant that matches the weight of the content.

## When to use

- **Pre-answered questions.** When the audience will have the same predictable questions and the deck is the right place to answer them — due diligence packs, onboarding docs, product launches, policy walkthroughs.
- **Choose the variant by content weight.** Default (faq) for boardroom authority: dark left panel, watermark, 3–5 items. Ledger (faq ledger) for reference density: 4–6 items, short answers, scan-and-move-on. Cards (faq cards) for 4–6 standalone Q&As that each deserve reading. Indexed (faq indexed) when sequence matters. Focused (faq focused) for the one question that dominates a slide.
- **Four to six entries for list variants.** Below four, the layout feels sparse. Above six, the slide tips toward a wall of text. Use compact for six or more. faq.focused is always one entry.

## When NOT to use

- **Inline question-answer on one bullet.** Do not write `- **Question?** Answer here.` — the answer inherits bold weight and runs into the question. Use the nested format: `- Question? \n  - Answer.`
- **Multi-sentence answers in ledger or indexed.** One sentence per answer on the ledger and indexed variants. If an answer needs two sentences, the question deserves its own slide or use faq.focused.
- **Using faq.focused for multiple questions.** faq.focused is a statement layout — one question per slide. If you have several to handle, use faq.cards or faq.indexed.

## Authoring

```markdown
<!-- _class: faq -->

## Common Questions

- Question one?
  - Answer to question one.
- Question two?
  - Answer to question two.
- Question three?
  - Answer to question three.
- Question four?
  - Answer to question four.
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading naming the FAQ set. On the default panel layout, renders anchored to the bottom-left of the dark accent panel. |
| `entries` | `ul > li` | yes | One outer li per Q&A pair. The outer li text is the question (auto-bold); a single nested li is the answer. faq.focused uses h2 + p instead. |

## Variants (layout-specific)

### `ledger` — Ledger — two-column rows

Question bold left (36%), answer right (64%). Reference-density. 4–6 items.

```markdown
<!-- _class: faq ledger -->

## Frequently Asked Questions

- What is the onboarding timeline?
  - New hires complete all paperwork and training within their first 30 days.
- How does the expense policy work?
  - Up to $150 without pre-approval; over $150 requires a receipt and manager sign-off in Expensify.
- Where is the engineering handbook?
  - Notion → Engineering Hub → Handbook. Your manager shares the link on day one.
- Who handles benefits questions?
  - People Ops owns benefits. DM @hr-team in Slack or book a 15-minute slot via Calendly.
```

### `cards` — Cards — card grid

2×N grid. Each Q+A is a card with a 4px accent top bar. 4–6 cards.

```markdown
<!-- _class: faq cards -->

## Frequently Asked Questions

- Does the platform support SSO?
  - Yes. SAML 2.0 and OIDC are supported out of the box; SCIM provisioning is available on Enterprise.
- Is there a free trial?
  - All plans include a 14-day free trial with no credit card required.
- What is the uptime SLA?
  - 99.9% uptime on Growth and above, with 24-hour incident response on Enterprise.
- Can we export our data?
  - Full export in JSON and CSV within 48 hours of any request or cancellation.
```

### `indexed` — Indexed — numbered stack

Full-width cards with accent number badge. Q bold, A below. 3–5 items.

```markdown
<!-- _class: faq indexed -->

## Top Questions, Answered

- What is our go-to-market strategy?
  - We sell direct to enterprise accounts over $500K ARR via a 90-day land-and-expand motion.
- Who are our reference customers?
  - We have ten public referenceable logos across finance, healthcare, and logistics.
- When do we expect profitability?
  - Contribution-margin positive in Q3 at current growth; cash-flow positive in 18 months.
```

### `focused` — Focused — statement

One Q+A at statement scale. Authoring: h2 for question, p for answer.

```markdown
<!-- _class: faq focused -->

## Is this genuinely enterprise-grade?

Every one of our 400 enterprise customers runs mission-critical workloads on the platform — with a 99.97% uptime SLA backed by contractual guarantees, not marketing language.
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`glossary`](../../inventory/glossary/glossary.docs.md) — term/definition format rather than question/answer
- [`split-list`](../../statement/split-list/split-list.docs.md) — thesis in a dark panel + supporting points, not Q&A
- [`checklist`](../../inventory/checklist/checklist.docs.md) — items need pass/partial/fail status markers
- [`cards-stack`](../../inventory/cards-stack/cards-stack.docs.md) — items are parallel descriptions, not Q&A pairs

## Demo deck

See [faq.gallery.light.pdf](./faq.gallery.light.pdf) for rendered examples of every variant.
