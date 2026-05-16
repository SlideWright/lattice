<!-- _class: decision -->

## What we are doing.

- **Chosen path.** Self-contained per-component folders at `lib/components/<name>/`. One folder, everything the component owns.
- **Rejected option.** Flat files at `lib/components/<name>.{json,css,js,md}` — defeats the self-contained goal and leaves transform.js scattered.
