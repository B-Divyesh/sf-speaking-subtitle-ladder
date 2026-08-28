import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(process.env.VITE_BUILD_ID || process.env.GITHUB_SHA || `build-${Date.now()}`)
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        demo: resolve(process.cwd(), 'demo/index.html'),
        privacy: resolve(process.cwd(), 'privacy/index.html'),
        terms: resolve(process.cwd(), 'terms/index.html')
      }
    }
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts']
  }
});
