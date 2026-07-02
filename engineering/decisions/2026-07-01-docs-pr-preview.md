---
status: in-progress
summary: Restores per-PR docs previews in-repo via a wrangler pages-deploy workflow, after the site moved to GitHub Pages (which has no PR previews) left only a dashboard-side Cloudflare integration that had stopped building previews
last-updated: 2026-07-01
companion:
  - ./2026-06-15-docs-perf-gating-policy.md
  - ../../.github/workflows/docs-preview.yml
  - ../../.github/workflows/docs.yml
  - ./README.md
---

# Restore per-PR docs previews with an in-repo Cloudflare deploy

## Symptom

PRs stopped getting a docs preview URL. The "Cloudflare Pages" check still
appears on each PR, reports success, and links only to the (login-gated)
Cloudflare dashboard — no `*.pages.dev` URL, no comment.

## What actually happened

Two independent facts, neither of them a regression in any PR:

1. **Production docs moved to GitHub Pages.** `.github/workflows/docs.yml`
   builds the Astro site and deploys it with `actions/deploy-pages@v4` to the
   `github-pages` environment, on `push` to `main` only. GitHub Pages has a
   single environment and **no per-PR preview** concept — so nothing in the
   repo ever produced a preview deployment.

2. **Cloudflare was only ever a dashboard-side integration.** There is no
   Cloudflare workflow in `.github/` and there never was (`grep` for
   `cloudflare|wrangler|pages.dev` over the repo history is empty). The
   "Cloudflare Pages" check comes from the Cloudflare Pages ↔ GitHub App,
   configured entirely in the Cloudflare dashboard. Its check now completes in
   the same second it starts (a 0-second "success") — the signature of a
   **skipped build**, i.e. the project's preview deployments were disabled or
   its branch filter no longer matches our branch names. That state is only
   changeable in the Cloudflare dashboard, not from the repo.

So the preview didn't break — the mechanism that produced it (the Cloudflare
dashboard integration) was left behind when the site's canonical deploy became
GitHub Pages, and no in-repo preview replaced it.

## Decision

Own the preview in the repo instead of depending on a dashboard toggle.
`.github/workflows/docs-preview.yml` runs on `pull_request`, builds the same
Astro site `docs.yml` builds, and pushes it to the existing `lattice-docs`
Cloudflare Pages project as a **preview** deployment via
`cloudflare/wrangler-action@v3` (`pages deploy … --branch=<head_ref>`). Any
branch other than the production `main` gets its own `*.pages.dev` URL, which
the workflow posts back as a single sticky PR comment.

- **Account id is inlined** (`6e1dd8d…`) — it is not a secret; it is visible in
  the project's dashboard URL. The only required repo secret is
  `CLOUDFLARE_API_TOKEN` (scoped to *Cloudflare Pages: Edit*).
- **Fork PRs are skipped**, not failed: secrets are withheld from forks, so
  wrangler can't authenticate. Same-repo branches (the normal `claude/*`,
  `ci/*` flow) run.
- **Trigger paths mirror `docs.yml`** (`docs/`, `dist/`, `themes/`, `lib/`) so an
  engine/theme change that alters the playground still rebuilds the preview.

**One nuance on canonical URLs.** This pipeline builds in GitHub Actions and
*direct-uploads* the prebuilt `docs/dist` to Cloudflare — the build never runs
inside Cloudflare's own build environment, so `CF_PAGES` / `CF_PAGES_URL` are
unset and the `onCloudflare` branch in `docs/astro.config.mjs` is inert here.
A `SITE_URL` set in the Cloudflare project's dashboard env vars therefore has no
effect on these previews; every preview builds with the production `site`
(`https://lattice.style`), same as `docs.yml`. That is fine — internal nav is
root-relative under `base: '/'`, so previews stay on their `*.pages.dev` host,
and pointing canonical/`og:url` at production keeps previews out of the index.
If a preview ever needs its own canonical origin, inject `SITE_URL` as an env
var on the Actions build step, not in the CF dashboard.

## Status / follow-up

Blocked on one repo setting only: add the `CLOUDFLARE_API_TOKEN` secret. Until
then the job runs but the deploy step fails to authenticate. Once the secret is
present, flip this note to `shipped`. If the team would rather retire Cloudflare
entirely, the alternative is a GitHub-native preview (per-PR artifact or a
Pages sub-path), tracked separately — not adopted here because the existing
`lattice-docs` project and its `*.pages.dev` host already exist.
