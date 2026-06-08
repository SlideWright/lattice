// The Drawing Board — export (Phase 1, Slice 4 + the Phase-1-fixes rasterizer).
//
// Fidelity, honestly (the proposal's §6):
//   - Markdown : perfect — it is the source.
//   - PDF      : one-click image PDF. Each rendered slide is rasterized to a
//                2x PNG with web fonts EMBEDDED (html-to-image follows the
//                engine CSS's @import of Google Fonts and inlines them), then
//                placed one-per-page via jsPDF. No print dialog. Trade-off:
//                text is an image, not selectable/searchable. For vector +
//                selectable text use "Print" (the browser's own PDF engine).
//   - PPTX     : image-slides — the same 2x font-embedded PNGs, full-bleed via
//                PptxGenJS. Editable container, non-editable content.
//   - Print    : the browser print path over the already-rendered preview —
//                true vector, selectable, highest fidelity, but a dialog.
//
// html-to-image / jspdf / pptxgenjs are all lazy-imported, so none loads unless
// the matching export is invoked.

function safeName(name) {
	return (name || 'deck').trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'deck';
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
export function exportMarkdown(source, name) {
	download(new Blob([source], { type: 'text/markdown;charset=utf-8' }), safeName(name) + '.md');
}

// ── Rasterize one rendered slide to a 2x PNG (web fonts embedded) ─────────────
// html-to-image clones the node, walks the document's stylesheets (incl. the
// engine CSS's `@import` of Google Fonts), fetches + inlines the font files, and
// renders to a canvas — so text uses the real fonts instead of falling back.
// `transform:none` undoes the live FIT scale; pixelRatio 2 keeps it crisp.
async function rasterizeSection(section) {
	const { toPng } = await import('html-to-image');
	return toPng(section, {
		width: 1280,
		height: 720,
		pixelRatio: 2,
		backgroundColor: '#ffffff',
		cacheBust: true,
		style: { transform: 'none', margin: '0', boxShadow: 'none', outline: 'none', borderRadius: '0' },
		filter: (n) => !(n.classList && n.classList.contains('db-active')),
	});
}

async function sectionsOf(frame) {
	const doc = frame && frame.contentDocument;
	if (!doc) throw new Error('Preview not ready yet.');
	const sections = doc.querySelectorAll('.marpit>section');
	if (!sections.length) throw new Error('Nothing to export yet.');
	try { await doc.fonts.ready; } catch (e) { /* fonts best-effort */ }
	return sections;
}

// ── PDF (one-click image PDF) ─────────────────────────────────────────────────
export async function exportPdf(frame, name, onStatus) {
	const sections = await sectionsOf(frame);
	if (onStatus) onStatus('Preparing PDF…');
	const { jsPDF } = await import('jspdf');
	const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1280, 720], compress: true });
	for (let i = 0; i < sections.length; i++) {
		if (onStatus) onStatus('Rendering slide ' + (i + 1) + ' of ' + sections.length + '…');
		const png = await rasterizeSection(sections[i]);
		if (i > 0) pdf.addPage([1280, 720], 'landscape');
		pdf.addImage(png, 'PNG', 0, 0, 1280, 720);
	}
	pdf.save(safeName(name) + '.pdf');
}

// ── PPTX (image-slides) ───────────────────────────────────────────────────────
export async function exportPptx(frame, name, onStatus) {
	const sections = await sectionsOf(frame);
	if (onStatus) onStatus('Loading PowerPoint export…');
	const { default: PptxGenJS } = await import('pptxgenjs');
	const pptx = new PptxGenJS();
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
// The preview iframe carries an `@media print` block (see writeFrame in
// drawing-board.astro) that un-scales each section to a full 1280x720 page and
// page-breaks between them; the user chooses "Save as PDF".
export function exportPrint(frame) {
	const win = frame && frame.contentWindow;
	if (!win) throw new Error('Preview not ready yet.');
	win.focus();
	win.print();
}
