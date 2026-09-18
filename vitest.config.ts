import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // JSX moderno: sin esto hay que importar React en cada archivo de test.
  esbuild: { jsx: 'automatic' },
  resolve: {
    // Mismo alias que tsconfig.json: sin esto los tests no resuelven "@/..."
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Los tests de /tests/e2e son de Playwright y se corren con `npx playwright test`.
    // Sin esta exclusión vitest intenta recolectarlos y falla al cargarlos.
    exclude: ['node_modules/**', 'dist/**', '.next/**', 'tests/e2e/**'],
  },
});
