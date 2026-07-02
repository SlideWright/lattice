import { SquareDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Toolbar toggle for the layout DEBUG overlay. `on` is the EFFECTIVE state (the
 * deck's `debug:` front matter, or a session override); clicking flips it by
 * writing a per-session override in debug-prefs (localStorage), winning over the
 * deck without editing the Markdown. Kept in sync with the Deck-setup switch. The
 * active state tints the icon — the same `text-primary` cue the Deck-setup trigger
 * uses when a deck carries front matter.
 */
export function BoundingBoxToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
	return (
		<Button
			variant="outline"
			size="sm"
			aria-pressed={on}
			aria-label="Debug overlay"
			title="Debug overlay — outline every box by layout mode and label the structural boxes"
			onClick={onToggle}
		>
			<SquareDashed className={on ? 'text-primary' : undefined} />
			<span className="hidden sm:inline">Debug</span>
		</Button>
	);
}
