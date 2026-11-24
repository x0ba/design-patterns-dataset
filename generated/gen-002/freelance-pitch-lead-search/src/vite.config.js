import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths so ./out can be served from the root of any static server.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});
