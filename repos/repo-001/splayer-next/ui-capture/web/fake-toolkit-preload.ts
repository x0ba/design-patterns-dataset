import { ipcRenderer } from "./fake-electron";
// 替代 @electron-toolkit/preload 的 electronAPI
export const electronAPI = {
  ipcRenderer,
  webFrame: { setZoomFactor: () => {}, getZoomFactor: () => 1 },
  process: {
    platform: (globalThis as any).process.platform,
    versions: (globalThis as any).process.versions,
    env: {},
  },
};
