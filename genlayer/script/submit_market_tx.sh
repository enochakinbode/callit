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

usage() {
  cat <<'USAGE'
Submit a Callit market using GenLayer CLI.

Usage:
  bash genlayer/script/submit_market_tx.sh \
    --ca <contract_address> \
    --statement "<market statement>" \
    --cutoff-iso "<ISO datetime>" \
    --funding-deadline-iso "<ISO datetime>" \
    [--supplemental-sources-json '["https://source1.com","https://source2.com"]'] \
    [--rpc-url <rpc_url>]

Required:
  --ca                     Deployed GenLayer contract address
  --statement              Market statement (YES-side claim)
  --cutoff-iso             ISO timestamp for market cutoff (must be after funding deadline)
  --funding-deadline-iso   ISO timestamp for funding deadline (must be in the future)

Optional:
  --supplemental-sources-json  JSON array of URLs/source strings (default: [])
  --rpc-url, --rpc              RPC URL override. If omitted, uses your active GenLayer CLI network config.

Example:
  bash genlayer/script/submit_market_tx.sh \
    --ca 0xC0e1cDF15dA2AD5880e8D73C14FF84C510eF293f \
    --statement "Will BTC close above 120000 USD on 2026-12-31?" \
    --cutoff-iso "2026-12-31T23:59:59Z" \
    --funding-deadline-iso "2026-12-20T23:59:59Z" \
    --supplemental-sources-json '["https://www.coindesk.com"]'
USAGE
}

load_env_if_present "$GENLAYER_DIR/.env"
load_env_if_present "$ROOT_DIR/.env"
load_env_if_present "$ROOT_DIR/base/.env"

CA=""
STATEMENT=""
CUTOFF_ISO=""
FUNDING_DEADLINE_ISO=""
SUPPLEMENTAL_SOURCES_JSON="[]"
RPC_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ca)
      CA="${2:-}"
      shift 2
      ;;
    --statement)
      STATEMENT="${2:-}"
      shift 2
      ;;
    --cutoff-iso)
      CUTOFF_ISO="${2:-}"
      shift 2
      ;;
    --funding-deadline-iso)
      FUNDING_DEADLINE_ISO="${2:-}"
      shift 2
      ;;
    --supplemental-sources-json)
      SUPPLEMENTAL_SOURCES_JSON="${2:-}"
      shift 2
      ;;
    --rpc-url|--rpc)
      RPC_URL="${2:-}"
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

if [[ -z "$CA" || -z "$STATEMENT" || -z "$CUTOFF_ISO" || -z "$FUNDING_DEADLINE_ISO" ]]; then
  echo "Missing required arguments." >&2
  usage
  exit 1
fi

if [[ ! "$CA" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
  echo "Invalid contract address format for --ca: $CA" >&2
  exit 1
fi

if ! command -v genlayer >/dev/null 2>&1; then
  echo "GenLayer CLI not found. Install it before running this script." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to build the JSON payload." >&2
  exit 1
fi

SUPPLEMENTAL_SOURCES_JSON_NORMALIZED="$({
  node -e 'const value = JSON.parse(process.argv[1]); if (!Array.isArray(value)) throw new Error("supplemental sources must be a JSON array"); console.log(JSON.stringify(value));' "$SUPPLEMENTAL_SOURCES_JSON"
} 2>/dev/null)" || {
  echo "Invalid --supplemental-sources-json. Provide a JSON array string, e.g. '[\"https://example.com\"]'." >&2
  exit 1
}

MARKET_PAYLOAD="$(node -e '
const [statement, cutoffIso, fundingDeadlineIso, supplementalSourcesJson] = process.argv.slice(1);
const payload = {
  statement,
  cutoff_iso: cutoffIso,
  funding_deadline_iso: fundingDeadlineIso,
  supplemental_sources: JSON.parse(supplementalSourcesJson),
};
console.log(JSON.stringify(payload));
' "$STATEMENT" "$CUTOFF_ISO" "$FUNDING_DEADLINE_ISO" "$SUPPLEMENTAL_SOURCES_JSON_NORMALIZED")"

echo "Submitting market transaction..."
WRITE_OUTPUT=""
WRITE_CMD=(genlayer write "$CA" submit_market --args "$MARKET_PAYLOAD")
if [[ -n "$RPC_URL" ]]; then
  WRITE_CMD+=(--rpc "$RPC_URL")
  echo "Using RPC override: $RPC_URL"
else
  echo "Using CLI network configuration."
fi

if ! WRITE_OUTPUT="$("${WRITE_CMD[@]}" 2>&1)"; then
  echo "$WRITE_OUTPUT" >&2
  exit 1
fi

echo "$WRITE_OUTPUT"

TX_HASH=""
if command -v rg >/dev/null 2>&1; then
  TX_HASH="$(printf '%s\n' "$WRITE_OUTPUT" | rg -o '0x[0-9a-fA-F]{64}' -m 1 || true)"
else
  TX_HASH="$(printf '%s\n' "$WRITE_OUTPUT" | grep -Eo '0x[0-9a-fA-F]{64}' | head -n 1 || true)"
fi

if [[ -z "$TX_HASH" ]]; then
  if [[ -n "$RPC_URL" ]]; then
    echo "Could not detect tx hash in CLI output. If write succeeded, run: genlayer receipt <tx_hash> --rpc \"$RPC_URL\"" >&2
  else
    echo "Could not detect tx hash in CLI output. If write succeeded, run: genlayer receipt <tx_hash>" >&2
  fi
  exit 0
fi

echo "\nWaiting for receipt: $TX_HASH"
RECEIPT_CMD=(genlayer receipt "$TX_HASH")
if [[ -n "$RPC_URL" ]]; then
  RECEIPT_CMD+=(--rpc "$RPC_URL")
fi
"${RECEIPT_CMD[@]}"
