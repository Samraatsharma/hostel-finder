#!/usr/bin/env bash
# ========================================
# Hostel Finder - Unified Application Launcher (macOS / Linux)
# Starts Backend & Frontend, opens Browser
# ========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "========================================="
echo "   HOSTEL FINDER - APPLICATION LAUNCHER  "
echo "========================================="

# Ensure Java is available
if [ -z "$JAVA_HOME" ]; then
  if java -version >/dev/null 2>&1; then
    :
  elif [ -d "/Users/samraatsharma/.gemini/antigravity/scratch/jdk-17.0.10+7/Contents/Home" ]; then
    export JAVA_HOME="/Users/samraatsharma/.gemini/antigravity/scratch/jdk-17.0.10+7/Contents/Home"
    export PATH="$JAVA_HOME/bin:$PATH"
  fi
fi

if ! java -version >/dev/null 2>&1; then
  echo "[ERROR] Java Runtime (17+) is required." >&2
  exit 1
fi

# Detect whether MySQL is running
PROFILE_ARG=""
if nc -z 127.0.0.1 3306 2>/dev/null || (echo > /dev/tcp/127.0.0.1/3306) 2>/dev/null; then
  echo "[✓] MySQL detected on port 3306. Using MySQL database."
else
  echo "[ℹ] MySQL not detected on port 3306. Using embedded H2 database (in-memory mode with demo seed data)."
  PROFILE_ARG="-Dspring-boot.run.profiles=h2"
fi

# Check Python for frontend
PYTHON_CMD=""
if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
fi

if [ -z "$PYTHON_CMD" ]; then
  echo "[ERROR] Python 3 is required to run the frontend server." >&2
  exit 1
fi

cleanup() {
  echo ""
  echo "Shutting down servers..."
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  exit 0
}

trap cleanup INT TERM EXIT

# [1/4] Starting Backend
echo ""
echo "[1/4] Starting Backend Server (Spring Boot on port 8080)..."
cd "$BACKEND_DIR"
./mvnw spring-boot:run $PROFILE_ARG >/dev/null 2>&1 &
BACKEND_PID=$!

echo "      Waiting for backend to be ready..."
MAX_WAIT=40
WAITED=0
BACKEND_READY=0

while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s -f http://localhost:8080/api/public/cities >/dev/null 2>&1; then
    BACKEND_READY=1
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  echo -n "."
done
echo ""

if [ $BACKEND_READY -eq 1 ]; then
  echo "[✓] Backend is ready on http://localhost:8080"
else
  echo "[⚠] Backend taking longer than expected. Continuing..."
fi

# [2/4] Starting Frontend
echo ""
echo "[2/4] Starting Frontend Server (port 3000)..."
cd "$FRONTEND_DIR"
$PYTHON_CMD -m http.server 3000 >/dev/null 2>&1 &
FRONTEND_PID=$!
sleep 2

echo "[✓] Frontend is ready on http://localhost:3000"

# [3/4] Opening Browser
echo ""
URL="http://localhost:3000/pages/index.html"
echo "[3/4] Opening $URL in browser..."
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
fi

echo ""
echo "========================================="
echo "  SUCCESS! Hostel Finder is running!     "
echo "========================================="
echo "  Frontend: http://localhost:3000        "
echo "  Backend:  http://localhost:8080        "
echo ""
echo "  Demo Accounts:"
echo "  • Admin:   admin@demo.com   / Demo@123"
echo "  • Owner:   owner@demo.com   / Demo@123"
echo "  • Student: student@demo.com / Demo@123"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "========================================="

# Keep running until user stops
wait $BACKEND_PID $FRONTEND_PID

