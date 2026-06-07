---
marp: true
theme: indaco
paginate: true
header: "Lattice · compare-code"
---

<!-- _class: title silent -->

# compare-code

`Comparison · Split · Structure`

Two fenced code blocks side-by-side, each with a label.

---

<!-- _class: compare-code -->
<!-- _footer: "Default · compare-code" -->

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


---

<!-- _class: compare-code mirror -->
<!-- _footer: "Mirror — swap left and right · compare-code mirror" -->

`After & before · Component manifest loading`

## Folder-shape lookup, with the prior approach for reference.

`After · folder shape`

```js
function loadOne(name) {
  const p = path.join(
    __dirname, 'lib', 'components',
    name, 'manifest.json'
  );
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
```

`Before · flat file`

```js
function loadOne(name) {
  const p = path.join(
    __dirname, 'lib', 'components',
    `${name}.json`
  );
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
```


---

<!-- _class: compare-code dark -->
<!-- _footer: "Composition: dark · compare-code dark" -->

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


---

<!-- _class: compare-code compact -->
<!-- _footer: "Composition: compact · compare-code compact" -->

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


---

<!-- _class: compare-code accent -->
<!-- _footer: "Composition: accent · compare-code accent" -->

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


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · compare-code" -->

## When NOT to reach for compare-code.

- **One side is prose.** If one column is code and the other is description, use a single fenced block with surrounding prose. compare-code is for code-versus-code.
- **Snippets longer than 14 lines.** The text shrinks below readability past 14 lines per side. Split into two slides or extract the key delta into a smaller diff.
- **Three-way comparison.** compare-code is binary. For three configurations or three implementations, use prose with successive fenced blocks or a `compare-table`.

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `before-after` — the change is state, not code
- `compare-prose` — the comparison is prose-versus-prose
- `redline` — the change is in verbatim text or legal language
- `compare-table` — three or more variants on shared dimensions
