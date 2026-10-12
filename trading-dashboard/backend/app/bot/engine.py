"""
Moteur de trading — stratégie BTC/USDT :
  Entrée : RSI(14) < seuil ET close <= bande de Bollinger inférieure (15m)
  Taille : trade_size_usd | SL % | TP %
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BotStatus, LogLevel, SettingsRow, Trade, TradeSide, TradeStatus
from app.services.exchange import build_exchange, fetch_ohlcv_df, fetch_ticker_price
from app.services.indicators import compute_bollinger, compute_rsi
from app.services.trading import (
    append_log,
    get_decrypted_credentials,
    get_open_trade,
)

logger = logging.getLogger("bot.engine")


class TradingEngine:
    def __init__(self) -> None:
        self.last_rsi: float | None = None
        self.last_bb_lower: float | None = None
        self.last_bb_mid: float | None = None
        self.last_price: float | None = None
        self._close_requested = False

    def request_close_position(self) -> None:
        self._close_requested = True

    async def tick(self, session: AsyncSession, settings: SettingsRow) -> dict[str, Any]:
        """Un cycle d'évaluation. Retourne un snapshot d'état."""
        if settings.bot_status == BotStatus.STOPPED:
            return await self._snapshot(session, settings, note="stopped")

        if settings.bot_status == BotStatus.PAUSED:
            # Gestion SL/TP même en pause si position ouverte
            await self._manage_open_position(session, settings, manage_entries=False)
            return await self._snapshot(session, settings, note="paused")

        # RUNNING
        await self._manage_open_position(session, settings, manage_entries=True)
        return await self._snapshot(session, settings, note="running")

    async def _get_exchange(self, session: AsyncSession):
        creds = await get_decrypted_credentials(session)
        if creds is None:
            return build_exchange(), False
        key, secret, testnet = creds
        return build_exchange(key, secret, testnet), True

    async def _load_market(
        self,
        session: AsyncSession,
        settings: SettingsRow,
    ) -> tuple[pd.Series, float] | None:
        exchange, _ = await self._get_exchange(session)
        try:
            ohlcv = await fetch_ohlcv_df(
                exchange, settings.symbol, settings.timeframe, limit=max(100, settings.bb_period + 50)
            )
            if not ohlcv:
                return None
            df = pd.DataFrame(ohlcv, columns=["ts", "open", "high", "low", "close", "volume"])
            closes = df["close"].astype(float)
            price = float(closes.iloc[-1])
            self.last_price = price
            self.last_rsi = compute_rsi(closes, settings.rsi_period)
            mid, _upper, lower = compute_bollinger(closes, settings.bb_period, settings.bb_std)
            self.last_bb_mid = mid
            self.last_bb_lower = lower
            return closes, price
        except Exception as exc:  # noqa: BLE001 — logué, cycle suivant
            logger.exception("Erreur market data: %s", exc)
            await append_log(session, f"Market data error: {exc}", LogLevel.ERROR)
            return None
        finally:
            await exchange.close()

    async def _manage_open_position(
        self,
        session: AsyncSession,
        settings: SettingsRow,
        *,
        manage_entries: bool,
    ) -> None:
        market = await self._load_market(session, settings)
        if market is None:
            return
        _closes, price = market
        open_trade = await get_open_trade(session)

        if open_trade is not None:
            if self._close_requested:
                await self._close_trade(session, open_trade, price, reason="manual_close")
                self._close_requested = False
                return

            if price <= open_trade.stop_loss:
                await self._close_trade(session, open_trade, price, reason="stop_loss")
                return
            if price >= open_trade.take_profit:
                await self._close_trade(session, open_trade, price, reason="take_profit")
                return
            return

        # Pas de position — signal d'entrée
        self._close_requested = False
        if not manage_entries:
            return
        if self.last_rsi is None or self.last_bb_lower is None:
            return

        signal = self.last_rsi < settings.rsi_threshold and price <= self.last_bb_lower
        if not signal:
            return

        await self._open_long(session, settings, price)

    async def _open_long(
        self,
        session: AsyncSession,
        settings: SettingsRow,
        price: float,
    ) -> None:
        size_usd = settings.trade_size_usd
        qty = size_usd / price
        sl = price * (1 - settings.stop_loss_pct / 100.0)
        tp = price * (1 + settings.take_profit_pct / 100.0)

        exchange, has_creds = await self._get_exchange(session)
        order_id = None
        try:
            if has_creds:
                order = await exchange.create_market_buy_order(settings.symbol, qty)
                order_id = str(order.get("id") or "")
                # Recalcule qty/price depuis fill si dispo
                filled = order.get("filled") or qty
                avg = order.get("average") or price
                qty = float(filled)
                price = float(avg)
                sl = price * (1 - settings.stop_loss_pct / 100.0)
                tp = price * (1 + settings.take_profit_pct / 100.0)
            else:
                await append_log(
                    session,
                    "Paper trade: pas de clés API — simulation locale",
                    LogLevel.WARNING,
                )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Ordre buy échoué: %s", exc)
            await append_log(session, f"Buy order failed: {exc}", LogLevel.ERROR)
            return
        finally:
            await exchange.close()

        trade = Trade(
            symbol=settings.symbol,
            side=TradeSide.BUY,
            status=TradeStatus.OPEN,
            entry_price=price,
            quantity=qty,
            size_usd=size_usd,
            stop_loss=sl,
            take_profit=tp,
            exchange_order_id=order_id,
            reason="rsi_bb_entry",
            extra_json={
                "rsi": self.last_rsi,
                "bb_lower": self.last_bb_lower,
            },
        )
        session.add(trade)
        await session.commit()
        await append_log(
            session,
            f"OPEN LONG {settings.symbol} @ {price:.2f} SL={sl:.2f} TP={tp:.2f} RSI={self.last_rsi:.2f}",
            LogLevel.INFO,
            {"trade_id": trade.id},
        )

    async def _close_trade(
        self,
        session: AsyncSession,
        trade: Trade,
        price: float,
        *,
        reason: str,
    ) -> None:
        exchange, has_creds = await self._get_exchange(session)
        try:
            if has_creds:
                await exchange.create_market_sell_order(trade.symbol, trade.quantity)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Ordre sell échoué: %s", exc)
            await append_log(session, f"Sell order failed: {exc}", LogLevel.ERROR)
            # On clôture quand même en DB pour éviter position fantôme bloquante
        finally:
            await exchange.close()

        pnl_usd = (price - trade.entry_price) * trade.quantity
        pnl_pct = ((price - trade.entry_price) / trade.entry_price) * 100.0
        trade.exit_price = price
        trade.pnl_usd = pnl_usd
        trade.pnl_pct = pnl_pct
        trade.status = TradeStatus.CLOSED
        trade.closed_at = datetime.now(UTC)
        trade.reason = reason
        await session.commit()
        await append_log(
            session,
            f"CLOSE {trade.symbol} @ {price:.2f} PnL={pnl_usd:.2f} USD ({pnl_pct:.2f}%) reason={reason}",
            LogLevel.INFO,
            {"trade_id": trade.id, "pnl_usd": pnl_usd},
        )

    async def _snapshot(
        self,
        session: AsyncSession,
        settings: SettingsRow,
        *,
        note: str,
    ) -> dict[str, Any]:
        open_trade = await get_open_trade(session)
        position: dict[str, Any] = {"open": False}
        if open_trade and self.last_price is not None:
            fpnl = (self.last_price - open_trade.entry_price) * open_trade.quantity
            fpct = ((self.last_price - open_trade.entry_price) / open_trade.entry_price) * 100.0
            position = {
                "open": True,
                "symbol": open_trade.symbol,
                "entry_price": open_trade.entry_price,
                "stop_loss": open_trade.stop_loss,
                "take_profit": open_trade.take_profit,
                "quantity": open_trade.quantity,
                "size_usd": open_trade.size_usd,
                "floating_pnl_usd": round(fpnl, 2),
                "floating_pnl_pct": round(fpct, 2),
                "mark_price": self.last_price,
            }
        return {
            "note": note,
            "bot_status": settings.bot_status.value,
            "last_rsi": self.last_rsi,
            "last_bb_lower": self.last_bb_lower,
            "last_price": self.last_price,
            "position": position,
            "ts": datetime.now(UTC).isoformat(),
        }
