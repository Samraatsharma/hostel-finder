#!/usr/bin/env bash
# ========================================
# Start Backend Only (Hostel Finder)
# ========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

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
  echo "[ERROR] Java Runtime (17+) is required to run the backend." >&2
  exit 1
fi

# Detect whether MySQL is running on port 3306
PROFILE_ARG=""
if [ "$1" = "--mysql" ]; then
  echo "Using MySQL database as requested."
elif [ "$1" = "--h2" ]; then
  echo "Using embedded H2 database as requested."
  PROFILE_ARG="-Dspring-boot.run.profiles=h2"
elif nc -z 127.0.0.1 3306 2>/dev/null || (echo > /dev/tcp/127.0.0.1/3306) 2>/dev/null; then
  echo "✓ Detected MySQL server on port 3306. Starting with MySQL profile..."
else
  echo "ℹ MySQL not detected on port 3306. Starting with embedded H2 database (in-memory with demo seed data)..."
  PROFILE_ARG="-Dspring-boot.run.profiles=h2"
fi

cd "$BACKEND_DIR"
echo "Starting Spring Boot application on http://localhost:8080..."
exec ./mvnw spring-boot:run $PROFILE_ARG "$@"

