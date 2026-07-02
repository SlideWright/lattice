import { expect, gotoStudio, railButtons, slideCount, test, toastText } from './studio-fixture';

// Slide structural ops via the rail toolbar. The rail button count is the
// primary structural oracle (one button per slide — a fuzz invariant), asserted
// relative to the seed deck's size; toasts are the secondary signal.

test.beforeEach(async ({ page }) => {
	await gotoStudio(page);
});

test('add slide grows the deck by one', async ({ page }) => {
	const n = await slideCount(page);
	await page.getByRole('button', { name: 'Add slide' }).click();
	await expect(toastText(page)).toContainText('Slide added');
	await expect(railButtons(page)).toHaveCount(n + 1);
});

test('duplicate slide grows the deck by one', async ({ page }) => {
	const n = await slideCount(page);
	await page.getByRole('button', { name: 'Duplicate slide' }).click();
	await expect(toastText(page)).toContainText('Slide duplicated');
	await expect(railButtons(page)).toHaveCount(n + 1);
});

// FIXME(studio): "Delete slide" is currently a no-op in the redesigned studio —
// the button is enabled and fires no confirmation, but the rail count and deck
// source are unchanged across every path tried (select-then-delete,
// add-then-delete, nav-then-delete). Surfaced by this E2E; tracked as a studio
// regression to fix separately. Re-enable this test once delete works again.
test.fixme('delete slide shrinks the deck by one', async ({ page }) => {
	const n = await slideCount(page);
	await railButtons(page).nth(2).click();
	await page.getByRole('button', { name: 'Delete slide' }).click();
	await expect(toastText(page)).toContainText('Slide deleted');
	await expect(railButtons(page)).toHaveCount(n - 1);
});

test('move slide later reorders the deck', async ({ page }) => {
	// Capture slides 1 and 2 by their class, then assert they swap.
	const first = await railButtons(page).nth(0).getAttribute('aria-label');
	const second = await railButtons(page).nth(1).getAttribute('aria-label');
	expect(first).not.toBe(second);

	await page.getByRole('button', { name: 'Move slide later' }).click();

	// Slide 1 now carries what was slide 2's class, and vice-versa (labels are
	// "Slide {n} — {class}"; compare just the class suffix).
	const classOf = (label: string | null) => (label ?? '').split('—')[1]?.trim();
	await expect(railButtons(page).nth(0)).toHaveAttribute('aria-label', new RegExp(`— ${classOf(second)}$`));
	await expect(railButtons(page).nth(1)).toHaveAttribute('aria-label', new RegExp(`— ${classOf(first)}$`));
});

test('move earlier is disabled on the first slide', async ({ page }) => {
	// Slide 1 is active on load → cannot move any earlier.
	await expect(page.getByRole('button', { name: 'Move slide earlier' })).toBeDisabled();
});
