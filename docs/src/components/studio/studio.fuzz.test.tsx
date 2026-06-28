import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudioShell from './StudioShell';

// Stub the live preview (its engine poller leaks a post-teardown timer in jsdom).
vi.mock('@/components/DeckPreview', () => ({
	default: ({ 'aria-label': label }: { 'aria-label'?: string }) => <div data-testid="deck-preview">{label}</div>,
}));

const options = { themeBase: '', runtimeUrl: '', engineUrl: '' };

afterEach(() => {
	cleanup();
	document.documentElement.removeAttribute('data-palette');
});

// ── The anti-jank invariant ──────────────────────────────────────────────────
// After ANY sequence of interactions the Studio must hold together: it never
// crashes (the shell root stays mounted), and whenever the preview counter is
// showing, it is well-formed (1 ≤ active ≤ total) and the navigator rail has
// exactly `total` chips. This catches off-by-one drift, NaN counters, and
// rail/preview desync — the classic "janky" failures — across random journeys.
function expectNoJank() {
	// Shell root is always present — no unmount / error boundary.
	expect(document.querySelector('.lx-ui')).toBeTruthy();
	const m = document.body.textContent?.match(/Slide (\d+) \/ (\d+)/);
	if (m) {
		const active = Number(m[1]);
		const total = Number(m[2]);
		expect(total).toBeGreaterThanOrEqual(1);
		expect(active).toBeGreaterThanOrEqual(1);
		expect(active).toBeLessThanOrEqual(total);
		const rail = document.querySelector('nav[aria-label="Slide navigator"]');
		if (rail) expect(rail.querySelectorAll('button').length).toBe(total);
	}
}

type Ctx = { user: ReturnType<typeof userEvent.setup> };

const cmd = (label: string, act: (u: Ctx['user']) => Promise<void>): fc.AsyncCommand<unknown, Ctx> => ({
	check: () => true,
	async run(_m, real) {
		await act(real.user);
		await waitFor(() => expectNoJank());
	},
	toString: () => label,
});

const clickLabel = (u: Ctx['user'], name: string) => u.click(screen.getByRole('button', { name }));
async function openClose(u: Ctx['user'], open: () => Promise<void>) {
	await open();
	await u.keyboard('{Escape}');
}
async function railNth(u: Ctx['user'], which: 'first' | 'last') {
	const rail = document.querySelector('nav[aria-label="Slide navigator"]');
	if (!rail) return;
	const chips = rail.querySelectorAll('button');
	const target = which === 'first' ? chips[0] : chips[chips.length - 1];
	if (target) await u.click(target as HTMLElement);
}

const commands = [
	fc.constant(cmd('toggle Architect', (u) => clickLabel(u, 'Toggle Architect'))),
	fc.constant(cmd('toggle Inspector', (u) => clickLabel(u, 'Toggle Deck inspector'))),
	fc.constant(cmd('rail → first', (u) => railNth(u, 'first'))),
	fc.constant(cmd('rail → last', (u) => railNth(u, 'last'))),
	fc.constant(cmd('Share open/close', (u) => openClose(u, () => clickLabel(u, 'Share')))),
	fc.constant(cmd('Workspace open/close', (u) => openClose(u, () => clickLabel(u, 'Workspace settings')))),
	fc.constant(cmd('Present open/close', (u) => openClose(u, () => clickLabel(u, 'Present')))),
	fc.constant(cmd('⌘K open/close', (u) => openClose(u, () => u.keyboard('{Meta>}k{/Meta}')))),
	fc.constant(
		cmd('switch deck', async (u) => {
			await u.click(screen.getByRole('button', { name: /(Q3 Board Review|FY26 Product Strategy)/ }));
			const items = await screen.findAllByRole('menuitem', { name: /(Q3 Board Review|FY26 Product Strategy)/ });
			await u.click(items[items.length - 1]); // the deck that isn't loaded first
		}),
	),
];

describe('StudioShell — fuzz: no jank across random journeys', () => {
	it('never crashes and keeps the counter ↔ rail consistent for any action sequence', async () => {
		await fc.assert(
			fc.asyncProperty(fc.commands(commands, { maxCommands: 12 }), async (cmds) => {
				const user = userEvent.setup();
				render(<StudioShell options={options} />);
				try {
					await fc.asyncModelRun(() => ({ model: {}, real: { user } }), cmds);
				} finally {
					cleanup();
					document.documentElement.removeAttribute('data-palette');
				}
			}),
			{ numRuns: 15, endOnFailure: true },
		);
	}, 60_000);
});

// A second, content-level fuzz: arbitrary edits to the deck source must never
// break the derived views (split / rail / counter math) that the UI renders from.
describe('StudioShell — fuzz: arbitrary source never desyncs the derived views', () => {
	it('keeps rail count == counter total for random editor input', async () => {
		const user = userEvent.setup();
		render(<StudioShell options={options} />);
		const editor = screen.getByLabelText('Deck source');
		await fc.assert(
			fc.asyncProperty(fc.string({ maxLength: 40 }), async (chunk) => {
				await user.click(editor);
				await user.paste(`\n\n---\n\n${chunk}`);
				await waitFor(() => expectNoJank());
			}),
			{ numRuns: 12, endOnFailure: true },
		);
	}, 60_000);
});
