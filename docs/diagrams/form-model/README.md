# Form-model diagrams (source)

The four explanatory diagrams used by the docs spec page
`docs/src/content/docs/spec/form-model.md`. They are hand-drawn HTML/CSS
(static teaching figures, not generated from data), screenshotted to PNG.

Regenerate after editing a `.html`:

```sh
# from the repo root, with CHROME_PATH set (the SessionStart hook exports it)
for m in 1-frame-cell:mock1-frame-cell 2-cell-tile:mock2-cell-tile \
         3-tile-component:mock3-tile-component 4-together:mock4-together; do
  out=${m%%:*}; src=${m#*:}
  node tools/screenshot.js "file://$PWD/docs/diagrams/form-model/$src.html" \
    "docs/src/assets/form-model/$out.png" --width 1200 --height 720
done
```

The PNGs live in `docs/src/assets/form-model/` and are referenced with relative
paths from the spec page, so Astro optimizes them and they stay base-path-safe
(the site base is `/` on Cloudflare but `/lattice` in local dev).

**Keep them honest:** these mirror the real manifests in `lib/forms/`
(`frame/*/`, `cell/*/`, `tile/*/`) and the render chain in
`lib/engine/index.js` + `lib/transformers/masthead-lift.js`. If those change,
update the figure. Canonical model: `design/forms.md`.
