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
  if (a.generation === 'mock') return 'Mock (testing)';
  return 'Deterministic floor';
}

export function createModelSettings({ host, trigger, model, onChange }) {
  if (!host || !model) return { refresh() {}, toggle() {} };
  let open = false;
  let summoning = false;
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

    // Tier readout.
    const tiers = el('div', 'db-settings-tiers');
    const promptRow = el('div', 'db-settings-tier');
    promptRow.append(el('span', 'db-settings-tier-name', 'Built-in AI (Chrome/Edge)'));
    promptRow.append(el('span', 'db-settings-tier-state', a.promptApi === 'available' ? 'ready' : a.promptApi === 'downloadable' ? 'downloadable' : 'not here'));
    tiers.append(promptRow);

    const webgpu = await probeWebGPU();
    const llmRow = el('div', 'db-settings-tier');
    llmRow.append(el('span', 'db-settings-tier-name', 'WebLLM (higher quality)'));
    llmRow.append(el('span', 'db-settings-tier-state', a.webllmReady ? 'loaded' : webgpu ? 'available' : 'needs WebGPU'));
    tiers.append(llmRow);
    panel.append(tiers);

    // The opt-in summon — only when WebGPU is real and not already loaded.
    if (a.modelOn && webgpu && !a.webllmReady) {
      const summon = el('button', 'db-btn db-btn-primary db-settings-summon', summoning ? 'Summoning…' : 'Summon the Architect (WebLLM · ~1GB)');
      summon.type = 'button';
      summon.disabled = summoning;
      const prog = el('div', 'db-settings-progress');
      const bar = el('i');
      prog.append(bar);
      prog.hidden = !summoning;
      summon.addEventListener('click', async () => {
        summoning = true;
        abort = new AbortController();
        summon.disabled = true;
        summon.textContent = 'Summoning…';
        prog.hidden = false;
        try {
          await model.summon((p) => {
            const pct = Math.round((p?.progress || 0) * 100);
            bar.style.width = pct + '%';
            summon.textContent = p?.text ? `Summoning… ${pct}%` : `Summoning… ${pct}%`;
          }, abort.signal);
          summoning = false;
          refresh();
          render();
          onChange?.();
        } catch {
          summoning = false;
          summon.disabled = false;
          summon.textContent = 'Summon failed — retry';
          prog.hidden = true;
        }
      });
      panel.append(summon, prog);
      panel.append(el('p', 'db-settings-note', 'A one-time download for the highest-quality on-device coaching. Stays on your device; cancelable; declining keeps the lighter tiers.'));
    } else if (a.modelOn && !webgpu) {
      panel.append(el('p', 'db-settings-note', 'This browser can’t run the WebLLM tier (no WebGPU). The built-in AI tier is used when present; otherwise the Architect runs deterministically.'));
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
