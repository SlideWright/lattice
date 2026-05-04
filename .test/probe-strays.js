// Find exact DOM path of remaining stray-color elements.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const pp = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");
const PROBE = [
  // [slideIdx, color, role]
  [25, "#087EBF", "fill"],          // architecture
  [9,  "#666666", "stroke"],         // journey rect strokes + circle
  [15, "#08427B", "fill"],           // c4 rect fill
  [15, "#444444", "fill"],           // c4 text fill
  [8,  "#F0F5FB", "fill"],           // flowchart cluster mystery
];

function parseRgb(c) {
  const m = (c||"").match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r,g,b] = m[1].split(",").map(s=>parseFloat(s.trim()));
  const h = n => Math.round(n).toString(16).padStart(2,"0").toUpperCase();
  return "#"+h(r)+h(g)+h(b);
}

(async () => {
  const html = path.resolve(ROOT, "examples/mermaid-gallery.probe.html");
  spawnSync("npx", ["marp", "examples/mermaid-gallery.md", "-o", html, "--html", "--allow-local-files"], { cwd: ROOT });

  const b = await pp.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setRequestInterception(true);
  p.on("request", r => { if (r.url().startsWith("http")) r.abort(); else r.continue(); });
  await p.goto("file://"+html, { waitUntil: "domcontentloaded" });
  await new Promise(r => setTimeout(r, 6000));

  for (const [slideIdx, hex, role] of PROBE) {
    console.log(`\n── slide ${slideIdx} looking for ${role}=${hex} ──`);
    const res = await p.evaluate(({slideIdx, hex, role}) => {
      const sec = document.querySelectorAll("section")[slideIdx-1];
      if (!sec) return [];
      const all = [...sec.querySelectorAll(".mermaid svg *")];
      const out = [];
      for (const el of all) {
        const cs = getComputedStyle(el);
        const v = cs[role];
        if (!v) continue;
        const m = v.match(/rgba?\(([^)]+)\)/);
        if (!m) continue;
        const [r,g,b] = m[1].split(",").map(s=>parseFloat(s.trim()));
        const h = n => Math.round(n).toString(16).padStart(2,"0").toUpperCase();
        const hexVal = "#"+h(r)+h(g)+h(b);
        if (hexVal !== hex) continue;
        // Build DOM path
        const path = [];
        let cur = el;
        while (cur && cur.tagName !== "BODY") {
          let token = cur.tagName.toLowerCase();
          if (cur.getAttribute("class")) token += "." + cur.getAttribute("class").replace(/\s+/g,".");
          if (cur.id) token += "#" + cur.id;
          path.unshift(token);
          if (cur.tagName === "SECTION") break;
          cur = cur.parentElement;
        }
        out.push({ path: path.join(" > "), inline: el.getAttribute("style") || "" });
        if (out.length >= 3) break;
      }
      return out;
    }, {slideIdx, hex, role});
    if (res.length === 0) console.log("  (none found — maybe already fixed?)");
    res.forEach(r => {
      console.log("  PATH:", r.path);
      if (r.inline) console.log("  INLINE:", r.inline.slice(0,120));
    });
  }
  await b.close();
  fs.unlinkSync(html);
})();
