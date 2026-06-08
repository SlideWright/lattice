// The Drawing Board — model settings + the WebLLM opt-in (Phase 2, Slice 8).
//
// Makes the on-device model ladder visible and controllable: which tier is live,
// a switch to force the deterministic floor (the offline guarantee + a privacy
// control), and the deliberate "summon the Architect" WebLLM download (opt-in,
// WebGPU-gated, ~1GB, cancelable). Everything degrades cleanly when a tier is
// unavailable — which is the case in CI/headless, so the degraded states are the
// ones verified here; the live download needs WebGPU on real hardware.

const MODEL_KEY = 'lattice-db-model';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const readEnabled = () => { try { return localStorage.getItem(MODEL_KEY) !== 'off'; } catch { return true; } };
const writeEnabled = (on) => { try { localStorage.setItem(MODEL_KEY, on ? 'on' : 'off'); } catch {} };

// Real WebGPU support is more than `'gpu' in navigator` — headless Chromium
// exposes the object but has no adapter. Probe for an adapter (async, cached).
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
function tierLabel(a) {
  if (!a.modelOn) return 'Deterministic (AI off)';
  if (a.generation === 'webllm') return 'WebLLM (on-device)';
  if (a.generation === 'prompt-api') return 'Built-in AI (on-device)';
  if (a.generation === 'transformers') return 'On-device AI (universal)';
  if (a.generation === 'mock') return 'Mock (testing)';
  return 'Deterministic floor';
}

export function createModelSettings({ host, trigger, model, onChange }) {
  if (!host || !model) return { refresh() {}, toggle() {} };
  let open = false;
  let abort = null;

  function statusText() {
    const a = model.availability();
    return tierLabel(a);
  }

  // Keep the trigger chip's label in sync with the live tier.
  function refresh() {
    if (trigger) {
      const a = model.availability();
      trigger.textContent = '⚙ ' + statusText();
      trigger.classList.toggle('is-floor', a.generation === 'floor' || !a.modelOn);
    }
    if (open) render();
  }

  async function render() {
    host.innerHTML = '';
    const a = model.availability();
    const panel = el('div', 'db-settings-panel');
    panel.append(el('h3', 'db-settings-head', 'On-device AI'));

    // The master switch — force the deterministic floor (privacy / offline).
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
    panel.append(el('p', 'db-settings-note',
      'Off = the Architect runs fully deterministically (no model, nothing downloaded). ' +
      'Findings, scores and fixes are identical either way — the model only adds phrasing and conversation.'));

    // Tier readout — the generation ladder, in preference order.
    const webgpu = await probeWebGPU();
    const tiers = el('div', 'db-settings-tiers');
    const tier = (name, state) => {
      const r = el('div', 'db-settings-tier');
      r.append(el('span', 'db-settings-tier-name', name), el('span', 'db-settings-tier-state', state));
      tiers.append(r);
    };
    tier('Built-in AI (Chrome/Edge)', a.promptApi === 'available' ? 'ready' : a.promptApi === 'downloadable' ? 'downloadable' : 'not here');
    tier('Universal (runs anywhere)', a.universalReady ? 'loaded' : 'loadable');
    tier('Advanced · WebLLM', a.webllmReady ? 'loaded' : webgpu ? 'available' : 'needs WebGPU');
    panel.append(tiers);

    // A shared download flow (progress + retry) for the on-demand model tiers.
    const loadFlow = (label, note, loader) => {
      const btn = el('button', 'db-btn db-btn-primary db-settings-summon', label);
      btn.type = 'button';
      const prog = el('div', 'db-settings-progress');
      const bar = el('i');
      prog.append(bar);
      prog.hidden = true;
      btn.addEventListener('click', async () => {
        abort = new AbortController();
        btn.disabled = true;
        prog.hidden = false;
        try {
          await loader((p) => {
            const pct = Math.round((p?.progress || 0) * 100);
            bar.style.width = pct + '%';
            btn.textContent = `Loading… ${pct}%`;
          }, abort.signal);
          refresh();
          render();
          onChange?.();
        } catch {
          btn.disabled = false;
          btn.textContent = 'Load failed — retry';
          prog.hidden = true;
        }
      });
      panel.append(btn, prog, el('p', 'db-settings-note', note));
    };

    if (a.modelOn) {
      // The universal Transformers.js fallback — the path that matters on Safari /
      // mobile (no Prompt API, no WebGPU). Offered whenever the built-in tier
      // isn't here and it isn't already loaded.
      if (a.promptApi !== 'available' && !a.universalReady && !a.webllmReady) {
        loadFlow('Load on-device AI (~350 MB · works on any browser)',
          'A one-time download so the Architect can converse on THIS device — no special browser or GPU needed. Runs in your browser; stays on your device.',
          (p, s) => model.loadUniversal(p, s));
      }
      // The advanced power-user tier — WebGPU only.
      if (webgpu && !a.webllmReady) {
        loadFlow('Advanced: summon WebLLM (~1 GB · WebGPU)',
          'The highest-quality on-device tier, for capable desktops. Optional — the lighter tiers stay available.',
          (p, s) => model.summon(p, s));
      }
    }

    host.append(panel);
  }

  function toggle() {
    open = !open;
    host.hidden = !open;
    if (open) render();
  }
  function close() { open = false; host.hidden = true; }

  if (trigger) trigger.addEventListener('click', toggle);
  // Click-away + Esc close.
  document.addEventListener('click', (e) => {
    if (open && !host.contains(e.target) && e.target !== trigger) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(); });

  host.hidden = true;
  refresh();
  return { refresh, toggle, close, isEnabled: readEnabled };
}
