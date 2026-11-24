// Capture build: the repo's own Vite config for apps/desktop, plus one plugin
// that prepends the local Tauri IPC mock (mock/tauri-backend.ts) to main.tsx.
// No repo source files are modified.
import path from "node:path";
import { fileURLToPath } from "node:url";
import baseConfig from "../apps/desktop/vite.config.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, "../apps/desktop");
const mockEntry = path.join(here, "mock/tauri-backend.ts");

export default async (env: unknown) => {
  const cfg = await (baseConfig as unknown as (e: unknown) => Promise<Record<string, any>>)(env);
  cfg.root = desktop;
  cfg.base = "/";
  cfg.plugins = [
    ...cfg.plugins,
    {
      name: "apiark-capture-mock-ipc",
      enforce: "pre",
      transform(code: string, id: string) {
        if (id.replace(/\\/g, "/").endsWith("/apps/desktop/src/main.tsx")) {
          return `import ${JSON.stringify(mockEntry)};\n${code}`;
        }
        return null;
      },
    },
  ];
  cfg.resolve.alias = {
    ...cfg.resolve.alias,
    "@tauri-apps/api/mocks": path.join(desktop, "node_modules/@tauri-apps/api/mocks.js"),
    "@tauri-apps/api/event": path.join(desktop, "node_modules/@tauri-apps/api/event.js"),
  };
  cfg.server = { ...cfg.server, port: Number(process.env.PORT || 5408), strictPort: true, fs: { allow: [path.resolve(here, "..")] } };
  cfg.build = { ...(cfg.build || {}), outDir: path.relative(desktop, path.join(here, "out")), emptyOutDir: true };
  return cfg;
};
