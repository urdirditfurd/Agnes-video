"""Schemas Pydantic — API request/response."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.models import BotStatus, LogLevel, TradeSide, TradeStatus


class HealthResponse(BaseModel):
    status: str
    service: str
    role: str
    db: str = "unknown"
    redis: str = "unknown"


class SettingsUpdate(BaseModel):
    trade_size_usd: float | None = Field(default=None, gt=0)
    rsi_period: int | None = Field(default=None, ge=2, le=100)
    rsi_threshold: float | None = Field(default=None, gt=0, lt=100)
    bb_period: int | None = Field(default=None, ge=5, le=200)
    bb_std: float | None = Field(default=None, gt=0, le=5)
    stop_loss_pct: float | None = Field(default=None, gt=0, le=50)
    take_profit_pct: float | None = Field(default=None, gt=0, le=100)
    symbol: str | None = None
    timeframe: str | None = None


class SettingsResponse(BaseModel):
    bot_status: BotStatus
    symbol: str
    timeframe: str
    trade_size_usd: float
    rsi_period: int
    rsi_threshold: float
    bb_period: int
    bb_std: float
    stop_loss_pct: float
    take_profit_pct: float
    updated_at: datetime

    model_config = {"from_attributes": True}


class BotCommand(BaseModel):
    action: str

    @field_validator("action")
    @classmethod
    def validate_action(cls, value: str) -> str:
        allowed = {"start", "stop", "pause", "close_position"}
        normalized = value.strip().lower()
        if normalized not in allowed:
            raise ValueError(f"action must be one of {sorted(allowed)}")
        return normalized


class CredentialsCreate(BaseModel):
    api_key: str = Field(min_length=8)
    api_secret: str = Field(min_length=8)
    is_testnet: bool = True
    label: str = "binance"


class CredentialsStatus(BaseModel):
    configured: bool
    label: str | None = None
    is_testnet: bool | None = None
    updated_at: datetime | None = None
    # Jamais de clés en clair dans la réponse


class TradeOut(BaseModel):
    id: int
    symbol: str
    side: TradeSide
    status: TradeStatus
    entry_price: float
    exit_price: float | None
    quantity: float
    size_usd: float
    stop_loss: float
    take_profit: float
    pnl_usd: float | None
    pnl_pct: float | None
    reason: str | None
    opened_at: datetime
    closed_at: datetime | None

    model_config = {"from_attributes": True}


class TradeStats(BaseModel):
    total_trades: int
    wins: int
    losses: int
    winrate: float
    profit_factor: float
    pnl_day: float
    pnl_week: float
    pnl_total: float


class PositionOut(BaseModel):
    open: bool
    symbol: str | None = None
    entry_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    quantity: float | None = None
    size_usd: float | None = None
    floating_pnl_usd: float | None = None
    floating_pnl_pct: float | None = None
    mark_price: float | None = None


class BotStatusOut(BaseModel):
    status: BotStatus
    position: PositionOut
    stats: TradeStats
    last_rsi: float | None = None
    last_bb_lower: float | None = None
    last_price: float | None = None


class LogOut(BaseModel):
    id: int
    level: LogLevel
    message: str
    context: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
