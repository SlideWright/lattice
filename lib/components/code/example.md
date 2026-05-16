<!-- _class: code -->

## What loading a manifest looks like.

```js
const { loadAll, groupByFunction } = require("./lib/components");

const manifests = loadAll();           // 45 components, validated
const byFunction = groupByFunction(manifests);

for (const m of byFunction.evidence) {
  console.log(m.name, m.form, m.substance);
}
```
