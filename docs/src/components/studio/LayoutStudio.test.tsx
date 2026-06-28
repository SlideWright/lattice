import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutStudio } from './LayoutStudio';

// Surface the threaded extraCss/sample so we can assert the local component is
// what's previewed (the engine itself is never involved).
vi.mock('@/components/DeckPreview', () => ({
	default: ({ 'aria-label': label, extraCss, sample }: { 'aria-label'?: string; extraCss?: string; sample?: string }) => <div data-testid="dp" data-label={label} data-extracss={extraCss || ''} data-sample={sample || ''} />,
}));

vi.mock('./component-library', () => ({ saveStudioComponent: vi.fn(async (i: { name: string; css: string; skeleton: string }) => ({ id: 'c1', bucket: null, ...i })) }));

import { saveStudioComponent } from './component-library';

const saveSpy = saveStudioComponent as unknown as ReturnType<typeof vi.fn>;

const options = { themeBase: '', runtimeUrl: '', engineUrl: '' };
const noop = () => {};

beforeEach(() => saveSpy.mockClear());

describe('LayoutStudio — the real layout gate', () => {
	it('starts clean (palette-blind + scoped), previews the local component, and saves it', async () => {
		const user = userEvent.setup();
		const notify = vi.fn();
		render(<LayoutStudio options={options} notify={notify} onSaved={noop} />);
		// The starter passes the gate out of the box.
		expect(screen.getByText(/Gate — all clear/)).toBeInTheDocument();
		// The live preview renders the skeleton with the local CSS injected.
		const dp = screen.getByTestId('dp');
		expect(dp.getAttribute('data-extracss')).toMatch(/section\.callout/);
		expect(dp.getAttribute('data-sample')).toMatch(/_class: callout/);
		// Save runs the real component-library path with name + css + skeleton.
		await user.click(screen.getByRole('button', { name: /Save to component library/ }));
		await waitFor(() => expect(saveSpy).toHaveBeenCalled());
		const arg = saveSpy.mock.calls[0][0];
		expect(arg.name).toBe('callout');
		expect(arg.css).toMatch(/section\.callout/);
		expect(notify).toHaveBeenCalledWith(expect.stringContaining('.callout'));
	});

	it('flags a hex literal (no-hex) and blocks save', () => {
		render(<LayoutStudio options={options} notify={noop} onSaved={noop} />);
		fireEvent.change(screen.getByLabelText('Component CSS'), { target: { value: 'section.callout { color: #ff0000; }' } });
		expect(screen.getByText(/use a palette token/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save to component library/ })).toBeDisabled();
	});

	it('flags an unscoped selector (would leak onto other slides)', () => {
		render(<LayoutStudio options={options} notify={noop} onSaved={noop} />);
		fireEvent.change(screen.getByLabelText('Component CSS'), { target: { value: 'h2 { color: var(--accent); }' } });
		expect(screen.getByText(/not scoped to \.callout/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save to component library/ })).toBeDisabled();
	});

	it('flags a skeleton that does not invoke the component', () => {
		render(<LayoutStudio options={options} notify={noop} onSaved={noop} />);
		fireEvent.change(screen.getByLabelText('Component skeleton'), { target: { value: '## just a heading, no class' } });
		expect(screen.getByText(/must invoke/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Save to component library/ })).toBeDisabled();
	});

	it('an invalid component name blocks the gate and hides the preview', () => {
		render(<LayoutStudio options={options} notify={noop} onSaved={noop} />);
		fireEvent.change(screen.getByLabelText('Component name'), { target: { value: 'Bad Name!' } });
		expect(screen.getByText(/lowercase slug/i)).toBeInTheDocument();
		expect(screen.queryByTestId('dp')).toBeNull();
		expect(screen.getByText(/Name your component to preview/i)).toBeInTheDocument();
	});
});
