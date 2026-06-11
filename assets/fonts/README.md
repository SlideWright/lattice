# Bundled web fonts (build/render-time only)

These woff2 files are the engine's hand + body faces, self-hosted so the
**deck-render pipeline embeds them into committed PDFs without network**.
The shipped CSS keeps a Google-Fonts `@import` for the online/browser path;
these local copies are what `lattice-emulator.js` base64-injects when it
renders a PDF, so a network-less build (the cloud sandbox, the pre-commit
hook) still produces PDFs with real type instead of serif fallback.

Not part of the npm tarball (`files` allowlist excludes `assets/`): end
users rendering their own decks get the fonts from Google like before.

| Family | Files | License |
|---|---|---|
| Caveat | `caveat-{400,700}.woff2` | SIL OFL 1.1 |
| Shantell Sans | `shantell-{400,700}.woff2` | SIL OFL 1.1 |
| Outfit | `outfit-{400,700}.woff2` | SIL OFL 1.1 |

Playfair Display (display) and JetBrains Mono (code) are not yet
self-hosted — they still resolve via the Google `@import` (so they fall
back to serif/mono in a network-less render). Add their woff2 here to
close that gap.
