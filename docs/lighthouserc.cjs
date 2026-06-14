// Lighthouse CI — the committed web-performance benchmark + budget gate for the
// docs site (DESKTOP form factor). Its companion lighthouserc.mobile.cjs gates
// MOBILE (added after the shadcn migration regressed mobile). `npm run perf`
// builds once then runs BOTH (perf:desktop + perf:mobile); the
// .github/workflows/lighthouse.yml job runs `npm run perf` on PRs.
//
// It measures the migrated React-island surfaces (landing, components,
// playground) plus a Starlight baseline page, median of 3 runs, desktop preset.
// Budgets are tuned to the post-shadcn-migration baseline with headroom, so a
// regression (e.g. an island shipping too much JS, or a preview that paints
// after hydration) trips the assert step at the PR instead of being felt.
//
// Thresholds reference (Google "good"): TBT < 200ms, LCP < 2500ms, CLS < 0.1.
module.exports = {
	ci: {
		collect: {
			// Serve the already-built dist; the `perf` script builds first.
			startServerCommand: 'npx astro preview --port 4399',
			startServerReadyPattern: 'localhost:4399',
			url: [
				'http://localhost:4399/lattice/',
				'http://localhost:4399/lattice/components/',
				'http://localhost:4399/lattice/playground/',
				'http://localhost:4399/lattice/getting-started/',
			],
			numberOfRuns: 3,
			settings: {
				preset: 'desktop',
				chromeFlags: '--no-sandbox --headless=new --disable-dev-shm-usage --disable-gpu',
			},
		},
		// Per-surface budgets (median-run so one noisy run can't flip the gate).
		// The landing legitimately renders THREE live deck previews (hero +
		// restyle carousel + field cards), so its TBT floor is higher than the
		// content pages — but it's still gated (and is a tracked optimisation
		// target: deferring/spreading those renders). Everything else holds the
		// strict 300ms TBT so a regression on a light page is caught.
		assert: {
			assertMatrix: [
				{
					// the landing — http://localhost:4399/lattice/
					matchingUrlPattern: '.*/lattice/$',
					assertions: {
						'categories:performance': ['error', { minScore: 0.85, aggregationMethod: 'median-run' }],
						'total-blocking-time': ['error', { maxNumericValue: 400, aggregationMethod: 'median-run' }],
						'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median-run' }],
						'cumulative-layout-shift': ['error', { maxNumericValue: 0.05, aggregationMethod: 'median-run' }],
						'resource-summary:script:size': ['warn', { maxNumericValue: 1600000 }],
					},
				},
				{
					// every other page (components, playground, docs, …)
					matchingUrlPattern: '.*/lattice/.+',
					assertions: {
						'categories:performance': ['error', { minScore: 0.85, aggregationMethod: 'median-run' }],
						'total-blocking-time': ['error', { maxNumericValue: 300, aggregationMethod: 'median-run' }],
						'largest-contentful-paint': ['error', { maxNumericValue: 2500, aggregationMethod: 'median-run' }],
						'cumulative-layout-shift': ['error', { maxNumericValue: 0.05, aggregationMethod: 'median-run' }],
						'resource-summary:script:size': ['warn', { maxNumericValue: 1600000 }],
					},
				},
			],
		},
		upload: { target: 'temporary-public-storage' },
	},
};
