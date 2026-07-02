import { currentSlide, expect, gotoStudio, test } from './studio-fixture';

// Visual evidence at every viewport. We deliberately do NOT commit pixel
// baselines here: the docs site has font-swap/runner variance (see the
// experience-gating + perf-gating decision docs), so blind baselines would flake
// in CI. Instead this attaches a full screenshot per project as a review
// artifact and asserts the deterministic paint oracle. Pixel-diff baselines are
// a documented follow-up once the CI font environment is pinned.

test('@visual studio renders at this viewport', async ({ page }, testInfo) => {
	await gotoStudio(page);
	// Deterministic paint oracle (resilient to the seed deck's text).
	await expect(currentSlide(page)).not.toBeEmpty();

	const shot = await page.screenshot({ fullPage: false, animations: 'disabled' });
	await testInfo.attach(`studio-${testInfo.project.name}`, {
		body: shot,
		contentType: 'image/png',
	});
});
