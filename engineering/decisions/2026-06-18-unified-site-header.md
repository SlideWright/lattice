---
status: shipped
summary: Collapse 8 copy-pasted topbars (two CSS systems) into one shared SiteHeader + a universal ⌘K command palette, with a single lg responsive breakpoint
created: 2026-06-18
updated: 2026-06-18
supersedes:
superseded-by:
---

# Unified site header + universal command palette

> **Status: Shipped.** One `SiteHeader.astro` renders on every surface; the
> standalone routes and the Starlight docs zone are now byte-identical chrome.

## The problem

The docs-site top bar was **eight near-identical copies** living in two
different CSS systems:

- `TopBar.astro` (used only by the component reference),
- inline `<header class="topbar">` blocks in `index`, `playground`, `workbench`,
  `features`, `drawing-board`, `comparison` (each with its own `nav-toggle`
  controller script), styled by `landing.css` (`.topbar`/`.topnav`/`.navlink`),
- `Header.astro` for the Starlight docs zone, styled by `lattice.css`
  (`.lx-topbar`/`.lx-nav`/`.lx-search`/`.lx-controls`).

They had drifted: the standalone bar pushed the nav hard-right with no search;
the docs bar hugged the brand and had a Pagefind search pill; component pages
added a *third* search box. Mobile stacked two hamburgers with different icons.
The site read as two apps wearing one logo — the exact "doesn't feel like one
app" complaint that triggered this work.

## The decision

**One shared component is the source of truth.** `docs/src/components/site/SiteHeader.astro`
renders the entire bar; `Header.astro` (Starlight) and all six standalone pages
render it with props (`standalone`, `wide`, `mobileMenu`). It carries its own
co-located styles, so Astro bundles them into both worlds automatically — no more
two-CSS-system fork. `TopBar.astro` is deleted.

Three direction calls (confirmed with the owner in one question round):

1. **Nav density → group the apps.** Docs · Components · Features · Comparison
   stay inline; Playground · Drawing Board · Workbench fold into a **Tools**
   disclosure (a native `<details>`, no island — closed on outside-click/Escape by
   one shared script). GitHub becomes an icon button.
2. **Search → a universal ⌘K command palette** (`CommandMenu.tsx`, built on the
   existing cmdk primitive). The same surface on every page: navigate anywhere,
   switch theme / light-dark, and full-text-search the docs via Starlight's
   Pagefind index (lazy-loaded; degrades to navigate/theme-only in `npm run dev`,
   where the index isn't built). This replaces the docs-only search pill, so
   findability is now identical site-wide.
3. **Toolbars too.** The component-reference sub-bar, the specimen Preview/Edit
   toggle (now a raised-active segmented control matching the hero/Playground
   Tabs), and the variant switcher were realigned to the header's button
   vocabulary (heights, radii, focus rings) so every bar reads as one component.

## Responsive model

A **single `lg` (1024px) breakpoint** governs the whole bar, which is what keeps
it from overflowing in the tablet band (the old per-surface breakpoints diverged
at 960/72rem and overflowed once search + a 160px theme select + the production
tour button were all present):

- **≥ lg:** rich bar — brand · inline nav · Tools · search pill · theme select ·
  light/dark · GitHub.
- **< lg:** compact bar — brand · search icon · light/dark · menu. Standalone
  routes open a Sheet (Browse / Tools / Theme / GitHub); the docs zone keeps
  Starlight's mobile menu + left sidebar (it also needs the page TOC), with the
  site links in `.lx-sitenav`. The ⌘K palette covers search + theme everywhere,
  so nothing is lost in the compact band.

## Verification

`cd docs && npm run build` (Pagefind index builds), `npm run lint` (0), and
`npm run check:overflow` (43 states, mobile/tablet/desktop) all pass. Visually
confirmed at 390 / 820 / 1440 in light and dark across landing, docs, components,
and the apps; the ⌘K palette returns Pagefind doc results in the built site; the
Tools dropdown, mobile Sheet, and the Drawing Board theme-writing bus all work.
