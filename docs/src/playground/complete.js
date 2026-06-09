// CodeMirror autocomplete assembly for the Lattice editor.
//
// Composes the slide-context-sensitive completion sources into one
// `autocompletion` extension. Each source returns null outside its own context,
// so they never compete: the class-directive source fires only inside
// `<!-- _class: … -->`, the map source only on a list item inside a map slide.
//
// All grammar/decision logic is pure and lives in slide-context.js (unit
// tested); this file is the thin CodeMirror adapter — it reads the cursor's
// line, hands the text to the pure functions, and shapes the result into
// CodeMirror's { from, options, validFor }. Vocabulary (component catalog +
// universal modifiers) comes from the page handoff the Drawing Board already
// builds for the Architect's linter, so completion and lint speak the same
// vocabulary; when it's absent (the single-component Specimen editor) the
// class-directive source is simply inert.

import { autocompletion } from '@codemirror/autocomplete';
import { mapCompletionSource } from './map-complete.js';
import { classDirectiveCompletion, classOptions, modifierOptions } from './slide-context.js';

const TOKEN = /^[\w-]*$/;

// Completes the component name and modifiers inside a `_class:` directive.
function classDirectiveSource(catalog, universalModifiers) {
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

// Build the editor's autocomplete extension. `vocab` is the Drawing Board's
// lintVocab ({ names, modifiers, universalModifiers, mapRegions }); `catalog` is
// the compact component catalog ({ name, bucket, variants, summary, … }). Both
// optional — without them only the (self-sufficient) map source is live.
export function latticeAutocomplete({ vocab, catalog } = {}) {
	const universalModifiers = (vocab && (vocab.universalModifiers || vocab.modifiers)) || [];
	return autocompletion({
		override: [classDirectiveSource(catalog, universalModifiers), mapCompletionSource],
		activateOnTyping: true,
		icons: false,
	});
}
