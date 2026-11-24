// 必须先于渲染进程入口执行：安装 process 全局，再加载真实预加载脚本挂上 window.api
import "./process-polyfill";
import "@root/electron/preload/index.ts";
