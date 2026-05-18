<!-- _class: title silent -->

# diagram

`1 component`

Diagram — graph-substance network visuals (external renderer).


---

<!-- _class: diagram -->

## How a Lattice slide goes from markdown to PDF.

```mermaid
flowchart LR
  A[deck.md] --> B[lattice-emulator.js]
  B --> C{has mermaid?}
  C -->|yes| D[mmdc → inline SVG]
  C -->|no| E[parse + process]
  D --> E
  E --> F[HTML]
  F --> G[Puppeteer print]
  G --> H[deck.pdf]
```
