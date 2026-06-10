// Single source of the base-path-safe URL joiner for the docs site.
//
// The docs deploy under different roots: GitHub Pages serves under `/lattice/`,
// Cloudflare Pages (and a future custom domain) serve at `/`. The naive
// `${base}/${p}` breaks on a `/` base — it yields a leading `//path`, which a
// browser reads as a PROTOCOL-RELATIVE URL (the first path segment becomes the
// host), silently breaking every internal link and asset. Normalize away a
// trailing slash on `base` first, then collapse any interior `//` (but never
// the `://` in an absolute URL).
//
// `base` is sourced per call site — `import.meta.env.BASE_URL` in `.astro` /
// Vite-bundled code, or an injected config value in the in-browser engine
// (component-browser.js). This stays a PURE function (base passed in, no
// `import.meta` reference) so it behaves identically in every context.
export const joinBase = (base, p) => `${base.replace(/\/$/, '')}/${p}`.replace(/([^:])\/{2,}/g, '$1/');
