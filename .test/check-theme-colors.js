const pp = require("puppeteer");
const path = require("path");
(async () => {
  const b = await pp.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setRequestInterception(true);
  p.on("request", r => { if (r.url().startsWith("http")) r.abort(); else r.continue(); });
  await p.goto("file://" + path.resolve("examples/mermaid-gallery.html"), { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 4000));
  const r = await p.evaluate(() => {
    const palette = {
      "--bg":         getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
      "--fg":         getComputedStyle(document.documentElement).getPropertyValue("--fg").trim(),
      "--accent":     getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
      "--mermaid-primary": getComputedStyle(document.documentElement).getPropertyValue("--mermaid-primary").trim(),
    };
    const svgs = [...document.querySelectorAll(".mermaid svg")].slice(0, 4);
    const samples = svgs.map((svg, i) => {
      const rect = svg.querySelector("rect, polygon, path");
      const text = svg.querySelector("text, foreignObject");
      return {
        idx: i,
        viewBox: svg.getAttribute("viewBox"),
        firstShapeFill: rect ? getComputedStyle(rect).fill : null,
        firstShapeStroke: rect ? getComputedStyle(rect).stroke : null,
        textColor: text ? getComputedStyle(text).color : null,
        h2: svg.closest("section")?.querySelector("h2")?.textContent.slice(0, 30),
      };
    });
    return { palette, samples };
  });
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})();
