import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudioShell from './StudioShell';

// A DeckPreview stub that surfaces the theme-wiring props as data-attributes, so a
// test can assert that selecting a saved theme threads it into the live preview
// (and that Fabricate's specimen honours the light/dark mode override).
vi.mock('@/components/DeckPreview', () => ({
	default: ({ 'aria-label': label, paletteOverride, extraTheme, modeOverride }: { 'aria-label'?: string; paletteOverride?: string; extraTheme?: { name: string }; modeOverride?: string }) => (
		<div data-testid="deck-preview" data-label={label} data-palette-override={paletteOverride ?? ''} data-extra-theme={extraTheme?.name ?? ''} data-mode-override={modeOverride ?? ''}>
			{label}
		</div>
	),
}));

// A stateful in-memory stand-in for the shared Workbench library (the real one is
// IndexedDB, absent in jsdom). slugify stays real; save/list/delete mutate a
// hoisted store so the full save → list → select loop runs end-to-end.
const { themeStore } = vi.hoisted(() => ({ themeStore: [] as Array<{ id: string; name: string; label: string; css: string; essentials: Record<string, string> }> }));
vi.mock('./theme-library', async (orig) => {
	const actual = (await orig()) as Record<string, unknown>;
	return {
		...actual,
		saveStudioTheme: vi.fn(async (input: { name: string; label: string; css: string; essentials: Record<string, string> }) => {
			// Mirror the real name resolution (slug the label, else the given name) so
			// the mock's stored name matches production.
			const slug = (actual.slugify as (s: string) => string)(input.label);
			const name = slug || input.name;
			const t = { id: `t_${name}`, name, label: input.label, css: input.css, essentials: input.essentials };
			const i = themeStore.findIndex((x) => x.name === t.name);
			if (i >= 0) themeStore[i] = t;
			else themeStore.unshift(t);
			return t;
		}),
		listStudioThemes: vi.fn(async () => [...themeStore]),
		deleteStudioTheme: vi.fn(async (id: string) => {
			const i = themeStore.findIndex((x) => x.id === id);
			if (i >= 0) themeStore.splice(i, 1);
		}),
	};
});

import { saveStudioTheme } from './theme-library';

const options = { themeBase: '', runtimeUrl: '', engineUrl: '' };

beforeEach(() => {
	themeStore.length = 0;
});
afterEach(() => {
	document.documentElement.removeAttribute('data-palette');
	vi.clearAllMocks();
});

function openFabricate(user: ReturnType<typeof userEvent.setup>) {
	return (async () => {
		await user.click(screen.getByRole('button', { name: 'Workspace launcher' }));
		await user.click(await screen.findByText('Fabricate'));
	})();
}

describe('Studio — Fabricate Theme Studio depth', () => {
	it('edits all ten essentials and auditions the derived theme in light AND dark', async () => {
		const user = userEvent.setup();
		render(<StudioShell options={options} />);
		await openFabricate(user);

		// All ten engine essentials are editable (not just the original four).
		expect(document.querySelectorAll('input[type="color"]').length).toBe(10);

		const specimen = document.querySelector('[data-label="Theme specimen"]') as HTMLElement;
		expect(specimen.getAttribute('data-mode-override')).toBe('light');
		// Flip the specimen to dark — the SAME derived theme, rendered in the other
		// mode (the derivation emits light-dark() pairs; modeOverride resolves them).
		await user.click(screen.getByRole('button', { name: 'Dark specimen' }));
		await waitFor(() => expect(specimen.getAttribute('data-mode-override')).toBe('dark'));
		// It renders against the derived theme, not a built-in palette.
		expect(specimen.getAttribute('data-extra-theme')).toMatch(/^fab-/);
	});

	it('saves a named theme to the library, then lets you pick it for the deck', async () => {
		const user = userEvent.setup();
		render(<StudioShell options={options} />);
		await openFabricate(user);

		// Name it and save → the real save path runs with the full ten-key essential
		// set + a serialized CSS (proof it's the engine derivation, not a stub).
		const nameInput = screen.getByLabelText('Theme name') as HTMLInputElement;
		await user.clear(nameInput);
		await user.type(nameInput, 'Ocean');
		await user.click(screen.getByRole('button', { name: /Save to library/ }));

		await waitFor(() => expect(saveStudioTheme).toHaveBeenCalled());
		const arg = (saveStudioTheme as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0] as { name: string; label: string; essentials: Record<string, string>; css: string };
		expect(arg.label).toBe('Ocean');
		expect(arg.name).toBe('ocean');
		expect(Object.keys(arg.essentials).sort()).toEqual(['accent', 'accentSoft', 'bg', 'bgAlt', 'fail', 'pass', 'textBody', 'textHeading', 'textMuted', 'warn']);
		expect(arg.css.length).toBeGreaterThan(100);
		// The serialized CSS's `@theme <name>` MUST match the record name, or the
		// engine registers it under the css name while the deck renders by record
		// name → a blank, unthemed render. (Regression guard for that exact bug.)
		expect(arg.css).toMatch(/@theme\s+ocean\b/);

		// Back to Compose, open the Inspector — the saved theme is now offered…
		await user.click(screen.getByRole('button', { name: 'Back to Compose' }));
		await user.click(screen.getByRole('button', { name: 'Toggle Deck inspector' }));
		const pick = await screen.findByRole('button', { name: 'Ocean' });
		// …and selecting it threads the saved theme into the live deck preview.
		await user.click(pick);
		const preview = document.querySelector('[data-label="Live deck preview"]') as HTMLElement;
		await waitFor(() => expect(preview.getAttribute('data-extra-theme')).toBe('ocean'));
		expect(preview.getAttribute('data-palette-override')).toBe('ocean');
	});

	it('removes a saved theme and reverts the deck to a built-in palette', async () => {
		const user = userEvent.setup();
		render(<StudioShell options={options} />);
		await openFabricate(user);
		const nameInput = screen.getByLabelText('Theme name') as HTMLInputElement;
		await user.clear(nameInput);
		await user.type(nameInput, 'Ocean');
		await user.click(screen.getByRole('button', { name: /Save to library/ }));
		await waitFor(() => expect(saveStudioTheme).toHaveBeenCalled());

		await user.click(screen.getByRole('button', { name: 'Back to Compose' }));
		await user.click(screen.getByRole('button', { name: 'Toggle Deck inspector' }));
		await user.click(await screen.findByRole('button', { name: 'Ocean' }));
		// Delete it → the picker drops the entry and the deck falls back to indaco.
		await user.click(screen.getByRole('button', { name: 'Delete Ocean' }));
		await waitFor(() => expect(screen.queryByRole('button', { name: 'Ocean' })).toBeNull());
		const preview = document.querySelector('[data-label="Live deck preview"]') as HTMLElement;
		expect(preview.getAttribute('data-extra-theme')).toBe('');
	});
});
