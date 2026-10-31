#!/usr/bin/env bash
# ========================================
# Start Frontend Only (Hostel Finder)
# ========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "[ERROR] Frontend directory not found at $FRONTEND_DIR" >&2
  exit 1
fi

cd "$FRONTEND_DIR"

PORT="${PORT:-3000}"

echo "========================================"
echo "  Starting Frontend Server on port $PORT"
echo "  http://localhost:$PORT"
echo "========================================"

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then
  exec npx http-server -p "$PORT"
else
  echo "[ERROR] Python 3 or Node.js required to serve frontend." >&2
  exit 1
fi

