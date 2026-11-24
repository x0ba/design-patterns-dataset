import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths so ./out/index.html works from any static server root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
  },
});
