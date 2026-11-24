// Runs the seed generator inside the app's own vitest/jsdom setup so it can use
// the real FileSystemProvider / AppProvider / MailService / MessagesService.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
const repo = path.resolve(__dirname, '../..');
export default defineConfig({
  root: repo,
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: path.join(repo, 'src/test/setup.ts'),
    include: ['.ui-capture/seed/**/*.{seed,check}.tsx'],
    testTimeout: 240000,
  },
  resolve: { alias: { '@': path.join(repo, 'src') } },
});
