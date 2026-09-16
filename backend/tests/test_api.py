"""Smoke-тесты ComplianceBox API для CI."""
import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_login_me():
    email = f"ci_{uuid.uuid4().hex[:8]}@test.ru"
    password = "ciPass123!"

    r = client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert r.status_code == 200

    r = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password, "grant_type": "password"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]

    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == email


def test_import_requires_auth():
    r = client.post("/api/v1/pd-subjects/import", params={"tenant_id": 1})
    assert r.status_code == 401


def test_subject_requests_require_auth():
    r = client.get("/api/v1/subject-requests/", params={"tenant_id": 1})
    assert r.status_code == 401