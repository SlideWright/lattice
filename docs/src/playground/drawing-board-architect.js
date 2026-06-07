// The Architect — deterministic live review (Phase 1, Slice 5).
//
// The Architect is tooling-first (proposal §4): its findings come from the
// SAME pure lint-core the Node CLI runs (lib/authoring/lint-core.js), not from a
// model — so they can't hallucinate a component or a fix. Only the name/modifier
// vocabulary is data, computed at docs-build time and handed in. This is the
// zero-model floor: it works on every browser, offline, with nothing downloaded.
// Generation tiers + guided onboarding (the conversational half of Slice 5 / the
// Phase 2 model ladder) layer on top of this.
//
// Voiced as "the Architect" per the naming decision.

import lintCore from '../../../lib/authoring/lint-core.js';

// 1-based source line where each `---`-split chunk begins — matches lint-core's
// `source.split(/^---$/m)` so a finding's `slide` (chunk) index maps to a line.
function chunkStartLines(src) {
	const lines = src.split('\n');
	const starts = [1];
	for (let i = 0; i < lines.length; i++) {
		if (lines[i] === '---') starts.push(i + 2);
	}
	return starts;
}

export function createArchitect({ vocab, mount, reveal }) {
	const vocabSets = {
		names: new Set((vocab && vocab.names) || []),
		modifiers: new Set((vocab && vocab.modifiers) || []),
	};
	let lastSource = '';
	let timer = null;

	function cleanState() {
		const d = document.createElement('div');
		d.className = 'db-review-clean';
		d.textContent = '✓ Clean — every slide follows the authoring contract.';
		return d;
	}

	function card(f, starts) {
		const wrap = document.createElement('div');
		wrap.className = 'db-finding sev-' + f.severity;

		const head = document.createElement('div');
		head.className = 'db-finding-head';
		const dot = document.createElement('span');
		dot.className = 'db-finding-dot';
		dot.setAttribute('aria-hidden', 'true');
		const msg = document.createElement('span');
		msg.className = 'db-finding-msg';
		msg.textContent = f.message;
		head.append(dot, msg);

		const meta = document.createElement('div');
		meta.className = 'db-finding-meta';
		const tag = document.createElement('span');
		tag.className = 'db-finding-rule';
		tag.textContent = f.rule + (f.slide ? ' · slide ' + f.slide : '');
		meta.appendChild(tag);

		if (f.line) {
			const code = document.createElement('code');
			code.className = 'db-finding-line';
			code.textContent = f.line.length > 80 ? f.line.slice(0, 79) + '…' : f.line;
			wrap.appendChild(head);
			wrap.appendChild(code);
		} else {
			wrap.appendChild(head);
		}
		wrap.appendChild(meta);

		const actions = document.createElement('div');
		actions.className = 'db-finding-actions';
		const revealBtn = document.createElement('button');
		revealBtn.type = 'button';
		revealBtn.className = 'db-finding-btn';
		revealBtn.textContent = 'Reveal';
		revealBtn.addEventListener('click', () => {
			if (reveal) reveal(starts[f.slide] || 1);
		});
		const fixBtn = document.createElement('button');
		fixBtn.type = 'button';
		fixBtn.className = 'db-finding-btn';
		fixBtn.textContent = 'How to fix';
		const fix = document.createElement('pre');
		fix.className = 'db-finding-fix';
		fix.hidden = true;
		fix.textContent = f.fix || '';
		fixBtn.addEventListener('click', () => {
			fix.hidden = !fix.hidden;
			fixBtn.textContent = fix.hidden ? 'How to fix' : 'Hide';
		});
		actions.append(revealBtn, fixBtn);
		wrap.appendChild(actions);
		if (f.fix) wrap.appendChild(fix);
		return wrap;
	}

	function render(findings) {
		if (!mount) return;
		mount.innerHTML = '';
		if (!findings.length) {
			mount.appendChild(cleanState());
			return;
		}
		const sevRank = (f) => (f.severity === 'error' ? 0 : 1);
		findings.sort((a, b) => sevRank(a) - sevRank(b) || a.slide - b.slide);
		const errs = findings.filter((f) => f.severity === 'error').length;

		const head = document.createElement('div');
		head.className = 'db-review-head';
		const n = findings.length;
		head.textContent =
			'the Architect flags ' + n + ' issue' + (n === 1 ? '' : 's') + (errs ? ' · ' + errs + ' to fix' : '');
		mount.appendChild(head);

		const starts = chunkStartLines(lastSource);
		for (const f of findings) mount.appendChild(card(f, starts));
	}

	function run() {
		try {
			render(lintCore.lintTextWith(lastSource, vocabSets));
		} catch (e) {
			// Never let a review error break the editor.
			if (mount) mount.innerHTML = '';
		}
	}

	function update(source) {
		lastSource = source || '';
		clearTimeout(timer);
		timer = setTimeout(run, 250);
	}

	return { update };
}
