import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build: output goes to ./out, assets use relative paths, and all
// routing is hash-based, so no server rewrites are needed.
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});
