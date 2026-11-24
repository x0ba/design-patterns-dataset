import { resolve } from "path";
import { defineConfig, mergeConfig, type Plugin } from "vite";
import electronConfig from "../../electron.vite.config";

const root = resolve(__dirname, "../..");
const web = __dirname;

/** 在入口脚本之前注入浏览器版预加载 */
const injectShim = (): Plugin => ({
  name: "ui-capture-inject-shim",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html.replace(
        '<script type="module" src="/src/bootstrap.ts"></script>',
        '<script type="module" src="/.ui-capture/web/shim.ts"></script>\n    <script type="module" src="/src/bootstrap.ts"></script>',
      ),
  },
});

const renderer = (electronConfig as any).renderer;
const base = { ...renderer };
delete base.build;

export default mergeConfig(base, {
  root,
  base: "./",
  configFile: false,
  publicDir: resolve(root, "public"),
  plugins: [injectShim()],
  resolve: {
    alias: [
      { find: /^electron$/, replacement: resolve(web, "fake-electron.ts") },
      { find: /^os$/, replacement: resolve(web, "fake-os.ts") },
      { find: /^@electron-toolkit\/preload$/, replacement: resolve(web, "fake-toolkit-preload.ts") },
    ],
  },
  build: {
    outDir: resolve(root, ".ui-capture/out"),
    emptyOutDir: true,
    rolldownOptions: { input: { index: resolve(root, "index.html") } },
  },
  server: { port: 5430 },
});
