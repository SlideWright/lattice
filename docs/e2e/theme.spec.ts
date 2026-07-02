import { expect, gotoStudio, readStorage, test } from './studio-fixture';

// Palette / theme selection. The persisted slug + the `html[data-palette]`
// attribute are deterministic oracles (the in-iframe re-theme is not directly
// readable, but these prove the cause propagated).

test.beforeEach(async ({ page }) => {
	await gotoStudio(page);
});

function paletteAttr(page: import('@playwright/test').Page): Promise<string | null> {
	return page.evaluate(() => document.documentElement.getAttribute('data-palette'));
}

test('topbar theme picker sets the active palette and persists it', async ({ page }) => {
	await page.getByRole('button', { name: 'Theme' }).click();
	await page.getByRole('menuitem', { name: 'Cuoio' }).click();

	await expect.poll(() => readStorage(page, 'lattice-studio-palette')).toBe('cuoio');
	await expect.poll(() => paletteAttr(page)).toBe('cuoio');
});

test('the command palette also switches the theme', async ({ page }) => {
	// Palette-setting is also reachable from ⌘K (the inspector Look swatches were
	// retired); assert the same persisted-slug + attribute oracle.
	await page.keyboard.press('ControlOrMeta+k');
	await page.getByPlaceholder('Search or run a command…').fill('burgundy');
	await page.getByRole('option', { name: /burgundy/i }).first().click();

	await expect.poll(() => readStorage(page, 'lattice-studio-palette')).toBe('burgundy');
	await expect.poll(() => paletteAttr(page)).toBe('burgundy');
});
