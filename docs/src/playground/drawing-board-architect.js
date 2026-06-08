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

import Fuse from 'fuse.js';
import lintCore from '../../../lib/authoring/lint-core.js';
import reviewCore from '../../../lib/authoring/review-core.js';
import scorecard from '../../../lib/authoring/scorecard.js';

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
const SEV_RANK = { error: 0, warning: 1, suggestion: 2 };
function hasContent(src) {
	// At least one classed slide (after front matter) or some real prose.
	return /<!--\s*_class:/.test(src) && src.split(/^---$/m).filter((s) => s.trim()).length > 1;
}

export function createArchitect({ vocab, catalog, mount, reveal, applyFix }) {
	const vocabSets = {
		names: new Set((vocab?.names) || []),
		modifiers: new Set((vocab?.modifiers) || []),
	};
	const bucketByName = new Map((catalog || []).map((c) => [c.name, c.bucket]));
	const bucketOf = (n) => bucketByName.get(n) || null;
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

	// Read the scorecard aloud via the browser's built-in TTS (no model, no dep).
	function speakCard(sc) {
		if (!('speechSynthesis' in window)) return;
		const synth = window.speechSynthesis;
		if (synth.speaking) { synth.cancel(); return; } // toggle off
		let text = `Your deck scores ${sc.band}, ${sc.overall} out of 100. `;
		const issues = sc.categories.filter((c) => c.notes.length);
		if (!issues.length) text += 'Every category is strong — nicely done.';
		else for (const c of issues) text += `${c.label}, ${c.score}: ${c.notes.join(', ')}. `;
		const u = new SpeechSynthesisUtterance(text);
		u.rate = 1.02;
		synth.speak(u);
	}

	function scorecardEl(sc) {
		const wrap = document.createElement('div');
		wrap.className = 'db-scorecard';
		const head = document.createElement('div');
		head.className = 'db-sc-head';
		const grade = document.createElement('span');
		grade.className = 'db-sc-grade q-' + (sc.overall >= 80 ? 'good' : sc.overall >= 60 ? 'ok' : 'bad');
		grade.textContent = sc.band;
		const overall = document.createElement('span');
		overall.className = 'db-sc-overall';
		overall.append(String(sc.overall), Object.assign(document.createElement('small'), { textContent: '/100' }));
		const label = document.createElement('span');
		label.className = 'db-sc-label';
		label.textContent = 'the Architect’s scorecard';
		const speak = document.createElement('button');
		speak.type = 'button';
		speak.className = 'db-sc-speak';
		speak.setAttribute('aria-label', 'Read the assessment aloud');
		speak.title = 'Read aloud';
		speak.textContent = '🔊';
		if (!('speechSynthesis' in window)) speak.hidden = true;
		speak.addEventListener('click', () => speakCard(sc));
		head.append(grade, overall, label, speak);
		wrap.appendChild(head);
		const cats = document.createElement('div');
		cats.className = 'db-sc-cats';
		for (const c of sc.categories) {
			const row = document.createElement('div');
			row.className = 'db-sc-cat';
			if (c.notes.length) row.title = c.notes.join(' · ');
			const lbl = Object.assign(document.createElement('span'), { className: 'db-sc-cat-label', textContent: c.label });
			const bar = document.createElement('span');
			bar.className = 'db-sc-bar';
			const fill = document.createElement('i');
			fill.className = 'q-' + (c.score >= 80 ? 'good' : c.score >= 60 ? 'ok' : 'bad');
			fill.style.width = c.score + '%';
			bar.appendChild(fill);
			const score = Object.assign(document.createElement('span'), { className: 'db-sc-cat-score', textContent: String(c.score) });
			row.append(lbl, bar, score);
			cats.appendChild(row);
		}
		wrap.appendChild(cats);
		return wrap;
	}

	function render(sc, findings) {
		if (!mount) return;
		mount.innerHTML = '';
		if (!sc) {
			const d = document.createElement('div');
			d.className = 'db-review-clean';
			d.textContent = 'Start a deck and I’ll score it and flag anything off.';
			mount.appendChild(d);
			return;
		}
		mount.appendChild(scorecardEl(sc));
		if (!findings.length) {
			mount.appendChild(cleanState());
			return;
		}
		findings.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.slide - b.slide);
		const errs = findings.filter((f) => f.severity === 'error').length;
		const head = document.createElement('div');
		head.className = 'db-review-head';
		const n = findings.length;
		head.textContent =
			'the Architect flags ' + n + ' item' + (n === 1 ? '' : 's') + (errs ? ' · ' + errs + ' to fix' : '');
		mount.appendChild(head);
		const starts = chunkStartLines(lastSource);
		for (const f of findings) mount.appendChild(card(f, starts));
	}

	function run() {
		try {
			const has = hasContent(lastSource);
			// Let the onboarding collapse its doors when a real deck is being worked on.
			window.dispatchEvent(new CustomEvent('db-deck-content', { detail: has }));
			if (!has) { render(null, []); return; }
			const lint = lintCore.lintTextWith(lastSource, vocabSets);
			const review = reviewCore.reviewText(lastSource, { bucketOf });
			const sc = scorecard.scoreDeck({ source: lastSource, lintFindings: lint, reviewFindings: review });
			render(sc, [...lint, ...review]);
		} catch (_e) {
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

// ── Onboarding: two modes — Drafting & Freehand (deterministic, zero-model) ───
// Drafting: pick a presentation archetype (searchable, grouped by setting) → the
// Architect scaffolds a framework-grounded spine. Freehand: a blank canvas; the
// live review runs and (Phase 2) conversational help arrives on request. Spec +
// the spine table: engineering/decisions/2026-06-08-architect-modes.md (App. A).

const ARCHETYPES = {
	'General / Team': {
		'Status update': ['title', 'kpi', 'roadmap', 'decision', 'closing'],
		'Project kickoff': ['title', 'content', 'roadmap', 'actors', 'decision', 'closing'],
		'Project status': ['title', 'kpi', 'roadmap', 'matrix-2x2', 'closing'],
		'Retrospective / post-mortem': ['title', 'timeline-list', 'matrix-2x2', 'list-steps', 'closing'],
		'All-hands': ['title', 'big-number', 'kpi', 'roadmap', 'quote', 'closing'],
		'Team meeting': ['title', 'agenda', 'content', 'decision', 'closing'],
		'Training / onboarding': ['title', 'agenda', 'list-steps', 'checklist', 'closing'],
		'Workshop': ['title', 'agenda', 'content', 'cards-grid', 'list-steps', 'closing'],
		'Decision memo': ['title', 'content', 'compare-table', 'matrix-2x2', 'decision', 'closing'],
		'Proposal': ['title', 'content', 'list-criteria', 'kpi', 'decision', 'closing'],
		'Roadmap review': ['title', 'roadmap', 'kpi', 'matrix-2x2', 'closing'],
	},
	Corporate: {
		'Board update': ['title', 'kpi', 'roadmap', 'decision', 'matrix-2x2', 'closing'],
		'Investor pitch': ['title', 'content', 'content', 'big-number', 'kpi', 'roadmap', 'actors', 'decision', 'closing'],
		'Sales deck': ['title', 'content', 'content', 'verdict-grid', 'kpi', 'decision', 'closing'],
		'Quarterly business review': ['title', 'kpi', 'roadmap', 'matrix-2x2', 'decision', 'closing'],
		'Strategy proposal': ['title', 'content', 'verdict-grid', 'matrix-2x2', 'decision', 'roadmap', 'closing'],
		'Product launch': ['title', 'content', 'featured', 'cards-grid', 'kpi', 'roadmap', 'closing'],
		'Customer case study': ['title', 'content', 'split-compare', 'kpi', 'quote', 'closing'],
		'Budget request': ['title', 'big-number', 'content', 'list-tabular', 'kpi', 'decision', 'closing'],
		'OKR / goals review': ['title', 'kpi', 'progress', 'roadmap', 'closing'],
	},
	Academic: {
		Lecture: ['title', 'agenda', 'content', 'diagram', 'list-criteria', 'closing'],
		'Conference talk': ['title', 'content', 'content', 'radar', 'content', 'closing'],
		'Thesis / dissertation defense': ['title', 'content', 'content', 'stats', 'content', 'roadmap', 'closing'],
		'Research findings': ['title', 'content', 'content', 'stats', 'content', 'closing'],
		'Journal club': ['title', 'citation-card', 'content', 'stats', 'matrix-2x2', 'closing'],
		'Grant proposal': ['title', 'content', 'list-criteria', 'roadmap', 'kpi', 'closing'],
		Seminar: ['title', 'agenda', 'content', 'diagram', 'list-steps', 'closing'],
		'Poster walkthrough': ['title', 'content', 'diagram', 'stats', 'content', 'closing'],
		'Literature review': ['title', 'content', 'timeline-list', 'compare-table', 'content', 'closing'],
		'Course overview': ['title', 'agenda', 'roadmap', 'list-criteria', 'checklist', 'closing'],
	},
	'Government / Public': {
		'Policy briefing': ['title', 'content', 'content', 'verdict-grid', 'matrix-2x2', 'decision', 'closing'],
		'Budget proposal': ['title', 'big-number', 'list-tabular', 'kpi', 'matrix-2x2', 'decision', 'closing'],
		'Public hearing / testimony': ['title', 'content', 'list-criteria', 'stats', 'quote', 'closing'],
		'Agency / program update': ['title', 'kpi', 'roadmap', 'matrix-2x2', 'closing'],
		'Inter-agency briefing': ['title', 'content', 'actors', 'roadmap', 'decision', 'closing'],
		'RFP / proposal response': ['title', 'content', 'list-criteria', 'gantt', 'actors', 'kpi', 'closing'],
		'Town hall': ['title', 'big-number', 'content', 'kpi', 'content', 'closing'],
		'Compliance / audit report': ['title', 'content', 'obligation-matrix', 'matrix-2x2', 'list-steps', 'closing'],
	},
	'Nonprofit / Mission-driven': {
		'Donor pitch': ['title', 'content', 'quote', 'big-number', 'roadmap', 'decision', 'closing'],
		'Fundraising / capital campaign': ['title', 'content', 'big-number', 'progress', 'cards-grid', 'decision', 'closing'],
		'Impact / annual report': ['title', 'kpi', 'journey', 'quote', 'stats', 'roadmap', 'closing'],
		'Grant report': ['title', 'content', 'kpi', 'list-criteria', 'stats', 'closing'],
		'Nonprofit board meeting': ['title', 'kpi', 'stats', 'roadmap', 'decision', 'closing'],
		'Program overview': ['title', 'content', 'diagram', 'kpi', 'actors', 'closing'],
		'Volunteer onboarding': ['title', 'agenda', 'content', 'list-steps', 'checklist', 'closing'],
	},
};

// Flat list for fuzzy search (fuse.js) — preserves group order for grouping.
const ARCHETYPE_LIST = [];
for (const [group, items] of Object.entries(ARCHETYPES)) {
	for (const name of Object.keys(items)) ARCHETYPE_LIST.push({ name, group, spine: items[name] });
}

export function createOnboarding({ catalog, mount, onBuild }) {
	if (!mount) return { reset() {} };
	const byName = new Map((catalog || []).map((c) => [c.name, c]));

	const el = (tag, cls, text) => {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (text != null) e.textContent = text;
		return e;
	};

	const fuse = new Fuse(ARCHETYPE_LIST, { keys: ['name'], threshold: 0.4, ignoreLocation: true });
	let inFlow = false; // user is actively choosing a new deck (doors / picker)
	let everChose = false; // a mode has been chosen this session

	// Once a real deck is being worked on, collapse the doors to a compact
	// "✦ New deck" affordance so the scorecard is the focus; expand on an empty deck.
	function compactView() {
		mount.innerHTML = '';
		const b = el('button', 'db-onboard-compact', '✦ New deck');
		b.type = 'button';
		b.addEventListener('click', () => { inFlow = true; doors(); });
		mount.appendChild(b);
	}
	window.addEventListener('db-deck-content', (e) => {
		if (inFlow) return;
		if (e.detail || everChose) compactView();
		else doors();
	});

	// ── The two doors ─────────────────────────────────────────────────────────
	function doors() {
		mount.innerHTML = '';
		const wrap = el('div', 'db-modes');
		wrap.append(
			modeCard('Drafting', 'I lay out the structure; you fill it in.', startDrafting),
			modeCard('Freehand', 'Your blank canvas; I review and help on request.', startFreehand),
		);
		mount.appendChild(wrap);
	}
	function modeCard(title, sub, onClick) {
		const b = el('button', 'db-mode-card');
		b.type = 'button';
		b.append(el('span', 'db-mode-title', title), el('span', 'db-mode-sub', sub));
		b.addEventListener('click', onClick);
		return b;
	}

	// ── Freehand — blank canvas ───────────────────────────────────────────────
	function startFreehand() {
		everChose = true;
		inFlow = false;
		if (onBuild) onBuild('<!-- _class: title silent -->\n\n# New deck\n\nStart writing — I’ll review as you go.\n');
		compactView();
	}

	// ── Drafting — archetype picker → framework-grounded spine ────────────────
	function startDrafting() {
		mount.innerHTML = '';
		const head = el('div', 'db-draft-head');
		const back = el('button', 'db-ob-cancel', '← Modes');
		back.type = 'button';
		back.addEventListener('click', doors);
		head.append(back, el('p', 'db-draft-say', 'What are you presenting? I’ll lay out the structure.'));
		const search = el('input', 'db-draft-search');
		search.type = 'search';
		search.placeholder = 'Search presentation types…';
		head.appendChild(search);
		mount.appendChild(head);
		const list = el('div', 'db-draft-list');
		mount.appendChild(list);
		const renderList = () => {
			const q = search.value.trim();
			list.innerHTML = '';
			const items = q ? fuse.search(q).map((r) => r.item) : ARCHETYPE_LIST;
			const groups = {};
			for (const it of items) (groups[it.group] ||= []).push(it);
			for (const [group, arr] of Object.entries(groups)) {
				list.appendChild(el('div', 'db-draft-group', group));
				for (const it of arr) {
					const item = el('button', 'db-draft-item', it.name);
					item.type = 'button';
					item.addEventListener('click', () => proposeArchetype(it.name, it.spine));
					list.appendChild(item);
				}
			}
			if (!list.children.length) {
				list.appendChild(el('p', 'db-rail-note', 'Not in the list? Go Freehand — I don’t template specialized or long-form work.'));
			}
		};
		search.addEventListener('input', renderList);
		renderList();
		setTimeout(() => search.focus(), 0);
	}

	function proposeArchetype(name, spine) {
		mount.innerHTML = '';
		const back = el('button', 'db-ob-cancel', '← Types');
		back.type = 'button';
		back.addEventListener('click', startDrafting);
		mount.appendChild(back);
		mount.appendChild(el('p', 'db-draft-say', `${name} — here’s the structure I’d build.`));
		const ol = el('ol', 'db-ob-outline');
		for (const comp of spine) {
			const item = el('li');
			item.appendChild(el('strong', null, comp));
			ol.appendChild(item);
		}
		mount.appendChild(ol);
		const row = el('div', 'db-ob-chips');
		const build = el('button', 'db-btn db-btn-primary', 'Build this →');
		build.type = 'button';
		build.addEventListener('click', () => {
			everChose = true;
			inFlow = false;
			if (onBuild) onBuild(assemble(name, spine), name);
			compactView();
		});
		const other = el('button', 'db-ob-chip', 'Pick another');
		other.type = 'button';
		other.addEventListener('click', startDrafting);
		row.append(build, other);
		mount.appendChild(row);
	}

	// Scaffold the deck from the spine, using each component's catalog skeleton.
	function assemble(label, spine) {
		const slides = spine.map((name, i) => {
			if (i === 0 && name === 'title') {
				return `<!-- _class: title silent -->\n\n\`${label}\`\n\n# New deck\n\nYour subtitle`;
			}
			const c = byName.get(name);
			return c?.skeleton || `<!-- _class: ${name} -->\n`;
		});
		return `${slides.join('\n\n---\n\n')}\n`;
	}

	doors();
	return { reset: doors };
}
