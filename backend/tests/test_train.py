
import numpy as np
import pandas as pd
import pytest

from app.train import train_and_evaluate


def make_history(rows=400):
    rng = np.random.default_rng(42)
    dates = pd.date_range("2024-01-01", periods=rows, freq="B")

    daily_returns = rng.normal(0.0005, 0.015, rows)
    close = 100 * np.cumprod(1 + daily_returns)
    volume = rng.integers(100_000, 1_000_000, rows)

    return pd.DataFrame(
        {"Close": close, "Volume": volume},
        index=dates,
    )


def test_training_evaluates_all_three_models():
    result = train_and_evaluate(make_history())

    assert result["observations"] > 60
    assert result["training_observations"] > result["testing_observations"]
    assert set(result["models"]) == {
        "dummy_baseline",
        "logistic_regression",
        "random_forest",
    }

    for metrics in result["models"].values():
        assert 0 <= metrics["accuracy"] <= 1
        assert 0 <= metrics["precision"] <= 1
        assert 0 <= metrics["recall"] <= 1
        assert len(metrics["confusion_matrix"]) == 2


def test_training_rejects_insufficient_data():
    with pytest.raises(ValueError, match="60 usable observations"):
        train_and_evaluate(make_history(rows=30))
