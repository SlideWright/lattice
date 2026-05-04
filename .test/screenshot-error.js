const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });
  await page.goto('file://' + path.resolve(__dirname, 'error-fixture.html'), { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 12000));
  // Screenshot first slide (the error one)
  await page.screenshot({ path: path.resolve(__dirname, 'error-state.png'), fullPage: false, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  console.log('Saved error-state.png');
  await browser.close();
})();
