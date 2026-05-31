/**
 * Word-cloud layout — build-time spiral packer.
 *
 * Real word cloud: words are sized continuously from a 1..5 weight,
 * placed by a deterministic Archimedean spiral around the canvas
 * center, axis-aligned with an optional 90° rotation rotation policy,
 * coloured by categorical token rotation. The packer runs at build
 * time so the output is static positioned HTML — zero JS at view time.
 *
 * Source contract:
 *
 *   <!-- _class: word-cloud -->
 *
 *   ## Heading
 *
 *   - Execution `5`
 *   - Discipline `4.5`
 *   - Velocity `4`
 *   - Talent `3`
 *   - Risk `2`
 *   - Cadence `1`
 *
 * Weight is continuous in [1, 5] (clamped); larger = larger font.
 * The default + four modifier variants share the engine and rebind
 * its parameters via VARIANT_OPTS — density (spiral step), rotation
 * policy, color policy, size spread.
 *
 *   word-cloud                 moderate density, cat rotation, occasional 90°
 *   word-cloud constellation   sparse, accent+single-cat, 0° only
 *   word-cloud dense           tight, full cat rotation, 0° + 90° mix
 *   word-cloud spectrum        moderate, heat-ramp color (--scale-N), 0° only
 *   word-cloud focal           tight, hero top tier, cat rotation on satellites
 *
 * Determinism: same input always produces the same layout. The spiral
 * is parameterised, not random; rotation is rank-keyed; color is
 * rank-keyed. No Math.random anywhere.
 *
 * Sibling implementations (three-renderer parity contract):
 *   - lattice-emulator.js calls transformWordCloudSection per slide
 *   - marp.config.js render hook calls applyToRenderedHtml
 *   - lattice-runtime.js mirrors the engine for marp-vscode preview
 */

const WORD_CLOUD_MODIFIERS = ['constellation', 'dense', 'spectrum', 'focal'];

// Canvas dimensions in CSS px. The slide section's content box is
// 1152×544 (1280-128 horizontal padding, 720-176 vertical padding).
// Reserve ~80 for eyebrow + h2 and ~130 for the below-note paragraph
// (3 lines @ ~42px), leaving ~330 for the cloud. Width is given a
// small margin so the overflow watcher's 12px tolerance is never
// triggered.
const CANVAS_W = 1100;
const CANVAS_H = 320;

// Playfair Display width coefficient at the weights we use. Empirical:
// average glyph width ≈ 0.50em at 600, ≈ 0.54em at 700+. The packer
// also adds a per-side bbox padding so neighbouring words breathe.
const CHAR_W_COEFF = 0.54;
const BBOX_PAD_EM = 0.12;

// Variant engine parameters. Each variant is a recipe over the same
// engine — there is no per-variant code path, only per-variant data.
const VARIANT_OPTS = {
  default: {
    sizeSpread: [16, 84],
    sizeCurve:  1.35,
    spiral:     { dr: 0.5,  dtheta: 0.12, maxIter: 3000 },
    rotation:   { chance: 0.22, minWeight: 1.5, maxWeight: 3.5, rotated: 90 },
    color:      'cat-rotate',
  },
  constellation: {
    sizeSpread: [14, 100],
    sizeCurve:  1.55,
    spiral:     { dr: 0.9,  dtheta: 0.18, maxIter: 2500 },
    rotation:   { chance: 0,    minWeight: 0,   maxWeight: 0,   rotated: 0 },
    color:      'accent-pair',
  },
  dense: {
    sizeSpread: [12, 60],
    sizeCurve:  1.20,
    spiral:     { dr: 0.3,  dtheta: 0.09, maxIter: 4000 },
    rotation:   { chance: 0.32, minWeight: 1,   maxWeight: 3.5, rotated: 90 },
    color:      'cat-rotate',
  },
  spectrum: {
    sizeSpread: [14, 76],
    sizeCurve:  1.35,
    spiral:     { dr: 0.45, dtheta: 0.12, maxIter: 3000 },
    rotation:   { chance: 0,    minWeight: 0,   maxWeight: 0,   rotated: 0 },
    color:      'heat-ramp',
  },
  focal: {
    sizeSpread: [12, 128],
    sizeCurve:  1.80,
    spiral:     { dr: 0.45, dtheta: 0.12, maxIter: 3200 },
    rotation:   { chance: 0.15, minWeight: 1,   maxWeight: 2.5, rotated: 90 },
    color:      'focal-cats',
  },
};

// Categorical token rotation. The six categorical tokens are already
// designed to coexist on the same surface (cb-safe pairs). Top-weight
// words always get --accent so the focal point is unambiguous; lower
// tiers rotate through the cats by rank, with weight 1 muted via the
// ink ramp. The exact rotation is rank % len so each rebuild matches.
//
// Token convention: --c{N}-dark — same scheme PIE_PALETTE / journey /
// roadmap / radar use. Was --cat-blue/etc. before the 2026-05-15 themes
// refactor (commit 552e84a) removed the named-cat tokens.
const CAT_ROTATION = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)',
];

// ── Source parsing ─────────────────────────────────────────────────────────

function clampWeight(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 3;
  if (v < 1) return 1;
  if (v > 5) return 5;
  return v;
}

/**
 * Normalize a set of raw weights to the 1-5 visual scale by min-max
 * scaling: the lightest word maps to 1 (muted/small), the heaviest to 5
 * (hero). This is what lets authors weight words on ANY positive scale —
 * frequency counts (124, 78, 9), a 1-5 rating, or percentages — and get
 * a cloud that uses the full size + colour range either way. Word clouds
 * read by RELATIVE weight, so absolute magnitude is intentionally
 * discarded. Degenerate inputs (a single word, or an all-equal set) map
 * to the mid of the scale; non-finite weights default to mid and do not
 * skew the min/max. Pure + deterministic.
 */
function normalizeWeights(raws) {
  const finite = raws.filter((r) => Number.isFinite(r));
  if (finite.length === 0) return raws.map(() => 3);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return raws.map(() => 3);
  return raws.map((r) =>
    Number.isFinite(r) ? clampWeight(1 + (4 * (r - min)) / (max - min)) : 3
  );
}

function findFirstUl(inner) {
  const m = inner.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/);
  return m ? { html: m[0], start: m.index, end: m.index + m[0].length } : null;
}

function parseItem(liInner) {
  let text = liInner;
  // Raw author weight; NaN (no pill / non-numeric) is normalized to the
  // mid of the scale by normalizeWeights and does not anchor the min/max.
  let weight = NaN;
  // [^<] anchors away from any earlier inline <code> in the word —
  // markdown-it renders inline code as text-only so this is safe.
  const codeRe = /<code\b[^>]*>([^<]*)<\/code>\s*$/;
  const m = codeRe.exec(text);
  if (m) {
    weight = Number(m[1].trim());
    text = text.slice(0, m.index);
  }
  return { text: text.trim(), weight };
}

function parseItems(ulHtml) {
  const items = [];
  const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/g;
  let m;
  let i = 0;
  while ((m = liRe.exec(ulHtml)) !== null) {
    const parsed = parseItem(m[1]);
    if (parsed.text) items.push({ ...parsed, source: i });
    i++;
  }
  return items;
}

// Strip HTML tags from a word's display text so we can measure it as
// plain characters. Inline emphasis (em/strong) is rare in word-cloud
// items but the engine tolerates it — the visible text is the
// stripped form, the bounding box uses its length.
function stripTags(html) {
  return html.replace(/<[^>]+>/g, '');
}

// ── Visual assignment (size, rotation, color) ──────────────────────────────
//
// Pure function of (rank, weight) — deterministic so rebuilds produce
// identical layouts. No Math.random.

function lerp(a, b, t) { return a + (b - a) * t; }

function sizeFromWeight(weight, opts) {
  const t = (weight - 1) / 4;                 // 0..1
  const eased = t ** opts.sizeCurve;  // ease-in
  return lerp(opts.sizeSpread[0], opts.sizeSpread[1], eased);
}

// Deterministic "is rotated" decision keyed off rank. The hash hits
// every value mod 100 reasonably uniformly so a 22% chance over 12
// eligible ranks really does produce ~2.6 rotations on average
// (older `rank * 7` hash clustered all early ranks above the bucket
// threshold, producing zero rotations on small inputs).
function rotatedForRank(rank, weight, opts) {
  const r = opts.rotation;
  if (!r.chance) return false;
  if (weight > r.maxWeight || weight < r.minWeight) return false;
  const bucket = ((rank * 17) + 11) % 100;
  return bucket < r.chance * 100;
}

function colorForWord(rank, weight, opts) {
  if (opts.color === 'heat-ramp') {
    // 5→accent (saturated), 4→scale-700, 3→scale-500, 2→scale-400, 1→scale-300
    if (weight >= 4.5) return 'var(--accent)';
    if (weight >= 3.5) return 'var(--scale-700)';
    if (weight >= 2.5) return 'var(--scale-500)';
    if (weight >= 1.5) return 'var(--scale-400)';
    return 'var(--text-muted)';
  }
  if (opts.color === 'accent-pair') {
    // constellation — accent for top tier, supporting cat for mid,
    // muted for low. Sparse density rewards a tight palette. The mid
    // tier picks --c7-dark (mauve slot in the unified token scheme;
    // was --cat-mauve before the 2026-05-15 themes refactor).
    if (weight >= 4) return 'var(--accent)';
    if (weight >= 2.5) return 'var(--c7-dark)';
    return 'var(--text-muted)';
  }
  if (opts.color === 'focal-cats') {
    // focal — hero word in accent, satellites cycle through cats,
    // closing tier in muted ink.
    if (weight >= 4.5) return 'var(--accent)';
    if (weight <= 1.5) return 'var(--text-muted)';
    return CAT_ROTATION[(rank - 1) % CAT_ROTATION.length];
  }
  // cat-rotate (default + dense)
  if (weight >= 4.5) return 'var(--accent)';
  if (weight <= 1.5) return 'var(--text-muted)';
  return CAT_ROTATION[(rank - 1) % CAT_ROTATION.length];
}

// Compute the unrotated bounding box for a word. The packer then
// swaps width/height when the word is placed vertically.
function bboxFor(text, size) {
  const len = text.length || 1;
  const padX = size * BBOX_PAD_EM;
  const padY = size * BBOX_PAD_EM;
  return {
    w: len * size * CHAR_W_COEFF + padX * 2,
    h: size * 1.05 + padY * 2,
  };
}

function rectsCollide(a, b) {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
           a.y + a.h <= b.y || b.y + b.h <= a.y);
}

// ── Spiral packer ──────────────────────────────────────────────────────────
//
// Archimedean spiral, biased to the canvas aspect ratio so the cloud
// fills the slide rather than being a tight circle in the middle.
// Words are placed by their CENTER coordinate; collision tests use
// the (rotated) bounding rect.
//
// Determinism: words processed in stable weight-desc / source-order;
// spiral parameters are fixed; no randomness.

// Golden angle (in radians) ≈ 2π × (1 - 1/φ). Used to offset each
// word's spiral start so consecutive words don't all start probing
// from the same direction — that produced visible bias toward the
// lower right of the canvas. With this offset the placements
// distribute evenly around the centre.
const GOLDEN_ANGLE = 2.399963229728653;

// Shrink-to-fit policy: when a word can't pack at its target size we
// retry at progressively smaller sizes before giving up. The factor
// stays modest (10% steps, 4 retries → 0.66× minimum) so the size
// hierarchy is preserved on the worst case; if even 0.66× doesn't
// fit, the word is dropped (author should reduce its weight).
const SHRINK_FACTOR = 0.9;
const SHRINK_RETRIES = 4;

function tryPlaceWord(bbox, startTheta, canvas, placed, spiralOpts) {
  const cx = canvas.w / 2;
  const cy = canvas.h / 2;
  const aspect = canvas.w / canvas.h;
  let theta = startTheta;
  let r = 0;
  for (let i = 0; i < spiralOpts.maxIter; i++) {
    const px = r * aspect * Math.cos(theta);
    const py = r * Math.sin(theta);
    const x = cx + px - bbox.w / 2;
    const y = cy + py - bbox.h / 2;
    if (x < 0 || y < 0 || x + bbox.w > canvas.w || y + bbox.h > canvas.h) {
      theta += spiralOpts.dtheta;
      r += spiralOpts.dr;
      continue;
    }
    const candidate = { x, y, w: bbox.w, h: bbox.h };
    let collides = false;
    for (const p of placed) {
      if (rectsCollide(candidate, p)) { collides = true; break; }
    }
    if (collides) {
      theta += spiralOpts.dtheta;
      r += spiralOpts.dr;
      continue;
    }
    return candidate;
  }
  return null;
}

function packCloud(words, canvas, spiralOpts) {
  const placed = [];

  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];

    // Try the word at its target size first; if the spiral can't find
    // a non-colliding spot we shrink and retry. The text and rotation
    // are fixed; only size + derived bbox change.
    let found = null;
    let finalSize = w.size;
    let finalBbox = null;
    const startTheta = wi * GOLDEN_ANGLE;

    for (let retry = 0; retry <= SHRINK_RETRIES; retry++) {
      const trialSize = w.size * SHRINK_FACTOR ** retry;
      const trialPlain = w.text.replace(/<[^>]+>/g, '');
      const trialBboxNat = bboxFor(trialPlain, trialSize);
      const trialBbox = w.rotated
        ? { w: trialBboxNat.h, h: trialBboxNat.w }
        : trialBboxNat;
      const candidate = tryPlaceWord(trialBbox, startTheta, canvas, placed, spiralOpts);
      if (candidate) {
        found = candidate;
        finalSize = trialSize;
        finalBbox = trialBbox;
        break;
      }
    }

    if (found) {
      placed.push(found);
      w.x = found.x + finalBbox.w / 2;
      w.y = found.y + finalBbox.h / 2;
      w.size = finalSize;
      w.placed = true;
    } else {
      w.placed = false;
    }
  }
  return words.filter(w => w.placed);
}

// ── Variant resolution ─────────────────────────────────────────────────────

function pickVariant(cls) {
  const tokens = cls.trim().split(/\s+/);
  for (const mod of WORD_CLOUD_MODIFIERS) {
    if (tokens.includes(mod)) return mod;
  }
  return 'default';
}

// ── Emission ───────────────────────────────────────────────────────────────

function buildCanvas(rawItems, variant) {
  const opts = VARIANT_OPTS[variant] || VARIANT_OPTS.default;

  // Scale raw author weights (any positive scheme — counts, ratings,
  // percentages) onto the 1-5 visual scale before assigning size/colour.
  const scaled = normalizeWeights(rawItems.map((it) => it.weight));
  const items = rawItems.map((it, i) => ({ ...it, weight: scaled[i] }));

  // Sort by weight DESC (stable on source order).
  const sorted = [...items].sort((a, b) =>
    b.weight - a.weight || a.source - b.source
  );

  // Assign rank-derived visuals BEFORE packing — the packer needs
  // size to compute bounding boxes.
  const visualed = sorted.map((it, idx) => {
    const rank = idx + 1;
    const size = sizeFromWeight(it.weight, opts);
    const rotated = rotatedForRank(rank, it.weight, opts);
    const color = colorForWord(rank, it.weight, opts);
    const plainText = stripTags(it.text);
    const bbox = bboxFor(plainText, size);
    return { ...it, rank, size, rotated, color, bbox };
  });

  const packed = packCloud(visualed, { w: CANVAS_W, h: CANVAS_H }, opts.spiral);
  if (packed.length === 0) return '';

  const spans = packed.map(w => {
    const rotDeg = w.rotated ? opts.rotation.rotated : 0;
    const styleParts = [
      `--wc-x:${w.x.toFixed(1)}px`,
      `--wc-y:${w.y.toFixed(1)}px`,
      `--wc-size:${w.size.toFixed(1)}px`,
      `--wc-rot:${rotDeg}deg`,
      `--wc-color:${w.color}`,
    ];
    return (
      `<span class="wc-word" data-weight="${Number(w.weight.toFixed(2))}" data-rank="${w.rank}"` +
        (w.rotated ? ' data-rotated="1"' : '') +
        ` style="${styleParts.join(';')}">${w.text}</span>`
    );
  }).join('');

  return (
    `<div class="word-cloud-canvas" data-count="${packed.length}" data-variant="${variant}"` +
      ` style="--wc-canvas-w:${CANVAS_W}px;--wc-canvas-h:${CANVAS_H}px">` +
      spans +
    `</div>`
  );
}

// ── Section dispatcher ─────────────────────────────────────────────────────

function transformWordCloudSection(inner, cls) {
  const tokens = cls.trim().split(/\s+/);
  if (!tokens.includes('word-cloud')) return inner;
  if (/class="word-cloud-canvas"/.test(inner)) return inner;
  const ul = findFirstUl(inner);
  if (!ul) return inner;
  const items = parseItems(ul.html);
  if (items.length === 0) return inner;
  const variant = pickVariant(cls);
  const canvas = buildCanvas(items, variant);
  if (!canvas) return inner;
  return inner.slice(0, ul.start) + canvas + inner.slice(ul.end);
}

function applyToRenderedHtml(html) {
  let out = '';
  let i = 0;
  while (i < html.length) {
    const open = html.indexOf('<section', i);
    if (open < 0) { out += html.slice(i); break; }
    out += html.slice(i, open);
    const tagEnd = html.indexOf('>', open);
    if (tagEnd < 0) { out += html.slice(open); break; }
    const openTag    = html.slice(open, tagEnd + 1);
    const classMatch = openTag.match(/\sclass="([^"]*)"/);
    const cls        = classMatch ? classMatch[1] : '';
    const tokens     = cls.trim().split(/\s+/);
    const isWC       = tokens.includes('word-cloud');

    let depth = 1, pos = tagEnd + 1, closeEnd = -1;
    while (pos < html.length) {
      if (html.startsWith('<section', pos)) {
        const e = html.indexOf('>', pos);
        if (e < 0) break;
        depth++; pos = e + 1;
      } else if (html.startsWith('</section>', pos)) {
        depth--;
        if (depth === 0) { closeEnd = pos + '</section>'.length; break; }
        pos += '</section>'.length;
      } else { pos++; }
    }
    if (closeEnd < 0) { out += html.slice(open); break; }

    if (!isWC) {
      out += html.slice(open, closeEnd);
      i = closeEnd;
      continue;
    }

    const inner    = html.slice(tagEnd + 1, closeEnd - '</section>'.length);
    const newInner = transformWordCloudSection(inner, cls);
    out += openTag + newInner + '</section>';
    i = closeEnd;
  }
  return out;
}

module.exports = {
  WORD_CLOUD_MODIFIERS,
  CANVAS_W,
  CANVAS_H,
  VARIANT_OPTS,
  CAT_ROTATION,
  applyToRenderedHtml,
  transformWordCloudSection,
  // exposed for unit tests
  clampWeight,
  normalizeWeights,
  parseItem,
  parseItems,
  findFirstUl,
  buildCanvas,
  packCloud,
  bboxFor,
  rectsCollide,
  sizeFromWeight,
  rotatedForRank,
  colorForWord,
  pickVariant,
};
