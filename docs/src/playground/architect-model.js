// The Drawing Board — the ArchitectModel adapter (the on-device model ladder).
//
// One interface, four backends, behind feature detection. App code never
// branches on the backend: complete() ALWAYS resolves to text/JSON, falling
// through the ladder to the deterministic floor when no model is present, so a
// missing model degrades to the proven Phase-1 behaviour rather than breaking.
//
//   generation:  built-in Prompt API  →  WebLLM (opt-in)  →  floor (templated)
//   embeddings:  Transformers.js bge-small (CDN, always the same model)  →  null
//
// The model NEVER owns correctness — callers compute the deterministic answer and
// pass it as `fallback`; the model only (optionally) improves the phrasing. See
// engineering/decisions/2026-06-08-drawing-board-phase-2-build.md for why the
// heavy runtimes load from CDN on demand (no npm deps) and how this is verified
// without real hardware (a MockBackend exercises the model-on path in CI).
//
// Sibling render-path note: this is docs-only (the Drawing Board); it does not
// touch the three engine render paths.

// CDN entrypoints for the heavy, opt-in runtimes. Swap these for bundled
// import()s if a future deployment needs self-hosted weights — the adapter
// interface is unchanged.
const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm';
const TRANSFORMERS_URL = 'https://esm.run/@huggingface/transformers';
const EMBED_MODEL = 'Xenova/bge-small-en-v1.5';
const WEBLLM_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
// The universal generation tier: a tiny instruct model that runs in WASM via
// Transformers.js — no WebGPU, works on Safari / mobile (where the built-in
// Prompt API and WebLLM don't). SmolLM2-135M at q4 is ~100 MB and stays well
// inside a phone browser tab's memory budget; quality is modest (it's a 135M
// model — the coaching floor of the tiers, not the ceiling). Desktops reach for
// the built-in Prompt API or the WebLLM tier for stronger answers.
const UNIVERSAL_MODEL = 'HuggingFaceTB/SmolLM2-135M-Instruct';

const hasWindow = typeof window !== 'undefined';
const G = typeof globalThis !== 'undefined' ? globalThis : {};

// ── Feature detection (all guarded — returns false/unavailable in Node) ───────

export function detectWebGPU() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

// The built-in Prompt API surfaces as `LanguageModel` (Chrome/Edge). Its
// availability() is 'available' | 'downloadable' | 'downloading' | 'unavailable'.
export async function detectPromptApi() {
  try {
    const LM = G.LanguageModel;
    if (!LM || typeof LM.availability !== 'function') return 'unavailable';
    return await LM.availability();
  } catch {
    return 'unavailable';
  }
}

// ── Backends ──────────────────────────────────────────────────────────────────
//
// A backend is { complete({messages, json, fallback, signal, onToken}), name }.
// complete() may throw; the adapter catches and floors.

// The deterministic floor: returns exactly what the caller computed. This is the
// whole offline guarantee in one function.
const floorBackend = {
  name: 'floor',
  async complete({ json, fallback }) {
    return json ? (fallback ?? {}) : (fallback ?? '');
  },
};

// Built-in Prompt API. Streams tokens through onToken when given.
function promptApiBackend() {
  let session = null;
  return {
    name: 'prompt-api',
    async complete({ messages, json, signal, onToken }) {
      const LM = G.LanguageModel;
      if (!LM) throw new Error('Prompt API absent');
      if (!session) {
        const sys = messages.find((m) => m.role === 'system');
        session = await LM.create(sys ? { initialPrompts: [{ role: 'system', content: sys.content }] } : {});
      }
      const turns = messages.filter((m) => m.role !== 'system').map((m) => `${m.role}: ${m.content}`).join('\n');
      const prompt = json ? `${turns}\n\nReply with ONLY valid JSON.` : turns;
      if (onToken && typeof session.promptStreaming === 'function') {
        let full = '';
        const stream = session.promptStreaming(prompt, signal ? { signal } : undefined);
        for await (const chunk of stream) { full += chunk; onToken(chunk); }
        return full;
      }
      return await session.prompt(prompt, signal ? { signal } : undefined);
    },
    destroy() { try { session?.destroy?.(); } catch {} session = null; },
  };
}

// WebLLM — opt-in, WebGPU, ~1GB download. Loaded from CDN only when summoned.
function webllmBackend() {
  let engine = null;
  return {
    name: 'webllm',
    async load(onProgress, signal) {
      const webllm = await import(/* @vite-ignore */ WEBLLM_URL);
      engine = await webllm.CreateMLCEngine(WEBLLM_MODEL, {
        // WebLLM's progress is already a 0–1 fraction — pass it through in the
        // same {progress, text} shape the universal backend uses.
        initProgressCallback: (p) => onProgress?.({ progress: p?.progress || 0, text: p?.text }),
      });
      if (signal?.aborted) throw new Error('aborted');
      return true;
    },
    ready() { return !!engine; },
    async complete({ messages, json, signal, onToken }) {
      if (!engine) throw new Error('WebLLM not summoned');
      const req = {
        messages,
        stream: !!onToken,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      };
      if (onToken) {
        let full = '';
        const chunks = await engine.chat.completions.create(req);
        for await (const c of chunks) {
          if (signal?.aborted) break;
          const t = c.choices?.[0]?.delta?.content || '';
          full += t; if (t) onToken(t);
        }
        return full;
      }
      const r = await engine.chat.completions.create(req);
      return r.choices?.[0]?.message?.content ?? '';
    },
  };
}

// Transformers.js (WASM) generation — the UNIVERSAL tier. A small instruct model
// loaded from CDN on demand; runs everywhere (no WebGPU), so it's the fallback
// for Safari / mobile where the built-in Prompt API and WebLLM aren't available.
// Slower than the others, so keep prompts short (the chat already truncates).
const MAX_NEW_TOKENS = 128; // a tiny model on a phone is slow per token — keep replies short

// The worker body (module worker, runs the model OFF the main thread so the UI
// never freezes and tokens can paint as they stream). It dynamic-imports
// Transformers.js from the CDN, loads the pipeline on WASM, and streams. If the
// page is cross-origin isolated (SharedArrayBuffer available), onnxruntime-web
// uses multiple threads automatically — no code change here.
const WORKER_SRC = `
let lib = null, gen = null;
self.onmessage = async (e) => {
  const d = e.data || {};
  try {
    if (d.type === 'load') {
      lib = await import(d.url);
      gen = await lib.pipeline('text-generation', d.model, {
        device: 'wasm', dtype: 'q4',
        progress_callback: (p) => self.postMessage({ type: 'progress', progress: (p && p.progress) || 0, file: p && p.file, status: p && p.status }),
      });
      self.postMessage({ type: 'loaded' });
    } else if (d.type === 'generate') {
      const streamer = new lib.TextStreamer(gen.tokenizer, { skip_prompt: true, skip_special_tokens: true, callback_function: (t) => self.postMessage({ type: 'token', id: d.id, t }) });
      const out = await gen(d.messages, { max_new_tokens: d.max || 128, do_sample: false, streamer });
      const g = out && out[0] && out[0].generated_text;
      const text = Array.isArray(g) ? ((g[g.length - 1] && g[g.length - 1].content) || '') : (typeof g === 'string' ? g : '');
      self.postMessage({ type: 'done', id: d.id, text });
    }
  } catch (err) {
    self.postMessage({ type: d.type === 'load' ? 'load-error' : 'gen-error', id: d.id, error: String((err && err.message) || err) });
  }
};
`;

// The universal generation backend. Prefers a Web Worker (non-blocking, streams);
// falls back to main-thread inference where module workers aren't available.
function transformersGenBackend() {
  let worker = null;
  let isReady = false;
  let mainGen = null; // main-thread fallback pipeline
  let mainLib = null;
  let nextId = 1;
  const pending = new Map(); // generate id -> { onToken, resolve, reject }
  let onLoaded = null;
  let onLoadErr = null;
  let onProg = null;

  function makeWorker() {
    if (worker) return worker;
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    worker = new Worker(url, { type: 'module' });
    worker.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === 'progress') onProg?.({ progress: (d.progress || 0) / 100, text: d.file, status: d.status });
      else if (d.type === 'loaded') { isReady = true; onLoaded?.(true); }
      else if (d.type === 'load-error') onLoadErr?.(new Error(d.error || 'load failed'));
      else if (d.type === 'token') pending.get(d.id)?.onToken?.(d.t);
      else if (d.type === 'done') { const p = pending.get(d.id); pending.delete(d.id); p?.resolve?.(d.text || ''); }
      else if (d.type === 'gen-error') { const p = pending.get(d.id); pending.delete(d.id); p?.reject?.(new Error(d.error || 'generation failed')); }
    };
    worker.onerror = (ev) => onLoadErr?.(new Error(ev.message || 'worker error'));
    return worker;
  }

  // Main-thread fallback (no module-worker support): the previous in-page path.
  async function loadMain(onProgress) {
    mainLib = await import(/* @vite-ignore */ TRANSFORMERS_URL);
    mainGen = await mainLib.pipeline('text-generation', UNIVERSAL_MODEL, {
      device: 'wasm',
      dtype: 'q4',
      progress_callback: (p) => onProgress?.({ progress: (p?.progress || 0) / 100, text: p?.file || p?.status, status: p?.status }),
    });
    isReady = true;
  }

  return {
    name: 'transformers',
    async load(onProgress, signal) {
      // Try the worker first; fall back to main-thread if it can't even be created.
      try {
        makeWorker();
      } catch {
        await loadMain(onProgress);
        return true;
      }
      onProg = onProgress;
      try {
        await new Promise((resolve, reject) => {
          onLoaded = resolve;
          onLoadErr = reject;
          worker.postMessage({ type: 'load', url: TRANSFORMERS_URL, model: UNIVERSAL_MODEL });
          if (signal) signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        });
        return true;
      } catch (e) {
        // The worker loaded but couldn't bring up the model (e.g. an iOS
        // module-worker cross-origin-import restriction). Tear it down and fall
        // back to main-thread inference so the model still works (just blocking).
        if (String(e?.message) === 'aborted') throw e;
        try { worker.terminate(); } catch {}
        worker = null;
        await loadMain(onProgress);
        return true;
      }
    },
    ready() { return isReady; },
    async complete({ messages, onToken, signal }) {
      if (!isReady) throw new Error('universal model not loaded');
      // Worker path — stream tokens back without blocking the UI.
      if (worker) {
        const id = nextId++;
        return new Promise((resolve, reject) => {
          pending.set(id, { onToken, resolve, reject });
          worker.postMessage({ type: 'generate', id, messages, max: MAX_NEW_TOKENS });
          if (signal) signal.addEventListener('abort', () => { pending.delete(id); reject(new Error('aborted')); }, { once: true });
        });
      }
      // Main-thread fallback.
      const streamer = onToken
        ? new mainLib.TextStreamer(mainGen.tokenizer, { skip_prompt: true, skip_special_tokens: true, callback_function: (t) => onToken(t) })
        : undefined;
      const out = await mainGen(messages, { max_new_tokens: MAX_NEW_TOKENS, do_sample: false, streamer });
      const g = out?.[0]?.generated_text;
      if (Array.isArray(g)) return g.at(-1)?.content ?? '';
      return typeof g === 'string' ? g : '';
    },
  };
}

// ── JSON discipline — force structure, validate before returning ──────────────

export function extractJson(text) {
  if (text && typeof text === 'object') return text;
  if (typeof text !== 'string') return null;
  // Tolerate prose around the object / a fenced ```json block.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

// ── The adapter ───────────────────────────────────────────────────────────────

export function createArchitectModel({ getSettings } = {}) {
  const settings = () => (getSettings ? getSettings() : {}) || {};
  const modelOn = () => settings().modelEnabled !== false; // default on; one switch off

  let injected = null; // test hook — a MockBackend
  const prompt = promptApiBackend();
  const webllm = webllmBackend();
  let universal = transformersGenBackend();
  let promptAvail = 'unknown';
  let embedder = null; // lazy Transformers.js pipeline
  let embedTried = false;
  let tierPref = 'auto'; // 'auto' | 'prompt-api' | 'webllm' | 'universal' | 'floor'

  async function refreshAvailability() {
    promptAvail = await detectPromptApi();
    return promptAvail;
  }

  // Pick the active generation backend by readiness + preference. The model-off
  // switch wins over everything (incl. an injected test backend) — that's the
  // offline guarantee and the test hook for forcing the floor.
  function pickBackend() {
    if (!modelOn() || tierPref === 'floor') return floorBackend;
    if (injected) return injected;
    // Explicit preference wins when that tier is ready.
    if (tierPref === 'webllm' && webllm.ready()) return webllm;
    if (tierPref === 'universal' && universal.ready()) return universal;
    if (tierPref === 'prompt-api' && promptAvail === 'available') return prompt;
    // auto ladder: WebLLM (advanced, explicitly summoned) → built-in Prompt API
    // (free, instant, no download) → Transformers.js universal (loaded WASM) →
    // floor. Matches the plan's Prompt-API-first, Transformers.js-fallback intent.
    if (webllm.ready()) return webllm;
    if (promptAvail === 'available') return prompt;
    if (universal.ready()) return universal;
    return floorBackend;
  }

  async function complete(opts) {
    const { json, fallback } = opts;
    const backend = pickBackend();
    if (backend === floorBackend) return floorBackend.complete(opts);
    try {
      const out = await backend.complete(opts);
      if (!json) return (out && String(out).trim()) || fallback || '';
      const parsed = extractJson(out);
      return parsed ?? (fallback ?? {}); // validate-or-floor
    } catch {
      return floorBackend.complete(opts); // any model failure → the floor
    }
  }

  // Embeddings — always the same bge-small model, loaded from CDN once, cached by
  // the browser Cache API. Returns Array<number>[] or null (caller keyword-falls
  // back). Never throws.
  async function embed(texts) {
    if (!modelOn() || !hasWindow) return null;
    const list = Array.isArray(texts) ? texts : [texts];
    if (injected?.embed) return injected.embed(list);
    if (!embedder && !embedTried) {
      embedTried = true;
      try {
        const t = await import(/* @vite-ignore */ TRANSFORMERS_URL);
        embedder = await t.pipeline('feature-extraction', EMBED_MODEL);
      } catch { embedder = null; }
    }
    if (!embedder) return null;
    try {
      const out = await embedder(list, { pooling: 'mean', normalize: true });
      // transformers.js returns a Tensor; .tolist() → number[][].
      return typeof out.tolist === 'function' ? out.tolist() : out;
    } catch { return null; }
  }

  return {
    complete,
    embed,
    refreshAvailability,
    availability() {
      return {
        generation: pickBackend().name,
        promptApi: promptAvail,
        webgpu: detectWebGPU(),
        webllmReady: webllm.ready(),
        universalReady: universal.ready(),
        embeddings: modelOn() && hasWindow,
        modelOn: modelOn(),
      };
    },
    setTier(name) { tierPref = name; },
    // WebLLM opt-in — the deliberate "summon the Architect" (~1GB, WebGPU) download.
    async summon(onProgress, signal) {
      await webllm.load(onProgress, signal);
      tierPref = 'webllm';
      return true;
    },
    // The universal Transformers.js tier — the no-WebGPU fallback (Safari/mobile).
    // ~350MB WASM model loaded on demand; once loaded it's used when there's no
    // Prompt API. Never throws to the caller's flow — caller surfaces progress.
    async loadUniversal(onProgress, signal) {
      await universal.load(onProgress, signal);
      return true;
    },
    webgpu: detectWebGPU(),
    // Test hooks (used by the Node suite to exercise the model-on path + ladder).
    __setBackend(b) { injected = b; },
    __setPromptAvailability(a) { promptAvail = a; },
    __setUniversal(b) { universal = b; },
  };
}

// A scripted backend for tests + previews — streams canned tokens / returns
// canned JSON, so the full compose→stream→parse→apply flow is exercised with no
// real model. Not used in production paths.
export function MockBackend({ reply = 'mock reply', jsonReply = null, embedDim = 32 } = {}) {
  return {
    name: 'mock',
    async complete({ json, onToken, fallback }) {
      if (json) return jsonReply ?? fallback ?? {};
      const text = typeof reply === 'function' ? reply() : reply;
      if (onToken) for (const tok of String(text).split(/(\s+)/)) onToken(tok);
      return text;
    },
    async embed(list) {
      // Deterministic bag-of-words pseudo-embeddings: each token is hashed to a
      // dimension and counted. Stable across runs AND lexically meaningful, so the
      // retrieval pipeline (embed → cosineRank) can be tested end-to-end — shared
      // tokens raise cosine, disjoint vocab → ~0 — without a real embedder.
      return list.map((s) => {
        const v = new Array(embedDim).fill(0);
        for (const tok of String(s).toLowerCase().split(/\W+/).filter(Boolean)) {
          let h = 0;
          for (let i = 0; i < tok.length; i++) h = (h * 31 + tok.charCodeAt(i)) >>> 0;
          v[h % embedDim] += 1;
        }
        return v;
      });
    },
  };
}
