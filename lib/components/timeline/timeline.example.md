<!-- _class: timeline -->

## How a deck moves from draft to share.

1. **Draft**
   - *Author writes markdown with appropriate `_class` directives.*
2. **Build**
   - *`npm run build:<deck>` renders HTML then PDF via Puppeteer.*
3. **Review**
   - *Reviewer opens the raw PDF link; per-feature deck shows the change in context.*
4. **Ship**
   - *Merge the PR; CI rebuilds against main and updates the gallery.*
