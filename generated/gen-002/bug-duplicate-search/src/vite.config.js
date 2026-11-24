import { defineConfig } from 'vite';

// Relative asset paths so the build works from the root of any static server
// (no rewrites needed). Output goes to ./out with ./out/index.html as the entry.
export default defineConfig({
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
  },
});
