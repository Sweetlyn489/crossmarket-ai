"""Feature engineering for CrossMarket AI."""

import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "daily_return",
    "return_lag_1",
    "momentum_5",
    "volatility_10",
    "volume_change",
    "ma_ratio_5",
    "ma_ratio_20",
]


def build_dataset(history: pd.DataFrame) -> pd.DataFrame:
    """Build daily features and the next-trading-day direction target."""
    if not {"Close", "Volume"}.issubset(history.columns):
        raise ValueError("History must contain Close and Volume columns")

    if history.empty:
        raise ValueError("History cannot be empty")

    close = pd.to_numeric(history["Close"], errors="coerce")
    volume = pd.to_numeric(history["Volume"], errors="coerce")
    daily_return = close.pct_change(fill_method=None)

    dataset = pd.DataFrame(index=history.index)
    dataset["daily_return"] = daily_return
    dataset["return_lag_1"] = daily_return.shift(1)
    dataset["momentum_5"] = close.pct_change(5, fill_method=None)
    dataset["volatility_10"] = daily_return.rolling(10).std()
    dataset["volume_change"] = volume.pct_change(fill_method=None)
    dataset["ma_ratio_5"] = close / close.rolling(5).mean() - 1
    dataset["ma_ratio_20"] = close / close.rolling(20).mean() - 1

    next_day_return = daily_return.shift(-1)
    dataset["target"] = (next_day_return > 0).astype("int64")

    dataset = dataset.replace([np.inf, -np.inf], np.nan)
    dataset = dataset.dropna(subset=FEATURE_COLUMNS)
    dataset = dataset.loc[next_day_return.loc[dataset.index].notna()]

    return dataset
