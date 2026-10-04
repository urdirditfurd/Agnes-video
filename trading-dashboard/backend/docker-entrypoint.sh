#!/bin/sh
# Entrypoint backend/bot — bascule selon APP_ROLE
set -eu

ROLE="${APP_ROLE:-api}"

case "$ROLE" in
  api)
    echo "[entrypoint] Running migrations..."
    alembic upgrade head
    echo "[entrypoint] Starting FastAPI (uvicorn)..."
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips='*'
    ;;
  bot)
    echo "[entrypoint] Waiting briefly for API migrations..."
    sleep 5
    echo "[entrypoint] Starting trading bot worker..."
    exec python -m app.bot.worker
    ;;
  migrate)
    echo "[entrypoint] Running Alembic migrations..."
    exec alembic upgrade head
    ;;
  *)
    echo "[entrypoint] Unknown APP_ROLE='$ROLE' (expected: api|bot|migrate)" >&2
    exit 1
    ;;
esac
