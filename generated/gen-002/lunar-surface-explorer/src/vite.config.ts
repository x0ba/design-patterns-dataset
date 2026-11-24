import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { outDir: 'out', emptyOutDir: true, chunkSizeWarningLimit: 1500, target: 'es2020' },
});
