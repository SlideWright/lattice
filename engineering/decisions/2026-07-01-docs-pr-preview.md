---
status: shipped
summary: Restores per-PR docs previews in-repo via a wrangler pages-deploy workflow, after the site moved to GitHub Pages (which has no PR previews) and the dashboard-side Cloudflare integration began intermittently skipping builds — the real cause was Cloudflare's monthly build quota, amplified by the merge queue and all-branches builds
last-updated: 2026-07-02
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
   configured entirely in the Cloudflare dashboard.

**The actual root cause — Cloudflare's monthly build quota.** The give-away
that reframed everything: previews were *intermittent*, not gone — they worked
on some PRs and not others, and the owner had changed no Cloudflare setting. A
skipped build shows as a 0-second "success" check with no `*.pages.dev` URL. On
the free plan Cloudflare Pages builds **500 sites/month**, and once that cap is
hit it silently skips further builds until the monthly reset — exactly the
on-again/off-again pattern observed. Three things were burning the quota:

- **~95 open branches**, each built on push (Cloudflare's default is "all
  non-production branches").
- **The merge queue** (the one recent change): every queued PR pushes a
  `gh-readonly-queue/*` branch that Cloudflare *also* built — roughly doubling
  the builds per merge.
- **CI artifact branches** (`ci-drift-images`, `ci/preview-e2e-screenshots`)
  that get pushed constantly and each triggered a wasted build.

So the preview didn't break from a config change — the *build volume* crossed
Cloudflare's free-plan cap, and no in-repo preview existed to fall back on.

## Decision

Own the preview in the repo, and **build on GitHub instead of on Cloudflare**.
`.github/workflows/docs-preview.yml` runs on `pull_request`, builds the same
Astro site `docs.yml` builds, and **direct-uploads** the prebuilt `docs/dist`
to the existing `lattice-docs` Cloudflare Pages project as a **preview**
deployment via `cloudflare/wrangler-action@v3`
(`pages deploy … --branch=<head_ref>`). Any branch other than the production
`main` gets its own `*.pages.dev` URL, which the workflow posts back as a single
sticky PR comment.

This is what fixes the root cause: a **direct upload does not count against
Cloudflare's monthly *build* quota** (only Cloudflare-run git builds do). The
building moves to GitHub Actions' own (far larger) allowance, and only fires on
PRs that touch docs paths — never on all ~95 branches or the merge-queue
branches. Cloudflare's own git builds are turned off so the two don't double up.

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

**Shipped.** The `CLOUDFLARE_API_TOKEN` secret (a token scoped to *Account →
Cloudflare Pages → Edit*) is configured, and the pipeline was verified
end-to-end on a throwaway smoke-test PR: GitHub Actions built the site,
`wrangler` uploaded it, the workflow posted its sticky preview comment, and both
the deployment and branch-alias URLs served HTTP 200. Cloudflare's own git
builds have been switched off (dashboard → `lattice-docs` → Builds & deployments
→ preview = None, production automatic deployments = Off), so nothing double-
deploys and the build quota is no longer spent. Production (`lattice.style`)
is unaffected — it is served by GitHub Pages, not this Cloudflare project.

If the team ever wants to retire Cloudflare entirely, the alternative is a
GitHub-native preview (per-PR artifact or a Pages sub-path), tracked
separately — not adopted here because the existing `lattice-docs` project and
its `*.pages.dev` host already work.
