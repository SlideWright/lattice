/* Quick verification: load marp-cli HTML in puppeteer and confirm
 * lattice-runtime.js wraps fences correctly and sets data-state. */
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await page.goto('file://' + path.resolve(__dirname, '..', 'examples', 'mermaid-gallery.html'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Give the runtime + mermaid CDN time to render
  await new Promise(r => setTimeout(r, 15000));

  const stats = await page.evaluate(() => {
    const pres = [...document.querySelectorAll('pre[data-mermaid-state], marp-pre[data-mermaid-state]')];
    const byState = {};
    for (const p of pres) {
      const s = p.dataset.mermaidState || 'unknown';
      byState[s] = (byState[s] || 0) + 1;
    }
    const fences = document.querySelectorAll('pre > code.language-mermaid, marp-pre > code.language-mermaid').length;
    const svgs = document.querySelectorAll('section.diagram > .mermaid > svg').length;
    const errors = [...document.querySelectorAll('.mermaid-error-msg')].map(e => e.textContent).slice(0, 3);
    const hljsSpans = document.querySelectorAll('pre[data-mermaid-state] code .hljs-keyword, pre[data-mermaid-state] code .hljs-section, marp-pre[data-mermaid-state] code .hljs-keyword, marp-pre[data-mermaid-state] code .hljs-section').length;
    return { totalPres: pres.length, byState, fences, svgs, errors, hljsSpans };
  });
  console.log(JSON.stringify(stats, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
