// Comprehensive theme audit. For each .md deck declared in DECKS:
//   1. Render via marp-cli into a sibling .html (so ../lattice-runtime.js etc. resolve).
//   2. Open in puppeteer, wait for runtime + mermaid to settle.
//   3. For every .mermaid container, walk its SVG and collect every computed
//      fill/stroke/color, attaching the element's tag, class, and the diagram
//      type (parsed from the source).
//   4. Classify each color against the deck's expected palette (parsed live from
//      the page via getComputedStyle).
//   5. Report unexpected colors with full breadcrumb (deck, slide, diagram type,
//      element tag+class, color seen).
//
// Designed to surface !important clobbering, load-order issues, runtime
// mis-mappings, and Mermaid hardcoded-palette gaps.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const pp = require("puppeteer");

const ROOT = path.resolve(__dirname, "..");

const DECKS = [
  { md: "examples/mermaid-gallery.md",            theme: "indaco" },
  { md: "examples/gallery.md",                    theme: "indaco" },
  { md: ".scratch/tokenization-design.md",        theme: "indaco" },
  { md: ".scratch/tokenization-business.md",      theme: "cuoio"  },
  { md: ".scratch/tokenization-platform-context.md", theme: "cuoio"  },
];

// Tokens we want to read live from each rendered page (so we always classify
// against the actually-resolved theme, not a hardcoded list).
const TOKEN_KEYS = [
  "bg", "bg-alt", "bg-dark",
  "text-heading", "text-body", "text-display", "text-label", "text-muted",
  "accent",
  "mermaid-primary-color", "mermaid-secondary-color",
  "mermaid-pie-purple", "mermaid-pie-orange", "mermaid-pie-teal", "mermaid-pie-rose",
  "mermaid-pie-yellow",  "mermaid-pie-red",    "mermaid-pie-slate", "mermaid-pie-sage",
  "mermaid-pie-violet",
  "mermaid-border", "mermaid-line", "mermaid-accent-warm",
  "mermaid-mid-blue", "mermaid-mid-green", "mermaid-mid-purple",
  "mermaid-mid-orange", "mermaid-mid-teal", "mermaid-mid-rose",
  "mermaid-mid-slate", "mermaid-mid-mauve",
  "mermaid-quadrant-1-fill", "mermaid-quadrant-2-fill",
  "mermaid-quadrant-3-fill", "mermaid-quadrant-4-fill",
  "mermaid-quadrant-1-text", "mermaid-quadrant-2-text",
  "mermaid-quadrant-3-text", "mermaid-quadrant-4-text",
  "mermaid-gantt-active", "mermaid-gantt-active-border",
  "mermaid-gantt-done", "mermaid-gantt-done-border",
  "mermaid-gantt-critical", "mermaid-gantt-critical-border",
  "mermaid-gantt-today", "mermaid-gantt-grid",
  "mermaid-note-bg", "mermaid-note-border",
  "mermaid-error-bg", "mermaid-error-text",
];

function rgbToHex(c) {
  if (!c) return null;
  if (c === "none" || c === "transparent" || c === "rgba(0, 0, 0, 0)") return null;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return c.toUpperCase();
  const parts = m[1].split(",").map(s => parseFloat(s.trim()));
  const [r, g, b] = parts;
  const a = parts[3] ?? 1;
  if (a === 0) return null;
  const h = n => Math.round(n).toString(16).padStart(2, "0").toUpperCase();
  return "#" + h(r) + h(g) + h(b);
}

function diagramType(source) {
  const first = source.trim().split("\n")[0].toLowerCase().trim();
  if (/^(graph|flowchart)\b/.test(first)) return "flowchart";
  if (/^sequencediagram/.test(first)) return "sequence";
  if (/^classdiagram/.test(first)) return "class";
  if (/^statediagram/.test(first)) return "state";
  if (/^erdiagram/.test(first)) return "er";
  if (/^pie\b/.test(first)) return "pie";
  if (/^quadrantchart/.test(first)) return "quadrant";
  if (/^gantt\b/.test(first)) return "gantt";
  if (/^gitgraph/.test(first)) return "gitgraph";
  if (/^journey\b/.test(first)) return "journey";
  if (/^timeline\b/.test(first)) return "timeline";
  if (/^mindmap\b/.test(first)) return "mindmap";
  if (/^kanban\b/.test(first)) return "kanban";
  if (/^c4(context|container|component|dynamic|deployment)/.test(first.replace(/[\s-]/g,""))) return "c4";
  if (/^block-beta|^block\b/.test(first)) return "block";
  if (/^packet-beta|^packet\b/.test(first)) return "packet";
  if (/^architecture-beta|^architecture\b/.test(first)) return "architecture";
  if (/^xychart/.test(first)) return "xychart";
  if (/^sankey/.test(first)) return "sankey";
  if (/^radar/.test(first)) return "radar";
  if (/^treemap/.test(first)) return "treemap";
  if (/^requirement(diagram)?/.test(first)) return "requirement";
  if (/^venn\b/.test(first)) return "venn";
  if (/^ishikawa\b/.test(first)) return "ishikawa";
  return first.split(/\s/)[0];
}

async function buildHtml(deckMd) {
  const out = path.resolve(deckMd.replace(/\.md$/, ".audit.html"));
  const r = spawnSync("npx", [
    "marp", deckMd, "-o", out,
    "--html", "--allow-local-files",
  ], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) throw new Error("marp failed for " + deckMd + ": " + r.stderr);
  return out;
}

async function auditDeck(deck) {
  console.log(`\n══════════════════════════════════════════════════════════════════════`);
  console.log(`  ${deck.md}  (theme: ${deck.theme})`);
  console.log(`══════════════════════════════════════════════════════════════════════`);

  const htmlPath = await buildHtml(deck.md);
  const b = await pp.launch({ headless: "new", args: ["--no-sandbox"] });
  const p = await b.newPage();
  await p.setRequestInterception(true);
  p.on("request", r => { if (r.url().startsWith("http")) r.abort(); else r.continue(); });
  const pageErrors = [];
  p.on("pageerror", e => pageErrors.push(e.message.slice(0, 200)));
  await p.goto("file://" + htmlPath, { waitUntil: "domcontentloaded" });
  // Generous settle: runtime retries for ~4s + 700ms late pass.
  await new Promise(r => setTimeout(r, 6000));

  const result = await p.evaluate((TOKEN_KEYS) => {
    // Read palette tokens from the first <section>.
    const scope = document.querySelector("section");
    const cs = scope ? getComputedStyle(scope) : null;
    const palette = {};
    if (cs) {
      for (const k of TOKEN_KEYS) {
        const v = cs.getPropertyValue("--" + k).trim();
        if (v) palette[k] = v;
      }
    }

    // For each section, find each .mermaid container.
    const sections = [...document.querySelectorAll("section")];
    const diagrams = [];
    sections.forEach((sec, slideIdx) => {
      const merms = [...sec.querySelectorAll(".mermaid-block > .mermaid, .mermaid")];
      merms.forEach((m, dIdx) => {
        const svg = m.querySelector("svg");
        const block = m.closest(".mermaid-block");
        const codeEl = block?.querySelector(":scope > :is(pre, marp-pre) > code");
        const source = (codeEl?.textContent || m.textContent || "").slice(0, 600);
        if (!svg) {
          diagrams.push({ slide: slideIdx + 1, dIdx, hasSvg: false, source });
          return;
        }
        // Walk all SVG descendants and collect every paint property.
        const colorObs = []; // {tag, class, fill, stroke, color}
        const all = svg.querySelectorAll("*");
        all.forEach(el => {
          const tag = el.tagName.toLowerCase();
          const cls = (el.getAttribute("class") || "").slice(0, 80);
          const csEl = getComputedStyle(el);
          const obs = { tag, cls };
          if (csEl.fill && csEl.fill !== "none") obs.fill = csEl.fill;
          if (csEl.stroke && csEl.stroke !== "none") obs.stroke = csEl.stroke;
          if (csEl.color) obs.color = csEl.color;
          // Only keep if at least one is a meaningful paint.
          if (obs.fill || obs.stroke) colorObs.push(obs);
        });
        // Also walk foreignObject text descendants (HTML labels).
        const foEls = svg.querySelectorAll("foreignObject *");
        foEls.forEach(el => {
          const tag = el.tagName.toLowerCase();
          const cls = (el.getAttribute("class") || "").slice(0, 80);
          const csEl = getComputedStyle(el);
          colorObs.push({ tag, cls, color: csEl.color, fo: true });
        });
        diagrams.push({
          slide: slideIdx + 1,
          dIdx,
          hasSvg: true,
          source,
          colorObs,
        });
      });
    });
    return { palette, diagrams };
  }, TOKEN_KEYS);

  await b.close();

  // Build palette index: hex → token name.
  const paletteIndex = {};
  for (const [name, raw] of Object.entries(result.palette)) {
    if (/^#[0-9A-Fa-f]+$/.test(raw)) paletteIndex[raw.toUpperCase()] = name;
  }
  // Plus a few hard-coded "always allowed" colors that the runtime emits.
  paletteIndex["#FFFFFF"] = paletteIndex["#FFFFFF"] || "white";
  paletteIndex["#000000"] = paletteIndex["#000000"] || "black";

  console.log(`Palette has ${Object.keys(paletteIndex).length} tokens.`);
  if (pageErrors.length > 0) {
    console.log(`Page errors: ${pageErrors.length}`);
    pageErrors.slice(0, 3).forEach(e => console.log("  · " + e.slice(0, 150)));
  }

  let totalDiagrams = 0;
  let totalNoSvg = 0;
  const strayByColor = {}; // hex → [{deck, slide, dtype, tag, cls, paintRole}]
  const noSvgList = [];

  for (const d of result.diagrams) {
    totalDiagrams++;
    if (!d.hasSvg) {
      totalNoSvg++;
      noSvgList.push({ slide: d.slide, source: d.source });
      continue;
    }
    const dtype = diagramType(d.source);
    const seenStrays = new Set();
    for (const obs of d.colorObs) {
      for (const role of ["fill", "stroke", "color"]) {
        const hex = rgbToHex(obs[role]);
        if (!hex) continue;
        if (paletteIndex[hex]) continue;
        const key = `${role}|${hex}|${obs.tag}.${obs.cls}`;
        if (seenStrays.has(key)) continue;
        seenStrays.add(key);
        strayByColor[hex] = strayByColor[hex] || [];
        strayByColor[hex].push({
          slide: d.slide, dtype, tag: obs.tag, cls: obs.cls, role,
        });
      }
    }
  }

  console.log(`Diagrams: ${totalDiagrams}, no-SVG: ${totalNoSvg}`);
  if (totalNoSvg > 0) {
    for (const ns of noSvgList) {
      console.log(`  ✗ slide ${ns.slide} no SVG. src="${ns.source.slice(0, 100).replace(/\n/g," ")}"`);
    }
  }

  const strayColors = Object.keys(strayByColor).sort();
  if (strayColors.length === 0) {
    console.log(`✓ No stray colors detected.`);
  } else {
    console.log(`\n✗ ${strayColors.length} stray color(s) (not in palette):`);
    for (const hex of strayColors) {
      const items = strayByColor[hex];
      console.log(`\n  ${hex}  (${items.length} occurrence${items.length > 1 ? "s" : ""})`);
      // Group by dtype + tag.cls
      const grouped = {};
      for (const it of items) {
        const k = `${it.dtype} | ${it.tag}.${it.cls} | ${it.role}`;
        grouped[k] = grouped[k] || [];
        grouped[k].push(it.slide);
      }
      for (const [k, slides] of Object.entries(grouped)) {
        console.log(`    ${k}  → slide(s): ${[...new Set(slides)].join(",")}`);
      }
    }
  }

  fs.unlinkSync(htmlPath);
  return { deck: deck.md, theme: deck.theme, totalDiagrams, totalNoSvg, strayColors };
}

(async () => {
  const summary = [];
  for (const d of DECKS) {
    try {
      summary.push(await auditDeck(d));
    } catch (e) {
      console.error("ERR", d.md, e.message);
    }
  }
  console.log(`\n\n══════════════════════════════════════════════════════════════════════`);
  console.log(`  AUDIT SUMMARY`);
  console.log(`══════════════════════════════════════════════════════════════════════`);
  for (const s of summary) {
    const status = s.strayColors.length === 0 && s.totalNoSvg === 0 ? "✓" : "✗";
    console.log(`${status} ${s.deck.padEnd(50)} (${s.theme}) — diagrams: ${s.totalDiagrams}, missing-SVG: ${s.totalNoSvg}, strays: ${s.strayColors.length}`);
  }
})();
