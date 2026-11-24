import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build: output goes to ./out, asset URLs are relative so the app works
// from the root of any plain static file server without rewrites.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
  },
});
