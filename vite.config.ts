/**
 * Build configuration for the demo/docs Vite app.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: '/sway/',
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(ROOT_DIR, 'node_modules/react'),
      'react-dom': path.resolve(ROOT_DIR, 'node_modules/react-dom'),
      'react-sway': path.resolve(ROOT_DIR, 'react-sway/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
});
