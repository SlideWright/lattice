// The Drawing Board — Practice mode (the rehearsal stage).
//
// A full-screen presenter-rehearsal surface: it renders the deck ONE slide at a
// time (parity with the live preview — same engine, same slide box, no drift),
// paces you against a target talk length, and COACHES delivery with ambient,
// timed beats over the slide — when to pause, look up, breathe, signpost a
// section. The plan comes from drawing-board-rehearsal.js: a deterministic floor
// that's instant + offline, refined by the connected model (cloud/local) when
// one is available, and re-assessed whenever the deck changes.
//
// Render parity: this used to carry its OWN bespoke iframe renderer, which is
// exactly the drift deck-preview.js warns about (it rendered slides high and
// off from the preview). It now pins the slide box through frame-css's single
// source of truth and centres a single slide with flex + a uniform scale, so a
// rehearsal slide looks identical to the same slide in the preview.

import { KATEX_URL, MERMAID_URL } from './deck-preview.js';
import { createRehearsalPlanner } from './drawing-board-rehearsal.js';
import { slideBox } from './frame-css.js';

const BEAT_LABEL = { pause: 'Pause', eye: 'Look up', breathe: 'Breathe', transition: 'Transition', emphasis: 'Emphasize' };

function fmt(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function createPractice({ host, getSource, runtimeUrl, themeBase, bucketOf, model }) {
  if (!host) return { open() {} };
  const PG = () => window.LatticePlayground;
  const root = document.documentElement;
  const planner = createRehearsalPlanner({ model });
  const fetched = {};

  let plan = null; // the live rehearsal plan (deterministic, possibly AI-refined)
  let idx = 0;
  let startedAt = 0;
  let slideEnteredAt = 0;
  let tick = null;
  let shownBeatKey = null;

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

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

  // The rehearsal iframe. ONE slide, centred, scaled uniformly to fit — the slide
  // box is pinned through frame-css (so container-query layouts resolve against the
  // real `@size`, just like the preview). A no-zoom viewport + touch-action kill
  // the iOS double-tap-to-zoom that used to jolt the stage.
  function frameDoc(html, css, bg, geom) {
    const sw = geom?.width || 1280;
    const sh = geom?.height || 720;
    const FIT =
      '(function(){' +
      'function secs(){var m=document.querySelector(".marpit");return m?m.querySelectorAll(":scope>section"):[]}' +
      'var cur=0;' +
      'function fit(){var s=secs();if(!s.length)return;' +
      'var pad=Math.max(14,Math.min(innerWidth,innerHeight)*0.04);' +
      'var sc=Math.min((innerWidth-pad*2)/' + sw + ',(innerHeight-pad*2)/' + sh + ');if(!(sc>0))sc=1;' +
      'for(var i=0;i<s.length;i++){var on=i===cur;s[i].style.display=on?"block":"none";' +
      'if(on){s[i].style.transformOrigin="center center";s[i].style.transform="scale("+sc+")"}}}' +
      'function show(n){cur=n|0;fit()}' +
      'window.addEventListener("message",function(e){if(e.data&&e.data.pv!=null)show(e.data.pv)});' +
      'window.addEventListener("resize",fit);' +
      'if(typeof ResizeObserver!=="undefined"){try{new ResizeObserver(fit).observe(document.documentElement)}catch(e){}}' +
      '[60,300,1200].forEach(function(t){setTimeout(fit,t)});show(0);' +
      '})();';
    return (
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">' +
      '<link rel="stylesheet" href="' + KATEX_URL + '">' +
      '<style>html,body{margin:0;padding:0;height:100%;background:' + bg + ';overflow:hidden;touch-action:manipulation;-webkit-text-size-adjust:100%;}' +
      '.marpit{height:100vh;display:flex;align-items:center;justify-content:center;visibility:hidden;}' +
      slideBox(sw, sh) +
      '.marpit>section{flex:0 0 auto;box-shadow:0 18px 60px rgba(0,0,0,.45);border-radius:10px;}' +
      css + '</style></head><body>' + html +
      '<scr' + 'ipt src="' + MERMAID_URL + '"></scr' + 'ipt>' +
      '<scr' + 'ipt src="' + runtimeUrl + '"></scr' + 'ipt>' +
      '<scr' + 'ipt>window.__SLIDE_W=' + sw + ';window.__SLIDE_H=' + sh + ';' +
      'requestAnimationFrame(function(){var m=document.querySelector(".marpit");if(m)m.style.visibility="visible"});</scr' + 'ipt>' +
      '<scr' + 'ipt>' + FIT + '</scr' + 'ipt></body></html>'
    );
  }

  // ── UI handles ────────────────────────────────────────────────────────────
  let frame;
  let elClock;
  let elSlide;
  let elPace;
  let elTarget;
  let elAi;
  let elWhy;
  let elBeat;

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
  function slideCount() { return plan ? plan.slides.length : 0; }
  function go(n) {
    idx = Math.max(0, Math.min(slideCount() - 1, n));
    if (frame?.contentWindow) frame.contentWindow.postMessage({ pv: idx }, '*');
    slideEnteredAt = Date.now();
    shownBeatKey = null;
    if (elBeat) { elBeat.classList.remove('show'); elBeat.hidden = true; }
    refreshChrome();
    refreshTick();
  }
  function refreshChrome() {
    const sp = plan?.slides[idx];
    elSlide.textContent = (idx + 1) + ' / ' + slideCount();
    elTarget.textContent = 'target ' + fmt(sp ? sp.target : 0);
    elWhy.textContent = sp ? sp.why : '';
    elWhy.hidden = !(sp?.why);
    if (elAi) elAi.hidden = !(plan && plan.source === 'ai');
  }

  function showBeat(b) {
    const key = idx + ':' + b.kind + ':' + b.at;
    if (key === shownBeatKey) return;
    shownBeatKey = key;
    elBeat.hidden = false;
    elBeat.dataset.kind = b.kind;
    elBeat.innerHTML = '';
    elBeat.append(
      el('span', 'db-pv-beat-kind', BEAT_LABEL[b.kind] || b.kind),
      el('span', 'db-pv-beat-text', b.text),
    );
    // reflow → transition in
    void elBeat.offsetWidth;
    elBeat.classList.add('show');
  }
  function hideBeat() {
    if (!shownBeatKey) return;
    shownBeatKey = null;
    elBeat.classList.remove('show');
  }

  function refreshTick() {
    const elapsed = (Date.now() - startedAt) / 1000;
    elClock.textContent = fmt(elapsed);
    // pace: elapsed vs cumulative target through the current slide
    let due = 0;
    for (let i = 0; i <= idx && plan; i++) due += plan.slides[i].target || 0;
    const diff = elapsed - due;
    if (Math.abs(diff) < 8) { elPace.textContent = 'on track'; elPace.className = 'db-pv-pace ok'; }
    else if (diff > 0) { elPace.textContent = fmt(diff) + ' over'; elPace.className = 'db-pv-pace behind'; }
    else { elPace.textContent = fmt(-diff) + ' ahead'; elPace.className = 'db-pv-pace ahead'; }
    // timed coaching beats — relative to time spent on THIS slide (self-paced)
    const sp = plan?.slides[idx];
    if (sp?.beats?.length) {
      const onSlide = (Date.now() - slideEnteredAt) / 1000;
      const tgt = sp.target || 1;
      let active = null;
      for (const b of sp.beats) {
        const t = b.at * tgt;
        if (onSlide >= t && onSlide < t + (b.hold || 3)) active = b; // latest-wins
      }
      if (active) showBeat(active);
      else hideBeat();
    } else hideBeat();
  }

  function waitForPG(tries = 60) {
    return new Promise((resolve, reject) => {
      const t = setInterval(() => {
        if (PG()) { clearInterval(t); resolve(PG()); }
        else if (--tries <= 0) { clearInterval(t); reject(new Error('engine not ready')); }
      }, 80);
    });
  }

  // Swap a refined (AI) plan in mid-rehearsal without disturbing where you are.
  function adoptPlan(next) {
    if (!next || host.hidden) return;
    plan = next;
    refreshChrome();
    refreshTick();
  }

  async function start(minutes) {
    const source = getSource();
    const { det, refined } = planner.plan(source, minutes, { bucketOf });
    plan = det;
    if (!plan.slides.length) { close(); return; }
    idx = 0;

    let pg = PG();
    if (!pg) { try { pg = await waitForPG(); } catch { close(); return; } }
    const palette = root.getAttribute('data-palette') || 'indaco';
    const mode = root.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
    await ensureTheme(palette);
    if (mode === 'dark') await ensureTheme(palette + '-dark');
    const theme = mode === 'dark' && pg.hasTheme(palette + '-dark') ? palette + '-dark' : palette;
    const out = pg.render(source, theme);
    const bg = mode === 'dark' ? '#0c0c0c' : '#15110d';

    // Build the running view: bar (top) · stage with the coaching scrim · nav.
    host.innerHTML = '';
    const run = el('div', 'db-pv-run');

    const bar = el('div', 'db-pv-bar');
    elSlide = el('span', 'db-pv-slide');
    elClock = el('span', 'db-pv-clock', '0:00');
    elPace = el('span', 'db-pv-pace ok', 'on track');
    elAi = el('span', 'db-pv-ai', '✦ AI‑tuned'); elAi.hidden = true; elAi.title = 'Pacing + cues tailored to this deck by your connected model';
    const closeBtn = el('button', 'db-pv-x'); // glyph drawn by CSS: .db-pv-x::before
    closeBtn.type = 'button';
    closeBtn.title = 'Exit practice (Esc)';
    closeBtn.setAttribute('aria-label', 'Exit practice');
    closeBtn.addEventListener('click', close);
    bar.append(elSlide, elClock, elPace, elAi, closeBtn);

    const stage = el('div', 'db-pv-stage');
    frame = el('iframe', 'db-pv-frame');
    frame.setAttribute('title', 'Practice slide');
    const coach = el('div', 'db-pv-coach');
    elBeat = el('div', 'db-pv-beat'); elBeat.hidden = true;
    elWhy = el('div', 'db-pv-why');
    coach.append(elBeat, elWhy);
    stage.append(frame, coach);

    const nav = el('div', 'db-pv-nav');
    const prev = el('button', 'db-pv-btn'); prev.type = 'button'; prev.innerHTML = '<span class="ico ico-chevron-left" aria-hidden="true"></span> Prev'; prev.addEventListener('click', () => go(idx - 1));
    elTarget = el('span', 'db-pv-target');
    const next = el('button', 'db-pv-btn db-pv-next'); next.type = 'button'; next.innerHTML = 'Next <span class="ico ico-chevron-right" aria-hidden="true"></span>'; next.addEventListener('click', () => go(idx + 1));
    nav.append(prev, elTarget, next);

    run.append(bar, stage, nav);
    host.appendChild(run);

    frame.srcdoc = frameDoc(out.html, out.css, bg, { width: out.width, height: out.height });
    startedAt = Date.now();
    slideEnteredAt = startedAt;
    refreshChrome();
    refreshTick();
    if (tick) clearInterval(tick);
    tick = setInterval(refreshTick, 250);

    refined.then(adoptPlan).catch(() => {});
  }

  function open() {
    host.hidden = false;
    host.innerHTML = '';
    document.addEventListener('keydown', onKey);

    const s = el('div', 'db-pv-start');
    s.append(
      el('h2', null, 'Practice run'),
      el('p', 'db-pv-sub', 'Rehearse full‑screen — I’ll pace you and cue when to pause, look up, and breathe.'),
    );
    const form = el('form', 'db-pv-len');
    const input = el('input');
    input.type = 'number'; input.min = '1'; input.max = '180'; input.value = '10'; input.setAttribute('aria-label', 'Talk length in minutes');
    const go2 = el('button', 'db-btn db-btn-primary'); go2.type = 'submit'; go2.innerHTML = 'Start <span class="ico ico-arrow-right" aria-hidden="true"></span>';
    form.append(input, el('span', 'db-pv-min', 'min'), go2);
    form.addEventListener('submit', (e) => { e.preventDefault(); start(Math.max(1, Number(input.value) || 10)); });
    s.append(form);

    // A deterministic suggested length + a note when AI coaching is live. Both are
    // instant + optional — the suggestion is one tap to apply.
    try {
      const det = planner.plan(getSource(), Number(input.value) || 10, { bucketOf }).det;
      if (det.slides.length) {
        input.value = String(det.suggestMinutes);
        const hint = el('button', 'db-pv-suggest'); hint.type = 'button';
        hint.textContent = `Suggested ${det.suggestMinutes} min for ${det.slides.length} slides`;
        hint.title = 'Set the input to the suggested length';
        hint.addEventListener('click', () => { input.value = String(det.suggestMinutes); input.focus(); });
        s.append(hint);
      }
    } catch { /* no source yet — fine */ }
    const avail = model?.availability ? model.availability() : null;
    if (avail?.modelOn && avail.generation !== 'floor') {
      s.append(el('p', 'db-pv-ainote', '✦ AI coaching on — pacing and cues will be tailored to this deck.'));
    }

    const cancel = el('button', 'db-pv-cancel', 'Cancel'); cancel.type = 'button'; cancel.addEventListener('click', close);
    s.append(cancel);
    host.appendChild(s);
    setTimeout(() => input.focus(), 0);
  }

  return { open };
}
