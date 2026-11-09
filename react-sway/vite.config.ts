/**
 * Package build configuration for ReactSway library artifacts.
 */
import { defineConfig } from 'vite';

export default defineConfig({
  // React 17 lacks the JSX-runtime exports needed by native Node ESM resolution.
  oxc: {
    jsx: { runtime: 'classic' },
    jsxInject: "import React from 'react'",
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
      formats: ['es', 'cjs'],
    },
    rolldownOptions: {
      external: ['react', 'react-dom'],
      output: {
        exports: 'named',
      },
    },
    minify: false,
    target: 'es2020',
  },
});
