#!/usr/bin/env bash
# Vendors the Google Fonts used by the UI (Lato, Open Sans, Roboto) from the npm @fontsource packages,
# so the stub server can answer the app's fonts.googleapis.com CSS imports offline.
set -euo pipefail
cd "$(dirname "$0")"
DL="${TMPDIR:-/tmp}/fc-fonts-dl"; rm -rf "$DL"; mkdir -p "$DL"; mkdir -p fonts
LATIN="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
LATINEXT="U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
: > fonts/fonts.css
fetch() { # id family version weights...
  local id=$1 fam=$2 v=$3; shift 3
  mkdir -p "$DL/$id"; curl -sfL "https://registry.npmjs.org/@fontsource/$id/-/$id-$v.tgz" | tar xz -C "$DL/$id"
  for w in "$@"; do for st in normal italic; do for sub in latin latin-ext; do
    f="$id-$sub-$w-$st.woff2"; [ -f "$DL/$id/package/files/$f" ] || continue
    cp "$DL/$id/package/files/$f" fonts/
    ur=$([ $sub = latin ] && echo "$LATIN" || echo "$LATINEXT")
    echo "@font-face{font-family:'$fam';font-style:$st;font-weight:$w;font-display:swap;src:url(/__gfonts/files/$f) format('woff2');unicode-range:$ur}" >> fonts/fonts.css
  done; done; done
}
fetch lato Lato 5.3.0 300 400 700 900
fetch open-sans "Open Sans" 5.3.0 300 400 600 700 800
fetch roboto Roboto 5.3.0 300 400 500
rm -rf "$DL"

# Monaco editor (the bundle's @monaco-editor/loader pulls monaco-editor@0.33.0/min/vs from cdn.jsdelivr.net)
MDL="${TMPDIR:-/tmp}/fc-monaco-dl"; rm -rf "$MDL" monaco; mkdir -p "$MDL" monaco
curl -sfL "https://registry.npmjs.org/monaco-editor/-/monaco-editor-0.33.0.tgz" | tar xz -C "$MDL"
mv "$MDL/package/min" monaco/min
rm -rf "$MDL"
