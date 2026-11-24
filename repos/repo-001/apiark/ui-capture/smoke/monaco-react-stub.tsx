export const loader = { config() {} };
export default function Editor(p: { value?: string }) { return <pre data-editor>{p.value}</pre>; }
export const DiffEditor = Editor;
