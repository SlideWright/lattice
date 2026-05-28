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
  and the two authoring docs (`design/skill.md`,
  `design/design-system.md`). PDFs and `*.gallery.md` are excluded
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

# 6. Build the GitHub release zip and attach it to the release.
npm run release:zip          # → release/lattice-v<version>.zip
# gh release create v<version> release/lattice-v<version>.zip --notes-file …
```

`prepublishOnly` re-runs `npm test` as a backstop before the registry
upload.

## The GitHub release zip

Three artifacts ship from a tag, each for a different audience — don't
conflate them:

| Artifact | Built by | For |
|---|---|---|
| **npm tarball** | `npm publish` (`files` allowlist) | `npm install` consumers; engine source + `dist/`, no PDFs. ~1.8 MB. |
| **Source code (zip/tar.gz)** | GitHub, automatically | the whole repo at the tag — clone-and-build. |
| **`lattice-v<x.y.z>.zip`** | `npm run release:zip` | download-and-use: the curated, offline-browsable **full showcase**. |

The release zip is the only one that carries the **gallery + example
PDFs** (npm drops them, the source zip buries them in the tree). It is a
`git archive` of HEAD under a `lattice-v<x.y.z>/` prefix, so it is
tracked-only and deterministic per commit. Contents (full showcase):

- `dist/` — the engine: `lattice.css`, `lattice-default.css`,
  `lattice-runtime.js`, the bundled `lattice-emulator.js`, `README.md`,
  and `docs/components.{md,html}`.
- `lib/` — the `marp.config.js` runtime deps (transformers, core,
  component transforms, integrations) **and** the 142 gallery PDFs the
  component reference links to, so `dist/docs/components.html` resolves
  its `../../lib/components/…` links inside the unzipped tree.
- `themes/` — all palette files.
- `marp.config.js` — the marp-cli config.
- `examples/` — showcase decks + their PDFs.
- `design/skill.md`, `design/design-system.md`, `README.md`, `LICENSE`,
  `CHANGELOG.md`.

Deliberately excluded: `test/`, `tools/`, `engineering/`, editor/CI
config, `node_modules/`, and the repo-root `lattice-emulator.js` source
(the bundle supersedes it).

The tool gates on a clean tree (it archives HEAD, not the working tree —
pass `--allow-dirty` to override) and on `build:check` (pass `--skip-check`
to override). Output lands in the gitignored `release/` dir; it is
uploaded to the Release, never committed.

> **Standalone-ness caveat.** PDF *export* (the emulator / marp-cli) shells
> out to Chromium (puppeteer) + `mmdc`, which a zip can't carry. The
> genuinely unzip-and-go surface is the CSS/runtime drop-in (browser /
> Marp-theme use) and the offline HTML + PDF reference. Rendering new decks
> to PDF from the zip still needs `npm install puppeteer
> @mermaid-js/mermaid-cli katex function-plot` (or a global marp-cli).

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
7. `npm run release:zip` then upload `release/lattice-v<version>.zip` to
   the GitHub Release (e.g. `softprops/action-gh-release` or
   `gh release create`).

Prerequisites before enabling:

- **`NPM_TOKEN`** repo secret (automation token with publish rights),
  exposed as `NODE_AUTH_TOKEN`.
- **`permissions: { contents: read, id-token: write }`** on the job —
  required for `--provenance`.
- Confirm the npm org/scope `@slidewright` exists and the token can
  publish to it.
