import { describe, expect, it } from 'vitest';
import {
	emptyMessage,
	filterModels,
	fmtCtx,
	fmtPrice,
	fmtTokens,
	fmtUSD,
	groupByVendor,
	inSet,
	isFreeModel,
	metaLabel,
	OR_FEATURED,
	OR_VIEWS,
	priceLabel,
	rowTitle,
	shortName,
	vendorOf,
} from './or-catalog.js';

// A tiny stand-in catalog in the shape architect-model.js `listOpenRouterModels()`
// yields — exercises the pure helpers with no network.
const CATALOG = [
	{ id: 'anthropic/claude-sonnet-4', name: 'Anthropic: Claude Sonnet 4', promptPerM: 3, completionPerM: 15, contextLength: 1_000_000, vision: true },
	{ id: 'anthropic/claude-3.5-haiku', name: 'Anthropic: Claude 3.5 Haiku', promptPerM: 0.8, completionPerM: 4, contextLength: 200_000 },
	{ id: 'deepseek/deepseek-r1', name: 'DeepSeek: R1', promptPerM: 0.7, completionPerM: 2.5, contextLength: 164_000 },
	{ id: 'google/gemma-free', name: 'Google: Gemma (free)', promptPerM: 0, completionPerM: 0, contextLength: 262_000, vision: true },
	{ id: 'router/auto', name: 'Auto Router', promptPerM: null, completionPerM: null, contextLength: null },
];

describe('or-catalog — price + format helpers', () => {
	it('formats per-million prices: free at 0, 3dp under $1, 2dp above', () => {
		expect(fmtPrice(0)).toBe('free');
		expect(fmtPrice(0.8)).toBe('$0.800');
		expect(fmtPrice(15)).toBe('$15.00');
		expect(fmtPrice(null)).toBe('');
		expect(fmtPrice(Number.NaN)).toBe('');
	});

	it('labels a variable-priced (router) model as "pricing varies", never a negative', () => {
		expect(priceLabel(CATALOG[4])).toBe('pricing varies');
		expect(priceLabel(CATALOG[0])).toBe('$3.00/M in · $15.00/M out');
	});

	it('compacts context windows and tokens', () => {
		expect(fmtCtx(1_000_000)).toBe('1M');
		expect(fmtCtx(200_000)).toBe('200K');
		expect(fmtCtx(512)).toBe('512');
		expect(fmtCtx(0)).toBe('');
		expect(fmtTokens(9_800)).toBe('9.8K');
		expect(fmtTokens(1_500_000)).toBe('1.5M');
	});

	it('builds the meta line from context + price', () => {
		expect(metaLabel(CATALOG[0])).toBe('1M ctx · $3.00/M in · $15.00/M out');
	});

	it('formats USD with sub-dollar precision', () => {
		expect(fmtUSD(0.046)).toBe('$0.046');
		expect(fmtUSD(12)).toBe('$12.00');
		expect(fmtUSD(0)).toBe('$0.00');
	});

	it('strips the redundant vendor prefix from a row name', () => {
		expect(shortName(CATALOG[0])).toBe('Claude Sonnet 4');
		expect(shortName(CATALOG[2])).toBe('R1');
	});

	it('derives a vendor group key from the id', () => {
		expect(vendorOf('anthropic/claude-sonnet-4')).toBe('anthropic');
		expect(vendorOf('meta-llama/llama-3.3')).toBe('meta llama');
	});

	it('flags free rows and matches curated sets by prefix', () => {
		expect(isFreeModel(CATALOG[3])).toBe(true);
		expect(isFreeModel(CATALOG[0])).toBe(false);
		expect(inSet(OR_FEATURED, 'anthropic/claude-sonnet-4:beta')).toBe(true);
		expect(inSet(OR_FEATURED, 'deepseek/deepseek-r1')).toBe(false);
	});

	it('describes vision + limits in the row title', () => {
		expect(rowTitle(CATALOG[0])).toContain('Accepts images');
		expect(rowTitle(CATALOG[0])).toContain('Context 1,000,000 tokens');
	});
});

describe('or-catalog — filter + group', () => {
	it('exposes the four views in order', () => {
		expect(OR_VIEWS.map(([k]) => k)).toEqual(['featured', 'value', 'free', 'all']);
	});

	it('featured keeps only curated ids', () => {
		const out = filterModels(CATALOG, 'featured', '');
		expect(out.map((m: { id: string }) => m.id)).toContain('anthropic/claude-sonnet-4');
		expect(out.map((m: { id: string }) => m.id)).not.toContain('deepseek/deepseek-r1');
	});

	it('value keeps the value lens, free keeps only $0 rows', () => {
		expect(filterModels(CATALOG, 'value', '').map((m: { id: string }) => m.id)).toContain('deepseek/deepseek-r1');
		const free = filterModels(CATALOG, 'free', '');
		expect(free).toHaveLength(1);
		expect(free[0].id).toBe('google/gemma-free');
	});

	it('all + query filters by name/id, case-insensitive', () => {
		expect(filterModels(CATALOG, 'all', 'haiku').map((m: { id: string }) => m.id)).toEqual(['anthropic/claude-3.5-haiku']);
		expect(filterModels(CATALOG, 'all', 'DEEPSEEK')).toHaveLength(1);
		expect(filterModels(CATALOG, 'all', '')).toHaveLength(CATALOG.length);
	});

	it('groups by vendor, vendors sorted, models sorted within', () => {
		const groups = groupByVendor(filterModels(CATALOG, 'all', ''));
		expect(groups.map((g) => g.vendor)).toEqual(['anthropic', 'deepseek', 'google', 'router']);
		expect(groups[0].models.map(shortName)).toEqual(['Claude 3.5 Haiku', 'Claude Sonnet 4']);
	});

	it('gives a view-specific empty message', () => {
		expect(emptyMessage('all')).toBe('No models match.');
		expect(emptyMessage('free')).toContain('No free models');
		expect(emptyMessage('value')).toContain('try All');
	});
});
