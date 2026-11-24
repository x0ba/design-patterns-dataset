import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build: relative asset paths so the output works from any root of a plain file server.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
});
