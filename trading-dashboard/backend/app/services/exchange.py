"""Accès exchange via ccxt (Binance spot / testnet)."""

from __future__ import annotations

from typing import Any

import ccxt.async_support as ccxt

from app.core.config import get_settings


def build_exchange(
    api_key: str | None = None,
    api_secret: str | None = None,
    testnet: bool | None = None,
) -> ccxt.binance:
    settings = get_settings()
    use_testnet = settings.binance_testnet if testnet is None else testnet
    exchange = ccxt.binance(
        {
            "apiKey": api_key or "",
            "secret": api_secret or "",
            "enableRateLimit": True,
            "options": {"defaultType": "spot"},
        }
    )
    if use_testnet:
        exchange.set_sandbox_mode(True)
    return exchange


async def fetch_ohlcv_df(
    exchange: ccxt.binance,
    symbol: str,
    timeframe: str,
    limit: int = 100,
) -> list[list[Any]]:
    return await exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)


async def fetch_ticker_price(exchange: ccxt.binance, symbol: str) -> float:
    ticker = await exchange.fetch_ticker(symbol)
    last = ticker.get("last")
    if last is None:
        raise RuntimeError(f"Prix indisponible pour {symbol}")
    return float(last)
