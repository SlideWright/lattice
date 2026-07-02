import { expect, gotoStudio, railButtons, slideCount, test, toastText } from './studio-fixture';

// The insert-component palette over the 53-component catalog: open, search,
// insert → a new slide carrying that component's skeleton (rail count +1).

test('inserting a component adds a slide from the catalog', async ({ page }) => {
	await gotoStudio(page);
	const n = await slideCount(page);

	await page.getByRole('button', { name: 'Insert component' }).click();

	const search = page.getByPlaceholder(/Search \d+ components/);
	await expect(search).toBeVisible();
	await search.fill('divider');

	// Pick the matching catalog entry (option label is "name + description").
	await page.getByRole('option', { name: /^divider/i }).first().click();

	await expect(toastText(page)).toContainText('Inserted');
	await expect(railButtons(page)).toHaveCount(n + 1);
});
