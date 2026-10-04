"""Tests indicateurs RSI / Bollinger."""

from __future__ import annotations

import pandas as pd

from app.services.indicators import compute_bollinger, compute_rsi


def test_rsi_insufficient_data() -> None:
    closes = pd.Series([100.0, 101.0, 102.0])
    assert compute_rsi(closes, period=14) is None


def test_rsi_range() -> None:
    # Série avec tendance claire
    values = [100 + i * 0.5 for i in range(40)]
    closes = pd.Series(values)
    rsi = compute_rsi(closes, period=14)
    assert rsi is not None
    assert 50 < rsi <= 100


def test_bollinger_lower_below_mid() -> None:
    closes = pd.Series([float(x) for x in range(1, 50)])
    mid, upper, lower = compute_bollinger(closes, period=20, std_dev=2.0)
    assert mid is not None and upper is not None and lower is not None
    assert lower < mid < upper
