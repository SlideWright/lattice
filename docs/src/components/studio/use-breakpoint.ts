import * as React from 'react';

// The Studio adapts its layout across three first-class widths (CLAUDE.md Quality
// Bar): desktop (~1440), tablet (~820), mobile (~390). At desktop the Architect
// and Inspector are persistent grid columns; below 1100 they become slide-in
// sheets and the body drops a column; below 700 the body is a single swappable
// Edit/Preview pane. matchMedia drives the switch (the island is client:only, so
// `window` always exists at render; tests polyfill matchMedia → 'desktop').
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export function useBreakpoint(): Breakpoint {
	const read = React.useCallback((): Breakpoint => {
		if (typeof window === 'undefined' || !window.matchMedia) return 'desktop';
		if (window.matchMedia('(max-width: 699px)').matches) return 'mobile';
		if (window.matchMedia('(max-width: 1099px)').matches) return 'tablet';
		return 'desktop';
	}, []);

	const [bp, setBp] = React.useState<Breakpoint>(read);

	React.useEffect(() => {
		const mqMobile = window.matchMedia('(max-width: 699px)');
		const mqTablet = window.matchMedia('(max-width: 1099px)');
		const update = () => setBp(read());
		update();
		mqMobile.addEventListener('change', update);
		mqTablet.addEventListener('change', update);
		return () => {
			mqMobile.removeEventListener('change', update);
			mqTablet.removeEventListener('change', update);
		};
	}, [read]);

	return bp;
}
