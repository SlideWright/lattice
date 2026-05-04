/**
 * Detailed isolation test: load mermaid + the runtime, print exactly what
 * happens to each diagram fence.
 */
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const MERMAID_JS = fs.readFileSync(path.join(ROOT, "node_modules/mermaid/dist/mermaid.min.js"), "utf8");
const RUNTIME_JS = fs.readFileSync(path.join(ROOT, "lattice-runtime.js"), "utf8");
const LATTICE_CSS = fs.readFileSync(path.join(ROOT, "lattice.css"), "utf8");
const INDACO_CSS  = fs.readFileSync(path.join(ROOT, "themes/indaco.css"), "utf8");

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("pageerror:", e.message.slice(0, 400)));
  page.on("console", async (m) => {
    if (m.type() === "log") {
      try {
        const args = await Promise.all(m.args().map(a => a.evaluate(x =>
          x instanceof Error ? `Err: ${x.message}` : (typeof x === "object" && x ? JSON.stringify(x).slice(0, 400) : String(x))
        )));
        console.log("[page]", args.join(" "));
      } catch { console.log("[page]", m.text()); }
    }
  });

  // Build a page that reproduces the state failure deterministically.
  const html = `<!doctype html><html><head>
<style>${LATTICE_CSS}</style>
<style>${INDACO_CSS}</style>
</head>
<body>
<section class="diagram"><h2>state</h2>
<pre><code class="language-mermaid">stateDiagram-v2
  [*] --> Open
  Open --> Closed
  Closed --> [*]</code></pre>
</section>
<script>${MERMAID_JS}</script>
<script>
(async () => {
  // Call mermaid.run directly with the same options the runtime uses, capture errors.
  await new Promise(r => setTimeout(r, 200));
  const div = document.createElement("div");
  div.className = "mermaid";
  div.textContent = "stateDiagram-v2\\n  [*] --> Open\\n  Open --> Closed\\n  Closed --> [*]";
  document.body.appendChild(div);
  console.log("BEFORE configure");
  window.mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "loose",
    suppressErrorRendering: true,
    layout: "tidy-tree",
    htmlLabels: true,
    markdownAutoWrap: false,
  });
  console.log("AFTER configure, calling run with suppressErrors:true");
  try {
    await window.mermaid.run({ querySelector: ".mermaid", suppressErrors: true });
    console.log("RUN OK suppressErrors=true");
  } catch (e) { console.log("RUN THREW (suppressErrors=true):", e.message); }
  console.log("svg present:", !!document.querySelector(".mermaid svg"));
  console.log("data-processed:", document.querySelector(".mermaid").getAttribute("data-processed"));
  console.log("textContent:", document.querySelector(".mermaid").textContent.slice(0, 100));
})();
</script>
</body></html>`;

  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 4000));
  await browser.close();
})();
