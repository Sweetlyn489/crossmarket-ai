
import pandas as pd
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app

client = TestClient(app)


def test_compare_calculates_returns():
    mock_history = pd.DataFrame({
        "Close": [100.0, 105.0, 110.0],
        "Volume": [1000, 1200, 1500],
    })

    with patch("app.main.yf.Ticker") as mock_ticker:
        mock_ticker.return_value.history.return_value = mock_history

        response = client.get(
            "/compare",
            params={"symbols": "AAPL,MSFT", "period": "1mo"},
        )

    assert response.status_code == 200

    data = response.json()
    assert len(data["results"]) == 2

    first_stock = data["results"][0]
    assert first_stock["symbol"] == "AAPL"
    assert first_stock["first_close"] == 100.0
    assert first_stock["latest_close"] == 110.0
    assert first_stock["period_return_pct"] == 10.0
    assert first_stock["highest_close"] == 110.0
    assert first_stock["lowest_close"] == 100.0
    assert first_stock["observations"] == 3
