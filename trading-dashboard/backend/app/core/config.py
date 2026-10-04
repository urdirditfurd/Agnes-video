"""Configuration applicative (variables d'environnement uniquement)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_role: str = Field(default="api", alias="APP_ROLE")
    database_url: str = Field(
        default="postgresql+asyncpg://trading:trading@postgres:5432/trading_bot",
        alias="DATABASE_URL",
    )
    # Sync URL pour Alembic
    database_url_sync: str | None = Field(default=None, alias="DATABASE_URL_SYNC")
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")
    fernet_key: str = Field(alias="FERNET_KEY")
    secret_key: str = Field(alias="SECRET_KEY")
    admin_password: str = Field(default="changeme", alias="ADMIN_PASSWORD")
    jwt_expire_minutes: int = Field(default=1440, alias="JWT_EXPIRE_MINUTES")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    binance_testnet: bool = Field(default=True, alias="BINANCE_TESTNET")

    default_symbol: str = Field(default="BTC/USDT", alias="DEFAULT_SYMBOL")
    default_timeframe: str = Field(default="15m", alias="DEFAULT_TIMEFRAME")
    default_trade_size_usd: float = Field(default=200.0, alias="DEFAULT_TRADE_SIZE_USD")
    default_rsi_period: int = Field(default=14, alias="DEFAULT_RSI_PERIOD")
    default_rsi_threshold: float = Field(default=30.0, alias="DEFAULT_RSI_THRESHOLD")
    default_bb_period: int = Field(default=20, alias="DEFAULT_BB_PERIOD")
    default_bb_std: float = Field(default=2.0, alias="DEFAULT_BB_STD")
    default_stop_loss_pct: float = Field(default=2.0, alias="DEFAULT_STOP_LOSS_PCT")
    default_take_profit_pct: float = Field(default=5.0, alias="DEFAULT_TAKE_PROFIT_PCT")

    @property
    def sync_database_url(self) -> str:
        if self.database_url_sync:
            return self.database_url_sync
        return self.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
