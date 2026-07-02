import { expect, gotoStudio, test } from './studio-fixture';

// Selection Refine: selecting prose in the editor reveals the Refine control;
// with no model connected it degrades honestly (points at Workspace) rather than
// silently doing nothing.

test('selecting text reveals Refine, which is honest offline', async ({ page }) => {
	await gotoStudio(page);

	// A non-empty selection gates the control.
	await page.getByLabel('Deck source').click();
	await page.keyboard.press('ControlOrMeta+a');

	const refine = page.getByRole('button', { name: 'Refine selection' });
	await expect(refine).toBeVisible();

	await refine.click();
	await expect(page.getByRole('menuitem', { name: /Connect a model to refine/ })).toBeVisible();
});
