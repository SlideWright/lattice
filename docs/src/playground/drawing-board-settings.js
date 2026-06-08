// The Drawing Board — model settings + the on-device tier controls (Phase 2).
//
// Makes the generation ladder visible and controllable: which tier is live, a
// switch to force the deterministic floor (privacy / offline), the on-demand
// downloads (universal Transformers.js everywhere; WebLLM on a desktop GPU), and
// remember/reconnect + remove for the cached weights. Everything degrades when a
// tier is unavailable — that degraded state is what's verified headless; the live
// download + inference need real hardware.

const MODEL_KEY = 'lattice-db-model'; // master on/off
const TIER_KEY = 'lattice-db-loaded-tier'; // which tier the user loaded (persisted)
const RESTORE_GUARD = 'lattice-db-restored'; // one auto-reconnect attempt per tab session

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const readEnabled = () => { try { return localStorage.getItem(MODEL_KEY) !== 'off'; } catch { return true; } };
const writeEnabled = (on) => { try { localStorage.setItem(MODEL_KEY, on ? 'on' : 'off'); } catch {} };
const readTier = () => { try { return localStorage.getItem(TIER_KEY); } catch { return null; } };
const writeTier = (t) => { try { t ? localStorage.setItem(TIER_KEY, t) : localStorage.removeItem(TIER_KEY); } catch {} };

// Coarse pointer ≈ phone/tablet. WebLLM (~1GB + heavy inference) reliably
// OOM-crashes a mobile browser tab, so we gate it to fine-pointer (desktop).
const coarsePointer = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

function fmtBytes(n) {
  if (!n) return '';
  const mb = n / 1048576;
  return mb >= 1024 ? (mb / 1024).toFixed(1) + ' GB' : Math.round(mb) + ' MB';
}

// Real WebGPU support is more than `'gpu' in navigator` — headless Chromium
// exposes the object but has no adapter. Probe for an adapter (async).
export async function probeWebGPU() {
  try {
    if (typeof navigator === 'undefined' || !navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

// Human label for the active generation tier.
export function tierLabel(a) {
  if (!a.modelOn) return 'Deterministic (AI off)';
  if (a.generation === 'webllm') return 'WebLLM (on-device)';
  if (a.generation === 'prompt-api') return 'Built-in AI (on-device)';
  if (a.generation === 'transformers') return 'On-device AI (universal)';
  if (a.generation === 'mock') return 'Mock (testing)';
  return 'Deterministic floor';
}

export function createModelSettings({ host, trigger, model, onChange }) {
  if (!host || !model) return { refresh() {}, toggle() {}, restore: async () => {} };
  let open = false;
  let abort = null;
  let reconnecting = false;
  let renderToken = 0;
  let lastError = null; // last on-device load error, surfaced in the popover

  // ── the trigger chip ────────────────────────────────────────────────────────
  function chipLabel(a) {
    if (reconnecting) return 'Reconnecting…';
    if (!a.modelOn) return 'Deterministic (AI off)';
    if (a.generation !== 'floor' && a.generation !== 'mock') return tierLabel(a);
    if (lastError) return 'AI load failed — tap'; // surfaced so it isn't silent
    if (readTier()) return 'Reconnect on-device AI'; // cached but not live this session
    return 'Deterministic floor';
  }
  function refresh() {
    if (trigger) {
      const a = model.availability();
      trigger.textContent = '⚙ ' + chipLabel(a);
      const active = reconnecting || (a.modelOn && a.generation !== 'floor');
      trigger.classList.toggle('is-floor', !active);
    }
    if (open) render();
  }

  // ── a shared download flow ───────────────────────────────────────────────────
  async function runLoad(kind, loader, btn, bar, prog) {
    abort = new AbortController();
    btn.disabled = true;
    prog.hidden = false;
    // Ask for persistent storage right before a big download — the browser is far
    // likelier to grant it on a deliberate action, so the weights survive longer.
    try { await navigator.storage?.persist?.(); } catch {}
    lastError = null;
    try {
      await loader((p) => {
        const frac = Math.max(0, Math.min(1, p?.progress || 0)); // backends normalize to 0..1
        const pct = Math.round(frac * 100);
        bar.style.width = pct + '%';
        // After the files hit 100% there's a silent instantiate phase (compiling
        // the model) — say so, so a slow finish doesn't look like a hang.
        btn.textContent = pct >= 100 ? 'Preparing model…' : `Downloading… ${pct}%`;
      }, abort.signal);
      writeTier(kind);
      try { sessionStorage.setItem(RESTORE_GUARD, '1'); } catch {} // it's live now
      refresh();
      onChange?.();
    } catch (e) {
      // Don't swallow it — the user reported "downloads but never activates", which
      // is a silently-caught load failure. Surface the reason on-screen + console.
      lastError = (e && (e.message || String(e))) || 'unknown error';
      try { console.error('[Architect] on-device model failed to load:', e); } catch {}
      btn.disabled = false;
      btn.textContent = 'Load failed — retry';
      prog.hidden = true;
      refresh(); // re-render shows the error note
    }
  }

  async function removeModel() {
    try {
      const keys = await caches.keys();
      for (const k of keys) if (/transformers|webllm|mlc|onnx|model|hugging/i.test(k)) await caches.delete(k);
    } catch {}
    writeTier(null);
    try { sessionStorage.removeItem(RESTORE_GUARD); } catch {}
    refresh();
  }

  // ── the popover ──────────────────────────────────────────────────────────────
  async function render() {
    const my = ++renderToken;
    // Probe WebGPU + storage in parallel; bail if a newer render started (this is
    // what stops the duplicate-panel race — only the latest render paints).
    const [webgpu, est] = await Promise.all([
      probeWebGPU(),
      (navigator.storage?.estimate ? navigator.storage.estimate().catch(() => null) : Promise.resolve(null)),
    ]);
    if (my !== renderToken) return;

    host.innerHTML = '';
    const a = model.availability();
    const heavyOk = webgpu && !coarsePointer(); // WebLLM only on a desktop GPU
    const panel = el('div', 'db-settings-panel');
    panel.append(el('h3', 'db-settings-head', 'On-device AI'));

    // Master switch.
    const row = el('label', 'db-settings-row');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = a.modelOn;
    cb.addEventListener('change', () => {
      writeEnabled(cb.checked);
      model.refreshAvailability().then(() => { refresh(); onChange?.(); });
    });
    row.append(cb, el('span', null, 'Use on-device AI when available'));
    panel.append(row);

    // What's actually in use right now — front and centre (the "which model" ask).
    const active = reconnecting || (a.modelOn && a.generation !== 'floor');
    const inUse = el('div', active ? 'db-settings-active on' : 'db-settings-active');
    inUse.append(el('span', 'db-settings-dot'), el('span', null, 'In use: ' + chipLabel(a)));
    panel.append(inUse);

    panel.append(el('p', 'db-settings-note',
      'Off = fully deterministic (no model, nothing downloaded). Findings, scores and ' +
      'fixes are identical either way — the model only adds phrasing and conversation.'));

    // Tier readout.
    const tiers = el('div', 'db-settings-tiers');
    const tier = (name, state) => {
      const r = el('div', 'db-settings-tier');
      r.append(el('span', 'db-settings-tier-name', name), el('span', 'db-settings-tier-state', state));
      tiers.append(r);
    };
    tier('Built-in AI (Chrome/Edge)', a.promptApi === 'available' ? 'ready' : a.promptApi === 'downloadable' ? 'downloadable' : 'not here');
    tier('Universal (runs anywhere)', a.universalReady ? 'in use' : 'loadable');
    tier('Advanced · WebLLM', a.webllmReady ? 'in use' : heavyOk ? 'available' : coarsePointer() ? 'desktop only' : 'needs WebGPU');
    panel.append(tiers);

    const loadFlow = (kind, label, note, loader) => {
      const btn = el('button', 'db-btn db-btn-primary db-settings-summon', label);
      btn.type = 'button';
      const prog = el('div', 'db-settings-progress');
      const bar = el('i');
      prog.append(bar);
      prog.hidden = true;
      btn.addEventListener('click', () => runLoad(kind, loader, btn, bar, prog));
      panel.append(btn, prog, el('p', 'db-settings-note', note));
    };

    if (a.modelOn) {
      // Universal Transformers.js — the path that works on Safari / phones.
      if (a.promptApi !== 'available' && !a.universalReady && !a.webllmReady) {
        loadFlow('universal', 'Load on-device AI (~350 MB · works on any browser)',
          'A one-time download so the Architect can converse on THIS device — no special browser or GPU needed. Runs in your browser; stays on your device.',
          (p, s) => model.loadUniversal(p, s));
      }
      // WebLLM — desktop GPUs only (it crashes phone tabs).
      if (heavyOk && !a.webllmReady) {
        loadFlow('webllm', 'Advanced: WebLLM (~1 GB · desktop GPU)',
          'The highest-quality on-device tier, for capable desktops. Optional — the lighter tiers stay available.',
          (p, s) => model.summon(p, s));
      } else if (coarsePointer() && !a.webllmReady) {
        panel.append(el('p', 'db-settings-note', 'WebLLM (the ~1 GB tier) is desktop-only — it’s too heavy for a phone browser. The universal model above runs great here.'));
      }
    }

    // Surface the last load failure (was previously swallowed) so it's diagnosable.
    if (lastError) {
      const err = el('div', 'db-settings-error');
      err.append(el('strong', null, 'On-device AI couldn’t load. '));
      err.append(el('span', null, lastError));
      panel.append(err);
    }

    // Cached-model controls: storage used + remove.
    if (readTier() || a.universalReady || a.webllmReady) {
      const cache = el('div', 'db-settings-cache');
      const usage = est?.usage ? `~${fmtBytes(est.usage)} on this device` : 'Stored on this device';
      cache.append(el('span', 'db-settings-cache-label', usage));
      const rm = el('button', 'db-btn db-settings-remove', 'Remove');
      rm.type = 'button';
      rm.title = 'Delete the cached model weights';
      rm.addEventListener('click', removeModel);
      cache.append(rm);
      panel.append(cache);
      panel.append(el('p', 'db-settings-note', 'The model is cached so it loads instantly next time. Remove frees the space (re-downloads if you load it again).'));
    }

    host.append(panel);
  }

  // ── reconnect a previously-loaded model after a page reload ───────────────────
  // The weights are cached, but the running engine lives in memory and is lost on
  // reload — so re-initialise it (fast from cache). One auto-attempt per tab
  // session (a guard breaks any crash-reload loop); after that it's the chip's
  // one-tap "Reconnect". WebLLM is never auto-restored on a phone.
  async function restore() {
    const tier = readTier();
    if (!tier || !model.availability().modelOn) return;
    if (tier === 'webllm' && (coarsePointer() || !(await probeWebGPU()))) return;
    try {
      if (sessionStorage.getItem(RESTORE_GUARD) === '1') return;
      sessionStorage.setItem(RESTORE_GUARD, '1');
    } catch {}
    reconnecting = true;
    refresh();
    try {
      if (tier === 'universal') await model.loadUniversal(() => {});
      else if (tier === 'webllm') await model.summon(() => {});
      onChange?.();
    } catch {
      // Leave the flag so the chip offers a manual reconnect; don't loop.
    }
    reconnecting = false;
    refresh();
  }

  function toggle() {
    open = !open;
    host.hidden = !open;
    if (open) render();
  }
  function close() { open = false; host.hidden = true; }

  if (trigger) trigger.addEventListener('click', toggle);
  document.addEventListener('click', (e) => {
    if (open && !host.contains(e.target) && e.target !== trigger) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(); });

  host.hidden = true;
  refresh();
  return { refresh, toggle, close, restore, isEnabled: readEnabled };
}
