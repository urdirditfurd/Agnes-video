"""WebSocket — stream logs + status bot via Redis pub/sub."""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.redis_client import CHANNEL_LOGS, CHANNEL_STATUS, get_redis

logger = logging.getLogger("ws")
router = APIRouter()


@router.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    client = await get_redis()
    pubsub = client.pubsub()
    await pubsub.subscribe(CHANNEL_LOGS, CHANNEL_STATUS)

    async def relay() -> None:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                channel = message.get("channel")
                data = message.get("data")
                try:
                    payload = json.loads(data) if isinstance(data, str) else data
                except json.JSONDecodeError:
                    payload = {"raw": data}
                await websocket.send_json({"channel": channel, "data": payload})
            else:
                await asyncio.sleep(0.05)

    task = asyncio.create_task(relay())
    try:
        while True:
            # Keepalive / ignore client pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("WS client disconnected")
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        await pubsub.unsubscribe(CHANNEL_LOGS, CHANNEL_STATUS)
        await pubsub.aclose()
