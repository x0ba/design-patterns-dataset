#!/usr/bin/env bash
# Starts MongoDB (bundled fiftyone-db mongod) and the FiftyOne App server on $PORT.
set -euo pipefail
cd "$(dirname "$0")"
source ./env.sh
PORT="${PORT:-4413}"
mkdir -p data/db logs

"$MONGOD" --dbpath "$UIC/data/db" --port "$MONGO_PORT" --bind_ip 127.0.0.1 \
  --nounixsocket --logpath "$UIC/logs/mongod.log" &
MPID=$!
cleanup() {
  python -c "
import pymongo
try: pymongo.MongoClient('$FIFTYONE_DATABASE_URI', serverSelectionTimeoutMS=2000).admin.command('shutdown')
except Exception: pass" >/dev/null 2>&1 || true
  kill ${SPID:-} 2>/dev/null || true
  kill $MPID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# wait for mongod
for i in $(seq 1 60); do
  python -c "
import pymongo,sys
pymongo.MongoClient('$FIFTYONE_DATABASE_URI', serverSelectionTimeoutMS=500).admin.command('ping')" >/dev/null 2>&1 && break
  sleep 0.5
done

# Seed on first run (database empty)
if ! python -c "import fiftyone as fo, sys; sys.exit(0 if fo.list_datasets() else 1)" 2>/dev/null; then
  echo "Seeding datasets..."
  python seed.py
fi

python -m fiftyone.server.main --port "$PORT" --address 127.0.0.1 &
SPID=$!
wait $SPID
