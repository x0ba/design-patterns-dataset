#!/usr/bin/env bash
# Same output as web/scripts/fetch-firmware.mjs, but resolves release assets via
# github.com (api.github.com is unreachable in the capture sandbox).
set -euo pipefail
cd "$(dirname "$0")/../web"
TAG=v2.0.0
DIR=public/firmware
rm -rf "$DIR"; mkdir -p "$DIR/$TAG"
NAMES=(4MB_MBEDTLS_LED10 4MB_MBEDTLS_LED48 8MB_ATECC 8MB_MBEDTLS)
boards=""
for n in "${NAMES[@]}"; do
  f="ToothPasteFirmware_$n.bin"
  curl -sfL -o "$DIR/$TAG/$f" "https://github.com/Brisk4t/ToothPaste/releases/download/$TAG/$f"
  label="${n//_/ }"; size="${n%%_*}"
  boards+="${boards:+,}
    {\"label\": \"$label\", \"url\": \"/firmware/$TAG/$f\", \"flashSize\": \"$size\"}"
done
printf '{\n  "tag": "%s",\n  "boards": [%s\n  ]\n}\n' "$TAG" "$boards" > "$DIR/manifest.json"
ls -la "$DIR/$TAG"; cat "$DIR/manifest.json"
