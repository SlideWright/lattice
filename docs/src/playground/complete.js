// CodeMirror autocomplete assembly for the Lattice editor.
//
// Composes the slide-context-sensitive completion sources into one
// `autocompletion` extension. Each source returns null outside its own context,
// so they never compete:
//   • class-directive — component names + modifiers inside `<!-- _class: … -->`
//   • skeleton        — a one-shot slot scaffold on an empty classed slide body
//   • data sources    — literal body values per component (map regions, …),
//                       from the data-sources.js registry
//
// All grammar/decision logic is pure and lives in slide-context.js (unit
// tested); this file is the thin CodeMirror adapter — it reads the cursor's
// line, hands the text to the pure functions, and shapes the result into
// CodeMirror's { from, options, validFor }. Vocabulary (component catalog +
// universal modifiers) comes from the page handoff the Drawing Board already
// builds for the Architect's linter, so completion and lint speak the same
// vocabulary; when it's absent (the single-component Specimen editor) the
// class-directive and skeleton sources are simply inert.

import { autocompletion } from '@codemirror/autocomplete';
import { dataSources } from './data-sources.js';
import {
	blankBodyPartial,
	classDirectiveCompletion,
	classOptions,
	modifierOptions,
	skeletonBody,
	slideBodyEmpty,
	slideClassAt,
} from './slide-context.js';

const TOKEN = /^[\w-]*$/;

// Completes the component name and modifiers inside a `_class:` directive.
export function classDirectiveSource(catalog, universalModifiers) {
	return (context) => {
		const line = context.state.doc.lineAt(context.pos);
		const before = context.state.sliceDoc(line.from, context.pos);
		const spot = classDirectiveCompletion(before);
		if (!spot) return null;
		// Stay quiet on a bare position until there's a keystroke (or Ctrl-Space),
		// matching the map source's restraint.
		if (!spot.typed && !context.explicit) return null;

		const options =
			spot.kind === 'class'
				? classOptions(catalog)
				: modifierOptions(spot.name, catalog, universalModifiers, spot.present);
		if (!options.length) return null;

		return { from: line.from + spot.from, options, validFor: TOKEN };
	};
}

// Offers a one-shot slot skeleton on the empty body of a classed slide — the
// correct nesting/slot shape, plain text (no snippet fields: skeletons contain
// literal `$`/`{` that snippet templates would mis-parse). Inert once the slide
// has any content, so it never clobbers authored body.
export function skeletonSource(catalog) {
	if (!catalog?.length) return () => null;
	const byName = new Map(catalog.map((c) => [c.name, c]));
	return (context) => {
		const doc = context.state.doc;
		const line = doc.lineAt(context.pos);
		const info = slideClassAt((n) => doc.line(n).text, line.number);
		if (!info || line.number <= info.directiveLine) return null; // on/above the directive
		const comp = byName.get(info.name);
		if (!comp?.skeleton) return null;
		if (!slideBodyEmpty((n) => doc.line(n).text, doc.lines, info.directiveLine, line.number)) return null;

		const before = context.state.sliceDoc(line.from, context.pos);
		const spot = blankBodyPartial(before);
		if (!spot) return null;
		if (!spot.typed && !context.explicit) return null;
		const body = skeletonBody(comp.skeleton);
		if (!body) return null;

		const option = {
			label: 'skeleton',
			type: 'text',
			detail: `${info.name} slots`,
			boost: 80,
			apply: (view, _completion, from, to) => {
				view.dispatch({ changes: { from, to, insert: body }, selection: { anchor: from } });
			},
		};
		return { from: line.from + spot.from, options: [option], validFor: TOKEN };
	};
}

// Build the editor's autocomplete extension. `vocab` is the Drawing Board's
// lintVocab ({ names, modifiers, universalModifiers, mapRegions }); `catalog` is
// the compact component catalog ({ name, bucket, variants, skeleton, … }). Both
// optional — without them only the (self-sufficient) data sources are live.
export function latticeAutocomplete({ vocab, catalog } = {}) {
	const universalModifiers = (vocab && (vocab.universalModifiers || vocab.modifiers)) || [];
	return autocompletion({
		override: [classDirectiveSource(catalog, universalModifiers), skeletonSource(catalog), ...dataSources],
		activateOnTyping: true,
		icons: false,
	});
}
