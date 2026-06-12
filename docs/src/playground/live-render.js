// Reusable live-slide renderer for the docs site.
//
// Renders one Lattice slide (or a short deck) into a host element through the
// playground engine (window.LatticePlayground, from
// docs/public/playground/lattice-playground.js) and the runtime bundle, then
// scales the fixed 1280×720 iframe to fill its container. Re-renders on the
// current palette / light-dark, so a specimen tracks the topbar.
//
// SIBLING IMPLEMENTATION: docs/src/pages/index.astro inlines the same
// srcdoc / scaleFrame / ensureThemes logic for the landing hero + showcase
// tiles (it must run pre-bundle, is:inline, before the editor module loads).
// This module is the bundled, importable twin used by the component pages'
// Specimen. Keep the two in sync — same intrinsic-size + CSS-scale model,
// which sidesteps the Safari foreignObject scaling bug (see that file's
// srcdoc comment for the full why).

import { DEFAULT_H, DEFAULT_W, singleSlideFrame } from './frame-css.js';

const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

/**
 * Create a renderer bound to a theme source + runtime URL.
 * @param {{ themeBase: string, runtimeUrl: string }} opts
 */
export function createLiveRenderer({ themeBase, runtimeUrl }) {
  const root = document.documentElement;
  const fetched = {}; // theme name -> Promise<cssText>
  let latticeReady = null;

  // Self-hosted preview fonts. The engine's Google-Fonts @import is inert inside
  // the srcdoc <style> (it lands after SINGLE_SLIDE_FRAME, and CSS ignores an
  // @import that isn't first), so the iframe loads none of its own webfonts and
  // would render only the faces the parent docs page happens to load — never the
  // sketch finish's Caveat/Shantell. We register the vendored faces ourselves.
  // Lazy-imported + cached: font-embed.js pulls bundled .woff2 that Node can't
  // load, so a static import would break this module's unit test. The @font-face
  // references the woff2 by URL (browser caches once), not inlined per render.
  let fontFaceCss = '';
  let fontFacesReady = null;
  function ensurePreviewFonts() {
    if (!fontFacesReady) {
      fontFacesReady = import('./font-embed.js')
        .then((m) => { fontFaceCss = m.previewFontFaceCss(); })
        .catch(() => { fontFaceCss = ''; });
    }
    return fontFacesReady;
  }

  function fetchTheme(name) {
    if (!fetched[name]) {
      fetched[name] = fetch(themeBase + name + '.css').then((r) => {
        if (!r.ok) throw new Error('theme ' + name + ' (' + r.status + ')');
        return r.text();
      });
    }
    return fetched[name];
  }

  function ensureThemes(palette, mode) {
    const PG = window.LatticePlayground;
    if (!latticeReady) latticeReady = fetchTheme('lattice').then((css) => PG.addThemes([css]));
    const jobs = [latticeReady];
    if (!PG.hasTheme(palette)) jobs.push(fetchTheme(palette).then((css) => PG.addThemes([css])));
    if (mode === 'dark') {
      jobs.push(fetchTheme(palette + '-dark').then((css) => PG.addThemes([css])).catch(() => {}));
    }
    return Promise.all(jobs);
  }

  // Render the slide at its INTRINSIC `@size` box and scale the iframe ELEMENT
  // (never the SVG) to fit the container — see the index.astro srcdoc note.
  // `geom` is the render's reported { width, height } (px); a `size: 4K` deck
  // pins a 3840×2160 box here so scaleFrame can divide by the right width.
  function srcdoc(html, css, mode, mermaid, geom) {
    const bg = mode === 'dark' ? '#0c0c0c' : '#e7e7ea';
    // singleSlideFrame() pins the intrinsic `@size` box (the single source of
    // truth in frame-css.js); a second html,body rule adds the dynamic bg.
    let s =
      '<!doctype html><html><head><meta charset="utf-8"><style>' +
      // Register the vendored faces first (@font-face is position-independent, but
      // keeping it up top documents intent). Without this the iframe has no
      // Caveat/Shantell and sketch decks render body in a system sans.
      fontFaceCss +
      singleSlideFrame(geom.width, geom.height) +
      'html,body{background:' +
      bg +
      '}' +
      css +
      '</style></head><body>' +
      html;
    if (mermaid) s += '<scr' + 'ipt src="' + MERMAID + '"></scr' + 'ipt>';
    s += '<scr' + 'ipt src="' + runtimeUrl + '"></scr' + 'ipt></body></html>';
    return s;
  }

  function scaleFrame(host) {
    const fr = host.querySelector('iframe.live');
    if (!fr) return;
    const w = host.clientWidth;
    // Scale by the slide's OWN box (stashed by renderInto), not a hardcoded
    // 1280×720 — otherwise a 4K (3840-wide) slide is scaled 3× too large. The
    // element's intrinsic size is CSS-pinned to HD, so a non-HD deck also needs
    // the element resized to its real box before the transform fits it.
    const geom = host.__latticeGeom || { width: DEFAULT_W, height: DEFAULT_H };
    fr.style.width = geom.width + 'px';
    fr.style.height = geom.height + 'px';
    if (w > 0) fr.style.transform = 'scale(' + (w / geom.width).toFixed(5) + ')';
  }

  /**
   * Render `markdown` into `host`. Resolves to a status object.
   * @returns {Promise<{ ok: boolean, slides: number, error: string|null }>}
   */
  function renderInto(host, markdown, mermaid) {
    const PG = window.LatticePlayground;
    if (!PG) return Promise.resolve({ ok: false, slides: 0, error: 'engine not loaded' });
    const palette = root.getAttribute('data-palette') || 'indaco';
    const mode = root.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
    return Promise.all([ensureThemes(palette, mode), ensurePreviewFonts()])
      .then(() => {
        const theme = mode === 'dark' && PG.hasTheme(palette + '-dark') ? palette + '-dark' : palette;
        let out;
        try {
          out = PG.render(markdown, theme);
        } catch (e) {
          return { ok: false, slides: 0, error: String(e?.message || e) };
        }
        // Stash the resolved slide box so scaleFrame divides by the right width.
        host.__latticeGeom = { width: out.width || DEFAULT_W, height: out.height || DEFAULT_H };
        let fr = host.querySelector('iframe.live');
        if (!fr) {
          fr = document.createElement('iframe');
          fr.className = 'live';
          fr.setAttribute('title', 'Live-rendered Lattice slide');
          fr.setAttribute('scrolling', 'no');
          fr.setAttribute('tabindex', '-1');
          host.appendChild(fr);
          if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => scaleFrame(host)).observe(host);
          }
        }
        fr.onload = () => scaleFrame(host);
        fr.srcdoc = srcdoc(out.html, out.css, mode, mermaid, host.__latticeGeom);
        scaleFrame(host);
        host.classList.add('is-live');
        const slides = (out.html.match(/<\/section>/g) || []).length;
        return { ok: true, slides, error: null };
      })
      .catch((e) => ({ ok: false, slides: 0, error: String(e?.message || e) }));
  }

  /** Run `cb` once window.LatticePlayground is available. */
  function whenReady(cb) {
    if (window.LatticePlayground) return cb();
    const t = setInterval(() => {
      if (window.LatticePlayground) {
        clearInterval(t);
        cb();
      }
    }, 50);
  }

  /** Call `cb` (debounced) whenever the palette or light/dark mode changes. */
  function onThemeChange(cb) {
    let timer;
    new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(cb, 80);
    }).observe(root, { attributes: true, attributeFilter: ['data-palette', 'data-mode'] });
  }

  return { renderInto, whenReady, onThemeChange, scaleFrame };
}
