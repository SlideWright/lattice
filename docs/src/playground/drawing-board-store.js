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

export function createStore({ getSource, onLoadDeck, starter = '' }) {
	let db = null;
	let activeId = null;
	let saveTimer = null;
	let loading = false; // suppress autosave while we programmatically load a deck

	const el = (id) => document.getElementById(id);

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

	// ── rail rendering ────────────────────────────────────────────────────────
	async function renderDecks() {
		const list = el('db-deck-list');
		if (!list) return;
		const decks = (await getAll('decks')).sort((a, b) => b.updatedAt - a.updatedAt);
		list.innerHTML = '';
		for (const d of decks) {
			const row = document.createElement('div');
			row.className = 'db-deck-row';
			const pick = document.createElement('button');
			pick.type = 'button';
			pick.className = 'db-deck';
			if (d.id === activeId) pick.setAttribute('aria-current', 'true');
			pick.innerHTML =
				'<span class="db-deck-name"></span><span class="db-deck-meta"></span>';
			pick.querySelector('.db-deck-name').textContent = d.name;
			pick.querySelector('.db-deck-meta').textContent = 'edited ' + relTime(d.updatedAt);
			pick.addEventListener('click', () => switchDeck(d.id));
			pick.addEventListener('dblclick', () => renameDeck(d.id));
			const x = document.createElement('button');
			x.type = 'button';
			x.className = 'db-deck-x';
			x.title = 'Delete deck';
			x.setAttribute('aria-label', 'Delete deck');
			x.textContent = '✕';
			x.addEventListener('click', (e) => { e.stopPropagation(); deleteDeck(d.id); });
			row.append(pick, x);
			list.appendChild(row);
		}
	}

	async function renderHistory() {
		const list = el('db-history-list');
		if (!list || !activeId) return;
		const revs = (await revisionsFor(activeId)).sort((a, b) => b.createdAt - a.createdAt);
		list.innerHTML = '';
		if (!revs.length) {
			list.innerHTML = '<p class="db-rail-note">No checkpoints yet. Save one with ⚑ to mark a state you can return to.</p>';
			return;
		}
		for (const r of revs) {
			const item = document.createElement('button');
			item.type = 'button';
			item.className = 'db-history-item';
			item.innerHTML = '<span class="db-hist-label"></span><span class="db-hist-time"></span>';
			item.querySelector('.db-hist-label').textContent = r.label || 'Checkpoint';
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
		const deck = { id: uid('d'), name: name || 'Untitled deck', source: source || '', createdAt: now, updatedAt: now };
		await put('decks', deck);
		activeId = deck.id;
		await setSetting('activeDeckId', activeId);
		await renderDecks();
		await renderHistory();
		return deck;
	}

	async function switchDeck(id) {
		if (id === activeId) return;
		activeId = id;
		await setSetting('activeDeckId', id);
		await loadActiveIntoEditor();
		await renderDecks();
		await renderHistory();
	}

	async function renameDeck(id) {
		const d = await get('decks', id);
		if (!d) return;
		const name = window.prompt('Rename deck', d.name);
		if (name == null) return;
		d.name = name.trim() || d.name;
		d.updatedAt = Date.now();
		await put('decks', d);
		await renderDecks();
	}

	async function deleteDeck(id) {
		const decks = await getAll('decks');
		if (!window.confirm('Delete this deck and its checkpoints? This cannot be undone.')) return;
		await del('decks', id);
		for (const r of await revisionsFor(id)) await del('revisions', r.id);
		if (id === activeId) {
			const rest = (await getAll('decks')).sort((a, b) => b.updatedAt - a.updatedAt);
			if (rest.length) { activeId = rest[0].id; await setSetting('activeDeckId', activeId); await loadActiveIntoEditor(); }
			else { await createDeck(starter, 'Untitled deck'); await loadActiveIntoEditor(); }
		}
		await renderDecks();
		await renderHistory();
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
			await put('decks', d);
			renderDecks(); // refresh the "edited …" stamp + ordering
		}, 600);
	}

	// ── checkpoints ───────────────────────────────────────────────────────────
	async function checkpoint(label) {
		if (!activeId) return;
		await put('revisions', { deckId: activeId, source: getSource(), label: label || 'Checkpoint', createdAt: Date.now() });
		await renderHistory();
		flash('Checkpoint saved.');
	}

	async function restore(revId) {
		const r = await get('revisions', revId);
		if (!r) return;
		// Fork, don't destroy: snapshot the current state before loading the older
		// one, so the restore is itself reversible.
		await put('revisions', { deckId: activeId, source: getSource(), label: 'Before restore', createdAt: Date.now() });
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

	// ── init ──────────────────────────────────────────────────────────────────
	async function init() {
		try {
			if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
			db = await openDB();
		} catch (e) {
			// IndexedDB unavailable (private mode, etc.) — the editor still works,
			// just without persistence. Leave the rail note in place.
			return;
		}
		const decks = await getAll('decks');
		if (!decks.length) {
			await createDeck(getSource() || starter, 'Untitled deck');
		} else {
			activeId = (await getSetting('activeDeckId')) || decks.sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
			await loadActiveIntoEditor();
			await renderDecks();
			await renderHistory();
		}
		el('db-new-deck')?.addEventListener('click', async () => { await createDeck(starter, 'Untitled deck'); await loadActiveIntoEditor(); });
		el('db-checkpoint')?.addEventListener('click', () => checkpoint());
	}

	return { init, saveActive, checkpoint };
}
