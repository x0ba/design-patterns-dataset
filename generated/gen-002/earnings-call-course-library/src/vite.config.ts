import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths so the build works from any static root without rewrites.
// Output goes to ./out (entry: ./out/index.html).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
  },
});
