"""Indicateurs techniques — RSI + Bandes de Bollinger."""

from __future__ import annotations

import numpy as np
import pandas as pd


def compute_rsi(closes: pd.Series, period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    delta = closes.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    last_gain = float(avg_gain.iloc[-1])
    last_loss = float(avg_loss.iloc[-1])
    if np.isnan(last_gain) or np.isnan(last_loss):
        return None
    if last_loss == 0:
        return 100.0 if last_gain > 0 else 50.0
    rs = last_gain / last_loss
    return 100.0 - (100.0 / (1.0 + rs))


def compute_bollinger(
    closes: pd.Series,
    period: int = 20,
    std_dev: float = 2.0,
) -> tuple[float | None, float | None, float | None]:
    if len(closes) < period:
        return None, None, None
    mid = closes.rolling(window=period).mean()
    std = closes.rolling(window=period).std(ddof=0)
    upper = mid + std_dev * std
    lower = mid - std_dev * std
    m, u, l = float(mid.iloc[-1]), float(upper.iloc[-1]), float(lower.iloc[-1])
    if any(np.isnan(x) for x in (m, u, l)):
        return None, None, None
    return m, u, l
