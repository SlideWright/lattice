import * as React from 'react';
import { applyEdit, diffLines, EDIT_PROTOCOL, numberSlides, parseEdits } from '@/playground/architect-edits.js';
import { requestSlideFix } from '@/playground/architect-fix.js';
import { buildRefinePrompt, cleanRewrite, REFINE_ACTIONS } from '@/playground/drawing-board-refine.js';
import { budgetStatus, readBudgetCap, readBudgetMode, readSpend, recordSpend } from '@/playground/drawing-board-settings.js';

// Re-export the canonical refine action list (Polish / Formalize / Elaborate /
// Shorten) so the Studio's UI menu and the Drawing Board read from one source.
export { REFINE_ACTIONS };
export type RefineActionId = 'polish' | 'formalize' | 'elaborate' | 'shorten';

// Studio Architect — the HONEST AI layer. It wraps the production architect model
// (architect-model.js: OpenRouter cloud → in-browser tiers → deterministic floor)
// and the edit protocol (architect-edits.js). The contract is honesty:
//   - With a model CONNECTED, an action runs a real completion, parses the edit
//     blocks, and applies them to the source — a real, reviewable change.
//   - With NO model (the floor), it does NOT fake an edit; it reports `offline`
//     so the UI can point the author at Workspace → connect, instead of toasting
//     a change that never happened.

const SYSTEM =
	'You are the Lattice Architect, a boardroom deck editor. Authoring rules: ' +
	'card-style layouts nest "- Title" then a two-space-indented "  - body" (never ' +
	'inline "- **Title.** body"); open each slide with its takeaway or headline ' +
	'number, then the supporting rows; keep prose tight and board-grade. ' +
	EDIT_PROTOCOL;

type Usage = { cost?: number; total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };

/** A catalog entry, the shape architect-model.js `listOpenRouterModels()` yields. */
export type ORModel = {
	id: string;
	name: string;
	promptPerM: number | null;
	completionPerM: number | null;
	contextLength: number | null;
	maxOutput: number | null;
	vision: boolean;
};

/** The OpenRouter account readout — authoritative spend (usage) + remaining credit. */
export type ORAccount = { usage?: number | null; limit?: number | null; remaining?: number | null };

/** The generation-ladder availability flags `architect-model.js` reports. */
export type ModelAvailability = {
	generation: string;
	promptApi: string; // 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unknown'
	webgpu: boolean;
	webllmReady: boolean;
	universalReady: boolean;
	openRouterReady: boolean;
	modelOn: boolean;
};

/** Download progress for an on-device tier (0–1 fraction + a status line). */
export type TierProgress = { progress: number; text?: string; status?: string };

type ArchitectModel = {
	complete: (o: { messages: { role: string; content: string }[]; json?: boolean; fallback?: string; onUsage?: (u: Usage) => void }) => Promise<string>;
	availability: () => ModelAvailability;
	refreshAvailability?: () => Promise<unknown>;
	beginOpenRouterAuth: (cb: string) => Promise<string | null>;
	resumeOpenRouterAuth: (code: string) => Promise<boolean>;
	hasPendingOpenRouterAuth: () => boolean;
	disconnectOpenRouter: () => void;
	openRouterAccount: () => Promise<ORAccount | null> | ORAccount | null;
	openRouterModelName: () => string | null;
	// The catalog + selection the Workspace model picker drives.
	listOpenRouterModels: () => Promise<ORModel[]>;
	openRouterModel: () => string;
	setOpenRouterModel: (id: string) => void;
	// The on-device ladder the Workspace restores to its UI.
	setTier: (name: string) => void;
	summon: (onProgress?: (p: TierProgress) => void, signal?: AbortSignal) => Promise<boolean>;
	loadUniversal: (onProgress?: (p: TierProgress) => void, signal?: AbortSignal) => Promise<boolean>;
};

let modelPromise: Promise<ArchitectModel | null> | null = null;
/** The single shared architect model (lazy — backends touch window). */
export function architectModel(): Promise<ArchitectModel | null> {
	if (!modelPromise) {
		modelPromise = import('@/playground/architect-model.js')
			.then((m) => m.createArchitectModel({ getSettings: () => ({}) }) as ArchitectModel)
			.catch(() => null);
	}
	return modelPromise;
}

export type ArchitectOutcome =
	| { status: 'applied'; source: string; applied: number; note: string }
	| { status: 'advice'; note: string }
	| { status: 'offline' }
	| { status: 'blocked'; note: string };

/**
 * Run one architect instruction against the deck. Returns the edited source +
 * count when a connected model proposes edits, the model's advice when it only
 * advises, `offline` when no model is connected, or `blocked` when the user's
 * hard budget cap (mode: 'stop') is reached on the cloud tier — so the UI degrades
 * honestly and never spends real credit past the guardrail.
 */
export async function runArchitect(source: string, instruction: string): Promise<ArchitectOutcome> {
	const model = await architectModel();
	if (!model) return { status: 'offline' };
	const generation = model.availability().generation;
	if (generation === 'floor') return { status: 'offline' };
	// Respect the user's hard budget cap on the paid cloud tier — the same gate the
	// production chat enforces (drawing-board-chat.js). Local tiers are free.
	if (generation === 'openrouter' && architectSpend().status.blocked) {
		return { status: 'blocked', note: 'Budget cap reached — raise it in Workspace → Spend, or switch tier.' };
	}
	const messages = [
		{ role: 'system', content: SYSTEM },
		{ role: 'user', content: `${instruction}\n\nThe deck — address slides by their [slide N] markers, and never include a marker in an edit body:\n\n${numberSlides(source)}` },
	];
	let reply = '';
	try {
		reply = await model.complete({
			messages,
			fallback: '',
			onUsage: (u) => recordSpend(u?.cost ?? 0, u?.total_tokens ?? (u?.prompt_tokens || 0) + (u?.completion_tokens || 0)),
		});
	} catch {
		return { status: 'offline' };
	}
	const { text, edits } = parseEdits(reply);
	if (!edits.length) return { status: 'advice', note: text || 'The model had no change to propose.' };
	// Apply highest slide first so earlier indices stay valid as the deck shifts.
	let next = source;
	for (const e of [...edits].sort((a, b) => b.slide - a.slide)) next = applyEdit(next, e);
	return { status: 'applied', source: next, applied: edits.length, note: text || `Applied ${edits.length} edit${edits.length > 1 ? 's' : ''}.` };
}

export type RefineOutcome =
	| { status: 'ok'; text: string }
	| { status: 'nochange' }
	| { status: 'offline' }
	| { status: 'blocked'; note: string };

/**
 * Refine a SELECTION of prose with the model (Polish / Formalize / Elaborate /
 * Shorten). Reuses the Drawing Board's pure refine kernel (`buildRefinePrompt` +
 * `cleanRewrite`) — the system brief forbids inventing facts or breaking markdown
 * and asks for ONLY the rewritten text back, so the result applies verbatim. The
 * model PROPOSES; the caller APPLIES it as one undoable editor transaction.
 * Honest like the rest: `offline` with no model, `blocked` at the budget cap,
 * `nochange` when the rewrite is empty or identical — never a fabricated edit.
 */
export async function refineSelection(action: RefineActionId, text: string): Promise<RefineOutcome> {
	if (!text.trim()) return { status: 'nochange' };
	const model = await architectModel();
	if (!model) return { status: 'offline' };
	const generation = model.availability().generation;
	if (generation === 'floor') return { status: 'offline' };
	if (generation === 'openrouter' && architectSpend().status.blocked) {
		return { status: 'blocked', note: 'Budget cap reached — raise it in Workspace → Spend, or switch tier.' };
	}
	let out = '';
	try {
		out = await model.complete({
			messages: buildRefinePrompt(action, text),
			fallback: text,
			onUsage: (u) => recordSpend(u?.cost ?? 0, u?.total_tokens ?? (u?.prompt_tokens || 0) + (u?.completion_tokens || 0)),
		});
	} catch {
		return { status: 'offline' };
	}
	const next = cleanRewrite(out, text);
	if (!next || next === text) return { status: 'nochange' };
	return { status: 'ok', text: next };
}

// A deterministic lint finding (the shape lint-core's `lintTextWith` returns) — a
// per-slide issue the Coach panel can offer to fix with AI.
export type Finding = { slide: number; rule: string; severity: string; message: string; fix?: string; autofixable?: boolean; line?: string };

export type FixOutcome =
	| { status: 'ok'; before: string; after: string; edit: unknown }
	| { status: 'nochange' }
	| { status: 'offline' }
	| { status: 'blocked'; note: string };

/**
 * Ask the model to rewrite the ONE slide a finding flags, for review. Reuses the
 * Drawing Board's `requestSlideFix` (the same edit-block protocol + canon grounding
 * the Coach card uses there): the model PROPOSES a `{ before, after, edit }` the UI
 * renders as a diff; nothing is applied until the author clicks Apply. Honest like
 * the rest — `offline` with no model, `blocked` at the cap, `nochange` when nothing
 * usable comes back. `catalog` is the component dossier (the Studio's `components`
 * prop) so the rewrite respects each layout's authoring contract.
 */
export async function requestFindingFix(source: string, finding: Finding, catalog: unknown[]): Promise<FixOutcome> {
	const model = await architectModel();
	if (!model) return { status: 'offline' };
	const generation = model.availability().generation;
	if (generation === 'floor') return { status: 'offline' };
	if (generation === 'openrouter' && architectSpend().status.blocked) {
		return { status: 'blocked', note: 'Budget cap reached — raise it in Workspace → Spend, or switch tier.' };
	}
	try {
		const res = await requestSlideFix({
			model,
			gate: { cache: () => generation === 'openrouter', onUsage: (u: Usage) => recordSpend(u?.cost ?? 0, u?.total_tokens ?? (u?.prompt_tokens || 0) + (u?.completion_tokens || 0)) },
			source,
			finding,
			catalog,
		});
		if (!res) return { status: 'nochange' };
		return { status: 'ok', before: res.before, after: res.after, edit: res.edit };
	} catch {
		return { status: 'offline' };
	}
}

/** Apply a proposed edit block (from `requestFindingFix`) to the deck source. */
export function applyDeckEdit(source: string, edit: unknown): string {
	return applyEdit(source, edit);
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };
export type DiffRow = { type: 'same' | 'add' | 'del'; text: string };
export type ChatResult =
	| { status: 'ok'; reply: string; proposed: { source: string; count: number; diff: DiffRow[] } | null }
	| { status: 'offline' }
	| { status: 'blocked'; reply: string };

/**
 * One turn of the Architect chat. Runs the conversation through the connected
 * model with the deck in context; if the reply proposes edit blocks, returns the
 * resulting source + a line diff for a review-then-apply card (nothing is applied
 * here). Degrades to `offline`/`blocked` honestly — never a fabricated answer.
 */
export async function chatComplete(history: ChatTurn[], source: string): Promise<ChatResult> {
	const model = await architectModel();
	if (!model) return { status: 'offline' };
	const generation = model.availability().generation;
	if (generation === 'floor') return { status: 'offline' };
	if (generation === 'openrouter' && architectSpend().status.blocked) {
		return { status: 'blocked', reply: 'Budget cap reached — raise it in Workspace → Spend, or switch tier.' };
	}
	const last = history[history.length - 1];
	const messages = [
		{ role: 'system', content: `${SYSTEM}\n\nConverse with the author. Answer questions directly. Only emit edit blocks when they actually want a change to the deck.` },
		...history.slice(0, -1),
		{ role: 'user', content: `${last?.content ?? ''}\n\nThe current deck — address slides by their [slide N] markers, never include a marker in an edit body:\n\n${numberSlides(source)}` },
	];
	let reply = '';
	try {
		reply = await model.complete({
			messages,
			fallback: '',
			onUsage: (u) => recordSpend(u?.cost ?? 0, u?.total_tokens ?? (u?.prompt_tokens || 0) + (u?.completion_tokens || 0)),
		});
	} catch {
		return { status: 'offline' };
	}
	const { text, edits } = parseEdits(reply);
	if (!edits.length) return { status: 'ok', reply: text || 'No change suggested.', proposed: null };
	let next = source;
	for (const e of [...edits].sort((a, b) => b.slide - a.slide)) next = applyEdit(next, e);
	return { status: 'ok', reply: text || `Proposed ${edits.length} edit${edits.length > 1 ? 's' : ''} — review and apply below.`, proposed: { source: next, count: edits.length, diff: diffLines(source, next) as DiffRow[] } };
}

/** Real session/all-time spend + the budget gauge, read from the shared store. */
export function architectSpend() {
	try {
		const s = readSpend();
		const cap = readBudgetCap();
		const mode = readBudgetMode();
		return { ...s, cap, mode, status: budgetStatus({ sessionSpend: s.session, cap, mode }) };
	} catch {
		return { total: 0, session: 0, totalTokens: 0, sessionTokens: 0, cap: 0, mode: 'alert' as const, status: { level: 'ok', blocked: false, message: null } };
	}
}

// The shared budget keys (lattice-db-*) the spend gauge + the architect gate read.
const BUDGET_CAP_KEY = 'lattice-db-budget-cap';
const BUDGET_MODE_KEY = 'lattice-db-budget-mode';
/** Set (or clear with cap ≤ 0) the session budget cap + enforcement mode. */
export function setBudget(cap: number | null, mode: 'alert' | 'stop'): void {
	try {
		if (cap && cap > 0) localStorage.setItem(BUDGET_CAP_KEY, String(cap));
		else localStorage.removeItem(BUDGET_CAP_KEY);
		localStorage.setItem(BUDGET_MODE_KEY, mode === 'stop' ? 'stop' : 'alert');
	} catch {
		/* storage unavailable */
	}
}

export type ArchitectStatus = {
	ready: boolean;
	generation: string;
	modelName: string | null;
	modelId: string | null;
	remaining: number | null;
	usage: number | null;
	limit: number | null;
	// The on-device ladder readiness, so the AI-model tab can reflect each rung.
	promptApi: string;
	webgpu: boolean;
	webllmReady: boolean;
	universalReady: boolean;
	openRouterReady: boolean;
};

const FLOOR_STATUS: ArchitectStatus = {
	ready: false, generation: 'floor', modelName: null, modelId: null, remaining: null, usage: null, limit: null,
	promptApi: 'unknown', webgpu: false, webllmReady: false, universalReady: false, openRouterReady: false,
};

/**
 * Live model status — re-evaluates on connect/disconnect/model-swap/tier-summon
 * (the `db-model-changed` event the adapter fires) and whenever `pulse` changes
 * (the Workspace bumps it on open so the authoritative account spend is fresh).
 */
export function useArchitectStatus(pulse = 0): ArchitectStatus {
	const [state, setState] = React.useState<ArchitectStatus>(FLOOR_STATUS);
	// `pulse` is an intentional dependency: the caller bumps it to force a re-fetch
	// of the live status (incl. the authoritative account spend) on demand.
	// biome-ignore lint/correctness/useExhaustiveDependencies: pulse is the explicit refetch trigger
	React.useEffect(() => {
		let canceled = false;
		const refresh = async () => {
			const m = await architectModel();
			if (!m || canceled) return;
			try {
				await m.refreshAvailability?.();
			} catch {
				/* best-effort */
			}
			// Set the SYNC availability (tier, picker readiness) immediately — it must
			// not wait on the account network call below, or the whole panel sits on the
			// floor placeholder until the fetch resolves.
			const a = m.availability();
			if (canceled) return;
			setState({
				ready: a.generation !== 'floor',
				generation: a.generation,
				modelName: m.openRouterModelName?.() ?? null,
				modelId: m.openRouterModel?.() ?? null,
				remaining: null,
				usage: null,
				limit: null,
				promptApi: a.promptApi,
				webgpu: a.webgpu,
				webllmReady: a.webllmReady,
				universalReady: a.universalReady,
				openRouterReady: a.openRouterReady,
			});
			// Then fold in the authoritative account spend when it arrives (best-effort).
			try {
				const acct = (await m.openRouterAccount()) ?? null;
				if (!canceled && acct) {
					setState((s) => ({ ...s, remaining: acct.remaining ?? null, usage: acct.usage ?? null, limit: acct.limit ?? null }));
				}
			} catch {
				/* account unavailable — the strip just stays hidden */
			}
		};
		refresh();
		const onChange = () => refresh();
		window.addEventListener('db-model-changed', onChange);
		return () => {
			canceled = true;
			window.removeEventListener('db-model-changed', onChange);
		};
	}, [pulse]);
	return state;
}

// ── Model picker + on-device tier bridge (the Workspace AI-model tab) ───────────

/** The OpenRouter catalog (id/name/pricing/ctx/vision), or [] when unavailable. */
export async function listStudioModels(): Promise<ORModel[]> {
	const m = await architectModel();
	if (!m) return [];
	try {
		return await m.listOpenRouterModels();
	} catch {
		return [];
	}
}

/** The currently-selected OpenRouter model id (the connect-time default until set). */
export async function currentStudioModel(): Promise<string | null> {
	const m = await architectModel();
	return m?.openRouterModel?.() ?? null;
}

/** Choose the active OpenRouter model — announces `db-model-changed` for live UI. */
export async function setStudioModel(id: string): Promise<void> {
	const m = await architectModel();
	m?.setOpenRouterModel?.(id);
}

/** Force a generation tier ('floor' | 'prompt-api' | 'webllm' | 'universal' | 'auto'). */
export async function setStudioTier(name: string): Promise<void> {
	const m = await architectModel();
	m?.setTier?.(name);
}

/** Summon WebLLM (~1GB, WebGPU). Resolves true once loaded; never throws to the UI. */
export async function summonWebLLM(onProgress?: (p: TierProgress) => void, signal?: AbortSignal): Promise<boolean> {
	const m = await architectModel();
	if (!m) return false;
	try {
		return await m.summon(onProgress, signal);
	} catch {
		return false;
	}
}

/** Load the universal Transformers.js tier (~350MB WASM, runs everywhere). */
export async function loadUniversalModel(onProgress?: (p: TierProgress) => void, signal?: AbortSignal): Promise<boolean> {
	const m = await architectModel();
	if (!m) return false;
	try {
		return await m.loadUniversal(onProgress, signal);
	} catch {
		return false;
	}
}

/** The authoritative OpenRouter account readout (usage + remaining credit), or null. */
export async function architectAccount(): Promise<ORAccount | null> {
	const m = await architectModel();
	if (!m) return null;
	try {
		return (await m.openRouterAccount()) ?? null;
	} catch {
		return null;
	}
}

/** Start the OpenRouter one-click OAuth (PKCE) — navigates to the auth page. */
export async function connectOpenRouter(): Promise<void> {
	const m = await architectModel();
	if (!m) throw new Error('AI model unavailable in this environment.');
	const callback = location.href.split('?')[0];
	const url = await m.beginOpenRouterAuth(callback);
	if (url) location.href = url;
}

/** On return from OAuth (`?code=`), exchange the code and clean the URL. */
export async function resumePendingAuth(): Promise<boolean> {
	const m = await architectModel();
	if (!m) return false;
	const code = new URLSearchParams(location.search).get('code');
	if (!code || !m.hasPendingOpenRouterAuth()) return false;
	try {
		await m.resumeOpenRouterAuth(code);
	} catch {
		return false;
	}
	history.replaceState(null, '', location.href.split('?')[0]);
	return true;
}

export async function disconnectOpenRouter(): Promise<void> {
	const m = await architectModel();
	m?.disconnectOpenRouter?.();
}
