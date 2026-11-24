import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
const here = fileURLToPath(new URL('.', import.meta.url))
export default defineConfig({
  root: here + '..',
  configFile: false,
  build: {
    ssr: here + 'lrt-entry.ts',
    outDir: here + 'lrt-bundle',
    emptyOutDir: true,
    rolldownOptions: { output: { entryFileNames: 'lrt.mjs', format: 'es' } },
  },
  ssr: { noExternal: true },
  publicDir: false,
})
