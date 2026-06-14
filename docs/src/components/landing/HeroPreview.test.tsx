import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HeroPreview, { type HeroData } from './HeroPreview';

vi.mock('@/lib/landing-engine', () => ({
	createLandingEngine: () => ({
		ready: () => true,
		whenReady: () => Promise.resolve(),
		renderInto: vi.fn(() => Promise.resolve(true)),
	}),
}));

const DATA: HeroData = {
	sample: '<!-- _class: verdict-grid -->\n# x',
	mermaid: false,
	codeHtml: '<span class="ln-class">&lt;!-- _class: verdict-grid --&gt;</span>',
	componentName: 'verdict-grid',
	themeBase: '/themes/',
	runtimeUrl: '/runtime.js',
	frameCss: '',
};

describe('HeroPreview island', () => {
	it('renders the Preview / Source tabs, Preview active by default', () => {
		render(<HeroPreview data={DATA} />);
		expect(screen.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: 'Source' })).toHaveAttribute('aria-selected', 'false');
	});

	it('flips to the Source view, exposing the highlighted markdown', async () => {
		const user = userEvent.setup();
		render(<HeroPreview data={DATA} />);
		await user.click(screen.getByRole('tab', { name: 'Source' }));
		expect(screen.getByRole('tab', { name: 'Source' })).toHaveAttribute('aria-selected', 'true');
		// The pre-highlighted source HTML is mounted (escaped + class-tagged).
		expect(document.querySelector('code .ln-class')).not.toBeNull();
	});

	it('carries the lx-ui island scope class', () => {
		const { container } = render(<HeroPreview data={DATA} />);
		expect(container.querySelector('.lx-ui')).not.toBeNull();
	});
});
