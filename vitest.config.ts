import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/stores/**/*.ts', 'src/lib/utils/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts', 'src/lib/stores/types.ts'],
    },
  },
});
