// The Drawing Board — export (Phase 1, Slice 4 + the Phase-1-fixes rasterizer).
//
// Fidelity, honestly (the proposal's §6):
//   - Markdown : perfect — it is the source.
//   - PDF      : one-click image PDF — each rendered slide rasterized to a 2x PNG
//                and placed one-per-page via jsPDF. No print dialog. Trade-off:
//                text is an image, not selectable/searchable. For vector +
//                selectable text use "Print" (the browser's own PDF engine).
//   - PPTX     : image-slides — the same 2x PNGs, full-bleed via PptxGenJS.
//   - Print    : the browser print path — true vector, selectable, but a dialog.
//
// Rasterization uses html-to-image (toPng): it clones the slide, inlines the
// computed styles AND embeds the web fonts (follows the engine CSS's @import of
// Google Fonts, fetching + inlining the files), then renders to a 2x canvas.
//
// IMPORTANT: do NOT pass a `backgroundColor` — a forced white overrides the
// solid dark canvas of the title/closing/divider slides
// (section.title { background: var(--bg-dark) }), turning them white. Each slide
// paints its own background, so we let it. (Gradient-backed dark slides happened
// to survive the white because a background-image paints over background-color;
// solid-colour ones did not — hence title/closing went white on Cuoio.)
//
// jspdf / pptxgenjs / html-to-image are lazy-imported (own chunks).

import { embedComponentsInMarkdown } from './layout-core.generated.js';

function safeName(name) {
	return (name || 'deck').trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'deck';
}

// ── Provenance metadata ───────────────────────────────────────────────────────
// The marp-core and lattice-engine outputs are pixel-identical by design (the
// engine delegates CSS theme-packing to marp's packer), so two exports are
// byte-identical apart from the writer's random PDF /ID — indistinguishable by
// eye OR by diff. Stamping each export with which engine + build produced it is
// the only way to tell them apart after the fact. FNV-1a over the deck source
// gives a short, dependency-free provenance hash so a PDF can be tied back to a
// specific markdown.
function shortHash(str) {
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return (h >>> 0).toString(16).padStart(8, '0');
}

function engineLabel(engine) {
	return engine === 'lattice' ? 'lattice-engine' : 'marp-core';
}

// Derive the human-readable summary + machine-parseable keyword string the
// exporters write into standard PDF/PPTX document properties. (jsPDF exposes no
// public custom-/Info-key API, so the structured fields ride in `keywords`,
// which every viewer surfaces under Document Properties.)
function provenance(meta, slides) {
	const m = meta || {};
	const eng = engineLabel(m.engine);
	const ver = m.version ? `Lattice ${m.version}` : 'Lattice';
	const build = m.build ? ` (build ${m.build})` : '';
	const theme = m.palette ? `${m.palette}/${m.mode || 'light'}` : '';
	const src = m.source ? shortHash(m.source) : '';
	const summary =
		`Rendered by ${eng} · ${ver}${build}` +
		(theme ? ` · theme ${theme}` : '') +
		(slides ? ` · ${slides} slide${slides === 1 ? '' : 's'}` : '');
	const keywords = [
		`engine=${eng}`,
		m.version && `lattice=${m.version}`,
		m.build && `build=${m.build}`,
		m.palette && `theme=${m.palette}`,
		m.mode && `mode=${m.mode}`,
		slides && `slides=${slides}`,
		src && `src=${src}`,
	]
		.filter(Boolean)
		.join('; ');
	return { eng, summary, keywords };
}

function download(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Markdown ────────────────────────────────────────────────────────────────
// Self-contained embed for a Workbench *library* theme (export bridge — see
// engineering/decisions/2026-06-11-workbench-export-bridge.md). A library theme
// isn't registered in marp.config.js themeSet, so a bare `theme:<name>` directive
// renders palette-less for a CLI consumer. We keep the directive (a Drawing Board
// re-import resolves the theme by name) AND inline the saved CSS — which already
// carries `@import 'lattice';` — as a Marp global <style> right after the front
// matter, so a lattice-configured marp-cli run styles correctly off the block
// even when the directive name is unknown to it. Pure + DOM-free → unit-tested.
// `theme` is { name, css } for a library theme, or null/undefined for a built-in
// (whose `theme:` resolves from themeSet — nothing to embed).
export function embedThemeInMarkdown(source, theme) {
	const src = String(source || '');
	if (!theme?.css) return src;
	const block =
		'<style>\n' +
		'/* Lattice Workbench — embedded theme "' +
		String(theme.name || 'theme') +
		'" (self-contained: this deck keeps its palette\n' +
		'   even where the theme is not installed). Generated on export. */\n' +
		String(theme.css).trim() +
		'\n</style>\n';
	// Place the block just after the front matter (or at the top if there is none),
	// blank-line-separated so it reads as its own Marp directive scope.
	const fm = /^(---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$))/.exec(src);
	if (fm) return src.slice(0, fm[0].length) + '\n' + block + '\n' + src.slice(fm[0].length);
	return block + '\n' + src;
}

// `components` is the array of referenced library components ({ name, css }) the
// deck uses — vendored as global <style> blocks so the exported .md renders them
// across all three engine paths (the component bridge; see
// engineering/decisions/2026-06-12-workbench-component-bridge.md). Pairs with the
// theme embed: theme first, then components, both self-contained.
export function exportMarkdown(source, name, theme, components) {
	let md = embedThemeInMarkdown(source, theme);
	md = embedComponentsInMarkdown(md, components);
	download(new Blob([md], { type: 'text/markdown;charset=utf-8' }), safeName(name) + '.md');
}

async function sectionsOf(frame) {
	const doc = frame?.contentDocument;
	if (!doc) throw new Error('Preview not ready yet.');
	const sections = doc.querySelectorAll('.marpit>section');
	if (!sections.length) throw new Error('Nothing to export yet.');
	try { await doc.fonts.ready; } catch (_e) { /* fonts best-effort */ }
	return sections;
}

// Rasterize one rendered slide to a 2x PNG data URL (fonts embedded).
async function rasterizeSection(section) {
	const { toPng } = await import('html-to-image');
	// Bookend slides (title/closing/divider) carry an inert `border-image-source`
	// (the spectrum) with `border-top:none` — invisible in the browser, but
	// html-to-image inlines the computed border-image and fills it across the
	// whole slide, burying the dark canvas. Neutralize it on the LIVE node (so the
	// computed value html-to-image copies is `none`) ONLY where the border is
	// effectively absent — content slides keep their real spectrum ribbon — then
	// restore. The change is invisible in the preview (the border was already 0).
	const cs = getComputedStyle(section);
	const borderless = parseFloat(cs.borderTopWidth) === 0 || cs.borderTopStyle === 'none';
	const prevBorderImage = section.style.borderImageSource;
	if (borderless && cs.borderImageSource !== 'none') section.style.borderImageSource = 'none';
	// The preview sets content-visibility:auto on slides (virtualization), which
	// leaves off-screen sections unrendered. Force this one visible so
	// html-to-image rasterizes a laid-out slide, then restore.
	const prevCV = section.style.contentVisibility;
	section.style.contentVisibility = 'visible';
	try {
		return await toPng(section, {
			width: 1280,
			height: 720,
			pixelRatio: 2,
			cacheBust: true,
			// transform:none undoes the live FIT scale; no backgroundColor (see header).
			style: { transform: 'none', margin: '0', boxShadow: 'none', outline: 'none', borderRadius: '0' },
			filter: (n) => !(n.classList?.contains('db-active')),
		});
	} finally {
		section.style.borderImageSource = prevBorderImage;
		section.style.contentVisibility = prevCV;
	}
}

// ── PDF (one-click image PDF) ─────────────────────────────────────────────────
export async function exportPdf(frame, name, onStatus, meta) {
	const sections = await sectionsOf(frame);
	if (onStatus) onStatus('Preparing PDF…');
	const { jsPDF } = await import('jspdf');
	const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720], compress: true });
	const { eng, summary, keywords } = provenance(meta, sections.length);
	pdf.setProperties({
		title: (name || 'deck').trim(),
		subject: summary,
		author: 'Lattice Drawing Board',
		keywords,
		creator: `Lattice · ${eng}`,
	});
	for (let i = 0; i < sections.length; i++) {
		if (onStatus) onStatus('Rendering slide ' + (i + 1) + ' of ' + sections.length + '…');
		const png = await rasterizeSection(sections[i]);
		if (i > 0) pdf.addPage([1280, 720], 'landscape');
		pdf.addImage(png, 'PNG', 0, 0, 1280, 720);
	}
	pdf.save(safeName(name) + '.pdf');
}

// ── PPTX (image-slides) ───────────────────────────────────────────────────────
export async function exportPptx(frame, name, onStatus, meta) {
	const sections = await sectionsOf(frame);
	if (onStatus) onStatus('Preparing PowerPoint…');
	const { default: PptxGenJS } = await import('pptxgenjs');
	const pptx = new PptxGenJS();
	const { eng, summary } = provenance(meta, sections.length);
	pptx.title = (name || 'deck').trim();
	pptx.subject = summary;
	pptx.author = 'Lattice Drawing Board';
	pptx.company = `Lattice · ${eng}`;
	pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5in, 16:9 — matches the 1280x720 box
	for (let i = 0; i < sections.length; i++) {
		if (onStatus) onStatus('Rendering slide ' + (i + 1) + ' of ' + sections.length + '…');
		const png = await rasterizeSection(sections[i]);
		pptx.addSlide().addImage({ data: png, x: 0, y: 0, w: '100%', h: '100%' });
	}
	if (onStatus) onStatus('Building .pptx…');
	await pptx.writeFile({ fileName: safeName(name) + '.pptx' });
}

// ── Print (vector, selectable — the browser's own PDF engine) ─────────────────
export function exportPrint(frame, meta) {
	const win = frame?.contentWindow;
	if (!win) throw new Error('Preview not ready yet.');
	// Chromium's print-to-PDF carries only one document-property field we can set:
	// the title (it hard-sets Producer/Creator itself). Encode the engine into it
	// so a vector Print PDF is still tellable apart — it also becomes the suggested
	// filename in the dialog, which is the behaviour authors expect.
	const doc = frame.contentDocument;
	if (doc && meta) doc.title = `${(meta.deck || 'deck').trim()} · ${engineLabel(meta.engine)}`;
	win.focus();
	win.print();
}
