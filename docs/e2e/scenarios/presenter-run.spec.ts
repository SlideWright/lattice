import { expect, gotoStudio, setEditorContent, slideCount, test } from '../studio-fixture';

// Persona: a presenter delivering a deck. Goal: load the deck, enter Present,
// and reach the LAST slide with every slide actually painting on the way — a
// full traversal, not a first-slide smoke check. A second test drives the
// dual-screen presenter window (a real popup) and asserts the speaker note
// reaches it.

test('a presenter traverses the whole seeded deck to the last slide', async ({ page }) => {
	await gotoStudio(page);
	const total = await slideCount(page);
	expect(total).toBeGreaterThan(3);

	await page.getByRole('button', { name: 'Present', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Present' });
	await expect(dialog).toBeVisible();

	// The presented slide renders through its own engine frame.
	const stage = page.frameLocator('[aria-label="Presented slide"] iframe').locator('.lattice').first();
	await expect(stage).not.toBeEmpty();

	// Walk 1 → N with the keyboard, requiring the counter AND a painted slide at
	// every step — the traversal is the oracle, so no step may silently no-op.
	for (let i = 2; i <= total; i++) {
		await page.keyboard.press('ArrowRight');
		await expect(dialog.getByText(`${i} / ${total}`, { exact: true })).toBeVisible();
		await expect(stage).not.toBeEmpty();
	}

	// At the end, and not past it: the Next control is exhausted.
	await expect(dialog.getByRole('button', { name: 'Next slide' })).toBeDisabled();

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
});

test('the dual-screen presenter window opens and carries the speaker note', async ({ page, context }) => {
	await gotoStudio(page);

	// A one-slide deck with a note, so the popup's note pane has known content.
	const NOTE = 'Welcome the board and state the ask in one line.';
	await setEditorContent(
		page,
		`<!-- _class: title -->\n\n# Atlas kickoff\n\n\`Board · Kickoff\`\n\nOne platform, three bets.\n\n<!-- note: ${NOTE} -->`,
	);
	await expect(page.getByText('Slide 1 / 1', { exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Present', exact: true }).click();
	await expect(page.getByRole('dialog', { name: 'Present' })).toBeVisible();

	// "Presenter screen" opens the second-screen window (a real popup).
	const popupPromise = context.waitForEvent('page');
	await page.getByRole('button', { name: 'Presenter screen' }).click();
	const popup = await popupPromise;

	// The popup is the speaker view: its chrome and THIS slide's note render there.
	await expect(popup.getByText('Speaker notes')).toBeVisible();
	await expect(popup.getByText(NOTE)).toBeVisible();
});
