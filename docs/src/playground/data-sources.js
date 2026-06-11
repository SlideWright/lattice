// Registry of per-component body-data completers (Surface D).
//
// A "data source" completes the literal VALUES inside one component's slide body
// — region names in a `map`, and whatever the next data component needs — off
// static, offline, baked vocabulary (zero model calls). Each is gated to its
// component(s) by the shared makeDataSource wrapper, which resolves the cursor's
// slide once (slide-context.js) and only then calls the completer.
//
// The authoritative list of which components have a body completer is the pure
// DATA_SOURCE_COMPONENTS constant; this file maps each to its completer. The
// component's manifest must declare `dataCompletion: true`, and the
// autocomplete-parity test gates the manifest flags, the constant, and this
// map together so none drifts.
//
// To add a data component: write its `(context, info, line) → CompletionResult`
// completer (next to its vocabulary, as map-complete.js sits with the basemaps),
// add the component to DATA_SOURCE_COMPONENTS, and register the completer in
// COMPLETERS below.

import { DATA_SOURCE_COMPONENTS } from './data-source-components.js';
import { mapBodyCompletion } from './map-complete.js';
import { makeDataSource } from './slide-context.js';

// component name → its body completer. Every DATA_SOURCE_COMPONENTS entry needs
// one (enforced here at module load, and by the parity test at build time).
const COMPLETERS = { map: mapBodyCompletion };

export const dataSources = DATA_SOURCE_COMPONENTS.map((name) => {
	const fn = COMPLETERS[name];
	if (!fn) throw new Error(`data source "${name}" is declared but has no completer in COMPLETERS`);
	return makeDataSource([name], fn);
});
