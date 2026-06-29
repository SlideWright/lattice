import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceSheet } from './WorkspaceSheet';

// G6 — the Workspace AI-model + Spend tabs against a CONNECTED (mocked) OpenRouter
// account. No live model is ever touched: listStudioModels/setStudioModel and the
// account figures are all mock spies (the Architect-test pattern — CI spends $0).

const CATALOG = [
	{ id: 'anthropic/claude-sonnet-4', name: 'Anthropic: Claude Sonnet 4', promptPerM: 3, completionPerM: 15, contextLength: 1_000_000, maxOutput: null, vision: true },
	{ id: 'anthropic/claude-3.5-haiku', name: 'Anthropic: Claude 3.5 Haiku', promptPerM: 0.8, completionPerM: 4, contextLength: 200_000, maxOutput: null, vision: false },
	{ id: 'deepseek/deepseek-r1', name: 'DeepSeek: R1', promptPerM: 0.7, completionPerM: 2.5, contextLength: 164_000, maxOutput: null, vision: false },
	{ id: 'google/gemma-free', name: 'Google: Gemma (free)', promptPerM: 0, completionPerM: 0, contextLength: 262_000, maxOutput: null, vision: true },
];

const connectedStatus = {
	ready: true,
	generation: 'openrouter',
	modelName: 'Claude Sonnet 4',
	modelId: 'anthropic/claude-sonnet-4',
	remaining: 3.5,
	usage: 0.5,
	limit: 4,
	promptApi: 'unavailable',
	webgpu: false,
	webllmReady: false,
	universalReady: false,
	openRouterReady: true,
};

const setModelSpy = vi.hoisted(() => vi.fn(async () => {}));
const setTierSpy = vi.hoisted(() => vi.fn(async () => {}));
const loadUniversalSpy = vi.hoisted(() => vi.fn(async () => true));
const statusSpy = vi.hoisted(() => vi.fn(() => connectedStatus));
const spendSpy = vi.hoisted(() => vi.fn(() => ({ total: 0, session: 0.032, totalTokens: 0, sessionTokens: 9800, cap: 0, mode: 'alert', status: { level: 'ok', blocked: false, message: null } })));

vi.mock('./architect', () => ({
	useArchitectStatus: statusSpy,
	architectSpend: spendSpy,
	connectOpenRouter: vi.fn(),
	disconnectOpenRouter: vi.fn(),
	setBudget: vi.fn(),
	listStudioModels: vi.fn(async () => CATALOG),
	currentStudioModel: vi.fn(async () => 'anthropic/claude-sonnet-4'),
	setStudioModel: setModelSpy,
	setStudioTier: setTierSpy,
	summonWebLLM: vi.fn(async () => false),
	loadUniversalModel: loadUniversalSpy,
	architectAccount: vi.fn(async () => ({ usage: 0.5, limit: 4, remaining: 3.5 })),
}));

const noop = () => {};

afterEach(() => {
	vi.clearAllMocks();
	statusSpy.mockReturnValue(connectedStatus);
});

function openSheet() {
	const user = userEvent.setup();
	render(<WorkspaceSheet open onOpenChange={noop} notify={noop} />);
	const sheet = within(screen.getByRole('dialog', { name: /Workspace/ }));
	return { user, sheet };
}

describe('WorkspaceSheet — G6 model picker', () => {
	it('shows the curated picker with the connected model summary', async () => {
		const { sheet } = openSheet();
		expect(await sheet.findByText('OpenRouter model')).toBeInTheDocument();
		// The picker summary (a button) reads the active model + its meta line once
		// the catalog loads — distinct from the active-tier card above it.
		const summary = await sheet.findByRole('button', { name: /Claude Sonnet 4/ });
		expect(summary).toHaveTextContent('1M ctx · $3.00/M in · $15.00/M out');
	});

	it('expands to search + the four lenses and vendor-grouped rows', async () => {
		const { user, sheet } = openSheet();
		await user.click(await sheet.findByRole('button', { name: /Claude Sonnet 4/ }));
		expect(await sheet.findByPlaceholderText(/Search 500\+ models/)).toBeInTheDocument();
		for (const lens of ['Featured', 'Value', 'Free', 'All']) {
			expect(sheet.getByRole('tab', { name: lens })).toBeInTheDocument();
		}
		// Featured → the Anthropic group header; DeepSeek (a Value pick) is filtered out.
		expect(sheet.getByText('anthropic')).toBeInTheDocument();
		expect(sheet.queryByText('R1')).not.toBeInTheDocument();
		// All → the full catalog, incl. the DeepSeek group + the Haiku row.
		await user.click(sheet.getByRole('tab', { name: 'All' }));
		expect(await sheet.findByText('deepseek')).toBeInTheDocument();
		expect(sheet.getByText('Claude 3.5 Haiku')).toBeInTheDocument();
	});

	it('Free lens shows only the $0 model; Value shows DeepSeek', async () => {
		const { user, sheet } = openSheet();
		await user.click(await sheet.findByRole('button', { name: /Claude Sonnet 4/ }));
		await user.click(sheet.getByRole('tab', { name: 'Free' }));
		expect(await sheet.findByText('Gemma (free)')).toBeInTheDocument();
		expect(sheet.queryByText('R1')).not.toBeInTheDocument();
		await user.click(sheet.getByRole('tab', { name: 'Value' }));
		expect(await sheet.findByText('R1')).toBeInTheDocument();
	});

	it('selecting a model calls setStudioModel with its id', async () => {
		const { user, sheet } = openSheet();
		await user.click(await sheet.findByRole('button', { name: /Claude Sonnet 4/ }));
		await user.click(sheet.getByRole('tab', { name: 'Value' }));
		await user.click(await sheet.findByText('R1'));
		expect(setModelSpy).toHaveBeenCalledWith('deepseek/deepseek-r1');
	});
});

describe('WorkspaceSheet — G6 on-device tier', () => {
	it('switches to the on-device ladder; loading the universal tier confirms then activates it', async () => {
		const { user, sheet } = openSheet();
		await user.click(sheet.getByRole('tab', { name: 'On-device' }));
		expect(await sheet.findByText('Browser built-in')).toBeInTheDocument();
		expect(sheet.getByText('WebLLM')).toBeInTheDocument();
		expect(sheet.getByText(/Universal/)).toBeInTheDocument();
		// The cloud stays connected-but-dormant while the on-device pane is shown.
		expect(sheet.getByText(/connected, dormant/)).toBeInTheDocument();
		// A large download asks to confirm first (no silent ~350MB fetch), then loads
		// AND activates the tier (Policy B — a pick truly switches the active tier).
		await user.click(sheet.getByRole('button', { name: /Get ~350MB/ }));
		await user.click(await sheet.findByRole('button', { name: /Download ~350MB/ }));
		expect(loadUniversalSpy).toHaveBeenCalled();
		expect(setTierSpy).toHaveBeenCalledWith('universal');
	});

	it('the On-device button does not silently switch; "Use Cloud" resumes the cloud tier', async () => {
		const { user, sheet } = openSheet();
		await user.click(sheet.getByRole('tab', { name: 'On-device' }));
		await user.click(await sheet.findByRole('button', { name: 'Use Cloud' }));
		expect(setTierSpy).toHaveBeenCalledWith('auto');
	});

	it('when an on-device tier is the ACTIVE generation, the badge + helper reflect it (not a "loaded" flag)', () => {
		// generation is the normalized Studio value ('universal'); useArchitectStatus
		// maps the backend's 'transformers' name to this before the UI ever sees it.
		statusSpy.mockReturnValue({ ...connectedStatus, generation: 'universal', universalReady: true });
		const { sheet } = openSheet();
		// The active-tier helper agrees with the real active tier.
		expect(sheet.getByText(/On-device is active/)).toBeInTheDocument();
		// The Universal rung shows the live "active" badge + its running subtext.
		expect(sheet.getByText('active')).toBeInTheDocument();
		expect(sheet.getByText('Running on this device')).toBeInTheDocument();
	});
});

describe('WorkspaceSheet — G6 authoritative spend', () => {
	it('shows the real account total + live session tally, no fake all-time', async () => {
		const { user, sheet } = openSheet();
		await user.click(sheet.getByRole('tab', { name: 'Spend' }));
		// Authoritative account line from openRouterAccount(): $3.50 left · $0.500
		// used (sub-dollar amounts render at 3dp).
		expect(await sheet.findByText(/OpenRouter: \$3\.50 left · \$0\.500 used/)).toBeInTheDocument();
		// The honest live session tally (with tokens), not a $0 local all-time.
		const session = sheet.getByText(/This session:/);
		expect(session).toHaveTextContent('$0.032');
		expect(session).toHaveTextContent('9.8K tokens');
	});
});
