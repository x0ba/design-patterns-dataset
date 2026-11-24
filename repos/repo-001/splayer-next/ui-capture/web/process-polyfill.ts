// 预加载脚本读取的 Node 全局 process 在浏览器里不存在，提供最小实现
const g = globalThis as any;
g.process = g.process ?? {
  platform: "darwin",
  arch: "arm64",
  env: {},
  execPath: "/Applications/SPlayer-Next.app/Contents/MacOS/SPlayer-Next",
  contextIsolated: false,
  versions: { electron: "44.10.1", chrome: "142.0.7444.59", node: "24.11.0", v8: "14.2.231.14" },
};
