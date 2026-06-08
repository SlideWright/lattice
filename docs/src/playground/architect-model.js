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
// The universal generation tier: a small instruct model that runs in WASM via
// Transformers.js — no WebGPU, works on Safari / mobile (where the built-in
// Prompt API and WebLLM don't). ~350 MB q4 download, cached by the browser.
const UNIVERSAL_MODEL = 'onnx-community/Qwen2.5-0.5B-Instruct';

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
function transformersGenBackend() {
  let generator = null;
  let lib = null;
  return {
    name: 'transformers',
    async load(onProgress, signal) {
      lib = await import(/* @vite-ignore */ TRANSFORMERS_URL);
      generator = await lib.pipeline('text-generation', UNIVERSAL_MODEL, {
        // Force the WASM backend. This is the UNIVERSAL tier — it must not touch
        // WebGPU: Transformers.js otherwise auto-selects WebGPU when present, and
        // iOS Safari (which exposes navigator.gpu since iOS 18) has an immature
        // ONNX/WebGPU path that fails. WASM runs everywhere.
        device: 'wasm',
        dtype: 'q4',
        // Transformers.js reports `progress` as a 0–100 percentage, per file. The
        // adapter normalizes ALL backends to a 0–1 fraction so the UI is uniform.
        progress_callback: (p) => onProgress?.({ progress: (p?.progress || 0) / 100, text: p?.file || p?.status, status: p?.status }),
      });
      if (signal?.aborted) throw new Error('aborted');
      return true;
    },
    ready() { return !!generator; },
    async complete({ messages, onToken, signal }) {
      if (!generator) throw new Error('universal model not loaded');
      // Chat models accept the messages array and apply their own template.
      const streamer = onToken
        ? new lib.TextStreamer(generator.tokenizer, { skip_prompt: true, skip_special_tokens: true, callback_function: (t) => onToken(t) })
        : undefined;
      const out = await generator(messages, { max_new_tokens: 384, do_sample: false, streamer });
      if (signal?.aborted) return '';
      // For chat input, generated_text is the message array with the reply appended.
      const gen = out?.[0]?.generated_text;
      if (Array.isArray(gen)) return gen.at(-1)?.content ?? '';
      return typeof gen === 'string' ? gen : '';
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
