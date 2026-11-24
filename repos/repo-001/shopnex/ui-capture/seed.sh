#!/usr/bin/env bash
# Seeds the embedded database in .ui-capture/data (idempotent: skips when accounts exist).
set -euo pipefail
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
export NODE_ENV=development
cd "$UI_DIR"
mkdir -p "$UI_DATA_DIR/files"
exec node --import tsx seed/seed.ts
