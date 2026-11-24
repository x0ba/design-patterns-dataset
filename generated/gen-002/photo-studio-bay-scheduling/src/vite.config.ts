import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The build is served from the root of a plain static file server, so asset
// URLs are relative ('./') and the output goes to ./out with index.html at its root.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    sourcemap: false,
  },
});
