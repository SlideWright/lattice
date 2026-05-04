// Inspect every mermaid diagram in tokenization-design.html and dump the
// fill/stroke/text colors used vs the indaco palette tokens.
const pp = require("puppeteer");
const path = require("path");

const INDACO = {
  "#DCE9F5": "mermaid-primary-color (pale brand blue)",
  "#DDF0E8": "mermaid-secondary-color (pale brand green)",
  "#F2F5FA": "bg-alt / clusterBkg (cool blue-white)",
  "#1F4A6E": "mermaid-border (saturated brand navy)",
  "#1A1A1A": "mermaid-line (near-black)",
  "#0A1628": "text-heading",
  "#1E3A5F": "text-body",
  "#006FA8": "accent / brand-blue-mid",
  "#003D66": "brand-blue-deep",
  "#009BE4": "brand-blue (decorative)",
  "#FFFFFF": "bg",
};

function rgbToHex(rgb) {
  if (!rgb) return null;
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return rgb;
  const [r, g, b, a] = m[1].split(",").map(s => parseFloat(s.trim()));
  if (a === 0) return "transparent";
  const h = n => Math.round(n).toString(16).padStart(2, "0").toUpperCase();
  return "#" + h(r) + h(g) + h(b);
}

function classify(hex) {
  if (!hex || hex === "transparent" || hex === "none") return hex || "none";
  const up = hex.toUpperCase();
  return INDACO[up] ? `${up} ✓ ${INDACO[up]}` : `${up} ✗ NOT IN PALETTE`;
}

(async () => {
  const b = await pp.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setRequestInterception(true);
  p.on("request", r => { if (r.url().startsWith("http")) r.abort(); else r.continue(); });
  p.on("pageerror", e => console.log("[pageerror]", e.message.slice(0, 200)));
  await p.goto("file://" + path.resolve(".scratch/tokenization-design.html"), { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 5000));

  const data = await p.evaluate(() => {
    const sections = [...document.querySelectorAll("section")];
    const out = [];
    sections.forEach((sec, i) => {
      const merms = [...sec.querySelectorAll(".mermaid")];
      merms.forEach((m, j) => {
        const svg = m.querySelector("svg");
        const h2 = sec.querySelector("h1, h2")?.textContent.slice(0, 60) || "(no heading)";
        if (!svg) {
          out.push({ slide: i + 1, idx: j, h2, hasSvg: false, processed: m.dataset.processed, source: m.textContent.slice(0, 80) });
          return;
        }
        // Collect fills/strokes from all shape elements
        const shapes = [...svg.querySelectorAll("rect, polygon, ellipse, circle, path")];
        const fills = {};
        const strokes = {};
        shapes.forEach(s => {
          const cs = getComputedStyle(s);
          const f = cs.fill;
          const sk = cs.stroke;
          fills[f] = (fills[f] || 0) + 1;
          strokes[sk] = (strokes[sk] || 0) + 1;
        });
        const texts = [...svg.querySelectorAll("text, foreignObject *")].slice(0, 20);
        const textColors = {};
        texts.forEach(t => {
          const c = getComputedStyle(t).color;
          if (c && c !== "rgba(0, 0, 0, 0)") textColors[c] = (textColors[c] || 0) + 1;
        });
        out.push({
          slide: i + 1,
          idx: j,
          h2,
          hasSvg: true,
          shapeCount: shapes.length,
          fills,
          strokes,
          textColors,
        });
      });
    });
    return out;
  });

  for (const d of data) {
    console.log(`\n── slide ${d.slide} · diagram ${d.idx} · ${d.h2}`);
    if (!d.hasSvg) {
      console.log(`  ✗ NO SVG (processed=${d.processed}) src="${d.source}"`);
      continue;
    }
    console.log(`  ✓ SVG, ${d.shapeCount} shapes`);
    console.log(`  fills:`);
    for (const [c, n] of Object.entries(d.fills).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(3)}× ${classify(rgbToHex(c))}`);
    }
    console.log(`  strokes:`);
    for (const [c, n] of Object.entries(d.strokes).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(3)}× ${classify(rgbToHex(c))}`);
    }
    console.log(`  text colors:`);
    for (const [c, n] of Object.entries(d.textColors).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(3)}× ${classify(rgbToHex(c))}`);
    }
  }
  await b.close();
})();
