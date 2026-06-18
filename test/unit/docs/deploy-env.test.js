// Unit tests for the deploy-env helpers — especially the three-way `toursMode`
// gate that decides whether the Tour/Demo launchers and the first-visit
// auto-start appear on a given build (production / Cloudflare PR preview / dev).
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { isPreviewDeploy, isProductionDeploy, toursMode } = require('../../../docs/src/lib/deploy-env.mjs');

test('isPreviewDeploy: dev and non-main Cloudflare are previews; prod is not', () => {
	assert.equal(isPreviewDeploy({ dev: true }), true); // local astro dev
	assert.equal(isPreviewDeploy({ cfPages: '1', cfBranch: 'feature-x' }), true); // PR preview
	assert.equal(isPreviewDeploy({ cfPages: '1', cfBranch: 'main' }), false); // CF main = prod
	assert.equal(isPreviewDeploy({}), false); // GitHub Pages prod (no CF_PAGES)
	assert.equal(isProductionDeploy({}), true);
	assert.equal(isProductionDeploy({ dev: true }), false);
});

test('toursMode: production builds run tours fully (on)', () => {
	assert.equal(toursMode({}), 'on'); // GitHub Pages
	assert.equal(toursMode({ cfPages: '1', cfBranch: 'main' }), 'on'); // CF main
});

test('toursMode: Cloudflare PR previews show launchers but no auto-start (preview)', () => {
	assert.equal(toursMode({ cfPages: '1', cfBranch: 'claude/some-branch' }), 'preview');
	assert.equal(toursMode({ cfPages: '1', cfBranch: 'feature-x' }), 'preview');
});

test('toursMode: local dev is off (opt in with ?tours=on)', () => {
	assert.equal(toursMode({ dev: true }), 'off');
	assert.equal(toursMode({ dev: true, cfPages: undefined }), 'off');
});

test('toursMode: no env signals reads as production (the GitHub Pages case)', () => {
	// GitHub Pages passes no dev/CF flags, so an empty env IS production → 'on'.
	assert.equal(toursMode(), 'on');
	assert.equal(toursMode({}), 'on');
});
