import * as React from 'react';
import { applyEdit, diffLines, EDIT_PROTOCOL, numberSlides, parseEdits } from '@/playground/architect-edits.js';
import { requestSlideFix } from '@/playground/architect-fix.js';
import { buildRefinePrompt, cleanRewrite, REFINE_ACTIONS } from '@/playground/drawing-board-refine.js';
import { budgetStatus, readBudgetCap, readBudgetFloor, readBudgetMode, readSpend, recordSpend } from '@/playground/drawing-board-settings.js';
// Theme Studio kernel (lib/theme/*, bundled): the model PROPOSES an essential set
// + a ramp strategy via askMessages; deriveTheme fans it into the full ~80-token
// contract (AA-repaired both modes); auditBoth confirms. The model never authors
// the derived tokens — so the delivered palette is always AA-clean.
import { askMessages, auditBoth, coerceEssentials, deriveTheme, STARTERS } from '@/playground/theme-core.generated.js';

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

/** This key's readout from /auth/key — usage + (optional) per-key spend limit. */
export type ORAccount = {
	usage?: number | null;
	limit?: number | null;
	remaining?: number | null;
	usageMonthly?: number | null;
	limitReset?: string | null;
	isFreeTier?: boolean | null;
};

/** The account WALLET from /credits — real money: credits purchased, used, balance. */
export type ORCredits = { credits: number; usage: number; balance: number };

/** A per-million price pair for the active model (for the pre-send estimate). */
export type ORPrice = { promptPerM: number | null; completionPerM: number | null };

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
	complete: (o: { messages: { role: string; content: string }[]; json?: boolean; fallback?: string; onUsage?: (u: Usage) => void; maxTokens?: number }) => Promise<string>;
	availability: () => ModelAvailability;
	refreshAvailability?: () => Promise<unknown>;
	beginOpenRouterAuth: (cb: string) => Promise<string | null>;
	resumeOpenRouterAuth: (code: string) => Promise<boolean>;
	hasPendingOpenRouterAuth: () => boolean;
	disconnectOpenRouter: () => void;
	openRouterAccount: () => Promise<ORAccount | null> | ORAccount | null;
	openRouterCredits: () => Promise<ORCredits | null> | ORCredits | null;
	openRouterKeySettingsUrl: () => string;
	openRouterModelPrice: () => ORPrice | null;
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
			// explicitTierWins: a deliberate on-device pick outranks the connected cloud
			// (Studio Policy B — connection ≠ active; one tap resumes the cloud).
			// defaultModel: a cheap, capable Haiku for iteration — the user upgrades to a
			// stronger (pricier) model deliberately. defaultMaxTokens: a 4096-token output
			// ceiling so a runaway reply can't blow the budget. Both Studio-scoped (the
			// Drawing Board keeps its own default + stays uncapped), so no shared blast radius.
			.then((m) => m.createArchitectModel({ getSettings: () => ({}), explicitTierWins: true, defaultModel: 'anthropic/claude-haiku-4.5', defaultMaxTokens: 4096 }) as ArchitectModel)
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
	// Respect the budget on the paid cloud tier — blocks when over, and (hard-stop mode)
	// refuses a call whose estimate would breach the cap. Local tiers are free.
	if (generation === 'openrouter') {
		const blk = cloudBudgetBlock(model, `${instruction}\n${source}`);
		if (blk) return { status: 'blocked', note: blk };
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
	if (generation === 'openrouter') {
		const blk = cloudBudgetBlock(model, text);
		if (blk) return { status: 'blocked', note: blk };
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

// ── Theme Studio: "Describe a look" ────────────────────────────────────────
// The shape auditBoth returns (lib/theme/contrast.js): an overall verdict plus a
// per-canvas breakdown the inspector renders.
export type ThemeAudit = {
	ok: boolean;
	light: { ok: boolean; failures: unknown[]; missing: unknown[] };
	dark: { ok: boolean; failures: unknown[]; missing: unknown[] };
};

export type ThemeEssentials = Record<string, string>;

export type ThemeGenOutcome =
	| {
			status: 'ok';
			essentials: ThemeEssentials;
			rampStrategy: string;
			tokens: Record<string, string>;
			audit: ThemeAudit;
			applied: string[];
	  }
	| { status: 'offline' }
	| { status: 'blocked'; note: string }
	| { status: 'nochange'; note: string };

/**
 * Generate (or refine) a full theme from a "describe a look" prompt. The model
 * PROPOSES the 10 essentials + a ramp strategy; the deterministic kernel derives
 * the full ~80-token contract and AA-repairs it in both canvas modes — so the
 * returned palette is finished and accessible, never a draft the user must fix.
 * `current` is threaded as context so a relative tweak ("cooler", "more navy")
 * has a baseline. Honest like the deck bridges: `offline` with no model,
 * `blocked` at the budget cap, `nochange` for an empty prompt or an unusable
 * reply — never a fabricated palette. The model never authors the derived tokens,
 * so a connected model that returns nonsense degrades to the fallback essentials,
 * still AA-clean.
 */
export async function generateTheme(current: ThemeEssentials, prompt: string): Promise<ThemeGenOutcome> {
	if (!prompt.trim()) return { status: 'nochange', note: 'Describe a look to generate a theme.' };
	const model = await architectModel();
	if (!model) return { status: 'offline' };
	const generation = model.availability().generation;
	if (generation === 'floor') return { status: 'offline' };
	if (generation === 'openrouter') {
		const blk = cloudBudgetBlock(model, prompt);
		if (blk) return { status: 'blocked', note: blk };
	}
	const fallback: ThemeEssentials = current && Object.keys(current).length ? current : (STARTERS[0].essentials as ThemeEssentials);
	let reply = '';
	try {
		reply = await model.complete({
			messages: askMessages(fallback, prompt),
			fallback: '',
			onUsage: (u) => recordSpend(u?.cost ?? 0, u?.total_tokens ?? (u?.prompt_tokens || 0) + (u?.completion_tokens || 0)),
		});
	} catch {
		return { status: 'offline' };
	}
	const { essentials, rampStrategy, applied, ok } = coerceEssentials(reply, fallback);
	// A connected model that proposed nothing usable (e.g. the json:true floor
	// echoing the fallback) → no-op, never a fabricated change.
	if (!ok && applied.length === 0) return { status: 'nochange', note: 'The model returned no usable palette.' };
	const tokens = deriveTheme(essentials, { rampStrategy }) as Record<string, string>;
	const audit = auditBoth(tokens) as ThemeAudit;
	return { status: 'ok', essentials, rampStrategy, tokens, audit, applied };
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
	if (generation === 'openrouter') {
		const blk = cloudBudgetBlock(model, source);
		if (blk) return { status: 'blocked', note: blk };
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
	const last = history[history.length - 1];
	if (generation === 'openrouter') {
		const blk = cloudBudgetBlock(model, `${last?.content ?? ''}\n${source}`);
		if (blk) return { status: 'blocked', reply: blk };
	}
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

// The latest fetched spend context (wallet + key acct), cached from useArchitectStatus
// so the SYNC architectSpend()/gate can watch the REAL balance, not just the self-cap.
let _wallet: ORCredits | null = null;
let _keyAcct: ORAccount | null = null;
function rememberSpendContext(wallet: ORCredits | null, keyAcct: ORAccount | null): void {
	_wallet = wallet;
	_keyAcct = keyAcct;
}

// The binding remaining-balance the gauge should watch: the tightest of the account
// wallet balance and (if set) this key's remaining limit. null when neither is known.
function bindingAccount(): { remaining: number; limit: number | null } | null {
	const c: { remaining: number; limit: number | null }[] = [];
	if (_wallet && Number.isFinite(_wallet.balance)) c.push({ remaining: _wallet.balance, limit: _wallet.credits ?? null });
	if (_keyAcct && _keyAcct.remaining != null) c.push({ remaining: _keyAcct.remaining, limit: _keyAcct.limit ?? null });
	return c.length ? c.reduce((a, b) => (b.remaining < a.remaining ? b : a)) : null;
}

/** Real session spend + the budget gauge — now watching the binding real balance, not just the self-cap. */
export function architectSpend() {
	try {
		const s = readSpend();
		const cap = readBudgetCap();
		const mode = readBudgetMode();
		const floor = readBudgetFloor();
		const account = bindingAccount();
		return { ...s, cap, mode, floor, wallet: _wallet, account, status: budgetStatus({ sessionSpend: s.session, cap, mode, account, floor }) };
	} catch {
		return { total: 0, session: 0, totalTokens: 0, sessionTokens: 0, cap: 0, mode: 'alert' as const, floor: 0, wallet: null, account: null, status: { level: 'ok', blocked: false, message: null } };
	}
}

/** The account wallet (credits / usage / balance), fetched live. */
export async function architectCredits(): Promise<ORCredits | null> {
	const m = await architectModel();
	if (!m) return null;
	try {
		return (await m.openRouterCredits()) ?? null;
	} catch {
		return null;
	}
}

// A cheap token estimate: ~4 chars/token. Enough for a pre-send "≈ $X".
const estTokens = (text: string) => Math.ceil((text || '').length / 4);

/** Estimate a cloud call's USD cost: prompt tokens × in-price + an output ceiling × out-price. */
export function estimateUsd(promptText: string, price: ORPrice | null, maxOut = 4096): number | null {
	if (!price || price.promptPerM == null || price.completionPerM == null) return null;
	return (estTokens(promptText) / 1e6) * price.promptPerM + (maxOut / 1e6) * price.completionPerM;
}

// The cloud budget gate, shared by every architect action: blocks when already over
// the cap/balance, AND — in hard-stop mode — refuses a call whose ESTIMATE would
// breach the self-cap, so a single large request can't overshoot. Returns a note, or null.
function cloudBudgetBlock(model: ArchitectModel, promptText: string): string | null {
	const s = architectSpend();
	if (s.status.blocked) return 'Budget cap reached — raise it in Workspace → Spend, or switch tier.';
	if (s.mode === 'stop' && s.cap > 0) {
		const est = estimateUsd(promptText, model.openRouterModelPrice?.() ?? null);
		if (est != null && s.session + est > s.cap) {
			return `Estimated ~$${est.toFixed(2)} — that would exceed your $${s.cap.toFixed(2)} cap. Raise it in Workspace → Spend, pick a cheaper model, or switch to On-device (free).`;
		}
	}
	return null;
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
	// This key (/auth/key): usage + optional per-key limit + monthly breakdown.
	remaining: number | null;
	usage: number | null;
	limit: number | null;
	usageMonthly: number | null;
	limitReset: string | null;
	// The account WALLET (/credits): the real money. null when unavailable.
	wallet: ORCredits | null;
	// The active model's per-million price (for the estimate + display); null pre-catalog.
	price: ORPrice | null;
	// Where the user sets a hard server-enforced per-key cap (we deep-link to it).
	keySettingsUrl: string | null;
	// The on-device ladder readiness, so the AI-model tab can reflect each rung.
	promptApi: string;
	webgpu: boolean;
	webllmReady: boolean;
	universalReady: boolean;
	openRouterReady: boolean;
};

const FLOOR_STATUS: ArchitectStatus = {
	ready: false, generation: 'floor', modelName: null, modelId: null, remaining: null, usage: null, limit: null,
	usageMonthly: null, limitReset: null, wallet: null, price: null, keySettingsUrl: null,
	promptApi: 'unknown', webgpu: false, webllmReady: false, universalReady: false, openRouterReady: false,
};

// The universal Transformers.js backend reports its active name as 'transformers'
// (architect-model.js), but the Studio's tier vocabulary — tierPref, setStudioTier,
// the UI's ON_DEVICE_TIERS / "active" checks — is 'universal'. Normalize at this
// boundary so the active-tier badge + helper reflect the truth. The kernel name is
// left as-is because the Drawing Board keys off `generation === 'transformers'`.
export function normalizeGeneration(generation: string): string {
	return generation === 'transformers' ? 'universal' : generation;
}

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
			const generation = normalizeGeneration(a.generation);
			setState({
				ready: generation !== 'floor',
				generation,
				modelName: m.openRouterModelName?.() ?? null,
				modelId: m.openRouterModel?.() ?? null,
				remaining: null,
				usage: null,
				limit: null,
				usageMonthly: null,
				limitReset: null,
				wallet: null,
				price: m.openRouterModelPrice?.() ?? null,
				keySettingsUrl: m.openRouterKeySettingsUrl?.() ?? null,
				promptApi: a.promptApi,
				webgpu: a.webgpu,
				webllmReady: a.webllmReady,
				universalReady: a.universalReady,
				openRouterReady: a.openRouterReady,
			});
			// Then fold in the authoritative spend when it arrives (best-effort): the
			// per-key figures (/auth/key) and the account WALLET (/credits) in parallel.
			try {
				const [acct, wallet] = await Promise.all([
					Promise.resolve(m.openRouterAccount()).catch(() => null),
					Promise.resolve(m.openRouterCredits()).catch(() => null),
				]);
				rememberSpendContext(wallet ?? null, acct ?? null); // feed the sync gauge
				if (!canceled && (acct || wallet)) {
					setState((s) => ({
						...s,
						remaining: acct?.remaining ?? null,
						usage: acct?.usage ?? null,
						limit: acct?.limit ?? null,
						usageMonthly: acct?.usageMonthly ?? null,
						limitReset: acct?.limitReset ?? null,
						wallet: wallet ?? null,
						price: m.openRouterModelPrice?.() ?? s.price,
					}));
				}
			} catch {
				/* spend unavailable — the panel falls back gracefully */
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
