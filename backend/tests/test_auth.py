def test_register_creates_user_and_returns_token(client):
    res = client.post("/api/auth/register", json={
        "name": "Alice",
        "email": "alice@example.com",
        "password": "Str0ngPass!",
    })
    assert res.status_code == 201
    body = res.json()
    assert body["user"]["email"] == "alice@example.com"
    assert "access_token" in body


def test_register_rejects_duplicate_email(client):
    payload = {"name": "Alice", "email": "alice@example.com", "password": "Str0ngPass!"}
    client.post("/api/auth/register", json=payload)
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 400


def test_register_rejects_short_password(client):
    res = client.post("/api/auth/register", json={
        "name": "Alice", "email": "alice@example.com", "password": "short",
    })
    assert res.status_code == 422


def test_login_succeeds_with_correct_credentials(client):
    client.post("/api/auth/register", json={
        "name": "Bob", "email": "bob@example.com", "password": "Str0ngPass!",
    })
    res = client.post("/api/auth/login", json={
        "email": "bob@example.com", "password": "Str0ngPass!",
    })
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_fails_with_wrong_password(client):
    client.post("/api/auth/register", json={
        "name": "Bob", "email": "bob@example.com", "password": "Str0ngPass!",
    })
    res = client.post("/api/auth/login", json={
        "email": "bob@example.com", "password": "WrongPass!",
    })
    assert res.status_code == 401


def test_login_fails_for_unknown_email(client):
    res = client.post("/api/auth/login", json={
        "email": "nobody@example.com", "password": "Whatever1!",
    })
    assert res.status_code == 401


def test_protected_route_requires_token(client):
    res = client.get("/api/projects")
    assert res.status_code == 401


def test_protected_route_works_with_valid_token(client, auth_headers):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["email"] == "test@example.com"
