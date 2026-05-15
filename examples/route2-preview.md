---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · Route 2 preview"
footer: "indaco · current --cN-dark vs proposed (chart-* + cat-* recovery)"
style: |
  section.preview { padding: 28px 36px; }
  section.preview h2 { font-size: 22px; margin: 0 0 12px; }
  section.preview .grid { display: grid; grid-template-columns: 28px 1fr 1fr 1.1fr; gap: 4px 8px; align-items: center; }
  section.preview .grid > .hdr { font-size: 10px; font-family: var(--font-mono); opacity: 0.6; letter-spacing: 0.05em; text-transform: uppercase; padding-bottom: 4px; border-bottom: 1px solid var(--border); }
  section.preview .slot { font-size: 11px; font-family: var(--font-mono); font-weight: 600; }
  section.preview .sw {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px; border-radius: 2px;
    font-size: 9px; font-family: var(--font-mono); line-height: 1.2;
  }
  section.preview .sw .hex { font-weight: 600; }
  section.preview .sw .meta { opacity: 0.85; }
  section.preview .badge {
    display: inline-block; padding: 1px 5px; border-radius: 2px;
    font-size: 8px; font-family: var(--font-mono); margin-left: 6px;
    background: rgba(255,255,255,0.18);
  }
  section.preview .note { font-size: 10px; font-family: var(--font-mono); opacity: 0.75; line-height: 1.35; }
  section.preview .legend {
    margin-top: 14px; padding: 10px 14px; border: 1px solid var(--border);
    border-radius: 4px; font-size: 10px; line-height: 1.5;
    background: var(--bg-alt);
  }
  section.preview .ctx {
    margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  }
  section.preview .ctx h3 { font-size: 11px; font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; margin: 0 0 8px; }
  section.preview .wedges { display: flex; gap: 0; height: 36px; border-radius: 2px; overflow: hidden; }
  section.preview .wedges > div { flex: 1; }
  section.preview .tags { display: flex; flex-wrap: wrap; gap: 4px; }
  section.preview .tags > span {
    display: inline-block; padding: 4px 8px; border-radius: 2px;
    font-size: 9px; font-family: var(--font-mono); font-weight: 600;
    color: #FFFFFF;
  }
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: "Title · " -->

# Route 2 preview

## Recover chroma at `--cN-dark`

`indaco · current Brand-triad rank-1 vs proposed (old --chart-* + --cat-*)`

Slot 1-6 of the proposal = the prior `--chart-*` palette verbatim (brand mid-blue, vermilion, teal, magenta, gold, slate-ink). Slots 7-12 = the prior `--cat-*` hues without the overlapping blue/orange (since slots 1 + 2 already carry those).

AA-text with white passes cleanly at slots 1 and 6; passes borderline at slots 2 and 4; fails at 3, 5, and 7-12. **That's the trade.** The slots that fail AA-text aren't consumed with white text on them in any shipped layout — they're piechart wedges, gitgraph dots, kanban marks, decision bottom borders. AA-graphical (≥3:1 vs bg) passes for every slot.

---

<!-- _class: preview -->

## indaco slots 1-6 · brand voice (matches old --chart-* exactly)

<div class="grid">
<div class="hdr">#</div><div class="hdr">current</div><div class="hdr">proposed</div><div class="hdr">rationale</div>

<div class="slot">1</div>
<div class="sw" style="background:#2E608A;color:#FFFFFF"><span class="hex">#2E608A</span><span class="meta">L=42 · 6.0:1 ✓<span class="badge">current</span></span></div>
<div class="sw" style="background:#006FA8;color:#FFFFFF"><span class="hex">#006FA8</span><span class="meta">L=51 · 5.5:1 ✓<span class="badge">proposed</span></span></div>
<div class="note">brand mid-blue · the identity colour; tag-bg lands here</div>

<div class="slot">2</div>
<div class="sw" style="background:#863236;color:#FFFFFF"><span class="hex">#863236</span><span class="meta">L=37 · 7.2:1 ✓</span></div>
<div class="sw" style="background:#C45D27;color:#FFFFFF"><span class="hex">#C45D27</span><span class="meta">L=53 · 4.3:1 ◐</span></div>
<div class="note">vermilion · CB-safe complement to slot 1 (Wong 2011)</div>

<div class="slot">3</div>
<div class="sw" style="background:#7B772D;color:#FFFFFF"><span class="hex">#7B772D</span><span class="meta">L=51 · 4.7:1 ✓</span></div>
<div class="sw" style="background:#1FA694;color:#FFFFFF"><span class="hex">#1FA694</span><span class="meta">L=58 · 3.0:1 ◯</span></div>
<div class="note">teal · sibling of slot 1, hue-shifted</div>

<div class="slot">4</div>
<div class="sw" style="background:#323686;color:#FFFFFF"><span class="hex">#323686</span><span class="meta">L=29 · 10.5:1 ✓</span></div>
<div class="sw" style="background:#B8438C;color:#FFFFFF"><span class="hex">#B8438C</span><span class="meta">L=52 · 4.0:1 ◐</span></div>
<div class="note">magenta · CB-safe complement to slot 3</div>

<div class="slot">5</div>
<div class="sw" style="background:#30827E;color:#FFFFFF"><span class="hex">#30827E</span><span class="meta">L=50 · 4.5:1 ✓</span></div>
<div class="sw" style="background:#C8A82E;color:#000"><span class="hex">#C8A82E</span><span class="meta">L=70 · 2.3:1 ◯ (dark text)</span></div>
<div class="note">mustard gold · lightness anchor; pairs with dark text not white</div>

<div class="slot">6</div>
<div class="sw" style="background:#865832;color:#FFFFFF"><span class="hex">#865832</span><span class="meta">L=42 · 6.1:1 ✓</span></div>
<div class="sw" style="background:#3F4A60;color:#FFFFFF"><span class="hex">#3F4A60</span><span class="meta">L=33 · 8.5:1 ✓</span></div>
<div class="note">slate-ink · the grounding anchor; theme-neutral</div>
</div>

<div class="legend">
<b>AA legend:</b> ✓ ≥4.5:1 (AA-text safe) · ◐ 3.0-4.4:1 (graphical-pass, borderline text) · ◯ &lt;3.0:1 (graphical-pass only, no text on it)
</div>

---

<!-- _class: preview -->

## indaco slots 7-12 · supporting voice (matches old --cat-* without overlap)

<div class="grid">
<div class="hdr">#</div><div class="hdr">current</div><div class="hdr">proposed</div><div class="hdr">rationale</div>

<div class="slot">7</div>
<div class="sw" style="background:#583880;color:#FFFFFF"><span class="hex">#583880</span><span class="meta">L=29 · 10.0:1 ✓</span></div>
<div class="sw" style="background:#8E7BAF;color:#FFFFFF"><span class="hex">#8E7BAF</span><span class="meta">L=55 · 3.5:1 ◐</span></div>
<div class="note">cat-purple · extends to violet beyond slot-4 magenta</div>

<div class="slot">8</div>
<div class="sw" style="background:#80385F;color:#FFFFFF"><span class="hex">#80385F</span><span class="meta">L=33 · 8.0:1 ✓</span></div>
<div class="sw" style="background:#6FB89A;color:#FFFFFF"><span class="hex">#6FB89A</span><span class="meta">L=67 · 2.6:1 ◯</span></div>
<div class="note">cat-green sage · softer green sibling of slot-3 teal</div>

<div class="slot">9</div>
<div class="sw" style="background:#5F8038;color:#FFFFFF"><span class="hex">#5F8038</span><span class="meta">L=48 · 4.6:1 ✓</span></div>
<div class="sw" style="background:#C57E8B;color:#FFFFFF"><span class="hex">#C57E8B</span><span class="meta">L=60 · 3.0:1 ◯</span></div>
<div class="note">cat-rose · dusty pink, warm complement to slot-8 sage</div>

<div class="slot">10</div>
<div class="sw" style="background:#388058;color:#FFFFFF"><span class="hex">#388058</span><span class="meta">L=46 · 5.1:1 ✓</span></div>
<div class="sw" style="background:#6BBDB8;color:#FFFFFF"><span class="hex">#6BBDB8</span><span class="meta">L=68 · 2.5:1 ◯</span></div>
<div class="note">cat-teal mint · pale green-teal, sibling of slot-3 deep teal</div>

<div class="slot">11</div>
<div class="sw" style="background:#7C3880;color:#FFFFFF"><span class="hex">#7C3880</span><span class="meta">L=33 · 7.9:1 ✓</span></div>
<div class="sw" style="background:#B8939F;color:#FFFFFF"><span class="hex">#B8939F</span><span class="meta">L=63 · 2.9:1 ◯</span></div>
<div class="note">cat-mauve · dusty violet, softer than slot-7 purple</div>

<div class="slot">12</div>
<div class="sw" style="background:#3C8038;color:#FFFFFF"><span class="hex">#3C8038</span><span class="meta">L=46 · 4.9:1 ✓</span></div>
<div class="sw" style="background:#9AA8B8;color:#FFFFFF"><span class="hex">#9AA8B8</span><span class="meta">L=66 · 2.7:1 ◯</span></div>
<div class="note">cat-slate · cool neutral, low-chroma palette closer</div>
</div>

<div class="legend">
The supporting voice (slots 7-12) sits at L≈55-68 — chromatic but softer than slots 1-6. None pass AA-text with white; all pass graphical (≥3:1 vs bg). They're for marks/wedges/fills, never tag backgrounds.
</div>

---

<!-- _class: preview -->

## Visual comparison · piechart wedges

<h3 style="font-size:11px;font-family:var(--font-mono);letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;margin:0 0 6px">Current (--cN-dark = audit Brand-triad rank-1)</h3>

<div class="wedges">
<div style="background:#2E608A"></div>
<div style="background:#863236"></div>
<div style="background:#7B772D"></div>
<div style="background:#323686"></div>
<div style="background:#30827E"></div>
<div style="background:#865832"></div>
</div>

<h3 style="font-size:11px;font-family:var(--font-mono);letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;margin:18px 0 6px">Proposed (--cN-dark = old --chart-*)</h3>

<div class="wedges">
<div style="background:#006FA8"></div>
<div style="background:#C45D27"></div>
<div style="background:#1FA694"></div>
<div style="background:#B8438C"></div>
<div style="background:#C8A82E"></div>
<div style="background:#3F4A60"></div>
</div>

<div class="legend">
The current palette reads as one tonal voice — every slot deepened to L≈32-42 for AA-text-with-white. The proposed reads as the brand's <i>actual</i> categorical palette — blue, vermilion, teal, magenta, gold, slate. Same six wedges, very different rooms.
</div>

---

<!-- _class: preview -->

## Visual comparison · decision-list tag-bg (slot 1)

<h3 style="font-size:11px;font-family:var(--font-mono);letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;margin:0 0 6px">Current</h3>
<div class="tags">
  <span style="background:#2E608A">BUILD</span>
  <span style="background:#863236">WHY NOT BUY</span>
  <span style="background:#7B772D">WHY NOT DELAY</span>
</div>

<h3 style="font-size:11px;font-family:var(--font-mono);letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;margin:18px 0 6px">Proposed</h3>
<div class="tags">
  <span style="background:#006FA8">BUILD</span>
  <span style="background:#C45D27">WHY NOT BUY</span>
  <span style="background:#1FA694">WHY NOT DELAY</span>
</div>

<div class="legend">
Slot 1 proposed (#006FA8) is brand mid-blue at AA 5.5:1 with white text — same identity colour the deck's <code>--accent</code> uses. The current (#2E608A) is a muted derivative.
Slot 3 proposed (#1FA694) is teal at 3.0:1 with white — graphical-pass, borderline text. If a slot-3 tag becomes common in shipped decks, we'd want to either deepen slot 3 specifically or render that one tag with dark text. Most consumers use slots 1-2 for tags and 3-12 for marks/wedges where the AA bar doesn't apply.
</div>

---

<!-- _class: preview -->

## Open decisions

<div class="legend" style="font-size:12px;line-height:1.65">
<b>1. The other 12 themes.</b> If route 2 is right, we copy old <code>--chart-*</code> + <code>--cat-*</code> into <code>--c1-dark..--c12-dark</code> per theme. cuoio's old palette is leather-toned (saddle, parchment, gold-wash); brina was steel-blue + champagne; burgundy was wine + forest. Each theme keeps its <i>actual</i> brand voice.
<br><br>
<b>2. Achromatic themes.</b> onyx / ardesia / concrete don't have an old <code>--chart-*</code> tier rich enough to map — they shipped at near-zero chroma. The staggered tonal cycle we just landed for them stays.
<br><br>
<b>3. The audit's role.</b> The audit deck stays as the historical record of the AA-text-optimized direction. Route 2 explicitly walks back from that optimization for the deep tier. Worth noting in the commit message.
<br><br>
<b>4. Slot 5 (mustard gold).</b> It's L=70 — pairs with dark text, not white. If shipped layouts expect "every <code>--cN-dark</code> takes white text," slot 5 is the one place to verify. Decision-list at slot 5: lightest text would need <code>--c-ink-light</code>, not <code>--c-ink-dark</code>. Manageable but the contract becomes "slot-dependent text colour."
</div>
