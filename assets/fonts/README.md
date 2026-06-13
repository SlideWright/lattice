# Bundled web fonts (build/render-time only)

These woff2 files are the engine's hand + body faces, self-hosted so the
**deck-render pipeline embeds them into committed PDFs without network**.
The shipped CSS keeps a Google-Fonts `@import` for the online/browser path;
these local copies are what `lattice-emulator.js` base64-injects when it
renders a PDF, so a network-less build (the cloud sandbox, the pre-commit
hook) still produces PDFs with real type instead of serif fallback.

Not part of the npm tarball (`files` allowlist excludes `assets/`): end
users rendering their own decks get the fonts from Google like before.

The whole engine type stack is covered — every face the engine asks for
embeds offline, so a network-less render is the intended design, not a
fallback.

| Family | Role | Files | License |
|---|---|---|---|
| Playfair Display | display / headings | `playfair-{400,700}.woff2`, `playfair-italic-{400,700}.woff2` | SIL OFL 1.1 |
| Outfit | body | `outfit-{300,400,500,600,700}.woff2` | SIL OFL 1.1 |
| JetBrains Mono | code / mono | `jetbrains-{400,500,600}.woff2` | SIL OFL 1.1 |
| Caveat | `sketch` headings | `caveat-{400,700}.woff2` | SIL OFL 1.1 |
| Shantell Sans | `sketch` body / labels | `shantell-{400,500,700}.woff2` | SIL OFL 1.1 |

Latin-subset woff2, pulled from the Google Fonts CSS API (the same files
the `@import` serves). The face list lives in `SELF_HOSTED_FACES` in
`lattice-emulator.js`; add a row here and there to bundle another weight
or family.

**Keep it in lockstep.** This set, `SELF_HOSTED_FACES`, the `@import` in
`lib/base/base.tokens.css`, and the web-export set in
`docs/src/playground/font-embed.js` must list the **same 17 faces** (every
weight the `@import` requests, Noto Color Emoji excepted). The `fonts:check`
gate (`tools/check-fonts.js`, run by `build:check` and pre-commit) fails the
build if they drift, so a rendered PDF can't silently fall back to a system
face. Add a weight to the `@import` → bundle it in both supplies or the gate
stops you. Noto Color Emoji is requested by the `@import` (browser path) but
deliberately not bundled — at 10 MB+ it is impractical to inline; colour emoji
comes from the installed system emoji font.

> Subset note: `outfit-{300,500,600}` and `shantell-500` were copied from the
> web-export set (`docs/src/playground/fonts/`) and carry its slightly wider
> latin subset, so they are larger than their tighter-subset siblings here.
> Harmless for embedding (a glyph superset); a future uniform re-subset would
> need network access (the sandbox proxy MITMs Google Fonts).
