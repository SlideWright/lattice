import { currentSlide, expect, gotoStudio, railButtons, slideCount, test, toastText } from './studio-fixture';

// Preview navigation + reader lenses. The outer "Slide N / M" label and the rail
// count are the reliable outer-DOM oracles; the painted slide *changing* is
// asserted through the preview iframe (resilient to the seed deck's exact text).

test.beforeEach(async ({ page }) => {
	await gotoStudio(page);
});

// The slide's first heading is a stable content token (resilient to whitespace
// re-render, unlike the whole innerText).
function slideHeading(page: import('@playwright/test').Page): Promise<string> {
	return currentSlide(page).locator('h1, h2, h3').first().innerText();
}

test('next / previous move through the deck and repaint the slide', async ({ page }) => {
	const n = await slideCount(page);
	await expect(page.getByText(`Slide 1 / ${n}`, { exact: true })).toBeVisible();
	const head1 = await slideHeading(page);
	expect(head1.length).toBeGreaterThan(0);

	await page.getByRole('button', { name: 'Next slide' }).click();
	await expect(page.getByText(`Slide 2 / ${n}`, { exact: true })).toBeVisible();
	// The painted heading actually changed.
	await expect(currentSlide(page)).not.toContainText(head1);

	await page.getByRole('button', { name: 'Previous slide' }).click();
	await expect(page.getByText(`Slide 1 / ${n}`, { exact: true })).toBeVisible();
	await expect(currentSlide(page)).toContainText(head1);
});

test('clicking a rail slide jumps to it and repaints', async ({ page }) => {
	const n = await slideCount(page);
	const head1 = await slideHeading(page);

	await railButtons(page).nth(2).click();
	await expect(page.getByText(`Slide 3 / ${n}`, { exact: true })).toBeVisible();
	await expect(currentSlide(page)).not.toContainText(head1);
});

test('Exec-summary lens trims the deck to headline slides, and clearing restores it', async ({ page }) => {
	const n = await slideCount(page);
	// The Reshape card lives in the Architect panel, which is collapsed by default.
	await page.getByRole('button', { name: 'Toggle Architect' }).click();
	await page.getByRole('button', { name: 'Exec summary' }).first().click();
	await expect(toastText(page)).toContainText('Exec summary');

	// The lens keeps only headline slides → strictly fewer than the full deck.
	await expect.poll(() => slideCount(page)).toBeLessThan(n);
	const clear = page.getByRole('button', { name: 'Clear reader lens' });
	await expect(clear).toBeVisible();

	await clear.click();
	await expect(railButtons(page)).toHaveCount(n);
	await expect(clear).toBeHidden();
});
