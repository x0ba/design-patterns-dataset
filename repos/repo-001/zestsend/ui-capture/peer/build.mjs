import { build } from "esbuild";
import { fileURLToPath } from "node:url";
const here = fileURLToPath(new URL(".", import.meta.url));
const appModules = fileURLToPath(new URL("../../node_modules/", import.meta.url));
await build({
  entryPoints: [here + "bot.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: here + "dist/bot.mjs",
  nodePaths: [appModules],
  external: ["@roamhq/wrtc"],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});
console.log("built dist/bot.mjs");
