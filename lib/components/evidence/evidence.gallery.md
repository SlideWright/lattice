<!-- _class: title -->

# evidence

Evidence — data that supports the argument.

6 components: `citation-card` · `code` · `kpi` · `math` · `split-metric` · `stats`


---

<!-- _class: citation-card -->

## What counts as "personal information" under CCPA.

`Cal. Civ. Code §1798.140(o) · CCPA/CPRA`

> "Personal information" means information that identifies, relates to, describes, is reasonably capable of being associated with, or could reasonably be linked, directly or indirectly, with a particular consumer or household.

- In plain English: any data tied to a household or device, not just a named person — IP addresses, cookie IDs, and device fingerprints are all in scope.
- What we must do.
  - Treat household-level identifiers as PI in our notice, retention, and DSAR workflows. Audit pixel and tag inventory next quarter.

---

<!-- _class: code -->

## What loading a manifest looks like.

```js
const { loadAll, groupByFunction } = require("./lib/components");

const manifests = loadAll();           // 58 components, validated
const byFunction = groupByFunction(manifests);

for (const m of byFunction.evidence) {
  console.log(m.name, m.form, m.substance);
}
```

---

<!-- _class: kpi -->

### Financial · Q4 2026
## Revenue ahead of plan; margin and cash both expanded.

1. **$2.4B**
   - Total revenue
   - target $2.2B · +9% `On plan` `Board`
2. **42%**
   - Gross margin
   - +2pp QoQ `On plan` `Audit`
3. **$1.1B**
   - Cash & equivalents
   - +$180M QoQ `On plan` `Investor`
4. **+18%**
   - YoY revenue growth
   - vs 14% prior year `Ahead` `Board`

---

<!-- _class: math -->

### Linear regression · OLS

## The closed-form estimator.

$$ \hat\beta = (X^\top X)^{-1} X^\top y $$

- $\hat\beta$ — OLS coefficient vector
- $X$ — design matrix, $n \times p$
- $y$ — response vector, length $n$
- $X^\top X$ — Gram matrix, $p \times p$, must be invertible

---

<!-- _class: split-metric -->

`Net Revenue Retention`

## 114*%*

Measured across all customers active for 12+ months, March 31 cohort.

- **Existing customers are growing faster than we lose them.**
  - At 114%, every churned dollar is offset by $1.14 in expansion. The base compounds without new-logo dependency.
- **Expansion is concentrated — three segments drive 80% of the gain.**
  - Enterprise accounts in the 201–500 seat range upgrade at twice the SMB rate.
- **Sustained above 110%, this unlocks a capital-efficient growth path.**
  - NRR above 110% meets the investor threshold for venture-category efficiency.

---

<!-- _class: stats -->

`Impact · Pilot Results`

## Six months of results across four product teams.

`Measured against pre-framework baseline, same teams, same market conditions.`

1. **73%** faster close
2. **4.2×** signal recall
3. **$1.2M** prevented losses
4. **−18d** avg cycle time
