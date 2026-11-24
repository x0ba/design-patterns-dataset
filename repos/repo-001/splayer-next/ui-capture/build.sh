#!/usr/bin/env bash
# 生成种子数据 → 构建渲染进程静态包（带浏览器版预加载与模拟主进程）→ 拷贝封面
set -euo pipefail
cd "$(dirname "$0")/.."
mise exec -- node .ui-capture/seed/generate.mjs
NODE_ENV=production mise exec -- node node_modules/vite/bin/vite.js build --config .ui-capture/web/vite.config.ts
cp -R .ui-capture/web/static/. .ui-capture/out/
