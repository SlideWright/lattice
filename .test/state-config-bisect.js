// Test: which mermaid.initialize option breaks the state diagram?
const fs=require("fs"), path=require("path"), pp=require("puppeteer");
const ROOT=path.resolve(__dirname,"..");
const M=fs.readFileSync(path.join(ROOT,"node_modules/mermaid/dist/mermaid.min.js"),"utf8");

const STATE_SRC = `stateDiagram-v2
  [*] --> Open
  Open --> Closed
  Closed --> [*]`;

const CONFIGS = [
  { label: "minimal",                     cfg: { startOnLoad: false, theme: "base" } },
  { label: "+securityLevel:loose",        cfg: { startOnLoad: false, theme: "base", securityLevel: "loose" } },
  { label: "+layout:tidy-tree",           cfg: { startOnLoad: false, theme: "base", securityLevel: "loose", layout: "tidy-tree" } },
  { label: "+htmlLabels",                 cfg: { startOnLoad: false, theme: "base", securityLevel: "loose", layout: "tidy-tree", htmlLabels: true } },
  { label: "+markdownAutoWrap:false",     cfg: { startOnLoad: false, theme: "base", securityLevel: "loose", layout: "tidy-tree", htmlLabels: true, markdownAutoWrap: false } },
  { label: "+flowchart.useMaxWidth:false",cfg: { startOnLoad: false, theme: "base", securityLevel: "loose", layout: "tidy-tree", htmlLabels: true, markdownAutoWrap: false, flowchart: { useMaxWidth: false, htmlLabels: true, padding: 15, wrappingWidth: 480 } } },
  { label: "full-runtime-config",         cfg: { startOnLoad: false, theme: "base", securityLevel: "loose", layout: "tidy-tree", htmlLabels: true, markdownAutoWrap: false, flowchart: { useMaxWidth: false, htmlLabels: true, padding: 15, subGraphTitleMargin: { top: 10, bottom: 100 }, wrappingWidth: 480 } } },
];

async function test(label, cfg) {
  const b = await pp.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setRequestInterception(true);
  p.on("request", r => { if (r.url().startsWith("http")) r.abort(); else r.continue(); });
  let runErr = null, pageErr = null;
  p.on("pageerror", e => pageErr = e.message.slice(0, 200));
  p.on("console", m => {
    if (m.type() === "log" && m.text().startsWith("RUN")) console.log("    " + m.text().slice(0, 300));
  });
  const html = `<!doctype html><html><body>
<div class="mermaid">${STATE_SRC}</div>
<script>${M}</script>
<script>
(async()=>{
  window.mermaid.initialize(${JSON.stringify(cfg)});
  try {
    await window.mermaid.run({ querySelector: ".mermaid", suppressErrors: false });
    console.log("RUN ok");
  } catch (e) {
    console.log("RUN ERR " + e.message.slice(0,200));
  }
})();
</script></body></html>`;
  await p.setContent(html, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 1500));
  const ok = await p.evaluate(() => !!document.querySelector(".mermaid svg"));
  console.log(`${ok ? "✓" : "✗"} ${label} (pageErr: ${pageErr || "none"})`);
  await b.close();
}

(async () => {
  for (const c of CONFIGS) {
    await test(c.label, c.cfg);
  }
})();
