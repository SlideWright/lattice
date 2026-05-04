/**
 * Real-world runtime test: takes a deck through marp-cli (the same
 * pipeline the VS Code Marp extension uses for `--html` export) and
 * loads the result in headless Chrome with mermaid.min.js +
 * lattice-runtime.js, exactly as the live preview / standalone HTML
 * does. We then assert every fence renders to SVG and survives both
 * a section replacement (Marp's edit pattern) and an in-place fence
 * text edit.
 *
 * Two wrapper styles are tested by post-processing the marp-cli HTML:
 *   1. plain <pre><code class="language-mermaid"> — what marp-cli emits
 *      and what `--html` export produces.
 *   2. <marp-pre><code class="language-mermaid"> — what the VS Code
 *      Marp extension preview emits via its custom-element renderer.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const puppeteer = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");

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

function buildDeck() {
  const slides = FIXTURES.map(f => `<!-- _class: diagram -->

### ${f.id}

\`\`\`mermaid
${f.body}
\`\`\`

---
`).join("\n");

  return `---
marp: true
theme: indaco
paginate: true
---

# Test deck

---

${slides}

# End
`;
}

function buildDeckMd() {
  const tmpMd = path.join("/tmp", "rt-deck.md");
  fs.writeFileSync(tmpMd, buildDeck());
  return tmpMd;
}

function runMarp(mdPath, outPath) {
  execFileSync("npx", ["marp", "--html", mdPath, "-o", outPath], {
    cwd: ROOT,
    stdio: "pipe",
  });
}

function injectRuntime(html, wrapperKind) {
  // Convert plain <pre><code class="language-mermaid"> into <marp-pre>
  // when simulating the VS Code preview.
  if (wrapperKind === "marp-pre") {
    html = html.replace(
      /<pre><code class="language-mermaid">/g,
      '<marp-pre is="marp-pre"><code class="language-mermaid">'
    );
    html = html.replace(/<\/code><\/pre>/g, '</code></marp-pre>');
  }
  // Tag each diagram fence's enclosing <section> so we can address it.
  // Marp emits: <section ... ><h2 id="...">title</h2>...
  // We rely on the heading slug for addressing.

  // Inject mermaid + runtime before </body>.
  const mermaidPath = path.join(ROOT, "node_modules/mermaid/dist/mermaid.min.js");
  const runtimePath = path.join(ROOT, "lattice-runtime.js");
  const inject = `
<script>${fs.readFileSync(mermaidPath, "utf8")}</script>
<script>${fs.readFileSync(runtimePath, "utf8")}</script>
`;
  return html.replace("</body>", `${inject}</body>`);
}

async function snapshot(page) {
  return await page.evaluate(() => {
    // Each diagram slide has an h3 with the fixture id; collect SVG state per slide.
    const result = [];
    for (const sec of document.querySelectorAll("section")) {
      const h3 = sec.querySelector("h3");
      if (!h3) continue;
      const id = h3.textContent.trim();
      const svg = sec.querySelector("svg");
      result.push({
        id,
        hasSvg: !!svg,
        svgChildren: svg ? svg.children.length : 0,
        upgraded: !!sec.querySelector(".mermaid[data-ll-mermaid-upgraded='1']"),
        processed: !!sec.querySelector(".mermaid[data-processed]"),
        fenceCount: sec.querySelectorAll("code.language-mermaid, .mermaid").length,
      });
    }
    return result;
  });
}

async function waitRendered(page, expectedIds, timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const snap = await snapshot(page);
    const byId = Object.fromEntries(snap.map(r => [r.id, r]));
    const all = expectedIds.every(id => byId[id] && byId[id].hasSvg && byId[id].svgChildren > 0);
    if (all) return snap;
    await new Promise(r => setTimeout(r, 100));
  }
  return await snapshot(page);
}

function reportSnap(label, snap, expected) {
  const byId = Object.fromEntries(snap.map(r => [r.id, r]));
  const ok = expected.filter(id => byId[id] && byId[id].hasSvg && byId[id].svgChildren > 0).length;
  const total = expected.length;
  const status = ok === total ? "✓" : "✗";
  console.log(`  ${status} ${label}: ${ok}/${total}`);
  if (ok < total) {
    for (const id of expected) {
      const r = byId[id] || { hasSvg: false, svgChildren: 0 };
      if (!(r.hasSvg && r.svgChildren > 0)) {
        console.log(`      - ${id}: ${JSON.stringify(r)}`);
      }
    }
  }
  return ok === total;
}

(async () => {
  const mdPath = buildDeckMd();
  const baseHtmlPath = "/tmp/rt-deck.html";
  runMarp(mdPath, baseHtmlPath);
  const baseHtml = fs.readFileSync(baseHtmlPath, "utf8");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const failures = [];

  for (const wrapperKind of ["pre", "marp-pre"]) {
    console.log(`\n[wrapper: ${wrapperKind}]`);
    const html = injectRuntime(baseHtml, wrapperKind);
    const page = await browser.newPage();
    page.on("pageerror", e => console.log("  pageerror:", e.message.slice(0, 240)));
    page.on("console", m => {
      const t = m.type();
      if (t === "error") console.log("  console.error:", m.text().slice(0, 240));
    });

    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const expected = FIXTURES.map(f => f.id);

    // Scenario 1: cold load.
    let snap = await waitRendered(page, expected);
    if (!reportSnap("cold load", snap, expected)) failures.push(`${wrapperKind}/cold-load`);

    // Scenario 2: simulate a Marp re-render of the flowchart slide
    // (replace the entire <section>'s innerHTML with a fresh fence).
    await page.evaluate((wrapperKind) => {
      const sections = [...document.querySelectorAll("section")];
      const target = sections.find(s => s.querySelector("h3")?.textContent.trim() === "flowchart");
      if (!target) return;
      const fresh = wrapperKind === "marp-pre"
        ? `<h3>flowchart</h3><marp-pre is="marp-pre"><code class="language-mermaid">flowchart TB\n  X --> Y\n  Y --> Z</code></marp-pre>`
        : `<h3>flowchart</h3><pre><code class="language-mermaid">flowchart TB\n  X --> Y\n  Y --> Z</code></pre>`;
      target.innerHTML = fresh;
    }, wrapperKind);

    snap = await waitRendered(page, expected);
    if (!reportSnap("section innerHTML replace", snap, expected)) failures.push(`${wrapperKind}/innerHTML-replace`);

    // Scenario 3: in-place text edit on the surviving sequence diagram.
    await page.evaluate((wrapperKind) => {
      const sections = [...document.querySelectorAll("section")];
      const target = sections.find(s => s.querySelector("h3")?.textContent.trim() === "sequence");
      if (!target) return;
      // The runtime turned the original code fence into a .mermaid div.
      // Marp's edit pattern replaces the fence wrapper with a new one.
      const div = target.querySelector(".mermaid");
      const code = target.querySelector("code.language-mermaid");
      const newSrc = "sequenceDiagram\n  A->>B: edited\n  B-->>A: ok";
      if (code) {
        // Surviving original fence — patch text.
        code.textContent = newSrc;
      } else if (div) {
        // Already upgraded — replace the .mermaid div with a fresh fence.
        const fresh = wrapperKind === "marp-pre"
          ? `<marp-pre is="marp-pre"><code class="language-mermaid">${newSrc}</code></marp-pre>`
          : `<pre><code class="language-mermaid">${newSrc}</code></pre>`;
        div.outerHTML = fresh;
      }
    }, wrapperKind);

    snap = await waitRendered(page, expected);
    if (!reportSnap("in-place edit (sequence)", snap, expected)) failures.push(`${wrapperKind}/inplace-edit`);

    const editedVisible = await page.evaluate(() => {
      const sections = [...document.querySelectorAll("section")];
      const target = sections.find(s => s.querySelector("h3")?.textContent.trim() === "sequence");
      if (!target) return false;
      const txt = target.querySelector("svg")?.textContent ?? "";
      return txt.includes("edited");
    });
    console.log(`  ${editedVisible ? "✓" : "✗"} edited source rendered: ${editedVisible}`);
    if (!editedVisible) failures.push(`${wrapperKind}/edit-stale`);

    await page.close();
  }

  await browser.close();

  if (failures.length > 0) {
    console.log(`\n${failures.length} failure(s):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("\nAll runtime scenarios passed.");
})();
