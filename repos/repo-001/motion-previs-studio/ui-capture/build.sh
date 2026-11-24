#!/usr/bin/env bash
# Builds the static browser capture of Motion Previs Studio into .ui-capture/out
set -euo pipefail
cd "$(dirname "$0")/.."
# Runtime assets normally fetched by scripts/prepare-mediapipe-assets.cjs (postinstall).
mkdir -p public/mediapipe public/models
cp -R node_modules/@mediapipe/tasks-vision/wasm public/mediapipe/
[ -f public/models/pose_landmarker_lite.task ] || { echo "missing public/models/pose_landmarker_lite.task (see app.json notes)"; exit 1; }
npm run build
FFMPEG="$(mise which ffmpeg)" node .ui-capture/build-media.mjs
rm -rf .ui-capture/out
cp -R dist .ui-capture/out
find .ui-capture/out -name '*.map' -delete
cp -R .ui-capture/media .ui-capture/out/media
cp .ui-capture/mps-bridge-stub.js .ui-capture/out/mps-bridge-stub.js
# Load the bridge stub (preload replacement) before the app bundle.
node -e '
const fs=require("fs");const p=".ui-capture/out/index.html";let h=fs.readFileSync(p,"utf8");
if(!h.includes("mps-bridge-stub.js")) h=h.replace("<script type=\"module\"","<script src=\"./mps-bridge-stub.js\"></script>\n    <script type=\"module\"");
fs.writeFileSync(p,h);'
echo "built .ui-capture/out"
