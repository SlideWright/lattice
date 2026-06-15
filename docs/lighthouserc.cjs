// Lighthouse collection config — DESKTOP form factor (companion:
// lighthouserc.mobile.cjs for MOBILE). Used by scripts/perf-collect.mjs via
// `lhci collect` to MEASURE the docs site; the per-PR/per-run VERDICT is no
// longer here.
//
// History: this file used to carry absolute `assert` budgets enforced per-PR.
// Those rotted as the site grew and flapped on CI runner variance (issue #327),
// so the gate moved to a NIGHTLY relative-regression watch
// (.github/workflows/perf-nightly.yml + scripts/perf-regression.mjs), which
// diffs HEAD vs the ~24h-ago base measured back-to-back on the same runner. See
// engineering/decisions/2026-06-15-docs-perf-gating-policy.md.
//
// `lhci collect` ignores any `assert` block, so this file is COLLECTION-ONLY:
// the url list, run count, and desktop emulation. Edit the tolerances/metrics
// in scripts/perf-regression.mjs, not here.
//
// Surfaces measured: the migrated React-island pages (landing, components,
// playground) + a Starlight baseline (getting-started), median of 3, desktop.
module.exports = {
	ci: {
		collect: {
			// Serve the already-built dist; perf-collect.mjs builds first.
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
		upload: { target: 'temporary-public-storage' },
	},
};
