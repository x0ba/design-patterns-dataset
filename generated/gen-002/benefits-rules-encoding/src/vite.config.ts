import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build: relative asset paths so ./out works from any server root,
// with no rewrites needed (single entry, no client-side routing).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'out',
    emptyOutDir: true,
    target: 'es2022',
  },
});
