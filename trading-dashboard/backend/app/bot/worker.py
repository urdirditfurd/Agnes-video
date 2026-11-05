"""
Worker bot 24/7 — boucle background (container APP_ROLE=bot).

- Lit settings DB à chaque cycle (config à chaud depuis le dashboard)
- Heartbeat /tmp/bot_healthy pour Docker healthcheck.py
- Pub/sub Redis pour status temps réel
- Écoute commandes Redis (close_position)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import pathlib
import signal
import time

from app.bot.engine import TradingEngine
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.core.redis_client import (
    CHANNEL_COMMANDS,
    close_redis,
    get_redis,
    publish,
    set_bot_state,
)
from app.models import LogLevel
from app.services.trading import append_log, get_or_create_settings

logging.basicConfig(
    level=getattr(logging, get_settings().log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("bot.worker")

HEALTH_FILE = pathlib.Path(os.getenv("BOT_HEALTH_FILE", "/tmp/bot_healthy"))
LOOP_INTERVAL_SEC = float(os.getenv("BOT_LOOP_INTERVAL_SEC", "15"))


class BotWorker:
    def __init__(self) -> None:
        self._running = True
        self.engine = TradingEngine()

    def stop(self) -> None:
        self._running = False

    def write_heartbeat(self) -> None:
        HEALTH_FILE.write_text(str(time.time()), encoding="utf-8")

    async def listen_commands(self) -> None:
        client = await get_redis()
        pubsub = client.pubsub()
        await pubsub.subscribe(CHANNEL_COMMANDS)
        try:
            while self._running:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message.get("type") == "message":
                    try:
                        payload = json.loads(message["data"])
                    except (TypeError, json.JSONDecodeError):
                        continue
                    action = str(payload.get("action", "")).lower()
                    if action == "close_position":
                        logger.info("Commande close_position reçue")
                        self.engine.request_close_position()
                await asyncio.sleep(0.05)
        finally:
            await pubsub.unsubscribe(CHANNEL_COMMANDS)
            await pubsub.aclose()

    async def run(self) -> None:
        self.write_heartbeat()
        logger.info("Bot worker démarré (interval=%ss)", LOOP_INTERVAL_SEC)

        async with SessionLocal() as session:
            await append_log(session, "Bot worker started", LogLevel.INFO)

        cmd_task = asyncio.create_task(self.listen_commands(), name="redis-commands")

        try:
            while self._running:
                self.write_heartbeat()
                try:
                    async with SessionLocal() as session:
                        settings = await get_or_create_settings(session)
                        snapshot = await self.engine.tick(session, settings)
                        await set_bot_state(snapshot)
                        await publish("bot:status", {"type": "tick", **snapshot})
                except Exception as exc:  # noqa: BLE001
                    logger.exception("Cycle bot en erreur: %s", exc)
                    try:
                        async with SessionLocal() as session:
                            await append_log(session, f"Bot cycle error: {exc}", LogLevel.ERROR)
                    except Exception:  # noqa: BLE001
                        logger.exception("Impossible de persister le log d'erreur")

                # Sleep interruptible
                for _ in range(int(LOOP_INTERVAL_SEC * 10)):
                    if not self._running:
                        break
                    await asyncio.sleep(0.1)
        finally:
            cmd_task.cancel()
            try:
                await cmd_task
            except asyncio.CancelledError:
                pass
            HEALTH_FILE.unlink(missing_ok=True)
            await close_redis()
            logger.info("Bot worker arrêté")


def main() -> None:
    worker = BotWorker()

    def _handle(signum: int, _frame: object) -> None:
        logger.info("Signal %s — arrêt gracieux", signum)
        worker.stop()

    signal.signal(signal.SIGTERM, _handle)
    signal.signal(signal.SIGINT, _handle)

    asyncio.run(worker.run())


if __name__ == "__main__":
    main()
