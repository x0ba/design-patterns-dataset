import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths so ./out can be served from any static root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
  },
});
