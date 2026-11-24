const STUB_URL = new URL('./node-llama-cpp-stub.mjs', import.meta.url).href;
export async function resolve(specifier, context, nextResolve) {
    if (specifier === 'node-llama-cpp') {
        return {url: STUB_URL, shortCircuit: true, format: 'module'};
    }
    return nextResolve(specifier, context);
}
