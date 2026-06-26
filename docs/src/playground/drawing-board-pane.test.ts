import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPaneTabs, DB_PANE_KEY, isPane } from './drawing-board-pane.js';

// The Drawing Board's mobile pane state machine. The bug class we guard against
// is divergence: a pane change that updates SOME of the four surfaces (the
// body[data-pane] attribute, each tab's aria-selected flag, the persisted pane,
// and the preview render) but not all — exactly the Playground bug, in the
// vanilla controller. createPaneTabs is the single source of truth; these tests
// pin its contract and then FUZZ random user/onboarding journeys, asserting the
// surfaces never drift apart.

const PANES = ['architect', 'editor', 'preview'] as const;
type Pane = (typeof PANES)[number];

/** A detached harness: three tab buttons + an isolated body + a fake store. */
function harness() {
	const body = document.createElement('div');
	const store = new Map<string, string>();
	const storage = { setItem: (k: string, v: string) => store.set(k, v) };
	const render = vi.fn();
	const tabs = PANES.map((p) => {
		const b = document.createElement('button');
		b.className = 'db-mobile-tab';
		b.setAttribute('data-pane', p);
		return b;
	});
	const { setPane } = createPaneTabs({ tabs, render, body, storage });
	return { body, store, render, tabs, setPane };
}

type H = ReturnType<typeof harness>;

/** Which tab the control SAYS is active (exactly one must be aria-selected). */
function selectedTab(h: H): string | null {
	const on = h.tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
	expect(on.length, `exactly one tab selected, got ${on.length}`).toBe(1);
	return on[0].getAttribute('data-pane');
}

/** The core invariant — every surface agrees on one valid pane. */
function expectCoherent(h: H) {
	const shown = h.body.getAttribute('data-pane'); // what the layout shows
	expect(shown && isPane(shown), `body shows a valid pane (got "${shown}")`).toBe(true);
	expect(selectedTab(h), 'the lit tab matches the shown pane').toBe(shown);
	expect(h.store.get(DB_PANE_KEY), 'the persisted pane matches the shown pane').toBe(shown);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('createPaneTabs — contract', () => {
	it('a tab click drives every surface to that pane', () => {
		const h = harness();
		h.tabs[2].dispatchEvent(new MouseEvent('click', { bubbles: true })); // preview
		expect(h.body.getAttribute('data-pane')).toBe('preview');
		expectCoherent(h);
	});

	it('only the Preview pane triggers a render (Edit/Architect do not)', () => {
		const h = harness();
		h.setPane('editor');
		h.setPane('architect');
		expect(h.render).not.toHaveBeenCalled();
		h.setPane('preview');
		expect(h.render).toHaveBeenCalledTimes(1);
	});

	it('an unknown / retired pane lands on Edit, still coherent', () => {
		const h = harness();
		h.setPane('preview');
		const landed = h.setPane('decks'); // a retired pane name
		expect(landed).toBe('editor');
		expect(h.body.getAttribute('data-pane')).toBe('editor');
		expectCoherent(h);
	});

	it('persists under the key the controller restores from', () => {
		const h = harness();
		h.setPane('architect');
		expect(h.store.get(DB_PANE_KEY)).toBe('architect');
	});

	it('survives a throwing storage (private mode) without desyncing the DOM', () => {
		const body = document.createElement('div');
		const tabs = PANES.map((p) => {
			const b = document.createElement('button');
			b.setAttribute('data-pane', p);
			return b;
		});
		const storage = {
			setItem: () => {
				throw new Error('QuotaExceeded');
			},
		};
		const { setPane } = createPaneTabs({ tabs, render: vi.fn(), body, storage });
		expect(() => setPane('preview')).not.toThrow();
		expect(body.getAttribute('data-pane')).toBe('preview');
		expect(tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.getAttribute('data-pane')).toBe('preview');
	});
});

// ── Fuzz: random pane journeys must never desync the surfaces ────────────────
// Property-based, model-based (fast-check `fc.commands`). Commands are the real
// ways the pane changes: a tab CLICK (user) and a programmatic setPane
// (onboarding / restore / deck load), including invalid pane names. fast-check
// generates random sequences and shrinks any failure to a minimal reproducer.
type Model = { pane: Pane };

function clickCommand(pane: Pane): fc.Command<Model, H> {
	return {
		check: () => true,
		run(model, real) {
			real.tabs.find((t) => t.getAttribute('data-pane') === pane)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			model.pane = pane;
			expectCoherent(real);
			expect(real.body.getAttribute('data-pane')).toBe(model.pane);
		},
		toString: () => `click:${pane}`,
	};
}

function setPaneCommand(arg: string, expected: Pane): fc.Command<Model, H> {
	return {
		check: () => true,
		run(model, real) {
			real.setPane(arg);
			model.pane = expected; // an unknown pane resolves to 'editor'
			expectCoherent(real);
			expect(real.body.getAttribute('data-pane')).toBe(model.pane);
		},
		toString: () => `setPane:${arg}`,
	};
}

describe('createPaneTabs — fuzz: the pane surfaces never desync', () => {
	it('stays coherent for any sequence of clicks and programmatic switches', () => {
		const commands = [
			...PANES.map((p) => fc.constant(clickCommand(p))),
			...PANES.map((p) => fc.constant(setPaneCommand(p, p))),
			// Invalid / retired pane names must resolve to 'editor' and stay coherent.
			fc.constant(setPaneCommand('decks', 'editor')),
			fc.constant(setPaneCommand('', 'editor')),
			fc.constant(setPaneCommand('PREVIEW', 'editor')),
		];
		fc.assert(
			fc.property(fc.commands(commands, { maxCommands: 30 }), (cmds) => {
				const real = harness();
				// Seed: nothing has set a pane yet, so the model starts wherever the
				// first command lands. We assert only AFTER the first command, so the
				// pre-any-pane state (no attribute) is never checked.
				fc.modelRun(() => ({ model: { pane: 'editor' as Pane }, real }), cmds);
			}),
			{ numRuns: 200 },
		);
	});
});
