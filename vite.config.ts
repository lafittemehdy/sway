/**
 * Build configuration for the demo/docs Vite app.
 */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/sway/',
  plugins: [react()],
});
