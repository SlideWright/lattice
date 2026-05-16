<!-- _class: compare-code -->

`Before & after · Component manifest loading`

## Bare `<name>.json` versus folder `<name>/manifest.json`.

`Before · flat file`

```js
const m = loadOne(
  path.join(__dirname, "lib", "components", "cards-grid.json")
);
```

`After · folder shape`

```js
const m = loadOne(
  path.join(__dirname, "lib", "components", "cards-grid", "manifest.json")
);
```
