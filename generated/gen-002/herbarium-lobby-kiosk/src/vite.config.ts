import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Output: ./out/index.html, one self-contained file (JS and CSS inlined), so it
// works from any static root and even when opened directly from disk.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 100000000,
  },
});
