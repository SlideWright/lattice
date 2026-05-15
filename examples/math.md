---
marp: true
theme: indaco
size: hd
paginate: true
math: katex
header: "Lattice · Math Layouts"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "Title slide · title" -->

# Math Layouts

`Boardroom-ready math · 2026`

Seven variants under one `math` class. For quants, mathematicians,
physicists, ML researchers, statisticians, and economists. KaTeX
renders `$...$` inline and `$$...$$` display; the layouts surround the
equations with the structure each audience expects.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 01`

## The hero equation · bare `math` resolves to feature.

---

<!-- _class: math -->
<!-- _header: '' -->
<!-- _footer: "math (bare) — defaults to feature · single hero equation + legend" -->

### Linear regression · OLS

## The closed-form estimator.

$$ \hat\beta = (X^\top X)^{-1} X^\top y $$

- $\hat\beta$ — OLS coefficient vector
- $X$ — design matrix, $n \times p$
- $y$ — response vector, length $n$
- $X^\top X$ — Gram matrix, $p \times p$, must be invertible

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 02`

## The derivation chain · `math derivation`

---

<!-- _class: math derivation -->
<!-- _header: '' -->
<!-- _footer: "math derivation · proof / derivation chain with justification column" -->

## Derivative of $f$ from first principles.

| Step                                                     | Justification             |
| -------------------------------------------------------- | ------------------------- |
| $f(x+h) = f(x) + f'(x)\,h + O(h^2)$                      | Taylor expansion, $n = 2$ |
| $f(x+h) - f(x) = f'(x)\,h + O(h^2)$                      | subtract $f(x)$           |
| $\dfrac{f(x+h)-f(x)}{h} = f'(x) + O(h)$                  | divide by $h \neq 0$      |
| $\displaystyle\lim_{h\to 0} \dfrac{f(x+h)-f(x)}{h} = f'(x)$ | take the limit            |

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 03`

## Definition · theorem · proof · `math theorem`

---

<!-- _class: math theorem -->
<!-- _header: '' -->
<!-- _footer: "math theorem · stacked colour-coded formal-statement cards" -->

## Intermediate Value Theorem.

> **Definition.** A function $f : [a,b] \to \mathbb{R}$ is *continuous* on $[a,b]$ if $\lim_{x\to c} f(x) = f(c)$ for every $c \in [a,b]$.

> **Theorem.** Let $f$ be continuous on $[a,b]$ and let $y$ lie strictly between $f(a)$ and $f(b)$. Then there exists $c \in (a,b)$ with $f(c) = y$.

> **Proof.** Set $S = \{x \in [a,b] : f(x) < y\}$. $S$ is non-empty and bounded; let $c = \sup S$. Continuity at $c$ forces $f(c) = y$. $\square$

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 04`

## Side-by-side · `math compare`

---

<!-- _class: math compare -->
<!-- _header: '' -->
<!-- _footer: "math compare · two- or three-column equation comparison" -->

## Frequentist vs Bayesian point estimate.

### Frequentist

$$ \hat\theta_{\text{MLE}} = \arg\max_\theta\, p(y \mid \theta) $$

Maximises the likelihood — no prior. Uncertainty quantified by the sampling distribution of $\hat\theta$ across hypothetical repeats.

### Bayesian

$$ \hat\theta_{\text{MAP}} = \arg\max_\theta\, p(\theta \mid y) $$

Maximises the posterior — conditions on the prior $p(\theta)$. Uncertainty is the posterior itself, no repeated sampling required.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 05`

## Equation + plot · `math canvas`

---

<!-- _class: math canvas -->
<!-- _header: '' -->
<!-- _footer: "math canvas · equation left, plot right" -->

## The sigmoid.

$$ \sigma(x) = \dfrac{1}{1 + e^{-x}} $$

Maps $\mathbb{R} \to (0,1)$. $S$-shaped, $\sigma(0) = 0.5$, steepest slope at the origin.

```latticeplot
{
  "data": [
    { "fn": "1 / (1 + exp(-x))" },
    { "fn": "tanh(x)" }
  ],
  "xAxis": { "domain": [-6, 6], "label": "x" },
  "yAxis": { "domain": [-1.1, 1.1], "label": "f(x)" },
  "grid": true
}
```

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 06`

## Matrix · `math matrix` and `math matrix decompose`

---

<!-- _class: math matrix -->
<!-- _header: '' -->
<!-- _footer: "math matrix · matrix + properties / dimensions / interpretation" -->

## The design matrix $X$.

$$
X = \begin{pmatrix}
1 & x_{11} & \cdots & x_{1p} \\
1 & x_{21} & \cdots & x_{2p} \\
\vdots & \vdots & \ddots & \vdots \\
1 & x_{n1} & \cdots & x_{np}
\end{pmatrix}
$$

- **shape** — $n \times (p+1)$
- **rows** — observations
- **cols** — intercept + $p$ features
- **rank** — full-rank for OLS to have a unique solution
- **column 0** — all-ones, absorbs the intercept

---

<!-- _class: math matrix decompose -->
<!-- _header: '' -->
<!-- _footer: "math matrix decompose · multi-matrix sequence (SVD, LU, eigen, …)" -->

## Singular value decomposition.

$$ A = U\,\Sigma\,V^\top $$

### Component matrices

$$ U \in \mathbb{R}^{m\times m} $$

$$ \Sigma \in \mathbb{R}^{m\times n} $$

$$ V \in \mathbb{R}^{n\times n} $$

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section divider · divider" -->

`Section 07`

## Statistical result · `math stats`

---

<!-- _class: math stats -->
<!-- _header: '' -->
<!-- _footer: "math stats · estimate ± uncertainty + interpretation" -->

## Effect of the treatment.

$$ \hat\beta = 0.42 \pm 0.03 $$

> 95% CI: $[0.36,\; 0.48]$
> $p < 0.001 \quad\cdot\quad n = 1{,}204$

For every additional unit of exposure, the outcome rises by 0.42 SD — roughly an **8%** shift on the baseline. Effect size is the headline; the $p$-value just rules out chance.

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _footer: "Closing slide · closing" -->

# Seven variants. One contract.

`math · math derivation · math theorem · math compare · math canvas · math matrix · math stats`

KaTeX renders the equations; Lattice provides the room around them.
