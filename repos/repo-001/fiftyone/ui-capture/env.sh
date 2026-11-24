# Shared environment for seed.py and start.sh
UIC="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export UIC
export MONGO_PORT="${MONGO_PORT:-27118}"
export FIFTYONE_DATABASE_URI="mongodb://127.0.0.1:${MONGO_PORT}"
export FIFTYONE_DATABASE_NAME="fiftyone"
export FIFTYONE_DATABASE_ADMIN=true
export FIFTYONE_DO_NOT_TRACK=true
export FIFTYONE_SHOW_PROGRESS_BARS=false
export FIFTYONE_CONFIG_PATH="$UIC/fo-config.json"
export FIFTYONE_APP_CONFIG_PATH="$UIC/fo-app-config.json"
export FIFTYONE_PLUGINS_DIR="$UIC/fo-plugins"
export FIFTYONE_MODEL_ZOO_DIR="$UIC/fo-home/models"
export FIFTYONE_DATASET_ZOO_DIR="$UIC/fo-home/datasets"
export FIFTYONE_DEFAULT_DATASET_DIR="$UIC/fo-home/default"
export HOME_FO="$UIC/fo-home"
export MPLCONFIGDIR="$UIC/cache/mpl"
export PATH="$UIC/venv/bin:$PATH"
MONGOD="$UIC/venv/lib/python3.11/site-packages/fiftyone/db/bin/mongod"
