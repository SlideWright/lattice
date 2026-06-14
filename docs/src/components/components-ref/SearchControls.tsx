import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { setLens, setQuery } from '@/lib/component-browser-store';
import type { Lens } from '@/lib/component-search';

/**
 * The shared search-box + Group-by select. Writes to the module store, so the
 * index grid AND the left nav stay in lockstep no matter which copy you type in
 * (there can be two on the index page: one in the hero, one in the sidebar).
 *
 * `size` adapts the affordance: `lg` for the index hero, `sm` for the sidebar.
 */
export function SearchControls({
	query,
	lens,
	lenses,
	count,
	size = 'lg',
	searchPlaceholder = 'Search components — name, tag, or description…',
}: {
	query: string;
	lens: string;
	lenses: Lens[];
	count: string;
	size?: 'lg' | 'sm';
	searchPlaceholder?: string;
}) {
	const lg = size === 'lg';
	return (
		<div className={lg ? 'flex flex-wrap items-center gap-3' : 'flex flex-col gap-2'}>
			<div className={lg ? 'relative min-w-[240px] max-w-[520px] flex-1' : 'relative'}>
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={searchPlaceholder}
					aria-label="Search components by name, tag, or description"
					autoComplete="off"
					className={lg ? 'h-11 pl-9 text-[15px]' : 'h-9 pl-8 text-[13px]'}
				/>
			</div>
			<div className={lg ? 'flex items-center gap-2' : 'flex items-center gap-2'}>
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Group by</span>
				<Select value={lens} onValueChange={setLens}>
					<SelectTrigger size="sm" aria-label="Group components by" className={lg ? 'w-[8rem]' : 'flex-1'}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{lenses.map((l) => (
							<SelectItem key={l.id} value={l.id}>
								{l.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{lg && count && <span className="font-mono text-[12.5px] text-muted-foreground">{count}</span>}
		</div>
	);
}
