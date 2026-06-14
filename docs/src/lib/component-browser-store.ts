// A tiny module-level pub/sub store shared by the component-reference islands.
//
// The index grid and the left nav are SEPARATE React roots (different islands,
// hydrated independently) but they share one search query + group-by lens — as
// they did when one vanilla module drove both DOM trees. A module-singleton
// store + useSyncExternalStore lets every island on the page read and write the
// same state without prop-drilling across the Astro island boundary.
//
// Persistence matches the vanilla browser: the lens persists in localStorage
// (a durable preference); the query persists per-tab in sessionStorage (it
// survives a click-through to a component page or closing the mobile drawer,
// but a fresh visit starts clean).
import * as React from 'react';

const LENS_KEY = 'lattice-components-lens';
const QUERY_KEY = 'lattice-components-q';

type State = { query: string; lens: string };
type Listener = () => void;

function readLens(): string {
	try {
		return localStorage.getItem(LENS_KEY) || 'family';
	} catch {
		return 'family';
	}
}
function readQuery(): string {
	try {
		return sessionStorage.getItem(QUERY_KEY) || '';
	} catch {
		return '';
	}
}

// Lazily seeded on first read so SSR (no window) stays on the stable default.
let state: State = { query: '', lens: 'family' };
let hydrated = false;
const listeners = new Set<Listener>();

function ensureHydrated() {
	if (hydrated || typeof window === 'undefined') return;
	state = { query: readQuery(), lens: readLens() };
	hydrated = true;
}

function emit() {
	for (const l of listeners) l();
}

export function setQuery(query: string) {
	ensureHydrated();
	state = { ...state, query };
	try {
		if (query) sessionStorage.setItem(QUERY_KEY, query);
		else sessionStorage.removeItem(QUERY_KEY);
	} catch {
		/* non-fatal */
	}
	emit();
}

export function setLens(lens: string) {
	ensureHydrated();
	state = { ...state, lens };
	try {
		localStorage.setItem(LENS_KEY, lens);
	} catch {
		/* non-fatal */
	}
	emit();
}

function subscribe(cb: Listener): () => void {
	ensureHydrated();
	listeners.add(cb);
	return () => listeners.delete(cb);
}

function getSnapshot(): State {
	ensureHydrated();
	return state;
}

// SSR/first-render snapshot: the stable default (matches the server-rendered
// Family grouping + empty query), so hydration never mismatches. A mount effect
// in the islands re-reads storage.
const SERVER_STATE: State = { query: '', lens: 'family' };
function getServerSnapshot(): State {
	return SERVER_STATE;
}

/** Subscribe a component to the shared {query, lens} store. */
export function useBrowserStore(): State {
	return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Force a re-read from storage on mount (e.g. bfcache `pageshow`, or the first
 * client paint after SSR). Returns nothing; it just nudges the store so an
 * island that hydrated with the default picks up a persisted query/lens.
 */
export function rehydrateFromStorage() {
	if (typeof window === 'undefined') return;
	hydrated = false;
	ensureHydrated();
	emit();
}

export { LENS_KEY, QUERY_KEY };
