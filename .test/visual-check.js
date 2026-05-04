// Render every diagram to its own PNG by extracting the SVG and screenshotting it
// in isolation against the brand background.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const pp = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const DECK = "examples/mermaid-gallery.md";
const WANT = ["journey","c4","architecture","sankey","packet","mindmap","timeline","radar"];

(async () => {
  const outDir = path.resolve(ROOT, ".test/visual");
  fs.mkdirSync(outDir, { recursive: true });
  const html = path.resolve(ROOT, "examples/mermaid-gallery.visual.html");
  spawnSync("npx", ["marp", DECK, "-o", html, "--html", "--allow-local-files"], { cwd: ROOT });

  const b = await pp.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setRequestInterception(true);
  p.on("request", r => { if (r.url().startsWith("http")) r.abort(); else r.continue(); });
  await p.goto("file://" + html, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 6000));

  // Extract <svg> outerHTML + the deck's section computed bg + section vars
  const data = await p.evaluate((WANT) => {
    const out = [];
    const sec0cs = getComputedStyle(document.querySelector("section"));
    const bg = sec0cs.backgroundColor;
    // Snapshot all custom properties as inline style for the wrapper.
    const vars = [];
    for (let i=0;i<sec0cs.length;i++) {
      const k = sec0cs.item(i);
      if (k.startsWith("--")) vars.push(k+":"+sec0cs.getPropertyValue(k).trim());
    }
    document.querySelectorAll("section").forEach((sec, idx) => {
      const block = sec.querySelector(".mermaid-block");
      const cont  = block ? block.querySelector(":scope > .mermaid") : sec.querySelector(".mermaid");
      if (!cont) return;
      const svg = cont.querySelector("svg");
      if (!svg) return;
      const codeEl = block?.querySelector(":scope > :is(pre, marp-pre) > code");
      const src = ((codeEl?.textContent || cont.textContent || "").trim().split("\n")[0] || "").toLowerCase();
      if (!WANT.some(w => src.includes(w))) return;
      out.push({ idx, src, svg: svg.outerHTML });
    });
    return { bg, vars: vars.join(";"), items: out };
  }, WANT);

  // Get full theme CSS so the standalone page renders identically.
  const themeCss = fs.readFileSync(path.join(ROOT,"themes/indaco.css"),"utf8");

  for (const it of data.items) {
    const standalone = `<!doctype html><html><head><style>${themeCss}\nbody{margin:0}section{padding:48px;width:1280px;height:auto}</style></head>
<body><section class="diagram" style="${data.vars}">${it.svg}</section></body></html>`;
    const fp = path.join(outDir, `${String(it.idx).padStart(2,"0")}-${it.src.replace(/[^a-z0-9]/g,"_").slice(0,30)}.html`);
    fs.writeFileSync(fp, standalone);
    await p.goto("file://"+fp, { waitUntil: "domcontentloaded" });
    await new Promise(r=>setTimeout(r,300));
    const sec = await p.$("section");
    const png = fp.replace(/\.html$/,".png");
    await sec.screenshot({ path: png });
    fs.unlinkSync(fp);
    console.log("→", path.basename(png));
  }
  await b.close();
  fs.unlinkSync(html);
})();
