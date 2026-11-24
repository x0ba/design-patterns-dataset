// 浏览器中替代 electron 渲染进程 API：invoke/send 路由到本地模拟主进程
import { handleInvoke, handleSend, setEmitter } from "./main";

type Listener = (event: unknown, data: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

setEmitter((channel, data) => {
  for (const fn of listeners.get(channel) ?? []) fn({ sender: null }, data);
});

export const ipcRenderer = {
  invoke: async (channel: string, ...args: unknown[]) => handleInvoke(channel, args),
  send: (channel: string, ...args: unknown[]) => {
    handleSend(channel, args);
  },
  on: (channel: string, fn: Listener) => {
    if (!listeners.has(channel)) listeners.set(channel, new Set());
    listeners.get(channel)!.add(fn);
    return ipcRenderer;
  },
  removeListener: (channel: string, fn: Listener) => {
    listeners.get(channel)?.delete(fn);
    return ipcRenderer;
  },
  removeAllListeners: (channel: string) => {
    listeners.delete(channel);
    return ipcRenderer;
  },
};

export const contextBridge = { exposeInMainWorld: () => {} };
export const webUtils = { getPathForFile: (file: File) => `/Users/lin/Downloads/${file.name}` };
export default { ipcRenderer, contextBridge, webUtils };
