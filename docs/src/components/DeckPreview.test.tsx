import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeckPreview from './DeckPreview';

// A shared renderInto spy so we can assert what the component asked the renderer
// to draw across re-renders. The engine itself is never involved.
const { renderInto } = vi.hoisted(() => ({ renderInto: vi.fn(() => Promise.resolve({ ok: true, slides: 1, error: null })) }));
vi.mock('@/lib/single-slide-render', () => ({
	createSingleSlideRenderer: () => ({
		renderInto,
		whenReady: () => Promise.resolve(),
		onThemeChange() {},
		scaleFrame() {},
		ready: () => true,
	}),
}));

const opts = { themeBase: '', runtimeUrl: '', engineUrl: '' };

beforeEach(() => renderInto.mockClear());

describe('DeckPreview — theme threading', () => {
	it('re-renders when the extra-theme CSS changes under a STABLE name (re-saved edit)', async () => {
		const { rerender } = render(<DeckPreview options={opts} sample="# A" mermaid={false} paletteOverride="ocean" extraTheme={{ name: 'ocean', css: '/* @theme ocean */ v1' }} aria-label="p" />);
		await waitFor(() => expect(renderInto).toHaveBeenCalled());
		const before = renderInto.mock.calls.length;

		// Same NAME, NEW css — a saved theme edited then re-saved. Keying re-renders
		// on the name alone (a stable slug) would silently keep the old css; we key on
		// the css too, so this must trigger a fresh render carrying v2.
		rerender(<DeckPreview options={opts} sample="# A" mermaid={false} paletteOverride="ocean" extraTheme={{ name: 'ocean', css: '/* @theme ocean */ v2' }} aria-label="p" />);
		await waitFor(() => expect(renderInto.mock.calls.length).toBeGreaterThan(before));
		expect(renderInto.mock.calls.at(-1)?.[4]).toEqual({ name: 'ocean', css: '/* @theme ocean */ v2' });
	});

	it('does NOT re-render when identical props recur (no thrash)', async () => {
		const theme = { name: 'ocean', css: '/* @theme ocean */ v1' };
		const { rerender } = render(<DeckPreview options={opts} sample="# A" mermaid={false} paletteOverride="ocean" extraTheme={theme} aria-label="p" />);
		await waitFor(() => expect(renderInto).toHaveBeenCalled());
		const before = renderInto.mock.calls.length;
		// A fresh wrapper object with the SAME name + css content must not re-render.
		rerender(<DeckPreview options={opts} sample="# A" mermaid={false} paletteOverride="ocean" extraTheme={{ name: 'ocean', css: '/* @theme ocean */ v1' }} aria-label="p" />);
		await new Promise((r) => setTimeout(r, 50));
		expect(renderInto.mock.calls.length).toBe(before);
	});

	it('forwards the modeOverride to the renderer', async () => {
		render(<DeckPreview options={opts} sample="# A" mermaid={false} modeOverride="dark" aria-label="p" />);
		await waitFor(() => expect(renderInto).toHaveBeenCalled());
		expect(renderInto.mock.calls.at(-1)?.[5]).toBe('dark');
	});
});
