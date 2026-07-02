import { currentSlide, expect, gotoStudio, railButtons, setEditorContent, test } from '../studio-fixture';

// Journey: author → present. One continuous flow — draft a deck from scratch,
// enter Present, walk to the LAST slide, and see its speaker note render. The
// oracle is the end state (full traversal + the authored note on screen), not
// any single control: it passes only if drafting, the note round-trip, and
// Present navigation all worked in sequence.

// The authored deck: three slides, valid shipped components (title / big-number /
// closing — HARD RULE #6 contracts), with a speaker note on the LAST slide so the
// traversal oracle and the note oracle land on the same slide.
const NOTE = 'Close on the ask and pause for questions.';
const DECK = [
	'<!-- _class: title -->\n\n# Atlas expansion plan\n\n`Growth · FY27`\n\nThree markets, one playbook.',
	'<!-- _class: big-number -->\n\n`The headline`\n\n- 3\n  - new markets entered with the same core platform.',
	`<!-- _class: closing -->\n\n## Approve the Atlas budget and we ship Q1.\n\n\`The ask\`\n\n<!-- note: ${NOTE} -->`,
].join('\n\n---\n\n');

test('draft a deck, present it, and the last slide speaks its note', async ({ page }) => {
	await gotoStudio(page);

	// Author the deck (replaces the seeded source wholesale). The preview follows
	// the caret to the last edited slide, so jump back to slide 1 for the run.
	await setEditorContent(page, DECK);
	await expect(railButtons(page)).toHaveCount(3);
	await railButtons(page).nth(0).click();
	await expect(currentSlide(page)).toContainText('Atlas expansion plan');

	// Enter Present.
	await page.getByRole('button', { name: 'Present', exact: true }).click();
	const dialog = page.getByRole('dialog', { name: 'Present' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('1 / 3', { exact: true })).toBeVisible();

	// Traverse to the last slide.
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowRight');
	await expect(dialog.getByText('3 / 3', { exact: true })).toBeVisible();

	// The note renders: read-aloud's teleprompter reads the slide's SPEAKER NOTE
	// when one exists (the real talk track, not the on-slide prose) — captions are
	// exact even on the silent no-voice rung, so this proves the note round-tripped
	// from the authored source into Present.
	await dialog.getByRole('button', { name: 'Play read-aloud' }).click();
	await expect(dialog.getByText(NOTE)).toBeVisible();

	// And the journey exits cleanly.
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
});
