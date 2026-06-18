/**
 * The concept ontology loader — the shared source-of-truth module for Lattice's
 * concept graph, mirroring lib/forms/index.js (HARD RULE 15 — reuse the loader
 * pattern). It reads the hand-authored ontology (concepts.json), validates its
 * shape and referential integrity, and — the load-bearing part — runs the
 * **drift gate** in two tiers: (1) every node that claims a live catalog encodes
 * it must resolve to a real, non-empty vocabulary in the actual code; and (2)
 * every structural backbone edge must be honored by the live catalogs (a Frame
 * whose `cells` resolve, the component fields the join
 * edges claim, …). Counts are derived from those catalogs, never stored in the
 * ontology, so the graph can never claim a count — or a structural relationship —
 * the engine doesn't ship. (Axis orthogonality and component→finish have no
 * catalog to check against, so they are encoded assertions, gated only for
 * internal consistency.)
 *
 * Consumed by tools/build-concepts.js (which projects it to dist/docs/concepts.json).
 * See design/concepts.md.
 */

const fs = require('node:fs');
const path = require('node:path');

const ONTOLOGY_FILE = path.join(__dirname, 'concepts.json');

const NODE_KINDS = Object.freeze(['axis', 'noun', 'join', 'grouping']);
const RELATIONS = Object.freeze([
  'orthogonal',
  'resolves-into',
  'produces',
  'holds',
  'fits',
  'is-a',
  'selects',
  'binds',
  'receives',
  'grouped-by',
]);
// The model invariant: these concepts must always be present — the four axes,
// the three structural nouns, the join, and the grouping. If a refactor drops
// one from the ontology, the gate fails rather than silently shipping a partial map.
const REQUIRED_NODES = Object.freeze([
  'function',
  'form',
  'substance',
  'finish',
  'frame',
  'cell',
  'tile',
  'component',
  'bucket',
]);

// The live vocabularies each node's `source` is checked against — the actual
// catalogs the engine ships. Required lazily so a broken component/forms catalog
// surfaces as ITS OWN gate (loud, in its own tool), not as a confusing error here.
function liveVocabularies() {
  const comp = require('../components');
  const forms = require('../forms');
  const { frames, cells, tiles } = forms.loadCatalog();
  const manifests = comp.loadAll();
  return {
    components: {
      FUNCTIONS: [...comp.FUNCTIONS],
      FORMS: [...comp.FORMS],
      SUBSTANCES: [...comp.SUBSTANCES],
      BUCKETS: [...comp.BUCKETS],
      components: manifests.map((m) => m.name),
    },
    forms: {
      frames: frames.map((f) => f.id),
      cells: cells.map((c) => c.id),
      tiles: tiles.map((t) => t.id),
    },
    // The full catalog objects — the evidence the edge-reality gate checks the
    // structural relationships against (not just the node vocabularies).
    raw: { components: manifests, frames, cells, tiles },
  };
}

// The structural backbone edges, each paired with a predicate that must hold in
// the LIVE catalogs — so the graph's load-bearing relationships are enforced
// against engine reality, not merely asserted. Keyed "from->to:relation". Edges
// absent here (axis orthogonality; component→finish, which has no catalog) are
// encoded assertions, checked only for internal consistency — there is nothing
// in a catalog to verify them against.
const EDGE_EVIDENCE = Object.freeze({
  'form->frame:resolves-into': (r) => r.frames.length > 0,
  'form->cell:resolves-into': (r) => r.cells.length > 0,
  'form->tile:resolves-into': (r) => r.tiles.length > 0,
  'frame->cell:produces': (r) => r.frames.some((f) => Array.isArray(f.cells) && f.cells.length > 0),
  'cell->tile:holds': (r) => r.cells.some((c) => (c.accepts || []).some((k) => k !== 'frame')),
  'tile->cell:fits': (r) => r.tiles.some((t) => Array.isArray(t.fits) && t.fits.length > 0),
  'component->function:is-a': (r) => r.components.every((c) => Boolean(c.function)),
  'component->form:selects': (r) => r.components.every((c) => Boolean(c.form)),
  'component->substance:binds': (r) => r.components.every((c) => Boolean(c.substance)),
  'component->bucket:grouped-by': (r) => r.components.length > 0,
});

// THE EDGE-REALITY GATE. For each structural backbone edge, assert the live
// catalogs actually honor the relationship — a Frame's `cells` resolve, every
// Component really carries the `function`/`form`/`substance` field the join edge
// claims, and so on. This is what makes "the relationships are enforced" true,
// not just "the node vocabularies are."
function validateEdgesAgainstEngine(doc, raw, errors) {
  for (const e of doc.edges) {
    const predicate = EDGE_EVIDENCE[`${e.from}->${e.to}:${e.relation}`];
    if (!predicate) continue;
    if (!predicate(raw)) {
      errors.push(
        `edge ${e.from}→${e.to} (${e.relation}) is not honored by the live catalogs — the engine no longer reflects this relationship`,
      );
    }
  }
}

function readOntology() {
  let raw;
  try {
    raw = fs.readFileSync(ONTOLOGY_FILE, 'utf8');
  } catch {
    throw new Error(`cannot read concept ontology: ${ONTOLOGY_FILE}`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`concept ontology is not valid JSON (${ONTOLOGY_FILE}): ${e.message}`);
  }
}

// Shape + referential integrity: ids unique, kinds/relations from the known sets,
// required concepts present, every edge endpoint a declared node.
function validateShape(doc, errors) {
  if (!Array.isArray(doc.nodes)) {
    errors.push('ontology.nodes must be an array');
    return;
  }
  if (!Array.isArray(doc.edges)) {
    errors.push('ontology.edges must be an array');
    return;
  }
  const ids = new Set();
  for (const n of doc.nodes) {
    if (!n.id || typeof n.id !== 'string') {
      errors.push(`node missing string id: ${JSON.stringify(n)}`);
      continue;
    }
    if (ids.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
    ids.add(n.id);
    if (!NODE_KINDS.includes(n.kind)) errors.push(`node ${n.id}: unknown kind "${n.kind}"`);
    if (!n.system || typeof n.system !== 'string') errors.push(`node ${n.id}: missing system word`);
    if (!n.definition || typeof n.definition !== 'string') errors.push(`node ${n.id}: missing definition`);
  }
  for (const id of REQUIRED_NODES) {
    if (!ids.has(id)) errors.push(`required concept missing from ontology: ${id}`);
  }
  for (const e of doc.edges) {
    if (!ids.has(e.from)) errors.push(`edge references unknown "from" node: ${e.from}`);
    if (!ids.has(e.to)) errors.push(`edge references unknown "to" node: ${e.to}`);
    if (!RELATIONS.includes(e.relation)) {
      errors.push(`edge ${e.from}→${e.to}: unknown relation "${e.relation}"`);
    }
  }
}

// THE DRIFT GATE. Every node that declares a `source` must point at a live
// catalog vocabulary that exists and is non-empty. This is what keeps the
// ontology honest as components.json / forms.json evolve: rename or remove the
// `FORMS` vocabulary and this fails loudly instead of the map quietly lying.
function validateAgainstCatalogs(doc, live, errors) {
  for (const n of doc.nodes) {
    if (!n.source) continue;
    const { catalog, vocab } = n.source;
    const bag = live[catalog];
    if (!bag) {
      errors.push(`node ${n.id}: source.catalog "${catalog}" is not a known catalog (components|forms)`);
      continue;
    }
    const value = bag[vocab];
    if (value === undefined) {
      errors.push(`node ${n.id}: source "${catalog}.${vocab}" does not exist in the live catalog — drifted?`);
      continue;
    }
    if (!Array.isArray(value) || value.length === 0) {
      errors.push(`node ${n.id}: live vocabulary "${catalog}.${vocab}" is empty`);
    }
  }
}

// Counts are DERIVED from the live catalogs, keyed by node id — so the one place
// the numbers live is generated, never hand-typed (the drift the prose doc avoids).
function deriveCounts(doc, live) {
  const counts = {};
  for (const n of doc.nodes) {
    if (!n.source) continue;
    const value = live[n.source.catalog]?.[n.source.vocab];
    if (Array.isArray(value)) counts[n.id] = value.length;
  }
  return counts;
}

function loadConcepts() {
  const doc = readOntology();
  const errors = [];
  validateShape(doc, errors);
  if (errors.length) {
    throw new Error(`concept ontology invalid:\n  ${errors.join('\n  ')}`);
  }
  const live = liveVocabularies();
  validateAgainstCatalogs(doc, live, errors);
  validateEdgesAgainstEngine(doc, live.raw, errors);
  if (errors.length) {
    throw new Error(`concept ontology drifted from the live catalogs:\n  ${errors.join('\n  ')}`);
  }
  return {
    model: doc.model,
    modelHref: doc.modelHref,
    counts: deriveCounts(doc, live),
    nodes: doc.nodes,
    edges: doc.edges,
  };
}

module.exports = {
  ONTOLOGY_FILE,
  NODE_KINDS,
  RELATIONS,
  REQUIRED_NODES,
  liveVocabularies,
  readOntology,
  validateShape,
  validateAgainstCatalogs,
  EDGE_EVIDENCE,
  validateEdgesAgainstEngine,
  deriveCounts,
  loadConcepts,
};
