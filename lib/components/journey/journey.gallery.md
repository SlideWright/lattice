---
marp: true
theme: indaco
paginate: true
header: "Lattice · journey"
---

<!-- _class: title silent -->

# journey

`Progression · Timeline · Structure`

Native user-journey chart — sections of tasks, each tagged with actor(s) and a 1-5 mood. Renders as section bars, task chips, plumb lines, and mood faces.

---

<!-- _class: journey -->
<!-- _footer: "Default · journey" -->

## Customer onboarding · trial to activation.

- Evaluate
  - Read case study `@prospect` `:5`
  - Book demo `@prospect` `:4`
  - Live demo `@prospect` `@sales` `:4`
- Trial
  - Trial signup `@prospect` `:3`
  - Workspace setup `@user` `@onboarding` `:1`
- Activate
  - First report `@user` `:3`
  - Daily use `@user` `:5`


---

<!-- _class: journey heatmap -->
<!-- _footer: "Heatmap — mood-tinted chips · journey heatmap" -->

## Heatmap · where the trial drops off.

- Evaluate
  - Read case study `@prospect` `:5`
  - Book demo `@prospect` `:4`
- Trial
  - Trial signup `@prospect` `:3`
  - Workspace setup `@user` `:1`
- Activate
  - First report `@user` `:3`
  - Daily use `@user` `:5`


---

<!-- _class: journey curve -->
<!-- _footer: "Curve — mood polyline with axis · journey curve" -->

## Curve · the affect contour.

- Evaluate
  - Read case study `@prospect` `:5`
  - Book demo `@prospect` `:4`
- Trial
  - Trial signup `@prospect` `:3`
  - Workspace setup `@user` `:1`
- Activate
  - First report `@user` `:3`
  - Daily use `@user` `:5`


---

<!-- _class: journey swimlane -->
<!-- _footer: "Swimlane — per-actor rows · journey swimlane" -->

## Swimlane · who owns each moment.

- Evaluate
  - Read case study `@prospect` `:5`
  - Live demo `@prospect` `@sales` `:4`
- Trial
  - Trial signup `@prospect` `:3`
  - Workspace setup `@user` `@onboarding` `:1`
- Activate
  - First report `@user` `:3`
  - Daily use `@user` `:5`


---

<!-- _class: journey weighted -->
<!-- _footer: "Weighted — chip widths by volume · journey weighted" -->

## Weighted · where the traffic actually lands.

- Discover
  - Search `@prospect` `:4` `+45`
  - Referral `@prospect` `:5` `+18`
- Convert
  - Pricing page `@prospect` `:3` `+12`
  - Checkout `@prospect` `:2` `+10`
- Support
  - Settings `@user` `:3` `+8`
  - Help docs `@user` `:4` `+7`


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · journey" -->

## When NOT to reach for journey.

- **Process without affect.** If the mood scores are all the same or arbitrary, the chart is doing less work than `timeline` or `list-steps`. Reserve journey for sequences where the affect changes meaningfully.
- **More than ten tasks.** Past ten tasks the chips compress and the labels become unreadable. Group into fewer sections, or split the journey at a natural break.
- **Volume tokens without weighted.** The `+N` volume token is meaningful only under the `weighted` variant. On the other four it is parsed but invisible — strip it from the markdown or commit to weighted.

---

<!-- _class: closing silent -->

# See also.

`Related components`

- `timeline` — linear sequence without per-step mood or actors
- `list-steps` — process needs descriptive body per step, no chart
- `gantt` — schedule of overlapping tasks across lanes
- `kanban` — current status by stage rather than sequence over time
