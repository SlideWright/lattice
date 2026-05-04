/**
 * Runtime harness — exercises lattice-runtime.js the way the VS Code
 * Marp extension and `marp-cli --html` actually drive it.
 *
 * The harness builds a synthetic page whose DOM matches what those
 * environments emit (sections containing `<marp-pre><code class="language-mermaid">`
 * and `<pre><code class="language-mermaid">` fences). It then drives the
 * page through three scenarios that the human user runs into in practice:
 *
 *   1. Cold load — every fence must render to SVG.
 *   2. Section replacement — Marp's behaviour on most edits: a single
 *      <section> is replaced with a fresh one. Other sections must keep
 *      their already-rendered SVGs; the new section must render.
 *   3. In-place text edit — Marp's behaviour on small edits inside a
 *      surviving section: the existing <code>'s textContent is changed.
 *      The diagram must re-render with the new source.
 *
 * Run with:  node .test/runtime-harness.js
 */
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const MERMAID_JS = fs.readFileSync(path.join(ROOT, "node_modules/mermaid/dist/mermaid.min.js"), "utf8");
const RUNTIME_JS = fs.readFileSync(path.join(ROOT, "lattice-runtime.js"), "utf8");
const LATTICE_CSS = fs.readFileSync(path.join(ROOT, "lattice.css"), "utf8");
const INDACO_CSS  = fs.readFileSync(path.join(ROOT, "themes/indaco.css"), "utf8");

const FENCES = [
  { id: "flowchart", src: "flowchart LR\n  A --> B --> C" },
  { id: "sequence",  src: "sequenceDiagram\n  A->>B: hi\n  B-->>A: ok" },
  { id: "class",     src: "classDiagram\n  class Foo { +bar() }" },
  { id: "state",     src: "stateDiagram-v2\n  [*] --> Open\n  Open --> Closed\n  Closed --> [*]" },
  { id: "er",        src: "erDiagram\n  A ||--o{ B : has" },
  { id: "pie",       src: "pie\n  title Pie\n  \"a\" : 10\n  \"b\" : 5" },
  { id: "gantt",     src: "gantt\n  title Gantt\n  dateFormat YYYY-MM-DD\n  section S\n  T :a, 2025-01-01, 7d" },
  { id: "git",       src: "gitGraph\n  commit\n  commit" },
];

// Two wrapper styles. <marp-pre> matches the VS Code Marp extension
// (the extension's preview.css registers <marp-pre> as a custom element).
// <pre is="marp-pre"> matches `marp-cli --html` static export.
function fenceMarkup(idx, src, wrapperKind) {
  const escaped = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (wrapperKind === "marp-pre") {
    return `<marp-pre is="marp-pre" data-marpit-fence="${idx}"><code class="language-mermaid">${escaped}</code></marp-pre>`;
  }
  return `<pre is="marp-pre" data-auto-scaling="downscale-only"><code class="language-mermaid">${escaped}</code></pre>`;
}

function buildPage(wrapperKind) {
  const sections = FENCES.map((f, i) => `
    <section id="s-${f.id}" class="diagram" data-section-id="${f.id}">
      <h2>${f.id}</h2>
      ${fenceMarkup(i, f.src, wrapperKind)}
    </section>
  `).join("\n");

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<style id="lattice-css">${LATTICE_CSS}</style>
<style id="indaco-css">${INDACO_CSS}</style>
</head>
<body>
${sections}
<script>${MERMAID_JS}</script>
<script>${RUNTIME_JS}</script>
</body></html>`;
}

async function countRendered(page) {
  return await page.evaluate(() => {
    const result = {};
    for (const sec of document.querySelectorAll("section[data-section-id]")) {
      const id = sec.dataset.sectionId;
      const svg = sec.querySelector("svg");
      const upgraded = !!sec.querySelector(".mermaid[data-ll-mermaid-upgraded='1']");
      const processed = !!sec.querySelector(".mermaid[data-processed]");
      result[id] = {
        hasSvg: !!svg,
        svgHasContent: svg ? svg.children.length > 1 : false,
        upgraded,
        processed,
      };
    }
    return result;
  });
}

async function waitForAllRendered(page, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const counts = await countRendered(page);
    const all = Object.values(counts);
    if (all.length > 0 && all.every(c => c.hasSvg && c.svgHasContent)) return counts;
    await new Promise(r => setTimeout(r, 100));
  }
  return await countRendered(page);
}

function summarize(label, results) {
  const total = Object.keys(results).length;
  const ok = Object.values(results).filter(r => r.hasSvg && r.svgHasContent).length;
  const status = ok === total ? "✓" : "✗";
  console.log(`  ${status} ${label}: ${ok}/${total}`);
  if (ok < total) {
    for (const [id, r] of Object.entries(results)) {
      if (!(r.hasSvg && r.svgHasContent)) {
        console.log(`      - ${id}: hasSvg=${r.hasSvg} svgHasContent=${r.svgHasContent} upgraded=${r.upgraded} processed=${r.processed}`);
      }
    }
  }
  return ok === total;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const failures = [];

  for (const wrapperKind of ["marp-pre", "pre"]) {
    console.log(`\n[wrapper: ${wrapperKind}]`);
    const page = await browser.newPage();
    page.on("pageerror", e => console.log("  pageerror:", e.message.slice(0, 200)));
    page.on("console", async (m) => {
      const t = m.type();
      if (t !== "error" && t !== "warning") return;
      try {
        const args = await Promise.all(m.args().map(a => a.evaluate(x => {
          if (x instanceof Error) return `Error: ${x.message}\n${x.stack?.split("\n").slice(0,3).join(" | ")}`;
          if (typeof x === "object" && x !== null) return JSON.stringify(x).slice(0, 200);
          return String(x);
        })));
        console.log(`  ${t}:`, args.join(" ").slice(0, 400));
      } catch {
        console.log(`  ${t}:`, m.text().slice(0, 200));
      }
    });

    await page.setContent(buildPage(wrapperKind), { waitUntil: "domcontentloaded" });

    // Scenario 1: cold load
    let r1 = await waitForAllRendered(page);
    if (!summarize("cold load", r1)) failures.push(`${wrapperKind}/cold-load`);

    // Scenario 2: section replacement (Marp re-renders one section)
    await page.evaluate((wrapperKind) => {
      const sec = document.querySelector("#s-flowchart");
      const html = wrapperKind === "marp-pre"
        ? `<h2>flowchart-edited</h2><marp-pre is="marp-pre"><code class="language-mermaid">flowchart TB\n  X --> Y --> Z\n  Y --> W</code></marp-pre>`
        : `<h2>flowchart-edited</h2><pre is="marp-pre"><code class="language-mermaid">flowchart TB\n  X --> Y --> Z\n  Y --> W</code></pre>`;
      // Replace section via outerHTML — what Marp does on edit
      const fresh = document.createElement("section");
      fresh.id = "s-flowchart";
      fresh.className = "diagram";
      fresh.dataset.sectionId = "flowchart";
      fresh.innerHTML = html;
      sec.replaceWith(fresh);
    }, wrapperKind);

    let r2 = await waitForAllRendered(page);
    if (!summarize("section replacement", r2)) failures.push(`${wrapperKind}/section-replace`);

    // Scenario 3: in-place text edit (less common but happens)
    await page.evaluate((wrapperKind) => {
      // Find the surviving 'sequence' section and patch its code text.
      const sec = document.querySelector("#s-sequence");
      // Whatever the runtime turned it into (.mermaid div or original code), find a text source
      const code = sec.querySelector("code.language-mermaid");
      const div = sec.querySelector("div.mermaid");
      if (code) {
        code.textContent = "sequenceDiagram\n  A->>B: edited\n  B-->>A: ok";
      } else if (div) {
        // Simulate Marp re-rendering the section: replace the .mermaid div with a fresh marp-pre
        const html = wrapperKind === "marp-pre"
          ? `<marp-pre is="marp-pre"><code class="language-mermaid">sequenceDiagram\n  A->>B: edited\n  B-->>A: ok</code></marp-pre>`
          : `<pre is="marp-pre"><code class="language-mermaid">sequenceDiagram\n  A->>B: edited\n  B-->>A: ok</code></pre>`;
        div.outerHTML = html;
      }
    }, wrapperKind);

    let r3 = await waitForAllRendered(page);
    if (!summarize("in-place edit (sequence)", r3)) failures.push(`${wrapperKind}/in-place-edit`);

    // Also verify the EDITED source actually rendered (not the stale one).
    const seqText = await page.evaluate(() => {
      const sec = document.querySelector("#s-sequence");
      return sec ? sec.querySelector("svg")?.textContent ?? "" : "";
    });
    const editedRendered = seqText.includes("edited");
    console.log(`  ${editedRendered ? "✓" : "✗"} edited source visible in SVG: ${editedRendered}`);
    if (!editedRendered) failures.push(`${wrapperKind}/edit-source-stale`);

    await page.close();
  }

  await browser.close();

  if (failures.length > 0) {
    console.log(`\n${failures.length} scenario(s) failed:`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nAll scenarios passed.");
})();
