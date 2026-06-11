// The components the editor registers a body-data completer for (Surface D).
//
// Pure and import-free so the autocomplete-parity test can read it directly and
// gate it against (a) the manifests that declare `dataCompletion: true` and
// (b) the registry wired in data-sources.js. Keep all three in step — the
// parity test fails the build if they drift.
export const DATA_SOURCE_COMPONENTS = ['map'];
