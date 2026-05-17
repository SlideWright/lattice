---
marp: true
theme: indaco
paginate: true
header: "Lattice · image"
---

<!-- _class: title silent -->

# image

`Imagery · Canvas · Prose`

Image as the slide's anchor, with optional text alongside.

---

<!-- _class: image -->
<!-- _footer: "Default · image" -->

## Image right is the default — text leads, evidence follows.

The image fills its half-canvas slot edge-to-edge. A 1px hairline marks the join between text and image — boardroom polish, no placeholder pattern visible behind a real photo. Replace the bg image directive with your own asset.

![bg right](sample-image-landscape.svg)


---

<!-- _class: image full -->
<!-- _footer: "Full — image fills the canvas edge to edge · image full" -->

## Full bleed makes the photo the slide.

Text overlays the lower third on a contrast scrim. Use for openers, closers, or any moment when the image deserves the whole canvas.

![bg](sample-image-landscape.svg)


---

<!-- _class: image contain -->
<!-- _footer: "Contain — letterboxed for plots and screenshots · image contain" -->

## Contain preserves the asset's own framing.

Letterboxed against the slide background — useful for plots, dashboards, and screenshots where every pixel of the image matters.

![bg](sample-image-landscape.svg)


---

<!-- _class: image museum -->
<!-- _footer: "Museum — matted and framed · image museum" -->

## Museum framing gives one image the wall.

Matte border plus a hairline frame. Reserve for case-study openers, brand moments, archival material — the image that the deck remembers.

![bg](sample-image-landscape.svg)


---

<!-- _class: image mirror -->
<!-- _footer: "Mirror — text right, image left · image mirror" -->

## Mirror lands the image on the left.

Text leads from the right; image anchors from the left. Use when the surrounding spread reads right-to-left or when the page-turn cue lands on the image side.

![bg left](sample-image-landscape.svg)


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · image" -->

## When NOT to reach for image.

- **Decorative stock photo.** A generic photograph of 'people in a meeting' next to a content slide is filler. Use `content` and trust the prose; reserve image for visuals that argue for themselves.
- **Image too small to read.** A diagram or screenshot small enough to fit inside a half-canvas text slot is unreadable from the back of the room. Reach for `image full` or `image contain`, or move the diagram to its own `diagram` slide.
- **Image with five paragraphs of caption.** If the prose dominates and the image is a sidebar, you have a `content` slide that happens to have a photo. Either trust the image (drop the prose) or trust the prose (drop the image).

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `featured` — the recommendation is a card, not an image
- `diagram` — the visual is a Mermaid graph, not a photo or screenshot
- `content` — the slide is mostly prose with one inline visual
- `title` — the image is a bookend hero, not the body of a slide
- `quote` — the slide is a quotation, not an image
