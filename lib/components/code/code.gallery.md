<!-- _class: title silent -->

# code

`2 components`

Code — syntax-highlighted source code blocks.


---

<!-- _class: code -->

## How a signal earns its score.

```js
function scoreSignal({ confidence, relevance, observedAt }, weights) {
  const ageDays = (Date.now() - observedAt) / DAY_MS;
  const recency = Math.exp(-ageDays / weights.halfLife);

  return (
    confidence * weights.confidence +
    recency * weights.recency +
    relevance * weights.relevance
  );
}
```

---

<!-- _class: compare-code -->

`Query path · report generation`

## The N+1 query that slowed every report.

`Before · one query per row`

```js
const signals = await db.signals.findAll();
for (const s of signals) {
  s.owner = await db.users.find(s.ownerId);
}
return signals;
```

`After · one batched join`

```js
const signals = await db.signals.findAll({
  include: { owner: true },
});
return signals;
```
