// The Drawing Board — export (Phase 1, Slice 4). Markdown, PDF, PowerPoint.
//
// Fidelity, honestly (the proposal's §6):
//   - Markdown : perfect — it is the source.
//   - PDF      : high — the browser print path over the ALREADY-rendered preview
//                iframe (Mermaid/charts/KaTeX already laid out), one 1280x720
//                slide per page. Not byte-identical to the puppeteer/marp-cli
//                pipeline (no headless Chrome in the browser), but true vector.
//   - PPTX     : image-slides — each rendered slide rasterized to PNG (SVG
//                foreignObject -> canvas) and placed full-bleed via PptxGenJS.
//                Editable container, NON-editable content. Best-effort: web-font
//                text (incl. KaTeX math) and remote raster images are the known
//                soft spots; self-contained decks with Mermaid/native type fare
//                best. PptxGenJS is lazy-imported so it never loads unless used.

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

// ── PDF (browser print path) ─────────────────────────────────────────────────
// The preview iframe already carries an `@media print` block (see writeFrame in
// drawing-board.astro) that un-scales each section to a full 1280x720 page and
// page-breaks between them, so we just invoke the iframe's own print dialog —
// the user chooses "Save as PDF".
export function exportPdf(frame) {
	const win = frame?.contentWindow;
	if (!win) throw new Error('Preview not ready yet.');
	win.focus();
	win.print();
}

// ── PPTX (image-slides) ───────────────────────────────────────────────────────
async function rasterizeSection(section, css) {
	const W = 1280;
	const H = 720;
	const clone = section.cloneNode(true);
	clone.classList.remove('db-active');
	clone.removeAttribute('style'); // drop the live FIT transform / margins
	const xhtml = new XMLSerializer().serializeToString(clone);
	// An SVG whose foreignObject hosts the slide HTML + the engine stylesheet.
	// Rendering it through an <img> lets the browser lay it out, then we draw it
	// to a canvas and read PNG bytes.
	const body =
		'<div xmlns="http://www.w3.org/1999/xhtml" style="width:' + W + 'px;height:' + H + 'px;background:#fff;">' +
		'<style>' + css + '</style>' +
		'<div class="marpit">' + xhtml + '</div></div>';
	const svg =
		'<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '">' +
		'<foreignObject x="0" y="0" width="' + W + '" height="' + H + '">' + body + '</foreignObject></svg>';
	const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
	const img = new Image();
	await new Promise((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = () => reject(new Error('A slide could not be rasterized (remote image or blocked font).'));
		img.src = url;
	});
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, W, H);
	ctx.drawImage(img, 0, 0, W, H);
	return canvas.toDataURL('image/png'); // throws SecurityError if tainted (remote img)
}

export async function exportPptx(frame, name, onStatus) {
	const doc = frame?.contentDocument;
	if (!doc) throw new Error('Preview not ready yet.');
	const sections = doc.querySelectorAll('.marpit>section');
	if (!sections.length) throw new Error('Nothing to export yet.');
	// The frame's own <style> already carries SLIDE_BOX + the engine CSS, so the
	// foreignObject sizes + themes each section correctly.
	const css = Array.from(doc.querySelectorAll('style')).map((s) => s.textContent).join('\n');

	if (onStatus) onStatus('Loading PowerPoint export…');
	const { default: PptxGenJS } = await import('pptxgenjs');
	const pptx = new PptxGenJS();
	pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5in, 16:9 — matches the 1280x720 box

	for (let i = 0; i < sections.length; i++) {
		if (onStatus) onStatus('Rasterizing slide ' + (i + 1) + ' of ' + sections.length + '…');
		const png = await rasterizeSection(sections[i], css);
		const slide = pptx.addSlide();
		slide.addImage({ data: png, x: 0, y: 0, w: '100%', h: '100%' });
	}
	if (onStatus) onStatus('Building .pptx…');
	await pptx.writeFile({ fileName: safeName(name) + '.pptx' });
}
