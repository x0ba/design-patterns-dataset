import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build: relative asset paths so ./out can be served from any root,
// with no rewrites needed. Output goes to ./out with ./out/index.html as entry.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
});
