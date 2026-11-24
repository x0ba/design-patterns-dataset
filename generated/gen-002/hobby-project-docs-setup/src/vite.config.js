import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths let ./out be served from any directory root, including
// a plain static file server with no rewrites.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
  },
});
