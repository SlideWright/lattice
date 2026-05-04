// Dump SVG class structure for each problem diagram type.
// Goal: extract the Mermaid 11 rendered class names so we can write
// pinpoint CSS overrides for indaco/cuoio.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const pp = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");

// Slides of interest from examples/mermaid-gallery.md
const TARGETS = {
  9:  "journey",
  15: "c4",
  16: "mindmap",
  17: "timeline",
  20: "sankey",
  23: "packet",
  25: "architecture",
  8:  "flowchart-cluster", // mystery color #F0F5FB
};

(async () => {
  const html = path.resolve(ROOT, "examples/mermaid-gallery.audit-dump.html");
  const r = spawnSync("npx", ["marp", "examples/mermaid-gallery.md", "-o", html, "--html", "--allow-local-files"], { cwd: ROOT });
  if (r.status !== 0) { console.error("marp build failed"); process.exit(1); }

  const b = await pp.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setRequestInterception(true);
  p.on("request", req => { if (req.url().startsWith("http")) req.abort(); else req.continue(); });
  await p.goto("file://" + html, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 6000));

  const data = await p.evaluate((TARGETS) => {
    const sections = [...document.querySelectorAll("section")];
    const out = {};
    for (const [slideStr, name] of Object.entries(TARGETS)) {
      const slide = parseInt(slideStr, 10);
      const sec = sections[slide - 1];
      if (!sec) { out[name] = { error: "no such slide" }; continue; }
      const svg = sec.querySelector(".mermaid svg");
      if (!svg) { out[name] = { error: "no svg" }; continue; }
      const elems = [...svg.querySelectorAll("*")];
      // For each element, capture tag, class, computed fill+stroke, plus inline style if any.
      const items = elems.map(el => {
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          cls: el.getAttribute("class") || "",
          inlineStyle: el.getAttribute("style") || "",
          fill: cs.fill,
          stroke: cs.stroke,
        };
      }).filter(x => x.fill !== "none" || x.stroke !== "none" || x.inlineStyle);
      // Group by tag+cls combo, dedupe colors.
      const groups = {};
      for (const it of items) {
        const k = `${it.tag}.${it.cls}`;
        groups[k] = groups[k] || { count: 0, fills: new Set(), strokes: new Set(), inline: new Set() };
        groups[k].count++;
        if (it.fill !== "none" && it.fill !== "rgba(0, 0, 0, 0)") groups[k].fills.add(it.fill);
        if (it.stroke !== "none" && it.stroke !== "rgba(0, 0, 0, 0)") groups[k].strokes.add(it.stroke);
        if (it.inlineStyle) groups[k].inline.add(it.inlineStyle.slice(0, 100));
      }
      // Convert sets to arrays.
      const summary = {};
      for (const [k, v] of Object.entries(groups)) {
        summary[k] = {
          count: v.count,
          fills: [...v.fills],
          strokes: [...v.strokes],
          inline: [...v.inline],
        };
      }
      out[name] = summary;
    }
    return out;
  }, TARGETS);

  for (const [name, summary] of Object.entries(data)) {
    console.log(`\n══ ${name} ══`);
    if (summary.error) { console.log("  ERR:", summary.error); continue; }
    for (const [sel, info] of Object.entries(summary)) {
      const fillStr = info.fills.join(", ");
      const strokeStr = info.strokes.join(", ");
      const hasInline = info.inline.some(s => /(?:fill|stroke):/.test(s));
      const inlineStr = hasInline ? " [INLINE]" : "";
      console.log(`  ${sel.padEnd(60)} ×${info.count}${inlineStr}`);
      if (info.fills.length > 0) console.log(`    fill:   ${fillStr}`);
      if (info.strokes.length > 0) console.log(`    stroke: ${strokeStr}`);
      if (hasInline) {
        for (const s of info.inline.slice(0, 2)) console.log(`    inline: ${s}`);
      }
    }
  }

  await b.close();
  fs.unlinkSync(html);
})();
