import { expect, gotoStudio, test } from './studio-fixture';

// Fabricate — the Theme / Component studio. Deterministic surfaces: the derived
// contract + WCAG audit recompute from the theme colors, the light/dark specimen
// toggles, and the Component tab's gate reports palette-blind/scoped status.

test.beforeEach(async ({ page }) => {
	await gotoStudio(page);
	await page.getByRole('button', { name: 'Workspace launcher' }).click();
	await page.getByRole('menuitem', { name: 'Fabricate' }).click();
	await expect(page.getByRole('button', { name: 'Back to Compose' })).toBeVisible();
});

test('fabricate opens on the Theme tab with the derived contract and WCAG audit', async ({ page }) => {
	await expect(page.getByRole('textbox', { name: 'Theme name' })).toBeVisible();
	await expect(page.getByText(/Contract . \d+ roles/)).toBeVisible();
	await expect(page.getByText(/WCAG audit/)).toBeVisible();
});

test('the theme specimen toggles between light and dark', async ({ page }) => {
	const light = page.getByRole('button', { name: 'Light specimen' });
	const dark = page.getByRole('button', { name: 'Dark specimen' });
	await dark.click();
	await expect(dark).toHaveAttribute('aria-pressed', 'true');
	await light.click();
	await expect(light).toHaveAttribute('aria-pressed', 'true');
});

test('the Component tab reports a palette-blind / scoped gate', async ({ page }) => {
	await page.getByRole('button', { name: 'Component', exact: true }).click();
	await expect(page.getByRole('textbox', { name: 'Component name' })).toBeVisible();
	// The default component is clean → the gate reports it ready.
	await expect(page.getByText(/Palette-blind and scoped|ready to save/)).toBeVisible();
});

test('returning to Compose restores the editor', async ({ page }) => {
	await page.getByRole('button', { name: 'Back to Compose' }).click();
	await expect(page.getByLabel('Deck source')).toBeVisible();
});
