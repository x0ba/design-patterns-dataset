import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths so ./out/index.html works from any static server root,
// and so the build can be opened without a rewrite rule.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});
