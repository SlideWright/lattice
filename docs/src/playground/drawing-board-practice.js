// The Drawing Board — Practice mode (Phase 1 rehearsal coach, deterministic).
//
// A full-screen rehearsal surface: renders the deck one slide at a time, paces
// you against a target talk length (density-weighted per slide), and cues when
// to pause and let a slide land. No model — the timing + cues are heuristic. The
// model layers nuanced coaching on top in Phase 2 (see architect-coach-features).
//
// Reuses render path #2 (window.LatticePlayground) + the runtime, like the
// preview, in its own iframe — so charts/Mermaid/KaTeX render identically.

const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

const CLASS_DIRECTIVE = /<!--\s*_class:\s*([^>]+?)\s*-->/;
const TABLE_COMPS = new Set(['matrix-2x2', 'compare-table', 'list-tabular', 'obligation-matrix', 'verdict-grid', 'glossary']);
const CUE_BY_COMP = {
  'big-number': 'Let the number land', kpi: 'Let the number land', stats: 'Let the number land',
  quote: 'Let the line breathe', featured: 'Hold for the visual', image: 'Hold for the visual',
  divider: 'Transition — take a beat',
};
const CUE_BY_BUCKET = { chart: 'Hold for the visual', evidence: 'Let the number land', imagery: 'Hold for the visual' };

function fmt(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function createPractice({ host, getSource, runtimeUrl, themeBase, bucketOf }) {
  if (!host) return { open() {} };
  const PG = () => window.LatticePlayground;
  const root = document.documentElement;
  let slides = [];
  let targets = []; // seconds per slide
  let cues = [];
  let idx = 0;
  let startedAt = 0;
  let tick = null;
  const fetched = {};

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  function parse(source) {
    const chunks = source.split(/^---$/m);
    // Drop front matter (chunk 0 if it carries no _class) and empty chunks.
    const out = [];
    chunks.forEach((c, i) => {
      if (i === 0 && !CLASS_DIRECTIVE.test(c)) return;
      if (!c.trim()) return;
      out.push(c);
    });
    return out.length ? out : chunks.filter((c) => c.trim());
  }
  function weightOf(chunk) {
    const words = chunk.replace(/<!--[^>]*-->/g, '').split(/\s+/).filter(Boolean).length;
    return 1 + Math.min(4, words / 40);
  }
  function cueOf(chunk) {
    const m = chunk.match(CLASS_DIRECTIVE);
    const comp = m ? m[1].trim().split(/\s+/)[0] : null;
    if (!comp) return null;
    if (CUE_BY_COMP[comp]) return CUE_BY_COMP[comp];
    if (TABLE_COMPS.has(comp)) return 'Give them the table';
    const b = bucketOf ? bucketOf(comp) : null;
    return (b && CUE_BY_BUCKET[b]) || null;
  }

  async function ensureTheme(name) {
    const pg = PG();
    if (!pg) return;
    if (!fetched.lattice) fetched.lattice = fetch(themeBase + 'lattice.css').then((r) => r.text()).then((c) => pg.addThemes([c]));
    await fetched.lattice;
    if (!pg.hasTheme(name)) {
      if (!fetched[name]) fetched[name] = fetch(themeBase + name + '.css').then((r) => r.text()).then((c) => pg.addThemes([c])).catch(() => {});
      await fetched[name];
    }
  }

  function frameDoc(html, css, bg, geom) {
    // Fit every rehearsal slide to the deck's OWN `@size` box, not a hardcoded
    // 1280×720 — a 4K deck would otherwise scale 3× too large.
    const sw = (geom && geom.width) || 1280, sh = (geom && geom.height) || 720;
    const box = '.marpit>section{width:' + sw + 'px;height:' + sh + 'px}';
    const FIT = '(function(){function secs(){var m=document.querySelector(".marpit");return m?m.querySelectorAll(":scope>section"):[]}'
      + 'function fit(){var s=secs();var sc=Math.min((innerWidth-40)/' + sw + ',(innerHeight-40)/' + sh + ');var top=Math.max(20,(innerHeight-' + sh + '*sc)/2);for(var i=0;i<s.length;i++){s[i].style.transformOrigin="top center";s[i].style.transform="translateX(-50%) scale("+sc+")";s[i].style.position="absolute";s[i].style.left="50%";s[i].style.top=top+"px";s[i].style.display=s[i].classList.contains("pv-on")?"block":"none"}}'
      + 'function show(n){var s=secs();for(var i=0;i<s.length;i++)s[i].classList.toggle("pv-on",i===n);fit()}'
      + 'window.addEventListener("message",function(e){if(e.data&&e.data.pv!=null)show(e.data.pv|0)});'
      + 'window.addEventListener("resize",fit);[60,400,1500].forEach(function(t){setTimeout(fit,t)});show(0);'
      + '})();';
    return '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="' + KATEX + '">'
      + '<style>html,body{margin:0;height:100vh;overflow:hidden;background:' + bg + ';}'
      + box + '.marpit>section{box-shadow:0 12px 50px rgba(0,0,0,.35);border-radius:8px;}'
      + css + '</style></head><body>' + html
      + '<scr' + 'ipt src="' + MERMAID + '"></scr' + 'ipt>'
      + '<scr' + 'ipt src="' + runtimeUrl + '"></scr' + 'ipt>'
      + '<scr' + 'ipt>' + FIT + '</scr' + 'ipt></body></html>';
  }

  // ── UI ──────────────────────────────────────────────────────────────────────
  let frame;
  let elClock;
  let elSlide;
  let elPace;
  let elCue;
  let elTarget;

  function close() {
    if (tick) { clearInterval(tick); tick = null; }
    host.hidden = true;
    host.innerHTML = '';
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(idx - 1); }
  }
  function go(n) {
    idx = Math.max(0, Math.min(slides.length - 1, n));
    if (frame?.contentWindow) frame.contentWindow.postMessage({ pv: idx }, '*');
    refreshChrome();
  }
  function refreshChrome() {
    elSlide.textContent = (idx + 1) + ' / ' + slides.length;
    elTarget.textContent = 'target ' + fmt(targets[idx] || 0);
    elCue.textContent = cues[idx] || '';
    elCue.hidden = !cues[idx];
  }
  function refreshClock() {
    const elapsed = (Date.now() - startedAt) / 1000;
    elClock.textContent = fmt(elapsed);
    // ahead/behind vs cumulative target up to + including the current slide
    let due = 0;
    for (let i = 0; i <= idx; i++) due += targets[i] || 0;
    const diff = elapsed - due;
    if (Math.abs(diff) < 8) { elPace.textContent = 'on track'; elPace.className = 'db-pv-pace ok'; }
    else if (diff > 0) { elPace.textContent = fmt(diff) + ' behind'; elPace.className = 'db-pv-pace behind'; }
    else { elPace.textContent = fmt(-diff) + ' ahead'; elPace.className = 'db-pv-pace ahead'; }
  }

  function waitForPG(tries = 60) {
    return new Promise((resolve, reject) => {
      const t = setInterval(() => {
        if (PG()) { clearInterval(t); resolve(PG()); }
        else if (--tries <= 0) { clearInterval(t); reject(new Error('engine not ready')); }
      }, 80);
    });
  }

  async function start(minutes) {
    const source = getSource();
    slides = parse(source);
    if (!slides.length) { close(); return; }
    const weights = slides.map(weightOf);
    const wsum = weights.reduce((a, b) => a + b, 0) || 1;
    const total = minutes * 60;
    targets = weights.map((w) => (w / wsum) * total);
    cues = slides.map(cueOf);
    idx = 0;

    // Render the deck through the engine into the practice iframe. The engine
    // script loads `defer`, so on a very early click it may not be on window yet.
    let pg = PG();
    if (!pg) { try { pg = await waitForPG(); } catch { close(); return; } }
    const palette = root.getAttribute('data-palette') || 'indaco';
    const mode = root.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
    await ensureTheme(palette);
    if (mode === 'dark') await ensureTheme(palette + '-dark');
    const theme = mode === 'dark' && pg.hasTheme(palette + '-dark') ? palette + '-dark' : palette;
    const out = pg.render(source, theme);
    const bg = mode === 'dark' ? '#0c0c0c' : '#15110d';

    // Build the running view.
    host.innerHTML = '';
    const run = el('div', 'db-pv-run');
    const bar = el('div', 'db-pv-bar');
    elSlide = el('span', 'db-pv-slide');
    elClock = el('span', 'db-pv-clock', '0:00');
    elPace = el('span', 'db-pv-pace ok', 'on track');
    elCue = el('span', 'db-pv-cue');
    const closeBtn = el('button', 'db-pv-x'); // glyph drawn by CSS: .db-pv-x::before
    closeBtn.type = 'button';
    closeBtn.title = 'Exit practice (Esc)';
    closeBtn.setAttribute('aria-label', 'Exit practice');
    closeBtn.addEventListener('click', close);
    bar.append(elSlide, elClock, elPace, elCue, closeBtn);
    frame = el('iframe', 'db-pv-frame');
    frame.setAttribute('title', 'Practice slide');
    const nav = el('div', 'db-pv-nav');
    const prev = el('button', 'db-pv-btn'); prev.type = 'button'; prev.innerHTML = '<span class="ico ico-chevron-left" aria-hidden="true"></span> Prev'; prev.addEventListener('click', () => go(idx - 1));
    elTarget = el('span', 'db-pv-target');
    const next = el('button', 'db-pv-btn db-pv-next'); next.type = 'button'; next.innerHTML = 'Next <span class="ico ico-chevron-right" aria-hidden="true"></span>'; next.addEventListener('click', () => go(idx + 1));
    nav.append(prev, elTarget, next);
    run.append(bar, frame, nav);
    host.appendChild(run);

    frame.srcdoc = frameDoc(out.html, out.css, bg, { width: out.width, height: out.height });
    startedAt = Date.now();
    refreshChrome();
    refreshClock();
    if (tick) clearInterval(tick);
    tick = setInterval(refreshClock, 500);
  }

  function open() {
    host.hidden = false;
    host.innerHTML = '';
    document.addEventListener('keydown', onKey);
    // Start screen — ask the talk length.
    const s = el('div', 'db-pv-start');
    s.append(
      el('h2', null, 'Practice run'),
      el('p', 'db-pv-sub', 'Rehearse full-screen — I’ll pace you and cue when to pause.'),
    );
    const form = el('form', 'db-pv-len');
    const input = el('input');
    input.type = 'number'; input.min = '1'; input.max = '180'; input.value = '10'; input.setAttribute('aria-label', 'Talk length in minutes');
    const go2 = el('button', 'db-btn db-btn-primary'); go2.type = 'submit'; go2.innerHTML = 'Start <span class="ico ico-arrow-right" aria-hidden="true"></span>';
    form.append(input, el('span', 'db-pv-min', 'min'), go2);
    form.addEventListener('submit', (e) => { e.preventDefault(); start(Math.max(1, Number(input.value) || 10)); });
    const cancel = el('button', 'db-pv-cancel', 'Cancel'); cancel.type = 'button'; cancel.addEventListener('click', close);
    s.append(form, cancel);
    host.appendChild(s);
    setTimeout(() => input.focus(), 0);
  }

  return { open };
}
