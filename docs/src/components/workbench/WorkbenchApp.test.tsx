import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The studios pull in the engine/theme-core bundles, which don't load under
// jsdom — and this test asserts the CHROME's DOM contract, not the studios'
// behaviour. So mock their init entrypoints to no-ops; we only need to prove the
// island renders every host element + control the (real) studios query by class.
vi.mock('@/playground/theme-studio.js', () => ({ initThemeStudio: vi.fn() }));
vi.mock('@/playground/component-studio.js', () => ({ initLayoutStudio: vi.fn() }));

import { WorkbenchApp } from './WorkbenchApp';

const data = { themeBase: '/themes/', runtimeUrl: '/runtime.js', engineUrl: '/engine.js', shippedNames: [], finishes: [] };

afterEach(cleanup);

// Every selector the vanilla studios (theme-studio.js / component-studio.js /
// studio-preview-config.js / workbench-tour.js) query — they must resolve in
// the React-rendered tree or a studio silently bails. This is the regression
// guard for the wrap-don't-reinvent boundary.
const STUDIO_SELECTORS = [
	// Theme Studio
	'.studio',
	'.studio-fields',
	'.studio-starters',
	'#studio-name',
	'.studio-preview-host',
	'.studio-meter',
	'.studio-meter-summary',
	'.studio-status',
	'.studio-copy',
	'.studio-download',
	'.studio-code',
	'.studio-theme-save',
	'.studio-theme-library',
	'.studio-ai-prompt',
	'.studio-ai-ask',
	'.studio-ai-status',
	'.studio-ai-connect',
	'.studio-ai-history',
	// Layout Studio
	'.studio-layout',
	'.lstudio-starters',
	'.lstudio-name',
	'.lstudio-function',
	'.lstudio-form',
	'.lstudio-substance',
	'.lstudio-tags',
	'.lstudio-description',
	'.lstudio-css-editor',
	'.lstudio-skeleton-editor',
	'.lstudio-findings',
	'.lstudio-findings-summary',
	'.lstudio-copy-css',
	'.lstudio-copy-manifest',
	'.lstudio-download',
	'.lstudio-save',
	'.lstudio-library',
	// Shared (per faculty)
	'.studio-preview-config',
	'[data-preview-setup]',
	'.studio-mode-btn',
	'.studio-tab',
	'.wb-faculty',
];

describe('WorkbenchApp DOM contract', () => {
	it('renders every host element + control the studios wire by selector', () => {
		const { container } = render(<WorkbenchApp data={data} />);
		for (const sel of STUDIO_SELECTORS) {
			expect(container.querySelector(sel), `missing selector: ${sel}`).not.toBeNull();
		}
	});

	it('renders the studio-tab[data-tab] panes the tour clicks to reveal', () => {
		const { container } = render(<WorkbenchApp data={data} />);
		for (const tab of ['design', 'preview', 'contrast']) {
			expect(container.querySelector(`.studio-tab[data-tab="${tab}"]`), tab).not.toBeNull();
		}
	});

	it('keeps the two studio <main>s with the data-tab layout key', () => {
		const { container } = render(<WorkbenchApp data={data} />);
		expect(container.querySelectorAll('main.studio[data-tab]').length).toBe(2);
	});
});
