#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GENLAYER_DIR="$ROOT_DIR/genlayer"

load_env_if_present() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

load_env_if_present "$GENLAYER_DIR/.env"
load_env_if_present "$ROOT_DIR/.env"
load_env_if_present "$ROOT_DIR/base/.env"

: "${GENLAYER_RPC_URL:?Set GENLAYER_RPC_URL before running this script.}"

cd "$GENLAYER_DIR"
genlayer deploy --rpc "$GENLAYER_RPC_URL"
