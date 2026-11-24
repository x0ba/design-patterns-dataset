import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static build: relative asset paths so the output works from any server root,
// and no server-side routing is needed (the app uses hash routes).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
  },
});
