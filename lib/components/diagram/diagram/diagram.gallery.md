---
marp: true
theme: indaco
size: hd
paginate: true
header: "Lattice · diagram"
footer: "Mermaid 11.14 · rendered through the diagram component"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _footer: '' -->
<!-- _header: '' -->

# Every Mermaid diagram, one slide each.

`Mermaid 11.14 · Lattice Theme`

*A reference gallery of the 26 diagram types Mermaid supports, rendered with the Lattice palette so you can see what each one looks like in production.*

---

<!-- _class: split-list -->

## How this gallery is organised.

`Orientation · How to use this deck`

### Three groups, twenty-six diagrams

Stable diagrams render with full theme control. Experimental ones marked 🔥 may evolve in syntax and have limited theming surfaces.

- **15**
  - **Stable**
  - Flowchart, sequence, class, state, ER, journey, gantt, pie, quadrant, requirement, gitgraph, c4, mindmap, timeline, zenuml.
- **11**
  - **Experimental 🔥**
  - Sankey, xy chart, block, packet, kanban, architecture, radar, treemap, venn, ishikawa, treeView.
- **6**
  - **Themeable**
  - Flowchart, sequence, pie, state, class, journey have named themeVariables. Everything else inherits from the core six.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: '' -->

`Group 01 · Stable diagrams`

## The fifteen well-supported types.

---

<!-- _class: diagram -->

`01 · Flowchart`

## Boxes and arrows. The most-used diagram type.

```mermaid
---
title: Capability-pack distribution
---
flowchart LR
  A{{"Policy Registry"}} --> B(["Control Plane"])
  B -->|"signed pack"| C["Consuming App"]
  C -->|"orchestrate / resolve"| D[("Application DB")]
  B -.->|"revocation"| C
```

> Full theme support — node fills, borders, edge colors, cluster fills, edge labels all controllable via themeVariables.

---

<!-- _class: diagram -->

`02 · Sequence Diagram`

## Actors and signals over time.

```mermaid
---
title: Orchestrate call sequence
---
sequenceDiagram
  participant App
  participant SDK
  participant Registry
  App->>SDK: orchestrate(prompt)
  SDK->>SDK: verify pack
  SDK->>Registry: unwrap adapter
  Registry-->>SDK: adapter weights
  SDK-->>App: handle
  Note over SDK: adapter evicted on close
```

> Full theme support — actor backgrounds, signal colors, activation bars, note styling all themeable.

---

<!-- _class: diagram -->

`03 · Class Diagram`

## UML classes with attributes, methods, and inheritance.

```mermaid
---
title: Agentic SDK class model
---
classDiagram
  class AgenticSDK {
    -CapabilityPack pack
    -TenantAdapter adapter
    +orchestrate(field, prompt) Handle
    +resolve(field, handle, purpose) Outcome
  }
  class CapabilityPack {
    +String tenantId
    +int version
    +verify() boolean
  }
  class TenantAdapter {
    -byte[] weights
    +evict() void
  }
  AgenticSDK *-- CapabilityPack
  AgenticSDK *-- TenantAdapter
```

> Themeable — `classText` controls label color; node fills inherit from `primaryColor`.

---

<!-- _class: diagram -->

`04 · State Diagram`

## A finite state machine.

```mermaid
---
title: Approval state machine
---
stateDiagram-v2
  [*] --> Draft
  Draft --> Submitted: submit
  Submitted --> Approved: approve
  Submitted --> Rejected: reject
  Approved --> [*]
  Rejected --> Draft: revise
  Rejected --> [*]: withdraw
```

> Themeable — `labelColor` and `altBackground` for composite states. State fills inherit from primary.

---

<!-- _class: diagram -->

`05 · Entity Relationship Diagram`

## Database tables and their relationships.

```mermaid
---
title: Tenant capability-pack schema
---
erDiagram
  TENANT ||--o{ CAPABILITY_PACK : "issues"
  CAPABILITY_PACK ||--|{ ADAPTER_VERSION : "wraps"
  CAPABILITY_PACK ||--o{ AUDIT_EVENT : "emits"
  TENANT {
    string tenantId PK
    string name
    timestamp createdAt
  }
  CAPABILITY_PACK {
    string packId PK
    string tenantId FK
    int version
  }
  ADAPTER_VERSION {
    int version PK
    bytes wrappedAdapter
    timestamp expiresAt
  }
```

> No named themeVariables — inherits border / text / fill from core variables.

---

<!-- _class: diagram -->

`06 · User Journey`

## Steps and the emotional state at each one.

```mermaid
journey
  title Agentic SDK Adoption
  section Discovery
    Read architecture doc: 4: Engineer
    Talk to platform team: 5: Engineer, Platform
  section Integration
    Add SDK dependency: 4: Engineer
    Wire mTLS certs: 2: Engineer
    First successful orchestration: 5: Engineer
  section Production
    Pass security review: 3: Engineer, Security
    Ship to prod: 5: Engineer
```

> Themeable — eight `fillType0..7` variables for the section coloring.

---

<!-- _class: diagram -->

`07 · Gantt`

## Tasks across a timeline, with dependencies.

```mermaid
gantt
  title Orchestration Mesh Phase 1
  dateFormat YYYY-MM-DD
  section Foundation
    Registry provisioning :done,   reg,   2025-01-06, 14d
    Control plane MVP     :active, cp,    after reg, 21d
    SDK skeleton          :        sdk,   after reg, 21d
  section Integration
    First app integration :        int1,  after cp, 14d
    Audit pipeline        :        audit, after int1, 10d
  section Cutover
    Production rollout    :crit,   roll,  after audit, 7d
```

> Lots of dedicated themeVariables — task bar, active task, done task, critical, today line all separately controllable.

---

<!-- _class: diagram -->

`08 · Pie Chart`

## Proportions of a whole.

```mermaid
pie showData
  title Audit log volume by source
  "Adapter unwrap events" : 12500
  "Pack issuance" : 4200
  "Revocations" : 180
  "Policy changes" : 95
  "Cert provisioning" : 60
```

> Most theme-rich diagram — twelve `pie1..12` slot colors plus title, section, legend, stroke variables.

---

<!-- _class: diagram -->

`09 · Quadrant Chart`

## Two-axis priority scatter.

```mermaid
quadrantChart
  title Reach vs effort
  x-axis Low Effort --> High Effort
  y-axis Low Reach --> High Reach
  quadrant-1 Strategic Bets
  quadrant-2 Quick Wins
  quadrant-3 Defer
  quadrant-4 Time Sinks
  Pack caching: [0.3, 0.7]
  Multi-tenant adapters: [0.7, 0.85]
  Per-purpose packs: [0.8, 0.4]
  Vendor scoping: [0.4, 0.55]
  Manual rotation: [0.2, 0.2]
```

> Themeable — four quadrant fills and text colors, axis labels, point fill all controllable.

---

<!-- _class: diagram -->

`10 · Requirement Diagram`

## SysML-style requirements with traceability.

```mermaid
---
title: Policy custody requirements
---
requirementDiagram
  requirement non_exportable_policy {
    id: 1
    text: "Base policy must never leave the registry"
    risk: high
    verifymethod: inspection
  }
  requirement audit_trail {
    id: 2
    text: "Every adapter unwrap logged outside platform control"
    risk: high
    verifymethod: test
  }
  element registry {
    type: hardware
  }
  element control_plane {
    type: service
  }
  registry - satisfies -> non_exportable_policy
  registry - satisfies -> audit_trail
  control_plane - traces -> audit_trail
```

> Inherits from core variables. No diagram-specific theme keys.

---

<!-- _class: diagram -->

`11 · GitGraph`

## Branching, merging, tags.

```mermaid
---
title: Release branch history
---
gitGraph
  commit id: "inita"
  commit id: "add SDK"
  branch feature/multi-tenant
  checkout feature/multi-tenant
  commit id: "tenant model"
  commit id: "tenant tests"
  checkout main
  merge feature/multi-tenant tag: "v1.1"
  branch hotfix/audit
  commit id: "audit fix"
  checkout main
  merge hotfix/audit tag: "v1.1.1"
  commit id: "phase 2"
```

---

<!-- _class: diagram -->

`12 · C4 Diagram`

## Software architecture at four zoom levels.

```mermaid
C4Context
  title Orchestration Mesh
  Person(eng, "Engineer", "Builds SDK")
  Person(ops, "Operator", "Owns packs")
  System(platform, "Mesh", "SDK + control plane")
  System_Ext(reg, "Policy Registry", "Holds base policies")
  System_Ext(app, "Consumer", "Calls SDK")
  Rel(eng, app, "Builds")
  Rel(app, platform, "Orchestrate")
  Rel(ops, platform, "Manages")
  Rel(platform, reg, "Wrap adapters")
```

> Marked 🦺⚠️ in the docs — supported but the team flags it as work-in-progress. Theme support partial.

---

<!-- _class: diagram -->

`13 · Mindmap`

## Hierarchical brainstorm.

```mermaid
mindmap
  root((Orchestration Mesh))
    Policy
      Base policy
        Registry
        Non-exportable
      Tenant adapter
        Wrapped
        Per-tenant
    Operations
      Orchestrate
      Resolve
      Rotate
    Audit
      Registry stream
      Control plane
      SDK local
    Boundaries
      Prod
      Non-prod
      Vendor
```

> Inherits from core. Multiple shape syntaxes: `((round))`, `[square]`, `(rounded)`, `))cloud((`, `)hex(`.

---

<!-- _class: diagram -->

`14 · Timeline`

## Events on a horizontal axis.

```mermaid
timeline
  title Orchestration Mesh Roadmap
  section Phase 01 · Core
    Q1 : Capability-pack model
       : Adapter versioning
       : Registry-anchored policy
    Q2 : Signed distribution
       : Version-floor revocation
  section Phase 02 · Scale
    Q3 : Multi-tenant
       : Per-field-class adapters
       : Orchestration pipeline
    Q4 : Historical migration
       : Automated rotation
  section Phase 03 · Boundaries
    Q1+1 : Non-prod packs
         : Vendor-scoped packs
```

> Inherits from core. The section coloring uses the `cScale` palette.

---

<!-- _class: diagram -->

<!-- _class: content -->

`15 · ZenUML`

## A simpler sequence-diagram dialect.

ZenUML is a Mermaid diagram type that emits HTML+SVG with Tailwind CSS classes for styling. The Mermaid CLI can produce the markup, but it does not bundle the @zenuml/core stylesheet — so static SVG export renders the structure without the visual styling. ZenUML works in browser contexts where the Tailwind utilities resolve.

For static-PDF pipelines like this one, prefer the standard `sequenceDiagram` (slide 5) — same conceptual model, fully supported by the Mermaid CLI, themable through `themeVariables`.

```text
zenuml
  title Order
  Customer->Order.create() {
    Order->Inventory.check() {
      return available
    }
    return confirmed
  }
```

> ZenUML uses HTML/Tailwind rendering rather than pure SVG. Use sequenceDiagram for static export contexts.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: '' -->

`Group 02 · Experimental diagrams`

# The eleven new types marked 🔥.

---

<!-- _class: diagram -->

`16 · Sankey 🔥`

## Flow volumes between nodes.

```mermaid
sankey-beta
Wages,Disposable income,750
Disposable income,Savings,150
Disposable income,Spending,600
Spending,Housing,250
Spending,Food,200
Spending,Other,150
```

> CSV-style input. Theme inheritance only — link colors are computed from node colors via the `linkColor` config.

---

<!-- _class: diagram -->

`17 · XY Chart 🔥`

## Bar and line chart on a numeric axis.

```mermaid
xychart-beta
    title "Quarterly orchestration volume (millions)"
    x-axis [Q1, Q2, Q3, Q4]
    y-axis "Calls" 0 --> 100
    bar [42, 58, 67, 81]
    line [40, 55, 65, 80]
```

> Inherits from core. The plot color palette can be overridden but per-series control is limited.

---

<!-- _class: diagram -->

`18 · Block Diagram 🔥`

## Tile layout for system blocks.

```mermaid
block-beta
  columns 3
  Frontend["Frontend"] Backend["Backend"] Database[("DB")]
  space:3
  Cache(("Cache")) Queue(("Queue")) Storage[("Storage")]
```

> Inherits from core. Spacing controlled by the `space:N` directive.

---

<!-- _class: diagram -->

`19 · Packet 🔥`

## Bit-level packet layout.

```mermaid
packet-beta
title TLS Record header
0-7: "Content Type"
8-15: "Major Version"
16-23: "Minor Version"
24-39: "Length"
40-47: "Reserved"
```

> Inherits from core. Width-fixed at 32 bits per row by default; `0-N` ranges define each field.

---

<!-- _class: diagram -->

`20 · Kanban 🔥`

## A board with swim-lane columns.

```mermaid
kanban
  Backlog
    [Multi-tenant adapters]
    [Deprovision audit]
  In Progress
    [Audit reconciler]
    [SDK Java port]
  Review
    [Vendor pack spec]
  Done
    [Phase 1 launch]
    [Registry provisioning]
```

> Inherits from core. Per-card `[Title]@{ assigned: ..., priority: ... }` metadata supported but optional.

---

<!-- _class: diagram -->

`21 · Architecture 🔥`

## Cloud-architecture style with services and groups.

```mermaid
architecture-beta
  group platform(cloud)[Orchestration Mesh]
  service reg(database)[Policy Registry] in platform
  service cp(server)[Control Plane] in platform
  service sdk(internet)[SDK Fleet] in platform
  service store(disk)[Adapter Store] in platform
  reg:R -- L:cp
  cp:R -- L:sdk
  cp:B -- T:store
```

> Inherits from core. Icons drawn from a registered set; default set is limited — register more via `mermaid.registerIconPacks`.

---

<!-- _class: diagram -->

`22 · Radar 🔥`

## Multi-axis polar chart.

```mermaid
radar-beta
  title Architecture review · scoring
  axis Speed, Resilience, Auditability, Cost, Simplicity
  curve Edge["Capability-pack model"]{85, 90, 95, 70, 60}
  curve Gateway["Gateway-only"]{60, 70, 80, 50, 80}
```

> Inherits from core. Multiple `curve` lines plot on the same axes.

---

<!-- _class: diagram -->

`23 · Treemap 🔥`

## Nested rectangles sized by value.

```mermaid
treemap-beta
"Orchestration Mesh"
  "SDK"
    "Java": 4200
    "Python": 1800
    "Go": 800
  "Control Plane"
    "API": 2400
    "Signing": 1200
    "Audit": 900
  "Adapter Store"
    "Postgres": 600
    "Backup": 200
```

> Inherits from core. Sized values cascade from leaves up; intermediate nodes don't take a value.

---

<!-- _class: diagram -->

`24 · Venn 🔥`

## Set overlap.

```mermaid
venn-beta
  set A["Prod"]
  set B["Non-prod"]
  set V["Vendor"]
  union A, B["shared schemas"]
  union B, V["vendor pilot"]
```

> Inherits from core. `union A, B` for two-set overlap; `set X["Label"]` to give a display name distinct from the identifier; `union A, B["..."]` to label an intersection region.

---

<!-- _class: diagram -->

`25 · Ishikawa 🔥`

## Fishbone cause-and-effect.

```mermaid
ishikawa-beta
fishbone
    Effect: "Audit reconciliation drift"
    People:
        Skill gap on inference ops
        On-call rotation thin
    Process:
        Manual rotation
        No drill cadence
    Tooling:
        Log schema versioning
        SIEM coverage gaps
    Environment:
        Multi-region replication
```

> Inherits from core. Branches default to four (people, process, tooling, environment) but any heading is allowed.

---

<!-- _class: diagram -->

`26 · TreeView 🔥`

## Indented file-tree style hierarchy.

```mermaid
treeView-beta
    "src/"
        "main.js"
        "lib/"
            "orchestrate.js"
            "verify.js"
    "package.json"
```

> Three named theme variables: `labelFontSize`, `labelColor`, `lineColor`. Indentation alone determines the tree.

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _footer: '' -->
<!-- _header: '' -->

`Mermaid 11.14 · Lattice Theme`

## Twenty-six diagrams, one theme.

*Stable diagrams have rich theme control. Experimental diagrams marked 🔥 inherit from the core six variables and may evolve in syntax. Use this gallery as a reference for which diagram fits a given problem.*


<!-- Import Mermaid and the Lattice runtime theme for VS Code / web preview.
     The build script (lattice-emulator.js) pre-renders Mermaid to SVG at build time
     so these scripts are a no-op in the PDF/HTML output. -->
<!-- markdownlint-disable MD033 -->
<script src="../mermaid-v11.min.js"></script>
<script src="../dist/lattice-runtime.js"></script>
