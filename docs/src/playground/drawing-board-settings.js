// The Drawing Board — model settings + the on-device tier controls (Phase 2).
//
// Makes the generation ladder visible and controllable: which tier is live, a
// switch to force the deterministic floor (privacy / offline), the on-demand
// downloads (universal Transformers.js everywhere; WebLLM on a desktop GPU), and
// remember/reconnect + remove for the cached weights. Everything degrades when a
// tier is unavailable — that degraded state is what's verified headless; the live
// download + inference need real hardware.

import { PREFS, getPref, setPref } from './drawing-board-prefs.js';

const MODEL_KEY = 'lattice-db-model'; // master on/off
const TIER_KEY = 'lattice-db-loaded-tier'; // which tier the user loaded (persisted)
const RESTORE_GUARD = 'lattice-db-restored'; // one auto-reconnect attempt per tab session

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// A labelled <select> for one workspace preference. Keeps the option vocabulary
// next to its key, reads the current value, persists on change, and runs an
// optional side effect (e.g. re-pruning history when the cap drops).
function prefRow(name, label, hint, optionLabels, onChange) {
  const p = PREFS[name];
  const row = el('div', 'db-pref-row');
  const text = el('div', 'db-pref-text');
  text.append(el('span', 'db-pref-label', label));
  if (hint) text.append(el('span', 'db-pref-hint', hint));
  const sel = el('select', 'db-pref-select');
  sel.setAttribute('aria-label', label);
  const current = getPref(name);
  p.values.forEach((v, i) => {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = optionLabels[i] || v;
    if (v === current) o.selected = true;
    sel.append(o);
  });
  sel.addEventListener('change', () => { setPref(name, sel.value); if (onChange) onChange(sel.value); });
  row.append(text, sel);
  return row;
}

// The Workspace section of the unified Settings popover — the "make it yours"
// preferences. Reads/writes via drawing-board-prefs; the store reads the same
// keys in its hot paths. AI-tier controls render below this (createModelSettings).
function workspaceSection() {
  const ws = el('section', 'db-settings-workspace');
  ws.append(el('h3', 'db-settings-head', 'Workspace'));
  ws.append(prefRow('newDeck', 'New deck starts from', null, ['Starter scaffold', 'Blank canvas']));
  ws.append(prefRow('landingMode', 'On reload, Architect opens in', null, ['Remember last', 'Coach', 'Converse']));
  ws.append(prefRow('restoreDeck', 'On reload, show', null, ['Last deck edited', 'A fresh deck']));
  ws.append(prefRow('historyCap', 'Auto checkpoints kept per deck', null, ['10', '30', '100', 'All'],
    () => { try { window.__dbStore?.applyHistoryCap?.(); } catch {} }));
  ws.append(prefRow('deleteStyle', 'Deleting a deck', null, ['Asks to confirm', 'Undo toast']));
  return ws;
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
  if (a.generation === 'puter') return 'Cloud AI (Puter)';
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
    // Reconnect is a desktop affordance — on-device tiers don't run on a phone.
    if (readTier() && !coarsePointer()) return 'Reconnect on-device AI'; // cached but not live this session
    return 'Deterministic floor';
  }
  function refresh() {
    if (trigger) {
      const a = model.availability();
      trigger.textContent = chipLabel(a); // gear drawn by CSS: .db-model-chip::before
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
      for (const k of keys) if (/transformers|webllm|mlc|onnx|model|hugging|xet/i.test(k)) await caches.delete(k);
    } catch {}
    writeTier(null);
    try { sessionStorage.removeItem(RESTORE_GUARD); } catch {}
    refresh();
  }

  // Inspect Cache Storage so the popover can say WHAT is downloaded (model names),
  // instead of an opaque origin-total number. Sizes aren't always on the cached
  // responses, so the readable list of names is the honest signal.
  async function cachedModels() {
    try {
      if (typeof caches === 'undefined') return [];
      const names = new Set();
      for (const cn of await caches.keys()) {
        if (!/transformers|webllm|mlc|onnx|hugging|xet|model/i.test(cn)) continue;
        const cache = await caches.open(cn);
        for (const req of await cache.keys()) {
          const m = req.url.match(/huggingface\.co\/[^/]+\/([^/?#]+)/i)
            || req.url.match(/(SmolLM2-\d+M-Instruct|Qwen[\d.]+-[\d.]+B-Instruct|bge-small-en-v1\.5)/i);
          if (m) names.add(m[1] || m[0]);
          else if (/mlc|web-llm/i.test(cn)) names.add('WebLLM');
        }
      }
      return [...names];
    } catch { return []; }
  }

  // ── the popover ──────────────────────────────────────────────────────────────
  async function render() {
    const my = ++renderToken;
    // Probe WebGPU + storage in parallel; bail if a newer render started (this is
    // what stops the duplicate-panel race — only the latest render paints).
    const [webgpu, est, models] = await Promise.all([
      probeWebGPU(),
      (navigator.storage?.estimate ? navigator.storage.estimate().catch(() => null) : Promise.resolve(null)),
      cachedModels(),
    ]);
    if (my !== renderToken) return;

    host.innerHTML = '';
    const a = model.availability();
    const heavyOk = webgpu && !coarsePointer(); // WebLLM only on a desktop GPU
    const panel = el('div', 'db-settings-panel');
    // Workspace preferences first (always available, no model needed), then the
    // on-device AI tier controls beneath a divider.
    panel.append(workspaceSection());
    panel.append(el('h3', 'db-settings-head db-settings-section-top', 'On-device AI'));

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
    tier('Universal (on-device)', a.universalReady ? 'in use' : coarsePointer() ? 'desktop only' : 'loadable');
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
      // On-device models are a DESKTOP capability. A phone tab can't hold the
      // weights (~350 MB–1 GB) without the OOM-reload we chased for weeks, and the
      // tiny models that do fit aren't worth it — so mobile gets no local tier at
      // all. Real conversation on a phone comes from Converse (cloud, free to you).
      if (coarsePointer()) {
        panel.append(el('p', 'db-settings-note',
          'On-device AI runs on desktop only — phone tabs can’t hold the model. ' +
          'On this device, Coach gives you the deterministic review, and Converse ' +
          'gives you a real conversation (cloud-powered, free to you).'));
      } else {
        // Universal Transformers.js — the no-GPU desktop path (works in any browser).
        if (a.promptApi !== 'available' && !a.universalReady && !a.webllmReady) {
          loadFlow('universal', 'Load on-device AI (~350 MB · any desktop browser)',
            'A one-time download so the Architect can converse privately on THIS computer — no GPU needed. It’s a compact model (modest answers), runs in your browser, and stays on your device. Prefer the highest quality? Use Converse (cloud) instead.',
            (p, s) => model.loadUniversal(p, s));
        }
        // WebLLM — desktop GPUs only (it crashes phone tabs).
        if (heavyOk && !a.webllmReady) {
          loadFlow('webllm', 'Advanced: WebLLM (~1 GB · desktop GPU)',
            'The highest-quality on-device tier, for capable desktops. Optional — the lighter tiers stay available.',
            (p, s) => model.summon(p, s));
        }
      }
    }

    // Surface the last load failure (was previously swallowed) so it's diagnosable.
    if (lastError) {
      const err = el('div', 'db-settings-error');
      err.append(el('strong', null, 'On-device AI couldn’t load. '));
      err.append(el('span', null, lastError));
      panel.append(err);
    }

    // Downloaded-model controls — show WHAT's cached (by name) so it's not a
    // mystery number, plus the on-device total, plus a clear Remove.
    if (models?.length || readTier() || a.universalReady || a.webllmReady) {
      panel.append(el('h3', 'db-settings-head db-settings-subhead', 'Downloaded on this device'));
      if (models?.length) {
        const list = el('ul', 'db-settings-models');
        for (const name of models) list.append(el('li', null, name));
        panel.append(list);
      } else {
        panel.append(el('p', 'db-settings-note', 'Nothing downloaded yet.'));
      }
      const cache = el('div', 'db-settings-cache');
      cache.append(el('span', 'db-settings-cache-label', est?.usage ? `~${fmtBytes(est.usage)} total (models + your decks)` : 'Cached on this device'));
      const rm = el('button', 'db-btn db-settings-remove', 'Remove models');
      rm.type = 'button';
      rm.title = 'Delete the cached model weights';
      rm.addEventListener('click', removeModel);
      cache.append(rm);
      panel.append(cache);
      panel.append(el('p', 'db-settings-note', 'Remove deletes the downloaded model weights to free space (they re-download if you load a model again). Your decks are kept.'));
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
    // On-device tiers are desktop-only now — never re-init a local model on a
    // phone (the weights can't survive the tab; Converse covers chat there).
    if (coarsePointer()) return;
    if (tier === 'webllm' && !(await probeWebGPU())) return;
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
