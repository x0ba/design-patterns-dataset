import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative asset paths so the build works from any static root, and the
// output goes to ./out with ./out/index.html as the entry point.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
  },
});
