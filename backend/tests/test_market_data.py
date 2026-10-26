
from unittest.mock import patch

import pandas as pd
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@patch("app.main.yf.Ticker")
def test_market_data_returns_prices(mock_ticker):
    history = pd.DataFrame(
        {
            "Open": [100.0],
            "High": [110.0],
            "Low": [95.0],
            "Close": [105.0],
            "Volume": [1000],
        },
        index=pd.to_datetime(["2026-10-20"]),
    )

    mock_ticker.return_value.history.return_value = history

    response = client.get("/market-data/AAPL")

    assert response.status_code == 200

    body = response.json()
    assert body["symbol"] == "AAPL"
    assert body["count"] == 1
    assert body["prices"][0]["close"] == 105.0
    assert body["prices"][0]["volume"] == 1000


def test_market_data_rejects_invalid_period():
    response = client.get("/market-data/AAPL?period=invalid")

    assert response.status_code == 422


@patch("app.main.yf.Ticker")
def test_market_data_returns_404_for_empty_history(mock_ticker):
    mock_ticker.return_value.history.return_value = pd.DataFrame()

    response = client.get("/market-data/INVALIDXYZ")

    assert response.status_code == 404

