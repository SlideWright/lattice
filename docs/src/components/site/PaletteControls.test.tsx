import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import PaletteControls from './PaletteControls';

afterEach(() => {
	const r = document.documentElement;
	r.removeAttribute('data-palette');
	r.removeAttribute('data-mode');
	r.removeAttribute('data-theme');
	localStorage.clear();
});

describe('PaletteControls island', () => {
	it('renders the mode toggle and a palette select when palettes are given', () => {
		render(<PaletteControls palettes={['indaco', 'cuoio']} />);
		expect(screen.getByRole('button', { name: /toggle light \/ dark/i })).toBeInTheDocument();
		// shadcn/radix SelectTrigger exposes role="combobox" with the aria-label.
		expect(screen.getByRole('combobox', { name: /theme/i })).toBeInTheDocument();
	});

	it('renders only the mode toggle when palettes is empty (Workbench case)', () => {
		render(<PaletteControls palettes={[]} />);
		expect(screen.getByRole('button', { name: /toggle light \/ dark/i })).toBeInTheDocument();
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
	});

	it('clicking the mode toggle flips data-mode on <html> + persists it', () => {
		document.documentElement.setAttribute('data-mode', 'light');
		render(<PaletteControls palettes={[]} />);
		fireEvent.click(screen.getByRole('button', { name: /toggle light \/ dark/i }));
		expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
		expect(localStorage.getItem('lattice-docs-mode')).toBe('dark');
	});
});
