// The Drawing Board — local persistence + checkpoint history (Phase 1, Slice 3).
//
// Dependency-free: a thin promise wrapper over raw IndexedDB (no idb/dexie), so
// nothing new enters docs/package.json. Owns the deck list + history rail DOM
// (persistence-coupled) and bridges to the inline render controller in
// drawing-board.astro: it calls `onLoadDeck(source)` when a deck is switched or a
// checkpoint restored, and reads the live editor through `getSource()`.
//
// Two independent histories, per the proposal: deck *revisions* (checkpoints,
// here) and the Architect's *chat* (stores declared now, used in Phase 2 — so no
// schema migration later). Restore forks rather than destroys: restoring a
// checkpoint first snapshots the current state, then loads the older source, so
// nothing is lost.

import { getPref, historyCap } from './drawing-board-prefs.js';

const DB_NAME = 'lattice-drawing-board';
const DB_VERSION = 1;

function openDB() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains('decks')) db.createObjectStore('decks', { keyPath: 'id' });
			if (!db.objectStoreNames.contains('revisions')) {
				const rs = db.createObjectStore('revisions', { keyPath: 'id', autoIncrement: true });
				rs.createIndex('deckId', 'deckId', { unique: false });
			}
			if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
			// Declared now, used in Phase 2 (the Architect's chat) — avoids a later
			// version bump + migration.
			if (!db.objectStoreNames.contains('chats')) db.createObjectStore('chats', { keyPath: 'id' });
			if (!db.objectStoreNames.contains('messages')) {
				const ms = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
				ms.createIndex('chatId', 'chatId', { unique: false });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

const P = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const store = (db, name, mode) => db.transaction(name, mode).objectStore(name);

function relTime(ts) {
	const s = Math.max(0, (Date.now() - ts) / 1000);
	if (s < 45) return 'just now';
	if (s < 5400) return Math.round(s / 60) + 'm ago';
	if (s < 86400) return Math.round(s / 3600) + 'h ago';
	return Math.round(s / 86400) + 'd ago';
}
const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Auto checkpoints (created when the Architect applies an edit) are bounded so the
// History list stays scannable and storage stays tiny; MANUAL checkpoints are kept
// forever (the author marked them on purpose). Returns the ids of the auto
// checkpoints to delete — the ones older than the most recent `cap`. Pure + tested.
const AUTO_CAP = 30;
export function autoToPrune(revisions, cap = AUTO_CAP) {
	const autos = (revisions || []).filter((r) => r?.auto).sort((a, b) => b.createdAt - a.createdAt);
	return autos.slice(cap).map((r) => r.id);
}

// Derive a human title + one-line description from the deck source: the first
// `# H1` (skipping the scaffold placeholder) and the first real line after it
// (the title-slide subtitle). Powers auto-naming so decks aren't all "Untitled".
function deriveMeta(source) {
	const lines = (source || '').split('\n');
	let title = null;
	let desc = null;
	for (let i = 0; i < lines.length; i++) {
		const h1 = lines[i].match(/^#\s+(.+)/);
		if (!h1) continue;
		const t = h1[1].replace(/[*`_]/g, '').trim();
		if (!t || /^(new deck|untitled deck|deck)$/i.test(t)) break; // placeholder → no title yet
		title = t.slice(0, 70);
		for (let j = i + 1; j < lines.length; j++) {
			const l = lines[j].trim();
			if (!l) continue;
			if (l === '---') break;
			if (l.startsWith('<!--')) continue; // class directive
			if (/^`[^`]*`$/.test(l)) continue; // eyebrow
			if (/^#{1,6}\s/.test(l)) continue; // heading
			desc = l.replace(/[*`_>#]/g, '').replace(/^[-\s]+/, '').trim().slice(0, 90);
			break;
		}
		break;
	}
	return { title, desc };
}

export function createStore({ getSource, onLoadDeck, starter = '' }) {
	let db = null;
	let activeId = null;
	let saveTimer = null;
	let loading = false; // suppress autosave while we programmatically load a deck
	let confirmingId = null; // deck row showing the inline "Delete?" confirm
	let renamingId = null; // deck row showing the inline rename input

	const el = (id) => document.getElementById(id);

	// The source a brand-new deck starts from — the starter scaffold, or a blank
	// canvas — per the workspace preference.
	const newDeckSource = () => (getPref('newDeck') === 'blank' ? '' : starter);

	// ── low-level CRUD ────────────────────────────────────────────────────────
	const getAll = (name) => P(store(db, name, 'readonly').getAll());
	const get = (name, key) => P(store(db, name, 'readonly').get(key));
	const put = (name, val) => P(store(db, name, 'readwrite').put(val));
	const del = (name, key) => P(store(db, name, 'readwrite').delete(key));
	async function revisionsFor(deckId) {
		const idx = store(db, 'revisions', 'readonly').index('deckId');
		return P(idx.getAll(IDBKeyRange.only(deckId)));
	}
	const setSetting = (key, value) => put('settings', { key, value });
	const getSetting = async (key) => (await get('settings', key))?.value;

	// ── chat thread (Phase 2) ───────────────────────────────────────────────────
	// One thread per deck (chat.id === deckId), so switching decks resumes its
	// conversation. Messages are append-only with a chatId index.
	async function chatMessages(deckId) {
		if (!db || !deckId) return [];
		const idx = store(db, 'messages', 'readonly').index('chatId');
		const rows = await P(idx.getAll(IDBKeyRange.only(deckId)));
		return rows.sort((a, b) => a.at - b.at);
	}
	// `det` marks a deterministic message (floor reply / greeting) so the chat can
	// keep it out of the model's history (a small model parrots its own boilerplate).
	// `extra` carries optional fields — e.g. the proposed `edits` + their `editStates`
	// — so a reply's edit cards survive a reload (frozen, read-only).
	async function addChatMessage(deckId, role, content, det = false, extra = null) {
		if (!db || !deckId) return null;
		const existing = await get('chats', deckId);
		if (!existing) await put('chats', { id: deckId, createdAt: Date.now() });
		const msg = { chatId: deckId, role, content, at: Date.now(), det: !!det, ...(extra || {}) };
		const id = await put('messages', msg);
		return { ...msg, id };
	}
	// Patch a stored message in place — used to persist edit-card state (applied /
	// dismissed) as the author acts, so a reload restores the same picture.
	async function updateChatMessage(id, patch) {
		if (!db || id == null) return;
		const m = await get('messages', id);
		if (m) await put('messages', { ...m, ...patch });
	}
	async function clearChat(deckId) {
		if (!db || !deckId) return;
		for (const m of await chatMessages(deckId)) await del('messages', m.id);
	}
	// Fired whenever the active deck changes, so the chat reloads its thread.
	function notifyActive() {
		try { window.dispatchEvent(new CustomEvent('db-active-deck', { detail: { deckId: activeId } })); } catch (_e) {}
	}

	// ── deck-manager rendering (decks + history popover) ────────────────────────
	async function renderDecks() {
		const list = el('db-deck-list');
		if (!list) return;
		const decks = (await getAll('decks'))
			.filter((d) => !pendingDelete || d.id !== pendingDelete.id) // hide a soft-deleted deck
			.sort((a, b) => b.updatedAt - a.updatedAt);
		list.innerHTML = '';
		if (!decks.length) {
			list.innerHTML = '<p class="db-rail-note">No decks yet. The “+” above starts one.</p>';
			return;
		}
		for (const d of decks) {
			const row = document.createElement('div');
			row.className = 'db-deck-row';
			if (d.id === renamingId) { renderRenameRow(row, d); list.appendChild(row); continue; }
			if (d.id === confirmingId) { renderConfirmRow(row, d); list.appendChild(row); continue; }

			const pick = document.createElement('button');
			pick.type = 'button';
			pick.className = 'db-deck';
			if (d.id === activeId) pick.setAttribute('aria-current', 'true');
			pick.innerHTML =
				'<span class="db-deck-name"></span><span class="db-deck-desc"></span><span class="db-deck-meta"></span>';
			pick.querySelector('.db-deck-name').textContent = d.name;
			const descEl = pick.querySelector('.db-deck-desc');
			if (d.desc) descEl.textContent = d.desc; else descEl.remove();
			pick.querySelector('.db-deck-meta').textContent = 'edited ' + relTime(d.updatedAt);
			pick.addEventListener('click', () => switchDeck(d.id));
			pick.addEventListener('dblclick', () => beginRename(d.id));

			const acts = document.createElement('div');
			acts.className = 'db-deck-acts';
			const ren = document.createElement('button');
			ren.type = 'button';
			ren.className = 'db-deck-rename';
			ren.title = 'Rename deck';
			ren.setAttribute('aria-label', 'Rename deck');
			ren.addEventListener('click', (e) => { e.stopPropagation(); beginRename(d.id); });
			const x = document.createElement('button');
			x.type = 'button';
			x.className = 'db-deck-x';
			x.title = 'Delete deck';
			x.setAttribute('aria-label', 'Delete deck');
			// glyphs drawn by CSS: .db-deck-rename::before / .db-deck-x::before
			x.addEventListener('click', (e) => { e.stopPropagation(); deleteDeck(d.id); });
			acts.append(ren, x);
			row.append(pick, acts);
			list.appendChild(row);
		}
	}

	// Inline rename — an editable field in place of the deck button, so nothing
	// pops a native prompt. Enter / blur commits, Escape cancels.
	function renderRenameRow(row, d) {
		row.classList.add('is-editing');
		const input = document.createElement('input');
		input.type = 'text';
		input.className = 'db-deck-rename-input';
		input.value = d.name;
		input.setAttribute('aria-label', 'Deck name');
		let done = false;
		const commit = async (save) => {
			if (done) return; done = true;
			renamingId = null;
			if (save) await commitRename(d.id, input.value);
			else await renderDecks();
		};
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') { e.preventDefault(); commit(true); }
			else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
		});
		input.addEventListener('blur', () => commit(true));
		row.appendChild(input);
		// Focus after it lands in the DOM.
		setTimeout(() => { input.focus(); input.select(); }, 0);
	}

	// Inline delete confirm — the row morphs into a "Delete? · Keep / Delete" bar,
	// on-brand and non-blocking (no window.confirm).
	function renderConfirmRow(row, d) {
		row.classList.add('is-confirming');
		const msg = document.createElement('span');
		msg.className = 'db-deck-confirm-msg';
		msg.textContent = 'Delete this deck?';
		const keep = document.createElement('button');
		keep.type = 'button';
		keep.className = 'db-btn db-confirm-keep';
		keep.textContent = 'Keep';
		keep.addEventListener('click', (e) => { e.stopPropagation(); confirmingId = null; renderDecks(); });
		const del = document.createElement('button');
		del.type = 'button';
		del.className = 'db-btn db-btn-danger db-confirm-del';
		del.textContent = 'Delete';
		del.addEventListener('click', async (e) => {
			e.stopPropagation();
			confirmingId = null;
			await performDelete(d.id);
		});
		row.append(msg, keep, del);
		setTimeout(() => del.focus(), 0);
	}

	async function renderHistory() {
		const list = el('db-history-list');
		if (!list || !activeId) return;
		const revs = (await revisionsFor(activeId)).sort((a, b) => b.createdAt - a.createdAt);
		list.innerHTML = '';
		if (!revs.length) {
			list.innerHTML = '<p class="db-rail-note">No checkpoints yet. Save one with the checkpoint button to mark a state you can return to.</p>';
			return;
		}
		for (const r of revs) {
			const item = document.createElement('button');
			item.type = 'button';
			item.className = 'db-history-item';
			item.innerHTML = '<span class="db-hist-label"></span><span class="db-hist-time"></span>';
			const lbl = item.querySelector('.db-hist-label');
			lbl.textContent = r.label || 'Checkpoint';
			if (r.auto) { // mark AI-created points so manual vs auto is legible
				const badge = document.createElement('span');
				badge.className = 'db-hist-ai';
				badge.textContent = 'AI';
				lbl.prepend(badge);
			}
			item.querySelector('.db-hist-time').textContent = relTime(r.createdAt);
			item.addEventListener('click', () => restore(r.id));
			list.appendChild(item);
		}
	}

	// ── deck operations ───────────────────────────────────────────────────────
	async function loadActiveIntoEditor() {
		const d = await get('decks', activeId);
		if (!d) return;
		loading = true;
		onLoadDeck(d.source);
		setTimeout(() => { loading = false; }, 0);
	}

	async function createDeck(source, name) {
		const now = Date.now();
		const meta = deriveMeta(source);
		// `name` (e.g. the Drafting archetype) seeds the title but stays auto — it
		// re-derives from the deck's H1 once the author writes a real one.
		const deck = {
			id: uid('d'),
			name: name || meta.title || 'Untitled deck',
			desc: meta.desc || '',
			nameManual: false,
			source: source || '',
			createdAt: now,
			updatedAt: now,
		};
		await put('decks', deck);
		activeId = deck.id;
		await setSetting('activeDeckId', activeId);
		notifyActive();
		await renderDecks();
		await renderHistory();
		return deck;
	}

	async function switchDeck(id) {
		if (id === activeId) return;
		activeId = id;
		await setSetting('activeDeckId', id);
		notifyActive();
		await loadActiveIntoEditor();
		await renderDecks();
		await renderHistory();
	}

	const byUpdated = (a, b) => b.updatedAt - a.updatedAt;

	function beginRename(id) {
		renamingId = id;
		confirmingId = null;
		renderDecks();
	}
	async function commitRename(id, value) {
		const d = await get('decks', id);
		if (!d) { await renderDecks(); return; }
		const name = (value || '').trim();
		if (name && name !== d.name) {
			d.name = name;
			d.nameManual = true; // pin it — stop auto-deriving from the H1
			d.updatedAt = Date.now();
			await put('decks', d);
		}
		await renderDecks();
	}

	// ── delete ──────────────────────────────────────────────────────────────────
	// Two on-brand interactions, chosen by the deleteStyle preference:
	//   'confirm' → the row morphs into an inline "Delete?" bar (default).
	//   'undo'    → optimistic removal + a reversible "Deck deleted · Undo" toast.
	// Neither uses window.confirm; both keep the thread responsive.
	let pendingDelete = null;

	function deleteDeck(id) {
		if (getPref('deleteStyle') === 'undo') return softDelete(id);
		renamingId = null;
		confirmingId = id;
		return renderDecks();
	}

	// Hard, immediate purge of a deck and everything attached to it.
	async function purgeDeck(id) {
		await del('decks', id);
		for (const r of await revisionsFor(id)) await del('revisions', r.id);
		await clearChat(id); // drop the deleted deck's conversation too
	}

	// Immediate delete (the 'confirm' path, after the user confirms): purge, then
	// hand the editor to the next deck — or a fresh one if that was the last.
	async function performDelete(id) {
		await purgeDeck(id);
		if (id === activeId) {
			const rest = (await getAll('decks')).sort(byUpdated);
			if (rest.length) { activeId = rest[0].id; await setSetting('activeDeckId', activeId); notifyActive(); await loadActiveIntoEditor(); }
			else { await createDeck(newDeckSource(), 'Untitled deck'); await loadActiveIntoEditor(); }
		}
		await renderDecks();
		await renderHistory();
	}

	// Optimistic delete (the 'undo' path): hide the row + move the editor off it
	// NOW, but defer the real purge until the toast expires — so Undo is just
	// "cancel the pending purge", with nothing to reconstruct.
	async function softDelete(id) {
		await flushPendingDelete(); // commit any prior pending delete first
		const prevActiveId = activeId;
		pendingDelete = { id, prevActiveId, replacementId: null, timer: null };
		if (id === activeId) {
			const rest = (await getAll('decks')).sort(byUpdated).filter((d) => d.id !== id);
			if (rest.length) {
				activeId = rest[0].id;
			} else {
				const nd = await createDeck(newDeckSource(), 'Untitled deck'); // never strand the editor empty
				pendingDelete.replacementId = nd.id;
				activeId = nd.id;
			}
			await setSetting('activeDeckId', activeId);
			notifyActive();
			await loadActiveIntoEditor();
		}
		await renderDecks(); // the pending row is filtered out
		await renderHistory();
		toast('Deck deleted.', 'Undo', async () => {
			const pd = pendingDelete;
			if (!pd) return;
			pendingDelete = null;
			clearTimeout(pd.timer);
			if (pd.replacementId) { await purgeDeck(pd.replacementId); } // drop the placeholder
			activeId = pd.prevActiveId;
			await setSetting('activeDeckId', activeId);
			notifyActive();
			await loadActiveIntoEditor();
			await renderDecks();
			await renderHistory();
		});
		pendingDelete.timer = setTimeout(() => { flushPendingDelete(); }, 6000);
	}

	// Commit a pending soft-delete (timer fired, or another delete superseded it).
	async function flushPendingDelete() {
		const pd = pendingDelete;
		if (!pd) return;
		pendingDelete = null;
		clearTimeout(pd.timer);
		await purgeDeck(pd.id);
		await renderDecks();
	}

	// Debounced autosave of the live editor into the active deck.
	function saveActive(source) {
		if (!db || !activeId || loading) return;
		clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			const d = await get('decks', activeId);
			if (!d) return;
			d.source = source;
			d.updatedAt = Date.now();
			const meta = deriveMeta(source);
			if (!d.nameManual && meta.title) d.name = meta.title; // auto-title from the H1
			d.desc = meta.desc || '';
			await put('decks', d);
			renderDecks(); // refresh name/desc + the "edited …" stamp + ordering
		}, 600);
	}

	// ── checkpoints ───────────────────────────────────────────────────────────
	async function checkpoint(label) {
		if (!activeId) return;
		await put('revisions', { deckId: activeId, source: getSource(), label: label || 'Checkpoint', createdAt: Date.now() });
		await renderHistory();
		flash('Checkpoint saved.');
	}

	// Automatic checkpoint — created when the Architect APPLIES an edit, so every AI
	// change becomes a labelled, restorable point with zero effort (git-style time
	// travel via the existing reversible restore). Snapshots the PRE-edit `source`,
	// dedupes against the latest revision, prunes old auto checkpoints, stays quiet.
	async function autoCheckpoint(source, label) {
		if (!db || !activeId) return;
		const src = source != null ? source : getSource();
		const revs = (await revisionsFor(activeId)).sort((a, b) => b.createdAt - a.createdAt);
		if (revs[0] && revs[0].source === src) return; // unchanged since the last point
		await put('revisions', { deckId: activeId, source: src, label: label || 'AI edit', createdAt: Date.now(), auto: true });
		for (const id of autoToPrune(await revisionsFor(activeId), historyCap())) await del('revisions', id);
		await renderHistory();
	}

	// Re-apply the history-retention preference to the active deck — prune surplus
	// auto checkpoints down to the new cap. Called when the setting changes.
	async function applyHistoryCap() {
		if (!db || !activeId) return;
		for (const id of autoToPrune(await revisionsFor(activeId), historyCap())) await del('revisions', id);
		await renderHistory();
	}

	async function restore(revId) {
		const r = await get('revisions', revId);
		if (!r) return;
		// Fork, don't destroy: snapshot the current state before loading the older
		// one, so the restore is itself reversible.
		await put('revisions', { deckId: activeId, source: getSource(), label: 'Before restore', createdAt: Date.now(), auto: true });
		const d = await get('decks', activeId);
		if (d) { d.source = r.source; d.updatedAt = Date.now(); await put('decks', d); }
		loading = true;
		onLoadDeck(r.source);
		setTimeout(() => { loading = false; }, 0);
		await renderHistory();
		flash('Restored. (A snapshot of the prior state was kept.)');
	}

	function flash(msg) {
		const s = el('db-status');
		if (!s) return;
		const prev = s.textContent;
		s.textContent = msg;
		setTimeout(() => { if (s.textContent === msg) s.textContent = prev; }, 2400);
	}

	// On-brand transient toast with one action (used by the Undo-delete flow). A
	// single toast at a time; auto-dismisses after ~6s. Token-styled, palette-blind.
	let toastTimer = null;
	function toast(message, actionLabel, onAction) {
		const existing = document.getElementById('db-toast');
		if (existing) existing.remove();
		clearTimeout(toastTimer);
		const wrap = document.createElement('div');
		wrap.id = 'db-toast';
		wrap.className = 'db-toast';
		wrap.setAttribute('role', 'status');
		const msg = document.createElement('span');
		msg.className = 'db-toast-msg';
		msg.textContent = message;
		wrap.appendChild(msg);
		const dismiss = () => { clearTimeout(toastTimer); wrap.classList.remove('is-in'); setTimeout(() => wrap.remove(), 180); };
		if (actionLabel && onAction) {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'db-toast-undo';
			btn.textContent = actionLabel;
			btn.addEventListener('click', async () => { dismiss(); await onAction(); });
			wrap.appendChild(btn);
		}
		document.body.appendChild(wrap);
		requestAnimationFrame(() => wrap.classList.add('is-in'));
		toastTimer = setTimeout(dismiss, 6000);
	}

	// ── init ──────────────────────────────────────────────────────────────────
	async function init() {
		try {
			if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
			db = await openDB();
		} catch (_e) {
			// IndexedDB unavailable (private mode, etc.) — the editor still works,
			// just without persistence. Leave the rail note in place.
			return;
		}
		const decks = await getAll('decks');
		if (!decks.length) {
			await createDeck(getSource() || starter, 'Untitled deck');
		} else if (getPref('restoreDeck') === 'fresh') {
			// "Start fresh" — land on a new blank deck instead of the last one. Reuse a
			// trailing untitled-and-empty deck if one's already there, so reload after
			// reload doesn't pile up throwaways. The deck list keeps every prior deck.
			const sorted = decks.sort(byUpdated);
			const top = sorted[0];
			const blank = newDeckSource();
			if (top && !top.nameManual && (top.source || '').trim() === (blank || '').trim()) {
				activeId = top.id;
				await setSetting('activeDeckId', activeId);
				notifyActive();
				await loadActiveIntoEditor();
				await renderDecks();
				await renderHistory();
			} else {
				await createDeck(blank, 'Untitled deck');
				await loadActiveIntoEditor();
			}
		} else {
			activeId = (await getSetting('activeDeckId')) || decks.sort(byUpdated)[0].id;
			notifyActive();
			await loadActiveIntoEditor();
			await renderDecks();
			await renderHistory();
		}
		el('db-new-deck')?.addEventListener('click', async () => { await createDeck(newDeckSource(), 'Untitled deck'); await loadActiveIntoEditor(); });
		el('db-checkpoint')?.addEventListener('click', () => checkpoint());
	}

	// Create a brand-new deck from given source (the Architect's onboarding
	// scaffold) and switch to it.
	async function create(source, name) {
		if (!db) return;
		await createDeck(source, name || 'Untitled deck');
		await loadActiveIntoEditor();
	}

	return {
		init, saveActive, checkpoint, autoCheckpoint, create,
		applyHistoryCap, // re-prune when the retention preference changes
		// Chat (Phase 2): the Architect's per-deck conversation thread.
		getActiveId: () => activeId,
		chatMessages, addChatMessage, updateChatMessage, clearChat,
	};
}
