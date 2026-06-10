// Registry of per-component body-data completers (Surface D).
//
// A "data source" completes the literal VALUES inside one component's slide body
// — region names in a `map`, and whatever the next data component needs — off
// static, offline, baked vocabulary (zero model calls). Each is gated to its
// component(s) by the shared makeDataSource wrapper, which resolves the cursor's
// slide once (slide-context.js) and only then calls the completer.
//
// To add a data component: write its `(context, info, line) → CompletionResult`
// completer (next to its vocabulary, as map-complete.js sits with the basemaps)
// and append one makeDataSource(...) line below. complete.js spreads this array
// after the generic class-directive + skeleton sources, so a data source only
// ever fires inside its own component's body.

import { mapBodyCompletion } from './map-complete.js';
import { makeDataSource } from './slide-context.js';

export const dataSources = [makeDataSource(['map'], mapBodyCompletion)];
