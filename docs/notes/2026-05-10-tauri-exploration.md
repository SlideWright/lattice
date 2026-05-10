# Tauri exploration — desktop authoring app for Lattice

**Status:** open exploration. No code yet. This note is the workspace
for figuring out *whether and how* to build the SlideWright desktop
app on Tauri — and what the alternative would have to look like to
displace it.

The repo README already names Tauri as the chosen stack for
SlideWright ("the desktop app (Tauri). Wraps the Lattice engine with a
markdown editor, live preview, theme picker, and PDF export"). That
choice predates this note. This exploration revisits it deliberately,
before any desktop code is written, because the integration shape
between Lattice (Node + Puppeteer + Marp) and a Tauri shell (Rust core
+ system WebView) is non-trivial and worth pressure-testing.

## Frame

One sentence: **can a Tauri shell host the Lattice render pipeline
faithfully, or does the Node/Puppeteer dependency force a different
architecture?**

The decision is not "Tauri vs Electron" in the abstract — it's "given
*this* renderer, what's the cleanest integration?" Electron only
becomes interesting if the Tauri integration story turns out to be
worse than just shipping Chromium + Node in the app bundle.

## What Lattice brings to the table

Constraints the desktop shell has to absorb, not the other way around:

- **Renderer is Node.** `lattice-emulator.js` is the build-time path;
  `lattice-runtime.js` is the in-browser path. Both are JavaScript.
- **Puppeteer + Chromium.** Mermaid pre-rendering and PDF emission
  both run through a headless Chromium that `npm install` downloads.
  ~150 MB on disk per platform.
- **marp-cli is a runtime dependency.** Not dev-only. The cross-renderer
  parity contract (emulator vs marp-cli) is asserted in the integration
  test suite — the desktop app inherits that contract.
- **Output formats:** PDF, HTML, PPTX, PNG sets. PPTX assembly is its
  own pipeline step (see `docs/references/pipeline.md`).
- **Themes are CSS files.** `themes/indaco.css`, `themes/cuoio.css`.
  Live preview means re-applying CSS without rebuilding the deck.
- **Slides are 1280×720.** PNG export is `--image-scale 3` (3840×2160).

## Open questions

Each of these needs a clear answer (or an explicit "deferred") before
desktop work starts.

### 1. How does Tauri talk to the Node renderer?

The Tauri shell is Rust + system WebView. It cannot run Node in-process.
Options on the table:

- **Sidecar Node process.** Tauri spawns `node lattice-emulator.js`
  for each render. Same as the CLI today. Simple, faithful, slow per
  invocation (Node + Puppeteer startup).
- **Long-lived Node sidecar.** One Node process per app session,
  IPC over stdio or a local socket. Faster repeat renders. More moving
  parts (lifecycle, crash recovery).
- **Port the renderer to the WebView.** `lattice-runtime.js` already
  runs in a browser. Could the desktop preview pane *be* the renderer,
  with PDF export delegated to a sidecar only for final delivery?
  Cleanest UX for live preview; splits the rendering contract in two.

### 2. Where does Chromium live?

Puppeteer downloads a per-platform Chromium. The desktop app either:

- Bundles it (large installer, predictable behavior),
- Downloads on first run (small installer, network dependency),
- Or skips Puppeteer entirely if the WebView-as-renderer path wins
  question 1.

### 3. What does live preview actually mean?

- Re-render on every keystroke (latency budget?),
- Re-render on save,
- Or the runtime path (`lattice-runtime.js`) drives the preview in
  real time and the build path only runs on export.

The third option is the most responsive but requires the runtime to
reach feature parity with the emulator for preview purposes (it
already does for the marp-cli preview path).

### 4. PPTX export?

PPTX assembly is the most stack-coupled step in the pipeline. Whatever
the answer to question 1, PPTX export almost certainly goes through
the sidecar. Worth confirming.

### 5. Multi-window / multi-deck?

Out of scope for v1? Or a constraint that shapes the architecture
now? Tauri supports multi-window cleanly; the renderer side does not
care.

## Hypotheses to test

Concrete claims that can be confirmed or falsified by a small probe.
Each probe lives under `.scratch/tauri/` (gitignored) until findings
are written back here.

- **H1.** A Tauri sidecar invocation of `lattice-emulator.js` produces
  byte-identical output to the CLI for `examples/gallery.md`.
- **H2.** Cold render latency (sidecar spawn + render) for a 10-slide
  deck is under 3 s on a modern laptop. (Threshold is a guess —
  revise after first measurement.)
- **H3.** `lattice-runtime.js` can drive the WebView preview pane
  directly without a build step, with theme switching working in
  real time.
- **H4.** Bundled Chromium adds < 200 MB to the installer.

## Decision criteria

Tauri stays as the chosen stack if:

- Sidecar integration is faithful (H1) and fast enough (H2), **or**
- The runtime-in-WebView path works for preview (H3) and the sidecar
  is only needed for export.

Tauri is replaced (likely by Electron) if:

- Sidecar lifecycle proves brittle in practice (crashes, zombie
  Chromium processes, IPC stalls under load), **and**
- The runtime-in-WebView path can't reach parity for preview.

The case for Electron is mostly stack homogeneity: Node + Chromium
ship in-process, the renderer runs as a module rather than a sidecar,
and there's no Rust toolchain in the contributor onboarding path. The
cost is installer size and the usual Electron memory profile.

## Trials

*(Empty — fill in as probes run.)*

| Date | Probe | Outcome | Notes |
|------|-------|---------|-------|

## Findings

*(Empty — fill in once trials accumulate enough to draw a conclusion.)*

## Next step

Stand up one probe against **H1** (sidecar produces identical output)
before any UI work. That's the load-bearing assumption; everything
else can wait on its answer.
