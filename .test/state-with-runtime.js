// Minimum repro: section.diagram + lattice.css + indaco.css + the runtime + state diagram
const fs=require("fs"), path=require("path"), pp=require("puppeteer");
const ROOT=path.resolve(__dirname,"..");
const M=fs.readFileSync(path.join(ROOT,"node_modules/mermaid/dist/mermaid.min.js"),"utf8");
const R=fs.readFileSync(path.join(ROOT,"lattice-runtime.js"),"utf8");
const L=fs.readFileSync(path.join(ROOT,"lattice.css"),"utf8");
const I=fs.readFileSync(path.join(ROOT,"themes/indaco.css"),"utf8");

const STATE_SRC = `stateDiagram-v2
  [*] --> Open
  Open --> Closed
  Closed --> [*]`;

(async () => {
  const b = await pp.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setRequestInterception(true);
  p.on("request", r => { if (r.url().startsWith("http")) r.abort(); else r.continue(); });
  p.on("pageerror", e => console.log("pageerror:", e.message.slice(0,300)));
  p.on("console", async (m) => {
    if (m.type() === "log") {
      try {
        const args = await Promise.all(m.args().map(a => a.evaluate(x => typeof x === "object" && x ? JSON.stringify(x) : String(x))));
        console.log("[page]", args.join(" "));
      } catch { console.log("[page]", m.text()); }
    }
  });

  // Replace mermaid.run with a logging wrapper to see exactly what's called.
  const html = `<!doctype html><html><head><style>${L}</style><style>${I}</style></head>
<body>
<section class="diagram"><h2>state</h2>
<pre><code class="language-mermaid">${STATE_SRC}</code></pre>
</section>
<script>${M}</script>
<script>
const _origRun = window.mermaid.run.bind(window.mermaid);
window.mermaid.run = async (opts) => {
  console.log("mermaid.run called with:", JSON.stringify({
    nodeCount: opts.nodes ? opts.nodes.length : null,
    nodeTexts: opts.nodes ? opts.nodes.map(n => n.textContent.slice(0,40)) : null,
    selector: opts.querySelector || null,
    suppressErrors: opts.suppressErrors,
  }));
  try {
    const r = await _origRun(opts);
    console.log("mermaid.run resolved");
    return r;
  } catch (e) {
    console.log("mermaid.run threw:", e.message);
    throw e;
  }
};
</script>
<script>${R}</script>
</body></html>`;

  await p.setContent(html, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 3000));
  const result = await p.evaluate(() => {
    const sec = document.querySelector("section.diagram");
    const block = sec.querySelector(".mermaid-block");
    const merm = block?.querySelector(":scope > .mermaid");
    const code = block?.querySelector(":scope > :is(pre, marp-pre) > code");
    return {
      hasMermBlock: !!block,
      state: block?.dataset.state,
      hasSvg: !!merm?.querySelector("svg"),
      sourceFirstLine: (code?.textContent || "").split("\n").slice(0, 1).join(""),
      errorMsg: block?.querySelector(".mermaid-error-msg")?.textContent,
    };
  });
  console.log("FINAL:", JSON.stringify(result, null, 2));
  await b.close();
})();
