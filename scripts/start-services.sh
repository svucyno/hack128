#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ML_DIR="$ROOT_DIR/ml-service"
SERVER_DIR="$ROOT_DIR/levelup/server"
ML_VENV="$ML_DIR/.venv"

ml_pid=""
server_pid=""

cleanup() {
  if [[ -n "$ml_pid" ]] && kill -0 "$ml_pid" 2>/dev/null; then
    kill "$ml_pid" 2>/dev/null || true
  fi

  if [[ -n "$server_pid" ]] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ ! -x "$ML_VENV/bin/python" ]]; then
  echo "Creating ML virtual environment..."
  cd "$ML_DIR"
  python3 -m venv .venv
fi

if ! "$ML_VENV/bin/python" -c "import fastapi, uvicorn" >/dev/null 2>&1; then
  echo "Installing ML dependencies..."
  "$ML_VENV/bin/python" -m pip install -r "$ML_DIR/requirements.txt"
fi

echo "Starting ML service on http://localhost:8000"
(
  cd "$ML_DIR"
  exec "$ML_VENV/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
) &
ml_pid=$!

echo "Starting backend on http://localhost:5050"
(
  cd "$SERVER_DIR"
  exec node index.js
) &
server_pid=$!

echo
echo "Services are starting..."
echo "ML service:  http://localhost:8000"
echo "Backend:     http://localhost:5050"
echo "Health check: curl http://localhost:5050/ml/status"
echo "Press Ctrl+C to stop both services."
echo

wait "$ml_pid" "$server_pid"
