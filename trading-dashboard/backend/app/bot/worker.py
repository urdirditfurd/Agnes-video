"""
Worker bot — stub étape 2.
Boucle de trading réelle à l'étape 4.
"""

from __future__ import annotations

import logging
import pathlib
import signal
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("bot.worker")

_running = True


def _handle_signal(signum: int, _frame: object) -> None:
    global _running
    logger.info("Signal %s reçu — arrêt gracieux", signum)
    _running = False


def main() -> None:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    health = pathlib.Path("/tmp/bot_healthy")
    health.write_text("1", encoding="utf-8")
    logger.info("Bot worker stub démarré (en attente du code étape 4)")

    while _running:
        # Heartbeat healthcheck
        health.write_text(str(int(time.time())), encoding="utf-8")
        time.sleep(10)

    health.unlink(missing_ok=True)
    logger.info("Bot worker stub arrêté")


if __name__ == "__main__":
    main()
