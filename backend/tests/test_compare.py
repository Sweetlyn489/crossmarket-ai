
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_compare_rejects_one_symbol():
    response = client.get(
        "/compare",
        params={"symbols": "AAPL", "period": "1mo"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Provide between 2 and 5 stock symbols"
    )


def test_compare_rejects_duplicate_symbols():
    response = client.get(
        "/compare",
        params={"symbols": "AAPL,AAPL", "period": "1mo"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Duplicate stock symbols are not allowed"
    )


def test_compare_rejects_invalid_period():
    response = client.get(
        "/compare",
        params={"symbols": "AAPL,RELIANCE.NS", "period": "10y"},
    )

    assert response.status_code == 422
