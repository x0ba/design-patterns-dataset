// Builds an established shopper's persisted cart by replaying real cart actions
// through the app's own reducer (src/lib/features/carts/cartsSlice.ts), then writes
// it in redux-persist's "persist:root" format to public/ui-capture-seed/persist-root.json.
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const require = createRequire(path.join(root, "package.json"));
const ts = require("typescript");

// Transpile the slice + utils to CJS in a temp build dir.
const build = path.join(here, ".build");
fs.mkdirSync(build, { recursive: true });
const tx = (src, out, fix = (s) => s) => {
  const code = fs.readFileSync(path.join(root, src), "utf8");
  const js = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  fs.writeFileSync(path.join(build, out), fix(js));
};
tx("src/lib/utils.ts", "utils.cjs");
tx("src/lib/features/carts/cartsSlice.ts", "cartsSlice.cjs", (s) =>
  s.replace('"@/lib/utils"', '"./utils.cjs"')
);
// resolve node_modules from repo root
process.env.NODE_PATH = path.join(root, "node_modules");
Module._initPaths();
const slice = require(path.join(build, "cartsSlice.cjs"));
const reducer = slice.default;
const { addToCart, removeCartItem, remove } = slice;

// Catalog entries exactly as defined in src/app/page.tsx (id, title, srcUrl, price, discount).
const pageSrc = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
const catalog = {};
for (const m of pageSrc.matchAll(
  /id:\s*(\d+),\s*title:\s*"([^"]+)",\s*srcUrl:\s*"([^"]+)"[\s\S]*?price:\s*(\d+),\s*discount:\s*\{\s*amount:\s*(\d+),\s*percentage:\s*(\d+)/g
)) {
  catalog[+m[1]] = {
    id: +m[1],
    title: m[2],
    srcUrl: m[3],
    price: +m[4],
    discount: { amount: +m[5], percentage: +m[6] },
  };
}
const add = (id, size, color, quantity) => {
  const p = catalog[id];
  if (!p) throw new Error(`no product ${id}`);
  return addToCart({
    id,
    name: p.title,
    srcUrl: p.srcUrl,
    price: p.price,
    attributes: [size, color],
    discount: p.discount,
    quantity,
  });
};

// The shopper's history over several visits: adding, doubling up, changing their mind.
const actions = [
  add(1, "Medium", "Blue", 1), // T-shirt with Tape Details
  add(8, "Large", "Blue", 1), // Faded Skinny Jeans
  add(4, "Large", "Brown", 1), // Sleeve Striped T-shirt
  add(13, "Medium", "Green", 1), // Gradient Graphic T-shirt (later removed)
  add(12, "X-Large", "Green", 1), // Polo with Contrast Trims
  add(1, "Medium", "Blue", 1), // a second tape-detail tee
  add(5, "Medium", "Brown", 1), // Vertical Striped Shirt
  add(5, "Large", "Blue", 1), // same shirt in a gift size
  add(7, "Medium", "Green", 3), // Loose Fit Bermuda Shorts
  removeCartItem({ id: 7, attributes: ["Medium", "Green"] }), // 3 -> 2
  remove({ id: 13, attributes: ["Medium", "Green"], quantity: 1 }),
  add(2, "Small", "Blue", 1), // Skinny Fit Jeans
];

let state = reducer(undefined, { type: "@@INIT" });
for (const a of actions) state = reducer(state, a);

const persisted = {
  carts: JSON.stringify(state),
  _persist: JSON.stringify({ version: 1, rehydrated: true }),
};
const outDir = path.join(root, "public/ui-capture-seed");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "persist-root.json"),
  JSON.stringify({ "persist:root": JSON.stringify(persisted) })
);
fs.rmSync(build, { recursive: true, force: true });
console.log(
  `cart: ${state.cart.items.length} lines, ${state.cart.totalQuantities} units, subtotal $${state.totalPrice}, after discounts $${state.adjustedTotalPrice}`
);
