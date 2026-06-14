import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Vitest + React Testing Library harness for the docs site's React islands
// (Phase 1+ of the shadcn migration). jsdom environment; `@` resolves to src/
// to match the app's tsconfig path alias.
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest.setup.ts'],
		include: ['src/**/*.test.{ts,tsx}'],
	},
});
