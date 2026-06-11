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
| Outfit | body | `outfit-{400,700}.woff2` | SIL OFL 1.1 |
| JetBrains Mono | code / mono | `jetbrains-{400,500,600}.woff2` | SIL OFL 1.1 |
| Caveat | `sketch` headings | `caveat-{400,700}.woff2` | SIL OFL 1.1 |
| Shantell Sans | `sketch` body / labels | `shantell-{400,700}.woff2` | SIL OFL 1.1 |

Latin-subset woff2, pulled from the Google Fonts CSS API (the same files
the `@import` serves). The face list lives in `SELF_HOSTED_FACES` in
`lattice-emulator.js`; add a row here and there to bundle another weight
or family.
