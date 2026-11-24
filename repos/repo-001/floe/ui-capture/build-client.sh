#!/usr/bin/env bash
# Production build of client/ (Next.js standalone) without network access.
# next/font/google is fed by Next's own NEXT_FONT_GOOGLE_MOCKED_RESPONSES hook;
# the real Geist woff2 files are served from a throwaway localhost server.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
export FONT_PORT=4491
node "$HERE/fonts/make-mock.js"
node -e '
const http=require("http"),fs=require("fs"),path=require("path");
http.createServer((q,s)=>{const f=path.join(process.argv[1],path.basename(q.url.split("?")[0]));
if(!fs.existsSync(f)){s.writeHead(404);return s.end();}
s.writeHead(200,{"content-type":"font/woff2"});fs.createReadStream(f).pipe(s);}).listen(+process.env.FONT_PORT,"127.0.0.1");' "$HERE/fonts" &
FONT_PID=$!
trap 'kill $FONT_PID 2>/dev/null || true' EXIT
sleep 0.5
cd "$ROOT/client"
NEXT_FONT_GOOGLE_MOCKED_RESPONSES="$HERE/fonts/google-fonts-mock.js" \
NEXT_PUBLIC_SOCKET_URL= \
NEXT_PUBLIC_SITE_URL=http://localhost:4479 \
NEXT_TELEMETRY_DISABLED=1 \
  pnpm build
# Standalone output needs static assets and public/ copied next to server.js (as client/Dockerfile does).
cp -R .next/static .next/standalone/.next/static
cp -R public .next/standalone/public
