#!/usr/bin/env bash
#
# VPS cron wrapper for NSE daily ingestion.
#
# Pulls latest code, reinstalls deps when package-lock.json changes, then runs
# scripts/ingest-today.js with the requested mode. All output (stdout+stderr)
# is appended to ~/nse-ingest-logs/<date>-<mode>.log so cron failures are
# debuggable after the fact.
#
# Usage:   cron-ingest.sh <live|bhav|all>
#
# Crontab example (15:45 IST live, 20:00 IST bhav, Mon-Fri):
#   CRON_TZ=Asia/Kolkata
#   45 15 * * 1-5 /home/<user>/Share-market-data/backend/scripts/cron-ingest.sh live
#   0  20 * * 1-5 /home/<user>/Share-market-data/backend/scripts/cron-ingest.sh bhav
#
# Secrets (DATABASE_URL etc.) are read from $HOME/.nse-ingest.env if present.

set -euo pipefail

MODE="${1:-all}"
case "$MODE" in
  live|bhav|all) ;;
  *) echo "Usage: $0 <live|bhav|all>" >&2; exit 2 ;;
esac

# Resolve repo root from this script's location: <repo>/backend/scripts/cron-ingest.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(dirname "$BACKEND_DIR")"

LOG_DIR="$HOME/nse-ingest-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d)-${MODE}.log"

exec >> "$LOG_FILE" 2>&1

echo
echo "=== $(date -Is) cron-ingest mode=${MODE} ==="

# Load DB creds from a file outside the repo so they never get committed.
if [ -f "$HOME/.nse-ingest.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$HOME/.nse-ingest.env"
  set +a
fi

# Make sure node/npm/git are on PATH — cron has a minimal environment.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

cd "$REPO_DIR"

echo "-> git pull --ff-only"
git fetch --quiet origin
BEFORE="$(git rev-parse HEAD)"
git pull --ff-only --quiet
AFTER="$(git rev-parse HEAD)"
echo "   HEAD ${BEFORE:0:7} -> ${AFTER:0:7}"

cd "$BACKEND_DIR"

# Only reinstall when the lockfile actually changed (or node_modules is missing).
LOCK_STAMP="$BACKEND_DIR/node_modules/.cron-ingest.lockstamp"
LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
if [ ! -d node_modules ] || [ ! -f "$LOCK_STAMP" ] || [ "$(cat "$LOCK_STAMP")" != "$LOCK_HASH" ]; then
  echo "-> npm ci --omit=dev"
  npm ci --omit=dev
  echo "$LOCK_HASH" > "$LOCK_STAMP"
else
  echo "-> deps unchanged, skipping npm ci"
fi

echo "-> node scripts/ingest-today.js (INGEST_MODE=${MODE})"
INGEST_MODE="$MODE" node scripts/ingest-today.js
EXIT=$?

echo "=== $(date -Is) exit ${EXIT} ==="
exit "$EXIT"
