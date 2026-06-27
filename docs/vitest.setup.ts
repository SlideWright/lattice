import '@testing-library/jest-dom/vitest';

// Radix UI primitives (Select, DropdownMenu, …) call these DOM APIs that jsdom
// does not implement; without them a trigger click never opens the content in
// tests. These polyfills are test-only and inert in the browser.
if (typeof window !== 'undefined') {
	if (!Element.prototype.hasPointerCapture) {
		Element.prototype.hasPointerCapture = () => false;
	}
	if (!Element.prototype.setPointerCapture) {
		Element.prototype.setPointerCapture = () => {};
	}
	if (!Element.prototype.releasePointerCapture) {
		Element.prototype.releasePointerCapture = () => {};
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = () => {};
	}
	// jsdom ships no matchMedia; the Studio's responsive hook needs it. Default to
	// "desktop" (no query matches) so component tests render the full layout.
	if (!window.matchMedia) {
		window.matchMedia = (query: string) =>
			({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				addListener: () => {},
				removeListener: () => {},
				dispatchEvent: () => false,
			}) as unknown as MediaQueryList;
	}
}
