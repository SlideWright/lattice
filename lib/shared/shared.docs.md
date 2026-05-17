# shared

Density and accent modifiers that compose with most layouts but aren't
foundational enough to live in `lib/base/`. The "semi" in the historical
name "semi-universal" captured the scope ("not on every layout") but not
the role; "shared" names the role: patterns shared among several
components, opt-in via class.

**Files in this folder:**

| File | What it implements |
|---|---|
| `shared.styles.css` | The three semi-universal modifiers: `compact`, `loose`, `accent`. |

This file used to live at `lib/_semi-universal.css`. The role hasn't
changed, only the name. Future shared modifiers land here too as the
catalog grows.

---

## `compact`

Tightens the spacing scale ~25% (`--sp-xs` … `--sp-2xl`). Card gaps,
list gutters, and section LR padding follow because layouts read those
variables via `var()`. The chrome reservation (top/bottom 88px) is
preserved so headers and footers never collide with content. Reach for
`compact` when one more card needs to fit, or when prose runs the
section by 1-2 lines.

```markdown
<!-- _class: cards-grid compact -->
```

## `loose`

Inverse of `compact` — grows the spacing scale ~25%. Reach for it when
a slide carries a single editorial point and you want the page to feel
deliberately quiet.

```markdown
<!-- _class: content loose -->
```

## `accent`

Replaces the default rainbow top-stripe with a solid accent-colour
stripe and tints the slide heading. Composes with `dark`: on the dark
canvas, where the spectrum stripe is suppressed, `accent.dark` restores
a solid accent stripe so the visual signal still reads.

```markdown
<!-- _class: closing accent -->
```

---

## Cascade rules

- `compact` and `loose` tune the same variable; if both appear, the
  last one in source wins.
- `compact` / `loose` compose with `dark`, `accent`, and any
  layout-specific modifier without conflict (they touch disjoint
  properties).

## Opting out

Components that don't want one of these modifiers list it in their
manifest's `excludes` field. The validator enforces that `excludes`
entries are a subset of the semi-universal set.

```json
{
  "name": "title",
  "excludes": ["compact"]
}
```

---

## How this differs from `lib/base/`

| | `lib/base/` | `lib/shared/` |
|---|---|---|
| Composition | Auto-detected or always-on | Opt-in via class |
| Audience | Every component | Most components (opt-out per manifest) |
| Examples | Eyebrow detection, key-insight panel, `dark` variant, decoration backgrounds | `compact`, `loose`, `accent` |

If a feature applies to every component without exception, it belongs
in `lib/base/`. If it applies broadly but some components legitimately
opt out, it belongs here.

---

## See also

- `lib/base/base.docs.md` — universal authoring patterns and variants.
- `lib/chart-family/chart-family.docs.md` — the chart-family subsystem
  (also a "shared among some components" concern, but rich enough to
  warrant its own folder rather than living here).
- `docs/design-system.md §6.5` — the variant tier system that
  formalizes universal vs semi-universal vs layout-specific.
