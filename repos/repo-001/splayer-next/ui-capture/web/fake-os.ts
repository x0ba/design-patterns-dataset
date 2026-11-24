// 替代 Node os 模块（预加载脚本只读取系统信息）
export default {
  type: () => "Darwin",
  arch: () => "arm64",
  release: () => "25.1.0",
};
