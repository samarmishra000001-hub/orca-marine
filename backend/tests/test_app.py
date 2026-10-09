import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_cors_headers():
    response = client.options(
        "/api/chat",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"}
    )
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"

def test_rate_limiting():
    for _ in range(25):
        client.post("/api/chat", json={"message": "hello"})
    response = client.post("/api/chat", json={"message": "hello"})
    assert response.status_code == 429
