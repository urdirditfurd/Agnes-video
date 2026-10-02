"""Routes REST API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_access_token, require_auth, verify_admin_password
from app.core.config import get_settings
from app.core.database import SessionLocal, get_db
from app.core.redis_client import CHANNEL_COMMANDS, get_bot_state, get_redis, publish
from app.models import BotStatus
from app.schemas import (
    BotCommand,
    BotStatusOut,
    CredentialsCreate,
    CredentialsStatus,
    HealthResponse,
    LoginRequest,
    LogOut,
    PositionOut,
    SettingsResponse,
    SettingsUpdate,
    TokenResponse,
    TradeOut,
    TradeStats,
)
from app.services.exchange import build_exchange, fetch_ohlcv_df
from app.services.trading import (
    compute_stats,
    credentials_status,
    get_open_trade,
    get_or_create_settings,
    list_logs,
    list_trades,
    set_bot_status,
    update_settings,
    upsert_credentials,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Healthcheck Docker — ne doit pas lever 500 si DB/Redis dégradés."""
    db_ok = "ok"
    redis_ok = "ok"
    try:
        async with SessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        db_ok = "error"
    try:
        client = await get_redis()
        if await client.ping() is not True:
            redis_ok = "error"
    except Exception:  # noqa: BLE001
        redis_ok = "error"

    # Healthy tant que le process API répond (DB/Redis reportés à part)
    return HealthResponse(
        status="ok" if db_ok == "ok" and redis_ok == "ok" else "degraded",
        service="backend",
        role=get_settings().app_role,
        db=db_ok,
        redis=redis_ok,
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(body: LoginRequest) -> TokenResponse:
    if not verify_admin_password(body.password):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return TokenResponse(access_token=create_access_token())


@router.get("/settings", response_model=SettingsResponse)
async def read_settings(
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> SettingsResponse:
    row = await get_or_create_settings(db)
    return SettingsResponse.model_validate(row)


@router.put("/settings", response_model=SettingsResponse)
async def put_settings(
    body: SettingsUpdate,
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> SettingsResponse:
    row = await update_settings(db, body)
    return SettingsResponse.model_validate(row)


@router.post("/bot/command")
async def bot_command(
    body: BotCommand,
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    action = body.action
    if action == "start":
        await set_bot_status(db, BotStatus.RUNNING)
    elif action == "pause":
        await set_bot_status(db, BotStatus.PAUSED)
    elif action == "stop":
        await set_bot_status(db, BotStatus.STOPPED)
    elif action == "close_position":
        await publish(CHANNEL_COMMANDS, {"action": "close_position"})
    else:
        # Exhaustive pour l'union validée
        raise HTTPException(status_code=400, detail=f"Action inconnue: {action}")
    return {"status": "ok", "action": action}


@router.get("/bot/status", response_model=BotStatusOut)
async def bot_status(
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> BotStatusOut:
    settings = await get_or_create_settings(db)
    stats = await compute_stats(db)
    state = await get_bot_state() or {}
    position_raw = state.get("position") or {}
    open_trade = await get_open_trade(db)

    if open_trade and not position_raw.get("open"):
        position = PositionOut(
            open=True,
            symbol=open_trade.symbol,
            entry_price=open_trade.entry_price,
            stop_loss=open_trade.stop_loss,
            take_profit=open_trade.take_profit,
            quantity=open_trade.quantity,
            size_usd=open_trade.size_usd,
        )
    else:
        position = PositionOut(**position_raw) if position_raw else PositionOut(open=False)

    return BotStatusOut(
        status=settings.bot_status,
        position=position,
        stats=stats,
        last_rsi=state.get("last_rsi"),
        last_bb_lower=state.get("last_bb_lower"),
        last_price=state.get("last_price"),
    )


@router.get("/trades", response_model=list[TradeOut])
async def trades(
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> list[TradeOut]:
    rows = await list_trades(db)
    return [TradeOut.model_validate(r) for r in rows]


@router.get("/trades/stats", response_model=TradeStats)
async def trades_stats(
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> TradeStats:
    return await compute_stats(db)


@router.get("/logs", response_model=list[LogOut])
async def logs(
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> list[LogOut]:
    rows = await list_logs(db)
    return [LogOut.model_validate(r) for r in rows]


@router.get("/credentials", response_model=CredentialsStatus)
async def get_credentials(
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> CredentialsStatus:
    return CredentialsStatus(**await credentials_status(db))


@router.put("/credentials", response_model=CredentialsStatus)
async def put_credentials(
    body: CredentialsCreate,
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> CredentialsStatus:
    row = await upsert_credentials(
        db,
        api_key=body.api_key,
        api_secret=body.api_secret,
        is_testnet=body.is_testnet,
        label=body.label,
    )
    return CredentialsStatus(
        configured=True,
        label=row.label,
        is_testnet=row.is_testnet,
        updated_at=row.updated_at,
    )


@router.get("/market/ohlcv")
async def market_ohlcv(
    symbol: str = "BTC/USDT",
    timeframe: str = "15m",
    limit: int = 100,
    _: str = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, float | int]]:
    # OHLCV public via ccxt (pas de clés requises)
    exchange = build_exchange()
    try:
        rows = await fetch_ohlcv_df(exchange, symbol, timeframe, limit=min(limit, 500))
        return [
            {
                "time": int(r[0] // 1000),
                "open": float(r[1]),
                "high": float(r[2]),
                "low": float(r[3]),
                "close": float(r[4]),
                "volume": float(r[5]),
            }
            for r in rows
        ]
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"OHLCV indisponible: {exc}") from exc
    finally:
        await exchange.close()
