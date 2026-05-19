# image

> Image as the slide's anchor, with optional text alongside.

**Function** imagery · **Form** canvas · **Substance** prose

Use when a visual carries meaning on its own. Modifiers control how the image fills the slide: `full` for edge-to-edge, `contain` for letterboxed, `museum` for a matted/framed treatment.

## When to use

- **The visual carries meaning.** Product screenshots, architectural photographs, plots, satellite imagery — anywhere the image makes the argument and the prose is annotation. If the visual is decorative, drop it and use `content` instead.
- **Pick the modifier from the asset.** Photographs with subject-to-edge bleed → `full`. Plots, screenshots, or assets with whitespace that should be preserved → `contain`. Single hero images that deserve gallery framing → `museum`. The default (image right) is the working pick for talking-head slides.
- **Caption earns its line.** If the prose alongside the image just describes what the image shows, drop it — the audience can see the picture. The text slot is for the so-what: what the audience should take away from the visual.

## When NOT to use

- **Decorative stock photo.** A generic photograph of 'people in a meeting' next to a content slide is filler. Use `content` and trust the prose; reserve image for visuals that argue for themselves.
- **Image too small to read.** A diagram or screenshot small enough to fit inside a half-canvas text slot is unreadable from the back of the room. Reach for `image full` or `image contain`, or move the diagram to its own `diagram` slide.
- **Image with five paragraphs of caption.** If the prose dominates and the image is a sidebar, you have a `content` slide that happens to have a photo. Either trust the image (drop the prose) or trust the prose (drop the image).

## Authoring

```markdown
<!-- _class: image -->

## Image right is the default — text leads, evidence follows.

Replace the bg image below with your own asset. The image fills its half-canvas slot edge-to-edge; a 1px hairline marks the join between text and image.

![bg right](your-image.jpg)
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `image` | `img` | yes | Marp background image syntax: `![bg](path)` or `![bg right](path)`. |
| `heading` | `h2` | no | Optional heading in the text slot. |
| `body` | `p` | no | Optional caption or body text. |

## Anatomy

```text
┌─────────────────────────────────────────┐
│  header                                 │
│                                         │
│    ┌──────────────────┐                 │
│    │                  │  Text slot      │
│    │   [image area]   │  on the side,   │
│    │                  │  optional       │
│    └──────────────────┘  caption.       │
│                                         │
│  footer                           1/19  │
└─────────────────────────────────────────┘
```

## Variants (layout-specific)

### `full` — Full — image fills the canvas edge to edge

The image covers the entire slide. Heading and body text overlay the lower portion on a dark contrast scrim (full slide width, content padded inside). Use for high-impact opener or closer slides where the photograph is the message.

```markdown
<!-- _class: image full -->

## Full bleed makes the photo the slide.

Text overlays the lower portion on a contrast scrim. Use for openers, closers, or any moment when the image deserves the whole canvas.

![bg](sample-image-landscape.svg)
```

### `contain` — Contain — letterboxed for plots and screenshots

Full-bleed variant: the image preserves its aspect inside the slide and the surrounding area fills with the matte token. Text overlay uses the same bottom-scrim treatment as `full`. Default pick for plots, screenshots, and any non-photographic asset where every pixel of the image matters.

```markdown
<!-- _class: image contain -->

## Contain preserves the asset's own framing.

Letterboxed against the slide background — useful for plots, dashboards, and screenshots where every pixel of the image matters.

![bg](sample-image-landscape.svg)
```

### `museum` — Museum — matted and framed

Full-bleed variant: image inset on a `--bg-alt` matte (40px top/sides, 100px at the bottom) with a 1px hairline frame. Text reads on the matte at the bottom as a mono eyebrow label + body caption — editorial placard, no scrim. Use for the one hero image in a deck that deserves a wall-piece treatment.

```markdown
<!-- _class: image museum -->

## Museum framing gives one image the wall.

Matte border plus a hairline frame. Reserve for case-study openers, brand moments, archival material — the image that the deck remembers.

![bg](sample-image-landscape.svg)
```

### `mirror` — Mirror — text right, image left

Flips the default split: text leads from the right, image anchors from the left. Use when the surrounding deck reads right-to-left across a spread or when the page-turn lands on the image edge.

```markdown
<!-- _class: image mirror -->

## Mirror lands the image on the left.

Text leads from the right; image anchors from the left. Use when the surrounding spread reads right-to-left or when the page-turn cue lands on the image side.

![bg left](sample-image-landscape.svg)
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [docs/design-system.md §6.5](../../docs/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`featured`](../featured/featured.docs.md) — the recommendation is a card, not an image
- [`diagram`](../diagram/diagram.docs.md) — the visual is a Mermaid graph, not a photo or screenshot
- [`content`](../content/content.docs.md) — the slide is mostly prose with one inline visual
- [`title`](../title/title.docs.md) — the image is a bookend hero, not the body of a slide
- [`quote`](../quote/quote.docs.md) — the slide is a quotation, not an image

## Demo deck

See [image.gallery.pdf](./image.gallery.pdf) for rendered examples of every variant.
