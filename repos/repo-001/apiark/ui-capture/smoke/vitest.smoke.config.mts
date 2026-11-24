// jsdom smoke test: renders the real <App/> against the local IPC mock.
// (Used because a real browser can't be launched inside the build sandbox.)
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, "../../apps/desktop");
const nm = (p: string) => path.join(desktop, "node_modules", p);
export default {
  root: desktop,
  resolve: {
    alias: [
      { find: /^@\//, replacement: path.join(desktop, "src") + "/" },
      { find: "@tauri-apps/api/mocks", replacement: nm("@tauri-apps/api/mocks.js") },
      { find: "@tauri-apps/api/event", replacement: nm("@tauri-apps/api/event.js") },
      { find: /^monaco-editor$/, replacement: path.join(here, "monaco-stub.ts") },
      { find: /^@monaco-editor\/react$/, replacement: path.join(here, "monaco-react-stub.tsx") },
      { find: /^@testing-library\/react$/, replacement: nm("@testing-library/react/dist/index.js") },
      { find: /^react\/jsx-dev-runtime$/, replacement: nm("react/jsx-dev-runtime.js") },
      { find: /^react\/jsx-runtime$/, replacement: nm("react/jsx-runtime.js") },
    ],
  },
  esbuild: { jsx: "automatic" },
  test: { environment: "jsdom", include: [path.join(here, "*.smoke.tsx")], globals: true, testTimeout: 30000 },
};
