import * as React from 'react';
import { applyEdit, EDIT_PROTOCOL, numberSlides, parseEdits } from '@/playground/architect-edits.js';
import { budgetStatus, readBudgetCap, readBudgetMode, readSpend, recordSpend } from '@/playground/drawing-board-settings.js';

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
type ArchitectModel = {
	complete: (o: { messages: { role: string; content: string }[]; json?: boolean; fallback?: string; onUsage?: (u: Usage) => void }) => Promise<string>;
	availability: () => { generation: string };
	refreshAvailability?: () => Promise<unknown>;
	beginOpenRouterAuth: (cb: string) => Promise<string | null>;
	resumeOpenRouterAuth: (code: string) => Promise<boolean>;
	hasPendingOpenRouterAuth: () => boolean;
	disconnectOpenRouter: () => void;
	openRouterAccount: () => Promise<{ remaining?: number | null; limit?: number | null } | null> | { remaining?: number | null } | null;
	openRouterModelName: () => string | null;
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
	| { status: 'offline' };

/**
 * Run one architect instruction against the deck. Returns the edited source +
 * count when a connected model proposes edits, the model's advice when it only
 * advises, or `offline` when no model is connected (so the UI degrades honestly).
 */
export async function runArchitect(source: string, instruction: string): Promise<ArchitectOutcome> {
	const model = await architectModel();
	if (!model) return { status: 'offline' };
	if (model.availability().generation === 'floor') return { status: 'offline' };
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

/** Real session/all-time spend + the budget gauge, read from the shared store. */
export function architectSpend() {
	try {
		const s = readSpend();
		const cap = readBudgetCap();
		return { ...s, cap, status: budgetStatus({ sessionSpend: s.session, cap, mode: readBudgetMode() }) };
	} catch {
		return { total: 0, session: 0, totalTokens: 0, sessionTokens: 0, cap: 0, status: { level: 'ok', blocked: false, message: null } };
	}
}

export type ArchitectStatus = { ready: boolean; generation: string; modelName: string | null; remaining: number | null };

/** Live model status — re-evaluates on connect/disconnect (`db-model-changed`). */
export function useArchitectStatus(): ArchitectStatus {
	const [state, setState] = React.useState<ArchitectStatus>({ ready: false, generation: 'floor', modelName: null, remaining: null });
	React.useEffect(() => {
		let cancelled = false;
		const refresh = async () => {
			const m = await architectModel();
			if (!m || cancelled) return;
			try {
				await m.refreshAvailability?.();
			} catch {
				/* best-effort */
			}
			const gen = m.availability().generation;
			let remaining: number | null = null;
			try {
				const acct = await m.openRouterAccount();
				remaining = acct?.remaining ?? null;
			} catch {
				remaining = null;
			}
			if (!cancelled) setState({ ready: gen !== 'floor', generation: gen, modelName: m.openRouterModelName?.() ?? null, remaining });
		};
		refresh();
		const onChange = () => refresh();
		window.addEventListener('db-model-changed', onChange);
		return () => {
			cancelled = true;
			window.removeEventListener('db-model-changed', onChange);
		};
	}, []);
	return state;
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
