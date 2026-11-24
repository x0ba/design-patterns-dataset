const noop = () => ({ dispose() {} });
const proxy: any = new Proxy(function () {}, { get: (_t, k) => (k === "then" ? undefined : proxy), apply: () => proxy });
export const languages: any = new Proxy({}, { get: () => noop });
export const editor: any = proxy; export const Uri: any = proxy; export const KeyMod: any = {}; export const KeyCode: any = {};
export default { languages, editor };
