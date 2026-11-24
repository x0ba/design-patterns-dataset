#!/usr/bin/env bash
# 依赖安装：pnpm 11（见 mise.toml 说明），临时放宽 engines.pnpm，跳过 electron 下载与原生重建脚本
set -euo pipefail
cd "$(dirname "$0")/.."
export HOME="$PWD/.ui-capture/cache/home" pnpm_config_pm_on_fail=ignore
mkdir -p "$HOME"
cp package.json pnpm-lock.yaml .ui-capture/cache/
sed -i '' 's/"pnpm": ">=12"/"pnpm": ">=11"/' package.json
mise exec -- pnpm install --no-frozen-lockfile --ignore-scripts --pnpmfile .ui-capture/pnpmfile.cjs || true
cp .ui-capture/cache/package.json package.json
cp .ui-capture/cache/pnpm-lock.yaml pnpm-lock.yaml
