"""Services métier : settings, credentials, trades, stats."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis_client import publish
from app.core.security import get_secret_box
from app.models import (
    ApiCredential,
    BotLog,
    BotStatus,
    LogLevel,
    SettingsRow,
    Trade,
    TradeStatus,
)
from app.schemas import SettingsUpdate, TradeStats


async def get_or_create_settings(session: AsyncSession) -> SettingsRow:
    row = await session.get(SettingsRow, 1)
    if row is None:
        row = SettingsRow(id=1)
        session.add(row)
        await session.commit()
        await session.refresh(row)
    return row


async def update_settings(session: AsyncSession, payload: SettingsUpdate) -> SettingsRow:
    row = await get_or_create_settings(session)
    data = payload.model_dump(exclude_none=True)
    for key, value in data.items():
        setattr(row, key, value)
    await session.commit()
    await session.refresh(row)
    await publish("bot:status", {"type": "settings_updated", "settings_id": row.id})
    return row


async def set_bot_status(session: AsyncSession, status: BotStatus) -> SettingsRow:
    row = await get_or_create_settings(session)
    row.bot_status = status
    await session.commit()
    await session.refresh(row)
    await publish("bot:status", {"type": "status", "bot_status": status.value})
    return row


async def upsert_credentials(
    session: AsyncSession,
    *,
    api_key: str,
    api_secret: str,
    is_testnet: bool,
    label: str = "binance",
) -> ApiCredential:
    box = get_secret_box()
    result = await session.execute(select(ApiCredential).where(ApiCredential.label == label))
    row = result.scalar_one_or_none()
    if row is None:
        row = ApiCredential(
            label=label,
            api_key_encrypted=box.encrypt(api_key),
            api_secret_encrypted=box.encrypt(api_secret),
            is_testnet=is_testnet,
        )
        session.add(row)
    else:
        row.api_key_encrypted = box.encrypt(api_key)
        row.api_secret_encrypted = box.encrypt(api_secret)
        row.is_testnet = is_testnet
    await session.commit()
    await session.refresh(row)
    return row


async def get_decrypted_credentials(
    session: AsyncSession,
    label: str = "binance",
) -> tuple[str, str, bool] | None:
    result = await session.execute(select(ApiCredential).where(ApiCredential.label == label))
    row = result.scalar_one_or_none()
    if row is None:
        return None
    box = get_secret_box()
    return box.decrypt(row.api_key_encrypted), box.decrypt(row.api_secret_encrypted), row.is_testnet


async def credentials_status(session: AsyncSession, label: str = "binance") -> dict[str, Any]:
    result = await session.execute(select(ApiCredential).where(ApiCredential.label == label))
    row = result.scalar_one_or_none()
    if row is None:
        return {"configured": False, "label": None, "is_testnet": None, "updated_at": None}
    return {
        "configured": True,
        "label": row.label,
        "is_testnet": row.is_testnet,
        "updated_at": row.updated_at,
    }


async def get_open_trade(session: AsyncSession) -> Trade | None:
    result = await session.execute(
        select(Trade).where(Trade.status == TradeStatus.OPEN).order_by(Trade.opened_at.desc())
    )
    return result.scalars().first()


async def list_trades(session: AsyncSession, limit: int = 100) -> list[Trade]:
    result = await session.execute(
        select(Trade).order_by(Trade.opened_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def compute_stats(session: AsyncSession) -> TradeStats:
    now = datetime.now(UTC)
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    closed_q: Select[tuple[Trade]] = select(Trade).where(Trade.status == TradeStatus.CLOSED)
    closed = list((await session.execute(closed_q)).scalars().all())

    wins = [t for t in closed if (t.pnl_usd or 0) > 0]
    losses = [t for t in closed if (t.pnl_usd or 0) <= 0]
    gross_profit = sum(t.pnl_usd or 0 for t in wins)
    gross_loss = abs(sum(t.pnl_usd or 0 for t in losses))
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 0.0)
    winrate = (len(wins) / len(closed) * 100.0) if closed else 0.0

    async def pnl_since(since: datetime) -> float:
        q = await session.execute(
            select(func.coalesce(func.sum(Trade.pnl_usd), 0.0)).where(
                Trade.status == TradeStatus.CLOSED,
                Trade.closed_at >= since,
            )
        )
        return float(q.scalar_one())

    pnl_total_q = await session.execute(
        select(func.coalesce(func.sum(Trade.pnl_usd), 0.0)).where(Trade.status == TradeStatus.CLOSED)
    )

    return TradeStats(
        total_trades=len(closed),
        wins=len(wins),
        losses=len(losses),
        winrate=round(winrate, 2),
        profit_factor=round(float(profit_factor), 2),
        pnl_day=round(await pnl_since(day_ago), 2),
        pnl_week=round(await pnl_since(week_ago), 2),
        pnl_total=round(float(pnl_total_q.scalar_one()), 2),
    )


async def append_log(
    session: AsyncSession,
    message: str,
    level: LogLevel = LogLevel.INFO,
    context: dict[str, Any] | None = None,
) -> BotLog:
    row = BotLog(level=level, message=message, context=context)
    session.add(row)
    await session.commit()
    await session.refresh(row)
    await publish(
        "bot:logs",
        {
            "id": row.id,
            "level": row.level.value,
            "message": row.message,
            "context": row.context,
            "created_at": row.created_at.isoformat(),
        },
    )
    return row


async def list_logs(session: AsyncSession, limit: int = 200) -> list[BotLog]:
    result = await session.execute(
        select(BotLog).order_by(BotLog.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())
