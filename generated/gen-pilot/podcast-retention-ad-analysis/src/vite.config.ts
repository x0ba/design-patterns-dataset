import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Makes ./out work from any static root and from disk (file://):
 * a classic deferred script instead of a module script, and no crossorigin attributes.
 */
function classicDeferredScript(): Plugin {
  return {
    name: 'classic-deferred-script',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html
          .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
          .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=');
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), classicDeferredScript()],
  // Relative asset paths so ./out can be served from any static root, with no rewrites.
  base: './',
  build: {
    outDir: 'out',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    rolldownOptions: {
      output: { format: 'iife' },
    },
  },
});
