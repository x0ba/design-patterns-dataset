import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build: relative asset paths so the output works from any server root,
// and ./out/index.html is the entry point.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    sourcemap: false,
  },
});
