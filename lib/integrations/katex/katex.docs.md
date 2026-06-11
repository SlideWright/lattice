# katex

Lattice's integration with [KaTeX](https://katex.org/) — the math
rendering library used to render LaTeX-style equations on slides.
Primary consumer: the `math` component.

**External dep:** `katex` (declared directly in `package.json` — not
transitive).

**This folder has no hand-authored CSS file** because KaTeX ships its own
~720-selector layout sheet (`node_modules/katex/dist/katex.min.css`), which
Lattice vendors from the package at build time rather than re-authoring.
`tools/build-css.js` reads it, rewrites the relative `fonts/` URLs to the
pinned jsDelivr CDN (exactly as marp-core does), and bundles it into
`dist/lattice.css` — so the owned CSS emitter ships math styling itself, with
no marp-core dependency. See "CSS handoff" below.

---

## Render pipeline

KaTeX is invoked at build time in `lattice-emulator.js`:

1. A markdown `$$…$$` block (display math) or `$…$` span (inline math)
   is extracted by the math-fence preprocessor (`lattice-emulator.js`
   lines ~110-140).
2. Each fence's LaTeX source is registered in a per-deck `mathRegistry`.
3. `katex.renderToString(tex, {displayMode, throwOnError: false})`
   produces a static HTML snippet with `<span class="katex">…</span>`
   markup.
4. The rendered HTML is spliced back into the slide at the original
   location.
5. KaTeX's stylesheet (`katex.min.css`) is read from `node_modules` at
   build time and embedded in the output HTML so the rendered spans
   read correctly regardless of where the deck is viewed.

The Marp Core path uses Marp's built-in KaTeX support (config in
`marp.config.js`'s `math` option). Both paths produce equivalent
output — KaTeX is deterministic given the same input.

---

## CSS handoff

KaTeX's base sheet defines ~720 selectors for math glyph spacing, fraction
bars, radicals, matrices, etc. It reaches a rendered deck three ways, all
equivalent:

- **Owned engine / `dist/lattice.css`** — `tools/build-css.js` bundles the
  CDN-rewritten base into the engine sheet (before components, so Lattice's
  tweaks win on source order). This is what un-blocks the owned CSS emitter.
- **marp-cli / emulator (PDF)** — `lattice-emulator.js` links the local
  `katex.min.css` into the export HTML (`--allow-local-files`).
- **marp-core path** — marp injects its own copy via its `math` option.
  During the marp→owned transition both copies coexist in the marp path;
  they are byte-equivalent (same pinned version, same CDN), so the duplicate
  is inert and disappears once marp is removed.

Lattice doesn't override the base layout — KaTeX's typography is the math
typography. Lattice's font tokens
override the math font family (KaTeX's default `KaTeX_Main` is
preserved for actual glyphs; surrounding prose uses Lattice's
`--font-body`).

`lib/base/base.modifiers.css` has one rule
(`section:not(.math) .katex`) that scales down KaTeX output when math
appears inline in non-math layouts (e.g. an inline `$x$` in a
`content` slide). This avoids accidentally-huge math spans in body
prose.

---

## Authoring contract

```markdown
<!-- _class: math -->

## The energy-mass equivalence.

$$
E = mc^2
$$

- `E` — energy (joules)
- `m` — mass (kilograms)
- `c` — speed of light (m/s)
```

See `lib/components/math/math.docs.md` for the full math layout
contract, including the per-variant legend formats and the equation
gallery.

---

## See also

- `lib/components/math/math.docs.md` — the `math` layout that hosts
  display math + legend pairs.
- `lib/base/base.tokens.css` — defines `--font-body` etc. that KaTeX
  inherits for non-glyph text.
- KaTeX upstream: <https://katex.org/docs/supported.html> for the
  list of supported LaTeX commands.
