"""Tests healthcheck unifié."""

from __future__ import annotations

import os
import time
from pathlib import Path

import healthcheck


def test_bot_healthy_fresh_heartbeat(tmp_path: Path, monkeypatch) -> None:
    health = tmp_path / "bot_healthy"
    health.write_text(str(time.time()), encoding="utf-8")
    monkeypatch.setenv("APP_ROLE", "bot")
    monkeypatch.setenv("BOT_HEALTH_FILE", str(health))
    monkeypatch.setenv("BOT_HEARTBEAT_MAX_AGE_SEC", "90")
    # Rebind module constants
    healthcheck.BOT_HEALTH_FILE = Path(str(health))
    healthcheck.BOT_HEARTBEAT_MAX_AGE_SEC = 90
    assert healthcheck.check_bot() == 0


def test_bot_unhealthy_stale(tmp_path: Path, monkeypatch) -> None:
    health = tmp_path / "bot_healthy"
    health.write_text(str(time.time() - 500), encoding="utf-8")
    healthcheck.BOT_HEALTH_FILE = Path(str(health))
    healthcheck.BOT_HEARTBEAT_MAX_AGE_SEC = 90
    assert healthcheck.check_bot() == 1


def test_bot_unhealthy_missing(tmp_path: Path) -> None:
    healthcheck.BOT_HEALTH_FILE = tmp_path / "missing"
    assert healthcheck.check_bot() == 1
