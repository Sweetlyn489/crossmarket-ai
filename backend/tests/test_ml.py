import numpy as np
import pandas as pd
import pytest

from app.ml import FEATURE_COLUMNS, build_dataset


def make_history(rows=100):
    dates = pd.date_range("2025-01-01", periods=rows, freq="B")
    close = 100 + np.arange(rows) * 0.5 + np.sin(np.arange(rows))
    volume = 10000 + np.arange(rows) * 100

    return pd.DataFrame(
        {"Close": close, "Volume": volume},
        index=dates,
    )


def test_build_dataset_creates_features_and_target():
    dataset = build_dataset(make_history())

    assert not dataset.empty
    assert all(column in dataset.columns for column in FEATURE_COLUMNS)
    assert "target" in dataset.columns
    assert set(dataset["target"].unique()).issubset({0, 1})
    assert dataset[FEATURE_COLUMNS].notna().all().all()


def test_build_dataset_excludes_last_row_without_next_day():
    history = make_history()
    dataset = build_dataset(history)

    # The final date cannot be included because its next-day outcome is unknown.
    assert dataset.index.max() < history.index.max()


def test_build_dataset_rejects_missing_columns():
    history = pd.DataFrame({"Close": [100, 101, 102]})

    with pytest.raises(ValueError, match="Close and Volume"):
        build_dataset(history)


def test_build_dataset_rejects_empty_history():
    history = pd.DataFrame(columns=["Close", "Volume"])

    with pytest.raises(ValueError, match="empty"):
        build_dataset(history)
