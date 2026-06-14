// Lighthouse CI — MOBILE form-factor budget gate for the docs site (companion to
// lighthouserc.cjs, which gates DESKTOP). The shadcn migration regressed mobile
// (4× CPU throttle): components 95→73 (LCP 2.4→5.0s), workbench LCP 2.7→13s,
// landing 44→34 — all because the ~554KB-gz engine bundle loaded EAGERLY in
// <head>. The on-demand engine loader (src/lib/load-engine.ts) + deferred island
// hydration fixed it; this file gates mobile so a future regression trips here.
//
// Run via `npm run perf:mobile` (and the lighthouse.yml CI job). Uses the
// `mobile` preset (Moto-G4-class CPU + 4× slowdown + Slow-4G), median of 3.
//
// Budget philosophy: the metrics the migration BROKE — LCP (engine no longer
// blocks first paint) and CLS — are gated as ERRORS with headroom over the
// post-fix medians. Total-blocking-time on the LIVE-render surfaces (landing,
// playground) is inherently high on a 4×-throttled mobile CPU because the engine
// bundle must parse+execute to render the previews; that work is now OFF the
// critical path (LCP is good), so TBT + the composite perf score are gated as
// WARN there (tracked, not blocking) while the content pages hold a strict
// score. This catches a real regression (an eager re-introduction tanks LCP and
// trips the error gate) without flaking on the engine's irreducible cost.
//
// Post-fix mobile medians (4× CPU, median of 3, this config) for reference:
//   landing      perf 70 · LCP 1.76s · TBT 2.6s · CLS 0.002
//   components   perf 97 · LCP 2.14s · TBT ~0.02s · CLS 0
//   playground   perf 71 · LCP 2.45s · TBT 1.2s · CLS 0.001
//   gettingStart perf 97 · LCP 2.21s · TBT ~0.03s · CLS 0
module.exports = {
	ci: {
		collect: {
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
				// No `preset` — `formFactor: 'mobile'` + explicit screenEmulation +
				// throttling below define the mobile profile (Moto-G4-class CPU 4×,
				// Slow-4G), matching the numbers the budgets are tuned to.
				formFactor: 'mobile',
				screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
				throttling: {
					rttMs: 150,
					throughputKbps: 1638.4,
					cpuSlowdownMultiplier: 4,
					requestLatencyMs: 0,
					downloadThroughputKbps: 0,
					uploadThroughputKbps: 0,
				},
				chromeFlags: '--no-sandbox --headless=new --disable-dev-shm-usage --disable-gpu',
			},
		},
		assert: {
			assertMatrix: [
				{
					// the landing — three live deck previews (hero + restyle + field
					// cards). LCP (static hero text) + CLS are gated; the engine's TBT
					// and the composite score are WARN (inherent live-render cost, now
					// off the critical path).
					matchingUrlPattern: '.*/lattice/$',
					assertions: {
						'categories:performance': ['warn', { minScore: 0.6, aggregationMethod: 'median-run' }],
						'largest-contentful-paint': ['error', { maxNumericValue: 3000, aggregationMethod: 'median-run' }],
						'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median-run' }],
						'total-blocking-time': ['warn', { maxNumericValue: 3500, aggregationMethod: 'median-run' }],
						'resource-summary:script:size': ['warn', { maxNumericValue: 1700000 }],
					},
				},
				{
					// the playground — one live preview + CodeMirror; same live-render
					// profile as the landing (LCP/CLS error, score/TBT warn).
					matchingUrlPattern: '.*/lattice/playground/.*',
					assertions: {
						'categories:performance': ['warn', { minScore: 0.6, aggregationMethod: 'median-run' }],
						'largest-contentful-paint': ['error', { maxNumericValue: 3300, aggregationMethod: 'median-run' }],
						'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median-run' }],
						'total-blocking-time': ['warn', { maxNumericValue: 2000, aggregationMethod: 'median-run' }],
						'resource-summary:script:size': ['warn', { maxNumericValue: 1700000 }],
					},
				},
				{
					// content + the component INDEX page (no eager engine; the islands
					// are client:visible). These must stay genuinely fast on mobile, so
					// the perf score is a strict ERROR — this is the gate that catches
					// the components regression (73) if it ever returns. The lookahead
					// excludes playground/ (gated by the warn rule above) and workbench/
					// — workbench is NOT in collect.url on mobile (not measured here), so
					// if it's ever added, give it its own rule rather than the strict gate
					// (its live preview has the same irreducible engine TBT). lhci applies
					// EVERY matching pattern, so this must not also match those.
					matchingUrlPattern: '.*/lattice/(?!playground/|workbench/).+',
					assertions: {
						'categories:performance': ['error', { minScore: 0.85, aggregationMethod: 'median-run' }],
						'largest-contentful-paint': ['error', { maxNumericValue: 3000, aggregationMethod: 'median-run' }],
						'cumulative-layout-shift': ['error', { maxNumericValue: 0.1, aggregationMethod: 'median-run' }],
						'total-blocking-time': ['warn', { maxNumericValue: 300, aggregationMethod: 'median-run' }],
					},
				},
			],
		},
		upload: { target: 'temporary-public-storage' },
	},
};
