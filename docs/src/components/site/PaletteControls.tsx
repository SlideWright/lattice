import { Moon, Sun } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { getMode, getPalette, type Mode, setPalette, syncFromStorage, toggleMode } from '@/lib/site-chrome';

const titleCase = (s: string) => s.replace(/(^|-)(\w)/g, (_m, sep, c) => (sep ? ' ' : '') + c.toUpperCase());

/**
 * The shared palette + light/dark controls — one accessible shadcn Select +
 * mode toggle, mounted on every surface (replacing six hand-rolled copies).
 * State is owned by the shared controller (site-chrome.ts), which writes the
 * data-palette/data-mode attributes + localStorage so the whole site (and the
 * deck iframes) re-theme. Never owns first paint — the pre-paint script does.
 *
 * Initial state matches the SSR fallback (first palette / light) so hydration
 * is stable; a mount effect immediately syncs to the real attributes set by
 * the pre-paint script (and re-syncs on bfcache `pageshow`).
 *
 * Pass an empty `palettes` to render the mode toggle only — used by the
 * Workbench, whose topbar has no global palette picker (you craft one there).
 */
export default function PaletteControls({ palettes }: { palettes: string[] }) {
	const hasPaletteSelect = palettes.length > 0;
	const [palette, setPaletteState] = React.useState(palettes[0] ?? 'indaco');
	const [mode, setModeState] = React.useState<Mode>('light');

	React.useEffect(() => {
		const synced = syncFromStorage();
		setPaletteState(synced.palette);
		setModeState(synced.mode);
		const onShow = () => {
			const s = syncFromStorage();
			setPaletteState(s.palette);
			setModeState(s.mode);
		};
		// keep in sync if another island/page control changes it
		const onStorage = () => {
			setPaletteState(getPalette());
			setModeState(getMode());
		};
		window.addEventListener('pageshow', onShow);
		window.addEventListener('storage', onStorage);
		return () => {
			window.removeEventListener('pageshow', onShow);
			window.removeEventListener('storage', onStorage);
		};
	}, []);

	const onPalette = (value: string) => {
		setPalette(value);
		setPaletteState(value);
	};
	const onMode = () => setModeState(toggleMode());

	return (
		<div className="flex items-center gap-2">
			{hasPaletteSelect && (
				<Select value={palette} onValueChange={onPalette}>
					<SelectTrigger size="sm" aria-label="Palette" className="w-[8.5rem]">
						<SelectValue placeholder="Palette" />
					</SelectTrigger>
					<SelectContent className="max-h-[60vh]">
						{palettes.map((p) => (
							<SelectItem key={p} value={p}>
								{titleCase(p)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
			<Button
				variant="outline"
				size="icon-sm"
				onClick={onMode}
				aria-label="Toggle light / dark"
				title="Toggle light / dark"
			>
				{mode === 'dark' ? <Sun /> : <Moon />}
			</Button>
		</div>
	);
}
