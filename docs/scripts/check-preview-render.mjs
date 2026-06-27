// Playground gallery-preview RENDER guard — the real-browser e2e regression test
// for the "load a gallery → the tab flips to Preview but the deck never shows"
// bug (the rendered deck sat in a hidden pane; the in-iframe FIT agent can't
// scale a zero-width iframe, so `.lattice` never flips to visible). The jsdom
// unit/fuzz tests mock the engine, so they prove the pane STATE stays coherent
// but can NOT prove the deck actually PAINTS — only a browser can. This does.
//
// It runs NIGHTLY (not on the PR path — see .github/workflows/preview-e2e-nightly
// .yml). On failure it ALWAYS leaves screenshots + a detailed, reproducible
// report on disk (PREVIEW_E2E_OUT) so the workflow can file an issue with them.
//
// Per viewport (mobile + desktop), after loading a gallery from Edit view — the
// exact reported flow — it asserts:
//   1. the active tab AND body[data-pane] both read "preview" (pane-sync), and
//   2. the preview iframe's `.lattice` becomes visibility:visible with its slides
//      scaled to the container (the FIT agent ran) — i.e. the deck is on screen.
//
// Hermetic: the external Mermaid/KaTeX/font CDNs (which the srcdoc loads via
// BLOCKING <script>/<link>) are stubbed via request interception, so the inline
// FIT agent runs without waiting on the network — the reveal it guards needs none
// of them, and a flaky CDN must not flake this test.
//
// Requires a built `dist/` (`npm run build`) and CHROME_PATH.
// Run: `npm run check:preview`.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, '..', 'dist');
const OUT = process.env.PREVIEW_E2E_OUT || path.join(HERE, '..', '.preview-e2e-out');
const PORT = 4397;
const REVEAL_TIMEOUT = 8000; // ms to wait for the deck to paint after a gallery load
const VIEWPORTS = [
	['mobile', 390, 844],
	['desktop', 1440, 900],
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mjs': 'text/javascript', '.map': 'application/json', '.ico': 'image/x-icon', '.txt': 'text/plain' };

function serve() {
	return http
		.createServer((req, res) => {
			let u = decodeURIComponent(req.url.split('?')[0]).replace(/^\/lattice/, '');
			if (u.endsWith('/')) u += 'index.html';
			if (!path.extname(u)) u += '/index.html';
			fs.readFile(path.join(DIST, u), (e, d) => {
				if (e) {
					res.writeHead(404);
					res.end();
				} else {
					res.writeHead(200, { 'content-type': MIME[path.extname(u)] || 'application/octet-stream' });
					res.end(d);
				}
			});
		})
		.listen(PORT, '127.0.0.1');
}

function chromePath() {
	if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
	try {
		return execSync('ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome 2>/dev/null | head -1').toString().trim() || undefined;
	} catch {
		return undefined;
	}
}

// Stub the blocking external resources the deck srcdoc pulls in, so the inline
// FIT agent isn't gated on the network. Mermaid exposes a no-op global; KaTeX /
// fonts resolve empty. Everything else (local dist assets) passes through.
async function stubExternals(page) {
	await page.setRequestInterception(true);
	page.on('request', (req) => {
		const u = req.url();
		if (/mermaid.*\.js($|\?)/.test(u)) return req.respond({ status: 200, contentType: 'text/javascript', body: 'window.mermaid={initialize(){},run(){},render(){return{svg:""}}};' });
		if (/katex.*\.css($|\?)/.test(u)) return req.respond({ status: 200, contentType: 'text/css', body: '' });
		if (/fonts\.googleapis|fonts\.gstatic/.test(u)) return req.respond({ status: 200, contentType: 'text/css', body: '' });
		return req.continue();
	});
}

// Open the Galleries sheet and click the first gallery deck in it.
async function loadFirstGallery(page) {
	await page.waitForSelector('#pg-galleries-trigger', { timeout: 20000 });
	await page.click('#pg-galleries-trigger');
	await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
	const label = await page.evaluate(() => {
		const btns = [...document.querySelectorAll('[role="dialog"] button')].filter((b) => /\d+\s+slides?/.test(b.textContent || ''));
		if (!btns.length) return null;
		btns[0].click();
		return btns[0].textContent.replace(/\s+/g, ' ').trim();
	});
	if (!label) throw new Error('no gallery deck button found in the Galleries sheet');
	return label;
}

// Poll the preview iframe until the deck reveals (or time out).
async function waitForDeck(page) {
	const deadline = Date.now() + REVEAL_TIMEOUT;
	let last = null;
	while (Date.now() < deadline) {
		const el = await page.$('#preview');
		const frame = await el?.contentFrame();
		if (frame) {
			last = await frame
				.evaluate(() => {
					const m = document.querySelector('.lattice');
					const s = m?.querySelector(':scope>section');
					const tf = s ? getComputedStyle(s).transform : 'none';
					return {
						hasMarpit: !!m,
						visible: m ? getComputedStyle(m).visibility === 'visible' : false,
						sections: document.querySelectorAll('section').length,
						scaled: tf !== 'none',
					};
				})
				.catch(() => null);
			if (last?.visible && last.sections > 0) return last;
		}
		await new Promise((r) => setTimeout(r, 150));
	}
	return last;
}

const paneState = (page) =>
	page.evaluate(() => ({
		body: document.body.getAttribute('data-pane'),
		tab: (document.querySelector('[role="tab"][data-state="active"]')?.textContent || '').trim().toLowerCase(),
	}));

// A human-readable, copy-pasteable reproduction for the filed issue.
function reproSteps(bp, w, h) {
	return [
		`1. Open the docs site **Playground** (\`/playground/\`) in a ${bp} viewport (${w}×${h}).`,
		'2. Stay in **Edit** view (the default).',
		'3. Open the **Galleries** sheet (top-bar grid icon) and pick the first deck.',
		'4. **Expected:** the view switches to **Preview** and the deck renders (slides visible).',
		'5. **Actual (bug):** the tab flips to "Preview" but the pane still shows the editor / a blank preview — the deck only appears after manually toggling Edit → Preview.',
	].join('\n');
}

async function main() {
	if (!fs.existsSync(path.join(DIST, 'playground', 'index.html'))) {
		console.error('✗ docs/dist not built — run `npm run build` first.');
		process.exit(1);
	}
	const exe = chromePath();
	if (!exe) {
		console.error('✗ no Chrome found — set CHROME_PATH.');
		process.exit(1);
	}
	fs.mkdirSync(OUT, { recursive: true });
	const server = serve();
	const browser = await puppeteer.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'] });
	const results = [];

	for (const [bp, w, h] of VIEWPORTS) {
		const page = await browser.newPage();
		await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
		await stubExternals(page);
		const r = { bp, w, h, ok: false, deck: null, pane: null, deck_state: null, error: null, shot: `${bp}.png` };
		try {
			await page.goto(`http://127.0.0.1:${PORT}/lattice/playground/`, { waitUntil: 'networkidle0', timeout: 45000 });
			await new Promise((res) => setTimeout(res, 3500)); // chrome hydrate + engine load
			r.deck = await loadFirstGallery(page);
			r.pane = await paneState(page);
			r.deck_state = await waitForDeck(page);
			const paneOk = r.pane.tab === 'preview' && r.pane.body === 'preview';
			const painted = !!(r.deck_state?.visible && r.deck_state.sections > 0);
			const scaledOk = !!r.deck_state?.scaled;
			r.ok = paneOk && painted && scaledOk;
			if (!paneOk) r.error = `pane desync — tab="${r.pane.tab}" body[data-pane]="${r.pane.body}" (both must be "preview")`;
			else if (!painted) r.error = `the preview never revealed — ${JSON.stringify(r.deck_state)} (the deck is rendered into a hidden / zero-width pane)`;
			else if (!scaledOk) r.error = `revealed but slides weren't scaled to fit — ${JSON.stringify(r.deck_state)}`;
		} catch (e) {
			r.error = e.message;
		}
		// Always screenshot — pass for evidence, fail for the issue.
		try {
			await page.screenshot({ path: path.join(OUT, r.shot), fullPage: false });
		} catch {
			/* screenshot best-effort */
		}
		results.push(r);
		console.log(`${r.ok ? '✓' : '✗'} ${bp}: ${r.ok ? `"${r.deck}" rendered (${r.deck_state.sections} slides)` : r.error}`);
		await page.close();
	}

	await browser.close();
	server.close();

	const failed = results.filter((r) => !r.ok);

	// Always emit machine-readable results; emit a rich report only on failure.
	fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ failed: failed.length, results }, null, 2));

	if (failed.length) {
		const md = [
			'## Playground gallery preview does not render',
			'',
			`The nightly browser e2e found **${failed.length} of ${results.length}** viewport(s) where loading a gallery from Edit view fails to show the rendered deck.`,
			'',
			...failed.flatMap((r) => [
				`### ${r.bp} (${r.w}×${r.h}) — ❌`,
				'',
				`- **Problem:** ${r.error}`,
				`- **Observed:** tab=\`${r.pane?.tab}\`, body[data-pane]=\`${r.pane?.body}\`, iframe=\`${JSON.stringify(r.deck_state)}\`, gallery=\`${r.deck}\``,
				'',
				'**Steps to reproduce**',
				'',
				reproSteps(r.bp, r.w, r.h),
				'',
				`_Screenshot: \`${r.shot}\`_`,
				'',
			]),
			'---',
			'',
			'_Filed automatically by `preview-e2e-nightly`. Root cause is usually the preview pane being hidden when the render fires — `body[data-pane]` must follow the active tab (see `docs/src/components/playground/PlaygroundApp.tsx`). Reproduce locally with `cd docs && npm run build && npm run check:preview`._',
			'',
		].join('\n');
		fs.writeFileSync(path.join(OUT, 'report.md'), md);
		console.error(`\n✗ ${failed.length} viewport(s) failed. Report + screenshots written to ${OUT}`);
		process.exit(1);
	}

	console.log(`\n✓ playground gallery preview renders — ${results.length} viewport(s) load a gallery, switch to Preview, and paint the deck.`);
}

main().catch((e) => {
	console.error('check-preview-render error:', e.message);
	process.exit(1);
});
