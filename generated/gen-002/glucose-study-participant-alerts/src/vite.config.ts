import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths so the build works from the root of any static server
// and does not depend on the host path. Output goes to ./out.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
});
