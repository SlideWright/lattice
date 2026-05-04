const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await page.goto('file://' + path.resolve(__dirname, 'error-fixture.html'), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 12000));

  const stats = await page.evaluate(() => {
    const pres = [...document.querySelectorAll('pre[data-mermaid-state], marp-pre[data-mermaid-state]')];
    return pres.map(p => {
      const next = p.nextElementSibling;
      const target = next && next.classList.contains('mermaid') ? next : null;
      const errEl = target && target.nextElementSibling && target.nextElementSibling.classList.contains('mermaid-error')
        ? target.nextElementSibling : null;
      return {
        state: p.dataset.mermaidState,
        hasSvg: !!(target && target.querySelector('svg')),
        preVisible: getComputedStyle(p).display !== 'none',
        errorMsg: errEl?.querySelector('.mermaid-error-msg')?.textContent || null,
        errorLabel: errEl?.querySelector('.mermaid-error-label')?.textContent || null,
        errorDetail: errEl?.querySelector('.mermaid-error-detail')?.textContent?.slice(0, 80) || null,
      };
    });
  });
  console.log(JSON.stringify(stats, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
