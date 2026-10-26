
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200

    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "CrossMarket AI API"
    assert body["version"] == "0.1.0"
    assert "timestamp" in body


def test_unknown_route_returns_404():
    response = client.get("/does-not-exist")

    assert response.status_code == 404
