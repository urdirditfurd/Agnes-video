#!/usr/bin/env python3
"""
Healthcheck unifié backend / bot (Docker HEALTHCHECK).

APP_ROLE=api  → GET /api/health
APP_ROLE=bot  → heartbeat /tmp/bot_healthy (âge max configurable)

Exit 0 = healthy, exit 1 = unhealthy (Docker redémarre via restart policy).
"""

from __future__ import annotations

import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

BOT_HEALTH_FILE = Path(os.getenv("BOT_HEALTH_FILE", "/tmp/bot_healthy"))
BOT_HEARTBEAT_MAX_AGE_SEC = int(os.getenv("BOT_HEARTBEAT_MAX_AGE_SEC", "90"))
API_HEALTH_URL = os.getenv("HEALTHCHECK_URL", "http://127.0.0.1:8000/api/health")
HTTP_TIMEOUT_SEC = float(os.getenv("HEALTHCHECK_HTTP_TIMEOUT", "8"))


def check_api() -> int:
    try:
        with urllib.request.urlopen(API_HEALTH_URL, timeout=HTTP_TIMEOUT_SEC) as response:
            if response.status != 200:
                print(f"api unhealthy: status={response.status}", file=sys.stderr)
                return 1
        return 0
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"api unhealthy: {exc}", file=sys.stderr)
        return 1


def check_bot() -> int:
    if not BOT_HEALTH_FILE.exists():
        print(f"bot unhealthy: missing {BOT_HEALTH_FILE}", file=sys.stderr)
        return 1

    raw = BOT_HEALTH_FILE.read_text(encoding="utf-8").strip()
    now = time.time()

    try:
        heartbeat_ts = float(raw)
        age = now - heartbeat_ts
    except ValueError:
        # Fallback: mtime du fichier si contenu non numérique
        age = now - BOT_HEALTH_FILE.stat().st_mtime

    if age > BOT_HEARTBEAT_MAX_AGE_SEC:
        print(
            f"bot unhealthy: stale heartbeat age={age:.0f}s "
            f"(max={BOT_HEARTBEAT_MAX_AGE_SEC}s)",
            file=sys.stderr,
        )
        return 1

    return 0


def main() -> int:
    role = os.getenv("APP_ROLE", "api").strip().lower()
    if role == "bot":
        return check_bot()
    if role in {"api", "migrate"}:
        # migrate n'a pas de serveur HTTP longue durée ; traité comme api si appelé
        return check_api() if role == "api" else 0
    print(f"unknown APP_ROLE={role!r}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
