import { SquareDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The TEMPORARY half of the bounding-box debug feature: a toolbar toggle next to
 * Deck setup that flips the colour-coded element outlines on the live preview for
 * the current session, without persisting. The PERMANENT default lives in the
 * deck-setup drawer (bbox-prefs.js → localStorage); this button is the quick,
 * throwaway flip while you debug a layout.
 *
 * `on` is owned by PlaygroundApp (seeded from the persisted pref, kept in sync
 * with the drawer switch). The active state tints the icon — the same `text-
 * primary` cue the Deck-setup trigger uses when a deck carries front matter.
 */
export function BoundingBoxToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
	return (
		<Button
			variant="outline"
			size="sm"
			aria-pressed={on}
			aria-label="Bounding boxes"
			title="Bounding boxes — outline every element in the preview for layout debugging"
			onClick={onToggle}
		>
			<SquareDashed className={on ? 'text-primary' : undefined} />
			<span className="hidden sm:inline">Boxes</span>
		</Button>
	);
}
