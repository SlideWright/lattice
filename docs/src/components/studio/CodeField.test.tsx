import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CodeField } from './CodeField';

// CodeMirror can't lay out under jsdom, so CodeField renders its accessible
// <textarea> fallback here. These lock the fallback contract the LayoutStudio
// gate tests (and any consumer) rely on: a labeled control whose edits flow out.
describe('CodeField — jsdom textarea fallback', () => {
	it('renders a labeled control seeded with the value and emits edits', () => {
		const onChange = vi.fn();
		render(<CodeField language="css" ariaLabel="Component CSS" value="section.x { color: var(--accent); }" onChange={onChange} />);
		const field = screen.getByLabelText('Component CSS') as HTMLTextAreaElement;
		expect(field.value).toContain('section.x');
		fireEvent.change(field, { target: { value: 'section.x { color: var(--bg); }' } });
		expect(onChange).toHaveBeenCalledWith('section.x { color: var(--bg); }');
	});

	it('honors the markdown language for the skeleton field', () => {
		render(<CodeField language="markdown" ariaLabel="Component skeleton" value="<!-- _class: x -->" onChange={() => {}} />);
		expect(screen.getByLabelText('Component skeleton')).toBeInTheDocument();
	});
});
