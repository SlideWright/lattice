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
// computed styles AND embeds the web fonts, then renders to a 2x canvas. The
// fonts are NOT left to html-to-image's own collection (it chased the engine
// CSS's cross-origin Google-Fonts @import and lost a lazy-load race — off-screen
// slides rasterized before their faces finished loading, so e.g. a `finish:
// sketch` deck's Shantell body font dropped to a system fallback). Instead we
// pass a precomputed `fontEmbedCSS` of vendored, data-URI'd faces (font-embed.js)
// to every call, so each clone is self-contained and every font embeds.
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
	// Build the data-URI font sheet once, inject it into the preview doc, and wait
	// for every face — so off-screen slides (forced visible mid-loop) rasterize
	// with their fonts already resolved instead of racing the lazy loader.
	// Lazy-imported (its bundled .woff2 imports are not Node-loadable, so the pure
	// markdown kernels above stay unit-testable) — same split as jspdf/pptxgenjs.
	const { buildFontEmbedCss, ensureFontsLoaded } = await import('./font-embed.js');
	const fontEmbedCSS = await buildFontEmbedCss();
	await ensureFontsLoaded(doc, fontEmbedCSS);
	return { sections, fontEmbedCSS };
}

// The slide's true box (px) from its own layout, NOT a hardcoded 1280×720 — a
// `size: 4K` deck lays out a 3840×2160 section, and capturing it at 1280 cropped
// the export to the top-left ninth. `offsetWidth/Height` are the untransformed
// layout box (the FIT scale doesn't affect them); HD is the fallback.
function slideGeom(section) {
	const w = section?.offsetWidth || 1280;
	const h = section?.offsetHeight || 720;
	return { w, h };
}

// Rasterize one rendered slide to a PNG data URL at its native box. `fontEmbedCSS`
// (the vendored, data-URI'd faces) is handed to html-to-image so the clone embeds
// every font itself rather than chasing the cross-origin Google-Fonts @import.
async function rasterizeSection(section, fontEmbedCSS) {
	const { toPng } = await import('html-to-image');
	// The spectrum ribbon is a `border-top` whose `border-image-source` is a
	// linear-gradient. html-to-image inlines that computed border-image and
	// MIS-RENDERS it — filling the gradient across the whole element instead of
	// the border strip. So:
	//   - Bookend slides (title/closing/divider) carry the spectrum as an INERT
	//     border (`border-top:none`) over a solid canvas — html-to-image would
	//     fill it and bury the canvas. Just drop the border-image.
	//   - Content slides carry a REAL ~12px ribbon — left alone it fills the whole
	//     slide with rainbow, burying the content. Repaint it as a top background
	//     strip (html-to-image renders gradient BACKGROUNDS correctly) and make the
	//     now-blank border transparent. Layout is unchanged (the border keeps its
	//     width), so this is invisible in the preview and faithful in the export.
	const cs = getComputedStyle(section);
	const borderless = parseFloat(cs.borderTopWidth) === 0 || cs.borderTopStyle === 'none';
	const hasGradientBorder = cs.borderImageSource && cs.borderImageSource !== 'none';
	const prev = {
		borderImageSource: section.style.borderImageSource,
		borderTopColor: section.style.borderTopColor,
		backgroundImage: section.style.backgroundImage,
		backgroundRepeat: section.style.backgroundRepeat,
		backgroundPosition: section.style.backgroundPosition,
		backgroundSize: section.style.backgroundSize,
	};
	if (hasGradientBorder && borderless) {
		section.style.borderImageSource = 'none';
	} else if (hasGradientBorder) {
		const grad = cs.borderImageSource;
		const tw = cs.borderTopWidth;
		// Layer the ribbon gradient as a top strip OVER the slide's own background
		// (preserved — a canvas colour rides on background-color, untouched here; an
		// image canvas is kept as the second layer).
		const baseImg = cs.backgroundImage && cs.backgroundImage !== 'none' ? cs.backgroundImage : '';
		section.style.backgroundImage = baseImg ? `${grad}, ${baseImg}` : grad;
		section.style.backgroundRepeat = baseImg ? `no-repeat, ${cs.backgroundRepeat}` : 'no-repeat';
		section.style.backgroundPosition = baseImg ? `top left, ${cs.backgroundPosition}` : 'top left';
		section.style.backgroundSize = baseImg ? `100% ${tw}, ${cs.backgroundSize}` : `100% ${tw}`;
		section.style.borderImageSource = 'none';
		section.style.borderTopColor = 'transparent';
	}
	// The preview sets content-visibility:auto on slides (virtualization), which
	// leaves off-screen sections unrendered. Force this one visible so
	// html-to-image rasterizes a laid-out slide, then restore.
	const prevCV = section.style.contentVisibility;
	section.style.contentVisibility = 'visible';
	const { w, h } = slideGeom(section);
	// Cap the device-pixel multiplier so a 4K box (3840) rasterizes near its
	// native 3840 rather than a 7680 canvas that risks an OOM in the browser;
	// HD keeps the 2× retina capture it always had.
	const pixelRatio = w > 2048 ? 1 : 2;
	try {
		return await toPng(section, {
			width: w,
			height: h,
			pixelRatio,
			cacheBust: true,
			fontEmbedCSS,
			// transform:none undoes the live FIT scale; no backgroundColor (see header).
			style: { transform: 'none', margin: '0', boxShadow: 'none', outline: 'none', borderRadius: '0' },
			filter: (n) => !(n.classList?.contains('db-active')),
		});
	} finally {
		section.style.borderImageSource = prev.borderImageSource;
		section.style.borderTopColor = prev.borderTopColor;
		section.style.backgroundImage = prev.backgroundImage;
		section.style.backgroundRepeat = prev.backgroundRepeat;
		section.style.backgroundPosition = prev.backgroundPosition;
		section.style.backgroundSize = prev.backgroundSize;
		section.style.contentVisibility = prevCV;
	}
}

// ── PDF (one-click image PDF) ─────────────────────────────────────────────────
export async function exportPdf(frame, name, onStatus, meta) {
	const { sections, fontEmbedCSS } = await sectionsOf(frame);
	if (onStatus) onStatus('Preparing PDF…');
	const { jsPDF } = await import('jspdf');
	// The PAGE is a fixed physical size — the deck's aspect ratio at a canonical
	// 720pt height — NOT the pixel box. `@size` changes the RASTER resolution (a
	// 4K slide rasterizes to a 3840px PNG), not the page: a 4K page sized from the
	// pixel box would be 3840px → a ~71-inch sheet. So normalize the box to height
	// 720 (HD/standard already are; 4K scales 3840×2160→1280×720) and let the
	// native-resolution PNG embed at high DPI inside it. HD/standard pages are
	// unchanged; 4K now matches HD's page with a sharper image.
	const { w: boxW, h: boxH } = slideGeom(sections[0]);
	const PAGE_H = 720;
	const pageH = PAGE_H;
	const pageW = Math.round((boxW * PAGE_H) / boxH);
	const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [pageW, pageH], compress: true });
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
		const png = await rasterizeSection(sections[i], fontEmbedCSS);
		if (i > 0) pdf.addPage([pageW, pageH], 'landscape');
		pdf.addImage(png, 'PNG', 0, 0, pageW, pageH);
	}
	pdf.save(safeName(name) + '.pdf');
}

// ── PPTX (image-slides) ───────────────────────────────────────────────────────
export async function exportPptx(frame, name, onStatus, meta) {
	const { sections, fontEmbedCSS } = await sectionsOf(frame);
	if (onStatus) onStatus('Preparing PowerPoint…');
	const { default: PptxGenJS } = await import('pptxgenjs');
	const pptx = new PptxGenJS();
	const { eng, summary } = provenance(meta, sections.length);
	pptx.title = (name || 'deck').trim();
	pptx.subject = summary;
	pptx.author = 'Lattice Drawing Board';
	pptx.company = `Lattice · ${eng}`;
	pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5in, 16:9 — matches any 16:9 @size (HD/4K); the PNG full-bleeds it
	for (let i = 0; i < sections.length; i++) {
		if (onStatus) onStatus('Rendering slide ' + (i + 1) + ' of ' + sections.length + '…');
		const png = await rasterizeSection(sections[i], fontEmbedCSS);
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
