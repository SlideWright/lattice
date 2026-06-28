import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudioShell from './StudioShell';

// The live preview loads the real engine by polling `window.LatticePlayground`
// on a timer that never resolves in jsdom and leaks past teardown. These tests
// assert shell behavior (text, labels, navigation), not the rendered slide, so
// stub DeckPreview to a static element — also covers its use in Present/Fabricate.
vi.mock('@/components/DeckPreview', () => ({
	default: ({ 'aria-label': label }: { 'aria-label'?: string }) => <div data-testid="deck-preview">{label}</div>,
}));

// The Share exporters drive the engine render + heavy lazy chunks (jspdf, jszip,
// pptxgenjs) — out of scope for a jsdom shell test. Mock them so we assert the
// WIRING (the right export runs on the right click) without booting the engine.
const shareSpies = vi.hoisted(() => ({
	shareMarkdown: vi.fn(async () => {}),
	shareMarp: vi.fn(async () => {}),
	sharePdf: vi.fn(async () => {}),
	sharePptx: vi.fn(async () => {}),
	sharePrintDeck: vi.fn(async () => {}),
	sharePrintSource: vi.fn(() => {}),
}));
vi.mock('./share-export', () => shareSpies);

const options = { themeBase: '', runtimeUrl: '', engineUrl: '' };

const realMatchMedia = window.matchMedia;
// Force the responsive hook down a given branch: mobile matches both queries,
// tablet only the 1099 query, desktop neither (the hook checks 699 then 1099).
function setViewport(bp: 'desktop' | 'tablet' | 'mobile') {
	window.matchMedia = ((q: string) =>
		({
			matches: bp === 'mobile' ? /699|1099/.test(q) : bp === 'tablet' ? /1099/.test(q) : false,
			media: q,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		})) as typeof window.matchMedia;
}

afterEach(() => {
	document.documentElement.removeAttribute('data-palette');
	window.matchMedia = realMatchMedia;
});

function setup() {
	const user = userEvent.setup();
	render(<StudioShell options={options} />);
	return user;
}

describe('StudioShell — smoke', () => {
	it('renders the lean bar, the active deck, and the three Compose panes', () => {
		setup();
		expect(screen.getByText('Lattice')).toBeInTheDocument();
		expect(screen.getByText('Q3 Board Review')).toBeInTheDocument();
		expect(screen.getByText('Architect')).toBeInTheDocument();
		expect(screen.getByText('Board-ready')).toBeInTheDocument();
		expect(screen.getByText('Edit')).toBeInTheDocument();
		expect(screen.getByText('Preview')).toBeInTheDocument();
		// Present is a verb (button), not a persistent tab.
		expect(screen.getByRole('button', { name: 'Present' })).toBeInTheDocument();
	});
});

describe('StudioShell — e2e flows (jsdom)', () => {
	it('opens and closes Present (the verb)', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Present' }));
		expect(await screen.findByText('Presenter screen')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Exit present' }));
		expect(screen.queryByText('Presenter screen')).not.toBeInTheDocument();
	});

	it('Present navigates the deck and reshapes by reader lens', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Present' }));
		const dialog = await screen.findByRole('dialog', { name: 'Present' });
		const d = within(dialog);
		// Full deck, started on slide 1 of 6.
		expect(d.getByText('1 / 6')).toBeInTheDocument();
		await user.click(d.getAllByRole('button', { name: 'Next slide' })[0]);
		expect(d.getByText('2 / 6')).toBeInTheDocument();
		// Exec-summary lens reshapes to the headline slides (title/kpi/stats/closing).
		await user.click(d.getByRole('button', { name: /Exec summary/ }));
		expect(d.getByText('1 / 4')).toBeInTheDocument();
		// One-pager collapses to a single slide.
		await user.click(d.getByRole('button', { name: /One-pager/ }));
		expect(d.getByText('1 / 1')).toBeInTheDocument();
	});

	it('opens the deck-scoped Share with both hand-off intents', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Share' }));
		expect(await screen.findByText('Hand off the deck')).toBeInTheDocument();
		expect(screen.getByText('Hand off the source')).toBeInTheDocument();
		expect(screen.getByText('Print deck')).toBeInTheDocument();
		expect(screen.getByText('Print source')).toBeInTheDocument();
	});

	it('Share runs the REAL export pipeline for every format', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Share' }));
		const sheet = within(await screen.findByRole('dialog', { name: /Share/ }));
		// Markdown → the real source handoff, confirmed with a success toast.
		await user.click(sheet.getByText('Markdown'));
		expect(shareSpies.shareMarkdown).toHaveBeenCalled();
		expect(await screen.findByText(/Markdown ready/)).toBeInTheDocument();
		// The rendered-artifact actions each run their own exporter (not a toast).
		await user.click(sheet.getByText('PDF'));
		expect(shareSpies.sharePdf).toHaveBeenCalled();
		await user.click(sheet.getByText('PowerPoint'));
		expect(shareSpies.sharePptx).toHaveBeenCalled();
		await user.click(sheet.getByText('Marp bundle'));
		expect(shareSpies.shareMarp).toHaveBeenCalled();
		await user.click(sheet.getByText('Print source'));
		expect(shareSpies.sharePrintSource).toHaveBeenCalled();
	});

	it('Share → Present link opens Present', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Share' }));
		await user.click(await screen.findByText('Present link'));
		expect(await screen.findByText('Presenter screen')).toBeInTheDocument();
	});

	it('opens Workspace settings ("your setup") with the REAL model status + tabs', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Workspace settings' }));
		const sheet = within(await screen.findByRole('dialog', { name: /Workspace/ }));
		// Default tab = AI model: the ACTIVE tier is reported honestly (floor in the
		// test env, no model connected) with a one-click Connect affordance.
		expect(sheet.getByText('Active generation tier')).toBeInTheDocument();
		expect(sheet.getByText(/Floor/)).toBeInTheDocument();
		expect(sheet.getByRole('button', { name: /Connect OpenRouter/ })).toBeInTheDocument();
		// Spend tab shows real (zero) spend, not a fabricated figure.
		await user.click(sheet.getByRole('tab', { name: 'Spend' }));
		expect(await sheet.findByText('this session')).toBeInTheDocument();
		// Real spend is zero in the test env (no model calls) — both cards show $0.00.
		expect(sheet.getAllByText('$0.00').length).toBeGreaterThanOrEqual(2);
		// Instructions tab — the textarea persists to localStorage.
		await user.click(sheet.getByRole('tab', { name: 'Instructions' }));
		const ta = await sheet.findByRole('textbox', { name: 'Standing instructions' });
		await user.clear(ta);
		await user.type(ta, 'Be terse.');
		expect(ta).toHaveValue('Be terse.');
		expect(localStorage.getItem('lattice-studio-instructions')).toBe('Be terse.');
		expect(sheet.queryByText('Active generation tier')).not.toBeInTheDocument();
	});

	it('expands the Deck Inspector ("this deck") from its collapsed rail', async () => {
		const user = setup();
		expect(screen.queryByText('this deck')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Toggle Deck inspector' }));
		expect(await screen.findByText('this deck')).toBeInTheDocument();
		expect(screen.getByText('Lenses')).toBeInTheDocument();
	});

	it('the Inspector "Inline validation" toggle has real teeth', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Toggle Deck inspector' }));
		const sw = await screen.findByRole('switch', { name: 'Inline validation' });
		expect(sw).toBeChecked();
		await user.click(sw);
		expect(sw).not.toBeChecked();
		expect(await screen.findByText(/Inline validation off/)).toBeInTheDocument();
	});

	it('reaches Fabricate from the launcher (not a deck mode)', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: 'Workspace launcher' }));
		await user.click(await screen.findByText('Fabricate'));
		expect(await screen.findByText('Theme Studio')).toBeInTheDocument();
		expect(screen.getByText(/Core colors/)).toBeInTheDocument();
	});

	it('switches decks from the deck switcher', async () => {
		const user = setup();
		await user.click(screen.getByRole('button', { name: /Q3 Board Review/ }));
		await user.click(await screen.findByText('FY26 Product Strategy'));
		expect(screen.getByRole('button', { name: /FY26 Product Strategy/ })).toBeInTheDocument();
	});

	it('shows a live, deck-reactive Architect scorecard', () => {
		setup();
		// The default deck is clean + varied + titled → the readiness rows reflect it.
		expect(screen.getByText('Board-ready')).toBeInTheDocument();
		expect(screen.getByText('Components valid')).toBeInTheDocument();
		expect(screen.getByText('Opens with a title')).toBeInTheDocument();
		expect(screen.getByText('Variety')).toBeInTheDocument();
		// A clean deck reads READY (the color-independent pass tag), not FIX.
		expect(screen.getByText('READY')).toBeInTheDocument();
		expect(screen.queryByText('FIX')).not.toBeInTheDocument();
	});

	it('a reader lens reshapes the Compose preview, and clears back to full', async () => {
		const user = setup();
		expect(screen.getByText('Slide 1 / 6')).toBeInTheDocument();
		// The Architect's "Exec summary" reshapes the preview to the headline slides.
		await user.click(screen.getByText('Exec summary'));
		expect(await screen.findByText('Slide 1 / 4')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Clear reader lens' })).toBeInTheDocument();
		// Clearing returns to the full deck.
		await user.click(screen.getByRole('button', { name: 'Clear reader lens' }));
		expect(await screen.findByText('Slide 1 / 6')).toBeInTheDocument();
	});

	it('jumps to any slide from the navigator rail', async () => {
		const user = setup();
		// The Q3 deck opens on slide 1 (the title).
		expect(screen.getByText('Slide 1 / 6')).toBeInTheDocument();
		// Jump straight to slide 4 (the quote) via its navigator chip.
		await user.click(screen.getByRole('button', { name: 'Slide 4 — quote' }));
		expect(await screen.findByText('Slide 4 / 6')).toBeInTheDocument();
	});
});

describe('StudioShell — responsive layout', () => {
	it('mobile: collapses to one swappable Edit/Preview pane', async () => {
		setViewport('mobile');
		const user = setup();
		// Preview is the default pane — its slide nav is visible, the editor's
		// Markdown badge is not (the panes never co-exist on mobile).
		expect(await screen.findByText(/Slide \d+ \//)).toBeInTheDocument();
		expect(screen.queryByText('Markdown')).not.toBeInTheDocument();
		// Architect is NOT a persistent column on mobile.
		expect(screen.queryByText('Board-ready')).not.toBeInTheDocument();
		// Swap to the editor pane.
		await user.click(screen.getByRole('button', { name: 'Edit' }));
		expect(await screen.findByText('Markdown')).toBeInTheDocument();
		expect(screen.queryByText(/Slide \d+ \//)).not.toBeInTheDocument();
	});

	it('mobile: the Architect opens as a slide-in sheet', async () => {
		setViewport('mobile');
		const user = setup();
		expect(screen.queryByText('Board-ready')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Toggle Architect' }));
		expect(await screen.findByText('Board-ready')).toBeInTheDocument();
	});

	it('tablet: panels are sheets, both closed by default', async () => {
		setViewport('tablet');
		const user = setup();
		// Both panes share the row; neither panel is docked open.
		expect(screen.queryByText('Board-ready')).not.toBeInTheDocument();
		expect(screen.queryByText('this deck')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Toggle Deck inspector' }));
		expect(await screen.findByText('this deck')).toBeInTheDocument();
	});
});
