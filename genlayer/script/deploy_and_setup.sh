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

usage() {
  cat <<'USAGE'
Deploy Callit GenLayer contracts.

Usage:
  bash genlayer/script/deploy_and_setup.sh [--rpc-url <rpc_url>] [--contract <contract_path>]

Optional:
  --rpc-url, --rpc    RPC URL override. If omitted, uses your active GenLayer CLI network config.
  --contract           Deploy a specific contract file instead of running deploy scripts.
USAGE
}

RPC_URL=""
CONTRACT_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rpc-url|--rpc)
      RPC_URL="${2:-}"
      shift 2
      ;;
    --contract)
      CONTRACT_PATH="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

cd "$GENLAYER_DIR"

DEPLOY_CMD=(genlayer deploy)
if [[ -n "$CONTRACT_PATH" ]]; then
  DEPLOY_CMD+=(--contract "$CONTRACT_PATH")
fi
if [[ -n "$RPC_URL" ]]; then
  DEPLOY_CMD+=(--rpc "$RPC_URL")
  echo "Deploying with RPC override: $RPC_URL"
else
  echo "Deploying with CLI network configuration."
fi

"${DEPLOY_CMD[@]}"
