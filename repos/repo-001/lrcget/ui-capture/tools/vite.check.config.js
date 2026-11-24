// Verification-only build (IIFE so jsdom can execute it). Not used for the real output.
import base from '../../vite.config.js'
export default { ...base, build: { ...base.build, sourcemap: false, rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } } } }
