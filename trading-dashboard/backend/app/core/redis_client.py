"""Client Redis — pub/sub temps réel + cache état bot."""

from __future__ import annotations

import json
from typing import Any

import redis.asyncio as redis

from app.core.config import get_settings

CHANNEL_LOGS = "bot:logs"
CHANNEL_STATUS = "bot:status"
CHANNEL_COMMANDS = "bot:commands"
KEY_BOT_STATE = "bot:state"


_pool: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _pool
    if _pool is None:
        _pool = redis.from_url(get_settings().redis_url, decode_responses=True)
    return _pool


async def publish(channel: str, payload: dict[str, Any]) -> None:
    client = await get_redis()
    await client.publish(channel, json.dumps(payload, default=str))


async def set_bot_state(state: dict[str, Any]) -> None:
    client = await get_redis()
    await client.set(KEY_BOT_STATE, json.dumps(state, default=str), ex=300)


async def get_bot_state() -> dict[str, Any] | None:
    client = await get_redis()
    raw = await client.get(KEY_BOT_STATE)
    if not raw:
        return None
    return json.loads(raw)


async def close_redis() -> None:
    global _pool
    if _pool is not None:
        await _pool.aclose()
        _pool = None
