import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative asset paths so the build works from any static root, and the
// output lands in ./out with ./out/index.html as the entry point.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
  },
});
