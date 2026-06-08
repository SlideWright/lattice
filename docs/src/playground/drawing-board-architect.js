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

export function createArchitect({ vocab, mount, reveal, applyFix }) {
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

		// One-click fix for the mechanical footguns (the bold card-style inline
		// shape). Computed by the shared lint-core, applied through the editor so
		// it re-renders + re-lints. Other rules need author content -> guidance only.
		if (f.autofixable && applyFix) {
			const applyBtn = document.createElement('button');
			applyBtn.type = 'button';
			applyBtn.className = 'db-finding-btn db-finding-apply';
			applyBtn.textContent = 'Apply fix';
			applyBtn.addEventListener('click', () => {
				const out = lintCore.applyFix(lastSource, f);
				if (out != null) applyFix(out);
			});
			actions.appendChild(applyBtn);
		}

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

// ── Conversation-first onboarding (the deterministic / zero-model floor) ──────
// Three escapable questions (what · who · the one outcome) → keyword retrieval
// over the catalog → a proposed outline → Build scaffolds a starter deck. This
// is one performance of the beats (proposal Appendix A); generation tiers layer
// on in Phase 2. No model: phrasing is templated, retrieval is keyword overlap.

const ONBOARD_STEPS = [
	{ key: 'what', q: 'What are you presenting?', chips: ['Board update', 'Investor pitch', 'Strategy / proposal', 'Product / project review'] },
	{ key: 'who', q: "Who's in the room?", chips: ['The board', 'Exec team', 'Investors', 'Clients', 'Internal'] },
	{ key: 'outcome', q: 'Last one, and it’s the important one — what single outcome do you need when you close? One sentence.', input: true },
];

// Sensible component spine per deck type, so the outline is strong even when the
// free-text retrieval is thin. Filtered to what the catalog actually ships.
const TYPE_HINTS = {
	'board update': ['kpi', 'roadmap', 'decision', 'matrix-2x2'],
	'investor pitch': ['kpi', 'stats', 'roadmap', 'verdict-grid'],
	'strategy / proposal': ['verdict-grid', 'matrix-2x2', 'roadmap', 'decision'],
	'product / project review': ['kpi', 'roadmap', 'before-after', 'decision'],
};
const ANCHORS = ['title', 'closing', 'divider', 'subtopic'];

export function createOnboarding({ catalog, mount, onBuild }) {
	if (!mount) return { reset() {} };
	const byName = new Map((catalog || []).map((c) => [c.name, c]));
	let answers = {};
	let step = 0;

	const el = (tag, cls, text) => {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (text != null) e.textContent = text;
		return e;
	};
	const bubble = (role, text) => {
		const d = el('div', 'db-ob-msg db-ob-' + role);
		d.appendChild(el('p', null, text));
		return d;
	};

	function launcher() {
		mount.innerHTML = '';
		const b = el('button', 'db-btn db-btn-primary db-onboard-launch', 'Plan a new deck with me →');
		b.type = 'button';
		b.addEventListener('click', start);
		mount.appendChild(b);
	}
	function start() { answers = {}; step = 0; render(); }
	function answer(v) { answers[ONBOARD_STEPS[step].key] = v; step++; render(); }

	function render() {
		mount.innerHTML = '';
		const thread = el('div', 'db-ob-thread');
		for (let i = 0; i < step; i++) {
			thread.appendChild(bubble('arch', ONBOARD_STEPS[i].q));
			thread.appendChild(bubble('user', answers[ONBOARD_STEPS[i].key]));
		}
		if (step < ONBOARD_STEPS.length) {
			const s = ONBOARD_STEPS[step];
			thread.appendChild(bubble('arch', s.q));
			if (s.chips) {
				const row = el('div', 'db-ob-chips');
				for (const c of s.chips) {
					const chip = el('button', 'db-ob-chip', c);
					chip.type = 'button';
					chip.addEventListener('click', () => answer(c));
					row.appendChild(chip);
				}
				thread.appendChild(row);
			}
			if (s.input) {
				const form = el('form', 'db-ob-form');
				const inp = el('input', 'db-ob-input');
				inp.type = 'text';
				inp.placeholder = 'e.g. The board approves the next phase';
				const go = el('button', 'db-btn db-btn-primary', '→');
				go.type = 'submit';
				form.append(inp, go);
				form.addEventListener('submit', (e) => {
					e.preventDefault();
					const v = inp.value.trim();
					if (v) answer(v);
				});
				thread.appendChild(form);
				setTimeout(() => inp.focus(), 0);
			}
			const cancel = el('button', 'db-ob-cancel', 'Cancel');
			cancel.type = 'button';
			cancel.addEventListener('click', launcher);
			thread.appendChild(cancel);
		} else {
			propose(thread);
		}
		mount.appendChild(thread);
	}

	function pickComponents() {
		const what = (answers.what || '').toLowerCase();
		const tokens = `${answers.what || ''} ${answers.outcome || ''}`.toLowerCase().split(/\W+/).filter((t) => t.length >= 3);
		const seed = (TYPE_HINTS[what] || []).filter((n) => byName.has(n));
		const scored = (catalog || [])
			.filter((c) => !ANCHORS.includes(c.name))
			.map((c) => {
				const hay = `${c.name} ${(c.tags || []).join(' ')} ${c.bucket}`.toLowerCase();
				let s = 0;
				for (const t of tokens) if (hay.includes(t)) s++;
				return { name: c.name, s };
			})
			.filter((x) => x.s > 0)
			.sort((a, b) => b.s - a.s)
			.map((x) => x.name);
		const picks = [];
		for (const n of [...seed, ...scored]) {
			if (!picks.includes(n) && byName.has(n)) picks.push(n);
			if (picks.length >= 4) break;
		}
		if (!picks.length) for (const n of ['kpi', 'cards-grid', 'roadmap', 'decision']) if (byName.has(n) && picks.length < 4) picks.push(n);
		return picks;
	}

	function propose(thread) {
		const picks = pickComponents();
		thread.appendChild(bubble('arch', `Here’s the structure I’d build — Title → ${picks.join(' → ')} → close on your outcome.`));
		const list = el('ol', 'db-ob-outline');
		const li = (name, note) => {
			const e = el('li');
			e.appendChild(el('strong', null, name));
			if (note) e.appendChild(el('span', 'db-ob-note', ` — ${note}`));
			return e;
		};
		list.appendChild(li('Title', 'opening — your ask in the subtitle'));
		for (const n of picks) list.appendChild(li(n, ''));
		list.appendChild(li('Closing', 'restate the one outcome'));
		thread.appendChild(list);
		const row = el('div', 'db-ob-chips');
		const build = el('button', 'db-btn db-btn-primary', 'Build this outline →');
		build.type = 'button';
		build.addEventListener('click', () => { if (onBuild) onBuild(assemble(picks)); launcher(); });
		const restart = el('button', 'db-ob-chip', 'Start over');
		restart.type = 'button';
		restart.addEventListener('click', start);
		row.append(build, restart);
		thread.appendChild(row);
	}

	function assemble(picks) {
		const slides = [];
		slides.push(`<!-- _class: title silent -->\n\n\`${answers.what || 'deck'}\`\n\n# New deck\n\n${answers.outcome || ''}`.trim());
		for (const n of picks) {
			const c = byName.get(n);
			slides.push((c && c.skeleton) || `<!-- _class: ${n} -->\n`);
		}
		slides.push(`<!-- _class: closing -->\n\n## ${answers.outcome || 'The one thing to remember'}`);
		return `${slides.join('\n\n---\n\n')}\n`;
	}

	launcher();
	return { reset: launcher };
}
