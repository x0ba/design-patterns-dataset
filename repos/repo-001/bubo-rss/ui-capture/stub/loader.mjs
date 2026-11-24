// ESM loader hook: when the compiled Bubo code (stage/dist/*) imports "node-fetch",
// hand it the local fixture-backed fetch instead. Everything else resolves normally.
const STUB = new URL("./fetch-stub.mjs", import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "node-fetch" && context.parentURL && context.parentURL.includes("/stage/dist/")) {
    return { url: STUB, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
