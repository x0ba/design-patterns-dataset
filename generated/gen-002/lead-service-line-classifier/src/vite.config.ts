import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The production build is served from the root of a plain static file server
// with no rewrites, so asset URLs are relative and the entry point is ./out/index.html.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
