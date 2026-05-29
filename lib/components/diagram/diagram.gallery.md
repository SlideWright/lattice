<!-- _class: title silent -->

# diagram

`1 component`

Diagram — graph-substance network visuals (external renderer).


---

<!-- _class: diagram -->

## How a signal moves from input to decision.

```mermaid
flowchart LR
  A["Raw signals"] --> B["Classify"]
  B --> C["Score & weight"]
  C --> D["Decision log"]
  D --> E["Calibration"]
  E -.->|"adjust weights"| C
```
