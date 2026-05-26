# Releasing `@slidewright/lattice`

> **Status: not yet automated.** Publishing to npm is deferred. This
> document is the spec for how a release *will* work, plus the manual
> steps to cut one today. Implement the GitHub Actions workflow in the
> "Automation (to implement)" section when we're ready to publish.

## What a release is

A release is a git tag `v<x.y.z>` whose number matches
`package.json` `version`, pointing at a commit with a freshly built,
in-sync `dist/`. The tag is the source of truth; npm publish (manual
for now, automated later) follows from it.

## The distribution contract

What ships is defined entirely by `package.json` — don't special-case
it at release time:

- **`exports`** — the public entry points. Consumers reach the engine
  through named subpaths (`/css`, `/runtime`, `/config`,
  `/themes/<name>.css`), never raw repo paths.
- **`files`** — the allowlist. Ships engine source, `dist/`, `themes/`,
  and the two authoring docs (`reference/skill.md`,
  `reference/design-system.md`). PDFs and `*.gallery.md` are excluded
  via negation — they're regression baselines and reviewer
  deliverables, kept in git but never shipped. Tarball is ~1.8 MB.

Verify before any release:

```sh
npm pack --dry-run        # inspect file list + size; no .pdf should appear
```

## Versioning

Semver. `package.json` `version` is the single source of truth; the tag
must match it (the automation will hard-fail on a mismatch).

- **patch** — fixes, doc-only, baseline regen with no contract change.
- **minor** — new components/themes/modifiers; additive `exports`.
- **major** — removed/renamed `exports` subpaths, dropped themes,
  Node-floor bumps, or any change that breaks an existing consumer.

The current Node floor is **>=22** (`engines`). Bumping it is a major.

## Cutting a release manually (today)

```sh
# 1. Clean tree on main, up to date.
git switch main && git pull

# 2. Regenerate + gate dist/ and run the suite (must be green).
npm run build:check
npm test

# 3. Bump version (writes package.json, creates the matching tag).
npm version <patch|minor|major>

# 4. Sanity-check the tarball.
npm pack --dry-run

# 5. Publish + push the tag.
npm publish --access public
git push origin main --follow-tags
```

`prepublishOnly` re-runs `npm test` as a backstop before the registry
upload.

## Automation (to implement)

When we're ready to stop publishing by hand, add
`.github/workflows/release.yml` triggered on `push` tags `v*`. It should
mirror the manual steps as a gate before `npm publish`:

1. `actions/checkout@v4` + `actions/setup-node@v4` (node 22, `cache: npm`,
   `registry-url: https://registry.npmjs.org`).
2. `npm ci`
3. `npm run build:check` — fail on stale `dist/` or ownership collision.
4. `npm test`
5. Verify the tag matches `package.json` version; fail if not.
6. `npm publish --access public --provenance`.

Prerequisites before enabling:

- **`NPM_TOKEN`** repo secret (automation token with publish rights),
  exposed as `NODE_AUTH_TOKEN`.
- **`permissions: { contents: read, id-token: write }`** on the job —
  required for `--provenance`.
- Confirm the npm org/scope `@slidewright` exists and the token can
  publish to it.
