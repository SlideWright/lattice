const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// CLI args: node screenshot-slides.js [html-path] [out-dir]
const htmlFile = process.argv[2] || '/tmp/lattice-out.html';
const outDir   = process.argv[3] || '/tmp/lattice-slides';

// Try to find puppeteer in multiple locations
function loadPuppeteer() {
  const tryPaths = ['puppeteer', 'puppeteer-core'];
  try {
    const globalRoot = require('child_process')
      .execSync('npm root -g', { stdio: ['pipe','pipe','ignore'] }).toString().trim();
    if (globalRoot) tryPaths.push(path.join(globalRoot, '@mermaid-js', 'mermaid-cli', 'node_modules', 'puppeteer'));
  } catch(_) {}
  tryPaths.push(path.join(__dirname, '..', 'Workspace', 'Lattice', 'node_modules', '.pnpm', 'puppeteer@21.11.0', 'node_modules', 'puppeteer'));
  for (const p of tryPaths) {
    try { return require(p); } catch(_) {}
  }
  throw new Error('puppeteer not found');
}

(async () => {
  const pup = loadPuppeteer();
  const browser = await pup.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const htmlPath = `file://${path.resolve(htmlFile)}`;
  await page.goto(htmlPath, { waitUntil: 'networkidle0', timeout: 30000 });

  const sections = await page.$$('section');
  console.log(`Found ${sections.length} sections`);

  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < sections.length; i++) {
    const num = String(i + 1).padStart(3, '0');
    const outPath = path.join(outDir, `${num}.png`);
    const box = await sections[i].boundingBox();
    if (!box) { console.log(`  slide ${num}: no bounding box, skipping`); continue; }
    await page.screenshot({
      path: outPath,
      clip: { x: box.x, y: box.y, width: 1280, height: 720 }
    });
    console.log(`  slide ${num} → ${outPath}`);
  }

  await browser.close();
  console.log('Done');
})();
