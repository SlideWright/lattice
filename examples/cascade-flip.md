---
marp: true
theme: indaco
paginate: true
header: "Export cascade flip · #1527"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# The palette wins the export, at last.

`Engine · #1527 · 2026-08-17`

Every surface on the following slides is painted by a token indaco curates for itself — and every one of them rendered in base's default color until this change.

---

<!-- _class: code -->
<!-- _footer: "Syntax colors — the twelve `--hljs-*` tokens" -->

## The code panel reads in indaco's own Night Owl palette.

```js
app.post('/api/v2/auth', async (req, res) => {
  const session = await issueSession(req.body);   // 42 minutes
  if (!session) return res.status(401).json({ error: 'denied' });
  res.json({ session, issued: true });
});
```

- **What moved.** indaco declares all twelve syntax colors. The export loaded the base sheet last, so every one of them lost.

---

<!-- _class: kpi -->
<!-- _footer: "Status trio — `--pass` / `--warn` / `--fail`" -->

## The status pills take the theme's curated trio.

1. $2.4B
   - Total revenue
   - target $2.2B · +9% `On plan`
2. 42%
   - Gross margin
   - -1pp QoQ `At risk`
3. $1.1B
   - Cash & equivalents
   - -$180M QoQ `Breaching`

---

<!-- _class: redline -->
<!-- _footer: "Tracked changes — `--pass` / `--fail` over their own 10% tints" -->

## The opt-out clause moved from two methods to one.

`Cal. Civ. Code §1798.135 · SB-362 (2024)`

> A business that <del>collects</del> <ins>collects, sells, or shares</ins> consumers' personal information shall provide <del>two or more</del> <ins>at least one</ins> designated method for submitting requests to opt-out, <ins>including a clear and conspicuous homepage link titled "Your Privacy Choices,"</ins> for use by consumers.

- **Why this matters.** Each run sits on a 10% tint of its own ink, so the band moves with the text — the least forgiving surface for a wrong cascade.

---

<!-- _class: word-cloud spectrum -->
<!-- _footer: "Sequential ramp — `--seq-700` / `--seq-500` / `--seq-400`" -->

## Where the amendment concentrated its language.

- consumer `5`
- disclosure `4`
- opt-out `4`
- processing `3`
- retention `3`
- broker `2`
- deletion `2`
- portability `1`

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

## One cascade order, on every render path.

`layout first, palette second — lib/engine/css.js composeCss`
