/**
 * Direct mermaid render test — no runtime, no marp. Just check whether
 * Mermaid 11.14 itself can render each fixture diagram in headless Chrome.
 * If a fixture fails here, the runtime can't be expected to render it.
 */
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const MERMAID_JS = fs.readFileSync(path.join(ROOT, "node_modules/mermaid/dist/mermaid.min.js"), "utf8");

const FIXTURES = [
  { id: "flowchart", body: "flowchart LR\n  A --> B --> C" },
  { id: "sequence",  body: "sequenceDiagram\n  A->>B: hi\n  B-->>A: ok" },
  { id: "classd",    body: "classDiagram\n  class Foo { +bar() }" },
  { id: "state",     body: "stateDiagram-v2\n  [*] --> Open\n  Open --> Closed\n  Closed --> [*]" },
  { id: "er",        body: "erDiagram\n  A ||--o{ B : has" },
  { id: "pie",       body: "pie\n  title Sample\n  \"a\" : 10\n  \"b\" : 5" },
  { id: "gantt",     body: "gantt\n  title Sample\n  dateFormat YYYY-MM-DD\n  section S\n  T :a, 2025-01-01, 7d" },
  { id: "git",       body: "gitGraph\n  commit\n  commit" },
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("pageerror:", e.message.slice(0, 300)));
  page.on("console", async (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    try {
      const args = await Promise.all(m.args().map(a => a.evaluate(x =>
        x instanceof Error ? `Err: ${x.message}` : (typeof x === "object" ? JSON.stringify(x).slice(0,300) : String(x))
      )));
      console.log(`${m.type()}:`, args.join(" ").slice(0, 500));
    } catch { console.log(m.type(), m.text().slice(0,300)); }
  });

  const html = `<!doctype html><html><body>
${FIXTURES.map(f => `<div class="mermaid" id="m-${f.id}">${f.body}</div>`).join("\n")}
<script>${MERMAID_JS}</script>
</body></html>`;
  await page.setContent(html, { waitUntil: "domcontentloaded" });

  await page.evaluate(() => {
    return window.mermaid.run({ querySelector: ".mermaid", suppressErrors: false });
  }).catch(e => console.log("run error:", e.message.slice(0, 400)));

  // Wait for any async renders.
  await new Promise(r => setTimeout(r, 1500));

  const result = await page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll(".mermaid")) {
      const svg = el.querySelector("svg");
      out[el.id] = { hasSvg: !!svg, processed: el.dataset.processed === "true", text: svg ? svg.textContent.slice(0,80) : el.textContent.slice(0,80) };
    }
    return out;
  });
  for (const [id, r] of Object.entries(result)) {
    console.log(`${r.hasSvg ? "✓" : "✗"} ${id}: ${JSON.stringify(r)}`);
  }
  await browser.close();
})();
